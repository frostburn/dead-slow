(function(root) {
    'use strict';
    const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),G=9.81,GAP=1.2,COUPLING_SPEED=2/3.6;
    const impactKey=hit=>[hit.a.car.id,hit.b.car.id].sort().join('|');
    const other=(edge,node)=>edge.a===node?edge.b:edge.a;
    function network(config) {
        const edges={};
        for(const track of config.tracks) {
            const controls=track.points||[config.nodes[track.a],config.nodes[track.b]],samples=[];
            // Catmull-Rom centreline, sampled once by arc length. Elevation is
            // linear between survey points to avoid inventing crests at knots.
            for(let i=0;i<controls.length-1;i++)for(let j=0;j<24;j++) {
                const t=j/24,p=controls[Math.max(0,i-1)],a=controls[i],b=controls[i+1],q=controls[Math.min(controls.length-1,i+2)];
                const point=k=>.5*((2*a[k])+(-p[k]+b[k])*t+(2*p[k]-5*a[k]+4*b[k]-q[k])*t*t+(-p[k]+3*a[k]-3*b[k]+q[k])*t*t*t);
                samples.push({x:point(0),y:point(1),z:a[2]+(b[2]-a[2])*t});
            }
            const end=controls[controls.length-1];samples.push({x:end[0],y:end[1],z:end[2]});
            let length=0;samples.forEach((p,i)=>{if(i)length+=Math.hypot(p.x-samples[i-1].x,p.y-samples[i-1].y);p.s=length;});
            edges[track.id]={...track,samples,length};
        }
        return {edges,nodes:config.nodes,switches:config.switches.map(s=>({...s,label:s.label||s.node.toUpperCase(),selected:0}))};
    }
    function at(net,id,s) {
        const edge=net.edges[id];s=clamp(s,0,edge.length);
        let lo=0,hi=edge.samples.length-1;
        while(hi-lo>1){const m=(hi+lo)>>1;if(edge.samples[m].s<s)lo=m;else hi=m;}
        const a=edge.samples[lo],b=edge.samples[hi],length=b.s-a.s,t=(s-a.s)/(length||1);
        return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,
            a:Math.atan2(b.y-a.y,b.x-a.x),grade:(b.z-a.z)/(length||1),edge:id,s,
            limit:(edge.restrictions||[]).find(r=>s/edge.length>=r.from&&s/edge.length<=r.to)?.limit||edge.limit||10,
            adhesion:edge.adhesion??.18};
    }
    const entry=(net,id,dir,start=0)=>({id,dir,start,end:start+net.edges[id].length});
    function locate(st,group,q) {
        const leg=group.path.find(e=>q>=e.start&&q<=e.end)|| (q<group.path[0].start?group.path[0]:group.path[group.path.length-1]);
        const p=at(st.net,leg.id,leg.dir===1?q-leg.start:leg.end-q);
        p.a+=leg.dir===1?0:Math.PI;p.grade*=leg.dir;p.dir=leg.dir;return p;
    }
    const groupFor=(st,id)=>st.groups.find(g=>g.cars.some(c=>c.id===id));
    const engineGroup=st=>st.groups.find(g=>g.cars.some(c=>c.powered));
    const bounds=group=>({lo:Math.min(...group.cars.map(c=>c.q-c.length/2)),hi:Math.max(...group.cars.map(c=>c.q+c.length/2))});
    function occupied(st,node) {
        return st.groups.some(group=>{
            const {lo,hi}=bounds(group);
            return group.path.some(leg=>{
                const edge=st.net.edges[leg.id];
                const q=node===(leg.dir===1?edge.a:edge.b)?leg.start:node===(leg.dir===1?edge.b:edge.a)?leg.end:null;
                return q!==null&&q>=lo-12&&q<=hi+12;
            });
        });
    }
    function route(st,node,incoming) {
        const sw=st.net.switches.find(s=>s.node===node);
        if(sw){const selected=sw.branches[sw.selected];return incoming===sw.stem?selected:incoming===selected?sw.stem:null;}
        return Object.values(st.net.edges).find(e=>e.id!==incoming&&(e.a===node||e.b===node))?.id||null;
    }
    function extend(st,group,forward) {
        const path=group.path,leg=forward?path[path.length-1]:path[0],edge=st.net.edges[leg.id];
        const node=forward?(leg.dir===1?edge.b:edge.a):(leg.dir===1?edge.a:edge.b),next=route(st,node,leg.id);
        if(!next)return false;
        const e=st.net.edges[next],dir=forward?(e.a===node?1:-1):(e.b===node?1:-1);
        const part=entry(st.net,next,dir,forward?leg.end:leg.start-e.length);
        if(forward)path.push(part);else path.unshift(part);return true;
    }
    function create(level) {
        const cfg=level.rail,net=network(cfg);
        const groups=cfg.groups.map((g,i)=>({id:'cut-'+i,path:[entry(net,g.cars[0].edge,1)],brake:1,orders:[{t:-100,value:1}],
            cars:g.cars.map(c=>({...c,q:c.s,v:0,face:1,pressure:1,temp:20,hand:!!g.secured,stress:0,curveTime:0}))}));
        return {net,groups,config:cfg,time:0,power:0,reverser:1,independent:0,selected:'engine',
            completed:[],taskHold:{},finishHold:0,failure:null,notice:'Release the train brake to move.',
            stats:{distance:0,couplings:0,uncouplings:0,peakTemperature:20,peakCoupler:0,contacts:0},nextCut:groups.length};
    }
    function setBrake(st,group,value) {
        value=clamp(value,0,1);if(group.brake===value)return;
        group.brake=value;group.orders.push({t:st.time,value});
    }
    function command(st,name,value) {
        const allowed=availability(st,name,value);
        if(!allowed.enabled){st.notice=allowed.reason;return false;}
        const group=engineGroup(st),engine=group.cars.find(c=>c.powered);
        if(name==='power'){st.power=clamp(value,0,4);return true;}
        if(name==='brake'){setBrake(st,group,value);return true;}
        if(name==='independent'){st.independent=clamp(value,0,1);return true;}
        if(name==='stop'){st.power=0;setBrake(st,group,1);return true;}
        if(name==='reverse') {
            if(Math.abs(engine.v)>.12){st.notice='Stop before changing direction.';return false;}
            st.power=0;st.reverser*=-1;st.notice=st.reverser===1?'Forward selected.':'Reverse selected.';return true;
        }
        if(name==='switch') {
            const sw=st.net.switches.find(s=>s.node===value);if(!sw)return false;
            if(occupied(st,sw.node)){st.notice='Points occupied — clear the whole train first.';return false;}
            sw.selected=(sw.selected+1)%sw.branches.length;st.notice=sw.names[sw.selected]+'.';return true;
        }
        if(name==='select'){st.selected=value;return true;}
        if(name==='hand') {
            const cut=groupFor(st,st.selected);if(!cut)return false;
            if(cut.cars.some(c=>Math.abs(c.v)>.15)){st.notice='Stop this cut before setting handbrakes.';return false;}
            const apply=!cut.cars.some(c=>c.hand);cut.cars.forEach(c=>c.hand=apply);
            st.notice=apply?'Handbrakes set on this cut.':'Handbrakes released on this cut.';return true;
        }
        if(name==='uncouple') {
            value=typeof value==='object'?value.after:value;
            const cut=groupFor(st,value),i=cut?.cars.findIndex(c=>c.id===value);
            if(!cut||i<0||i===cut.cars.length-1)return false;
            if(st.power||cut.cars.some(c=>Math.abs(c.v)>.12||(!c.hand&&c.pressure<.3))){st.notice='Stop, cut power and apply brakes before uncoupling.';return false;}
            const detached={id:'cut-'+st.nextCut++,path:cut.path.map(e=>({...e})),cars:cut.cars.splice(i+1),brake:1,orders:[{t:st.time-100,value:1}]};
            setBrake(st,cut,1);st.groups.push(detached);
            const wagons=cut.cars.some(c=>c.powered)?detached:cut;
            st.selected=wagons.cars[0].id;st.stats.uncouplings++;
            st.notice='Cut detached. Set its handbrakes before leaving it.';return true;
        }
        if(name==='couple')return couple(st);
        return false;
    }
    function endpoints(st,group) {
        const b=bounds(group);
        return [{q:b.hi,sign:1,car:group.cars[0]},{q:b.lo,sign:-1,car:group.cars[group.cars.length-1]}].map(e=>({...e,...locate(st,group,e.q)}));
    }
    function nearby(st,group,max=3) {
        let nearest=null,distance=max;
        for(const cut of st.groups)if(cut!==group)for(const a of endpoints(st,group))for(const b of endpoints(st,cut)) {
            // End faces must oppose along the same rail. Nearby parallel tracks
            // are not a coupling opportunity.
            const gap=Math.abs(a.s-b.s);
            if(a.edge===b.edge&&gap<=distance&&(b.s-a.s)*a.dir*a.sign>=-.1&&Math.cos(a.a-b.a)*a.sign*b.sign<-.7){nearest={cut,a,b,distance:gap};distance=gap;}
        }
        return nearest;
    }
    function availability(st,name,value) {
        const eg=engineGroup(st),selected=groupFor(st,st.selected)||eg;
        let reason='';
        if(st.failure)reason='Retry to begin again.';
        else if(name==='select'&&!groupFor(st,value))reason='That cut has changed. Select it again.';
        else if(name==='reverse'&&eg.cars.some(c=>Math.abs(c.v)>.12))reason='Stop the whole train before reversing.';
        else if(name==='hand'&&selected.cars.some(c=>Math.abs(c.v)>.15))reason='Stop the selected cut before changing handbrakes.';
        else if(name==='uncouple') {
            const id=typeof value==='object'?value?.after:value,g=groupFor(st,id),i=g?.cars.findIndex(c=>c.id===id);
            if(!g||i===g.cars.length-1||(typeof value==='object'&&g.cars[i+1].id!==value.before))reason='That link has changed. Choose the link again.';
            else if(st.power)reason='Cut power before uncoupling.';
            else if(g.cars.some(c=>Math.abs(c.v)>.12))reason='Stop the whole cut before uncoupling.';
            else if(g.cars.some(c=>!c.hand&&c.pressure<.3))reason='Apply the train brake and wait for the wagons to brake.';
        } else if(name==='couple') {
            const hit=nearby(st,eg);
            if(!hit)reason='Approach within 3 m of the waiting cut.';
            else if(st.bufferImpact?.key===impactKey(hit)&&st.bufferImpact.speed>COUPLING_SPEED)reason='Back away beyond 3 m, then approach below 2 km/h.';
            else if(Math.abs(hit.a.car.v-hit.b.car.v*hit.a.dir*hit.b.dir)>COUPLING_SPEED)reason='Match speed below 2 km/h to couple.';
        } else if(name==='switch') {
            if(!st.net.switches.some(s=>s.node===value))reason='Unknown points.';
            else if(occupied(st,value))reason='Clear the whole train from these points.';
        }
        return {enabled:!reason,reason};
    }
    function assistance(st) {
        const eg=engineGroup(st),selected=groupFor(st,st.selected)||eg,hit=nearby(st,eg,Infinity);
        const hands=selected.cars.filter(c=>c.hand).length,air=Math.min(...selected.cars.map(c=>c.pressure));
        const label=selected.cars.map(c=>c.powered?'Loco':c.id).join(' · ');
        const cut=`${label} — handbrakes ${hands}/${selected.cars.length} · air brake ${Math.round(air*100)}%`;
        const pickup=hit?`${hit.b.car.id} · ${hit.distance.toFixed(1)} m to buffers · relative speed ${(Math.abs(hit.a.car.v-hit.b.car.v*hit.a.dir*hit.b.dir)*3.6).toFixed(1)} km/h`:'No waiting cut on this stretch of track.';
        let next='',action=null,split=null;
        // A newly released cut needs attention regardless of mission order.
        if(selected!==eg&&hands<selected.cars.length){next='Secure this cut before leaving it.';action='hand';}
        const task=st.config.tasks.find(t=>!st.completed.includes(t.id)&&(!t.after||st.completed.includes(t.after)));
        if(!next&&task) {
            const zone=st.config.zones.find(z=>z.id===task.zone);
            if(task.type==='coupled'){const a=availability(st,'couple');next=a.enabled?'Buffers in reach. Couple the waiting wagons.':hit&&hit.distance<=3?a.reason:pickup;action='couple';}
            else {
                const ids=task.type==='stop'?['engine']:task.cars;
                const cars=ids.map(id=>{const g=groupFor(st,id);return {g,c:g?.cars.find(c=>c.id===id)};}).filter(({c})=>c);
                const outside=cars.filter(({g,c})=>!inside(st,c,g,zone));
                if(task.type==='park'&&cars.some(({g})=>g!==eg)){next='Reconnect every wagon before parking the complete train.';action='couple';}
                else if(outside.length) {
                    const {g,c}=outside.at(-1),p=locate(st,g,c.q);
                    const missing=p.edge===zone.edge?Math.max(zone.from-(p.s-c.length/2),p.s+c.length/2-zone.to,0):null;
                    next=missing!==null?`${c.id==='engine'?'Loco':c.id} needs ${Math.ceil(missing)} m more clearance inside ${zone.name}.`:`Bring ${c.id==='engine'?'the loco':c.id} into ${zone.name}.`;
                } else if(st.power||cars.some(({c})=>Math.abs(c.v)>.08)){next='Cut power and stop in the marked track.';action='stop';}
                else if(task.type==='stop'&&task.independent&&st.independent<=.3){next='Apply the loco brake to complete this stop.';action='independent';}
                else if(task.type==='delivery'&&cars.some(({g})=>g===eg)) {
                    const i=eg.cars.findIndex((c,i,a)=>i<a.length-1&&ids.includes(c.id)!==ids.includes(a[i+1].id));
                    if(i>=0){split={after:eg.cars[i].id,before:eg.cars[i+1].id};action='uncouple';next=`Release the delivery at ${split.after} / ${split.before}.`;const a=availability(st,'uncouple',split);if(!a.enabled)next=a.reason;}
                } else if(cars.some(({c})=>!c.hand)) {
                    const id=cars.find(({c})=>!c.hand).c.id;
                    next=`Set handbrakes on ${id}'s cut.`;action=groupFor(st,id)===selected?'hand':'select';
                } else {
                    const blocked=st.net.switches.filter(s=>occupied(st,s.node));
                    next=blocked.length?`Clear ${blocked.map(s=>s.label).join(', ')} with every wagon.`:'Hold here to complete the delivery.';
                }
            }
        }
        if(!next)next='Keep all delivered wagons secured.';
        if(eg.cars.some(c=>c.hand)&&!['hand','uncouple'].includes(action)){next+=' Release the attached handbrakes before moving.';}
        return {cut,pickup,next,action,split};
    }
    function couple(st) {
        const group=engineGroup(st),hit=nearby(st,group);
        if(!hit){st.notice='Bring either end within 3 m of the waiting cut.';return false;}
        const {cut,a,b}=hit,orientation=Math.cos(a.a-b.a)>0?1:-1;
        if(st.bufferImpact?.key===impactKey(hit)&&st.bufferImpact.speed>COUPLING_SPEED){st.notice='Approach was too fast. Back away beyond 3 m, then approach below 2 km/h.';return false;}
        if(Math.abs(a.car.v-b.car.v*orientation)>COUPLING_SPEED){st.notice='Too fast to couple. Match speed below 2 km/h.';return false;}
        const moved=cut.cars.map(c=>({...c,q:a.q+a.sign*GAP+(c.q-b.q)*orientation,v:c.v*orientation,face:c.face*orientation}));
        const low=Math.min(...moved.map(c=>c.q-c.length/2)),high=Math.max(...moved.map(c=>c.q+c.length/2));
        // Extend the receiving path, then verify that every donor wagon still
        // occupies its actual track. Parallel rails cannot be joined by proximity.
        const saved=group.path.map(e=>({...e}));
        for(let i=0;i<30&&(low<group.path[0].start||high>group.path[group.path.length-1].end);i++) {
            if(!extend(st,group,high>group.path[group.path.length-1].end)){group.path=saved;st.notice='The route between the cuts is blocked.';return false;}
        }
        const matches=moved.every((c,i)=>{
            const target=locate(st,cut,cut.cars[i].q),actual=locate(st,group,c.q);
            return target.edge===actual.edge&&Math.hypot(target.x-actual.x,target.y-actual.y)<5;
        });
        if(!matches){group.path=saved;st.notice='Align the route with the waiting cut.';return false;}
        const total=[...group.cars,...moved],momentum=total.reduce((s,c)=>s+c.mass*c.v,0),mass=total.reduce((s,c)=>s+c.mass,0);
        total.forEach(c=>c.v=momentum/mass);group.cars=total.sort((a,b)=>b.q-a.q);st.groups=st.groups.filter(g=>g!==cut);
        st.selected=group.cars.find(c=>c.powered).id;
        st.bufferImpact=null;st.stats.couplings++;st.notice='Coupled. Check the handbrakes before pulling away.';return true;
    }
    function inside(st,car,group,zone) {
        return [-1,1].every(sign=>{const p=locate(st,group,car.q+sign*car.length/2);return p.edge===zone.edge&&p.s>=zone.from&&p.s<=zone.to;});
    }
    function taskReady(st,task) {
        const eg=engineGroup(st),engine=eg.cars.find(c=>c.powered),zone=st.config.zones.find(z=>z.id===task.zone);
        if(task.after&&!st.completed.includes(task.after))return false;
        if(task.type==='stop')return inside(st,engine,eg,zone)&&Math.abs(engine.v)<.08&&(!task.independent||st.independent>.3)&&st.power===0;
        if(task.type==='coupled')return task.cars.every(id=>eg.cars.some(c=>c.id===id));
        const cars=task.cars.map(id=>{const g=groupFor(st,id);return {g,c:g?.cars.find(c=>c.id===id)};});
        if(task.type==='park'&&cars.some(({g})=>g!==eg))return false;
        return st.power===0&&cars.every(({c,g})=>c&&Math.abs(c.v)<.08&&c.hand&&inside(st,c,g,zone)&&
            (task.type!=='delivery'||!g.cars.some(c=>c.powered)))&&st.net.switches.every(s=>!occupied(st,s.node));
    }
    function update(st,dt) {
        if(st.failure)return;
        st.time+=dt;st.slip=false;
        for(const group of st.groups) {
            const engine=group.cars.find(c=>c.powered),cars=group.cars,force=cars.map(c=>{
                const p=locate(st,group,c.q);c.location=p;
                return -c.mass*G*p.grade;
            });
            // A released cut retains air temporarily; only handbrakes secure it
            // indefinitely. This also provides the future runaway-wagon mechanic.
            if(!engine)group.brake=Math.max(0,group.brake-dt*.007);
            for(let i=0;i<cars.length-1;i++) {
                const a=cars[i],b=cars[i+1],rest=(a.length+b.length)/2+GAP,extension=a.q-b.q-rest;
                const stretch=Math.sign(extension)*Math.max(0,Math.abs(extension)-.22);
                const load=stretch*180000+(a.v-b.v)*(stretch?55000:4000);
                force[i]-=load;force[i+1]+=load;a.coupler=load;
                st.stats.peakCoupler=Math.max(st.stats.peakCoupler,Math.abs(load));
                a.stress=Math.abs(load)>650000?a.stress+dt:Math.max(0,a.stress-dt);
                if(a.stress>.6)st.failure='A coupler parted. Ease power and brake changes across the crest.';
            }
            for(let i=0;i<cars.length;i++) {
                const c=cars[i],p=c.location,old=c.q;
                const delay=engine?Math.abs(c.q-engine.q)*.022:0;
                const order=engine?[...group.orders].reverse().find(o=>o.t<=st.time-delay)?.value??1:group.brake;
                c.pressure+=(order-c.pressure)*Math.min(1,dt/(c.powered?.5:1.4));
                const fade=1-clamp((c.temp-180)/270,0,.8);
                let brake=c.mass*(c.powered?.85:.7)*c.pressure*fade;
                if(c.powered) {
                    const demand=st.power/4*210000,adhesion=p.adhesion*c.mass*G;
                    force[i]+=Math.min(demand,adhesion)*st.reverser*c.face;
                    if(demand>adhesion*1.01)st.slip=true;
                    brake=Math.max(brake,c.mass*1.05*st.independent*fade);
                }
                brake=Math.min(brake,p.adhesion*c.mass*G);
                if(c.hand)brake=Math.max(brake,c.mass*1.5);
                const resistance=c.mass*(.012+.00025*c.v*c.v),opposition=brake+resistance;
                const sign=Math.abs(c.v)>.004?Math.sign(c.v):Math.sign(force[i]);
                if(Math.abs(c.v)<.02&&Math.abs(force[i])<=opposition)c.v=0;
                else {const next=c.v+(force[i]-sign*opposition)/c.mass*dt;c.v=c.v*next<0&&Math.abs(force[i])<=opposition?0:next;}
                c.q+=c.v*dt;
                if(c.powered)st.stats.distance+=Math.abs(c.q-old);
                if(st.config.thermal)c.temp=clamp(c.temp+(brake*Math.abs(c.v)/c.mass*.9-(c.temp-20)*(.005+Math.abs(c.v)*.0003))*dt,20,650);
                st.stats.peakTemperature=Math.max(st.stats.peakTemperature,c.temp);
                c.curveTime=Math.abs(c.v)>p.limit*1.35?c.curveTime+dt:Math.max(0,c.curveTime-dt);
                if(c.curveTime>1.5)st.failure='The train left the rails on a curve. Slow the tail before it reaches the bend.';
            }
            // Keep only the occupied route history. After the tail clears, a
            // reversal can take newly selected points instead of a stale path.
            const b=bounds(group);
            while(group.path.length>1&&b.lo>group.path[0].end+14)group.path.shift();
            while(group.path.length>1&&b.hi<group.path[group.path.length-1].start-14)group.path.pop();
            for(const forward of [false,true]) {
                const bound=forward?b.hi:b.lo,leg=forward?group.path[group.path.length-1]:group.path[0];
                const contactKey=leg.id+':'+forward;
                group.endContacts=group.endContacts||{};
                if(forward?bound<leg.end-3:bound>leg.start+3)delete group.endContacts[contactKey];
                if(forward?bound>leg.end-2:bound<leg.start+2) {
                    if(!extend(st,group,forward)) {
                        const speed=Math.max(...cars.map(c=>Math.abs(c.v)));
                        if(!group.endContacts[contactKey]&&speed>.02)st.stats.contacts++;
                        group.endContacts[contactKey]=true;
                        if(speed>1.4)st.failure='The train ran past a stop or into the buffers. Brake earlier.';
                        const shift=forward?Math.min(0,leg.end-2-bound):Math.max(0,leg.start+2-bound);
                        cars.forEach(c=>{c.q+=shift;c.v=0;});
                        if(engine){st.power=0;st.notice='End of available track. Check the points or reverse.';}
                    }
                }
            }
            const history=engine?Math.max(30,...cars.map(c=>Math.abs(c.q-engine.q)*.022+2)):30;
            group.orders=group.orders.filter((o,i,a)=>i===a.length-1||a[i+1].t>st.time-history);
        }
        const eg=engineGroup(st),hit=nearby(st,eg,1.1);
        if(hit) {
            const rel=hit.a.car.v-hit.b.car.v*Math.cos(hit.a.a-hit.b.a);
            const key=impactKey(hit),previous=st.bufferImpact?.key===key?st.bufferImpact:null;
            if(!previous&&Math.abs(rel)>.02)st.stats.contacts++;
            st.bufferImpact={key,speed:Math.max(previous?.speed||0,Math.abs(rel))};
            if(Math.abs(rel)>1.4)st.failure='A hard coupling damaged the wagons. Approach below 2 km/h.';
            const correction=1.2-Math.hypot(hit.a.x-hit.b.x,hit.a.y-hit.b.y);
            eg.cars.forEach(c=>{c.q-=hit.a.sign*Math.max(0,correction);c.v=0;});hit.cut.cars.forEach(c=>c.v=0);
            st.power=0;st.notice=st.bufferImpact.speed>COUPLING_SPEED?'Hard buffer contact. Back away beyond 3 m and approach slowly.':'Buffers touching. Press F to couple.';
        }
        const approach=nearby(st,eg,3);
        if(st.bufferImpact&&(!approach||impactKey(approach)!==st.bufferImpact.key))st.bufferImpact=null;
        for(const task of st.config.tasks) {
            const met=taskReady(st,task);
            st.taskHold[task.id]=met?(st.taskHold[task.id]||0)+dt:0;
            if(met&&st.taskHold[task.id]>=1&&!st.completed.includes(task.id))st.completed.push(task.id);
            // Delivery/parking are live requirements; leaving the zone revokes
            // them. Tutorial milestones remain remembered.
            if(!met&&['delivery','park'].includes(task.type))st.completed=st.completed.filter(id=>id!==task.id);
        }
        st.finishHold=st.config.tasks.every(t=>st.completed.includes(t.id))?st.finishHold+dt:0;
    }
    function metrics(st) {
        const group=engineGroup(st),engine=group.cars.find(c=>c.powered),mass=group.cars.reduce((s,c)=>s+c.mass,0),b=bounds(group);
        const direction=Math.abs(engine.v)>.02?Math.sign(engine.v):st.reverser*engine.face;
        const gradient=group.cars.reduce((s,c)=>s+locate(st,group,c.q).grade*c.mass,0)/mass;
        const braking=group.cars.reduce((s,c)=>s+c.mass*(c.powered?.85:.7)*(1-clamp((c.temp-180)/270,0,.8)),0)/mass;
        const decel=braking+gradient*G*direction+.012;
        const stopping=decel>.02?engine.v*engine.v/(2*decel)+Math.abs(engine.v)*(1.4+(b.hi-b.lo)*.022):Infinity;
        return {mass,length:b.hi-b.lo,speed:engine.v,gradient,stopping,
            head:locate(st,group,direction>0?b.hi:b.lo),tail:locate(st,group,direction>0?b.lo:b.hi),
            temperature:Math.max(...group.cars.map(c=>c.temp)),limit:Math.min(...group.cars.map(c=>locate(st,group,c.q).limit))};
    }
    // Presentation-only lookahead. Extend a copy so inspecting an unoccupied
    // junction never reserves its route or alters subsequent train movement.
    function danger(st) {
        const g=engineGroup(st),m=metrics(st),engine=g.cars.find(c=>c.powered);
        const direction=Math.abs(engine.v)>.02?Math.sign(engine.v):st.reverser*engine.face,b=bounds(g);
        const cars=g.cars.map(c=>{const p=locate(st,g,c.q);return {id:c.id,ratio:Math.abs(c.v)/p.limit,limit:p.limit,edge:p.edge,s:p.s};}).filter(c=>c.ratio>1);
        const severity=cars.some(c=>c.ratio>=1.2)?2:cars.length?1:0;
        const head=direction>0?b.hi:b.lo,path={path:g.path.map(e=>({...e}))};
        const horizon=Math.min(500,Math.max(70,(Number.isFinite(m.stopping)?m.stopping:400)+Math.abs(m.speed)*4));
        for(let i=0;i<20;i++) {
            const end=direction>0?path.path.at(-1).end:path.path[0].start;
            if((end-head)*direction>=horizon||!extend(st,path,direction>0))break;
        }
        let ahead=null;
        for(let d=0;d<=horizon;d+=4) {
            const q=head+direction*d;
            if(q<path.path[0].start||q>path.path.at(-1).end)break;
            const p=locate(st,path,q);
            if(Math.abs(m.speed)>p.limit*1.02){ahead={edge:p.edge,s:p.s,limit:p.limit,distance:d};break;}
        }
        return {severity:Math.max(severity,ahead?1:0),cars,ahead};
    }
    const api={network,at,locate,create,update,command,availability,assistance,occupied,engineGroup,groupFor,bounds,metrics,taskReady,danger};
    if(typeof module!=='undefined'&&module.exports)module.exports=api;
    root.Railway=api;
})(typeof globalThis!=='undefined'?globalThis:this);
