'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),P=require('../src/rail-presentation.js'),L=require('../src/rail-levels.js');
test('checked-in scenery matches the current surveys and generation stays outside the browser',()=>{
    const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
    assert.equal(fs.readFileSync(path.join(root,'src/rail-scenery.js'),'utf8'),require('../tools/build-rail-scenery.cjs').source());
    const html=require('../tools/build.cjs').bundle();
    assert.ok(html.includes('root.RailScenery=data'));
    assert.ok(!html.includes('function generateLandscape('));
});
test('opening every landscape needs no survey or track sampling at runtime',()=>{
    const at=R.at;R.at=()=>{throw new Error('Unexpected runtime survey sampling');};
    try{for(const level of L){const scene=P.landscape({...level});assert.ok(Array.isArray(scene.contours));assert.ok(Array.isArray(scene.bridges));}}
    finally{R.at=at;}
});
const cross=(a,b)=>a.x*b.y-a.y*b.x;
function intersects(a,b,c,d) {
    const v={x:b.x-a.x,y:b.y-a.y},w={x:d.x-c.x,y:d.y-c.y},delta={x:c.x-a.x,y:c.y-a.y},den=cross(v,w);
    if(Math.abs(den)<1e-8)return false;
    const t=cross(delta,w)/den,u=cross(delta,v)/den;
    return t>1e-6&&t<1-1e-6&&u>1e-6&&u<1-1e-6;
}
test('flat cargo and ferry yards have no invented hillside contours',()=>{
    for(const i of [7,9])assert.equal(P.landscape(L[i],R.network(L[i].rail)).contours.length,0);
    assert.ok(P.landscape(L[2],R.network(L[2].rail)).contours.length>0);
});
test('the cooling loop stays on one bank and both valley deliveries have river bridges',()=>{
    for(const [i,edge] of [[2,'works-road'],[11,'coastal-road']]) {
        const net=R.network(L[i].rail),scene=P.landscape(L[i],net);
        assert.deepEqual(scene.bridges.map(b=>b.edge),[edge]);
        assert.ok(scene.bridges[0].to-scene.bridges[0].from>60);
        assert.equal(P.landscape(L[i],net),scene,'Terrain is cached, not regenerated each frame');
    }
});
test('refuge siding and ferry loop have no unmarked track crossings',()=>{
    for(const [i,id] of [[7,'clearance-road'],[9,'quay-loop']]) {
        const net=R.network(L[i].rail),track=net.edges[id];
        for(let a=1;a<track.samples.length;a++)for(const e of Object.values(net.edges))for(let b=1;b<e.samples.length;b++) {
            if(e===track&&Math.abs(a-b)<=1)continue;
            assert.equal(intersects(track.samples[a-1],track.samples[a],e.samples[b-1],e.samples[b]),false,`${id} crosses ${e.id}`);
        }
    }
    const net=R.network(L[9].rail),loop=net.edges['quay-loop'];
    assert.ok(Math.cos(R.at(net,loop.id,0).a)>0,'The loop leaves the arrival road without reversing');
    assert.ok(Math.cos(R.at(net,loop.id,loop.length).a)>0,'The loop rejoins the quay facing along it');
});
test('platform and cabin clear ordinary wagon bodies while obstructing the vessel sweep',()=>{
    const st=R.create(L[7]),g=R.engineGroup(st),path=R.previewPath(st,g,0,3000).path,group={...g,path};
    const touched=new Set();
    for(let d=0;d<1800;d+=2) {
        for(const c of g.cars)assert.equal(R.cargoHit(st,R.vehicleShape(st,group,{...c,q:c.q+d}),st.config.obstacles),null);
        for(const o of st.config.obstacles)if(R.cargoHit(st,R.cargoShape(st,group,d),[o]))touched.add(o.name);
    }
    assert.equal(touched.size,st.config.obstacles.length);
});
test('detaching the vessel removes route warnings without removing its physical collision envelope',()=>{
    const st=R.create(L[7]);assert.ok(R.clearance(st).collision);
    assert.ok(R.command(st,'uncouple','engine'));
    assert.equal(R.clearance(st),null);
    const cargo=R.groupFor(st,'C1');assert.ok(R.cargoShape(st,cargo));
    assert.ok(R.command(st,'couple'));assert.ok(R.clearance(st).collision);
});
test('authored hills have readable contours that agree with the railway survey',()=>{
    const {terrain,generateLandscape}=require('../tools/build-rail-scenery.cjs');
    for(const i of [2,4,5,11]) {
        const level=L[i],net=R.network(level.rail),height=terrain(level,net),scene=generateLandscape(level,net);
        assert.equal(scene.interval,i===4||i===5?1:5);
        assert.ok(scene.contours.length>200,`${level.name}: missing relief`);
        for(const edge of Object.values(net.edges))for(const p of edge.samples)
            assert.ok(Math.abs(height(p.x,p.y)-p.z)<.65,`${level.name}: terrain disagrees with track elevation`);
        // Adjacent levels must remain separated at overview scale: no artificial
        // cliffs between distant survey branches or at neighbour-set boundaries.
        for(let y=0;y<level.world[1];y+=40)for(let x=0;x<level.world[0];x+=40) {
            const slope=Math.hypot(height(x+1,y)-height(x-1,y),height(x,y+1)-height(x,y-1))/2;
            assert.ok(Number.isFinite(slope)&&slope<scene.interval/50,`${level.name}: bunched contour levels`);
        }
    }
});
test('return loops join forward without crossings or retracing their approach',()=>{
    for(const [i,id] of [[6,'return'],[9,'quay-loop']]) {
        const net=R.network(L[i].rail),edge=net.edges[id];
        for(let a=1;a<edge.samples.length;a++)for(const other of Object.values(net.edges))for(let b=1;b<other.samples.length;b++) {
            if(other===edge&&Math.abs(a-b)<=1)continue;
            assert.equal(intersects(edge.samples[a-1],edge.samples[a],other.samples[b-1],other.samples[b]),false,`${id} crosses ${other.id}`);
        }
        const end=R.at(net,id,edge.length);
        assert.ok(Math.cos(end.a)*(i===6?-1:1)>.99,'Loop joins its next track tangentially');
        if(i===6)assert.ok(Math.cos(R.at(net,id,0).a)>.99,'Assembly road continues forward into the loop');
        if(i===9)assert.ok(edge.samples.slice(-24,-1).every(p=>p.x<90&&p.y>470),'Return approaches the quay from beyond its endpoint');
    }
});
