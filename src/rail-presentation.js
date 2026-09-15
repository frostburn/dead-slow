(function(root) {
    'use strict';
    const R=typeof module!=='undefined'&&module.exports?require('./rail.js'):root.Railway;
    const indicatorStates=new WeakMap();
    function indicators(st) {
        let state=indicatorStates.get(st);
        if(!state){state={slideUntil:new Map(),slipUntil:-Infinity};indicatorStates.set(st,state);}
        // Clear warnings only after a quiet interval. Never feed display
        // persistence back into adhesion or braking forces.
        if(st.slip)state.slipUntil=st.time+.45;
        const sliding=new Set();
        for(const g of st.groups)for(const c of g.cars) {
            const alreadyLit=st.time<(state.slideUntil.get(c.id)??-Infinity);
            if(c.sliding&&Math.abs(c.v)>(alreadyLit?.1:.5))state.slideUntil.set(c.id,st.time+.45);
            if(st.time<(state.slideUntil.get(c.id)??-Infinity))sliding.add(c.id);
        }
        return {sliding,slip:st.time<state.slipUntil};
    }
    const displayDirection=(st,c)=>st.reverser*c.face;
    const signedSpeed=st=>{const c=R.engineGroup(st).cars.find(c=>c.id==='engine');const speed=c.v*displayDirection(st,c)*3.6;return Math.abs(speed)<.05?'0.0':speed.toFixed(1);};
    const actionStates=new WeakMap();
    const adviceStates=new WeakMap();
    const couplingStates=new WeakMap();
    function couplingWarning(st,current) {
        let state=couplingStates.get(st);
        if(!state){state={warning:null,until:0};couplingStates.set(st,state);}
        if(current){state.warning=current;state.until=st.time+.6;}
        return st.time<state.until?state.warning:null;
    }
    function stableAdvice(st,help) {
        const key=help.action+':'+help.direction+':'+JSON.stringify(help.split);let state=adviceStates.get(st);
        if(!state){state={key,since:st.time,help};adviceStates.set(st,state);}
        if(key!==state.key){state.key=key;state.since=st.time;}
        if(st.time-state.since>=.4)state.help=help;
        return state.help;
    }
    function actionEnabled(st,name,value,raw) {
        let state=actionStates.get(st);
        const topology=st.groups.map(g=>g.cars.map(c=>c.id).join(',')).join('|')+':'+st.selected;
        if(!state||state.topology!==topology){state={topology,buttons:new Map()};actionStates.set(st,state);}
        const key=name+':'+JSON.stringify(value);let button=state.buttons.get(key);
        if(!button){button={ready:raw,since:st.time};state.buttons.set(key,button);}
        if(!raw){button.ready=false;button.since=st.time;}
        else if(st.time-button.since>=.4)button.ready=true;
        return raw&&button.ready;
    }
    // One projection supplies status, action eligibility and warning persistence
    // for a HUD update. UI history lives here, outside the simulated train.
    function snapshot(st) {
        const metrics=R.metrics(st),warning=R.danger(st),help=R.assistance(st);
        const actions=new Map(),put=(name,value)=>actions.set(name+':'+JSON.stringify(value),R.availability(st,name,value));
        const levers=R.commands.levers(!!st.config.helper);
        for(const lever of levers)put(lever.name,undefined);
        for(const name of ['stop','reverse','hand','couple','dispatch'])put(name,undefined);
        for(const group of st.groups)group.cars.forEach((car,i)=>{
            put('select',car.id);
            if(i<group.cars.length-1)put('uncouple',{after:car.id,before:group.cars[i+1].id});
        });
        for(const sw of st.net.switches)put('switch',sw.node);
        for(const t of st.traffic)put('dispatch',t.id);
        return {metrics,warning,help,signals:indicators(st),recommendation:stableAdvice(st,help),
            coupling:couplingWarning(st,warning.coupling),speed:signedSpeed(st),levers,
            action(name,value){return actions.get(name+':'+JSON.stringify(value))||{enabled:false,reason:'Unknown action.'};}};
    }
    function profile(st) {
        const train=R.engineGroup(st),engine=R.drivingEngine(st),bounds=R.bounds(train);
        const span=Math.max(400,bounds.hi-bounds.lo+240),center=(bounds.lo+bounds.hi)/2;
        const lo=center-span/2,hi=center+span/2,path=R.previewPath(st,train,lo,hi);
        const from=Math.max(lo,path.path[0].start),to=Math.min(hi,path.path.at(-1).end);
        const samples=Array.from({length:101},(_,i)=>{const q=from+(to-from)*i/100;return {q,z:R.locate(st,path,q).z};});
        const cars=[];
        for(const group of [...st.groups,...st.traffic.filter(t=>!t.finished)])for(const car of group.cars) {
            const position=R.locate(st,group,car.q);
            const candidates=path.path.filter(leg=>leg.id===position.edge).map(leg=>leg.dir===1?leg.start+position.s:leg.end-position.s);
            const q=group===train?car.q:candidates.sort((a,b)=>Math.abs(a-engine.q)-Math.abs(b-engine.q))[0];
            if(q===undefined||q+car.length/2<lo||q-car.length/2>hi)continue;
            cars.push({id:car.id,q,z:position.z,length:car.length,powered:!!car.powered,attached:group===train,secured:car.hand});
        }
        const junctions=path.path.flatMap(leg=>{
            const edge=st.net.edges[leg.id],node=leg.dir===1?edge.a:edge.b;
            return st.net.switches.some(sw=>sw.node===node)&&leg.start>=lo&&leg.start<=hi?[{q:leg.start,z:R.locate(st,path,leg.start).z}]:[];
        });
        return {lo,hi,engine:engine.q,samples,cars,junctions};
    }
    const api={profile,snapshot,indicators,displayDirection,signedSpeed,actionEnabled};
    if(typeof module!=='undefined'&&module.exports)module.exports=api;
    root.RailPresentation=api;
})(typeof globalThis!=='undefined'?globalThis:this);
