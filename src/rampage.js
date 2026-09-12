/* Gerbozilla: rolling terrain, water traction and three standalone field courses. */
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
    // Two new assignments stay outside circuits until World 5 is complete.
    const course = (id, name, kind, start, world, brief, tip, config) => ({
        id, name, kind, start, world, brief, tip, standalone: true, pace: [160, 220, 320],
        spec: { ...level.spec },
        berth: { x: config.finish.x, y: config.finish.y, a: 0, l: 156, w: 156, speed: .8 },
        rampage: { radius: 24, drive: 1.9, resistance: .032, waterResistance: .05, ...config }
    });
    const bank = course('gerbo-banking', 'Banks for the Memories', 'Banked valley / two districts / shield timing',
        [160, 365, 0], [1760, 1120],
        'Take the downhill run into Cushion Ridge. Its sloping flank bends the ball south into Sunflower Valley; use the bank instead of fighting it. Flatten the two evacuated towns, then settle in the eastern meadow.',
        'Brown contours are steering surfaces, not walls. Roll partway up a bank and let gravity redirect you. Save shields for each town: a shield cannot cancel your momentum.', {
            sheet: 'SUNFLOWER VALLEY', subtitle: 'BANKS FOR THE MEMORIES',
            hills: [
                { x: 145, y: 320, rx: 125, ry: 170, height: 24, lobes: [{x:-60,y:55,rx:67,ry:76,height:12}] },
                { x: 755, y: 265, rx: 107, ry: 280, height: 103, angle: -.53, lobes: [{x:110,y:100,rx:96,ry:123,height:36}] },
                { x: 1120, y: 951, rx: 267, ry: 113, height: 86, angle: -.23, lobes: [{x:165,y:-20,rx:98,ry:76,height:29}] },
                { x: 1510, y: 180, rx: 143, ry: 92, height: 62, lobes: [{x:-80,y:20,rx:80,ry:43,height:24}] }
            ],
            lakes: [{x:360,y:845,rx:165,ry:86,angle:-.35,shore:[.16,.08,2.1],name:'CLOVER MERE'}],
            controls: [{x:575,y:418,r:73,name:'Enter the bank'}, {x:890,y:652,r:70,name:'Ride the valley'}],
            districts: [
                {id:'sunflower',name:'Sunflower',x:1120,y:645,r:34,health:90,defence:true},
                {id:'hayloft',name:'Hayloft',x:1390,y:490,r:34,health:80,defence:true}
            ], finish:{x:1560,y:570,r:82}
        });
    const lakes = course('gerbo-lake-skipping', 'No Grip, No Problem', 'Two lake crossings / three districts / dry run-ups',
        [130, 530, 0], [1880, 1060],
        'The Lake District has withdrawn its welcome mat. Carry momentum across two crooked lakes, rebuild speed on the dry isthmus, and flatten three evacuated districts. The recovery meadow lies south of Pipsqueak Point.',
        'There are no brakes or steering in deep water. Line up on dry ground and enter each lake fast. Tiny frantic squeaks mean slipping paws, not useful thrust. Counter-push before the final meadow.', {
            sheet: 'THE LAKE DISTRICT', subtitle: 'NO GRIP, NO PROBLEM',
            hills: [
                {x:285,y:420,rx:92,ry:133,height:23,lobes:[{x:45,y:-65,rx:63,ry:54,height:13}]},
                {x:710,y:135,rx:153,ry:78,height:56,angle:.25,lobes:[{x:105,y:32,rx:75,ry:69,height:23}]},
                {x:925,y:860,rx:210,ry:79,height:67,angle:-.12,lobes:[{x:-125,y:6,rx:93,ry:54,height:30}]},
                {x:1650,y:120,rx:143,ry:70,height:61,lobes:[{x:68,y:35,rx:80,ry:47,height:22}]}
            ],
            lakes:[
                {x:557,y:523,rx:82,ry:160,shore:[.17,.07,1.3],name:'EEH LAKE'},
                {x:925,y:489,rx:90,ry:167,angle:.15,shore:[.15,.10,3.0],name:'OOH LAKE'}
            ],
            controls:[{x:415,y:535,r:58,name:'First run-up'}, {x:737,y:510,r:60,name:'Dry isthmus'}, {x:1080,y:490,r:57,name:'Both lakes cleared'}],
            districts:[
                {id:'reedworks',name:'Reedworks',x:1210,y:485,r:33,health:78,defence:true},
                {id:'oatbridge',name:'Oatbridge',x:1460,y:350,r:33,health:86,defence:true},
                {id:'pipsqueak',name:'Pipsqueak Point',x:1670,y:580,r:33,health:78,defence:true}
            ],finish:{x:1665,y:850,r:86}
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
        return Math.hypot(u, v) < shoreRadius(l, Math.atan2(v, u));
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
            shieldUntil: 0, shieldReady: 0, shots: [], flashes: [], hold: 0,
            districts: level.rampage.districts.map(d => ({ ...d, maxHealth: d.health, nextShot: 0, aim: null, shotAt: null, hitAt: -100 })),
            stats: { districts: 0, damage: 0, blocked: 0, shields: 0, impacts: 0, waterTime: 0 }
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
        if (cp && Math.hypot(s.x-cp.x, s.y-cp.y) < cp.r) { st.control++; events.push(cp.name); }
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
        st.flashes = st.flashes.filter(f => run.time-f.t < 1.5);
        if (s.hull <= 0) run.failure = { type:'shell-broken',message:'The exercise ball cracked. Use the shield for defensive fire and high-speed impacts.' };
        const inside = Math.hypot(s.x-c.finish.x,s.y-c.finish.y) <= c.finish.r-c.radius;
        const slow = Math.hypot(s.vx,s.vy) < .8 && st.effort === 0;
        run.dock = { inside, aligned:true, slow, ready:ready(run) && inside && slow };
        run.dockHold = run.dock.ready ? run.dockHold+dt : 0;
        return events;
    }
    function message(level, run) {
        const st = run.rampage;
        if (run.failure) return run.failure.message;
        if (st.wet > .5) return 'NO TRACTION · keep coasting; running only spins the ball';
        if (run.dockHold > 0) return 'RECOVERY MEADOW · paws off · settling ' + Math.max(0,2-run.dockHold).toFixed(1)+' s';
        const cp = level.rampage.controls[st.control];
        if (cp) return `${String(st.control + 1).padStart(2, '0')} · ${cp.name.toUpperCase()} · keep your momentum`;
        const d = st.districts.find(d=>d.health>0);
        if (d) return `${d.name.toUpperCase()} · RAM WITH MOMENTUM · SPACE / F TO SHIELD`;
        return 'RECOVERY MEADOW · push against motion to brake, then release all directions';
    }
    const api = { levels:[level, bank, lakes], terrain, shoreRadius, lakePoint, inLake, water, create, shield, protectedAt, ready, update, message };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GerboRampage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
