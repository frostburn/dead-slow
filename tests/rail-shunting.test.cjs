'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),L=require('../src/rail-levels.js');

test('split at either locomotive end selects the released wagons, not the engine',()=>{
    for(const trailing of [false,true]) {
        const st=R.create(L[1]),g=R.engineGroup(st);
        if(trailing){g.cars.reverse();g.cars.forEach((c,i)=>c.q=350-i*25.2);}
        const i=trailing?g.cars.length-2:0,link={after:g.cars[i].id,before:g.cars[i+1].id};
        assert.ok(R.command(st,'uncouple',link));
        const wagons=R.groupFor(st,st.selected);
        assert.ok(wagons.cars.every(c=>!c.powered));
        assert.equal(R.assistance(st).action,'hand');
        assert.ok(R.command(st,'hand'));assert.ok(wagons.cars.every(c=>c.hand));
        assert.ok(R.engineGroup(st).cars.every(c=>!c.hand));
        const snapshot=JSON.stringify(st.groups);
        assert.equal(R.command(st,'uncouple',link),false);
        assert.equal(JSON.stringify(st.groups),snapshot);
    }
});
test('availability and execution agree while brakes propagate and during motion',()=>{
    const st=R.create(L[1]),g=R.engineGroup(st),link={after:'engine',before:'F1'};
    for(const mode of ['power','moving','air']) {
        st.power=mode==='power'?1:0;
        g.cars.at(-1).v=mode==='moving'?.2:0;
        g.cars.at(-1).pressure=mode==='air'?.1:1;
        assert.equal(R.availability(st,'uncouple',link).enabled,false);
        assert.equal(R.command(st,'uncouple',link),false);assert.equal(st.groups.length,1);
    }
    g.cars.at(-1).pressure=1;
    assert.ok(R.command(st,'uncouple',link));
    assert.equal(R.command(st,'select','missing'),false);
});
test('repeated rejoining preserves unique cars, locomotive control and selected cut',()=>{
    const st=R.create(L[1]);
    for(let i=0;i<20;i++) {
        assert.ok(R.command(st,'uncouple',{after:'engine',before:'F1'}));
        assert.ok(R.command(st,'hand'));
        assert.ok(R.command(st,'couple'));
        assert.equal(st.selected,'engine');
        assert.ok(R.command(st,'hand'));
        assert.equal(st.groups.length,1);
        assert.equal(new Set(R.engineGroup(st).cars.map(c=>c.id)).size,7);
        assert.ok(R.engineGroup(st).cars.every(c=>!c.hand));
        assert.equal(R.command(st,'uncouple',{after:'engine',before:'M2'}),false);
    }
});
