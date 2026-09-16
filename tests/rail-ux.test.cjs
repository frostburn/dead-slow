'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),L=require('../src/rail-levels.js');
const step=(st,seconds)=>{for(let n=0;n<seconds*120;n++)R.update(st,1/120);};
test('next split keeps its required distance ahead of unsecured-cut reminders',()=>{
    const st=R.create(L[0]);st.selected='R1';R.groupFor(st,'R1').cars.forEach(c=>c.hand=false);
    const help=R.assistance(st);
    assert.match(help.next,/needs \d+ m/);assert.match(help.next,/Secure the selected cut/);
    assert.ok(help.next.indexOf(' m')<help.next.indexOf('Secure'));
});
test('third notch wins the dry launch; fourth notch adds acceleration at speed in either direction',()=>{
    function probe(power,speed) {
        const st=R.create(L[0]),g=R.engineGroup(st);g.cars=[g.cars[0]];st.groups=[g];
        g.path=[{id:'receiving',dir:1,start:0,end:st.net.edges.receiving.length}];g.cars[0].q=100;g.cars[0].v=speed;st.reverser=speed<0?-1:1;
        R.command(st,'brake',0);g.cars[0].pressure=0;R.command(st,'power',power);step(st,.2);
        return {slip:st.slip,speed:Math.abs(g.cars[0].v)};
    }
    assert.equal(probe(4,0).slip,true);assert.equal(probe(3,0).slip,false);
    assert.ok(probe(3,0).speed>probe(4,0).speed);
    for(const speed of [-4,4]){assert.equal(probe(4,speed).slip,false);assert.ok(probe(4,speed).speed>probe(3,speed).speed);}
});
test('runaway rescue reports remaining stopping room after coupling',()=>{
    const st=R.create(L[4]),g=R.engineGroup(st),cut=R.groupFor(st,'R1');
    g.cars.push(...cut.cars);st.groups=[g];st.completed.push('catch-wagons');
    g.path=[{id:'bridge-approach',dir:1,start:0,end:st.net.edges['bridge-approach'].length}];
    g.cars.forEach((c,i)=>{c.q=200-i*20;c.v=1;});
    assert.match(R.assistance(st).next,/\d+ m of stopping room before the river/);
    g.cars.forEach(c=>c.v=0);
    assert.equal(R.assistance(st).action,'hand');
});
test('parked flats clear ordinary rolling stock but collide with the vessel overhang',()=>{
    const st=R.create(L[7]);R.command(st,'switch','fork');R.command(st,'switch','join');
    const hit=R.clearance(st).collision;assert.match(hit.hit,/parked wagon/);
    assert.equal(R.cargoHit(st,hit.polygon).name,hit.hit);
    const g=R.engineGroup(st),path=R.previewPath(st,g,0,3000).path,obstacles=R.obstacles(st).filter(o=>o.car);
    for(let d=0;d<2200;d+=2)for(const c of g.cars)
        assert.equal(R.cargoHit(st,R.vehicleShape(st,{...g,path},{...c,q:c.q+d}),obstacles),null,'Normal rolling stock must fit');
    g.path=path;g.cars.forEach(c=>c.q+=hit.distance);R.update(st,1/120);
    assert.match(st.failure,/vessel struck p[12]/);
});
// Geometry fixtures isolate guidance. Existing control recordings verify routes.
function receiving(position=120,speed=0) {
    const st=R.create(L[0]),g=R.engineGroup(st);
    g.path=[{id:'receiving',dir:1,start:0,end:st.net.edges.receiving.length}];
    g.cars.forEach((c,i)=>{c.q=position-(i?19.2+(i-1)*17.2:0);c.v=speed;});
    return st;
}
test('tutorial names the loco brake before arrival and highlights it at the board',()=>{
    const departure=R.assistance(R.create(L[0]));assert.match(departure.next,/Stop with the loco brake/);
    const st=receiving();let help=R.assistance(st);
    assert.match(help.next,/loco brake.*50%/);assert.equal(help.action,'independent');assert.equal(help.direction,1);
    R.command(st,'independent',.5);help=R.assistance(st);
    assert.match(help.next,/Hold here/);assert.doesNotMatch(help.next,/handbrakes/);
    step(st,1.1);assert.ok(st.completed.includes('first-stop'));
    help=R.assistance(st);assert.match(help.next,/Release the loco brake/);assert.equal(help.direction,-1);
});
test('overshooting a stop shows distance back and respects the selected driving end',()=>{
    const st=receiving(152);
    assert.match(R.assistance(st).next,/17 m back.*reverse/);
    R.command(st,'reverse');assert.match(R.assistance(st).next,/17 m more/);
    assert.doesNotMatch(R.assistance(st).next,/Stop and reverse/);
});
test('hard contact with the tutorial wagons shows its lockout even before the board stop',()=>{
    const st=receiving(165,.9);step(st,.1);
    assert.equal(st.failure,null);assert.equal(R.availability(st,'couple').enabled,false);
    let help=R.assistance(st);
    assert.match(help.pickup,/Back away beyond 3 m/);
    assert.match(help.next,/Hard buffer contact.*reverse.*3 m/i);
    assert.equal(help.action,'reverse');
    R.command(st,'reverse');help=R.assistance(st);
    assert.doesNotMatch(help.next,/reverse \(X\)/);
    assert.match(help.next,/Release the train brake/);assert.equal(help.action,'brake');
    // A stopped hard approach remains disallowed; separation and a gentle
    // return restore the same coupling operation, with no mission shortcut.
    R.engineGroup(st).cars.forEach(c=>c.q-=4);step(st,.1);
    assert.equal(st.bufferImpact,null);
    const g=R.engineGroup(st),delta=165-g.cars[0].q;
    g.cars.forEach(c=>{c.q+=delta;c.v=.2;});step(st,.1);
    assert.ok(R.availability(st,'couple').enabled);
    assert.match(R.assistance(st).pickup,/Ready to couple/);
    assert.ok(R.command(st,'couple'));assert.equal(R.engineGroup(st).cars.length,5);
});
test('gentle buffer contact offers coupling without imposing a tutorial prerequisite',()=>{
    const st=receiving(165,.2);step(st,.1);
    assert.ok(!st.completed.includes('first-stop'));
    assert.ok(R.availability(st,'couple').enabled);
    assert.match(R.assistance(st).pickup,/Ready to couple/);
});
test('a delivery split highlights train braking while wagon pressure builds',()=>{
    const st=R.create(L[1]),g=R.engineGroup(st);
    g.path=[{id:'mill',dir:1,start:0,end:st.net.edges.mill.length}];
    g.cars.forEach((c,i)=>{c.q=250-i*25;c.v=0;c.pressure=.1;});g.brake=0;
    let help=R.assistance(st);
    assert.equal(help.action,'brake');assert.equal(help.direction,1);
    assert.match(help.next,/train brake.*wagon brake pressure/);
    assert.deepEqual(help.split,{after:'F4',before:'M1'});
    g.cars.forEach(c=>c.pressure=1);help=R.assistance(st);
    assert.equal(help.action,'uncouple');assert.ok(R.availability(st,'uncouple',help.split).enabled);
});
