import type {Category,Scenario,TimePeriod} from './types';

export type PeriodContext=Pick<Scenario,'period'|'startHour'>;
export const PERIOD_DEFAULT_HOURS:Readonly<Record<TimePeriod,number>>=Object.freeze({morning:7,midday:12,evening:17});
/** Authored demand shape for one-hour planning windows; not observed station counts. */
export const HOURLY_DEMAND_FACTORS:Readonly<Record<number,number>>=Object.freeze({
 5:.35,6:.72,7:1,8:1.22,9:.86,10:.62,11:.84,12:1,13:.95,14:.8,15:.85,
 16:.88,17:1,18:1.2,19:.82,20:.6,21:.38,22:.24
});

export interface PeriodProfile {
 period:TimePeriod;
 startHour:number;
 hourlyDemandFactor:number;
 backgroundFactor:number;
 alightingFactor:number;
 boardingProbability:number;
 attractionFactor:Readonly<Record<Category,number>>;
 patienceFactor:number;
}
const PROFILES:Readonly<Record<TimePeriod,Omit<PeriodProfile,'period'|'startHour'|'hourlyDemandFactor'>>>=Object.freeze({
 morning:Object.freeze({backgroundFactor:1,alightingFactor:1,boardingProbability:.32,attractionFactor:Object.freeze({bakery:1,coffee:1,meals:1,retail:1}),patienceFactor:1}),
 midday:Object.freeze({backgroundFactor:.7,alightingFactor:.65,boardingProbability:.18,attractionFactor:Object.freeze({bakery:.65,coffee:.85,meals:1.65,retail:1.1}),patienceFactor:1.15}),
 evening:Object.freeze({backgroundFactor:1.08,alightingFactor:.95,boardingProbability:.56,attractionFactor:Object.freeze({bakery:.8,coffee:.9,meals:1.35,retail:1.25}),patienceFactor:.9})
});

export function periodForHour(hour:number):TimePeriod {
 if(!Number.isInteger(hour)||hour<5||hour>22)throw new Error('Model start hour must be an integer between 5 and 22.');
 return hour<=10?'morning':hour<=15?'midday':'evening';
}

/** An explicit start hour determines the daypart; contradictory imports are rejected. */
export function validatePeriodContext(context:{period?:unknown;startHour?:unknown}):void {
 if(context.period!==undefined&&context.period!=='morning'&&context.period!=='midday'&&context.period!=='evening')throw new Error('Model period must be morning, midday or evening.');
 if(context.startHour!==undefined){
  if(typeof context.startHour!=='number')throw new Error('Model start hour must be an integer between 5 and 22.');
  const expected=periodForHour(context.startHour);
  if(context.period!==undefined&&context.period!==expected)throw new Error('Model period must agree with the selected start hour.');
 }
}

export function startHourOf(scenario:PeriodContext={}):number {
 validatePeriodContext(scenario);
 return scenario.startHour??PERIOD_DEFAULT_HOURS[scenario.period??'morning'];
}

export function periodProfile(scenario:PeriodContext={}):PeriodProfile {
 const startHour=startHourOf(scenario),period=periodForHour(startHour);
 return {...PROFILES[period],period,startHour,hourlyDemandFactor:HOURLY_DEMAND_FACTORS[startHour]};
}

/** Minutes/seconds are relative to the selected one-hour model window. */
export function time(seconds:number,context:PeriodContext|TimePeriod={}):string {
 const scenario=typeof context==='string'?{period:context}:context;
 const total=startHourOf(scenario)*60+Math.floor((Number.isFinite(seconds)?seconds:0)/60);
 return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}

export function windowLabel(scenario:PeriodContext={}):string {return `${time(0,scenario)}–${time(3600,scenario)} WIB`;}

/** Empty/invalid edits do not alter the current time or tenant/event configuration. */
export function parseClock(value:string,scenario:PeriodContext={}):number|null {
 const match=/^(\d{2}):([0-5]\d)(?::([0-5]\d))?$/.exec(value);
 if(!match)return null;
 const hour=Number(match[1]);if(hour>23)return null;
 const seconds=(hour-startHourOf(scenario))*3600+Number(match[2])*60+Number(match[3]??0);
 return seconds>=0&&seconds<=3600?seconds:null;
}

export function setScenarioHour(scenario:Scenario,hour:number):Scenario {
 const period=periodForHour(hour);
 return {...structuredClone(scenario),startHour:hour,period};
}
