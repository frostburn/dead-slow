/* Fictional underwater charts. Depths and acoustic rules are deliberately simplified. */
(function(root){
    'use strict';
    const spec={name:'COUNCIL SUBMERSIBLE · PETREL',length:38,beam:8,mass:1.35,propulsion:1.25,dragScale:1.1,draft:4,iceClass:0};
    const sub={...spec,name:'UNIDENTIFIED SUBMARINE',length:34,mass:1.2,propulsion:1.15};
    const tender={length:32,beam:9,mass:1.1,propulsion:1.1,dragScale:1.05};
    const chart=(n,name,kind,start,world,config,brief,tip,pace)=>({id:`pale-reach-${n}`,name,kind,start,spec,world,simulation:'polar',standalone:true,
        courseRevision:n===8?2:1,rulesRevision:2,berth:{x:start[0],y:start[1],a:Math.PI,l:70,w:35,speed:.35,angle:15},
        polar:{underwater:true,depth:48,floor:130,ceiling:5,home:{x:start[0],y:start[1],radius:65},shelves:[],bergs:[],platforms:[],actors:[],...config},brief,tip,pace});
    const levels=[
        chart(7,'What the Ice Heard','Submarine watch · identify and intercept',[135,535,0],[1120,780],{
            mission:'intercept',depth:18,
            shelves:[{name:'NORTH SHELF · 64 m',floor:64,poly:[[320,80],[690,70],[790,175],[705,250],[420,235],[300,155]]},
                {name:'SEABED RISE · 70 m',floor:70,poly:[[465,510],[650,500],[735,575],[670,665],[475,650],[410,575]]}],
            bergs:[{id:'keel',name:'DRIFTING KEEL · 60 m',x:555,y:356,vx:0,vy:.07,length:135,beam:104,keel:60,range:{y:360,ry:45}}],
            platforms:[{id:'installation',name:'COUNCIL COMMUNICATIONS',x:975,y:420,w:30,h:90}],
            installation:{x:965,y:475,radius:62,hold:18},
            actors:[
                {id:'maintenance',kind:'service',name:'SERVICE TENDER · MICA',start:[360,595,0],depth:3,spec:tender,route:[[360,595],[825,640]],cruise:.9,loop:true},
                {id:'echo',kind:'decoy',start:[445,375,0],depth:48,vx:.1,vy:.025,life:1600},
                {id:'intruder',kind:'submarine',hostile:true,start:[860,230,Math.PI/2],depth:48,spec:sub,
                    route:[[860,230],[825,340],[860,475],[965,475]],cruise:.65}
            ],
            objectives:['Identify the intruding submarine','Intercept before the installation is reached','Secure Petrel in home water'],
            dispatch:['FREE ANCHORAGE COUNCIL / UNDERWATER WATCH / 21:10','Mica is repairing the passage cable. A recorder buoy has broken loose, and somebody else is moving toward the communications caisson. Neither power has filed a submarine transit. Listen before naming a target. The Council authorizes an interception only after identification.'],
            landmarks:[{x:135,y:625,text:'PETREL / SAFE WATER'},{x:830,y:150,text:'DISPUTED SHELF'}]
        },'Three returns, three different causes. Listen quietly for motion and machinery, or send an active pulse for a clearer echo. A pulse also gives the intruder your position. Identify the submarine, stop it before it reaches the communications installation, then return home.',
        'Z / X select shallower / deeper bands; P sends a pulse; T selects a track; I records its identification; B launches a torpedo after a stable solution. The 60 m iceberg keel blocks shallow and working depth. Deep water passes beneath it, but the nearby 70 m seabed rise does not.',[750,1050,1450]),
        chart(8,'Under the Listening Post','Covert team operation · insert and recover',[150,510,0],[940,670],{
            mission:'covert',depth:48,
            shelves:[{name:'WEST SHOAL · 35 m',floor:35,poly:[[249,195],[367,158],[427,237],[418,390],[321,438],[230,347]]},
                {name:'RELAY SHELF · 68 m',floor:68,poly:[[554,180],[868,187],[899,421],[753,460],[555,395]]}],
            bergs:[{id:'post-keel',name:'ICE MARGIN · 32 m',x:493,y:260,vx:.045,vy:0,length:98,beam:63,keel:32,range:{x:493,rx:44}}],
            platforms:[{id:'relay',name:'SHELF RELAY',x:661,y:240,w:38,h:78}],
            access:{x:620,y:318,radius:29,depth:48,hold:8,standOff:96,work:45},
            actors:[
                {id:'watch-a',kind:'patrol',name:'PATROL A',visible:true,start:[734,140,Math.PI],depth:3,spec:tender,
                    route:[[734,140],[465,140],[483,460],[793,486],[850,160]],cruise:1.25,loop:true},
                {id:'watch-b',kind:'patrol',name:'PATROL B',visible:true,start:[852,498,Math.PI],depth:3,spec:tender,
                    route:[[852,498],[434,498],[407,110],[834,110]],cruise:1.1,loop:true}
            ],
            objectives:['Insert the team at the submerged access','Clear the exposed area while the team works','Recover the team','Escape without a confirmed alarm'],
            dispatch:['SHELF RELAY / QUIET APPROACH','Put the team through the relay’s hatch and wait outside the listening area. Get everyone home without raising an alarm.'],
            landmarks:[{x:455,y:564,text:'SOUTHERN APPROACH'}]
        },'Take the team to the 48 m hatch. Use the deep water south of the shoal or thread between the shoal and the drifting keel. Leave the marked circle while the team works, then pick them up.',
        'Coast early. Strong thrust, active sonar and bow thrusters can alert the patrols. At the hatch, hold quiet and nearly still for eight seconds.',[1120,1420,1750]),
        chart(9,'Three Echoes Too Many','Passage defense · hunt a minelayer',[150,420,0],[1200,850],{
            mission:'hunt',depth:48,
            shelves:[{name:'SPLIT SHELF · 36 m',floor:36,poly:[[410,210],[570,190],[650,280],[610,400],[465,430],[390,340]]},
                {name:'EAST RISE · 65 m',floor:65,poly:[[795,185],[920,165],[970,265],[885,330],[770,275]]},
                {name:'SOUTH SHELF · 66 m',floor:66,poly:[[460,620],[650,600],[720,710],[655,795],[440,785],[390,700]]}],
            bergs:[{id:'passage-keel',name:'KEEL · 58 m',x:620,y:505,vx:0,vy:.065,length:94,beam:84,keel:58,range:{y:515,ry:38}}],
            passage:{x:995,y:430,radius:54,lay:55},withdrawal:{x:1100,y:720,radius:48},
            actors:[
                {id:'echo-a',kind:'decoy',start:[375,500,0],depth:48,vx:.065,vy:-.035,life:210},
                {id:'echo-b',kind:'decoy',start:[760,380,0],depth:48,vx:-.04,vy:.07,life:280},
                {id:'minelayer',kind:'submarine',hostile:true,armed:true,torpedoDamage:40,start:[760,545,-.5],depth:48,spec:sub,cruise:1.05,quiet:true,decoys:true,
                    route:[[760,545],[895,570],[1040,535],[1050,430],[995,430]]}
            ],
            objectives:['Identify the minelaying submarine','Keep the passage clear of armed mines','Hold safe water after the threat withdraws'],
            dispatch:['FREE ANCHORAGE COUNCIL / PASSAGE GUARD / 04:15','A submarine is preparing to deny the narrow passage to relief traffic. Its echoes disagree. Protect the marked transit water: stop the minelaying, or force the boat out of the assignment. Do not pursue it beyond the chart. Your last fix is a memory, not a promise that the boat is still there.'],
            landmarks:[{x:150,y:510,text:'PASSAGE GUARD / SAFE WATER'},{x:1005,y:350,text:'RELIEF TRANSIT PASSAGE'},{x:1040,y:790,text:'HOSTILE WITHDRAWAL LIMIT'}]
        },'Find the minelayer among drifting decoys. It goes quiet and moves between seabed shelves; lost tracks continue as expanding uncertainty regions. An active pulse improves your fix but gives the enemy a reference for its next attack. Prevent the mine deployment, then hold safe water once the threat is disabled or has withdrawn.',
        'The shelves leave several routes around the basin. A torpedo hit forces the minelayer to abandon its approach and withdraw; its escape is a successful defense if the passage remains clear. Do not chase it beyond the assignment. Reacquire old tracks before trusting a firing solution.',[750,1100,1500])
    ];
    const api={levels,spec};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PaleReachSubmarineLevels=api;
})(globalThis);
