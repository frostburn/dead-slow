import type {Command,Adapter} from '../src/contracts.js';
import type {Task} from '../src/rail-level-types.js';
const command:Command=['uncouple',{after:'engine',before:'T1'}];
const task:Task={id:'yard',text:'Park',type:'park',zone:'yard',cars:['T1']};
// These checks must fail if a future edit weakens the shared contracts.
// @ts-expect-error power requires a number
const badPower:Command=['power','full'];
// @ts-expect-error a link must identify both endpoints
const staleLink:Command=['uncouple',{after:'engine'}];
// @ts-expect-error traffic tasks require a passenger ID
const missingPassenger:Task={id:'meet',text:'Meet',type:'traffic'};
// @ts-expect-error adapters must expose readiness and cleanliness
const incomplete:Adapter<object>={id:'new-world',create:()=>({}),step:()=>{}};
void [command,task,badPower,staleLink,missingPassenger,incomplete];

import type {PolarPort} from '../src/contracts.js';
declare const polar:PolarPort;
declare const polarRun:Parameters<PolarPort['command']>[0];
// @ts-expect-error convoy orders are intentionally limited to hold and proceed
polar.command(polarRun,'morrow','warp');
