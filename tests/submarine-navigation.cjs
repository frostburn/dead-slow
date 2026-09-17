'use strict';
// Ordinary bridge orders only. Navigation uses the authored chart, sonar estimates
// and the same mission messages the player sees; never hidden actor positions.
const L=require('../src/levels.js'),I=require('../src/polar.js'),U=require('../src/submarine.js'),P=require('../src/physics.js');
const {create}=require('./headless.cjs');
function navigate(n,{trace=false,reckless=false}={}){
 const t=create(),l=L.find(l=>l.id===`pale-reach-${n}`);t.load(L.indexOf(l),true);
 const r=t.state.run,s=r.ship,st=r.polar;
 let phase=0,wp=0,route=n===7?[[135,535],[320,480],[405,440],[570,450],[725,435]]:
  n===8?[[135,585],[320,580],[560,610],[720,540],[770,430],[770,360]]:[[150,420],[270,505],[350,570],[520,570],[710,615]];
 const apply=(order,input)=>{t.throttle(order-s.throttle);Object.assign(t.state.input,input);};
 const setRoute=points=>{route=[[s.x,s.y],...points];wp=0;};
 const steer=a=>P.clamp(P.wrap(a-s.a)*2.5-s.r*35,-1,1);
 const steady=a=>{const u=P.groundMotion(s).surge,turn=steer(a);apply(Math.abs(u)<.04?0:u>.25?-2:u>0?-1:u<-.25?2:1,{rudder:turn,thruster:n===8?turn*.35:turn});};
 let patrolWaits=0;
 const pilot=(cruise)=>{
  const watch=n===8&&!reckless&&st.actors.some(a=>a.visible&&Math.hypot(a.ship.x-s.x,a.ship.y-s.y)<190&&Math.abs(P.wrap(Math.atan2(s.y-a.ship.y,s.x-a.ship.x)-a.ship.a))<1.1);
  const old=s.throttle,c=I.pilot(s,route,wp,cruise,watch,30);wp=c.waypoint;const order=s.throttle;s.throttle=old;
  if(watch){patrolWaits++;apply(0,{rudder:0,thruster:0});}
  else apply(order,{...c.input,thruster:n===8&&!reckless?c.input.thruster*.65:c.input.thruster});return c;
 };
 if(n===7)t.polarAction('depth','1');
 for(let tick=0;tick<120*3200&&t.state.status==='running';tick++){
  if(tick%30===0){
   if(n===8){
    if(reckless&&st.time-st.pulseAt>=18)t.polarAction('ping');
    if(phase===0&&pilot(reckless?3:1.2).arrived){phase=1;}
    if(phase===1){steady(s.a);if(!st.mission.ordered)t.polarAction('team');if(st.mission.team==='working')phase=2;}
    if(phase===2){const turn=steer(-Math.PI/2);apply(-1,{rudder:turn,thruster:turn*.35});if(s.y>530)phase=3;}
    if(phase===3){steady(-Math.PI/2);if(st.mission.team==='waiting'){phase=4;setRoute([[770,430],[770,360]]);}}
    if(phase===4&&pilot(1.1).arrived)phase=5;
    if(phase===5){steady(s.a);if(!st.mission.ordered)t.polarAction('team');if(st.mission.team==='recovered')phase=6;}
    if(phase===6){const turn=steer(-Math.PI/2);apply(-1,{rudder:turn,thruster:turn*.35});if(s.y>535){phase=7;setRoute([[720,580],[560,610],[320,580],[135,585]]);}}
    if(phase===7&&pilot(1.4).arrived)phase=8;
    if(phase===8)steady(s.a);
   }else{
    const bridgeMessage=U.message(r);
    for(const track of st.tracks)if(!track.identified&&track.category!=='unknown'&&U.Sonar.predict(track,st.time).age<10){t.polarAction('target',track.id);t.polarAction('identify');}
    const target=st.tracks.find(t=>t.category==='submarine'),fix=target&&U.Sonar.predict(target,st.time);
    if(target&&st.selected!==target.id)t.polarAction('target',target.id);
    if(phase===0&&pilot(n===9?1.7:2.2).arrived)phase=1;
    if(phase<=1&&(n===9?phase===1:s.x>480)&&(!fix||fix.radius>28||fix.age>5)&&st.time-st.pulseAt>=20)t.polarAction('ping');
    const success=st.mission.threatGone||n===9&&/withdrawing/.test(bridgeMessage);
    if(phase===1&&fix&&!success){steady(Math.atan2(fix.y-s.y,fix.x-s.x));if(st.gun.solution>=st.gun.hold&&(n!==9||!st.torpedoes.some(t=>t.source==='player')))t.polarAction('fire');}
    if(phase<=1&&success){phase=2;t.polarAction('depth','0');setRoute(n===7?[[570,450],[405,440],[320,480],[135,535]]:[[520,570],[350,570],[270,505],[150,420]]);}
    if(phase===2&&pilot(2).arrived)phase=3;
    if(phase===3)steady(s.a);
   }
  }
  t.advance(1/120);
  if(trace&&tick%12000===0)console.log(JSON.stringify({time:r.time,phase,wp,xy:[s.x,s.y],a:s.a,depth:s.depth,hull:s.hull,noise:st.noise,mission:st.mission,tracks:st.tracks.map(t=>({id:t.id,type:t.category,known:t.identified,...U.Sonar.predict(t,st.time)})),gun:st.gun.reason,shots:st.stats.shots,actors:st.actors.map(a=>({id:a.id,xy:[a.ship.x,a.ship.y],hull:a.ship.hull,wp:a.waypoint,quiet:a.quietNow,escaped:a.escaped})),failure:st.failure}));
 }
 t.navigation={patrolWaits};return t;
}
module.exports={navigate};
if(require.main===module){const t=navigate(Number(process.argv[2]),{trace:true,reckless:process.argv.includes('--reckless')});console.log(t.state.status,t.state.run.polar.failure,JSON.stringify(t.state.run.polar.stats));}
