const test=require('node:test'),assert=require('node:assert/strict'),report=require('../tools/ci-reporter.cjs');
test('CI reporter bounds huge assertions and retains the failing test and location',async()=>{
    async function* events(){yield {type:'test:pass',data:{}};yield {type:'test:fail',data:{name:'replay mismatch',file:'tests/replay.test.cjs',line:12,details:{error:{cause:{message:'mismatch\n'+'x'.repeat(1000000),stack:'Error\n    at replay (tests/replay.test.cjs:12:3)'}}}}};}
    let output='';for await(const chunk of report(events()))output+=chunk;
    assert.ok(output.length<2200);assert.match(output,/FAIL: replay mismatch/);assert.match(output,/tests\/replay.test.cjs:12/);assert.match(output,/1 passed; 1 failed/);
});
