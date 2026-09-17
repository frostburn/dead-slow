'use strict';
// Feedback controllers use only the production helm and bridge orders. No
// position, velocity, damage, ice, cargo, or completion state is written here.
const L=require('../src/levels.js'),I=require('../src/polar.js'),P=require('../src/physics.js');
const {create}=require('./headless.cjs');
function navigate(n,{trace=false,defend=true}={}){
 const t=create(),l=L.find(l=>l.id===`pale-reach-${n}`);t.load(L.indexOf(l),true);
 const r=t.state.run,s=r.ship,o=r.polar.operation;
 let phase=0,wp=0,route=n===4?[[120,520],[260,570],[420,600],[580,550],[660,430],[660,320],[600,330]]:
  n===5?[[295,390],[305,335],[270,330]]:[[125,590],[265,570],[325,425],[395,245],[560,185],[710,200],[790,235]];
 const apply=(order,input)=>{t.throttle(order-s.throttle);Object.assign(t.state.input,input);};
 const steer=a=>P.clamp(P.wrap(a-s.a)*2.5-s.r*35,-1,1);
 const steady=a=>{const u=P.groundMotion(s).surge;apply(Math.abs(u)<.05?0:u>.25?-2:u>0?-1:u<-.25?2:1,{rudder:steer(a),thruster:steer(a)});};
 const pilot=()=>{const old=s.throttle,c=I.pilot(s,route,wp,n===4&&o.line?1.7:2.8,false,n===4?25:35);wp=c.waypoint;const order=s.throttle;s.throttle=old;apply(order,c.input);return c;};
 const setRoute=points=>{route=[[s.x,s.y],...points];wp=0;};
 for(let tick=0;tick<120*2400&&t.state.status==='running';tick++){
  if(tick%30===0){
   if(n===4){
    if(phase===0&&pilot().arrived)phase=1;
    if(phase===1){steady(Math.PI/2);if(Math.abs(P.wrap(s.a-Math.PI/2))<.1&&I.speed(s)<.12&&o.survey.recovered&&t.polarAction('tow')){phase=2;setRoute([[640,435],[580,550],[420,600],[260,570],[120,510]]);}}
    else if(phase===2&&pilot().arrived)phase=3;
    if(phase===3){steady(Math.PI);if(o.survey.safeNow){t.polarAction('tow');phase=4;}}
   }else if(n===5){
    for(const f of r.polar.fleet)if(f.unloaded&&!f.returned&&f.order==='hold')t.convoyCommand(f.id,'proceed');
    if(defend){
     // Guard the transports against armed boats; the cutters' wakes stay usable
     // after they are disabled, so firing at them first can waste the gun's arc.
     const threats=I.operations.targets(r.polar).filter(n=>n.gun);
     const target=threats.find(n=>n.id===o.gun.target&&Math.hypot(n.ship.x-s.x,n.ship.y-s.y)<o.gun.range)||threats.sort((a,b)=>a.ship.x-b.ship.x)[0];
     if(!phase){if(pilot().arrived)phase=1;}
     else if(target){if(o.gun.target!==target.id)t.polarAction('target',target.id);steady(Math.atan2(target.ship.y-s.y,target.ship.x-s.x));if(o.gun.solution>=o.gun.hold)t.polarAction('fire');}
     else steady(s.a);
    }
   }else{
    if(!phase&&pilot().arrived)phase=1;
    if(phase===1||phase===2){
     const target=o.assets[phase-1];
     if(target.ship.hull<=0){phase++;if(phase===3)setRoute([[710,200],[560,185],[395,245],[325,425],[265,550],[225,572],[125,572]]);}
     else{if(o.gun.target!==target.id)t.polarAction('target',target.id);steady(Math.atan2(target.ship.y-s.y,target.ship.x-s.x));if(o.gun.solution>=o.gun.hold)t.polarAction('fire');}
    }
    if(phase===3&&pilot().arrived)phase=4;
   }
   if(phase===4){
    const b=l.berth,along=(s.x-b.x)*Math.cos(b.a)+(s.y-b.y)*Math.sin(b.a),u=P.groundMotion(s).surge,demand=(P.clamp(-along*.04,-.3,.3)-u)*3;
    apply(Math.abs(along)<10&&Math.abs(u)<.04?0:demand>.1?1:demand<-.1?-1:0,{rudder:steer(b.a),thruster:steer(b.a)});
   }
  }
  t.advance(1/120);
  if(trace&&tick%12000===0)console.log(JSON.stringify({time:r.time,phase,wp,xy:[s.x,s.y],a:s.a,hull:s.hull,survey:o.survey&&{xy:[o.survey.ship.x,o.survey.ship.y],hull:o.survey.ship.hull,line:o.line,recorders:o.survey.recovered,safe:o.survey.safeNow},gun:o.gun&&{target:o.gun.target,reason:o.gun.reason,shots:r.polar.stats.shots},assets:o.assets.map(a=>a.ship.hull),npcs:o.npcs.map(e=>({xy:[e.ship.x,e.ship.y],hull:e.ship.hull,gun:e.gun?.reason,nav:!!e.navigation})),fleet:r.polar.fleet.map(f=>[f.waiting,f.ship.hull]),failure:r.polar.failure}));
 }
 return t;
}
module.exports={navigate};
if(require.main===module){const t=navigate(Number(process.argv[2]),{trace:true,defend:!process.argv.includes('--passive')});console.log(t.state.status,t.state.run.polar.failure,t.state.run.dock);}
