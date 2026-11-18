/* The last Pale Reach watches: moving extraction, neutral rescue and relief. */
(function(root){
    'use strict';
    const petrel={name:'COUNCIL SUBMARINE · PETREL',length:38,beam:8,mass:1.35,propulsion:1.25,dragScale:1.1};
    const kestrel={name:'PASSAGE SERVICE · KESTREL',length:34,beam:13,mass:1.35,propulsion:1.9,dragScale:1.15,draft:5.2,iceClass:1};
    const tender={length:32,beam:9,mass:1.1,propulsion:1.4,dragScale:1.1};
    const cargo={length:36,beam:10,mass:1.5,propulsion:2,dragScale:1.05,iceClass:0};
    const berth=(x,y,a=Math.PI)=>({x,y,a,l:65,w:28,angle:15,speed:.35});
    const chart=(n,name,kind,start,spec,world,polar,brief,tip,pace)=>({id:`pale-reach-${n}`,name,kind,start,spec,world,polar,simulation:'polar',courseRevision:n===11?3:n===12?2:1,rulesRevision:n>=11?3:2,berth:polar.berth||berth(...start),brief,tip,pace});
    const recovery=chart(10,'Bring Them Back','Moving extraction · two possible rendezvous',[135,580,0],petrel,[1180,800],{
        underwater:true,mission:'recovery',depth:48,floor:140,ceiling:5,home:{x:135,y:580,radius:65},
        shelves:[{name:'WEST SHOAL · 36 m',floor:36,poly:[[345,230],[465,210],[525,330],[465,435],[330,415]]},
            {name:'SOUTH RISE · 66 m',floor:66,poly:[[520,610],[745,600],[790,710],[685,770],[485,740]]}],
        platforms:[],bergs:[
            {id:'shelter-n',name:'FRACTURING SHELTER / NORTH',x:625,y:411,vx:.035,vy:-.065,length:116,beam:34,keel:38},
            {id:'shelter-s',name:'FRACTURING SHELTER / SOUTH',x:625,y:445,vx:-.025,vy:.065,length:116,beam:34,keel:38},
            {id:'margin',name:'DRIFTING ICE MARGIN · 62 m',x:865,y:290,vx:-.035,vy:.04,length:155,beam:105,keel:62}
        ],
        extraction:{exposeAt:260,walkSpeed:1.8,hold:8,sites:[
            {id:'near',name:'Shelter gap',x:625,y:428,depth:48,radius:28},
            {id:'far',name:'Drifting margin',anchor:'margin',dx:55,dy:45,depth:88,radius:28}
        ]},
        actors:[
            {id:'search-a',name:'SHORE WATCH · EAST PATROL',kind:'patrol',visible:true,start:[1040,210,Math.PI/2],depth:3,spec:tender,cruise:1.25,loop:true,
                route:[[1040,210],[1040,570],[970,570],[970,190]],exposureRoute:[[870,415],[665,425],[700,200],[1020,200]],returnRoute:[[760,510],[400,505],[420,650],[1000,650]]},
            {id:'search-b',name:'SHORE WATCH · SOUTH PATROL',kind:'patrol',visible:true,start:[1030,690,Math.PI],depth:3,spec:tender,cruise:1.1,loop:true,
                route:[[1030,690],[810,690],[900,745],[1060,745]],returnRoute:[[770,570],[355,560],[355,180],[1030,180]]}
        ],
        objectives:['Recover the waiting team','Clear the intensified patrol search','Bring the team into safe water'],
        dispatch:['COUNCIL EXTRACTION / 02:35','The team is already outside. Its planned shelter has split into two drifting plates. The shelter gap is closer; a patrol will reach that approach shortly. The farther pickup follows the ice margin and needs a deep approach. Choose a rendezvous: the team will travel there on the ice, not appear there instantly. After pickup, expect the search to spread west.'],
        landmarks:[{x:140,y:680,text:'HOME WATER / TEAM MUST RETURN'},{x:720,y:125,text:'DEEP APPROACH ALONG ICE MARGIN'}]
    },'Recover the team already waiting on the ice. Choose the nearer shelter gap or the farther drifting margin; a rendezvous order gives the team time to relocate. Match the selected pickup’s depth and drift, then escape without a confirmed alarm. Patrols redeploy after the team boards.',
    'The shelter plates drift apart continuously. The near pickup remains possible after exposure, but loses its cover. The far pickup moves with the ice margin at 88 m. Choose the pickup with its bridge button, then F orders recovery. Match relative speed for eight seconds. The western patrol gap changes after pickup; plan a different return.',[1500,2100,2800]);
    const protectedRoute=[[205,590],[283,609],[369,638],[448,667],[525,663],[600,623],[665,574]];
    const rescue=chart(11,'No Flag on the Lifeboats','Neutral rescue · every required hull',[155,570,-Math.PI/2],kestrel,[860,755],{
        mission:'rescue',cell:12,thickness:.85,closing:170,thinIce:.24,thinWidth:76,
        route:[[205,490],[303,466],[413,430],[486,422],[565,437],[664,444]],
        secondary:{route:protectedRoute,width:105,thickness:.3,closing:490},
        water:[
            {poly:[[65,305],[133,304],[200,342],[238,390],[254,435],[278,482],[285,565],[256,635],[219,654],[190,735],[116,744],[43,727],[18,641],[34,568],[9,493],[53,441],[38,367]]},
            {poly:[[591,293],[629,250],[681,230],[743,246],[782,291],[761,347],[776,407],[751,469],[783,518],[776,580],[743,618],[678,637],[621,646],[581,683],[538,687],[535,636],[573,601],[624,554],[584,527],[610,473],[591,418],[611,362]]},
            {poly:[[422,87],[470,79],[493,127],[477,169],[499,223],[477,266],[488,317],[476,359],[504,401],[486,450],[496,496],[477,538],[487,589],[459,617],[405,609],[415,563],[407,512],[421,449],[410,397],[421,345],[409,301],[425,254],[414,203],[424,162],[410,129]]}
        ],ridges:[{poly:[[327,344],[345,318],[384,315],[411,339],[417,371],[391,389],[342,375]]}],
        berth:berth(150,570),docks:[],
        survey:{id:'oriel',name:'ORIEL',start:[210,520,-Math.PI/2],spec:{length:32,beam:10,mass:1.1,propulsion:0,disabled:true,iceClass:0},safe:{x:180,y:400,rx:82,ry:60},pocket:{x:220,y:520,rx:65,ry:60}},
        rescue:{protectedRoute,contactRange:72,hold:4},
        fleet:[
            {id:'moth',name:'MOTH',start:[667,291,Math.PI/2],spec:{...cargo,name:'MOTH',length:32,mass:1.2},cruise:2.1,evacuating:true,route:[[667,291]],home:[[100,530]]},
            {id:'reed',name:'REED',start:[710,436,Math.PI/2],spec:{...cargo,name:'REED'},cruise:2,evacuating:true,route:[[710,436]],home:[[125,595]]},
            {id:'bracken',name:'BRACKEN',start:[684,565,Math.PI],spec:{...cargo,name:'BRACKEN',length:38,mass:1.7},cruise:1.9,evacuating:true,route:[[684,565]],home:[[110,665]]}
        ],
        crossfire:[
            {id:'compact-watch',name:'COMPACT GUNBOAT',team:'compact',start:[450,118,Math.PI/2],spec:{...tender,length:40},opponent:'league-watch'},
            {id:'league-watch',name:'LEAGUE GUNBOAT',team:'league',start:[450,565,-Math.PI/2],spec:{...tender,length:40},opponent:'compact-watch'}
        ],
        landmarks:[{x:119,y:725,text:'NEUTRAL ANCHORAGE'},{x:185,y:335,text:'ORIEL’S REFUGE'},{x:365,y:401,text:'SHORT CUT'},{x:453,y:722,text:'SHELTERED LEAD'}],
        dispatch:['NEUTRAL RESCUE / FAMILIES AND CREWS','Moth carries families. Reed and Bracken carry survivors from opposite sides. Get all three crews to neutral water and clear disabled Oriel from the turning pocket.'],
        objectives:['Tow Oriel into refuge','Bring Moth home','Bring Reed home','Bring Bracken home','Every rescue secure']
    },'Three ships are stranded in one bay. The short cut crosses the gunboats’ fire. The southern lead takes longer to open, but lets all three leave below the fight.',
    'Tow Oriel clear before releasing the rescues. Establish contact by coming within 72 m at low speed for four seconds. Leave room for the captains to file through the same cut.',[1130,1490,1850]);
    const objectives=['Insert the channel engineers','Disable the channel-denial installation','Recover the engineers','Secure Petrel and take Kestrel','Open a connected convoy passage','Final relief ship clears the passage'];
    const surface={mission:'transit',cell:12,thickness:.82,closing:340,thinIce:.29,thinWidth:100,
        route:[[165,590],[325,565],[455,535],[625,555],[780,590],[900,590]],
        water:[{x:145,y:590,rx:140,ry:112},{x:885,y:590,rx:104,ry:108}],ridges:[{x:375,y:305,w:230,h:92}],docks:[],berth:berth(170,600),
        bergs:[{id:'denial-keel',name:'DRIFTING DENIAL KEEL · 58 m',x:520,y:438,vx:0,vy:.055,length:100,beam:58,keel:58,range:{y:438,ry:50}}],
        fleet:[
            {id:'witness',name:'WITNESS',start:[90,545,0],spec:{...cargo,name:'WITNESS',length:32,mass:1.3},cruise:1.9,evacuating:true,route:[[90,545]],home:[[90,545],[875,540]]},
            {id:'mercy',name:'MERCY',start:[80,595,0],spec:{...cargo,name:'MERCY'},cruise:1.8,evacuating:true,route:[[80,595]],home:[[80,595],[880,605]]},
            {id:'bread',name:'BREADTH',start:[100,650,0],spec:{...cargo,name:'BREADTH',length:42,mass:1.8},cruise:1.7,evacuating:true,route:[[100,650]],home:[[100,650],[900,660]]}
        ],
        cutters:[{id:'rime-final',name:'RIME',team:'friendly',start:[240,565,0],spec:{...kestrel,name:'RIME',length:44,beam:22,mass:1.8,propulsion:3},cruise:2.8,
            route:[[240,565],[455,535],[585,555],[620,485]],width:100,thickness:.29}],
        assets:[{id:'denial',name:'CHANNEL-DENIAL INSTALLATION',x:705,y:245,w:42,h:65,hp:120,team:'hostile',a:Math.PI/2,gun:{range:580,arc:1.2,hold:6,reload:25,damage:24,shellSpeed:48}}],
        fragments:3,fragmentFromX:625,objectives,
        dispatch:['RELIEF CONVOY / FINISH THE CUT','Rime’s lead has been closing while the engineers worked. Open the last stretch and help the three loaded ships through.'],
        landmarks:[{x:145,y:720,text:'CONVOY / TAKEOVER ANCHORAGE'},{x:885,y:730,text:'FINAL RELIEF EXIT'}]
    };
    const finale=chart(12,'The Passage Must Stay Open','Two legs · one weather clock',[321,526,0],petrel,[1000,760],{
        underwater:true,mission:'covert',finale:true,deadline:1920,depth:48,floor:140,ceiling:5,home:{x:321,y:526,radius:60},
        shelves:[{name:'INSTALLATION SHELF · 68 m',floor:68,poly:[[595,210],[875,215],[880,380],[720,435],[585,375]]}],
        platforms:[{id:'denial',name:'MILITARY DENIAL CONTROL',x:705,y:245,w:42,h:65}],bergs:surface.bergs,
        access:{x:640,y:391,radius:28,depth:48,hold:8,standOff:80,work:34},actors:[],
        surface:{start:[170,600,0],spec:kestrel,polar:surface},objectives,
        dispatch:['RELIEF CONVOY / ONE WEATHER WINDOW','Put the engineers aboard the denial station and bring them back. Kestrel is ready to take over once Petrel is secure. Rime starts cutting the lead above you now.'],
        landmarks:[]
    },'Petrel starts close to the denial station. Go around the drifting keel or dive under it before coming up to the hatch. Bring the engineers back to the anchorage, then take Kestrel through Rime’s ageing wake.',
    'Both legs share a 32-minute clock. When you take Kestrel, connect the last cut and queue the relief ships. Leave space at the bend for the loaded hulls.',[1260,1580,1880]);
    const api={levels:[recovery,rescue,finale]};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PaleReachFinaleLevels=api;
})(globalThis);
