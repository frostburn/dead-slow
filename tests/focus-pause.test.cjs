'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('./headless.cjs'),S=require('../src/storage.js');
test('focus pause defaults on, persists off, and rejects invalid values',()=>{
 assert.equal(S.fresh().settings.pauseOnBlur,true);
 let value=null;const backing={getItem:()=>value,setItem:(k,v)=>value=v};
 const store=S.create(backing);store.data.settings.pauseOnBlur=false;store.save();
 assert.equal(S.create(backing).data.settings.pauseOnBlur,false);
 for(const value of [undefined,'false',0,null]){
  const data=S.fresh();data.settings.pauseOnBlur=value;
  assert.equal(S.sanitize(data).settings.pauseOnBlur,true);
 }
});
for(const id of ['dead-slow','gerbo-first-outing','vacuum']) {
 test(`${id}: optional focus pause releases held controls without tainting the run`,()=>{
  const t=create();t.cheats.level(id);t.cheats.normal();t.state.settings.pauseOnBlur=false;
  t.keydown({code:'KeyA'});t.advance(.5);const run=t.state.run,time=run.time;
  t.blur();assert.equal(t.state.run,run);assert.equal(t.state.status,'running');assert.equal(run.pausedUsed,false);
  assert.ok(Object.values(t.state.input).every(v=>v===0));
  t.advance(.5);assert.ok(run.time>time);
  t.pause();assert.equal(t.state.status,'paused');assert.equal(run.pausedUsed,true);
 });
}
test('default focus pause and hidden tabs still taint a circuit',()=>{
 const t=create();t.marathon('coast');t.blur();
 assert.equal(t.state.status,'paused');assert.equal(t.state.marathon.practice,true);
 t.marathon('coast');t.state.settings.pauseOnBlur=false;t.blur();
 assert.equal(t.state.marathon.practice,false);
 t.visibility(true);assert.equal(t.state.status,'paused');assert.equal(t.state.marathon.practice,true);
 t.visibility(false);assert.equal(t.state.status,'paused');
});

test('logbook setting button toggles the stored preference and refreshed label',()=>{
 const t=create();t.action('log');
 assert.match(t.html('dialog'),/Pause when window loses focus: ON/);
 t.action('toggle-focus-pause');
 assert.equal(t.state.storage.settings.pauseOnBlur,false);
 assert.match(t.html('dialog'),/aria-pressed="false">Pause when window loses focus: OFF/);
 t.action('toggle-focus-pause');assert.equal(t.state.storage.settings.pauseOnBlur,true);
});
