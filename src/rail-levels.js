(function(root) {
    'use strict';
    const wagon=(id,edge,s,extra={})=>({id,edge,s,length:16,mass:42000,...extra});
    const loco=(edge,s)=>wagon('engine',edge,s,{length:20,mass:80000,powered:true,name:'No. 17'});
    const level=(id,name,brief,tip,world,rail,pace)=>({id,name,brief,tip,world,rail,pace,
        kind:'Freight railway',start:[100,100,0],berth:{x:100,y:100,a:0,l:50,w:20,angle:10,speed:.2},
        spec:{name:'No. 17',length:20,beam:4,mass:80000},standalone:true});
    const levels=[
        level('long-grade-1','The Last Wagon Counts',
            'Stop at the receiving board using the locomotive brake. Collect the two waiting wagons, then reverse clear of the junction and put the complete train in Quarry Siding.',
            'Couple below 2 km/h. Release the waiting wagons’ handbrakes after coupling. The junction lamp stays red until the last wagon clears.',
            [1100,650],{
                thermal:false,scenery:'quarry',
                nodes:{q:[90,465,18],j:[460,420,17],r:[990,470,17],s:[770,130,20]},
                tracks:[
                    {id:'approach',a:'q',b:'j',points:[[90,465,18],[240,485,18],[370,445,17],[460,420,17]],limit:10},
                    {id:'receiving',a:'j',b:'r',points:[[460,420,17],[650,380,17],[820,400,17],[990,470,17]],limit:7},
                    {id:'siding',a:'j',b:'s',points:[[460,420,17],[530,300,18],[650,200,19],[770,130,20]],limit:6}
                ],
                switches:[{node:'j',label:'Quarry Junction',stem:'approach',branches:['receiving','siding'],names:['Receiving yard','Quarry Siding']}],
                groups:[{cars:[loco('approach',230),wagon('Q1','approach',210.8),wagon('Q2','approach',193.6)]},
                    {secured:true,cars:[wagon('R1','receiving',201.2),wagon('R2','receiving',184)]}],
                zones:[{id:'board',name:'Receiving board',edge:'receiving',from:95,to:145,color:'#e0bd6c'},
                    {id:'final',name:'Quarry Siding',edge:'siding',from:65,to:290,color:'#82b99b'}],
                tasks:[{id:'first-stop',type:'stop',zone:'board',independent:true,text:'Stop at the receiving board'},
                    {id:'collect',type:'coupled',cars:['R1','R2'],after:'first-stop',text:'Collect both waiting wagons'},
                    {id:'park',type:'park',zone:'final',cars:['engine','Q1','Q2','R1','R2'],after:'collect',text:'Whole train in Quarry Siding, handbrakes set'}]
            },[300,480,750]),
        level('long-grade-2','Head at the Wrong End',
            'Push the blue wagons into the mill siding and leave them secured. The orange wagons belong in the foundry siding at the other end. Run the engine around them before the second push.',
            'Select a wagon to set its cut’s handbrakes. Uncouple using a link in the train strip. The short loop has room for the engine, not the whole freight.',
            [1050,680],{
                thermal:false,scenery:'yard',
                nodes:{west:[70,350,12],a:[245,350,12],w:[400,350,12],e:[550,350,12],b:[760,350,12],east:[990,350,12],mill:[150,610,15],foundry:[900,90,15]},
                tracks:[
                    {id:'west-head',a:'west',b:'a',limit:6},
                    {id:'west-neck',a:'a',b:'w',limit:6},
                    {id:'main',a:'w',b:'e',points:[[400,350,12],[380,455,11],[470,520,10.4],[570,455,11],[550,350,12]],limit:6},
                    {id:'loop',a:'w',b:'e',points:[[400,350,12],[440,335,12],[510,335,12],[550,350,12]],limit:5},
                    {id:'east-neck',a:'e',b:'b',limit:6},
                    {id:'east-head',a:'b',b:'east',limit:6},
                    {id:'mill',a:'a',b:'mill',points:[[245,350,12],[210,460,13],[150,610,15]],limit:4},
                    {id:'foundry',a:'b',b:'foundry',points:[[760,350,12],[805,210,13],[900,90,15]],limit:4}
                ],
                switches:[
                    {node:'a',label:'Mill points',stem:'west-neck',branches:['west-head','mill'],names:['West headshunt','Mill siding']},
                    {node:'w',label:'West loop',stem:'west-neck',branches:['main','loop'],names:['Station road','Run-around']},
                    {node:'e',label:'East loop',stem:'east-neck',branches:['main','loop'],names:['Station road','Run-around']},
                    {node:'b',label:'Foundry points',stem:'east-neck',branches:['east-head','foundry'],names:['East headshunt','Foundry siding']}
                ],
                groups:[{cars:[loco('main',320),...['F1','F2','F3','F4','M1','M2'].map((id,i)=>wagon(id,'main',296.8-i*25.2,{length:24,mass:35000,destination:id[0]==='M'?'mill':'foundry'}))]}],
                zones:[{id:'mill-yard',name:'Mill · blue wagons',edge:'mill',from:50,to:230,color:'#79b9cd'},
                    {id:'foundry-yard',name:'Foundry · orange wagons',edge:'foundry',from:55,to:265,color:'#d89763'}],
                tasks:[{id:'mill-load',type:'delivery',zone:'mill-yard',cars:['M1','M2'],text:'Blue wagons secured at the mill; engine detached'},
                    {id:'foundry-load',type:'delivery',zone:'foundry-yard',cars:['F1','F2','F3','F4'],text:'Orange wagons secured at the foundry; engine detached'}]
            },[650,1000,1500]),
        level('long-grade-3','Stone Runs Downhill',
            'Bring the stone freight down to the valley works. The direct descent has tight bends; the eastern branch is longer and gentler. Both lead to a cooling loop above the works.',
            'Choose your route at both ends of each branch. Watch the tail’s grade and brake temperature. A cool train with room to stop is worth the extra distance.',
            [1750,1250],{
                thermal:true,scenery:'valley',
                nodes:{quarry:[100,140,62],summit:[500,140,60],join:[950,790,27],cool:[1090,905,25],out:[1270,1020,23],works:[1620,1130,22]},
                tracks:[
                    {id:'plateau',a:'quarry',b:'summit',limit:15},
                    {id:'steep',a:'summit',b:'join',points:[[500,140,60],[640,255,57],[715,390,48],[665,535,41],[770,665,33],[950,790,27]],limit:13,restrictions:[{from:.24,to:.63,limit:5.5}]},
                    {id:'gentle',a:'summit',b:'join',points:[[500,140,60],[970,90,54],[1450,240,46],[1460,600,36],[1230,735,30],[950,790,27]],limit:10},
                    {id:'valley',a:'join',b:'cool',limit:8},
                    {id:'direct',a:'cool',b:'out',limit:7},
                    {id:'cooling',a:'cool',b:'out',points:[[1090,905,25],[920,1010,24.5],[700,985,24],[660,1140,23.8],[980,1190,23.5],[1270,1020,23]],limit:7},
                    {id:'works-road',a:'out',b:'works',limit:5}
                ],
                switches:[{node:'summit',label:'Summit',stem:'plateau',branches:['steep','gentle'],names:['Direct descent','Eastern branch']},
                    {node:'join',label:'Valley Junction',stem:'valley',branches:['steep','gentle'],names:['Direct descent','Eastern branch']},
                    {node:'cool',label:'Loop entrance',stem:'valley',branches:['direct','cooling'],names:['Works approach','Cooling loop']},
                    {node:'out',label:'Works Junction',stem:'works-road',branches:['direct','cooling'],names:['Works approach','Cooling loop']}],
                groups:[{cars:[loco('plateau',270),...Array.from({length:10},(_,i)=>wagon('S'+(i+1),'plateau',250.8-i*17.2,{mass:65000}))]}],
                zones:[{id:'works-yard',name:'Valley works',edge:'works-road',from:35,to:345,color:'#82b99b'}],
                tasks:[{id:'stone',type:'park',zone:'works-yard',cars:['engine',...Array.from({length:10},(_,i)=>'S'+(i+1))],text:'All stone wagons inside the works, handbrakes set'}]
            },[450,650,950])
    ];
    if(typeof module!=='undefined'&&module.exports)module.exports=levels;
    root.RailLevels=levels;
})(typeof globalThis!=='undefined'?globalThis:this);
