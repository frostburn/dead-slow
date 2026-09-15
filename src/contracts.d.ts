export type Name = 'power'|'helper'|'brake'|'independent'|'stop'|'reverse'|'switch'|'select'|'hand'|'uncouple'|'couple'|'dispatch';
export interface Link {after:string;before:string}
export type Value = number|string|Link|undefined;
export type Command = ['power'|'helper'|'brake'|'independent',number]|['switch'|'select',string]|['uncouple',string|Link]|['dispatch',string?]|['stop'|'reverse'|'hand'|'couple'];
export interface Definition {kind:'notch'|'fraction'|'id'|'link'|'optional-id'|'none';cue?:string}
export interface Level {id:string;simulation?:string;rail?:unknown;rampage?:unknown;space?:unknown}
export interface Adapter<Run> {
    id:string;
    create(level:Level):Partial<Run>;
    step(run:Run,dt:number):void;
    ready(run:Run):boolean;
    clean(run:Run):boolean;
}

export interface Focus { x:number; y:number; a:number }
export interface RailState {
    time:number;
    stats: {contacts:number; distance:number; [name:string]:number};
    config: {tasks: {id:string}[]};
    completed:string[];
    failure:string|null;
    finishHold:number;
}
export interface RailRun {
    rail:RailState;
    time:number;
    contacts:number;
    distance:number;
    maxSpeed:number;
    throttleOrders:number;
    sampleAt:number;
    ghost:number[][];
    focus:Focus;
}
// Ports describe only what the adapter needs. Physics objects stay inside the engine.
export interface RailwayPort {
    create(level:Level):RailState;
    update(state:RailState,dt:number):void;
    command(state:RailState,name:Name,value?:Value):boolean;
    drivingEngine(state:RailState):{q:number;v:number};
    engineGroup(state:RailState):{brake:number};
    locate(state:RailState,group:{brake:number},q:number):Focus;
    commands:{definitions:Readonly<Record<Name,Definition>>};
}
export type Format = (time:number)=>string;
export interface RailViewPort {
    key(event:KeyboardEvent,state:RailState):boolean;
    prepare(level:Level,command:(name:Name,value?:Value)=>unknown):void;
    update(level:Level,run:RailRun,status:string,format:Format,race?:unknown):void;
    render(canvas:HTMLCanvasElement,level:Level,run:RailRun,zoom:number):void;
    dialog(kind:string,level:Level,run:RailRun,format:Format,hasNext?:boolean,race?:unknown):string;
}
export interface RailAdapter extends Adapter<RailRun> {
    command(run:RailRun,name:Name,value?:Value):boolean;
    key(event:KeyboardEvent,run:RailRun):boolean;
    prepare:RailViewPort['prepare'];
    update:RailViewPort['update'];
    render:RailViewPort['render'];
    dialog:RailViewPort['dialog'];
    result(run:RailRun):{rail:RailState['stats']};
}
export interface RailServices {
    railway:RailwayPort;
    audio:{railEvent(cue:string):void;horn():void};
    view:RailViewPort;
    finish():void;
    fail():void;
}
