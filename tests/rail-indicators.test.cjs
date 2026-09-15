const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),V=require('../src/rail-view.js'),L=require('../src/rail-levels.js');
test('sliding warnings appear immediately and survive intermittent physics samples',()=>{
    const st=R.create(L[5]),c=R.engineGroup(st).cars[1];
    c.v=1;
    for(let i=0;i<20;i++){
        st.time=i*.08;c.sliding=i%2===0;st.slip=c.sliding;
        const before=JSON.stringify(st),v=V.indicators(st);
        assert.ok(v.sliding.has(c.id));assert.ok(v.slip);assert.equal(JSON.stringify(st),before);
    }
    st.time+=.5;c.sliding=false;st.slip=false;
    assert.equal(V.indicators(st).sliding.size,0);assert.equal(V.indicators(st).slip,false);
    assert.equal(V.indicators(R.create(L[5])).sliding.size,0);
});
test('small stop/start jitter does not light a fresh sliding warning',()=>{
    const st=R.create(L[5]),c=R.engineGroup(st).cars[1];
    for(let i=0;i<30;i++){st.time=i*.1;c.v=i%2?.25:0;c.sliding=!!(i%2);assert.equal(V.indicators(st).sliding.size,0);}
});
test('stationary vibration cannot flip grade arrows or head and tail markers',()=>{
    const st=R.create(L[5]),c=R.engineGroup(st).cars[0];
    for(const speed of [-.03,.03,-.1,.1,0]){c.v=speed;assert.equal(V.displayDirection(st,c),1);}
    st.reverser=-1;assert.equal(V.displayDirection(st,c),-1);
    c.v=.4;assert.equal(V.displayDirection(st,c),-1);assert.equal(V.signedSpeed(st),'-1.4');
    c.v=-.4;assert.equal(V.signedSpeed(st),'1.4');
    const head=R.metrics(st).head;c.v=.4;assert.deepEqual(R.metrics(st).head,head);
});
test('action icons only re-enable after sustained eligibility; impossible clicks remain disabled',()=>{
    const st=R.create(L[5]);
    assert.ok(V.actionEnabled(st,'hand',undefined,true));
    for(let i=0;i<20;i++){
        st.time=i*.08;
        assert.equal(V.actionEnabled(st,'hand',undefined,i%2!==0),false);
    }
    st.time+=.5;assert.ok(V.actionEnabled(st,'hand',undefined,true));
    assert.equal(V.actionEnabled(st,'hand',undefined,false),false);
});
