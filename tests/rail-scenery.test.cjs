'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),P=require('../src/rail-presentation.js'),L=require('../src/rail-levels.js');
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
