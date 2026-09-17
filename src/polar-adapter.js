// @ts-check
(function (/** @type {typeof globalThis} */ root){
    'use strict';
    /** @param {import('./contracts.js').PolarServices} services
     * @returns {import('./contracts.js').PolarAdapter} */
    function create({polar:I,view,input,finish,fail}){
        return {id:'polar',create:level=>I.create(level),ready:I.ready,
            clean:run=>run.polar.contacts===0&&run.polar.fleet.every(f=>f.ship.hull>=100),
            step(run,dt){I.step(run.polar.level,run,input,dt);if(run.polar.failure)fail();else if(run.polar.complete)finish();},
            command:I.command,update:view.update,render:view.render,dialog:view.dialog,
            result:run=>({polar:{...run.polar.stats,iceContacts:run.polar.contacts}})};
    }
    const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PolarSimulation=api;
})(globalThis);
