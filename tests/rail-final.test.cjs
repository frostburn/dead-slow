'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),L=require('../src/rail-levels.js'),routes=require('./rail-final-routes.cjs');
for(const [number,route] of [[9,'helper'],[10,'ferry'],[11,'flood'],[12,'finale']])test(`5-${number}: complete control-only ${route} route`,()=>{
    const st=R.create(L[number-1]);routes[route](st);
    assert.equal(st.failure,null);assert.ok(st.finishHold>=2,JSON.stringify({completed:st.completed,time:st.time,help:R.assistance(st).next}));
    assert.equal(st.stats.contacts,0,'Clean handling');
});
