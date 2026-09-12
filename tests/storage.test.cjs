'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const S = require('../src/storage.js');
const memory = () => ({ data: {}, getItem(k) {
        return this.data[k] || null;
    }, setItem(k, v) {
        this.data[k] = v;
    } });
const run = (time, clean = true) => ({
    time, clean, contacts: clean ? 0 : 1, hull: 100, wakes: 0, groundings: 0
});
test('empty storage loads defaults and tracks departures', () => {
    const s = S.create(memory());
    s.attempt('dead-slow');
    assert.equal(s.data.attempts, 1);
    assert.equal(s.stage('dead-slow').attempts, 1);
});
test('overall and clean personal best are independent', () => {
    const s = S.create(memory());
    s.record('a', run(90), [], []);
    s.record('a', run(70, false), [], []);
    assert.equal(s.best('a').time, 70);
    assert.equal(s.best('a', true).time, 90);
});
test('slower runs cannot replace the best ghost or its splits', () => {
    const s = S.create(memory());
    assert.ok(s.record('a', run(70), [[0, 1, 2, 3]], [30]));
    assert.ok(!s.record('a', run(80), [[0, 4, 5, 6]], [40]));
    assert.deepEqual(s.stage('a').ghost, [[0, 1, 2, 3]]);
    assert.deepEqual(s.stage('a').bestSplits, [30]);
});
test('leaderboard pruning retains slower clean records', () => {
    const s = S.create(memory());
    for (let i = 0; i < 30; i++)
        s.record('a', run(30 + i, false), [], []);
    s.record('a', run(100, true), [], []);
    assert.equal(s.best('a', true).time, 100);
    assert.ok(s.stage('a').runs.length <= 20);
});
test('records survive reload and export/import', () => {
    const m = memory(), a = S.create(m);
    a.record('a', run(80), [[0, 1, 2, 0]], [35]);
    const b = S.create(m);
    assert.equal(b.best('a').time, 80);
    const c = S.create(memory());
    c.import(b.export());
    assert.deepEqual(c.stage('a'), b.stage('a'));
});
test('invalid and nonfinite imports do not poison the leaderboard', () => {
    const s = S.sanitize({ version: 1, stages: { x: { runs: [
                    run(-1), run(Infinity), { time: '10', clean: true, contacts: 0 }, run(75)
                ], ghost: [[0, 1, 2, 3], [0, NaN, 1, 2]], bestSplits: [1, Infinity] } } });
    assert.equal(s.stages.x.runs.length, 1);
    assert.equal(s.stages.x.ghost.length, 1);
    assert.deepEqual(s.stages.x.bestSplits, [1]);
});
test('storage denial falls back to a working in-memory session', () => {
    const s = S.create({ getItem() {
            throw Error('denied');
        }, setItem() {
            throw Error('quota');
        } });
    assert.equal(s.available, false);
    s.record('a', run(60), [], []);
    assert.equal(s.best('a').time, 60);
    assert.equal(s.available, false);
});
test('an incompatible import leaves the existing logbook intact', () => {
    const s = S.create(memory());
    s.record('a', run(60), [], []);
    assert.throws(() => s.import('{"version":999}'));
    assert.equal(s.best('a').time, 60);
});
test('reset clears all records', () => {
    const s = S.create(memory());
    s.record('a', run(60), [], []);
    s.reset();
    assert.equal(s.best('a'), null);
    assert.equal(s.data.attempts, 0);
});
