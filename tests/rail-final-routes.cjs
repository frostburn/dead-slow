'use strict';
const R=require('../src/rail.js'),assert=require('node:assert/strict');
const {step,move,distance}=require('./rail-driver.cjs');
const cmd=(st,name,value)=>assert.ok(R.command(st,name,value),st.notice);
function assisted(st,target=400) {
    cmd(st,'couple');cmd(st,'hand');step(st,2);
    for(let i=0;i<18000;i++) {
        const remaining=distance(st,'engine','summit-yard',target,1),g=R.engineGroup(st),m=R.metrics(st);
        if(remaining<1.6){cmd(st,'stop');step(st,10);return;}
        const speed=m.speed,desired=Math.min(3.5,Math.sqrt(Math.max(.02,remaining-1)*.11));
        const brake=speed>desired+.1?.25:0;
        const acceleration=Math.max(-.15,Math.min(.16,(desired-speed)*.22));
        const split=Math.ceil(g.cars.length/2),power=g.cars.slice(0,split),rear=g.cars.slice(split);
        const demand=cars=>cars.reduce((n,c)=>n+c.mass*(R.locate(st,g,c.q).grade*9.81+.012+acceleration),0);
        cmd(st,'brake',brake);
        cmd(st,'power',brake?0:Math.max(0,Math.min(4,Math.ceil(demand(power)/52500))));
        cmd(st,'helper',brake?0:Math.max(0,Math.min(4,Math.ceil(demand(rear)/47500))));
        step(st,.2);
    }
    throw Error('Helper crossing timed out');
}
function retire(st,last) {
    cmd(st,'uncouple',last);cmd(st,'hand');step(st,2);assert.ok(st.completed.includes('retire'));
    cmd(st,'select','engine');
}
function helper(st) {
    assisted(st,400);retire(st,'O8');
    move(st,'engine','exchange',650,1,3);cmd(st,'hand');step(st,4);
}
function ferry(st) {
    cmd(st,'uncouple','engine');cmd(st,'hand');
    move(st,'A2','port',118,1,1.5);cmd(st,'uncouple','A2');cmd(st,'hand');
    move(st,'engine','quay',350,-1,2);
    move(st,'engine','quay',298,-1,.4);cmd(st,'couple');cmd(st,'hand');
    move(st,'reach','quay',530,1,2);cmd(st,'uncouple','engine');cmd(st,'hand');
    cmd(st,'switch','fork');cmd(st,'switch','fork');
    move(st,'reach','quay-loop',500,1,2);
    move(st,'reach','quay',330,1,2);
    const cut=R.groupFor(st,'B2'),last=cut.cars.find(c=>c.id==='B2'),s=R.locate(st,cut,last.q).s;
    move(st,'reach','quay',s-29.2,1,.4);cmd(st,'couple');cmd(st,'hand');
    cmd(st,'switch','fork');cmd(st,'switch','fork');
    move(st,'B2','starboard',118,1,1.5);
    const g=R.engineGroup(st),index=g.cars.findIndex(c=>c.id==='reach');
    cmd(st,'uncouple',g.cars[index-1].id);cmd(st,'hand');
    move(st,'reach','quay',520,-1,2);cmd(st,'select','engine');cmd(st,'hand');step(st,4);
}
function flood(st) {
    move(st,'V1','low-road',350,-1,3);
    move(st,'V1','low-road',317.2,-1,.4);cmd(st,'couple');cmd(st,'hand');step(st,2);
    move(st,'engine','quarry-spur',220,1,3);
    move(st,'engine','quarry-spur',263.6,1,.4);cmd(st,'couple');cmd(st,'hand');
    move(st,'Q1','quarry-spur',425,1,2);step(st,6);assert.ok(st.completed.includes('crew'));
    move(st,'Q1','branch',430,-1,2.5);cmd(st,'switch','j');
    move(st,'Q1','upland',660,1,3,2);cmd(st,'hand');step(st,4);
}
function finale(st) {
    cmd(st,'switch','a');cmd(st,'switch','b');
    assisted(st,440);retire(st,'S10');
    move(st,'engine','lantern-loop',570,1,3);cmd(st,'hand');
    for(let i=0;i<2600&&!st.traffic[0].finished;i++)step(st,1);
    assert.ok(st.traffic[0].finished);cmd(st,'hand');
    if(st.net.switches.find(s=>s.node==='b').selected===0)cmd(st,'switch','b');
    move(st,'engine','coastal-road',990,1,3);cmd(st,'hand');step(st,4);
}
module.exports={helper,ferry,flood,finale};
