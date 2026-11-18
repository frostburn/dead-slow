/* Pale Reach surface charts. Metres, seconds and fictional institutions. */
(function(root){
    'use strict';
    const breaker={name:'PASSAGE SERVICE · KESTREL',length:34,beam:13,mass:1.35,propulsion:1.9,dragScale:1.15,draft:5.2,iceClass:1};
    const supply={name:'COUNCIL SUPPLY · LANTERN',length:42,beam:10,mass:1.8,propulsion:2,dragScale:1.05,draft:5.8,iceClass:0};
    const armed={...breaker,name:'COUNCIL ESCORT · KESTREL',mass:1.5};
    const patrol={length:29,beam:9,mass:.8,propulsion:1.3,dragScale:1.1,iceClass:0};
    const raider={length:24,beam:8,mass:.65,propulsion:1.4,dragScale:1.15,iceClass:0};
    const cutter={length:44,beam:22,mass:1.8,propulsion:3,dragScale:1.15,iceClass:1};
    const berth=(x,y,a=0)=>({x,y,a,l:64,w:27,angle:12,speed:.32});
    const base=(n,name,kind,start,spec,world,polar,brief,tip,pace)=>({id:`pale-reach-${n}`,name,kind,start,spec,world,polar,
        simulation:'polar',standalone:true,courseRevision:[1,3,5].includes(n)?3:2,rulesRevision:n===2?3:[3,5].includes(n)?2:1,berth:polar.berth,brief,tip,pace});
    const firstRoute=[[105,270],[190,270],[257,223],[323,222],[398,251],[472,255]];
    const lead=[[115,380],[210,380],[290,330],[385,265],[485,265],[585,320],[690,340],[795,310]];
    const north=[[240,280],[305,244],[371,186],[455,153],[520,146],[574,150]];
    const south=[[240,303],[320,326],[402,387],[500,403],[587,393]];
    const levels=[
        base(1,'The First Fracture','Icebreaking · open the harbor',[105,270,0],breaker,[700,460],{
            mission:'pocket',cell:12,thickness:.86,closing:240,route:firstRoute,thinWidth:68,thinIce:.28,
            water:[{x:105,y:270,rx:119,ry:81},{x:319,y:223,rx:76,ry:48},{x:572,y:273,rx:94,ry:108}],
            patches:[{poly:[[437,207],[529,201],[563,254],[559,302],[466,320],[435,283]],thickness:.28}],
            ridges:[{poly:[[271,299],[304,267],[352,279],[376,310],[354,369],[396,460],[250,460],[268,387]]},
                {poly:[[266,0],[354,0],[363,107],[343,156],[304,170],[277,130]]}],
            pocket:{x:483,y:280,rx:37,ry:29,required:.86},berth:{...berth(591,273),w:34},
            docks:[{x:635,y:232,w:20,h:84,name:'THAWMARK JETTY'}],
            landmarks:[{x:104,y:365,text:'WINTER ANCHORAGE'},{x:311,y:376,text:'PRESSURE RIDGE'}],
            fragments:2,fragmentFromX:435,
            dispatch:['THAWMARK / HEATING FUEL','Thawmark is down to three days of heating fuel. Cut a lead to the jetty, then make enough room for a supply ship to turn there.'],
            objectives:['Connect the anchorage to the jetty','Clear the turning pocket','Moor at Thawmark']
        },'Open the blue dogleg around the pressure ridge. Widen the turning pocket at its far end, then berth Kestrel at Thawmark.',
        'Meet the thin sheet bow first at 3–5 kn. If the centre cut leaves ice in the pocket, sweep its remaining shoulder from the open basin.',[300,430,600]),
        base(2,'Borrowed Water','Loaded supply ship · continuous spacing',[90,380,0],supply,[920,580],{
            mission:'follow',cell:12,thickness:.82,closing:58,route:lead,thinWidth:52,thinIce:.25,
            patches:[{x:400,y:218,w:85,h:98,thickness:.58}],
            water:[{x:92,y:380,rx:118,ry:76},{x:805,y:310,rx:90,ry:84}],
            ridges:[],berth:berth(827,336),docks:[{x:853,y:352,w:46,h:20,name:'GLASS QUAY'}],
            fleet:[{id:'leader',name:'RIME · COMPACT ICEBREAKER',start:[163,380,0],spec:{...breaker,name:'RIME',beam:18},
                leader:true,route:[...lead.slice(1),[823,271]],cruise:2.8}],
            landmarks:[{x:108,y:464,text:'DEPARTURE LEAD'},{x:442,y:203,text:'COMPRESSED SHEET'},{x:754,y:414,text:'COUNCIL FREIGHT TERMINAL'}],
            arrival:{x:805,y:310,rx:90,ry:84},
            dispatch:['GLASS QUAY / SUPPLY RUN','Rime is breaking the lead for Lantern. Give her room at the compressed bend. You can still reach Glass Quay if you fall behind.'],
            objectives:['Reach Glass Quay’s basin','Moor Lantern at Glass Quay']
        },'Lantern is heavily laden and cannot break a new route. Follow Rime through the winding lead. New water thickens into slush behind the icebreaker; crowding her bow-to-stern leaves no braking room when she meets compressed sheet.',
        'Aim for 25–65 m of water between hulls. Read the gap and closing rate, anticipate the thick patch, and steer the stern through each bend. Rime waits at the far end; there is no arrival deadline. If heavy slush leaves you struggling, retry when you choose.',[360,500,700]),
        base(3,'Deliveries Beyond the Map','Convoy · two branches, one anchorage',[135,296,0],breaker,[750,560],{
            mission:'convoy',cell:12,thickness:.88,closing:230,route:north,thinWidth:86,thinIce:.25,
            secondary:{route:south,width:73,thickness:.44,closing:430},
            water:[{x:115,y:296,rx:115,ry:145},{x:257,y:282,rx:116,ry:78},
                {x:407,y:176,rx:72,ry:60},{x:571,y:146,rx:96,ry:79},{x:585,y:396,rx:111,ry:91},{x:489,y:405,rx:71,ry:61}],
            openWaterRoutes:[{route:[[120,291],[270,280]],width:122}],
            ridges:[{poly:[[348,279],[409,244],[515,246],[582,228],[721,233],[747,282],[730,321],[571,320],[487,351],[412,331],[350,310]]}],
            anchorage:{x:142,y:296,rx:50,ry:39},berth:berth(142,296,Math.PI),
            docks:[{x:628,y:93,w:23,h:80,name:'TERN'},{x:650,y:382,w:23,h:79,name:'CINDER'}],
            fleet:[
                {id:'morrow',name:'MORROW',start:[205,239,-.25],spec:{...supply,name:'MORROW',length:36,mass:1.55},cruise:2.25,
                    route:north,home:[[202,236]],unload:14},
                {id:'sedge',name:'SEDGE',start:[204,341,.27],spec:{...supply,name:'SEDGE',length:37,mass:1.6},cruise:2.2,
                    route:south,home:[[207,335]],unload:16}
            ],
            bergs:[{id:'entrance-berg',x:411,y:115,vx:0,vy:.24,length:54,beam:30,keel:22,range:{y:158,ry:61}}],
            landmarks:[{x:116,y:455,text:'HOME ANCHORAGE'},{x:423,y:96,text:'ICEBERG BASIN'},{x:506,y:468,text:'WAITING BASIN'}],
            dispatch:['TERN & CINDER / RELIEF SUPPLIES','Tern needs heat and medicine. Cinder needs food and generators. Open both routes and bring Morrow and Sedge home.'],
            objectives:['Morrow: unload at Tern and return','Sedge: unload at Cinder and return','Bring Kestrel home']
        },'Two supply ships share the fork. Tern’s thin cut has a drifting iceberg; Cinder’s heavier cut has a waiting basin. Choose which ship to send first and keep the fork clear for the returns.',
        'Proceed can be queued before a channel is open and stays in effect through unloading. When both crews are home, stop Kestrel anywhere in the green anchorage.',[850,1150,1550]),
        base(4,'Buoys, Not Borders','Survey rescue · weapons restricted',[120,520,0],breaker,[960,720],{
            mission:'survey',cell:12,thickness:.82,closing:220,thinIce:.3,thinWidth:72,
            route:[[600,280],[500,245],[405,180],[290,205],[170,340],[120,500]],
            openWaterRoutes:[{route:[[120,500],[260,570],[420,600],[580,550],[640,435],[600,335],[600,280]],width:130}],
            water:[{x:120,y:510,rx:120,ry:100},{x:600,y:290,rx:110,ry:100}],
            ridges:[{x:320,y:380,w:175,h:65}],berth:berth(135,510,Math.PI),docks:[],
            survey:{id:'survey',name:'CALIPER',start:[600,280,Math.PI/2],spec:{length:31,beam:10,mass:1.25,propulsion:0,disabled:true,iceClass:0},safe:{x:135,y:510,rx:100,ry:78}},
            assets:[{id:'monitor',name:'CIVILIAN MONITORING STATION',x:653,y:186,w:48,h:40,hp:100,team:'civilian'}],
            patrols:[
                {id:'picket-a',name:'SHELF PICKET 1',start:[390,272,0],spec:patrol,route:[[390,272],[480,315]],cruise:1.2},
                {id:'picket-b',name:'SHELF PICKET 2',start:[505,366,Math.PI],spec:patrol,route:[[505,366],[405,308]],cruise:1.1}
            ],
            patrolWater:[{route:[[390,272],[480,315],[505,366],[405,308]],width:85},{route:[[390,272],[260,425],[120,510]],width:85}],
            exclusion:[[357,250],[420,292],[487,337],[531,384]],
            cutters:[{id:'awl',name:'AWL · COUNCIL ICEBREAKER',team:'friendly',start:[135,455,-1.2],spec:cutter,cruise:2.8,
                route:[[135,455],[170,340],[290,205],[405,180],[500,245],[565,335]],width:80,thickness:.28}],
            landmarks:[{x:145,y:637,text:'COUNCIL SAFE WATER'},{x:363,y:473,text:'LONG SOUTHERN ROUTE'},{x:332,y:140,text:'NARROW OPENING LEAD'}],
            dispatch:['FREE ANCHORAGE COUNCIL / 11:10','Caliper’s steering gear has failed beside the shelf observatory. Recover her scientific recorders and tow the vessel home. Shelf League pickets are placing exclusion buoys across the direct exit. They call this a survey precaution; the Council has not agreed. No weapons are authorized.'],
            objectives:['Recover Caliper’s scientific recorders','Tow Caliper into safe water','Moor Kestrel without damaging the station']
        },'Rival pickets obstruct the direct passage and demand course changes. Awl is cutting a narrow northern lead; follow her actual wake or take the long open southern route. Approach Caliper slowly to transfer her recorders, then connect Kestrel’s stern towline to her bow. Protect the civilian station.',
        'F connects or releases the line when the towing points are within 55 m and relative speed is low. J/K shorten/lengthen it. Recorder transfer takes eight steady seconds nearby. The tow has inertia and can swing into ice; its whole hull must return.',[800,1100,1500]),
        base(5,'Home Ice','Armed escort · cover the escapes',[294,422,.45],armed,[1000,760],{
            mission:'defense',cell:12,thickness:.8,closing:260,thinIce:.35,thinWidth:66,
            route:[[235,390],[425,390],[655,390],[820,390]],
            water:[{x:180,y:390,rx:190,ry:210},{x:820,y:385,rx:150,ry:280}],
            openWaterRoutes:[{route:[[560,225],[738,205]],width:68},{route:[[600,390],[738,390]],width:72},
                {route:[[770,570],[650,570],[531,538],[436,500],[323,461]],width:76}],
            ridges:[],berth:berth(280,390,Math.PI),docks:[],
            cutters:[
                {id:'north-cutter',name:'NORTH CUTTER',team:'hostile',start:[590,225,Math.PI],spec:cutter,cruise:2.8,depart:0,
                    route:[[590,225],[440,245],[270,300],[230,230]],width:80,thickness:.28},
                {id:'middle-cutter',name:'CENTRAL CUTTER',team:'hostile',start:[631,390,Math.PI],spec:cutter,cruise:2.8,depart:35,
                    route:[[631,390],[470,390],[350,390],[310,520]],width:82,thickness:.28},
                {id:'south-cutter',name:'SOUTH CUTTER',team:'hostile',start:[650,570,Math.PI],spec:cutter,cruise:2.8,depart:55,
                    route:[[650,570],[460,545],[270,475],[250,540]],width:88,thickness:.28}
            ],
            assets:[{id:'base',name:'THAWMARK SUPPLY BASE',x:215,y:362,w:42,h:56,hp:140,team:'friendly',essential:true}],
            fleet:[
                {id:'hearth',name:'HEARTH',start:[170,310,Math.PI],spec:{...supply,name:'HEARTH',length:36,mass:1.6},cruise:1.9,unload:128,unloading:true,route:[[170,310]],home:[[93,295]]},
                {id:'pantry',name:'PANTRY',start:[170,465,Math.PI],spec:{...supply,name:'PANTRY',length:37,mass:1.7},cruise:1.8,unload:221,unloading:true,route:[[170,465]],home:[[92,530]]}
            ],
            gun:{range:290,arc:1.05,hold:2.5,reload:9,damage:36,ammo:28,shellSpeed:55,maxSpeed:1.25,maxTurn:.02},
            raiders:[
                {id:'north-boat',name:'NORTH RAIDER',start:[639,222,Math.PI],spec:raider,cruise:2.6,spawn:0},
                {id:'middle-boat',name:'CENTRAL RAIDER',start:[691,390,Math.PI],spec:raider,cruise:2.5,spawn:22},
                {id:'south-boat',name:'SOUTH RAIDER',start:[512,531,-2.83],spec:raider,cruise:2.6,spawn:0}
            ],
            landmarks:[{x:108,y:615,text:'TRANSPORT SAFE WATER'},{x:800,y:89,text:'SHELF LEAGUE APPROACHES'}],
            dispatch:['THAWMARK / HARBOR DEFENSE','Hearth is almost unloaded. Pantry needs a little longer. Cover the transports until both can break for the anchorage.'],
            objectives:['Land Hearth’s and Pantry’s essential cargo','Get both transports into safe water']
        },'A raider is already through the southern lead. Other boats are following their cutters. Get Hearth and Pantry out as they finish unloading.',
        'Queue Proceed to send a transport as soon as its cargo is ashore. Steady Kestrel below 2.4 kn to fire. The cutters’ wakes stay open after they stop.',[290,365,500]),
        base(6,'The Other Shore','Military strike · disable and withdraw',[125,590,0],armed,[1080,780],{
            mission:'strike',cell:12,thickness:.82,closing:170,thinIce:.35,thinWidth:80,
            route:[[125,590],[340,540],[520,445],[685,370],[825,350]],
            openWaterRoutes:[{route:[[125,590],[340,540],[520,445],[685,370],[825,350]],width:120},{route:[[825,350],[940,480],[965,640]],width:120}],
            water:[{x:125,y:590,rx:125,ry:112},{x:802,y:280,rx:125,ry:105},{x:965,y:650,rx:100,ry:90}],
            ridges:[{x:434,y:282,w:180,h:80}],berth:berth(125,590,Math.PI),docks:[],
            cutters:[{id:'rime',name:'RIME · COMPACT ICEBREAKER',team:'friendly',start:[260,550,-1.09],spec:cutter,cruise:3.1,
                route:[[260,550],[325,425],[395,245],[560,185],[710,200],[855,265]],width:80,thickness:.28}],
            assets:[
                {id:'battery',name:'COASTAL BATTERY',x:716,y:330,w:36,h:38,hp:108,team:'hostile',gun:{range:340,arc:.75,hold:4,reload:18,damage:18,shellSpeed:48},a:Math.PI},
                {id:'fuel',name:'FUEL-TRANSFER MACHINERY',x:884,y:317,w:33,h:57,hp:90,team:'hostile'}
            ],
            gun:{range:290,arc:1.05,hold:2.5,reload:9,damage:36,ammo:24,shellSpeed:55,maxSpeed:1.25,maxTurn:.02},
            raiders:[
                {id:'response-a',name:'RESPONSE BOAT 1',start:[965,640,-Math.PI/2],spec:raider,cruise:2.3,alarmDelay:60},
                {id:'response-b',name:'RESPONSE BOAT 2',start:[1000,685,-Math.PI/2],spec:raider,cruise:2.2,alarmDelay:115}
            ],
            fragments:4,fragmentFromX:510,
            bergs:[{id:'inlet-berg',x:579,y:438,vx:0,vy:.11,length:47,beam:25,keel:18,range:{x:579,y:454,rx:0,ry:58}}],
            landmarks:[{x:134,y:736,text:'WITHDRAWAL / SAFE WATER'},{x:510,y:141,text:'RIME’S FLANK CUT'},{x:762,y:435,text:'EXPOSED MAIN INLET'}],
            dispatch:['NARROWS COMPACT / COUNCIL LIAISON / 17:05','Disable the League battery and the military fuel-transfer plant at Ravel Shelf, then withdraw. The Council’s liaison has removed civilian berths from the target list. The flank chart is already out of date; send no crew through on momentum alone. Reinforcements are expected once the battery reports contact.'],
            objectives:['Disable the coastal battery','Disable the military fuel-transfer machinery','Withdraw and secure Kestrel']
        },'The main inlet is open and covered by the coastal battery. Rime is cutting the thinner northern flank; the dashed line is her intended route, not open water. Follow the icebreaker or prepare your own approach. Disable both military installations and withdraw to the green home berth. Response boats and drifting ice can obstruct your return.',
        'The forward gun needs a clear arc and 2.5 seconds below 2.4 kn with little turn. T selects, B fires. The battery announces its firing solution before launching a visible shell. Plan a retreat while opening your approach.',[650,900,1250])
    ];
    const underwater=typeof module!=='undefined'&&module.exports?require('./submarine-levels.js'):root.PaleReachSubmarineLevels;
    levels.push(...underwater.levels);
    const finale=typeof module!=='undefined'&&module.exports?require('./polar-finale-levels.js'):root.PaleReachFinaleLevels;
    levels.push(...finale.levels);
    for(const level of levels)delete level.standalone;
    const api={levels,breaker,supply};
    if(typeof module!=='undefined'&&module.exports)module.exports=api;
    root.PaleReachLevels=api;
})(globalThis);
