'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('./headless.cjs');
test('keyboard hints reveal on hardware navigation but not text or IME input',()=>{
    const classes=new Set(),t=create({onBodyClass:name=>classes.add(name)});
    const field={matches:()=>true};
    t.keydown({code:'',target:field});
    t.keydown({code:'Unidentified',target:field});
    t.keydown({code:'KeyA',isComposing:true,target:field});
    t.keydown({code:'KeyA',target:field});
    assert.equal(classes.has('keyboard-used'),false);
    t.keydown({code:'Tab'});
    assert.equal(classes.has('keyboard-used'),true);
});
