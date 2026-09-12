'use strict';
// Execute the actual game state machine without rendering or wall-clock frames.
// This is a test harness, not a second implementation of the simulation.
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const P = require('../src/physics.js'), L = require('../src/levels.js'), S = require('../src/storage.js');
function create() {
    const nodes = new Map();
    const node = id => {
        if (!nodes.has(id))
            nodes.set(id, {
                textContent: '', innerHTML: '', hidden: false, dataset: {}, style: { setProperty() {
                    } }, classList: { toggle() {
                    }, add() {
                    }, remove() {
                    } }, setAttribute() {
                }, addEventListener() {
                }, querySelector() {
                    return null;
                }, querySelectorAll() {
                    return [];
                }, contains() {
                    return false;
                }, click() {
                }
            });
        return nodes.get(id);
    };
    const document = {
        getElementById: node, querySelectorAll() {
            return [];
        }, addEventListener() {
        }, body: node('body'), activeElement: null
    };
    const noop = () => {
    };
    const ctx = {
        HarborConsole: require('../src/console.js'), HarborPhysics: P, HarborNavigation: require('../src/navigation.js'), HarborJobs: require('../src/jobs.js'), HarborLevels: L, HarborWorlds: L.worlds, HarborStorage: S, HarborRenderer: { create: () => ({ scale: 1, render: noop }) }, HarborAudio: { create: () => ({
                init: noop, tick: noop, order: noop, impact: noop, checkpoint: noop, success: noop, horn: noop
            }) }, document,
        localStorage: { getItem: () => null, setItem: noop }, requestAnimationFrame: noop, performance: { now: () => 0 }, location: { search: '?test' }, URLSearchParams, console, addEventListener: noop, setTimeout: noop
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/game.js'), 'utf8'), ctx);
    return ctx.DeadSlowTest;
}
module.exports = { create };
