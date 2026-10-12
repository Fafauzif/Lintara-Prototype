import type {Category,CategoryParameters,Scenario,Unit} from '../domain/types';
export const DURATION=3600;
export const OPENING_TIME=1460;
export const START_HOUR=7;
/** Authored four-car train: two platform-facing doors per car (scene/station.ts). */
export const TRAIN_DOOR_X=Object.freeze([-21.5,-15.1,-9.3,-2.9,2.9,9.3,15.1,21.5]);
/** Passenger centers remain on the platform side of the physical door thresholds. */
export const PLATFORM_FLOW=Object.freeze([
 Object.freeze({doorZ:10.8,laneZ:9.65,waitRows:Object.freeze([9.5,9.82,10.14])}),
 Object.freeze({doorZ:16.7,laneZ:17.4,waitRows:Object.freeze([17.15,17.47,17.79])})
]);
export const CATEGORIES:Record<Category,CategoryParameters>={
 bakery:{name:'Roti Peron',color:'#D8A956',basket:22000,margin:.58,service:42,attraction:.22,patience:180,wagePerHour:24000,taskMinutesPerHour:8,icon:'croissant'},
 coffee:{name:'Kopi Sela',color:'#7B9A85',basket:28000,margin:.66,service:65,attraction:.26,patience:210,wagePerHour:26000,taskMinutesPerHour:10,icon:'coffee'},
 meals:{name:'Bekal Express',color:'#D88368',basket:38000,margin:.48,service:52,attraction:.20,patience:160,wagePerHour:25000,taskMinutesPerHour:12,icon:'utensils'},
 retail:{name:'Saku Mart',color:'#7695BA',basket:34000,margin:.32,service:35,attraction:.15,patience:120,wagePerHour:23000,taskMinutesPerHour:15,icon:'store'}
};
const all:Category[]=['bakery','coffee','meals','retail'];
export const UNITS:Unit[]=[
{id:'U1',label:'01',x:-19,z:-8,width:7,depth:5,rentPerDay:480000,zone:'West hall',allowed:all,fit:.91,frontage:7},
{id:'U2',label:'02',x:-10,z:-8,width:7,depth:5,rentPerDay:580000,zone:'Central hall',allowed:all,fit:.95,frontage:7},
{id:'U3',label:'03',x:-1,z:-8,width:7,depth:5,rentPerDay:640000,zone:'Central hall',allowed:all,fit:.87,frontage:7},
{id:'U4',label:'04',x:8,z:-8,width:7,depth:5,rentPerDay:530000,zone:'East hall',allowed:all,fit:.86,frontage:7},
{id:'U5',label:'05',x:17,z:-8,width:7,depth:5,rentPerDay:430000,zone:'East hall',allowed:all,fit:.79,frontage:7},
{id:'U6',label:'06',x:-19,z:1,width:6,depth:4,rentPerDay:340000,zone:'West hall',allowed:['bakery','coffee','retail'],fit:.82,frontage:6},
{id:'U7',label:'07',x:18,z:1,width:6,depth:4,rentPerDay:320000,zone:'East hall',allowed:['coffee','retail','meals'],fit:.78,frontage:6},
{id:'S1',label:'P1',x:-10,z:1,width:4,depth:3,rentPerDay:200000,zone:'Planning court',allowed:['bakery','coffee'],fit:.72,frontage:4},
{id:'S2',label:'P2',x:-4,z:1,width:4,depth:3,rentPerDay:200000,zone:'Planning court',allowed:['bakery','coffee'],fit:.74,frontage:4}
];
export const SCREENS=[{id:'AD1',name:'Concourse gateway',x:12,z:2},{id:'AD2',name:'West entrance',x:-24,z:-2},{id:'AD3',name:'Platform connection',x:0,z:6}];
export const BASELINE:Scenario={version:1,id:'baseline',name:'Morning baseline',seed:20261012,crowd:'normal',
 tenants:[
 {id:'T1',name:'Roti Peron',category:'bakery',unitId:'U1',staff:2,size:'medium',rotation:0,open:0,close:DURATION,preparation:1},
 {id:'T2',name:'Kopi Sela',category:'coffee',unitId:'U2',staff:2,size:'medium',rotation:0,open:0,close:DURATION,preparation:1},
 {id:'T3',name:'Bekal Express',category:'meals',unitId:'U4',staff:2,size:'medium',rotation:0,open:0,close:DURATION,preparation:1},
 {id:'T4',name:'Saku Mart',category:'retail',unitId:'U5',staff:2,size:'medium',rotation:0,open:0,close:DURATION,preparation:1}
 ],events:[],campaigns:[]};
export function freshScenario():Scenario{return structuredClone({...BASELINE,id:'proposed',name:'Morning opportunity'});}
