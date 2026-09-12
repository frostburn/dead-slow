/* Gerbozilla: one preview course. Independent rolling dynamics; no water/space changes. */
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
            hills: [
                { x: 343, y: 510, rx: 65, ry: 195, height: 43 },
                { x: 540, y: 155, rx: 155, ry: 115, height: 78 },
                { x: 1035, y: 790, rx: 225, ry: 103, height: 95 },
                { x: 1380, y: 120, rx: 185, ry: 80, height: 55 }
            ],
            lakes: [{ x: 600, y: 515, rx: 78, ry: 152, name: 'BLUE LAKE' }],
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
    function terrain(c, x, y) {
        let height = 0, dx = 0, dy = 0;
        for (const h of c.hills) {
            const u = (x - h.x) / h.rx, v = (y - h.y) / h.ry;
            const z = h.height * Math.exp(-.5 * (u * u + v * v));
            height += z; dx -= z * u / h.rx; dy -= z * v / h.ry;
        }
        return { height, dx, dy };
    }
    function water(c, s) {
        // Sample the footprint: traction fades across the shoreline, rather than flickering.
        let wet = 0;
        for (const [dx, dy] of [[0,0], [1,0], [-1,0], [0,1], [0,-1]]) {
            const x = s.x + dx * c.radius * .7, y = s.y + dy * c.radius * .7;
            if (c.lakes.some(l => ((x-l.x)/l.rx)**2 + ((y-l.y)/l.ry)**2 < 1)) wet++;
        }
        return wet / 5;
    }
    function create(level, ship) {
        ship.vessel = 'ball'; ship.radius = level.rampage.radius;
        return { roll: 0, slip: 0, wet: 0, effort: 0, elevation: 0, control: 0,
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
        return run.rampage.control === 2 && run.rampage.districts.every(d => d.health <= 0);
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
        const ax = grip * (px * c.drive - 7.007 * t.dx) - drag * s.vx;
        const ay = grip * (py * c.drive - 7.007 * t.dy) - drag * s.vy;
        const ox = s.x, oy = s.y;
        s.x += s.vx * dt + ax * dt * dt / 2; s.y += s.vy * dt + ay * dt * dt / 2;
        s.vx += ax * dt; s.vy += ay * dt;
        const speed = Math.hypot(s.vx, s.vy), distance = Math.hypot(s.x - ox, s.y - oy);
        if (speed > .05) s.a = Math.atan2(s.vy, s.vx);
        s.engine = 0; s.r = 0; s.throttle = 0;
        st.slip = st.wet * st.effort * 1.8;
        st.roll += distance / c.radius + st.slip * dt;
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
        if (st.control < 2) return st.control ? '02 · COAST ACROSS BLUE LAKE · keep your run-up' : '01 · BUILD MOMENTUM · clear the ridge control';
        const d = st.districts.find(d=>d.health>0);
        if (d) return `${d.name.toUpperCase()} · RAM WITH MOMENTUM · SPACE / F TO SHIELD`;
        return 'RECOVERY MEADOW · push against motion to brake, then release all directions';
    }
    const api = { levels:[level], terrain, water, create, shield, protectedAt, ready, update, message };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GerboRampage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
