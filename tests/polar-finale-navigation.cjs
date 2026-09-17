'use strict';
// Only production controls. Mission coordinates, reported patrols and rendezvous
// beacons guide the controller; no hull or objective state is assigned here.
const L=require('../src/levels.js'),I=require('../src/polar.js'),U=require('../src/submarine.js'),P=require('../src/physics.js');
const {create}=require('./headless.cjs');
function navigate(n,{trace=false,pickup='far'}={}){
 const t=create(),l=L.find(l=>l.id===`pale-reach-${n}`);t.load(L.indexOf(l),true);const r=t.state.run;
 let phase=0,wp=0,route=n===10?[[135,580],[290,540],[520,515],[730,490]]:n===11?[[155,570],[210,455]]:[[140,520],[300,580],[480,610],[650,600],[675,445],[675,350]],rescues=0;
 const ship=()=>r.ship;
 const apply=(order,input)=>{t.throttle(order-ship().throttle);Object.assign(t.state.input,input);};
 const steer=a=>P.clamp(P.wrap(a-ship().a)*2.5-ship().r*35,-1,1);
 const steady=a=>{const s=ship(),u=P.groundMotion(s).surge,k=steer(a);apply(Math.abs(u)<.04?0:u>.25?-2:u>0?-1:u<-.25?2:1,{rudder:k,thruster:n===10?k*.4:k});};
 const setRoute=points=>{route=[[ship().x,ship().y],...points];wp=0;};
 const pilot=(cruise=2.7)=>{const s=ship(),old=s.throttle,c=I.pilot(s,route,wp,cruise,false,n===11?30:25);wp=c.waypoint;const order=s.throttle;s.throttle=old;apply(order,{...c.input,thruster:n===10?c.input.thruster*.6:c.input.thruster});return c;};
 if(n===10){t.polarAction('rendezvous',pickup);if(pickup==='near')route=[[135,580],[290,540],[510,510],[625,480],[625,428]];}
 for(let tick=0;tick<120*4300&&t.state.status==='running';tick++){
  if(tick%30===0){
   const s=ship(),st=r.polar;
   if(n===10){
    if(phase===0){if(pickup==='far'&&s.x>535&&s.depthTarget!==88)t.polarAction('depth','2');if(pilot(1.45).arrived){phase=1;}}
    if(phase===1){const a=U.access(st);if(pickup==='near'&&s.depthTarget!==48)t.polarAction('depth','1');setRoute([[a.x,a.y]]);if(pilot(.85).arrived)phase=2;}
    if(phase===2){steady(s.a);if(!st.mission.ordered)t.polarAction('team');if(st.mission.team==='recovered'){phase=3;t.polarAction('depth','2');setRoute([[820,160],[645,130],[495,125],[285,135],[190,365],[135,580]]);}}
    if(phase===3&&pilot(1.35).arrived)phase=4;
    if(phase===4)steady(s.a);
   }else if(n===11){
    const o=st.operation;
    if(phase===0&&pilot(2).arrived)phase=1;
    if(phase===1){steady(-Math.PI/2);if(Math.abs(P.wrap(s.a+Math.PI/2))<.1&&I.speed(s)<.12&&t.polarAction('tow')){phase=2;setRoute([[210,340]]);}}
    if(phase===2){pilot(1.6);if(o.survey.safeNow)phase=3;}
    if(phase===3){steady(-Math.PI/2);if(o.survey.safeNow){t.polarAction('tow');phase=4;setRoute([[160,475],[205,590],...l.polar.rescue.protectedRoute.slice(1,-1),[790,320]]);}}
    if(phase===4&&pilot().arrived)phase=5;
    if(phase===5){steady(s.a);const f=st.fleet[rescues];if(f.rescued){t.convoyCommand(f.id,'proceed');rescues++;if(rescues===1){phase=4;setRoute([[850,320],[855,440],[785,500]]);}else if(rescues===2){phase=4;setRoute([[835,510],[805,585],[795,665]]);}else{phase=6;setRoute([[790,700],[720,745]]);}}}
    if(phase===6&&pilot(2).arrived)phase=7;
    if(phase===7)steady(s.a);
   }else if(r.finalJourney.watch.phase==='underwater'){
    if(phase===0&&pilot(1.9).arrived)phase=1;
    if(phase===1){steady(-Math.PI/2);if(!st.mission.ordered)t.polarAction('team');if(st.mission.team==='working')phase=2;}
    if(phase===2){const k=steer(-Math.PI/2);apply(-1,{rudder:k,thruster:k});if(s.y>480)phase=3;}
    if(phase===3){steady(-Math.PI/2);if(st.mission.team==='waiting'){phase=4;setRoute([[675,445],[675,350]]);}}
    if(phase===4&&pilot(1.5).arrived)phase=5;
    if(phase===5){steady(-Math.PI/2);if(!st.mission.ordered)t.polarAction('team');if(st.mission.team==='recovered')phase=6;}
    if(phase===6){const k=steer(-Math.PI/2);apply(-1,{rudder:k,thruster:k});if(s.y>525){phase=7;setRoute([[650,600],[480,610],[300,580],[140,520]]);}}
    if(phase===7&&pilot(2).arrived)phase=8;
    if(phase===8)steady(s.a);
   }else{
    if(phase<9){phase=9;setRoute([[325,565],[455,535],[625,555],[780,590],[860,590]]);}
    for(const f of st.fleet)if(f.order==='hold'&&!f.returned)t.convoyCommand(f.id,'proceed');
    if(phase===9&&pilot(2.8).arrived){phase=10;setRoute([[860,475]]);}
    if(phase===10&&pilot(2.2).arrived)phase=11;
    if(phase===11)steady(s.a);
   }
  }
  t.advance(1/120);
  if(trace&&tick%12000===0){const s=ship(),st=r.polar;console.log(JSON.stringify({time:r.time,phase,wp,xy:[s.x,s.y],a:s.a,hull:s.hull,depth:s.depth,mission:st.mission,recovery:st.recovery,journey:r.finalJourney?.watch,survey:st.operation?.survey&&{xy:[st.operation.survey.ship.x,st.operation.survey.ship.y],safe:st.operation.survey.safeNow,line:st.operation.line},fleet:st.fleet.map(f=>({id:f.id,xy:[f.ship.x,f.ship.y],hull:f.ship.hull,waiting:f.waiting,rescued:f.rescued,nav:!!f.navigation,returned:f.returned})),failure:st.failure}));}
 }
 return t;
}
module.exports={navigate};
if(require.main===module){const t=navigate(Number(process.argv[2]),{trace:true,pickup:process.argv[3]||'far'});console.log(t.state.status,t.state.run.time,t.state.run.polar.failure,JSON.stringify(t.state.run.splits));}
