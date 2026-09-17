'use strict';
// Feedback helm used only by navigation regression tests. It applies ordinary
// engine, rudder, thruster and captain orders to the production 120 Hz shell.
// It never sets position, velocity, ice, cargo progress or completion flags.
const L=require('../src/levels.js'),I=require('../src/polar.js'),P=require('../src/physics.js');
const {create}=require('./headless.cjs');
function navigate(n){
 const t=create(),l=L.find(l=>l.id===`pale-reach-${n}`);t.load(L.indexOf(l),true);
 const r=t.state.run;
 let phase=0,wp=0,docking=false,route=n===1?[...l.polar.route.slice(0,6),[660,253],[739,253]]:
  n===2?[...l.polar.route.slice(0,-1),[752,336],[827,336]]:l.polar.route;
 const routes=n===3?[l.polar.route,[...l.polar.route.slice(1).reverse(),[173,365]],[[173,365],...l.polar.secondary.route.slice(1)],
  [...l.polar.secondary.route.slice(1).reverse(),[180,385]],[[180,385],[107,398]]]:null;
 let earlyPocket=null,closedLoad=0,bergWait=false;
 for(let tick=0;tick<120*(n===3?2500:850)&&t.state.status==='running';tick++){
  if(tick%30===0){
   const old=r.ship.throttle,c=I.pilot(r.ship,route,wp,n===1?3.1:n===2?2.8:2.9);wp=c.waypoint;let input=c.input;
   if(n===1&&c.arrived&&phase<2){
    if(!phase)earlyPocket=I.pocketClear(r.polar);
    phase++;route=phase===1?[[r.ship.x,r.ship.y],[660,287],[578,287]]:[[r.ship.x,r.ship.y],[635,292],[700,292],[746,292]];wp=0;
   }else if(n===3&&c.arrived&&phase<4){
    if(phase===1)t.convoyCommand('morrow','proceed');if(phase===3)t.convoyCommand('sedge','proceed');
    phase++;route=routes[phase];wp=0;
   }else if(c.arrived&&(n===1&&phase===2||n===2||n===3&&phase===4))docking=true;
   if(docking){
    const b=l.berth,s=r.ship,along=(s.x-b.x)*Math.cos(b.a)+(s.y-b.y)*Math.sin(b.a),u=P.groundMotion(s).surge;
    const demand=(P.clamp(-along*.04,-.3,.3)-u)*3;
    s.throttle=Math.abs(along)<10&&Math.abs(u)<.04?0:demand>.1?1:demand<-.1?-1:0;
    const steer=P.clamp(P.wrap(b.a-s.a)*2.5-s.r*35,-1,1);input={rudder:steer,thruster:steer};
   }
   const order=r.ship.throttle;r.ship.throttle=old;t.throttle(order-old);Object.assign(t.state.input,input);
   if(n===3)for(const f of r.polar.fleet)if(f.leg==='return'&&!f.returned&&f.order==='hold')t.convoyCommand(f.id,'proceed');
  }
  t.advance(1/120);closedLoad=Math.max(closedLoad,r.polar.slush);
  if(r.polar.fleet.some(f=>f.waiting==='Iceberg crossing · braking'))bergWait=true;
 }
 return {t,earlyPocket,closedLoad,bergWait};
}
module.exports={navigate};
