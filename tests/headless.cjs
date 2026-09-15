'use strict';
// Execute the actual game state machine without rendering or wall-clock frames.
// This is a test harness, not a second implementation of the simulation.
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const P = require('../src/physics.js'), L = require('../src/levels.js'), S = require('../src/storage.js');
function create({fieldDialog=()=>''}={}) {
    const nodes = new Map();
    const node = id => {
        if (!nodes.has(id))
            nodes.set(id, {
                textContent: '', innerHTML: '', hidden: false, dataset: {}, style: { setProperty() {
                    } }, classList: { toggle() {
                    }, add() {
                    }, remove() {
                    } }, setAttribute() {
                }, addEventListener(type, handler) {
                    this.listeners ??= new Map();
                    this.listeners.set(type, handler);
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
    const listeners = new Map(), windowListeners = new Map();
    const document = {
        getElementById: node, querySelectorAll() {
            return [];
        }, addEventListener(type, handler) {
            listeners.set(type, handler);
        }, body: node('body'), activeElement: null
    };
    const noop = () => {
    };
    const ctx = {
        Railway: require('../src/rail.js'), RailView: {prepare:noop, update:noop, key:()=>false, dialog:()=>''},
        GerboRampage: require('../src/rampage.js'), GerboView: {prepare:noop, update:noop, dialog:fieldDialog},
        HarborSpace: require('../src/space.js'), HarborSpaceUI: { prepare: noop, update: noop },
        HarborConsole: require('../src/console.js'), HarborPhysics: P, HarborNavigation: require('../src/navigation.js'), HarborJobs: require('../src/jobs.js'), HarborLevels: L, HarborWorlds: L.worlds, HarborStorage: S, HarborRenderer: { create: () => ({ scale: 1, render: noop }) }, HarborAudio: { create: () => ({
                setRail: noop, railEvent: noop, setRampage: noop, setSpace: noop, radar: noop, init: noop, tick: noop, order: noop, impact: noop, checkpoint: noop, success: noop, horn: noop
            }) }, document,
        localStorage: { getItem: () => null, setItem: noop }, requestAnimationFrame: noop, performance: { now: () => 0 }, location: { search: '?test' }, URLSearchParams, console, addEventListener: (type,handler) => windowListeners.set(type,handler), setTimeout: noop
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/game.js'), 'utf8'), ctx);
    ctx.DeadSlowTest.keydown = event => listeners.get('keydown')({ preventDefault() {}, ...event });
    ctx.DeadSlowTest.action = action => node('dialog').listeners.get('click')({ target: { closest: () => ({ dataset: { action } }) } });
    ctx.DeadSlowTest.blur = () => windowListeners.get('blur')();
    ctx.DeadSlowTest.visibility = hidden => { document.hidden = hidden; listeners.get('visibilitychange')(); };
    ctx.DeadSlowTest.html = id => node(id).innerHTML;
    return ctx.DeadSlowTest;
}
module.exports = { create };
