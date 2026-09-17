'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../src/polar-labels.js');
test('crowded chart labels remain separate, bounded and deterministic at different chart scales',()=>{
    for(const scale of [.3,1,2.3]){
        function frame(){
            const text=[],ctx=new Proxy({measureText:t=>({width:t.length*6}),fillText:t=>text.push(t)},{get:(o,k)=>o[k]??(()=>{})});
            const labels=L.create(ctx,390,300,0,0,scale);
            labels.add('BACKGROUND',195/scale,150/scale,'white',10,0);
            for(let i=0;i<12;i++)labels.add('CONTACT '+i,195/scale,150/scale,'white',10,2);
            labels.add('OFF CHART',-20/scale,150/scale);
            labels.add('EDGE',2/scale,80/scale);
            const boxes=labels.draw();
            assert.ok(text.length>=5);assert.equal(text[0],'CONTACT 0');assert.ok(!text.includes('OFF CHART'));assert.ok(text.includes('EDGE'));
            for(const [i,a] of boxes.entries()){
                assert.ok(a.x>=8&&a.x+a.w<=382&&a.y>=54&&a.y+a.h<=264);
                for(const b of boxes.slice(i+1))assert.ok(a.x>=b.x+b.w||a.x+a.w<=b.x||a.y>=b.y+b.h||a.y+a.h<=b.y);
            }
            return {text,boxes};
        }
        assert.deepEqual(frame(),frame());
    }
});
