import type {Scenario,ScenarioEvent} from './types';
import {DURATION} from '../data/station';

export const TRAIN_APPROACH_SECONDS=40;
export const TRAIN_DEPARTURE_SECONDS=35;
export const TRAIN_CLEARANCE_SECONDS=TRAIN_APPROACH_SECONDS+TRAIN_DEPARTURE_SECONDS;
export interface TrainScheduleEntry{id:string;identity:string;authored:boolean;start:number;dwell:number;platform:0|1;spread:number;}
/** Shared timetable geometry without passenger RNG, renderer, planner, or engine imports. */
export function buildTrainSchedule(input:Pick<Scenario,'events'>):TrainScheduleEntry[]{
 const events=input.events,trains:TrainScheduleEntry[]=[];
 for(let i=0;i<6;i++){
  const original=240+i*600,id=`train-${i+1}`;
  const delay=events.filter(e=>e.type==='delay'&&(!e.target||e.target===id)&&original>=e.start&&original<e.start+e.duration).reduce((sum,e)=>sum+Math.max(0,e.magnitude),0);
  trains.push({id,identity:`scheduled:${id}`,authored:true,start:original+delay,dwell:60,platform:i%2 as 0|1,spread:48});
 }
 for(const event of events.filter(e=>e.type==='arrival')){
  const dwell=Math.max(60,Math.min(240,event.duration));
  trains.push({id:`arrival-${event.id}`,identity:`event:${event.id}`,authored:false,start:event.start,dwell,platform:event.target==='platform-b'?1:0,spread:Math.min(event.duration,dwell)});
 }
 return trains.sort((a,b)=>a.start-b.start||a.platform-b.platform||a.id.localeCompare(b.id));
}
export function checkTrainConflicts(input:Pick<Scenario,'events'>):string|null{
 const schedule=buildTrainSchedule(input).filter(t=>t.start-TRAIN_APPROACH_SECONDS<DURATION&&t.start+t.dwell+TRAIN_DEPARTURE_SECONDS>0);
 for(const platform of [0,1]){
  const same=schedule.filter(t=>t.platform===platform);
  for(let i=1;i<same.length;i++)if(same[i].start-TRAIN_APPROACH_SECONDS<same[i-1].start+same[i-1].dwell+TRAIN_DEPARTURE_SECONDS-1e-8)return 'Trains on the same platform overlap. Allow 75 seconds between train stops.';
 }
 return null;
}
/** Convenience API for validators that have already parsed their event array. */
export function validateTrainSchedule(events:ScenarioEvent[]):void{const error=checkTrainConflicts({events});if(error)throw new Error(error);}
