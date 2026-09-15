'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),L=require('../src/rail-levels.js');
const step=(st,seconds)=>{for(let n=0;n<seconds*120;n++)R.update(st,1/120);};
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
