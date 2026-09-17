'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const P = require('../src/physics.js'), X = require('../src/space.js');
const L = require('../src/levels.js'), S = require('../src/storage.js');
const { create } = require('./headless.cjs');
const near = (a, b, e = 1e-8) => assert.ok(Math.abs(a - b) <= e, `${a} != ${b}`);
const load = id => { const t = create(); t.load(L.findIndex(l => l.id === id)); return t; };
const park = (s, b) => Object.assign(s, { x: b.x, y: b.y, a: b.a || 0, vx: b.vx || 0, vy: b.vy || 0, r: b.r || 0, throttle: 0, engine: 0 });
const fuelState = (fuel = 100) => ({ fuel, light: 1, inBlackout: false, stats: { fuelUsed: 0, burnTime: 0 } });
const tick = (s, state, cfg, input = {}, seconds = 1) => { for (let i=0;i<Math.round(seconds*120);i++) X.integrate(s,state,cfg,input,1/120); };
// Geometry/objective tests below deliberately isolate state. The separate checked-in
// input fixtures are the end-to-end evidence: no tests' positioning helpers enter watch().
for (const l of L.filter(l => l.space)) {
    test(`${l.id}: all starting hulls are clear, in bounds, and open to space`, () => {
        const t=load(l.id),r=t.state.run,st=r.space;
        assert.deepEqual(l.openSides,['n','e','s','w']);
        const bodies=[r.ship,st.mother,st.second,st.friendly].filter(Boolean);
        for(const s of bodies) {
            assert.ok(!X.outside(l,s),s.name);
            for(const b of st.rocks) assert.ok(!P.sat(P.hull(s),b.poly),`${s.name}/${b.id}`);
        }
        for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++)assert.ok(!P.sat(P.hull(bodies[i]),P.hull(bodies[j])));
        const final=P.ship(st.port.x,st.port.y,st.port.a,{...l.spec,...(l.space.mother?{length:72,beam:102}:{}),vx:st.port.vx,vy:st.port.vy});
        assert.ok(X.dock(final,st.port).inside,'complete hull fits final cradle');
        assert.equal(t.state.level.jobs.length,0);
    });
}
test('vacuum neutral preserves translation and angular momentum indefinitely',()=>{
    const s=P.ship(0,0,.2,{vx:3,vy:-2,r:.03}),st=fuelState();
    tick(s,st,{acceleration:.36},{},100);
    near(s.x,300);near(s.y,-200);near(s.vx,3);near(s.vy,-2);near(s.r,.03);near(P.wrap(s.a-.2-3),0);near(st.fuel,100);
});
test('main burns accelerate inversely with mass and do not remove sideways drift',()=>{
    const a=P.ship(0,0,0,{mass:1,engine:1,throttle:4,vy:2}),b=P.ship(0,0,0,{mass:2,engine:1,throttle:4,vy:2});
    const sa=fuelState(),sb=fuelState();tick(a,sa,{acceleration:.36});tick(b,sb,{acceleration:.36});
    near(a.vx,.36);near(b.vx,.18);near(a.vy,2);near(b.vy,2);near(sa.fuel,sb.fuel);
});
test('reverse thrust decelerates forward motion rather than reversing velocity instantly',()=>{
    const s=P.ship(0,0,0,{vx:4,engine:-1,throttle:-3}),st=fuelState();tick(s,st,{acceleration:.36});
    near(s.vx,3.64);assert.equal(P.groundMotion(s).direction,'ahead');
});
test('yaw jets change spin; releasing them is not automatic stabilization',()=>{
    const s=P.ship(0,0,0),st=fuelState();tick(s,st,{acceleration:.36},{rudder:1},2);
    near(s.r,.07);const before=s.r;tick(s,st,{acceleration:.36},{},2);near(s.r,before);
    tick(s,st,{acceleration:.36},{rudder:-1},2);near(s.r,0);
});
test('lateral RCS translates without applying torque',()=>{
    const s=P.ship(0,0,0),st=fuelState();tick(s,st,{acceleration:.36},{thruster:-1});
    near(s.vx,0);near(s.vy,-.36*.62);near(s.r,0);
});
test('the last propellant fraction is conserved across simultaneous jets',()=>{
    const s=P.ship(0,0,0,{engine:1,throttle:4}),st=fuelState(.0001);
    X.integrate(s,st,{acceleration:.36},{thruster:1,rudder:1},1/120);
    near(st.fuel,0);near(st.stats.fuelUsed,.0001);
    const v={vx:s.vx,vy:s.vy,r:s.r};tick(s,st,{acceleration:.36},{thruster:1,rudder:1});
    near(s.vx,v.vx);near(s.vy,v.vy);near(s.r,v.r);assert.equal(st.firingJets.main,0);
});
test('ephemeris velocities are derivatives of both linear and oscillating position',()=>{
    const b={x:100,y:200,motion:{vx:1.3,vy:-.2,ax:40,ay:30,period:170,phase:.9,spin:.001}};
    const p=X.pose(b,53),a=X.pose(b,53-.0001),c=X.pose(b,53+.0001);
    near(p.vx,(c.x-a.x)/.0002,1e-7);near(p.vy,(c.y-a.y)/.0002,1e-7);near(p.r,(c.a-a.a)/.0002,1e-7);
});
test('moving docking measures relative speed, including rotational cradle velocity',()=>{
    const b={x:300,y:200,a:0,l:60,w:40,speed:.24,angle:8,vx:4.2,vy:.5,r:.005};
    const s=P.ship(302,200,0,{vx:4.2,vy:.51,r:.005});
    assert.ok(X.dock(s,b).ready);s.vx=0;assert.ok(!X.dock(s,b).ready);
    s.vx=4.2;s.r=.1;assert.ok(!X.dock(s,b).ready);
    s.r=.005;assert.ok(!X.dock(s,b,true,{rudder:1}).ready);
    assert.ok(!X.dock(s,b,false).ready);
});
test('Hildara landing cradle follows the same moving rock used for collision',()=>{
    const t=load('wandering-stone'),r=t.state.run;r.time=41;X.refresh(t.state.level,r);
    const b=r.space.rocks.find(b=>b.id==='hilda');near(r.space.port.y,b.y-95);near(r.space.port.vy,b.vy);
    park(r.ship,r.space.port);assert.ok(X.dock(r.ship,r.space.port).ready);
});
test('polygon shadows distinguish sun, full shadow and a partially covered hull',()=>{
    const b=X.asteroid({id:'rock',x:100,y:100,radius:30},0);
    assert.equal(X.shadowAt({x:70,y:100},[b]),false);
    assert.equal(X.shadowAt({x:200,y:100},[b]),true);
    assert.equal(X.illumination(P.ship(200,100,0),[b]),0);
    assert.equal(X.illumination(P.ship(40,100,0),[b]),1);
    const f=X.illumination(P.ship(200,130,0),[b]);assert.ok(f>0&&f<1);
});
for(const block of ['solar','scanner'])test(`${block}: every jet loses power but inertia persists without fuel loss`,()=>{
    const s=P.ship(0,0,0,{vx:3,r:.03,engine:1,throttle:4}),st=fuelState();
    st.light=0;st.inBlackout=block==='scanner';tick(s,st,{solar:block==='solar',acceleration:.36},{rudder:1,thruster:1},3);
    near(s.vx,3);near(s.r,.03);near(st.fuel,100);near(s.x,9);near(st.firingJets.main,0);
});
test('partial solar exposure scales thrust and propellant consistently',()=>{
    const s=P.ship(0,0,0,{engine:1,throttle:4}),st=fuelState();st.light=.5;
    tick(s,st,{solar:true,acceleration:.36});near(s.vx,.18);near(st.stats.fuelUsed,.18);
});
test('unshielded stellar flares kill, whereas full geometric shadow protects',()=>{
    const exposed=load('umbra');exposed.state.run.time=21;park(exposed.state.run.ship,{x:400,y:80});exposed.advance(4);
    assert.equal(exposed.state.status,'failed');assert.equal(exposed.state.run.failure.type,'radiation');
    const sheltered=load('umbra');sheltered.state.run.time=21;sheltered.advance(14);
    assert.equal(sheltered.state.status,'running');near(sheltered.state.run.space.heat,0);
    sheltered.retry();near(sheltered.state.run.time,0);near(sheltered.state.run.space.heat,0);
});
for(const direction of [-1,1])test(`beam ${direction<0?'attraction':'repulsion'} conserves pair momentum`,()=>{
    const t=load('equal-and-opposite'),r=t.state.run,st=r.space,s=r.ship,b=st.friendly;
    assert.ok(X.toggleBeam(t.state.level,r).ok);const fuel=st.fuel;
    X.beamPhysics(r,{winch:direction},1);
    near(s.vx*s.mass+b.vx*b.mass,0);near(s.vy*s.mass+b.vy*b.mass,0);
    assert.equal(Math.sign(b.vx),direction);near(fuel-st.fuel,.32);assert.ok(st.beamEver);
});
test('beam lock is bounded, line-of-sight checked, and retains coast after release',()=>{
    const t=load('equal-and-opposite'),r=t.state.run,st=r.space;
    r.ship.x=100;assert.equal(X.toggleBeam(t.state.level,r).ok,false);
    r.ship.x=190;st.rocks=[X.asteroid({id:'block',x:260,y:355,radius:20},0)];
    assert.equal(X.toggleBeam(t.state.level,r).ok,false);st.rocks=[];
    assert.ok(X.toggleBeam(t.state.level,r).ok);X.beamPhysics(r,{winch:1},1);
    const vx=st.friendly.vx;X.toggleBeam(t.state.level,r);X.beamPhysics(r,{winch:-1},10);near(st.friendly.vx,vx);
    X.toggleBeam(t.state.level,r);r.ship.x=100;X.beamPhysics(r,{winch:1},1);assert.equal(st.beam,false);
});
test('beam cannot manufacture an impulse from an empty reserve',()=>{
    const t=load('equal-and-opposite'),r=t.state.run;X.toggleBeam(t.state.level,r);r.space.fuel=.0001;
    X.beamPhysics(r,{winch:1},1);near(r.space.fuel,0);near(r.space.friendly.vx*r.space.friendly.mass,.0001);
    X.beamPhysics(r,{winch:1},1);near(r.space.friendly.vx*r.space.friendly.mass,.0001);
});
test('refuelling requires the entire uninterrupted moving-dock hold',()=>{
    const t=load('last-fill'),r=t.state.run;
    park(r.ship,r.space.depot);t.advance(3);assert.equal(r.space.refuelled,false);assert.ok(r.space.depotHold>2.99);
    t.state.input.rudder=1;t.advance(1/120);near(r.space.depotHold,0);t.state.input.rudder=0;
    park(r.ship,r.space.depot);t.advance(6.1);assert.equal(r.space.refuelled,true);near(r.space.fuel,85);
    assert.ok(r.ship.vx>1,'refuel does not stop the moving pair');
    assert.ok(r.space.stats.fuelTaken>80);
});
test('refuel interception is physically impossible with the departure reserve alone',()=>{
    const l=L.find(l=>l.id==='last-fill');assert.equal(l.spec.mass,1);
    assert.ok(l.space.fuel/l.spec.mass<l.berth.motion.vx);
    // Any distribution of burns has |delta-v| <= total scalar impulse / mass.
    // The target starts ahead and recedes faster, so distance cannot close.
    assert.ok(l.space.depot.motion.vx<l.space.fuel/l.spec.mass);
});
for(const id of ['last-fill','family-reunion','newtons-broadside','moving-argument','equal-and-opposite','umbra','borrowed-sun','yesterday','cold-transit','perihelion-dispatch'])test(`${id}: parking at the final cradle cannot bypass the assignment`,()=>{
    const t=load(id),r=t.state.run;park(r.ship,r.space.port);t.advance(2.4);
    assert.notEqual(t.state.status,'complete');assert.equal(r.space.finalReady,false);
});
test('assembly switches between actual ships, adds both masses and expands final envelope',()=>{
    const t=load('family-reunion'),r=t.state.run,st=r.space,initialFuel=st.fuel;
    const first=r.ship;park(first,X.activeTarget(t.state.level,r));t.advance(2.01);
    assert.equal(st.phase,1);assert.equal(r.ship,st.second);assert.equal(st.tenders.length,1);near(st.mother.mass,3.7);
    assert.equal(first.docked,true);assert.ok(!X.ready(st,t.state.level.space));
    park(r.ship,X.activeTarget(t.state.level,r));t.advance(2.01);
    assert.equal(st.phase,2);assert.equal(r.ship,st.mother);near(r.ship.mass,4.7);assert.equal(r.ship.beam,102);
    near(st.fuel,initialFuel);assert.equal(st.stats.captures,2);assert.ok(X.ready(st,t.state.level.space));
    assert.ok(r.distance<.01,'selection changes do not count as physical travel');
});
test('cannon needs the box, a neutral steady aim and the complete charge',()=>{
    const t=load('newtons-broadside'),r=t.state.run,st=r.space;
    const b=t.state.level.space.firing;park(r.ship,{...b,a:st.aim});t.advance(2.5);assert.equal(st.stats.shots,0);
    t.state.input.rudder=1;t.advance(1/120);near(st.charge,0);t.state.input.rudder=0;
    park(r.ship,{...b,a:st.aim});t.advance(3.01);
    assert.equal(st.stats.shots,1);assert.ok(r.ship.vy>.7,'opposite recoil changes actual velocity');
    assert.equal(st.targetHit,false,'projectile must travel before a hit');t.advance(3);
    assert.equal(st.targetHit,true);assert.equal(st.stats.hits,1);assert.ok(X.ready(st,t.state.level.space));
});
test('an aimed cannon outside the firing box cannot fire',()=>{
    const t=load('newtons-broadside'),r=t.state.run;park(r.ship,{x:555,y:580,a:-Math.PI/2});t.advance(4);
    assert.equal(r.space.stats.shots,0);
});
test('moving target uses a future interception point, not its current hull centre',()=>{
    const t=load('moving-argument'),r=t.state.run;park(r.ship,t.state.level.space.firing);X.refresh(t.state.level,r);
    assert.ok(r.space.lead.x>r.space.target.x+4);
    const interceptTime=(r.space.target.y-r.ship.y)/-115;
    assert.ok(Math.abs(X.pose(t.state.level.space.target,interceptTime).x-r.space.lead.x)<1);
});
test('time insertion records real history, preserves velocity/fuel, and keeps the run clock',()=>{
    const t=load('yesterday'),r=t.state.run,st=r.space;near(st.loop[0][1],r.ship.x);
    park(r.ship,{...X.gates(t.state.level.space)[0],vx:.1});const reserve=st.fuel;
    t.advance(2.01);assert.equal(st.phase,1);assert.ok(r.time>2);assert.ok(st.loopDuration>1.99);near(r.ship.vx,.1);near(st.fuel,reserve);
    near(st.histories[0].loop.at(-1)[0],st.loopDuration);assert.ok(r.distance<.21,'temporal relocation is not distance travelled');
    const history=st.histories[0], recorded=X.echoAt(history,0);near(recorded.x,t.state.level.start[0]);
    park(r.ship,X.echoAt(history,(r.time+1/120-history.start+history.lead)%history.loopDuration));t.advance(1/120);
    assert.equal(t.state.status,'failed');assert.equal(r.failure.type,'paradox');
    t.retry();assert.equal(t.state.run.space.phase,0);assert.equal(t.state.run.space.loop.length,1);
});
test('time history interpolation follows angle wrapping and holds its last actual pose',()=>{
    const st={loop:[[0,1,2,Math.PI-.1,1,0],[1,3,4,-Math.PI+.1,1,0]],loopDuration:1};
    const m=X.echoAt(st,.5);near(m.x,2);near(m.y,3);near(Math.abs(m.a),Math.PI);
    const end=X.echoAt(st,100);near(end.x,3);near(end.y,4);
});
for(const casualty of [false,true])for(const [side,x,y] of [['west',1,400],['east',1099,400],['north',500,1],['south',500,639]])test(`${casualty?'friendly':'player'}: whole hull ${side} exit fails and freezes the clock`,()=>{
    const t=load('equal-and-opposite'),r=t.state.run;park(casualty?r.space.friendly:r.ship,{x,y});t.advance(1/120);
    assert.equal(t.state.status,'failed');assert.equal(r.failure.type,'out-of-sector');const time=r.time;t.advance(1);near(r.time,time);
    assert.equal(t.state.storage.stages['equal-and-opposite'].runs.length,0);
});
test('the Century Ship is selectable but excluded from both relevant marathons',()=>{
    const t=create();t.cheats.level(6,13);assert.equal(t.state.level.id,'century-ship');assert.ok(t.state.level.bonus);
    for(const id of ['meridian','grand-tour']) {t.marathon(id);assert.ok(t.state.marathon.route.every(i=>!L[i].bonus));assert.equal(t.state.marathon.route.length,id==='meridian'?12:84);}
    const i=L.findIndex(l=>l.id==='perihelion-dispatch');t.load(i);t.finish();t.next();assert.equal(t.state.modal,'courses');assert.equal(t.state.index,i);
});
test('century 30-minute lower bound follows distance and maximum acceleration, with docking tolerance',()=>{
    const l=L.find(l=>l.id==='century-ship'),a=Math.hypot(l.space.acceleration,l.space.lateral)/l.spec.mass,T=1800,v=l.berth.speed;
    const closest=l.berth.x-l.start[0]-l.berth.l/2;
    const maxAt30Min=a*T*T/4+v*T/2-v*v/(4*a);
    near(closest,110550);assert.ok(maxAt30Min < 103000);
    assert.ok(closest>maxAt30Min);assert.equal(l.space.lateral,.04);assert.ok(l.space.asteroids.every(b=>b.planet && !b.motion));
    assert.equal(l.space.friendly,undefined);assert.equal(l.space.mother,undefined);
    const f=require('./fixtures/century-ship-controls.json');assert.ok(f.expectedTime>1800);assert.equal(f.events.length,8);
});
test('v4 logbooks preserve all stages and sea circuits while archiving the 36-stage Grand Tour',()=>{
    const d=S.fresh(),run={time:123,contacts:0,clean:true};d.version=4;
    d.stages['granite-needle']={runs:[run],ghost:[[0,1,2,0]],bestSplits:[99],clears:2,attempts:3};
    for(const id of ['coast','northwatch','archipelago','grand-tour'])d.races[id]=[run];
    const n=S.sanitize(d);assert.equal(n.version,S.VERSION);assert.equal(n.archivedStages['granite-needle-layout-v1'].runs[0].time,123);
    assert.deepEqual(n.archivedStages['granite-needle-layout-v1'].ghost,[[0,1,2,0]]);assert.deepEqual(n.archivedStages['granite-needle-layout-v1'].bestSplits,[99]);
    assert.equal(n.races.coast.length,1);
    assert.equal(n.races.northwatch.length,0);assert.equal(n.archivedRaces['northwatch-approach-v1'].length,1);
    assert.equal(n.races.archipelago.length,0);assert.equal(n.archivedRaces['archipelago-layout-v2'].length,1);
    assert.equal(n.races['grand-tour'].length,0);assert.equal(n.archivedRaces['grand-tour-36'].length,1);
    assert.deepEqual(S.sanitize(n),n);
});
test('space accelerated frames retain the 120 Hz trajectory and are unranked',()=>{
    const a=load('vacuum'),b=load('vacuum');a.cheats.controls({throttle:4,rudder:1,thruster:1});b.throttle(4);
    b.state.input.rudder=1;b.state.input.thruster=1;a.cheats.speed(8);a.frame(0);a.frame(125);b.advance(1);
    for(const k of ['x','y','vx','vy','a','r'])near(a.state.run.ship[k],b.state.run.ship[k]);
    assert.ok(a.state.run.pausedUsed);near(a.state.run.space.fuel,b.state.run.space.fuel);
});
