'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { replay, fixtures } = require('../tools/verify-island-runs.cjs');
for (const fixture of fixtures) {
    test(`${fixture.level}: clean, fixed-input completion without repositioning`, () => {
        const t = replay(fixture);
        assert.equal(t.state.status, 'complete');
        assert.equal(t.state.run.result.clean, true);
        assert.equal(t.state.run.contacts, 0);
        assert.ok(Math.abs(t.state.run.time - fixture.expectedTime) < 1 / 120);
        if(t.state.run.rail) {
            const st=t.state.run.rail;
            assert.ok(st.config.tasks.every(task=>st.completed.includes(task.id)));
            assert.ok(require('../src/rail.js').assertInvariants(st));
            return;
        }
        const work = t.state.run.jobs;
        assert.equal(work.line, null);
        assert.equal(work.onboard.length, 0);
        assert.equal(work.index, t.state.level.jobs.length);
        if (t.state.level.jobs.length)
            assert.ok(work.stats.vehiclesDelivered > 0 || work.stats.vesselsDelivered > 0);
    });
}
