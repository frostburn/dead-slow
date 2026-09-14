(function(root) {
    'use strict';
    const R=typeof module!=='undefined'&&module.exports?require('./rail.js'):root.Railway;
    const $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    let act=null,signature='',levelNow=null,transform=null;
    function prepare(level,command) {
        levelNow=level;act=command;signature='';
        $('rail-panel').hidden=!level.rail;
        if(!level.rail)return;
        $('sea').setAttribute('aria-label','Railway map. Head and tail markers show the moving ends. Change points using the route buttons.');
        $('rail-panel').innerHTML=`<div class="rail-readings"><div><strong id="rail-speed">0.0</strong><span>km/h</span></div><div><b id="rail-stop">0 m</b><span>estimated stop</span></div></div>
            <div class="rail-summary" id="rail-summary"></div><div id="rail-heat" class="rail-summary"></div><div id="rail-alert" class="rail-alert" hidden></div>
            <div class="rail-levers">${[['power','Power','S / W',0,4,1],['brake','Train brake','A / D',0,1,.25],['independent','Loco brake','Q / E',0,1,.25]].map(([id,label,keys,min,max,step])=>`<label for="rail-${id}">${label}<output id="rail-${id}-value"></output><small>${keys}</small></label><input id="rail-${id}" data-rail="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${id==='brake'?1:0}" aria-label="${label}">`).join('')}</div>
            <div class="rail-actions"><button data-rail="reverse" id="rail-reverse" title="Change travel direction (X)">Reverse · X</button><button data-rail="stop">Full brake · Space</button><button data-rail="couple">Couple · F</button><button data-rail="hand" id="rail-hand">Handbrakes · B</button></div>
            <p class="rail-caption">Select a cut to set its handbrakes. Cut a link to uncouple.</p><div id="rail-consist" class="rail-consist"></div>
            <div id="rail-switches" class="rail-switches"></div><div id="rail-tasks" class="rail-tasks"></div><p id="rail-notice" role="status"></p>
            <div class="rail-actions"><button data-rail="retry">Retry <kbd>Shift+R</kbd></button><button data-rail="help">Controls</button></div>${level.id==='long-grade-1'?'<button class="rail-watch" data-rail="watch">Watch run</button>':''}`;
        $('rail-panel').onclick=e=>{const b=e.target.closest('[data-rail]');if(b&&b.tagName!=='INPUT')act(b.dataset.rail,b.dataset.value);};
        $('rail-panel').oninput=e=>{if(e.target.dataset.rail)act(e.target.dataset.rail,Number(e.target.value));};
        $('sea').onclick=e=>{
            if(!levelNow?.rail||!transform)return;
            const rect=$('sea').getBoundingClientRect(),x=(e.clientX-rect.left-transform.x)/transform.s,y=(e.clientY-rect.top-transform.y)/transform.s;
            const nearest=level.rail.switches.find(sw=>Math.hypot(level.rail.nodes[sw.node][0]-x,level.rail.nodes[sw.node][1]-y)<18/transform.s);
            if(nearest)act('switch',nearest.node);
        };
    }
    function key(e,st) {
        const g=R.engineGroup(st),commands={KeyW:['power',st.power+1],KeyS:['power',st.power-1],KeyA:['brake',g.brake-.25],KeyD:['brake',g.brake+.25],KeyQ:['independent',st.independent-.25],KeyE:['independent',st.independent+.25],KeyX:['reverse'],KeyF:['couple'],KeyB:['hand'],Space:['stop']};
        if(!commands[e.code])return false;e.preventDefault();if(!e.repeat)act(...commands[e.code]);return true;
    }
    function update(level,run,status,format) {
        const st=run.rail,m=R.metrics(st),g=R.engineGroup(st),selected=R.groupFor(st,st.selected)||g;
        $('rail-speed').textContent=(Math.abs(m.speed)*3.6).toFixed(1);
        $('rail-speed').classList.toggle('rail-danger',Math.abs(m.speed)>m.limit);
        $('rail-stop').textContent=Number.isFinite(m.stopping)?Math.ceil(m.stopping)+' m':'No reserve';
        $('rail-summary').textContent=`${Math.round(m.length)} m · ${Math.round(m.mass/1000)} t · limit ${Math.round(m.limit*3.6)} km/h`;
        $('rail-heat').textContent=level.rail.thermal?`Brakes ${Math.round(m.temperature)}°C${m.temperature>180?' · fading':''} · couplers ${Math.round(Math.max(...g.cars.map(c=>Math.abs(c.coupler||0)))/1000)} kN`:st.slip?'Wheelspin — ease power':'';
        $('rail-heat').classList.toggle('rail-danger',m.temperature>180);
        for(const name of ['power','brake','independent']) {
            const value=name==='brake'?g.brake:st[name];$('rail-'+name).value=value;
            $('rail-'+name+'-value').textContent=name==='power'?`${value} / 4`:Math.round(value*100)+'%';
        }
        $('rail-reverse').textContent='Reverse · X';
        $('rail-reverse').title='Change direction · currently '+(st.reverser===1?'forward':'reverse');
        const warning=R.danger(st),alert=$('rail-alert'),worst=warning.cars.reduce((a,c)=>!a||c.ratio>a.ratio?c:a,null);
        alert.hidden=!warning.severity;alert.classList.toggle('critical',warning.severity===2);
        alert.textContent=warning.severity===2?'Derailment risk · brake now':worst?`${worst.id==='engine'?'Locomotive':worst.id} over ${Math.round(worst.limit*3.6)} km/h`:warning.ahead?`Slow to ${Math.round(warning.ahead.limit*3.6)} km/h · ${Math.round(warning.ahead.distance)} m ahead`:'';
        $('rail-hand').textContent=(selected.cars.some(c=>c.hand)?'Release handbrakes':'Set handbrakes')+' · B';
        const sig=st.groups.map(cut=>cut.cars.map(c=>c.id).join(',')).join('|');
        if(sig!==signature) {
            signature=sig;
            $('rail-consist').innerHTML=st.groups.map(cut=>`<div class="rail-cut">${cut.cars.map((c,i)=>`<button data-rail="select" data-value="${c.id}" id="rail-car-${c.id}" title="${c.powered?'Locomotive':c.id+' · '+Math.round(c.mass/1000)+' t'}">${c.powered?'Loco':c.id}<span></span></button>${i<cut.cars.length-1?`<button class="rail-link" data-rail="uncouple" data-value="${c.id}" aria-label="Uncouple between ${c.id} and ${cut.cars[i+1].id}" title="Uncouple">✂</button>`:''}`).join('')}</div>`).join('');
        }
        for(const cut of st.groups)for(const c of cut.cars) {
            const b=$('rail-car-'+c.id),p=R.locate(st,cut,c.q),grade=p.grade*(Math.abs(c.v)>.02?Math.sign(c.v):st.reverser*c.face);
            b.classList.toggle('selected',cut===selected);b.classList.toggle('secured',c.hand);
            b.classList.toggle('at-risk',warning.cars.some(v=>v.id===c.id));
            b.style.borderBottomColor=c.destination==='mill'?'#8cbccf':c.destination==='foundry'?'#e7a25d':'';
            b.querySelector('span').textContent=(grade>.003?'↗':grade<-.003?'↘':'→')+(c.hand?' P':'');
            b.title=`${c.powered?'Locomotive':c.id}: ${Math.abs(grade*100).toFixed(1)}% ${grade>=0?'uphill':'downhill'}${c.hand?', handbrakes set':''}`;
        }
        const switchSig=st.net.switches.map(sw=>sw.selected+':'+R.occupied(st,sw.node)).join();
        if($('rail-switches').dataset.signature!==switchSig) {
            $('rail-switches').dataset.signature=switchSig;
            $('rail-switches').innerHTML=st.net.switches.map(sw=>{
                const edge=st.net.edges[sw.branches[sw.selected]],grade=Math.max(...edge.samples.slice(1).map((p,i)=>Math.abs(p.z-edge.samples[i].z)/(p.s-edge.samples[i].s)))*100;
                return `<button data-rail="switch" data-value="${sw.node}" ${R.occupied(st,sw.node)?'disabled':''}><span>${sw.label}</span><b>${sw.names[sw.selected]}</b>${level.rail.thermal?`<small>${Math.round(edge.length)} m · ${grade.toFixed(1)}% max grade</small>`:''}${R.occupied(st,sw.node)?'<small>occupied</small>':''}</button>`;
            }).join('');
        }
        $('rail-tasks').innerHTML=st.config.tasks.map(t=>`<div class="${st.completed.includes(t.id)?'done':''}">${st.completed.includes(t.id)?'✓':'○'} ${t.text}</div>`).join('');
        $('rail-notice').textContent=st.notice;
        $('clock-label').classList.toggle('practice',run.pausedUsed);
        $('clock-label').textContent=run.watch?'WATCHING RUN':run.pausedUsed?'PRACTICE · UNRANKED':'RUN TIME';
        const watch=$('rail-panel').querySelector('.rail-watch');
        if(watch){watch.textContent=run.watch?'Take controls':'Watch run';watch.dataset.rail=run.watch?'drive':'watch';}$('clock').textContent=format(run.time);
        $('mission-name').textContent=level.name;$('brief').textContent=level.brief;
        $('weather-text').textContent='THE LONG GRADE';
        $('rail-panel').querySelectorAll('button,input').forEach(b=>{if(!['help','retry','watch','drive'].includes(b.dataset.rail)&&b.dataset.rail!=='switch')b.disabled=status!=='running';});
    }
    function render(canvas,level,run,zoom=1) {
        const st=run.rail,ctx=canvas.getContext('2d'),rect=canvas.getBoundingClientRect(),dpr=root.devicePixelRatio||1;
        const w=rect.width,h=rect.height;if(!w||!h)return;
        if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
        ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#d6d1b5';ctx.fillRect(0,0,w,h);
        const warning=R.danger(st),m=R.metrics(st),mapHeight=h-75,scale=Math.min((w-42)/level.world[0],(mapHeight-25)/level.world[1])*zoom;
        const x=zoom===1?(w-level.world[0]*scale)/2:w/2-m.head.x*scale,y=zoom===1?(mapHeight-level.world[1]*scale)/2:mapHeight/2-m.head.y*scale;
        transform={x,y,s:scale};ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
        const stroke=(points,color,width)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
        // Survey contours and tree stands are seeded from map coordinates.
        ctx.lineCap='round';ctx.lineJoin='round';
        for(let i=0;i<20;i++) {
            const points=Array.from({length:35},(_,j)=>({x:j*level.world[0]/34,y:i*90-200+Math.sin(j*.17+i*.21)*95+Math.cos(j*.28-i*.13)*40}));
            stroke(points,'#bdbb9e',1/scale);
        }
        for(let i=0;i<150;i++) {
            const tx=(Math.sin(i*43.1)*43758.5%1+1)%1*level.world[0],ty=(Math.sin(i*19.3)*9645.2%1+1)%1*level.world[1];
            if(Object.values(st.net.edges).some(e=>e.samples.some(p=>Math.hypot(p.x-tx,p.y-ty)<36)))continue;
            ctx.fillStyle=i%3?'#929d7b':'#a2a988';ctx.beginPath();ctx.ellipse(tx,ty,8+i%8,12+i%9,-.35,0,Math.PI*2);ctx.fill();
        }
        if(st.config.scenery==='valley') {
            const water=Array.from({length:45},(_,i)=>({x:i*45-70,y:1080+Math.sin(i*.13)*115}));
            stroke(water,'#b5bfa3',45);stroke(water,'#83aaa9',28);stroke(water,'#adcbc1',2);
        }
        const buildings=st.config.scenery==='yard'?[[90,490,43,76],[135,540,20,34],[830,150,65,33],[830,95,42,24]]:
            st.config.scenery==='valley'?[[1450,1030,80,28],[1550,1050,66,25]]:[[700,95,48,26],[200,390,45,32]];
        for(const [bx,by,bw,bh] of buildings) {
            ctx.fillStyle='#9a9780';ctx.fillRect(bx+4,by+5,bw,bh);ctx.fillStyle='#786958';ctx.fillRect(bx,by,bw,bh);
            stroke([{x:bx+4,y:by+bh/2},{x:bx+bw-4,y:by+bh/2}],'#b2a183',2);
        }
        if(st.config.scenery==='quarry'||st.config.scenery==='valley')for(let i=0;i<4;i++) {
            const qx=st.config.scenery==='quarry'?95:115,qy=st.config.scenery==='quarry'?560:40;
            stroke([{x:qx-i*8,y:qy+i*13},{x:qx+75+i*6,y:qy+i*13+10},{x:qx+160+i*12,y:qy+i*13-7}],'#a39d85',7);
        }
        for(const edge of Object.values(st.net.edges)) {
            stroke(edge.samples,'#b4ad97',17);stroke(edge.samples,'#78796e',10);
            for(let s=0;s<edge.length;s+=9){const p=R.at(st.net,edge.id,s),dx=Math.sin(p.a)*7,dy=Math.cos(p.a)*7;stroke([{x:p.x-dx,y:p.y+dy},{x:p.x+dx,y:p.y-dy}],'#574e43',2);}
            for(const sign of [-1,1])stroke(edge.samples.map((p,i,a)=>{const n=a[Math.min(i+1,a.length-1)],prev=a[Math.max(0,i-1)],angle=Math.atan2(n.y-prev.y,n.x-prev.x);return{x:p.x+Math.sin(angle)*3*sign,y:p.y-Math.cos(angle)*3*sign};}),'#dbd4bc',1.5);
            for(const restriction of [{from:.12,limit:edge.limit},...edge.restrictions||[]]) {
                const p=R.at(st.net,edge.id,edge.length*restriction.from);ctx.fillStyle='#f5dd9d';ctx.beginPath();ctx.arc(p.x+18,p.y,12/scale,0,Math.PI*2);ctx.fill();ctx.fillStyle='#554130';ctx.font=`bold ${11/scale}px sans-serif`;ctx.textAlign='center';ctx.fillText(Math.round(restriction.limit*3.6),p.x+18,p.y+4/scale);
            }
        }
        for(const z of st.config.zones) {
            const pts=[];for(let s=z.from;s<=z.to;s+=3)pts.push(R.at(st.net,z.edge,s));
            ctx.globalAlpha=.38;stroke(pts,z.color||'#679a83',28);ctx.globalAlpha=1;
            const p=R.at(st.net,z.edge,(z.from+z.to)/2);ctx.font=`600 ${12/scale}px sans-serif`;ctx.fillStyle='#344b40';ctx.textAlign='center';ctx.fillText(z.name,p.x,p.y-24/scale);
        }
        for(const sw of st.net.switches) {
            const node=st.net.nodes[sw.node];
            for(const id of [sw.stem,sw.branches[sw.selected]]) {
                const edge=st.net.edges[id],from=edge.a===sw.node;
                const pts=Array.from({length:13},(_,i)=>R.at(st.net,id,from?i*3:edge.length-i*3));stroke(pts,'#e2bb68',5);
            }
            ctx.beginPath();ctx.arc(node[0],node[1],6/scale,0,Math.PI*2);ctx.fillStyle=R.occupied(st,sw.node)?'#b66d46':'#ffdb85';ctx.fill();ctx.strokeStyle='#68533c';ctx.lineWidth=1/scale;ctx.stroke();
            ctx.fillStyle='#514c39';ctx.font=`600 ${11/scale}px sans-serif`;ctx.textAlign='center';ctx.fillText(sw.label,node[0],node[1]-14/scale);
        }
        const restriction=warning.ahead||warning.cars[0];
        if(restriction) {
            const edge=st.net.edges[restriction.edge],section=Array.from({length:25},(_,i)=>R.at(st.net,edge.id,clamp(restriction.s-35+i*4,0,edge.length)));
            ctx.globalAlpha=.65;stroke(section,warning.severity===2?'#dc382b':'#df922d',24);ctx.globalAlpha=1;
        }
        for(const group of st.groups) {
            stroke(group.cars.map(c=>R.locate(st,group,c.q)),'#413a31',2);
            for(const c of group.cars) {
                const p=R.locate(st,group,c.q),front=R.locate(st,group,c.q+c.length*.35),back=R.locate(st,group,c.q-c.length*.35);
                ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(front.y-back.y,front.x-back.x));
                const danger=warning.cars.find(v=>v.id===c.id);
                if(danger){ctx.strokeStyle=danger.ratio>=1.2?'#d33124':'#df852c';ctx.lineWidth=2.5/scale;ctx.strokeRect(-c.length/2-3,-8,c.length+6,16);}
                ctx.fillStyle='#454338';ctx.fillRect(-c.length/2, -5.5,c.length,11);
                ctx.fillStyle=c.powered?'#486b61':c.destination==='mill'?'#7d9eae':c.destination==='foundry'?'#be824b':'#a45f48';ctx.fillRect(-c.length/2+1,-4.5,c.length-2,9);
                if(c.powered){ctx.fillStyle='#e5d398';ctx.fillRect(c.face>0?2:-8,-3,6,6);}else{ctx.fillStyle='#514e41';ctx.fillRect(-c.length/2+3,-2.5,c.length-6,5);}
                if(c.hand){ctx.fillStyle='#f4d897';ctx.fillRect(-2,-4,4,8);}ctx.restore();
            }
        }
        for(const [p,label,color,offset] of [[m.head,'HEAD','#f7edc2',-22],[m.tail,'TAIL','#f5c386',25]]) {
            ctx.fillStyle='#333e35';ctx.beginPath();ctx.arc(p.x,p.y,4/scale,0,Math.PI*2);ctx.fill();
            const tx=p.x-Math.sin(p.a)*offset/scale,ty=p.y+Math.cos(p.a)*offset/scale;
            ctx.font=`bold ${10/scale}px sans-serif`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillRect(tx-22/scale,ty-10/scale,44/scale,15/scale);ctx.fillStyle='#333e35';ctx.fillText(label,tx,ty+1/scale);
        }
        ctx.restore();
        // Elevation under the entire consist: the crest visibly travels through
        // the wagons, rather than a single gradient readout at the locomotive.
        ctx.fillStyle='#293b35';ctx.fillRect(0,h-72,w,72);
        const cars=R.engineGroup(st).cars,heights=cars.map(c=>R.locate(st,R.engineGroup(st),c.q).z),low=Math.min(...heights)-.8,high=Math.max(...heights)+.8;
        ctx.fillStyle='#d6ddca';ctx.font='11px sans-serif';ctx.textAlign='left';ctx.fillText('GRADE UNDER TRAIN',14,h-54);
        const step=Math.min(34,(w-35)/cars.length),start=w/2-step*(cars.length-1)/2;
        const pts=cars.map((c,i)=>({x:start+i*step,y:h-12-(heights[i]-low)/(high-low)*27}));stroke(pts,'#90b59a',2);
        pts.forEach((p,i)=>{ctx.fillStyle=cars[i].powered?'#edcd88':'#b87b60';ctx.fillRect(p.x-5,p.y-5,10,6);});
        ctx.textAlign='right';ctx.fillStyle='#d6ddca';ctx.fillText(`${Math.abs(m.gradient*100).toFixed(1)}% average`,w-14,h-54);
    }
    function dialog(kind,level,run,format,hasNext=false) {
        const st=run.rail,actions=(primary,label)=>`<div class="dialog-actions"><button class="primary" data-action="${primary}" autofocus>${label}</button><button data-action="courses">World map</button>${kind!=='intro'?'<button data-action="retry">Retry · Shift+R</button>':'<button data-action="help">Controls</button>'}</div>`;
        if(kind==='intro')return `<div class="eyebrow">${level.tag}</div><h1>${level.name}</h1><p>${level.brief}</p><p class="subtle">${level.tip}</p>${actions('begin','Take the controls')}${level.id==='long-grade-1'?'<button class="rail-watch" data-action="watch-rail">Watch run</button>':''}`;
        if(kind==='pause')return `<div class="eyebrow">PRACTICE</div><h1>Train held.</h1><p>Pausing makes this attempt unranked. Retry for a recorded run.</p>${actions('resume','Resume')}`;
        if(kind==='failed')return `<div class="eyebrow">RUN ENDED</div><h1>Freight stopped.</h1><p>${st.failure}</p>${actions('retry','Try again')}`;
        if(kind==='result')return `<div class="eyebrow">${run.pausedUsed?'PRACTICE COMPLETE':run.pb?'PERSONAL BEST':'DELIVERY COMPLETE'}</div><h1>Every wagon accounted for.</h1><div class="result-time">${format(run.time)}</div><p>${Math.round(st.stats.distance)} m traveled · ${st.stats.couplings} couplings${level.rail.thermal?' · peak brakes '+Math.round(st.stats.peakTemperature)+'°C':''}</p>${actions(run.watch?'rail-drive':hasNext?'next':'courses',run.watch?'Take controls':hasNext?'Next assignment':'World map')}${!run.pausedUsed?'<p class="subtle">Time saved to your logbook.</p>':''}`;
        return `<div class="eyebrow">RAILWAY CONTROLS</div><h1>Give the tail time.</h1><p>W / S changes power. A / D releases / applies the train brake. Q / E releases / applies the locomotive brake. Space cuts power and applies full train brake. Stop before reversing with X.</p><p>Click a signal or route button to change points. Occupied points are locked until the whole train clears.</p><p>Approach within 3 m at less than 2 km/h, then press F to couple. Stop with brakes applied and power off before cutting a link in the train strip. Select a cut and press B to set or release its handbrakes. Detached air brakes slowly leak away.</p><p>The grade strip shows which wagons are uphill. Stopping distance estimates full train braking, including brake delay and current temperature. Brake before a lower speed limit; it applies until the tail clears.</p><p>Shift+R retries. Escape pauses. Focus-loss pausing is optional in the logbook.</p>${actions('back','Back')}`;
    }
    const api={prepare,key,update,render,dialog};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.RailView=api;
})(typeof globalThis!=='undefined'?globalThis:this);
