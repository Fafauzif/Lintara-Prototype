import {afterEach,describe,expect,it,vi} from 'vitest';
import {BASELINE,freshScenario} from '../src/data/station';
import type {Scenario,Tenant} from '../src/domain/types';
import {validateScenario} from '../src/domain/planning';
import {branchScenario} from '../src/domain/branches';
import {compareScenarios,createStressScenario,simulate} from '../src/simulation/engine';
import {time} from '../src/i18n';
import {loadPlans,savePlans} from '../src/state/persistence';
import {downloadCSV,downloadJSON,downloadTenantJSON,printReport} from '../src/reports/export';
import {parseClock,periodForHour,periodProfile,setScenarioHour,startHourOf,windowLabel} from '../src/domain/period';

type TimedScenario=Scenario&{period?:'morning'|'midday'|'evening';startHour?:number};
const at=(period:TimedScenario['period'],startHour?:number):TimedScenario=>({...freshScenario(),period,...(startHour===undefined?{}:{startHour})});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();});

describe('authored daypart demand',()=>{
 it('preserves exact legacy demand and default morning results',()=>{
  const legacy=structuredClone(BASELINE);delete legacy.crowd;
  expect(simulate(legacy).metrics().arrivals).toBe(1226);
  expect(simulate(legacy).buckets.map(b=>b.arrivals)).toEqual([151,76,159,59,130,64,127,55,133,68,142,62]);
  expect(simulate(at('morning',7)).metrics()).toEqual(simulate(freshScenario()).metrics());
 });
 it('reduces midday traffic and increases the boarding share on the evening commute',()=>{
  const morning=at('morning'),midday=at('midday'),evening=at('evening');
  morning.tenants=[];midday.tenants=[];evening.tenants=[];
  const a=simulate(morning),b=simulate(midday),c=simulate(evening);
  expect(b.metrics().arrivals).toBeLessThan(a.metrics().arrivals*.8);
  const platformWaiting=(result:ReturnType<typeof simulate>)=>result.snapshot(190).agents.filter(agent=>agent.y===0&&agent.state==='browsing').length;
  expect(platformWaiting(c)).toBeGreaterThan(platformWaiting(a)*1.3);
 });
 it('changes category demand rather than just relabeling the clock',()=>{
  const morning=simulate(at('morning')).metrics(),midday=simulate(at('midday')).metrics();
  const visits=(metrics:typeof morning,id:string)=>metrics.tenants.find(t=>t.tenantId===id)!.visits;
  expect(visits(midday,'T3')/visits(midday,'T1')).toBeGreaterThan(visits(morning,'T3')/visits(morning,'T1')*1.4);
 });
 it('models morning/evening peaks and low late-day demand for editable hours',()=>{
  expect(simulate(at('morning',8)).metrics().arrivals).toBeGreaterThan(simulate(at('morning',7)).metrics().arrivals*1.1);
  expect(simulate(at('evening',18)).metrics().arrivals).toBeGreaterThan(simulate(at('evening',17)).metrics().arrivals*1.1);
  expect(simulate(at('evening',22)).metrics().arrivals).toBeLessThan(simulate(at('evening',17)).metrics().arrivals*.4);
 });
 it('preserves explicit arrival magnitude across dayparts and hours',()=>{
  for(const [period,hour] of [['morning',8],['midday',12],['evening',22]] as const){
   const scenario=at(period,hour),before=simulate(scenario).metrics(600,780).arrivals;
   scenario.events.push({id:'fixed-arrival',type:'arrival',start:600,duration:180,magnitude:600,target:'platform-a'});
   expect(simulate(scenario).metrics(600,780).arrivals-before).toBe(600);
  }
 });
 it('aligns baseline, proposed, stress and persisted plans with the selected hour',()=>{
  const scenario=at('evening',18),baseline=branchScenario(scenario,'baseline');
  expect(baseline).toMatchObject({period:'evening',startHour:18});
  expect(createStressScenario(scenario)).toMatchObject({period:'evening',startHour:18});
  expect(compareScenarios(scenario).baseline.arrivals).toBe(simulate(baseline).metrics().arrivals);
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});
  expect(savePlans([scenario])).toEqual({ok:true});expect(loadPlans().plans[0]).toMatchObject({period:'evening',startHour:18});
 });
 it('rejects unsupported, malformed or contradictory periods and hours at both model boundaries',()=>{
  for(const patch of [{period:'night'},{period:null},{startHour:4},{startHour:23},{startHour:7.5},{startHour:Infinity},{period:'morning',startHour:18}]){
   const invalid={...freshScenario(),...patch};
   expect(()=>validateScenario(invalid)).toThrow(/period|hour/i);
   expect(()=>simulate(invalid as Scenario)).toThrow(/period|hour/i);
  }
 });
});

describe('editable tenant financial assumptions',()=>{
 it('preserves wage/purchase overrides and uses them in modeled costs and purchases',()=>{
  const scenario=freshScenario();scenario.tenants=[{...scenario.tenants[1],wagePerHour:40000,purchaseProbability:0} as Tenant];
  expect(validateScenario(scenario).tenants[0]).toMatchObject({wagePerHour:40000,purchaseProbability:0});
  const zero=simulate(scenario).metrics().tenants[0];expect(zero.visits).toBeGreaterThan(0);expect(zero.transactions).toBe(0);expect(zero.sales).toBe(0);expect(zero.labor).toBe(80000);
  const certain=structuredClone(scenario);Object.assign(certain.tenants[0],{purchaseProbability:1,wagePerHour:0});
  const result=simulate(certain).metrics().tenants[0];expect(result.transactions).toBeGreaterThan(0);expect(result.labor).toBe(0);
  expect(result.transactions).toBeGreaterThanOrEqual(result.completed-result.abandoned);
 });
 it('rejects out-of-bounds/nonfinite financial overrides without changing defaults',()=>{
  for(const patch of [{wagePerHour:-1},{wagePerHour:1000001},{wagePerHour:NaN},{purchaseProbability:-.1},{purchaseProbability:1.1},{purchaseProbability:Infinity}]){
   const scenario=freshScenario();Object.assign(scenario.tenants[0],patch);
   expect(()=>validateScenario(scenario)).toThrow(/wage|purchase/i);expect(()=>simulate(scenario)).toThrow(/wage|purchase/i);
  }
 });
});

describe('one-hour clock boundaries',()=>{
 it('maps selectable hours to consistent dayparts and preserves detached relative configuration',()=>{
  expect(periodForHour(5)).toBe('morning');expect(periodForHour(10)).toBe('morning');expect(periodForHour(11)).toBe('midday');expect(periodForHour(15)).toBe('midday');expect(periodForHour(16)).toBe('evening');expect(periodForHour(22)).toBe('evening');
  const original=freshScenario();original.campaigns.push({id:'C1',name:'Same window',screenId:'AD1',tenantId:'T2',start:900,end:2100,budget:10000,objective:'visits'});
  const changed=setScenarioHour(original,18);expect(changed).toMatchObject({startHour:18,period:'evening'});expect(changed.tenants).toEqual(original.tenants);expect(changed.campaigns).toEqual(original.campaigns);expect(changed.tenants).not.toBe(original.tenants);expect(original).not.toHaveProperty('startHour');
  expect(()=>setScenarioHour(original,23)).toThrow(/hour/i);expect(startHourOf({period:'midday'})).toBe(12);expect(startHourOf({startHour:18})).toBe(18);expect(periodProfile({startHour:18}).period).toBe('evening');
 });
 it('parses strict minute/second inputs inside the selected hour, including its exact endpoint',()=>{
  const scenario=at('evening',18);expect(windowLabel(scenario)).toBe('18:00–19:00 WIB');expect(parseClock('18:05',scenario)).toBe(300);expect(parseClock('18:05:37',scenario)).toBe(337);expect(parseClock('19:00:00',scenario)).toBe(3600);expect(parseClock('07:00')).toBe(0);
  for(const value of ['', '18:60','18:05:60','18:5','17:59:59','19:00:01','25:00','12:00','18:00junk'])expect(parseClock(value,scenario)).toBeNull();
  expect(time(300,'midday')).toBe('12:05');expect(time(0,{startHour:5})).toBe('05:00');expect(windowLabel({startHour:22})).toBe('22:00–23:00 WIB');
 });
});

describe('selected hour output contracts',()=>{
 const downloadSetup=()=>{
  vi.useFakeTimers();const anchor={href:'',download:'',style:{display:''},click:vi.fn(),remove:vi.fn()};
  vi.stubGlobal('document',{createElement:()=>anchor,body:{append:vi.fn()}});vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
  return vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:period-test');
 };
 it('formats a selected hour while retaining the legacy clock signature',()=>{
  expect(time(300)).toBe('07:05');
  expect((time as (seconds:number,scenario:Scenario)=>string)(300,at('evening',18))).toBe('18:05');
 });
 it('exports period/hour metadata and correct local CSV/tenant report windows',async()=>{
  const blobs=downloadSetup(),scenario=at('evening',18),result=simulate(scenario);
  downloadJSON(scenario,'T2');const config=JSON.parse(await(blobs.mock.calls[0][0] as Blob).text());expect(config.scenario).toMatchObject({period:'evening',startHour:18});
  downloadCSV(result,300,900,'T2');const csv=await(blobs.mock.calls[1][0] as Blob).text();expect(csv).toContain('18:05:00 WIB,18:15:00 WIB');expect(csv).toContain('model_start_hour,18');
  downloadTenantJSON(result,'T2',300,900);const report=JSON.parse(await(blobs.mock.calls[2][0] as Blob).text());expect(report.window).toMatchObject({startLocal:'18:05:00 WIB',endLocal:'18:15:00 WIB'});
 });
 it('prints selected-hour evidence and preserves negative comparisons',()=>{
  const scenario=at('midday',13);scenario.tenants[0].staff=12;scenario.tenants[0].wagePerHour=1000000;const result=simulate(scenario);
  const doc={open:vi.fn(),write:vi.fn(),close:vi.fn()};vi.stubGlobal('window',{open:()=>({opener:{},document:doc,close:vi.fn()})});
  printReport(result,300,900,undefined,'en');const output=doc.write.mock.calls[0][0] as string;
  expect(output).toContain('13:05:00 WIB–13:15:00 WIB');expect(output).toContain('Authored daypart assumptions');
  expect(output).toContain('reduces estimated contribution');
 });
 it('localizes the new daypart and financial-input evidence in Indonesian reports',()=>{
  const result=simulate(at('evening',18));
  const doc={open:vi.fn(),write:vi.fn(),close:vi.fn()};vi.stubGlobal('window',{open:()=>({opener:{},document:doc,close:vi.fn()})});
  printReport(result,300,900,'T2','id');const output=doc.write.mock.calls[0][0] as string;
  expect(output).toContain('Asumsi periode yang disusun');expect(output).toContain('Porsi perjalanan naik kereta');expect(output).toContain('Upah / jam');expect(output).toContain('Peluang pembelian');expect(output).not.toContain('Authored daypart assumptions');
 });
});
