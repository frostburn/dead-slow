/* Underwater bridge: draw observed acoustic tracks, not hidden actor positions. */
(function(root){
    'use strict';
    const L=typeof module!=='undefined'&&module.exports?require('./polar-labels.js'):root.PaleReachLabels;
    const P=typeof module!=='undefined'&&module.exports?require('./physics.js'):root.HarborPhysics;
    const U=typeof module!=='undefined'&&module.exports?require('./submarine.js'):root.PaleReachSubmarine;
    const F=typeof module!=='undefined'&&module.exports?require('./polar-finale.js'):root.PaleReachFinale;
    const $=id=>document.getElementById(id),set=(id,text)=>{const n=$(id),s=String(text);if(n.textContent!==s)n.textContent=s;},html=(id,text)=>{if($(id).innerHTML!==text)$(id).innerHTML=text;};
    const backgrounds=new WeakMap(),lookahead=new WeakMap(),TAU=Math.PI*2;
    const hazard='#d2ad78';
    function polygon(ctx,points){
        ctx.beginPath();
        ctx.moveTo(points[0].x,points[0].y);
        for(const p of points.slice(1))ctx.lineTo(p.x,p.y);
        ctx.closePath();
    }
    function hatch(ctx,points,bounds,spacing){
        const {minX,minY,maxX,maxY}=bounds,height=maxY-minY;
        ctx.save();polygon(ctx,points);ctx.clip();ctx.beginPath();
        for(let x=minX-height;x<maxX;x+=spacing){
            ctx.moveTo(x,minY);ctx.lineTo(x+height,maxY);
        }
        ctx.strokeStyle='#e5bc8359';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
    }
    function shelfPath(ctx,outline,center,inset){
        const points=outline.map(p=>({x:P.lerp(p.x,center.x,inset),y:P.lerp(p.y,center.y,inset)}));
        const first=points[0],last=points.at(-1);
        ctx.beginPath();ctx.moveTo((first.x+last.x)/2,(first.y+last.y)/2);
        for(let i=0;i<points.length;i++){
            const p=points[i],next=points[(i+1)%points.length];
            ctx.quadraticCurveTo(p.x,p.y,(p.x+next.x)/2,(p.y+next.y)/2);
        }
        ctx.closePath();
    }
    function terrain(st,depth){
        const blocked=st.shelves.map(s=>depth+5>=s.floor-2),key=blocked.join(',');
        const cached=backgrounds.get(st);
        if(cached?.key===key&&cached.shelves===st.shelves)return cached;
        const canvas=cached?.canvas||document.createElement('canvas');
        const [w,h]=st.level.world;
        canvas.width=w;canvas.height=h;
        const ctx=canvas.getContext('2d');
        const water=ctx.createLinearGradient(0,0,w,h);
        water.addColorStop(0,'#1a3946');water.addColorStop(1,'#101f2b');
        ctx.fillStyle=water;ctx.fillRect(0,0,w,h);
        const soundings=st.shelves.map((s,i)=>{
            const bounds=P.bounds(s.poly),{minX,minY,maxX,maxY}=bounds;
            const center={x:(minX+maxX)/2,y:(minY+maxY)/2};
            const shade=ctx.createLinearGradient(minX,minY,maxX,maxY);
            shade.addColorStop(0,'#436e76');shade.addColorStop(1,'#26424a');
            // Soft relief gives passable shelves depth without implying a
            // hard edge. The hatch rim is the exact blocking polygon.
            ctx.save();ctx.shadowColor='#557b8677';ctx.shadowBlur=21;
            shelfPath(ctx,s.poly,center,-.13);ctx.fillStyle='#294a5388';ctx.fill();ctx.restore();
            shelfPath(ctx,s.poly,center,-.04);ctx.fillStyle=shade;ctx.fill();
            ctx.lineWidth=1.15;ctx.strokeStyle='#a6cad53a';
            for(const inset of [-.15,.17,.37]){shelfPath(ctx,s.poly,center,inset);ctx.stroke();}
            if(blocked[i]){
                polygon(ctx,s.poly);ctx.fillStyle='#67574172';ctx.fill();
                hatch(ctx,s.poly,bounds,24);
                polygon(ctx,s.poly);ctx.strokeStyle=hazard;ctx.lineWidth=1.8;ctx.stroke();
            }
            return {...center,depth:s.floor,blocked:blocked[i]};
        });
        const layer={key,canvas,soundings,shelves:st.shelves};
        backgrounds.set(st,layer);return layer;
    }
    function depthPreview(st,s){
        const key=[Math.floor(st.time*4),Math.round(s.x),Math.round(s.y),Math.round(s.a*20),Math.round(s.depth),s.depthTarget].join('/');
        let frame=lookahead.get(st);
        if(frame?.key!==key){frame={key,preview:U.depthPreview(st,s)};lookahead.set(st,frame);}
        return frame.preview;
    }
    const kind=t=>!t.identified?'UNIDENTIFIED':t.category==='service'?'FRIENDLY TENDER':t.category==='decoy'?'DECOY':t.category==='patrol'?'SURFACE PATROL':'HOSTILE SUBMARINE';
    function splits(run,format){return (run.finalJourney?F.progress(run):U.progress(run)).map(o=>{const s=run.splits.find(s=>s.name===o.text);return `<div class="split-row ${s?'done':''}"><span>${o.text}</span><span>${s?format(s.time):'—'}</span></div>`;}).join('');}
    function prepare(level,action){
        $('polar-actions').hidden=false;$('polar-tow-controls').hidden=true;$('polar-gun-controls').hidden=true;$('polar-sub-controls').hidden=false;
        $('polar-fleet').innerHTML='';$('sub-contacts').innerHTML='';
        $('polar-actions').onclick=e=>{const b=e.target.closest('[data-polar-action],[data-sub-depth],[data-sub-target],[data-pickup]');if(b&&!b.disabled)action(b.dataset.pickup?'rendezvous':b.dataset.subDepth!==undefined?'depth':b.dataset.subTarget?'target':b.dataset.polarAction,b.dataset.pickup??b.dataset.subDepth??b.dataset.subTarget);};
        document.title='DEAD SLOW — Under the Pale Reach';
        set('courses-btn','World map');set('dock-list-label','UNDERWATER WATCH');set('check-objectives','Assignment secured');set('check-inside','Home water');set('check-aligned','Depth settled');set('check-slow','Quiet and slow');
        set('polar-dispatch',level.polar.dispatch[0]);
        set('polar-legend','Hatching marks blocked water at your depth. Sonar diamonds mark estimates. Select a contact to see its uncertainty circle.');
        $('chart-section').setAttribute('aria-label','Underwater passage chart and estimated sonar contacts');
        $('sea').setAttribute('aria-label','Underwater chart. Sonar contacts are uncertain estimates. Seabed shelves and moving iceberg keels restrict the current depth.');
        const teamWatch=['covert','recovery'].includes(level.polar.mission);
        $('sub-team').hidden=!teamWatch;$('sub-fire').hidden=teamWatch;
        $('sub-pickups').hidden=!level.polar.extraction;
        html('sub-pickups',(level.polar.extraction?.sites||[]).map(p=>`<button data-pickup="${p.id}" aria-pressed="false">${p.name}<br>${p.depth} m pickup</button>`).join(''));
    }
    function update(level,run,status,format){
        const st=run.polar,s=run.ship,m=st.mission,motion=P.groundMotion(s),h=Math.max(0,Math.ceil(s.hull)),live=status==='running';
        set('speed',(motion.surge<0?'−':'')+(motion.speed*1.94384).toFixed(1));set('mobile-speed',$('speed').textContent);
        set('speed-direction',motion.direction.toUpperCase());set('mobile-direction',motion.direction.toUpperCase());
        set('heading',String(Math.round((s.a*180/Math.PI+450)%360)).padStart(3,'0'));set('drift',`DEPTH ${s.depth.toFixed(1)} m · ${Math.abs(s.heave)<.1?'LEVEL':s.heave>0?'DIVING':'RISING'}`);
        set('shelter-status',st.noise<.35?'QUIET RUNNING':'ACOUSTIC EXPOSURE');set('local-set','SUBMERGED · NO SURFACE CURRENT');set('weather-text','PALE REACH · UNDERWATER WATCH');
        set('hull-label',h+'%');set('mobile-hull',h);set('contacts',run.contacts);set('mobile-hits',run.contacts);set('engine-read',Math.round(s.engine*100));
        $('hull-bar').style.width=h+'%';$('hull-bar').style.background=h<35?'var(--red)':'var(--green)';$('rudder-indicator').style.left=`calc(${50+s.rudder*47}% - 3px)`;
        const names=['FULL ASTERN','HALF ASTERN','DEAD SLOW ASTERN','STOP','DEAD SLOW','SLOW AHEAD','HALF AHEAD','FULL AHEAD'];
        set('telegraph-name',names[s.throttle+3]);set('telegraph-detail',s.throttle===0?'NEUTRAL · STILL COASTING':'NOISE RISES WITH SPEED, THRUST AND HARD REVERSAL');
        html('notches',Array.from({length:8},(_,i)=>`<span class="notch ${i<3?'reverse':i===3?'zero':''} ${i===s.throttle+3?'active':''}"></span>`).join(''));
        set('mission-status',status==='paused'?'Paused · unranked practice':run.finalJourney?F.message(run):U.message(run));set('polar-notice',$('mission-status').textContent);
        set('mobile-extra',`${Math.round(s.depth)} m · NOISE ${Math.round(st.noise*100)}%`);
        set('polar-readout',U.covert(st)?`SUSPICION ${Math.ceil(m.suspicion)}%`:st.tracks.length?`${st.tracks.length} acoustic ${st.tracks.length===1?'track':'tracks'}`:'Listening…');
        $('polar-readout').classList.toggle('warning',m.suspicion>65);
        const water=U.space(st,s),sea=run.finalJourney?.surface.polar,preview=depthPreview(st,s);
        set('polar-ice',`OVERHEAD ${Math.round(water.ceiling)} m · SEABED ${Math.round(water.floor)} m`+(sea?` / RIME ABOVE: ${sea.operation.npcs.find(n=>n.cutter).status} · ${(sea.stats.sheetArea/1000).toFixed(1)}k m² CUT`:''));
        set('sub-depth-status',`${s.depth.toFixed(1)} m ACTUAL → ${s.depthTarget} m ORDERED · ${Math.abs(s.heave)<.1?'DEPTH SETTLED':Math.abs(s.heave).toFixed(1)+' m/s '+(s.heave>0?'DIVING':'RISING')}`);
        for(const b of $('polar-sub-controls').querySelectorAll('[data-sub-depth]')){
            const p=preview.bands[Number(b.dataset.subDepth)],d=p.depth;
            b.disabled=!live||!p.allowed;b.classList.toggle('selected',d===s.depthTarget);b.setAttribute('aria-pressed',String(d===s.depthTarget));
            const note=b.querySelector('small');set(note.id,!p.allowed?'Blocked here':p.distance<preview.reach?`${p.distance} m clear`:'Clear ahead');
        }
        set('sub-noise',`SELF NOISE ${Math.round(st.noise*100)}% · ${st.noise<.35?'QUIET':st.noise<.65?'MACHINERY CARRYING':'LOUD · OTHER LISTENERS CAN HEAR'}`);
        const cooldown=Math.max(0,18-st.time+st.pulseAt);$('sub-ping').disabled=!live||cooldown>0;set('sub-ping-label',cooldown>0?'Pulse ready in '+Math.ceil(cooldown)+' s':'Active pulse');
        html('sub-contacts',st.tracks.map(t=>`<button data-sub-target="${t.id}" aria-pressed="${t.id===st.selected}" class="${t.id===st.selected?'selected':''}"><b>${t.id}</b><span>${kind(t)}</span></button>`).join(''));
        const t=st.tracks.find(t=>t.id===st.selected),fix=t&&U.Sonar.predict(t,st.time);
        set('sub-track-detail',t?`${t.id} · ${t.source.toUpperCase()} · ±${Math.ceil(fix.radius)} m · ${Math.floor(fix.age)} s old. ${t.clue}. ${t.depth===null?'Depth unresolved':Math.round(t.depth)+' m observed depth'}. ${Math.floor(fix.quality)}% track confidence${fix.age>12?' · STALE: reacquire before firing':''}.`:'Select a track to inspect its motion clues. A pulse announces your position.');
        $('sub-identify').disabled=!live||!t||t.category==='unknown'||fix.age>18||t.identified;
        const g=st.gun;set('sub-solution',st.recovery?`RECOVERY ${m.board.toFixed(1)} / 8 s · ${st.recovery.settled?'TEAM AT RENDEZVOUS':'TEAM RELOCATING ON ICE'}`:st.config.mission==='covert'?`TEAM WORK ${Math.floor(m.work)} / ${st.config.access.work} s · TRANSFER ${m.board.toFixed(1)} / 8 s`:`${g.ammo} TORPEDOES · ${g.cooldown>0?'RELOAD '+Math.ceil(g.cooldown)+' s':g.reason+' · '+g.solution.toFixed(1)+' / '+g.hold+' s'}`);
        for(const b of $('sub-pickups').querySelectorAll('[data-pickup]')){const selected=b.dataset.pickup===st.recovery?.selected;b.disabled=!live||m.team==='recovered';b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));}
        $('sub-fire').disabled=!live||g.solution<g.hold||g.cooldown>0||g.ammo<=0;
        if(U.covert(st)){
            const t=U.transfer(st,s);
            $('sub-team').disabled=!live||!t.available;
            set('sub-team-label',m.ordered?'Transferring':m.team==='aboard'?'Insert team':m.team==='working'?'Team working':m.team==='waiting'?'Recover team':'Team aboard');
            set('sub-team-detail',m.team==='aboard'||m.team==='waiting'?t.reason:'');
        }
        html('splits',splits(run,format));
        $('check-objectives').classList.toggle('ok',m.threatGone);$('check-inside').classList.toggle('ok',run.dock.inside);$('check-aligned').classList.toggle('ok',Math.abs(s.heave)<.15);$('check-slow').classList.toggle('ok',motion.speed<.35&&m.suspicion<20);$('dock-bar').style.width=Math.min(100,m.homeHold*20)+'%';
        set('clock',format(run.time));set('clock-label',run.pausedUsed?'PRACTICE · UNRANKED':'WATCH TIME · IGT');$('clock-label').classList.toggle('practice',run.pausedUsed);
        set('delta',U.covert(st)&&m.suspicion>0?'SUSPICION '+Math.ceil(m.suspicion)+'%':'');set('scale-label','100 METRES');
    }
    function dialog(kind,level,run,format,hasNext,race,actions=''){
        const st=run.polar,c=st.config,head=`<div class="eyebrow">WORLD 7 · UNDERWATER WATCH · ${String(level.stageNumber).padStart(2,'0')} / 12</div>`,retry='<button data-action="retry">Retry · Shift+R</button><button data-action="courses">World map</button>';
        if(kind==='intro')return `${head}<h1>${level.name}</h1><p>${level.brief}</p><div class="control-summary">${level.tip}</div><details class="polar-message"><summary>${c.dispatch[0]}</summary><p>${c.dispatch[1]}</p></details><div class="dialog-actions"><button class="primary" data-action="begin" autofocus>Take the watch →</button><button data-action="help">Underwater notes</button><button data-action="courses">World map</button></div>`;
        if(kind==='pause')return `${head}<h1>The watch is held.</h1><p>Vessels, sonar memories, depth changes, team work and suspicion are paused together. This attempt is now unranked practice.</p><div class="dialog-actions"><button class="primary" data-action="resume" autofocus>Resume watch</button>${retry}</div>`;
        if(kind==='failed')return `${head}<h1>The assignment could not be completed.</h1><p>${st.failure}</p><div class="result-time">${format(run.time)}</div><div class="dialog-actions">${retry}</div>`;
        if(kind==='result'&&c.finale)return `${head}<h1>The route is open.</h1><p>The engineers are home and the relief ships are through. The political settlement remains fragile; the passage is open.</p><div class="result-time">${format(run.time)}</div><div class="splits">${splits(run,format)}</div>${actions}`;
        if(kind==='result'&&st.recovery)return `${head}<h1>They are back.</h1><p>The team is aboard and Petrel has escaped the search without a confirmed alarm. The shelter is still drifting apart behind you.</p><div class="result-time">${format(run.time)}</div><div class="section-label">SPLITS · ELAPSED IGT</div><div class="splits">${splits(run,format)}</div>${actions}`;
        if(kind==='result')return `${head}<h1>${c.mission==='covert'?'The team is home.':c.mission==='hunt'?'The passage remains clear.':'The communications watch holds.'}</h1><p>${c.mission==='covert'?'The military relay is disabled, the team is recovered, and no confirmed alarm exposed the Council’s settlements.':c.mission==='hunt'?'The minelayer can no longer deny the relief passage. Petrel is secure; pursuit beyond the assignment was unnecessary.':'The intruder was identified and intercepted. Mica and the communications crew can continue their work.'}</p><div class="result-time">${format(run.time)}</div><div class="result-badge">${run.pausedUsed?'UNRANKED PRACTICE':run.pb?'NEW PERSONAL BEST':'ASSIGNMENT COMPLETE'}</div><div class="section-label">SPLITS · ELAPSED IGT</div><div class="splits">${splits(run,format)}</div>${actions}`;
        const operation=U.covert(st)?'<p><b>Team transfers.</b> Enter the marked zone at its depth, order the transfer and hold quiet. Stay outside the work area while the team is inside. The broken arcs ahead of nearby patrols show their listening sectors.</p>':'<p><b>Listen first.</b> Select a track in the bridge orders to see its uncertainty circle. An active pulse sharpens a fix and lets enemies hear where it came from. Identify a hostile contact, match its depth, and hold a stable bow solution before firing.</p>';
        return `${head}<h1>Underwater notes</h1><p><b>Plan the dive.</b> The short bow line and depth buttons show clearance along your heading. Hatching marks terrain that blocks your current depth.</p>${operation}<p><b>Secure Petrel.</b> Return to the green home-water circle below 0.7 kn at a settled depth. Hold five seconds.</p><div class="dialog-actions"><button class="primary" data-action="back" autofocus>Back to the bridge</button></div>`;
    }
    function render(canvas,level,run,zoom,options={}){
        const box=canvas.getBoundingClientRect(),dpr=Math.min(root.devicePixelRatio||1,2),W=box.width,H=box.height;
        if(W<2||H<2)return;
        const w=Math.round(W*dpr),h=Math.round(H*dpr);
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
        const st=run.polar,s=run.ship,c=st.config,m=st.mission,[worldWidth,worldHeight]=level.world;
        const top=Math.min(58,H*.20),bottom=Math.min(27,H*.12),plotHeight=H-top-bottom;
        const scale=Math.min(W*.96/worldWidth,plotHeight/worldHeight)*zoom,px=1/scale;
        const ox=zoom>1?W/2-s.x*scale:(W-worldWidth*scale)/2;
        const oy=top+(zoom>1?plotHeight/2-s.y*scale:(plotHeight-worldHeight*scale)/2);
        ctx.fillStyle='#0e222d';ctx.fillRect(0,0,W,H);
        ctx.save();ctx.beginPath();ctx.rect(0,top,W,plotHeight);ctx.clip();
        ctx.translate(ox,oy);ctx.scale(scale,scale);
        ctx.lineCap='round';ctx.lineJoin='round';
        const labels=L.create(ctx,W,H,ox,oy,scale,{top,bottom}),label=labels.add;
        const line=(a,b,color,width=1,dash=[])=>{
            ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
            ctx.strokeStyle=color;ctx.lineWidth=width*px;
            ctx.setLineDash(dash.map(d=>d*px));ctx.stroke();ctx.setLineDash([]);
        };
        const ring=(p,r,color,width=1,dash=[])=>{
            ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);
            ctx.strokeStyle=color;ctx.lineWidth=width*px;
            ctx.setLineDash(dash.map(d=>d*px));ctx.stroke();ctx.setLineDash([]);
        };
        const fill=(points,color)=>{polygon(ctx,points);ctx.fillStyle=color;ctx.fill();};
        const diamond=(p,r,color)=>{
            ctx.beginPath();ctx.moveTo(p.x,p.y-r);ctx.lineTo(p.x+r,p.y);
            ctx.lineTo(p.x,p.y+r);ctx.lineTo(p.x-r,p.y);ctx.closePath();
            ctx.fillStyle='#10242f';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=1.25*px;ctx.stroke();
            labels.reserve(p.x,p.y,r*scale+3);
        };
        const square=(p,color)=>{
            const side=6*px,x=p.x-side/2,y=p.y-side/2;
            ctx.fillStyle='#10242f';ctx.fillRect(x,y,side,side);
            ctx.strokeStyle=color;ctx.lineWidth=px;ctx.strokeRect(x,y,side,side);
            labels.reserve(p.x,p.y,6);
        };
        const zone=(p,r,color,name,priority=2)=>{
            ring(p,r,color,1.1);
            if(name)label(name,p.x,p.y+r+9*px,color,10,priority);
        };
        const ship=(v,color,player=false)=>{
            fill(P.hull(v),color);
            ctx.strokeStyle=player?'#f7d894':'#122632';ctx.lineWidth=px;ctx.stroke();
            line(P.localPoint(v,-v.length*.16,0),P.localPoint(v,v.length*.14,0),'#263d47',player?2:1.4);
            labels.reserve(v.x,v.y,Math.max(v.length*scale/2,8));
        };

        const seabed=terrain(st,s.depth);
        ctx.drawImage(seabed.canvas,0,0);
        ctx.strokeStyle='#56737a';ctx.lineWidth=.7*px;ctx.strokeRect(0,0,worldWidth,worldHeight);
        ctx.beginPath();ctx.rect(0,0,worldWidth,worldHeight);ctx.clip();
        for(const p of seabed.soundings)label(p.depth+' m',p.x,p.y,p.blocked?'#d1b88d':'#91adb1',9,0);
        const keelSoundings=[];
        for(const b of st.bergs){
            const blocked=s.depth-5<=b.keel+2,points=P.hull(b);
            fill(points,blocked?'#5a7b84':'#32545e88');
            // Ice facets use the collision outline and a ridge within it.
            const ridge=P.localPoint(b,b.length*.06,-b.beam*.12);
            fill([points[0],points[1],points[2],points[3],ridge],blocked?'#a1bfc1':'#61919a5b');
            fill([points[3],points[4],points[5],points[6],ridge],blocked?'#7d9fa8':'#527b864d');
            if(blocked)hatch(ctx,points,P.bounds(points),13);
            polygon(ctx,points);ctx.strokeStyle=blocked?hazard:'#7fa5ae';ctx.lineWidth=px;
            ctx.setLineDash(blocked?[]:[3*px,4*px]);ctx.stroke();ctx.setLineDash([]);
            if(!keelSoundings.some(k=>k.keel===b.keel&&Math.hypot(k.x-b.x,k.y-b.y)*scale<34)){
                label(b.keel+' m',b.x,b.y,blocked?'#0b2631':'#b2ccd0',9,0);keelSoundings.push(b);
            }
        }
        for(const p of st.platforms){
            fill(p.poly,'#586367');hatch(ctx,p.poly,P.bounds(p.poly),10);
            polygon(ctx,p.poly);ctx.strokeStyle=hazard;ctx.lineWidth=px;ctx.stroke();
        }

        zone(c.home,c.home.radius,m.threatGone?'#98d7b7':'#7ead9b','Home',m.threatGone?3:1);
        if(c.access&&m.team!=='recovered'){
            const a=c.access,working=m.team==='working';
            zone(a,working?a.standOff:a.radius,working?'#c7a478':'#ead1a0',working?'Work area':'Hatch · '+a.depth+' m',3);
        }
        if(st.recovery&&m.team!=='recovered'){
            const sites=U.Recovery.sites(st),beacon=st.recovery.beacon;
            for(const p of sites){
                if(p.id===st.recovery.selected)zone(p,p.radius,'#e8ca96','Pickup · '+p.depth+' m',3);
                else square(p,'#8aa5ab');
            }
            if(!st.recovery.settled){
                const pickup=U.access(st);
                line(beacon,pickup,'#a5cbb5',1,[2,5]);square(beacon,'#b3dbc0');
            }
        }
        if(c.passage)zone(c.passage,c.passage.radius,m.mining?'#f3ae85':'#92bdac','Passage');
        if(c.installation)zone(c.installation,c.installation.radius,m.mining?'#f3ae85':'#92bdac','Comms');

        // A surface report gives an exact hull, with the hearing sector outlined
        // only when Petrel is close enough to use it for maneuvering.
        const hearing=U.listenRange(st);
        for(const a of st.actors){
            if(!a.active||!a.visible||a.kind!=='patrol')continue;
            const v=a.ship;
            if(Math.hypot(v.x-s.x,v.y-s.y)>hearing+60)continue;
            ctx.beginPath();ctx.moveTo(v.x,v.y);ctx.arc(v.x,v.y,hearing,v.a-1.05,v.a+1.05);ctx.closePath();
            ctx.strokeStyle='#d5a18275';ctx.lineWidth=.8*px;
            ctx.setLineDash([5*px,6*px]);ctx.stroke();ctx.setLineDash([]);
        }
        // Use sonar memories for every return. Only the selected track expands
        // into its circular estimate, so several stale tracks cannot cover the map.
        for(const t of st.tracks){
            const f=U.Sonar.predict(t,st.time),selected=t.id===st.selected;
            const color=selected?'#f5d69f':!t.identified?'#b0ced0':t.category==='submarine'?'#efab90':t.category==='service'?'#a5d4b6':'#82999f';
            ctx.globalAlpha=Math.max(selected?.54:.35,1-f.age/170);
            const mark=selected?Math.min(4.5,Math.max(2,f.radius*scale*.55)):3.6;
            if(selected)ring(f,f.radius,color,1,f.age>6?[3,5]:[2,3]);
            diamond(f,mark*px,color);
            if(selected){
                if(!st.gun.aim)line(f,{x:f.x+t.vx*30,y:f.y+t.vy*30},color,1);
                label(t.id,f.x,f.y-14*px,color,10,4);
            }
            ctx.globalAlpha=1;
        }
        if(run.finalJourney)for(const a of run.finalJourney.surface.polar.operation.npcs.filter(a=>a.cutter))ship(a.ship,'#7bb2b299');
        for(const a of st.actors)if(a.active&&a.visible)ship(a.ship,'#d1aa93');
        for(const p of st.pulses)ring(p,Math.min(p.range,(st.time-p.at)*210),'#82c9cd91');
        for(const t of st.torpedoes){
            line({x:t.x-t.vx*1.5,y:t.y-t.vy*1.5},t,t.hostile?'#ff9d84':'#ffe4a3',1.8);
            ring(t,5,t.hostile?'#ffb097':'#ffedba');
        }
        for(const b of st.bursts)ring(b,5+(2-b.until+st.time)*13,'#ffcd9a');

        const ghost=options.ghost;
        if(options.settings?.ghost&&ghost?.length&&run.time<=ghost.at(-1)[0]){
            let lo=0,hi=ghost.length-1;
            while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(ghost[mid][0]<=run.time)lo=mid;else hi=mid-1;}
            const a=ghost[lo],b=ghost[Math.min(lo+1,ghost.length-1)],t=b[0]===a[0]?0:P.clamp((run.time-a[0])/(b[0]-a[0]),0,1);
            fill(P.hull({...s,x:P.lerp(a[1],b[1],t),y:P.lerp(a[2],b[2],t),a:a[3]+P.wrap(b[3]-a[3])*t}),'#d6efda38');
        }
        const preview=depthPreview(st,s),blocked=preview.distance<preview.reach;
        const bow=P.localPoint(s,s.length/2,0),end=P.localPoint(s,s.length/2+preview.distance,0);
        if(preview.distance>0)line(bow,end,blocked?'#efc991':'#9ac6c186',1.15,[3,5]);
        if(blocked)line(P.localPoint(s,s.length/2+preview.distance,-6*px),P.localPoint(s,s.length/2+preview.distance,6*px),'#ffd193',1.7);
        if(st.gun.aim)line(s,st.gun.aim,st.gun.solution>=st.gun.hold?'#c3e7b0':'#d9bd7f66',1,[4,5]);
        ship(s,'#e6b674',true);
        ctx.restore();
        labels.draw();
        ctx.beginPath();ctx.moveTo(14,H-20);ctx.lineTo(14+100*scale,H-20);
        ctx.strokeStyle='#aac6c8';ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle='#aac6c8';ctx.font='9px ui-monospace,monospace';ctx.textAlign='left';ctx.fillText('100 m',14,H-9);
    }
    const api={prepare,update,dialog,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PaleReachSubmarineView=api;
})(globalThis);
