'use strict';
const R=require('../src/rail.js'),assert=require('node:assert/strict');
const {step,move}=require('./rail-driver.cjs');
const cmd=(st,name,value)=>assert.ok(R.command(st,name,value),st.notice);
function bridge(st) {
    cmd(st,'uncouple','engine');cmd(st,'hand');cmd(st,'switch','e');
    move(st,'T1','pocket',310,1,2);cmd(st,'uncouple','E1');cmd(st,'hand');
    move(st,'engine','west-yard',360,-1,2);move(st,'engine','west-yard',309.3,-1,.4);cmd(st,'couple');cmd(st,'hand');cmd(st,'switch','e');cmd(st,'switch','e');
    move(st,'engine','receiving',450,1,2);cmd(st,'uncouple','engine');cmd(st,'hand');
    cmd(st,'switch','e');cmd(st,'switch','e');
    move(st,'engine','west-yard',490,1,2);cmd(st,'switch','e');cmd(st,'switch','e');
    let cut=R.groupFor(st,'E1'),target=R.locate(st,cut,cut.cars.find(c=>c.id==='E1').q).s-19;
    move(st,'engine','pocket',target-45,-1,2);
    move(st,'engine','pocket',target,-1,.4);cmd(st,'couple');cmd(st,'hand');
    move(st,'T1','west-yard',490,1,2);cmd(st,'switch','e');cmd(st,'switch','e');
    cut=R.groupFor(st,'E2');target=R.locate(st,cut,cut.cars.find(c=>c.id==='E2').q).s-21;
    move(st,'T1','receiving',target-45,-1,2);
    move(st,'T1','receiving',target,-1,.4);cmd(st,'couple');cmd(st,'hand');cmd(st,'hand');step(st,4);
}
module.exports={bridge};
