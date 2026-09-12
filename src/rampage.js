/* Gerbozilla: rolling terrain, water traction and six standalone field courses. */
(function (root) {
    'use strict';
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const level = {
        id: 'gerbo-first-outing', name: 'A Small Problem in Seedhaven', kind: 'Rolling / ridge / lake / two districts',
        start: [130, 530, 0], world: [1500, 920], pace: [125, 180, 260], standalone: true,
        brief: 'Gerbozilla has outgrown the exercise wheel. Build a run-up over the ridge, coast across Blue Lake, flatten Seedhaven’s two evacuated districts, then settle in the recovery meadow. The northern district needs a little redirection.',
        tip: 'Push with WASD or the arrows. Push against your motion to brake. Water removes traction, not momentum. Space / F gives 3 seconds of protection; recharge takes another 6 seconds.',
        spec: { name: 'GERBOZILLA', length: 48, beam: 48, mass: 8, draft: 0, vessel: 'ball' },
        // Used only by generic record/UI setup. Gerbozilla has circular, not ship-hull, geometry.
        berth: { x: 1340, y: 365, a: 0, l: 150, w: 150, speed: .8 },
        rampage: {
            radius: 24, drive: 1.9, resistance: .032, waterResistance: .050,
            sheet: 'SEEDHAVEN', subtitle: 'A SMALL PROBLEM',
            hills: [
                { x: 343, y: 510, rx: 65, ry: 195, height: 43, lobes: [{ x: 42, y: -105, rx: 58, ry: 83, height: 17 }] },
                { x: 540, y: 155, rx: 155, ry: 115, height: 78, angle: .23, lobes: [{ x: -85, y: 38, rx: 87, ry: 57, height: 34 }] },
                { x: 1035, y: 790, rx: 225, ry: 103, height: 95, angle: -.09, lobes: [{ x: 126, y: 23, rx: 83, ry: 64, height: 38 }] },
                { x: 1380, y: 120, rx: 185, ry: 80, height: 55, lobes: [{ x: -83, y: 33, rx: 96, ry: 44, height: 24 }] }
            ],
            lakes: [{ x: 600, y: 515, rx: 78, ry: 152, shore: [.13, .08, .4], name: 'BLUE LAKE' }],
            controls: [
                { x: 435, y: 530, r: 63, name: 'Ridge cleared' },
                { x: 727, y: 515, r: 58, name: 'Lake crossed' }
            ],
            districts: [
                { id: 'seedworks', name: 'Seedworks', x: 900, y: 515, r: 34, health: 72, defence: true },
                { id: 'north-ward', name: 'North Ward', x: 1120, y: 360, r: 34, health: 72, defence: true }
            ],
            finish: { x: 1340, y: 365, r: 78 }
        }
    };
    const course = (id, name, kind, start, world, brief, tip, config) => ({
        id, name, kind, start, world, brief, tip, standalone: true, pace: [160, 220, 320],
        spec: { ...level.spec },
        berth: { x: config.finish.x, y: config.finish.y, a: 0, l: 156, w: 156, speed: .8 },
        rampage: { radius: 24, drive: 1.9, resistance: .032, waterResistance: .05, ...config }
    });
    // Closed contours are climbable terrain, never a binary speed gate. The
    // walls oppose a standing push strongly enough that a real run-up matters.
    const bank = course('gerbo-banking', 'Banks for the Memories', 'Mountain-ring fortresses / run-ups / banked exits',
        [150, 650, 0], [2540, 1350],
        'Sunflower and Hayloft have retreated inside mountain bowls. The enclosing ridgelines cannot be crept over from their foot: gather speed on the western flats, crest the rim and shield the ram. Keep enough momentum to climb out again.',
        'A closed brown rim is a real hill. Its steep face can overpower your push. Back away for a longer run-up; do not grind against it. Shield protects the shell, not your momentum.', {
            sheet:'SUNFLOWER CITADELS', subtitle:'BANKS FOR THE MEMORIES',
            hills:[
                {x:755,y:265,rx:107,ry:280,height:103,angle:-.53,lobes:[{x:110,y:100,rx:96,ry:123,height:36}]},
                {x:1360,y:1070,rx:240,ry:80,height:72,angle:-.2,lobes:[{x:-130,y:15,rx:98,ry:50,height:30}]}
            ],
            rims:[
                {x:1060,y:650,r:170,width:28,height:47,shore:[.07,.035,.5],name:'CUSHION WALL'},
                {x:1640,y:530,r:150,width:27,height:44,shore:[.06,.04,1.7],name:'HAYLOFT RIM'}
            ],
            lakes:[{x:350,y:1080,rx:160,ry:80,shore:[.16,.08,2.1],name:'CLOVER MERE'}],
            controls:[{x:640,y:650,r:68,name:'Western run-up'}],
            districts:[
                {id:'sunflower',name:'Sunflower',x:1060,y:650,r:34,health:105,defence:true},
                {id:'hayloft',name:'Hayloft',x:1640,y:530,r:34,health:95,defence:true}
            ],finish:{x:2250,y:540,r:87}, authorSpeed:34
        });
    const lakes = course('gerbo-lake-skipping', 'No Grip, No Problem', 'Island cities / closed moats / long-range retaliation',
        [150,420,0],[2250,1820],
        'Reedworks, Oatbridge and Pipsqueak Point are island citadels. Each complete water moat removes your paw traction. Every demolition alerts an off-map battery: three marked long-range strikes follow, even after the local guns are rubble.',
        'Build speed before entering each moat. Retaliation marks lock onto the map, not onto you: change course after the red circles appear, or shield at impact. Keep rolling after a demolition.',{
            sheet:'THE RETALIATING LAKE DISTRICT',subtitle:'NO GRIP, NO PROBLEM',
            hills:[{x:300,y:125,rx:160,ry:60,height:45,lobes:[{x:80,y:30,rx:70,ry:45,height:22}]}],
            lakes:[
                {x:900,y:420,rx:235,ry:225,inner:.46,shore:[.08,.04,1.3],name:'REED MOAT'},
                {x:1640,y:780,rx:235,ry:230,inner:.47,shore:[.07,.045,3],name:'OAT MOAT'},
                {x:1150,y:1370,rx:230,ry:230,inner:.46,shore:[.09,.035,2],name:'PIPSQUEAK MOAT'}
            ],
            controls:[{x:430,y:420,r:62,name:'Build crossing speed'},
                {x:2010,y:1030,r:65,name:'Dry turning ground',after:'oatbridge',number:4}],
            districts:[
                {number:2,id:'reedworks',name:'Reedworks',x:900,y:420,r:33,health:85,defence:true},
                {number:3,id:'oatbridge',name:'Oatbridge',x:1640,y:780,r:33,health:90,defence:true},
                {number:5,id:'pipsqueak',name:'Pipsqueak Point',x:1150,y:1370,r:33,health:85,defence:true}
            ],retaliation:{delays:[10,18,26],warning:7.5,lead:0,radius:66,damage:24},
            finish:{x:520,y:1420,r:90},authorSpeed:35
        });
    const downhill = course('gerbo-downhill', 'It All Goes Downhill', 'Summit launch / flooded caldera / single heavy ram',
        [225,225,0],[2350,1500],
        'Start high on Mount Muesli. The single fortified caldera town lies behind a broad flooded rim. Trade height for speed on the descent, cross the moat and break the armored core in one shielded impact; then roll out to the eastern meadow.',
        'Gravity supplies the run-up. Aim before the long descent; frantic steering in the flooded rim only makes tiny squeaks. The armored town needs a harder hit than Seedhaven.',{
            sheet:'MOUNT MUESLI',subtitle:'IT ALL GOES DOWNHILL',
            hills:[{x:155,y:135,rx:235,ry:225,height:140,angle:.35,lobes:[{x:-80,y:60,rx:115,ry:140,height:30}]},
                {x:1550,y:1230,rx:260,ry:75,height:74,lobes:[{x:135,y:-20,rx:110,ry:65,height:23}]}],
            rims:[{x:1540,y:860,r:155,width:25,height:38,shore:[.06,.03,.9],name:'CALDERA RIM'}],
            lakes:[{x:1540,y:860,rx:290,ry:275,inner:.68,shore:[.075,.035,2.4],name:'FLOODED CALDERA'}],
            controls:[{x:755,y:610,r:85,name:'Downhill commitment'}],
            districts:[{id:'caldera',name:'Caldera Vault',x:1540,y:860,r:41,health:185,defence:true}],
            finish:{x:2070,y:970,r:92},authorSpeed:40
        });
    const hairpin = course('gerbo-hairpin', 'The Reservoir Hairpin', 'Climb-in basin / reverse approach / reservoir crossing',
        [230,1410,0],[2060,1780],
        'The valley route ends at a mountain-walled pumping town. Crest its bowl and flatten Pump House, then take the northern saddle west. Use that dry bank as the run-up for the reservoir island; the second town must be approached from the other direction.',
        'This is not a straight demolition line. The numbered northern saddle unlocks after Pump House falls. Slow on dry ground, turn, and rebuild momentum before committing west across the reservoir.',{
            sheet:'THE OATWATER RESERVOIR',subtitle:'THE RESERVOIR HAIRPIN',
            hills:[{x:820,y:1050,rx:120,ry:290,height:95,angle:.3,lobes:[{x:95,y:100,rx:84,ry:135,height:40}]},
                {x:1580,y:1070,rx:125,ry:320,height:76,angle:-.2,lobes:[{x:-70,y:150,rx:90,ry:135,height:31}]}],
            rims:[{x:1310,y:560,r:160,width:27,height:43,shore:[.07,.03,1.2],name:'PUMP HOUSE WALL'}],
            lakes:[{x:520,y:470,rx:245,ry:235,inner:.43,shore:[.08,.035,2.1],name:'OATWATER'}],
            controls:[{x:1190,y:1190,r:75,name:'Enter the valley'},
                {x:1270,y:230,r:75,name:'Northern saddle',after:'pump-house',number:3}],
            districts:[{number:2,id:'pump-house',name:'Pump House',x:1310,y:560,r:35,health:105,defence:true},
                {id:'island-mill',name:'Island Mill',x:520,y:470,r:34,health:95,defence:true}],
            finish:{x:350,y:1020,r:90},authorSpeed:35
        });
    const fortress = course('gerbo-fort-pillow', 'Fort Pillow', 'Double moat / mountain wall / siege and extraction',
        [150,1110,0],[3100,1930],
        'Fort Pillow has two water moats with a steep mountain ring between them. One long run-up must pay for the outer crossing, the uphill crest and the inner crossing. Destroy the command core, escape its retaliatory strike pattern, then take the northern satellite fort before extraction.',
        'Spend momentum, not patience. A shield will not pull you out of a moat. Preserve speed through the nested defenses; after the command core falls, the eastern muster point provides room to turn north.',{
            sheet:'FORT PILLOW DEFENSE RESERVE',subtitle:'ONE VERY LARGE PILLOW FIGHT',
            hills:[{x:510,y:1710,rx:210,ry:75,height:66,lobes:[{x:120,y:-25,rx:90,ry:63,height:31}]}],
            rims:[{x:1560,y:1110,r:244,width:28,height:37,shore:[.045,.025,.8],name:'PILLOW WALL'},
                {x:2170,y:370,r:155,width:26,height:44,shore:[.06,.035,1.8],name:'SATELLITE RIM'}],
            lakes:[{x:1560,y:1110,rx:420,ry:410,inner:.76,shore:[.045,.03,2],name:'OUTER MOAT'},
                {x:1560,y:1110,rx:191,ry:190,inner:.52,shore:[.07,.035,.5],name:'INNER MOAT'}],
            controls:[{x:700,y:1110,r:70,name:'Siege run-up'},
                {x:2240,y:1090,r:82,name:'Eastern muster',after:'pillow-command',number:3}],
            districts:[{number:2,id:'pillow-command',name:'Pillow Command',x:1560,y:1110,r:38,health:140,defence:true},
                {id:'satellite-fort',name:'Satellite Fort',x:2170,y:370,r:36,health:110,defence:true}],
            retaliation:{delays:[10,18,26],warning:7.5,lead:0,radius:74,damage:26},
            finish:{x:2810,y:355,r:90},authorSpeed:42
        });
    // Gaussian shoulders make asymmetrical summits and saddles, while keeping
    // an exact analytical gradient shared by the physics and contour renderer.
    function terrain(c, x, y) {
        let height = 0, dx = 0, dy = 0;
        function add(h, ox, oy, angle) {
            const cs = Math.cos(angle), sn = Math.sin(angle), ex = x - ox, ey = y - oy;
            const u = (cs * ex + sn * ey) / h.rx, v = (-sn * ex + cs * ey) / h.ry;
            const z = h.height * Math.exp(-.5 * (u * u + v * v));
            height += z;
            dx -= z * (u * cs / h.rx - v * sn / h.ry);
            dy -= z * (u * sn / h.rx + v * cs / h.ry);
        }
        for (const h of c.hills) {
            add(h, h.x, h.y, h.angle || 0);
            for (const l of h.lobes || []) add(l, h.x + l.x, h.y + l.y, (h.angle || 0) + (l.angle || 0));
        }
        for (const rim of c.rims || []) {
            const ex=x-rim.x, ey=y-rim.y, d=Math.hypot(ex,ey);
            if (d < 1e-6) continue; // Interior center is flat to numerical precision.
            const a=Math.atan2(ey,ex), [u,v,phase]=rim.shore || [0,0,0];
            const radius=rim.r*(1+u*Math.cos(3*a+phase)+v*Math.sin(5*a-phase));
            const derivative=rim.r*(-3*u*Math.sin(3*a+phase)+5*v*Math.cos(5*a-phase));
            const q=(d-radius)/rim.width, z=rim.height*Math.exp(-.5*q*q), slope=-z*q/rim.width;
            height+=z; dx+=slope*(ex/d+derivative*ey/(d*d)); dy+=slope*(ey/d-derivative*ex/(d*d));
        }
        return { height, dx, dy };
    }
    // One shoreline definition for the visible coast and the traction probes.
    // Low-order waves make rounded bays and headlands, never sharp random noise.
    function shoreRadius(l, angle) {
        const [a, b, phase] = l.shore || [0, 0, 0];
        return 1 + a * Math.cos(3 * angle + phase) + b * Math.sin(5 * angle - phase);
    }
    function lakePoint(l, angle, scale = 1) {
        const r = shoreRadius(l, angle) * scale, cs = Math.cos(l.angle || 0), sn = Math.sin(l.angle || 0);
        const x = l.rx * r * Math.cos(angle), y = l.ry * r * Math.sin(angle);
        return {x: l.x + cs * x - sn * y, y: l.y + sn * x + cs * y};
    }
    function inLake(l, x, y) {
        const cs = Math.cos(l.angle || 0), sn = Math.sin(l.angle || 0), dx = x - l.x, dy = y - l.y;
        const u = (cs * dx + sn * dy) / l.rx, v = (-sn * dx + cs * dy) / l.ry;
        const radius=shoreRadius(l, Math.atan2(v,u)), distance=Math.hypot(u,v);
        return distance < radius && (!l.inner || distance > radius*l.inner);
    }
    function water(c, s) {
        // Sample the footprint: traction fades across the shoreline, rather than flickering.
        let wet = 0;
        for (const [dx, dy] of [[0,0], [1,0], [-1,0], [0,1], [0,-1]]) {
            const x = s.x + dx * c.radius * .7, y = s.y + dy * c.radius * .7;
            if (c.lakes.some(l => inLake(l, x, y))) wet++;
        }
        return wet / 5;
    }
    function create(level, ship) {
        ship.vessel = 'ball'; ship.radius = level.rampage.radius;
        return { roll: 0, pawPhase: 0, radius: level.rampage.radius, slip: 0, wet: 0, effort: 0, elevation: 0, control: 0, controlCount: level.rampage.controls.length,
            shieldUntil: 0, shieldReady: 0, shots: [], strikes: [], flashes: [], hold: 0,
            districts: level.rampage.districts.map(d => ({ ...d, maxHealth: d.health, nextShot: 0, aim: null, shotAt: null, hitAt: -100 })),
            stats: { districts: 0, damage: 0, blocked: 0, shields: 0, impacts: 0, waterTime: 0, salvos: 0, strikeHits: 0, strikeDodges: 0, strikeBlocks: 0 }
        };
    }
    function shield(run) {
        const st = run.rampage;
        if (run.time + 1e-8 < st.shieldReady) return false;
        st.shieldUntil = run.time + 3; st.shieldReady = run.time + 9;
        st.stats.shields++; return true;
    }
    const protectedAt = run => run.time < run.rampage.shieldUntil;
    function hurt(run, amount) {
        const st = run.rampage;
        if (protectedAt(run)) { st.stats.blocked++; return; }
        const loss = Math.min(run.ship.hull, amount);
        run.ship.hull -= loss; st.stats.damage += loss; run.contacts++;
    }
    function ready(run) {
        return run.rampage.control === run.rampage.controlCount && run.rampage.districts.every(d => d.health <= 0);
    }
    function controlAvailable(c, st) {
        const cp=c.controls[st.control];
        return cp && (!cp.after || st.districts.some(d=>d.id===cp.after && d.health<=0));
    }
    function retaliation(level, run, district) {
        const c=level.rampage.retaliation, st=run.rampage;
        if (!c) return;
        st.stats.salvos++;
        for (const delay of c.delays) st.strikes.push({
            source:district.id, launchAt:run.time+delay-c.warning, impactAt:run.time+delay,
            x:null,y:null,r:c.radius,damage:c.damage,lead:c.lead || 0
        });
        st.strikes.sort((a,b)=>a.impactAt-b.impactAt);
    }
    function strikeUpdate(level,run) {
        const st=run.rampage,s=run.ship;
        st.strikes=st.strikes.filter(b=>{
            if (b.x===null && run.time>=b.launchAt) {
                // The reticle locks ONCE. Flight is long enough to steer away;
                // the off-map battery never performs invisible homing hitscan.
                b.x=clamp(s.x+s.vx*b.lead,b.r,level.world[0]-b.r);
                b.y=clamp(s.y+s.vy*b.lead,b.r,level.world[1]-b.r);
            }
            if (run.time<b.impactAt) return true;
            const hit=Math.hypot(s.x-b.x,s.y-b.y)<b.r+level.rampage.radius;
            if (hit) {
                if (protectedAt(run)) st.stats.strikeBlocks++; else st.stats.strikeHits++;
                hurt(run,b.damage);
            } else st.stats.strikeDodges++;
            st.flashes.push({x:b.x,y:b.y,t:run.time,strike:true,r:b.r});
            return false;
        });
    }
    function update(level, run, input, dt) {
        const c = level.rampage, st = run.rampage, s = run.ship, events = [];
        let px = clamp(input.rudder || 0, -1, 1), py = clamp(input.thruster || 0, -1, 1);
        const norm = Math.max(1, Math.hypot(px, py)); px /= norm; py /= norm;
        st.effort = Math.hypot(px, py); st.wet = water(c, s);
        const t = terrain(c, s.x, s.y); st.elevation = t.height;
        // 5/7 g is the translation part of an ideal solid rolling body's acceleration.
        // Momentum and downhill gravity remain when Gerbozilla loses water traction.
        const grip = 1 - st.wet, drag = c.resistance * grip + c.waterResistance * st.wet;
        const ax = grip * px * c.drive - 7.007 * t.dx - drag * s.vx;
        const ay = grip * py * c.drive - 7.007 * t.dy - drag * s.vy;
        const ox = s.x, oy = s.y;
        s.x += s.vx * dt + ax * dt * dt / 2; s.y += s.vy * dt + ay * dt * dt / 2;
        s.vx += ax * dt; s.vy += ay * dt;
        const speed = Math.hypot(s.vx, s.vy), distance = Math.hypot(s.x - ox, s.y - oy);
        if (speed > .05) s.a = Math.atan2(s.vy, s.vx);
        s.engine = 0; s.r = 0; s.throttle = 0;
        st.slip = st.wet * st.effort * 1.8;
        st.roll += distance / c.radius + st.slip * dt;
        // Paws alternate with rolling strokes; in water the futile wheelspin
        // drives the same animation. A coasting hamster can rest its feet.
        st.pawPhase += (distance / c.radius * 2 + st.slip * dt * 2) * st.effort;
        if (st.wet > 0) st.stats.waterTime += dt;
        run.distance += distance; run.maxSpeed = Math.max(run.maxSpeed, speed);
        if (s.x-c.radius < 0 || s.y-c.radius < 0 || s.x+c.radius > level.world[0] || s.y+c.radius > level.world[1])
            run.failure = { type: 'off-map', message: 'Gerbozilla rolled off the survey map. Retry for a fresh run-up.' };
        const cp = c.controls[st.control];
        if (controlAvailable(c,st) && Math.hypot(s.x-cp.x, s.y-cp.y) < cp.r) { st.control++; events.push(cp.name); }
        for (const d of st.districts) {
            if (d.health <= 0) continue;
            const dx = s.x-d.x, dy = s.y-d.y, dist = Math.hypot(dx, dy);
            if (dist < d.r+c.radius && run.time-d.hitAt > .65) {
                const nx = dx/(dist || 1), ny = dy/(dist || 1);
                const impact = Math.max(0, -(s.vx*nx+s.vy*ny));
                if (impact > .15) {
                    d.hitAt = run.time; st.stats.impacts++;
                    d.health = Math.max(0, d.health - .65*impact*impact);
                    hurt(run, .045*impact*impact);
                    st.flashes.push({x:d.x,y:d.y,t:run.time,demolished:d.health===0});
                    if (d.health === 0) {
                        st.stats.districts++; s.vx *= .84; s.vy *= .84;
                        events.push(d.name + ' flattened'); d.aim = null; d.shotAt = null;
                        retaliation(level,run,d);
                    } else {
                        // Surviving structures deflect the ball; shield never supplies a free impulse.
                        s.vx += nx*impact*1.12; s.vy += ny*impact*1.12;
                        s.x = d.x+nx*(d.r+c.radius+.1); s.y = d.y+ny*(d.r+c.radius+.1);
                    }
                }
            }
            if (d.health <= 0 || !d.defence) continue;
            if (d.shotAt === null && run.time >= d.nextShot && dist < 145) {
                const flight = dist/80;
                d.aim = { x:s.x+s.vx*flight, y:s.y+s.vy*flight };
                d.shotAt = run.time + 1.2; // Marked warning; no instantaneous hitscan damage.
            }
            if (d.shotAt !== null && run.time >= d.shotAt) {
                const a = Math.atan2(d.aim.y-d.y,d.aim.x-d.x);
                st.shots.push({x:d.x,y:d.y,vx:80*Math.cos(a),vy:80*Math.sin(a),life:5});
                d.aim = null; d.shotAt = null; d.nextShot = run.time + 5.5;
            }
        }
        st.shots = st.shots.filter(b => {
            b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
            if (Math.hypot(b.x-s.x,b.y-s.y)<c.radius+3) {
                hurt(run,8); st.flashes.push({x:b.x,y:b.y,t:run.time}); return false;
            }
            return b.life > 0;
        });
        strikeUpdate(level,run);
        st.flashes = st.flashes.filter(f => run.time-f.t < 1.5);
        if (s.hull <= 0) run.failure = { type:'shell-broken',message:'The exercise ball cracked. Use the shield for defensive fire and high-speed impacts.' };
        const inside = Math.hypot(s.x-c.finish.x,s.y-c.finish.y) <= c.finish.r-c.radius;
        const slow = Math.hypot(s.vx,s.vy) < .8 && st.effort === 0;
        run.dock = { inside, aligned:true, slow, ready:ready(run) && inside && slow && st.strikes.length===0 };
        run.dockHold = run.dock.ready ? run.dockHold+dt : 0;
        return events;
    }
    function message(level, run) {
        const st = run.rampage;
        if (run.failure) return run.failure.message;
        const strike=st.strikes.find(b=>b.x!==null);
        if (strike) return 'RETALIATION · '+Math.max(0,strike.impactAt-run.time).toFixed(1)+' s · LEAVE RED TARGET CIRCLES OR SHIELD';
        if (st.wet > .5) return 'NO TRACTION · keep coasting; running only spins the ball';
        if (run.dockHold > 0) return 'RECOVERY MEADOW · paws off · settling ' + Math.max(0,2-run.dockHold).toFixed(1)+' s';
        const cp = level.rampage.controls[st.control];
        if (controlAvailable(level.rampage,st)) return `${String(st.control + 1).padStart(2, '0')} · ${cp.name.toUpperCase()} · keep your momentum`;
        const d = st.districts.find(d=>d.health>0);
        if (d) return `${d.name.toUpperCase()} · RAM WITH MOMENTUM · SPACE / F TO SHIELD`;
        if (st.strikes.length) return 'RETALIATION INBOUND · clear the marked strikes before recovery';
        return 'RECOVERY MEADOW · push against motion to brake, then release all directions';
    }
    const api = { levels:[level, bank, lakes, downhill, hairpin, fortress], terrain, shoreRadius, lakePoint, inLake, water, create, shield, protectedAt, ready, controlAvailable, update, message };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GerboRampage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
