'use strict';
// Feedback helm used only by navigation regression tests. It applies ordinary
// engine, rudder, thruster and captain orders to the production 120 Hz shell.
// It never sets position, velocity, ice, cargo progress or completion flags.
const L=require('../src/levels.js'),I=require('../src/polar.js'),P=require('../src/physics.js');
const {create}=require('./headless.cjs');
function navigate(n,{trace=false}={}){
 const t=create(),l=L.find(l=>l.id===`pale-reach-${n}`);t.load(L.indexOf(l),true);
 const r=t.state.run;
 const north=[[235,283],[305,244],[368,197],[438,193],[494,155],[537,149]];
 // Come back on the other side of the drifting berg before releasing Morrow.
 const fork=[[480,135],[429,133],[374,149],[339,211],[270,267],[248,275]];
 const south=l.polar.secondary?.route.slice(0,-1).concat([[536,401]]);
 const routes=n===3?[north,fork,[[248,275],...south],
  [...south.slice(0,-1).reverse(),[258,309]],[[258,309],[142,296]]]:null;
 let phase=0,wp=0,docking=false,route=routes?.[0]||[...l.polar.route.slice(0,-1),[752,336],[827,336]];
 let closedLoad=0;
 const unloadedAt={},returnedAt={};
 for(let tick=0;tick<120*(n===3?2500:850)&&t.state.status==='running';tick++){
  if(tick%30===0){
   const old=r.ship.throttle,c=I.pilot(r.ship,route,wp,n===2?2.8:2.9);wp=c.waypoint;let input=c.input;
   if(n===3&&c.arrived&&phase<4){
    if(phase===1)t.convoyCommand('morrow','proceed');
    if(phase===3)t.convoyCommand('sedge','proceed');
    phase++;route=routes[phase];wp=0;
   }else if(c.arrived)docking=true;
   if(docking){
    const b=l.berth,s=r.ship,along=(s.x-b.x)*Math.cos(b.a)+(s.y-b.y)*Math.sin(b.a),u=P.groundMotion(s).surge;
    const demand=(P.clamp((n===3?0:-along*.04),-.3,.3)-u)*3;
    s.throttle=(n===3||Math.abs(along)<10)&&Math.abs(u)<.04?0:demand>.1?1:demand<-.1?-1:0;
    const steer=n===3?0:P.clamp(P.wrap(b.a-s.a)*2.5-s.r*35,-1,1);input={rudder:steer,thruster:steer};
   }
   const order=r.ship.throttle;r.ship.throttle=old;t.throttle(order-old);Object.assign(t.state.input,input);
  }
  t.advance(1/120);closedLoad=Math.max(closedLoad,r.polar.slush);
  for(const f of r.polar.fleet){
   if(f.unloaded)unloadedAt[f.id]??=r.time;
   if(f.returned)returnedAt[f.id]??=r.time;
  }
  if(trace&&tick%12000===0)console.log(JSON.stringify({time:r.time,phase,wp,xy:[r.ship.x,r.ship.y],hull:r.ship.hull,
   berg:r.polar.bergs.map(b=>[b.x,b.y]),fleet:r.polar.fleet.map(f=>[f.id,f.ship.x,f.ship.y,f.waiting,f.ship.hull])}));
 }
 return {t,closedLoad,unloadedAt,returnedAt};
}
module.exports={navigate};
