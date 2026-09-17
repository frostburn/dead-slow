// @ts-check
(function (/** @type {typeof globalThis} */ root){
    'use strict';
    /** @param {import('./contracts.js').PolarServices} services
     * @returns {import('./contracts.js').PolarAdapter} */
    function create({polar:I,view,input,finish,fail}){
        return {id:'polar',create:level=>I.create(level),ready:I.ready,
            clean:run=>run.polar.contacts===0&&run.polar.stats.damageTaken===0&&run.polar.stats.towBreaks===0&&run.polar.fleet.every(f=>f.ship.hull>=100),
            step(run,dt){I.step(run.polar.level,run,input,dt);if(run.polar.failure)fail();else if(run.polar.complete)finish();},
            command:I.command,action:I.action,
            key(e,run){
                /** @type {Record<string,import('./contracts.js').PolarAction>} */
                const keys=run.polar.submarine?{KeyB:'fire',KeyT:'target',KeyP:'ping',KeyI:'identify',KeyF:'team',KeyZ:'ascend',KeyX:'descend'}:{KeyB:'fire',KeyT:'target'};
                const name=keys[e.code];if(!name)return false;e.preventDefault();if(!e.repeat)I.action(run,name);return true;
            },
            update:view.update,render:view.render,dialog:view.dialog,
            result:run=>({polar:{...run.polar.stats,iceContacts:run.polar.contacts}})};
    }
    const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PolarSimulation=api;
})(globalThis);
