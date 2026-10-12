import {describe, expect, it} from 'vitest';
import {BASELINE, DURATION,UNITS} from '../src/data/station';
import type {Scenario} from '../src/domain/types';
import {compareScenarios, simulate} from '../src/simulation/engine';

const copy = ():Scenario => structuredClone(BASELINE);
const run = (edit?:(s:Scenario)=>void) => {const s=copy(); edit?.(s); return simulate(s);};
const awaitUnit=(id:string)=>UNITS.find(unit=>unit.id===id)!;

describe('anonymous deterministic station model',()=>{
  it('generates real demand and replays the same seed without frame-dependent state',()=>{
    const a=run(); const b=run(s=>{s.id='independent-replay';s.name='Independent recomputation';});
    expect(a.duration).toBe(DURATION);
    expect(a.metrics().arrivals).toBeGreaterThan(500);
    expect(a.metrics().transactions).toBeGreaterThan(20);
    expect(a.metrics()).toEqual(b.metrics());
    expect(a.snapshot(731.25)).toEqual(b.snapshot(731.25));
    a.snapshot(2500); a.snapshot(5);
    expect(a.snapshot(731.25)).toEqual(b.snapshot(731.25));
  });
  it('conserves people at every replay point and keeps hall/platform coordinates bounded',()=>{
    const result=run();
    for(let t=0;t<=DURATION;t+=37){
      const m=result.metrics(0,t); const snap=result.snapshot(t);
      expect(m.arrivals-m.departed).toBe(m.present);
      expect(snap.present).toBe(m.present);
      expect(snap.agents).toHaveLength(snap.present);
      expect(new Set(snap.agents.map(a=>a.id)).size).toBe(snap.present);
      for(const a of snap.agents){
        expect(a.x).toBeGreaterThanOrEqual(-29); expect(a.x).toBeLessThanOrEqual(29);
        expect(a.z).toBeGreaterThanOrEqual(-12); expect(a.z).toBeLessThanOrEqual(19);
        expect(a.y).toBeGreaterThanOrEqual(0); expect(a.y).toBeLessThanOrEqual(2.65);
      }
    }
  });
  it('uses aligned half-open buckets whose event totals match the whole report',()=>{
    const r=run(); const m=r.metrics();
    expect(r.buckets.reduce((n,b)=>n+b.arrivals,0)).toBe(m.arrivals);
    expect(r.buckets.reduce((n,b)=>n+b.visits,0)).toBe(m.visits);
    expect(r.buckets.reduce((n,b)=>n+b.sales,0)).toBe(m.sales);
    const halves=[r.metrics(0,1800),r.metrics(1800,3600)];
    expect(halves.reduce((n,p)=>n+p.sales,0)).toBe(m.sales);
    expect(halves.reduce((n,p)=>n+p.arrivals,0)).toBe(m.arrivals);
  });
  it('derives integer-IDR contribution from margin, worker time, occupancy and campaigns',()=>{
    const r=run(s=>s.campaigns=[{id:'C',name:'Coffee morning',screenId:'AD1',tenantId:'T2',start:0,end:3600,budget:200000,objective:'visits'}]);
    for(const t of r.metrics().tenants){
      for(const field of ['sales','grossMargin','labor','occupancyCost','campaignCost','contribution'] as const) expect(Number.isInteger(t[field])).toBe(true);
      expect(t.contribution).toBe(t.grossMargin-t.labor-t.occupancyCost-t.campaignCost);
      expect(t.transactions).toBeLessThanOrEqual(t.visits);
      expect(t.entryRate===null || t.entryRate<=1).toBe(true);
      expect(t.conversion===null || (t.conversion>=0 && t.conversion<=1)).toBe(true);
    }
    expect(r.metrics().contribution).toBe(r.metrics().tenants.reduce((n,t)=>n+t.contribution,0));
    expect(r.metrics().tenants.find(t=>t.tenantId==='T2')?.campaignCost).toBe(200000);
  });
  it('does not create entrants, sales or denominator percentages for closed shops',()=>{
    const r=run(s=>s.tenants.forEach(t=>{t.open=3600;t.close=3600;}));
    expect(r.metrics().visits).toBe(0);expect(r.metrics().sales).toBe(0);
    expect(r.metrics().tenants.every(t=>t.entryRate===null&&t.conversion===null)).toBe(true);
  });
  it('preserves exogenous arrivals when a tenant is added or staff is edited',()=>{
    const base=run();
    const added=run(s=>s.tenants.push({id:'T5',name:'Test coffee',category:'coffee',unitId:'S1',staff:1,size:'small',rotation:0,open:0,close:3600,preparation:1}));
    const staffed=run(s=>{s.tenants[1].staff=4;});
    expect(added.metrics().arrivals).toBe(base.metrics().arrivals);
    expect(staffed.buckets.map(b=>b.arrivals)).toEqual(base.buckets.map(b=>b.arrivals));
  });
  it('serves FIFO within available staff and an absence reduces capacity and costs',()=>{
    const base=run();const absent=run(s=>s.events.push({id:'absence',type:'staff',target:'T2',start:0,duration:3600,magnitude:-2}));
    expect(absent.metrics().tenants.find(t=>t.tenantId==='T2')?.transactions).toBe(0);
    expect(absent.metrics().tenants.find(t=>t.tenantId==='T2')?.labor).toBe(0);
    expect(absent.metrics().abandoned).toBeGreaterThan(0);
    expect(base.metrics().transactions).toBeGreaterThan(absent.metrics().transactions);
    for(let t=50;t<3600;t+=53){
      const snap=base.snapshot(t);
      for(const tenant of BASELINE.tenants){
        expect(snap.agents.filter(a=>a.state==='service'&&a.tenantId===tenant.id).length).toBeLessThanOrEqual(tenant.staff);
        expect(snap.agents.filter(a=>a.state==='queue'&&a.tenantId===tenant.id).length).toBe(snap.queues[tenant.id]);
      }
    }
  });
  it('adding a costly worker can worsen contribution even when wait improves',()=>{
    // Fast counters already have spare capacity; payroll cannot be justified by new demand.
    const baseline=run(s=>s.tenants.forEach(t=>{t.serviceSeconds=5;}));
    const more=run(s=>s.tenants.forEach(t=>{t.serviceSeconds=5;t.staff=12;}));
    expect(more.metrics().waitMean).toBeLessThanOrEqual(baseline.metrics().waitMean);
    expect(more.metrics().contribution).toBeLessThan(baseline.metrics().contribution);
  });
  it('applies arrival waves and delays to the actual demand schedule',()=>{
    const baseline=run();
    const wave=run(s=>s.events.push({id:'wave',type:'arrival',start:600,duration:180,magnitude:120,target:'platform-a'}));
    expect(wave.metrics().arrivals-baseline.metrics().arrivals).toBe(120);
    expect(wave.metrics(600,780).arrivals-baseline.metrics(600,780).arrivals).toBe(120);
    const delayed=run(s=>s.events.push({id:'delay',type:'delay',start:220,duration:100,magnitude:180}));
    expect(delayed.metrics().arrivals).toBe(baseline.metrics().arrivals);
    expect(delayed.buckets.map(b=>b.arrivals)).not.toEqual(baseline.buckets.map(b=>b.arrivals));
  });
  it('reroutes a closed concourse edge onto a reachable bypass and changes passing',()=>{
    const baseline=run(); const closure=run(s=>s.events.push({id:'route',type:'closure',target:'central-route',start:0,duration:3600,magnitude:1}));
    expect(closure.metrics().arrivals).toBe(baseline.metrics().arrivals);
    expect(closure.metrics().tenants.map(t=>t.passing)).not.toEqual(baseline.metrics().tenants.map(t=>t.passing));
    expect(closure.metrics().departed).toBeGreaterThan(500);
    expect(closure.snapshot(700).agents.some(a=>a.state==='walking'&&a.y===1&&a.z>3)).toBe(true);
  });
  it('rain changes route and dwell without resampling the demand seed',()=>{
    const baseline=run();const rain=run(s=>s.events.push({id:'wet',type:'rain',start:0,duration:3600,magnitude:1}));
    expect(rain.metrics().arrivals).toBe(baseline.metrics().arrivals);
    expect(rain.snapshot(812)).not.toEqual(baseline.snapshot(812));
  });
  it('limits campaign lift to its window and counts qualified exposure from real trajectories',()=>{
    const baseline=run(); const campaign=run(s=>s.campaigns.push({id:'ad',name:'Coffee',screenId:'AD2',tenantId:'T2',start:1800,end:2400,budget:10000000,objective:'visits'}));
    expect(campaign.metrics(0,1800)).toEqual(baseline.metrics(0,1800));
    expect(campaign.metrics().qualifiedExposure).toBeGreaterThan(0);
    expect(campaign.metrics().qualifiedExposure).toBeLessThanOrEqual(campaign.metrics().exposure);
    expect(campaign.metrics().tenants.find(t=>t.tenantId==='T2')?.contribution).toBeLessThan(baseline.metrics().tenants.find(t=>t.tenantId==='T2')!.contribution);
    expect(campaign.metrics(2400,3000).tenants.find(t=>t.tenantId==='T2')?.campaignCost).toBe(0);
  });
  it('returns empty-window quantities safely without NaN, including tenant-scoped reports',()=>{
    const r=run();const m=r.metrics(900,900,'T2');
    expect(m.sales).toBe(0);expect(m.tenants).toHaveLength(1);expect(m.tenants[0].entryRate).toBe(null);
    expect(JSON.stringify(m)).not.toMatch(/NaN|Infinity/);
    expect(r.metrics(0,3600,'missing').tenants).toHaveLength(0);
  });
  it('captures an immutable scenario and isolates the baseline/proposed/stress branches',()=>{
    const s=copy(); const original=JSON.stringify(s);const r=simulate(s);
    const c=compareScenarios(s);
    expect(JSON.stringify(s)).toBe(original);
    expect(c.baseline.arrivals).toBe(c.proposed.arrivals);
    expect(c.stress.arrivals).toBeGreaterThan(c.proposed.arrivals);
    s.tenants[0].staff=0;
    expect(r.scenario.tenants[0].staff).toBe(2);
  });
  it('rejects invalid placements rather than producing impossible routes',()=>{
    expect(()=>run(s=>{s.tenants[0].unitId='missing';})).toThrow();
    expect(()=>run(s=>{s.tenants[1].unitId='U1';})).toThrow();
    expect(()=>run(s=>{s.tenants[0].staff=-1;})).toThrow();
  });
  it('keeps every unit reachable under a safe route closure, including the central bay',()=>{
    expect(()=>run(s=>{s.tenants.push({id:'T5',name:'Central coffee',category:'coffee',unitId:'U3',staff:2,size:'medium',rotation:0,open:0,close:3600,preparation:1});s.events.push({id:'closed',type:'closure',start:0,duration:3600,magnitude:1,target:'central-route'});})).not.toThrow();
  });
  it('moves continuously across a shop entry, browsing, queue, service and exit',()=>{
    const r=run();let checked=0;
    for(let t=0;t<1200;t+=.75){
      const before=new Map(r.snapshot(t).agents.map(a=>[a.id,a]));
      for(const a of r.snapshot(t+.25).agents){const b=before.get(a.id);if(!b)continue;const delta=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);expect(delta).toBeLessThan(1);checked++;}
    }
    expect(checked).toBeGreaterThan(1000);
  });
  it('walking paths respect occupied shop walls for every cardinal entrance rotation',()=>{
    for(const rotation of [0,90,180,270]){
      const r=run(s=>s.tenants.forEach(t=>{t.rotation=rotation;}));
      for(let time=100;time<1000;time+=3){
        for(const a of r.snapshot(time).agents.filter(a=>a.state==='walking'&&a.y===1&&!a.tenantId)){
          for(const tenant of r.scenario.tenants){const unit=(awaitUnit(tenant.unitId));expect(a.x>unit.x-unit.width/2+.15&&a.x<unit.x+unit.width/2-.15&&a.z>unit.z-unit.depth/2+.15&&a.z<unit.z+unit.depth/2-.15).toBe(false);}
        }
      }
    }
  });
  it('archived campaigns have no spending, exposure attribution or entry effect',()=>{
    const base=run();const archived=run(s=>s.campaigns.push({id:'old',name:'Archive',screenId:'AD2',tenantId:'T2',start:0,end:3600,budget:100000,objective:'visits',archived:true}));
    expect(archived.metrics()).toEqual(base.metrics());
    expect(archived.metrics(0,3600,'T2').exposure).toBe(0);
  });
  it('preserves unique people when an added arrival shares the authored train name',()=>{
    const result=run(s=>s.events.push({id:'train-1',type:'arrival',start:240,duration:60,magnitude:80,target:'platform-b'}));
    for(const time of [245,270,300,330]){const agents=result.snapshot(time).agents;expect(new Set(agents.map(a=>a.id)).size).toBe(agents.length);}
  });
  it('cannot mutate a captured scenario to change a cached replay result',()=>{
    const r=run();const before=r.metrics(0,1777);
    expect(()=>{r.scenario.tenants[0].staff=12;}).toThrow();
    expect(r.metrics(0,1777)).toEqual(before);
  });
  it('counts entry rate using the same passing cohort at arbitrary report boundaries',()=>{
    const r=run();for(let start=0;start<3600;start+=49){
      const m=r.metrics(start,start+17);
      for(const tenant of m.tenants)expect(tenant.entryRate===null||tenant.entryRate<1||tenant.visits===tenant.passing).toBe(true);
    }
  });
  it('serves the earliest waiting customer first, excluding already departed abandoners',()=>{
    const r=run(s=>{s.tenants=s.tenants.filter(t=>t.id==='T2');s.tenants[0].staff=1;s.events.push({id:'fifo-wave',type:'arrival',start:300,duration:60,magnitude:250,target:'platform-b'});});
    const joined=new Map<number,number>();let previous=r.snapshot(0);let checked=0;
    for(let time=.5;time<1200;time+=.5){
      const current=r.snapshot(time);const waiting=current.agents.filter(a=>a.state==='queue'&&a.tenantId==='T2');
      for(const a of waiting)if(!joined.has(a.id))joined.set(a.id,time);
      for(const a of current.agents.filter(a=>a.state==='service'&&a.tenantId==='T2')){
        if(previous.agents.some(b=>b.id===a.id&&b.state==='service')||!joined.has(a.id))continue;
        const priorWaiting=previous.agents.filter(b=>b.state==='queue'&&b.tenantId==='T2'&&joined.has(b.id));
        const earliest=Math.min(...priorWaiting.map(b=>joined.get(b.id)!));
        if(Number.isFinite(earliest)){expect(joined.get(a.id)!).toBeLessThanOrEqual(earliest+.5);checked++;}
      }
      previous=current;
    }
    expect(checked).toBeGreaterThan(4);
  });
  it('routes far platform passengers above the rails on the authored bridge',()=>{
    const r=run();let bridgePeople=0;
    for(let time=800;time<1100;time+=2)for(const a of r.snapshot(time).agents){
      if(a.z>11.05&&a.z<16.25){expect(a.y).toBe(2.65);expect(a.x).toBe(26);bridgePeople++;}
    }
    expect(bridgePeople).toBeGreaterThan(10);
  });
  it('completes an added train alighting wave before its bounded dwell ends',()=>{
    const baseline=run();const wave=run(s=>s.events.push({id:'long-dwell-wave',type:'arrival',start:600,duration:600,magnitude:120,target:'platform-a'}));
    expect(wave.metrics(600,840).arrivals-baseline.metrics(600,840).arrivals).toBe(120);
    expect(wave.metrics(840,1200).arrivals-baseline.metrics(840,1200).arrivals).toBe(0);
    expect(wave.snapshot(800).train.phase).toBe('dwell');
    expect(wave.snapshot(830).train.progress).toBeLessThan(1);
  });
  it('keeps browsing and service inside the frontage-aligned rendered footprint for all sizes and rotations',()=>{
    let observed=0;
    for(const size of ['small','medium','large'] as const)for(const rotation of [0,90,180,270]){
      const unit=awaitUnit(BASELINE.tenants[0].unitId),localWidth=size==='small'?3:size==='medium'?4:6,localDepth=size==='small'?2:size==='medium'?3:4,sideways=rotation%180!==0;
      const width=sideways?localDepth:localWidth,depth=sideways?localWidth:localDepth;
      if(width>unit.width||depth>unit.depth){expect(()=>run(s=>{s.tenants=[{...s.tenants[0],size,rotation}];})).toThrow();continue;}
      const r=run(s=>{s.tenants=[{...s.tenants[0],size,rotation}];});const tenant=r.scenario.tenants[0];
      const centerX=unit.x+(rotation===90?1:rotation===270?-1:0)*(unit.width-width)/2;
      const centerZ=unit.z+(rotation===90||rotation===270?0:(rotation===180?-1:1)*(unit.depth-depth)/2);
      for(let time=100;time<1400;time+=3)for(const a of r.snapshot(time).agents.filter(a=>a.tenantId===tenant.id&&(a.state==='browsing'||a.state==='service'))){
        expect(Math.abs(a.x-centerX)).toBeLessThanOrEqual(width/2+.001);expect(Math.abs(a.z-centerZ)).toBeLessThanOrEqual(depth/2+.001);observed++;
      }
    }
    expect(observed).toBeGreaterThan(100);
  });
  it('uses a distinct bounded purchases objective without forcing transactions or changing budget',()=>{
    const visits=run(s=>{s.tenants[1].staff=12;s.campaigns.push({id:'objective',name:'Coffee',screenId:'AD2',tenantId:'T2',start:0,end:3600,budget:250000,objective:'visits'});});
    const purchases=run(s=>{s.tenants[1].staff=12;s.campaigns.push({id:'objective',name:'Coffee',screenId:'AD2',tenantId:'T2',start:0,end:3600,budget:250000,objective:'purchases'});});
    const awareness=run(s=>{s.tenants[1].staff=12;s.campaigns.push({id:'objective',name:'Coffee',screenId:'AD2',tenantId:'T2',start:0,end:3600,budget:250000,objective:'awareness'});});
    const t=(r:ReturnType<typeof run>)=>r.metrics().tenants.find(t=>t.tenantId==='T2')!;
    expect(t(purchases).visits).not.toBe(t(awareness).visits);
    expect(t(purchases).campaignCost).toBe(t(visits).campaignCost);
    expect(purchases.metrics().exposure).toBe(visits.metrics().exposure);
    expect(t(purchases).transactions).toBeLessThan(t(purchases).visits);
  });
  it('contains a stress queue in the shop frontage while preserving the concourse route',()=>{
    const r=run(s=>{s.tenants[1].size='large';s.tenants[1].staff=1;s.tenants[1].serviceSeconds=600;s.events.push({id:'queue-pressure',type:'arrival',start:600,duration:150,magnitude:1500,target:'platform-a'});});
    const queued=r.snapshot(700).agents.filter(a=>a.state==='queue'&&a.tenantId==='T2');
    expect(queued.length).toBeGreaterThan(8);
    for(const a of queued)expect(Math.abs(a.z+2.8)).toBeGreaterThan(.55);
  });
  it('does not qualify a screen encounter using visibility outside the report window',()=>{
    const r=run();let exposureSeen=0;
    for(let time=0;time<100;time++){
      const m=r.metrics(time,time+1);exposureSeen+=m.exposure;expect(m.qualifiedExposure).toBe(0);
    }
    expect(exposureSeen).toBeGreaterThan(0);
  });
  it('returns both simultaneous trains on different platforms and preserves their identities',()=>{
    const r=run(s=>s.events.push({id:'parallel',type:'arrival',start:240,duration:60,magnitude:80,target:'platform-b'}));
    expect(r.snapshot(250).trains).toHaveLength(2);
    expect(r.snapshot(250).trains?.map(t=>t.platform)).toEqual([0,1]);
    expect(r.snapshot(250).trains?.map(t=>t.id)).toEqual(['train-1','arrival-parallel']);
  });
  it('rejects overlapping train bodies on one platform including approach and departure clearance',()=>{
    expect(()=>run(s=>s.events.push({id:'conflict',type:'arrival',start:240,duration:60,magnitude:80,target:'platform-a'}))).toThrow(/platform overlap/);
    expect(()=>run(s=>s.events.push({id:'conflict',type:'arrival',start:370,duration:60,magnitude:80,target:'platform-a'}))).toThrow(/platform overlap/);
    expect(()=>run(s=>s.events.push({id:'boundary',type:'arrival',start:375,duration:60,magnitude:80,target:'platform-a'}))).not.toThrow();
  });
  it('builds a valid stress branch when a proposed train occupies the usual stress slot',()=>{
    const s=copy();s.events.push({id:'already-present',type:'arrival',start:1200,duration:150,magnitude:90,target:'platform-a'});
    const compared=compareScenarios(s);
    expect(compared.stress.arrivals-compared.proposed.arrivals).toBe(180);
  });
});
