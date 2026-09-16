'use strict';
const assert=require('node:assert/strict'),R=require('../src/rail.js');
const {move,step}=require('./rail-driver.cjs');
function cargo(st) {
    const cmd=(name,value)=>assert.ok(R.command(st,name,value),st.notice);
    cmd('uncouple','engine');cmd('hand');
    cmd('switch','fork');cmd('switch','fork');
    move(st,'engine','clearance-road',300,1,3);
    move(st,'engine','clearance-road',343.6,1,.4);
    cmd('couple');cmd('hand');
    move(st,'P1','clearance-road',730,1,3);
    cmd('uncouple','P2');cmd('hand');step(st,2);
    assert.ok(st.completed.includes('clear-flats'));
    move(st,'engine','arrival',350,-1,3);
    move(st,'engine','arrival',310,-1,.4);
    cmd('couple');cmd('hand');
    cmd('switch','fork');cmd('switch','fork');cmd('switch','join');
    cmd('reverse');assert.equal(R.clearance(st).collision,null);
    move(st,'engine','headshunt',350,1,2.5);step(st,2);
    assert.ok(st.completed.includes('clear-load'));
    cmd('switch','join');
    move(st,'C2','terminal',590,-1,2);cmd('hand');step(st,4);
    assert.ok(st.finishHold>=2);
}
module.exports={cargo};
