/* Underwater bridge: draw observed acoustic tracks, not hidden actor positions. */
(function(root){
    'use strict';
    const L=typeof module!=='undefined'&&module.exports?require('./polar-labels.js'):root.PaleReachLabels;
    const P=typeof module!=='undefined'&&module.exports?require('./physics.js'):root.HarborPhysics;
    const U=typeof module!=='undefined'&&module.exports?require('./submarine.js'):root.PaleReachSubmarine;
    const F=typeof module!=='undefined'&&module.exports?require('./polar-finale.js'):root.PaleReachFinale;
    const $=id=>document.getElementById(id),set=(id,text)=>{const n=$(id),s=String(text);if(n.textContent!==s)n.textContent=s;},html=(id,text)=>{if($(id).innerHTML!==text)$(id).innerHTML=text;};
    const backgrounds=new WeakMap(),lookahead=new WeakMap();
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
        set('polar-legend','Rings: estimated contacts. Amber: blocked at your depth. The short bow line shows charted clearance.');
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
        set('polar-readout',U.covert(st)?`SUSPICION ${Math.ceil(m.suspicion)}% / CONFIRMED AT 100% · TEAM ${m.team.toUpperCase()}`:`${st.tracks.length} ACOUSTIC TRACKS · ${m.identified?'SUBMARINE IDENTIFIED':'IDENTIFICATION REQUIRED'}`);
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
        set('delta',U.covert(st)?'CONFIRMED ALARM ENDS THE ASSIGNMENT':'GUARD THE PASSAGE · IDENTIFY BEFORE FIRING');set('scale-label','100 METRES');
    }
    function dialog(kind,level,run,format,hasNext,race,actions=''){
        const st=run.polar,c=st.config,head=`<div class="eyebrow">WORLD 7 · UNDERWATER WATCH · ${String(level.stageNumber).padStart(2,'0')} / 12</div>`,retry='<button data-action="retry">Retry · Shift+R</button><button data-action="courses">World map</button>';
        if(kind==='intro')return `${head}<h1>${level.name}</h1><p>${level.brief}</p><div class="control-summary">${level.tip}</div><details class="polar-message"><summary>${c.dispatch[0]}</summary><p>${c.dispatch[1]}</p></details><div class="dialog-actions"><button class="primary" data-action="begin" autofocus>Take the watch →</button><button data-action="help">Underwater notes</button><button data-action="courses">World map</button></div>`;
        if(kind==='pause')return `${head}<h1>The watch is held.</h1><p>Vessels, sonar memories, depth changes, team work and suspicion are paused together. This attempt is now unranked practice.</p><div class="dialog-actions"><button class="primary" data-action="resume" autofocus>Resume watch</button>${retry}</div>`;
        if(kind==='failed')return `${head}<h1>The assignment could not be completed.</h1><p>${st.failure}</p><div class="result-time">${format(run.time)}</div><div class="dialog-actions">${retry}</div>`;
        if(kind==='result'&&c.finale)return `${head}<h1>The route is open.</h1><p>The engineers are home and the relief ships are through. The political settlement remains fragile; the passage is open.</p><div class="result-time">${format(run.time)}</div><div class="splits">${splits(run,format)}</div>${actions}`;
        if(kind==='result'&&st.recovery)return `${head}<h1>They are back.</h1><p>The team is aboard and Petrel has escaped the search without a confirmed alarm. The shelter is still drifting apart behind you.</p><div class="result-time">${format(run.time)}</div><div class="section-label">SPLITS · ELAPSED IGT</div><div class="splits">${splits(run,format)}</div>${actions}`;
        if(kind==='result')return `${head}<h1>${c.mission==='covert'?'The team is home.':c.mission==='hunt'?'The passage remains clear.':'The communications watch holds.'}</h1><p>${c.mission==='covert'?'The military relay is disabled, the team is recovered, and no confirmed alarm exposed the Council’s settlements.':c.mission==='hunt'?'The minelayer can no longer deny the relief passage. Petrel is secure; pursuit beyond the assignment was unnecessary.':'The intruder was identified and intercepted. Mica and the communications crew can continue their work.'}</p><div class="result-time">${format(run.time)}</div><div class="result-badge">${run.pausedUsed?'UNRANKED PRACTICE':run.pb?'NEW PERSONAL BEST':'ASSIGNMENT COMPLETE'}</div><div class="section-label">SPLITS · ELAPSED IGT</div><div class="splits">${splits(run,format)}</div>${actions}`;
        const operation=U.covert(st)?'<p><b>Team transfers.</b> Enter the marked zone at its depth, order the transfer and hold quiet. Stay outside the listening circle during the team’s work. Use the approach the patrols leave open.</p>':'<p><b>Listen first.</b> Rings mark uncertain contacts. An active pulse sharpens a fix but lets enemies hear where it came from. Identify a hostile contact, match its depth, and hold a stable bow solution before firing.</p>';
        return `${head}<h1>Underwater notes</h1><p><b>Plan the dive.</b> The short bow line and depth buttons show clearance along your heading. Change depth before the obstruction. Amber shelves and keels block this depth.</p>${operation}<p><b>Secure Petrel.</b> Return to the green home-water circle below 0.7 kn at a settled depth. Hold five seconds.</p><div class="dialog-actions"><button class="primary" data-action="back" autofocus>Back to the bridge</button></div>`;
    }
    function render(canvas,level,run,zoom,options={}){
        const box=canvas.getBoundingClientRect(),dpr=Math.min(root.devicePixelRatio||1,2),W=box.width,H=box.height,w=Math.round(W*dpr),h=Math.round(H*dpr);
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
        const st=run.polar,s=run.ship,c=st.config,scale=Math.min((W-32)/level.world[0],(H-64)/level.world[1])*zoom;
        const ox=zoom>1?W/2-s.x*scale:(W-level.world[0]*scale)/2,oy=zoom>1?H/2-s.y*scale:(H-level.world[1]*scale)/2+12;
        ctx.fillStyle='#102c37';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
        const poly=points=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();};
        const line=(a,b,color,width=1,dash=[])=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);};
        const labels=L.create(ctx,W,H,ox,oy,scale),label=labels.add;
        const ring=(x,y,r,color,dash=[])=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);};
        let bg=backgrounds.get(level);
        if(!bg){
            bg=document.createElement('canvas');bg.width=level.world[0];bg.height=level.world[1];const b=bg.getContext('2d');b.fillStyle='#123744';b.fillRect(0,0,bg.width,bg.height);b.strokeStyle='#94c2c509';b.lineWidth=1;b.beginPath();
            for(let x=0;x<bg.width;x+=50){b.moveTo(x,0);b.lineTo(x,bg.height);}
            for(let y=0;y<bg.height;y+=50){b.moveTo(0,y);b.lineTo(bg.width,y);}
            b.stroke();backgrounds.set(level,bg);
        }
        ctx.drawImage(bg,0,0);
        for(const shelf of st.shelves){const danger=s.depth+5>=shelf.floor-2;poly(shelf.poly);ctx.fillStyle=danger?'#796b4b77':'#34657570';ctx.fill();ctx.strokeStyle=danger?'#d8b47c':'#70929d';ctx.lineWidth=2;ctx.stroke();const p=shelf.poly[0];label(shelf.name,p.x+90,p.y+28,danger?'#f1d29d':'#a8ccd3',10);}
        for(const b of st.bergs){const danger=s.depth-5<=b.keel+2;poly(P.hull(b));ctx.fillStyle=danger?'#acb8a388':'#8ccecb20';ctx.fill();ctx.strokeStyle=danger?'#e6d3a5':'#9ed4cf';ctx.lineWidth=2;ctx.setLineDash(danger?[]:[6,5]);ctx.stroke();ctx.setLineDash([]);line({x:b.x-22,y:b.y+12},{x:b.x+22,y:b.y-12},'#cbd4b9',2);label(b.name,b.x,b.y-b.beam/2-16,'#e3dfb9');line(b,{x:b.x+b.vx*90,y:b.y+b.vy*90},'#dfcaa0',1.5,[4,5]);}
        for(const p of st.platforms){poly(p.poly);ctx.fillStyle='#607c79';ctx.fill();ctx.strokeStyle='#bcc6ad';ctx.lineWidth=2;ctx.stroke();label(p.name,p.x+p.w/2,p.y-16,'#dadac0');}
        ring(c.home.x,c.home.y,c.home.radius,'#8bddb7',[6,6]);label('SECURE / SAFE WATER',c.home.x,c.home.y+c.home.radius+20,'#a8e1bc');
        if(c.access){const a=c.access;if(st.mission.team==='working')ring(a.x,a.y,a.standOff,'#d9ac75b0',[5,7]);ring(a.x,a.y,a.radius,'#f1cf97');label(`HATCH · ${a.depth} m`,a.x,a.y-36,'#f6d3a0');}
        if(st.recovery){
            for(const p of U.Recovery.sites(st)){ring(p.x,p.y,p.radius,p.id===st.recovery.selected?'#ffe3ac':'#97bcbc',[5,5]);label(p.name.toUpperCase()+' · '+p.depth+' m',p.x,p.y-42,'#f0d6a6');line(p,{x:p.x+p.vx*180,y:p.y+p.vy*180},'#dfcaa0',2,[4,4]);}
            if(st.mission.team!=='recovered'){const b=st.recovery.beacon,p=U.access(st);ring(b.x,b.y,7,'#c9efba');label('TEAM',b.x,b.y+19,'#d7efb6',9);if(!st.recovery.settled)line(b,p,'#bee4ba',1,[3,7]);}
        }
        if(c.passage){ring(c.passage.x,c.passage.y,c.passage.radius,'#abd8ab',[7,5]);label('KEEP PASSAGE CLEAR',c.passage.x,c.passage.y-70,'#d7e0ba');ring(c.withdrawal.x,c.withdrawal.y,c.withdrawal.radius,'#ccaf8a77',[4,8]);}
        if(c.installation)ring(c.installation.x,c.installation.y,c.installation.radius,'#d0d6af66',[6,8]);
        // Shore watchers report surface patrols. Hidden submarines and decoys
        // are drawn only below, from immutable sonar observations.
        if(run.finalJourney)for(const a of run.finalJourney.surface.polar.operation.npcs.filter(a=>a.cutter)){
            poly(P.hull(a.ship));ctx.fillStyle='#a8d5cb66';ctx.fill();label('RIME ABOVE · '+a.status,a.ship.x,a.ship.y-26,'#b1d9ca',9);
        }
        for(const a of st.actors.filter(a=>a.active&&a.visible)){
            const v=a.ship;ctx.beginPath();ctx.moveTo(v.x,v.y);ctx.arc(v.x,v.y,U.listenRange(st),v.a-1.05,v.a+1.05);ctx.closePath();ctx.fillStyle='#e49c7020';ctx.fill();ctx.strokeStyle='#d7a07955';ctx.lineWidth=1;ctx.stroke();poly(P.hull(v));ctx.fillStyle='#d9a18b';ctx.fill();label(a.name,v.x,v.y+30,'#e6c3aa',9);
        }
        for(const t of st.tracks){
            const f=U.Sonar.predict(t,st.time),color=t.id===st.selected?'#f6d097':t.identified&&t.category==='submarine'?'#e9a38b':t.identified&&t.category==='service'?'#a7d9ba':'#a6cfcc';
            ctx.globalAlpha=Math.max(.2,1-f.age/160);ctx.beginPath();ctx.arc(f.x,f.y,f.radius,0,Math.PI*2);ctx.fillStyle=color+'0c';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=t.id===st.selected?2:1;ctx.setLineDash(f.age>6?[4,7]:[2,5]);ctx.stroke();ctx.setLineDash([]);
            line({x:f.x-5,y:f.y},{x:f.x+5,y:f.y},color);line({x:f.x,y:f.y-5},{x:f.x,y:f.y+5},color);
            line(f,{x:f.x+t.vx*35,y:f.y+t.vy*35},color,1.5);label(t.id+' · '+kind(t),f.x,f.y-18,color,9,t.id===st.selected?3:2);ctx.globalAlpha=1;
        }
        for(const p of st.pulses)ring(p.x,p.y,Math.min(p.range,(st.time-p.at)*210),'#92dfdc99');
        for(const t of st.torpedoes){line({x:t.x-t.vx*1.5,y:t.y-t.vy*1.5},t,t.hostile?'#ff9d84':'#ffe4a3',2.5);ring(t.x,t.y,6,t.hostile?'#ffb097':'#ffedba');}
        for(const b of st.bursts)ring(b.x,b.y,5+(2-b.until+st.time)*13,'#ffcd9a');
        const ghost=options.ghost;
        if(options.settings?.ghost&&ghost?.length&&run.time<=ghost.at(-1)[0]){let lo=0,hi=ghost.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(ghost[mid][0]<=run.time)lo=mid;else hi=mid-1;}const a=ghost[lo],b=ghost[Math.min(lo+1,ghost.length-1)],t=b[0]===a[0]?0:P.clamp((run.time-a[0])/(b[0]-a[0]),0,1);poly(P.hull({...s,x:a[1]+(b[1]-a[1])*t,y:a[2]+(b[2]-a[2])*t,a:a[3]+P.wrap(b[3]-a[3])*t}));ctx.fillStyle='#d6efda38';ctx.fill();}
        const preview=depthPreview(st,s),bow=P.localPoint(s,s.length/2,0),end=P.localPoint(s,s.length/2+preview.distance,0);
        if(preview.distance>0)line(bow,end,preview.distance<preview.reach?'#eed49c':'#a3ddce77',1.8,[4,6]);
        if(preview.distance<preview.reach){
            const a=P.localPoint(s,s.length/2+preview.distance,-8),b=P.localPoint(s,s.length/2+preview.distance,8);
            line(a,b,'#f3be79',2.5);
        }
        poly(P.hull(s));ctx.fillStyle='#e9bb80';ctx.fill();ctx.strokeStyle='#172f37';ctx.lineWidth=2;ctx.stroke();line(P.localPoint(s,-7,0),P.localPoint(s,4,0),'#435a5c',5);ring(s.x,s.y,27,'#f4d09866');label('PETREL · '+Math.round(s.depth)+' m',s.x,s.y+35,'#ffe0ad');
        if(st.gun.aim)line(s,st.gun.aim,st.gun.solution>=st.gun.hold?'#c3e7b0':'#d9bd7f66',1.3,[5,8]);
        for(const mark of c.landmarks)label(mark.text,mark.x,mark.y,'#779b9f',10,0);
        ctx.restore();labels.draw();ctx.fillStyle='#b2cac9';ctx.font='10px ui-monospace,monospace';ctx.textAlign='left';ctx.fillText('PALE REACH / ESTIMATED ACOUSTIC PLOT · '+s.depth.toFixed(0)+' m',16,H-17);line({x:W-120,y:H-22},{x:W-120+100*scale,y:H-22},'#b2cac9',2);
    }
    const api={prepare,update,dialog,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PaleReachSubmarineView=api;
})(globalThis);
