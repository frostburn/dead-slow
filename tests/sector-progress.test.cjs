'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/levels.js');
const { create } = require('./headless.cjs');

// Seed records only to inspect progress, not to claim navigation completions.
function progress(campaignClears, bonusCleared) {
    const t = create();
    for (const l of L.filter(l => l.worldNumber === 6)) {
        const cleared = l.bonus ? bonusCleared : l.stageNumber <= campaignClears;
        t.state.storage.stages[l.id] = { runs: cleared ? [{ time: 100, clean: true }] : [], clears: cleared ? 1 : 0 };
    }
    t.courses(6);
    return { t, html: t.html('dialog') };
}
for (const [sectors, bonus] of [[0, false], [0, true], [7, false], [7, true], [12, false], [12, true]]) {
    test(`sector progress counts ${sectors}/12 independently of bonus completion (${bonus})`, () => {
        const { html } = progress(sectors, bonus);
        assert.ok(html.includes(`${sectors} / 12 SECTORS CLEARED`));
        assert.ok(html.includes(`${bonus ? 1 : 0} / 1 BONUS CLEARED`));
        assert.equal((html.match(/class="level-card /g) || []).length, 13);
        assert.ok(html.includes('Grand Tour · all 60'));
        assert.ok(html.includes('The Century Ship is a separate bonus, excluded from every circuit.'));
    });
}
test('marine progress keeps twelve harbors and has no bonus counter', () => {
    const t = create();
    for (const world of [1, 2, 3]) {
        const stage = L.find(l => l.worldNumber === world);
        t.state.storage.stages[stage.id] = { runs: [{ time: 100, clean: true }] };
        t.courses(world);
        const html = t.html('dialog');
        assert.ok(html.includes('1 / 12 HARBORS MOORED'));
        assert.ok(!html.includes('BONUS CLEARED'));
    }
});
