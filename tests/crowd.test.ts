import {afterEach,describe,expect,it,vi} from 'vitest';
import {BASELINE,DURATION,freshScenario,UNITS} from '../src/data/station';
import type {Scenario} from '../src/domain/types';
import {validateScenario} from '../src/domain/planning';
import {shopTransform} from '../src/domain/shopGeometry';
import {branchScenario} from '../src/domain/branches';
import {compareScenarios,createStressScenario,simulate} from '../src/simulation/engine';
import {loadPlans,savePlans} from '../src/state/persistence';
import {downloadJSON} from '../src/reports/export';

type CrowdScenario=Scenario&{crowd?:'normal'|'busy'};
const plan=(crowd?:CrowdScenario['crowd']):CrowdScenario=>{const scenario=structuredClone(BASELINE);delete (scenario as CrowdScenario).crowd;if(crowd)(scenario as CrowdScenario).crowd=crowd;return scenario;};
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();});

describe('authored crowd assumptions',()=>{
 it('preserves the legacy imported demand schedule when crowd is absent',()=>{
  const legacy=simulate(plan());
  expect(legacy.metrics().arrivals).toBe(1226);
  expect(legacy.buckets.map(bucket=>bucket.arrivals)).toEqual([151,76,159,59,130,64,127,55,133,68,142,62]);
  expect(validateScenario(plan())).not.toHaveProperty('crowd');
 });
 it('defaults new plans to normal and scales both background demand and scheduled train waves',()=>{
  expect(freshScenario()).toHaveProperty('crowd','normal');
  const legacy=simulate(plan()),normal=simulate(plan('normal')),busy=simulate(plan('busy'));
  expect(normal.metrics().arrivals/legacy.metrics().arrivals).toBeGreaterThan(1.5);
  expect(normal.metrics().arrivals/legacy.metrics().arrivals).toBeLessThan(1.7);
  expect(busy.metrics().arrivals/legacy.metrics().arrivals).toBeGreaterThan(2.6);
  expect(busy.metrics().arrivals/legacy.metrics().arrivals).toBeLessThan(3);
  expect(normal.metrics(0,240).arrivals).toBeGreaterThan(legacy.metrics(0,240).arrivals*1.4);
  expect(busy.metrics(0,240).arrivals).toBeGreaterThan(normal.metrics(0,240).arrivals*1.5);
  const trainPeople=(scenario:CrowdScenario)=>{const result=simulate(scenario),ids=new Set<number>();for(let time=240;time<350;time+=1)for(const agent of result.snapshot(time).agents)if(agent.id>=12000&&agent.id<14000)ids.add(agent.id);return ids.size;};
  expect(trainPeople(plan('normal'))).toBe(Math.round(trainPeople(plan())*1.6));
  expect(trainPeople(plan('busy'))).toBe(Math.round(trainPeople(plan())*2.8));
 });
 it('treats an explicitly chosen arrival magnitude as the passenger count in every assumption',()=>{
  for(const crowd of [undefined,'normal','busy'] as const){const scenario=plan(crowd),base=simulate(scenario);scenario.events.push({id:'counted-wave',type:'arrival',start:600,duration:180,magnitude:600,target:'platform-a'});const wave=simulate(scenario);expect(wave.metrics(600,780).arrivals-base.metrics(600,780).arrivals).toBe(600);}
 });
 it('rejects unsupported assumptions at import and direct simulation boundaries',()=>{
  for(const crowd of ['packed',null,3]){const invalid={...plan(),crowd};expect(()=>validateScenario(invalid)).toThrow(/crowd|demand/i);expect(()=>simulate(invalid as Scenario)).toThrow(/crowd|demand/i);}
 });
 it('keeps the demand assumption aligned across baseline, proposed and stress comparisons',()=>{
  for(const crowd of [undefined,'normal','busy'] as const){const scenario=plan(crowd);expect(branchScenario(scenario,'baseline').crowd).toBe(crowd);expect(compareScenarios(scenario).baseline.arrivals).toBe(simulate(scenario).metrics().arrivals);expect(createStressScenario(scenario).crowd).toBe(crowd);}
 });
});

describe('shared deterministic crowd geometry',()=>{
 it('keeps passenger bodies clear of the five authored fare gate pedestals',()=>{
  const scenario=plan('busy');scenario.id='fare-gate-body-clearance';scenario.tenants=[];
  const result=simulate(scenario);let checked=0;
  for(let time=0;time<1200;time+=.25){
   for(const agent of result.snapshot(time).agents.filter(a=>a.y===1&&a.x>7&&a.x<13.2&&a.z>3.2&&a.z<5.2)){
    for(let index=0;index<5;index++){
     const centerX=7.45+index*1.3,dx=Math.max(Math.abs(agent.x-centerX)-.42/2,0),dz=Math.max(Math.abs(agent.z-4.05)-1.28/2,0);
     expect(Math.hypot(dx,dz),`agent ${agent.id} at ${time}s beside gate ${index+1}`).toBeGreaterThanOrEqual(.16-1e-8);
     checked++;
    }
   }
  }
  expect(checked).toBeGreaterThan(1000);
 });
 it('keeps the closed-route bypass below the gate bank with both planning courts occupied',()=>{
  const scenario=plan('busy');scenario.id='fare-gate-bypass-clearance';
  scenario.events.push({id:'gate-bypass',type:'closure',start:0,duration:DURATION,magnitude:1,target:'central-route'},{id:'gate-rain',type:'rain',start:0,duration:DURATION,magnitude:1});
  for(const [index,unitId] of ['S1','S2'].entries())scenario.tenants.push({id:`T${index+5}`,name:`Planning court ${index+1}`,category:'coffee',unitId,staff:2,size:'small',rotation:0,open:0,close:DURATION,preparation:1});
  const result=simulate(scenario);let checked=0;
  for(let time=0;time<1200;time+=.25){
   for(const agent of result.snapshot(time).agents.filter(a=>a.y===1&&a.x>7&&a.x<13.2&&a.z>2.8&&a.z<5.2)){
    for(let index=0;index<5;index++){
     const centerX=7.45+index*1.3,dx=Math.max(Math.abs(agent.x-centerX)-.42/2,0),dz=Math.max(Math.abs(agent.z-4.05)-1.28/2,0);
     expect(Math.hypot(dx,dz),`bypass agent ${agent.id} at ${time}s beside gate ${index+1}`).toBeGreaterThanOrEqual(.16-1e-8);
     checked++;
    }
   }
  }
  expect(checked).toBeGreaterThan(1000);
 });
 it('alights at all eight authored door positions rather than one platform point',()=>{
  const scenario=plan('busy');scenario.tenants=[];scenario.events.push({id:'door-wave',type:'arrival',start:600,duration:60,magnitude:160,target:'platform-b'});const result=simulate(scenario),doors=[-21.5,-15.1,-9.3,-2.9,2.9,9.3,15.1,21.5],seen=new Set<number>();
  for(let time=600;time<660;time+=.25)for(const agent of result.snapshot(time).agents.filter(a=>a.id>1e9&&a.y===0&&a.z<17)){const closest=doors.reduce((best,x,index)=>Math.abs(agent.x-x)<Math.abs(agent.x-doors[best])?index:best,0);if(Math.abs(agent.x-doors[closest])<.35)seen.add(closest);}
  expect(seen.size).toBe(8);
 });
 it('uses several safe hall lanes and distributed platform waiting slots',()=>{
  const scenario=plan('busy');scenario.tenants=[];const result=simulate(scenario),hall=new Set<string>(),waiting:{x:number;z:number}[]=[];
  for(let time=40;time<240;time+=5){const snapshot=result.snapshot(time);for(const agent of snapshot.agents){if(agent.y===1&&agent.state==='walking'&&agent.x<6&&agent.z>-4&&agent.z<-1.5)hall.add(agent.z.toFixed(2));if(agent.y===0&&agent.state==='browsing')waiting.push(agent);}}
  expect(hall.size).toBeGreaterThanOrEqual(5);expect(waiting.length).toBeGreaterThan(20);
  expect(Math.max(...waiting.map(a=>a.x))-Math.min(...waiting.map(a=>a.x))).toBeGreaterThan(30);
  expect(waiting.some(a=>a.x<19&&Math.min(...[-21.5,-15.1,-9.3,-2.9,2.9,9.3,15.1].map(x=>Math.abs(a.x-x)))>.75)).toBe(true);
  expect(new Set(waiting.map(a=>a.z.toFixed(2))).size).toBeGreaterThan(3);
  for(const agent of waiting){expect(agent.x).toBeLessThanOrEqual(20.95);if(agent.z<14){expect(agent.z).toBeGreaterThanOrEqual(9.45);expect(agent.z).toBeLessThanOrEqual(10.2);}else{expect(agent.z).toBeGreaterThanOrEqual(17.1);expect(agent.z).toBeLessThanOrEqual(17.85);}}
 });
 it('keeps spread passengers inside the authored surfaces, protected stairs and shop bounds',()=>{
  const scenario=plan('busy');scenario.events.push({id:'wet',type:'rain',start:0,duration:DURATION,magnitude:1},{id:'bypass',type:'closure',start:0,duration:DURATION,magnitude:1,target:'central-route'});scenario.tenants.push({id:'T5',name:'Safe planning shop',category:'coffee',unitId:'S1',staff:2,size:'small',rotation:0,open:0,close:DURATION,preparation:1});const result=simulate(scenario);
  for(let time=1;time<DURATION;time+=23){const snapshot=result.snapshot(time),metrics=result.metrics(0,time);expect(snapshot.present).toBe(metrics.arrivals-metrics.departed);expect(snapshot.present).toBe(snapshot.agents.length);expect(new Set(snapshot.agents.map(a=>a.id)).size).toBe(snapshot.present);
   for(const agent of snapshot.agents){
    expect(Number.isFinite(agent.x+agent.y+agent.z)).toBe(true);
    expect(agent.x).toBeGreaterThanOrEqual(-29);expect(agent.x).toBeLessThanOrEqual(29);
    if(agent.z>11.05&&agent.z<16.25){expect(agent.y).toBe(2.65);expect(agent.x).toBe(26);}
    if(agent.y===0){
     expect(agent.z<11.05||agent.z>16.25).toBe(true);
     if(agent.x>20.99&&agent.x<25.96)expect((agent.z>7.39&&agent.z<10.21)||(agent.z>17.09&&agent.z<19.91)).toBe(false);
    }
    if(agent.y===1&&agent.state==='walking'&&!agent.tenantId)for(const tenant of scenario.tenants){
     const unit=UNITS.find(u=>u.id===tenant.unitId)!,bounds=shopTransform(unit,tenant).bounds;
     expect(agent.x>bounds.minX&&agent.x<bounds.maxX&&agent.z>bounds.minZ&&agent.z<bounds.maxZ).toBe(false);
    }
   }
  }
 });
 it('replays continuous model positions independently of seeking order and conserves lifecycle totals',()=>{
  const scenario=plan('busy'),result=simulate(scenario),second=simulate({...scenario,id:'independent-busy-replay'});let checked=0;
  for(let time=200;time<1200;time+=2){const before=new Map(result.snapshot(time).agents.map(agent=>[agent.id,agent]));for(const agent of result.snapshot(time+.25).agents){const prior=before.get(agent.id);if(prior){expect(Math.hypot(agent.x-prior.x,agent.y-prior.y,agent.z-prior.z)).toBeLessThan(1);checked++;}}}
  result.snapshot(3500);result.snapshot(1);expect(result.snapshot(1460)).toEqual(second.snapshot(1460));expect(result.metrics().arrivals-result.metrics().departed).toBe(result.metrics().present);expect(checked).toBeGreaterThan(1000);
 });
 it('reuses immutable snapshots for identical paused times while bounding retained entries',()=>{
  const result=simulate(plan('normal')),snapshot=result.snapshot(1460);
  expect(result.snapshot(1460)).toBe(snapshot);expect(Object.isFrozen(snapshot)).toBe(true);expect(Object.isFrozen(snapshot.agents)).toBe(true);expect(Object.isFrozen(snapshot.agents[0])).toBe(true);expect(()=>{snapshot.agents[0].x=999;}).toThrow();expect(()=>{snapshot.queues.T1=999;}).toThrow();
  for(let time=1500;time<1512;time++)result.snapshot(time);expect(result.snapshot(1460)).not.toBe(snapshot);expect(result.snapshot(1460)).toEqual(snapshot);
 });
});

describe('crowd configuration persistence and privacy',()=>{
 it('persists and validates only the public demand assumption with the whitelisted plan',()=>{
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}});const scenario=plan('busy');Object.assign(scenario,{passengerRecords:[{name:'PRIVATE PERSON'}]});expect(savePlans([scenario]).ok).toBe(true);const restored=loadPlans().plans[0];expect(restored.crowd).toBe('busy');expect(JSON.stringify(restored)).not.toContain('PRIVATE PERSON');expect(restored).not.toHaveProperty('passengerRecords');
 });
 it('preserves demand assumption in tenant JSON without exposing competitor inputs',async()=>{
  vi.useFakeTimers();const anchor={href:'',download:'',style:{display:''},click:vi.fn(),remove:vi.fn()};vi.stubGlobal('document',{createElement:()=>anchor,body:{append:vi.fn()}});const url=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:crowd-test');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});const scenario=plan('busy');scenario.tenants[0].name='PRIVATE COMPETITOR';downloadJSON(scenario,'T2');const contents=await(url.mock.calls[0][0] as Blob).text(),configuration=JSON.parse(contents);expect(configuration.scenario.crowd).toBe('busy');expect(contents).not.toContain('PRIVATE COMPETITOR');expect(contents).not.toContain('agents');
 });
});
