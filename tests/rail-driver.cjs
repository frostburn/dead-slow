'use strict';
// Feedback driver for control-only railway smoke routes. It issues the same
// power/brake/reverser commands as the UI; it never relocates a vehicle.
const R=require('../src/rail.js'),assert=require('node:assert/strict');
function step(st,seconds) {for(let i=0;i<Math.round(seconds*120);i++){R.update(st,1/120);assert.equal(st.failure,null);}}
function distance(st,id,target,s,direction) {
    const g=R.groupFor(st,id),c=g.cars.find(c=>c.id===id),p=R.locate(st,g,c.q);
    let edge=st.net.edges[p.edge],sign=p.dir*direction,remaining=0,position=p.s;
    for(let i=0;i<30;i++) {
        if(edge.id===target)return remaining+(s-position)*sign;
        remaining+=sign>0?edge.length-position:position;
        const node=sign>0?edge.b:edge.a,sw=st.net.switches.find(x=>x.node===node);
        const next=sw?(edge.id===sw.stem?sw.branches[sw.selected]:edge.id===sw.branches[sw.selected]?sw.stem:null):Object.values(st.net.edges).find(e=>e.id!==edge.id&&(e.a===node||e.b===node))?.id;
        assert.ok(next,'No selected route to '+target+' from '+edge.id);
        edge=st.net.edges[next];sign=edge.a===node?1:-1;position=sign>0?0:edge.length;
    }
    throw Error('Route does not reach '+target);
}
function move(st,id,edge,s,direction,max=3,power=1) {
    const group=R.engineGroup(st),engine=group.cars.find(c=>c.powered);
    R.command(st,'power',0);R.command(st,'independent',0);
    if(st.reverser*engine.face!==direction){R.command(st,'stop');step(st,8);assert.ok(R.command(st,'reverse'));}
    let count=0;
    for(;count<20000;count++) {
        const remaining=distance(st,id,edge,s,direction),speed=R.metrics(st).speed*direction;
        if(remaining<1.6){R.command(st,'stop');step(st,10);break;}
        const target=Math.min(max,Math.sqrt(Math.max(.02,remaining-1)*.11));
        const brake=speed>target+.06?Math.min(1,Math.ceil((speed-target)*2)*.25):0;
        R.command(st,'brake',brake);R.command(st,'power',!brake&&speed<target-.08?power:0);
        step(st,.2);
    }
    assert.ok(count<20000,'Move timed out '+id+' '+edge);
    assert.ok(Math.abs(distance(st,id,edge,s,direction))<6,`${id}: ${distance(st,id,edge,s,direction).toFixed(1)} m from ${edge} ${s}`);
}
module.exports={step,move,distance};
