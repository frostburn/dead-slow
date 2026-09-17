/* Pale Reach surface charts. Metres, seconds and fictional institutions. */
(function(root){
    'use strict';
    const breaker={name:'PASSAGE SERVICE · KESTREL',length:34,beam:13,mass:1.35,propulsion:1.9,dragScale:1.15,draft:5.2,iceClass:1};
    const supply={name:'COUNCIL SUPPLY · LANTERN',length:42,beam:10,mass:1.8,propulsion:2,dragScale:1.05,draft:5.8,iceClass:0};
    const berth=(x,y,a=0)=>({x,y,a,l:64,w:27,angle:12,speed:.32});
    const base=(n,name,kind,start,spec,world,polar,brief,tip,pace)=>({id:`pale-reach-${n}`,name,kind,start,spec,world,polar,
        simulation:'polar',standalone:true,courseRevision:2,rulesRevision:1,berth:polar.berth,brief,tip,pace});
    const firstRoute=[[105,390],[210,365],[280,275],[350,220],[445,235],[530,275],[640,280]];
    const lead=[[115,380],[210,380],[290,330],[385,265],[485,265],[585,320],[690,340],[795,310]];
    const north=[[160,355],[275,290],[355,230],[450,185],[570,165],[690,170]];
    const south=[[165,410],[260,450],[370,485],[485,465],[580,430],[700,425]];
    const levels=[
        base(1,'The First Fracture','Icebreaking · a usable harbor',[105,390,0],breaker,[840,560],{
            mission:'pocket',cell:12,thickness:.86,closing:240,route:firstRoute,thinWidth:54,thinIce:.28,
            water:[{x:125,y:390,rx:140,ry:93},{x:577,y:280,rx:78,ry:90},{x:746,y:280,rx:65,ry:94}],
            patches:[{x:600,y:198,w:110,h:164,thickness:.28}],
            ridges:[{x:324,y:292,w:60,h:268},{x:315,y:0,w:67,h:152}],
            pocket:{x:666,y:280,rx:49,ry:42,required:.86},berth:berth(746,280),
            docks:[{x:778,y:238,w:22,h:87,name:'THAWMARK SUPPLY JETTY'}],
            landmarks:[{x:112,y:462,text:'WINTER ANCHORAGE'},{x:355,y:385,text:'PRESSURE RIDGE'},{x:359,y:181,text:'THIN DOGLEG'}],
            fragments:4,fragmentFromX:460,
            dispatch:['FREE ANCHORAGE COUNCIL / 06:20','Thawmark has three days of heating fuel. The Council will accept the delivery without accepting either authority’s new passage chart. Open room to turn, not just room to arrive.'],
            objectives:['Open the thin dogleg','Widen the turning pocket','Moor at Thawmark jetty']
        },'The winter anchorage has opened, but Thawmark’s supply jetty is still behind a pressure ridge. Take Kestrel through the thinner dogleg. Broken sheet leaves slush and drifting floes; slow as you enter the basin. Widen the marked turning pocket before docking.',
        'Build 3–5 kn in open water and meet thin sheet bow first. The cream pressure ridge cannot be broken. Sweep the amber turning pocket until 86% is clear, then moor at the green jetty in neutral.',[600,800,1100]),
        base(2,'Borrowed Water','Loaded supply ship · continuous spacing',[90,380,0],supply,[920,580],{
            mission:'follow',cell:12,thickness:.82,closing:58,route:lead,thinWidth:52,thinIce:.25,
            patches:[{x:400,y:218,w:85,h:98,thickness:.58}],
            water:[{x:92,y:380,rx:118,ry:76},{x:805,y:310,rx:90,ry:84}],
            ridges:[],berth:berth(827,336),docks:[{x:853,y:352,w:46,h:20,name:'GLASS QUAY'}],
            fleet:[{id:'leader',name:'RIME · COMPACT ICEBREAKER',start:[163,380,0],spec:{...breaker,name:'RIME',beam:18},
                leader:true,route:[...lead.slice(1),[823,271]],cruise:2.8}],
            landmarks:[{x:108,y:464,text:'DEPARTURE LEAD'},{x:442,y:203,text:'COMPRESSED SHEET'},{x:754,y:414,text:'COUNCIL FREIGHT TERMINAL'}],
            dispatch:['NARROWS COMPACT / PASSAGE SERVICE','Rime will pilot the lead at working speed. The Shelf League’s survey marks disagree with ours; follow the water the breaker actually opens. Lantern’s cargo belongs to the Council. Give the breaker room to stop.'],
            objectives:['Follow Rime through the lead','Deliver Lantern’s cargo at Glass Quay']
        },'Lantern is heavily laden and cannot break a new route. Follow Rime through the winding lead. New water thickens into slush behind the icebreaker; crowding her bow-to-stern leaves no braking room when she meets compressed sheet.',
        'Aim for 25–65 m of water between hulls. Read the gap and closing rate, anticipate the thick patch, and steer the stern through each bend. Stay with Rime through the bends before she finishes the lead. Slush slows you progressively; it never turns into a solid wall under your ship.',[360,500,700]),
        base(3,'Deliveries Beyond the Map','Route preparation · two deliveries and returns',[155,375,0],breaker,[900,660],{
            mission:'convoy',cell:12,thickness:.88,closing:112,route:north,thinWidth:64,thinIce:.27,
            secondary:{route:south,width:70,thickness:.48,closing:240},
            water:[{x:120,y:380,rx:157,ry:133},{x:690,y:178,rx:102,ry:86},{x:700,y:425,rx:107,ry:87},{x:445,y:475,rx:73,ry:55}],
            ridges:[{x:360,y:282,w:310,h:69}],berth:berth(107,385,Math.PI),
            docks:[{x:750,y:117,w:27,h:80,name:'TERN ASSEMBLY'},{x:757,y:392,w:25,h:79,name:'CINDER CO-OPERATIVE'}],
            fleet:[
                {id:'morrow',name:'MORROW · HEAT & MEDICINES',start:[100,325,0],spec:{...supply,name:'MORROW',length:36,mass:1.55},cruise:2.1,
                    route:[[190,328],...north.slice(1)],home:[[684,225],[565,204],[447,222],[351,253],[259,310],[100,325]],unload:16},
                {id:'sedge',name:'SEDGE · FOOD & GENERATORS',start:[100,440,0],spec:{...supply,name:'SEDGE',length:37,mass:1.6},cruise:2,
                    route:[[194,430],...south.slice(1)],home:[[677,478],[579,468],[476,492],[365,514],[246,476],[100,440]],unload:19}
            ],
            bergs:[{id:'entrance-berg',x:292,y:197,vx:0,vy:.23,length:63,beam:37,keel:22,range:{x:292,y:245,rx:0,ry:118}}],
            landmarks:[{x:113,y:535,text:'SAFE WATER / COUNCIL ANCHORAGE'},{x:425,y:410,text:'SHELTERED WAITING BASIN'},{x:458,y:312,text:'OLD PRESSURE RIDGE'}],
            dispatch:['FREE ANCHORAGE COUNCIL / 08:45','Tern’s assembly and Cinder’s co-operative have each authorized a supply call. Neither accepts the other powers’ berth permits. Deliver to both, then bring both crews back to safe water. They decide when their cargo is ashore; you decide whether the route home will hold.'],
            objectives:['Morrow: unload at Tern and return','Sedge: unload at Cinder and return','Bring Kestrel home']
        },'Prepare both branches for Morrow and Sedge. The northern sheet breaks easily but closes quickly, and an iceberg crosses its entrance. The longer southern cut has heavier ice and a sheltered waiting basin. Give each supply ship Hold or Proceed; their captains steer the marked routes.',
        'Clear both sides of the dashed route for the outward and return legs. Hold starts a braking maneuver, not an instant stop. After unloading each captain waits for a fresh Proceed order. Both ships must return to safe water before Kestrel can finish.',[1200,1800,2400])
    ];
    const api={levels,breaker,supply};
    if(typeof module!=='undefined'&&module.exports)module.exports=api;
    root.PaleReachLevels=api;
})(globalThis);
