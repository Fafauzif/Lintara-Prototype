import { afterEach, describe, expect, it, vi } from 'vitest';
import { freshScenario } from '../src/data/station';
import { loadPlans, savePlans } from '../src/state/persistence';
import { downloadCSV, downloadJSON, downloadTenantJSON, printReport } from '../src/reports/export';
import * as engine from '../src/simulation/engine';
import type { Metrics, SimulationResult } from '../src/domain/types';

afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();});
function memoryStorage() {
  const values=new Map<string,string>();
  return {getItem:vi.fn((key:string)=>values.get(key)??null),setItem:vi.fn((key:string,value:string)=>{values.set(key,value);}),removeItem:vi.fn((key:string)=>values.delete(key))};
}
describe('resilient local plan storage',()=>{
  it('round trips validated detached configuration in a versioned wrapper',()=>{
    const storage=memoryStorage();vi.stubGlobal('localStorage',storage);
    const plan=freshScenario();
    expect(savePlans([plan])).toEqual({ok:true});
    expect(storage.setItem).toHaveBeenCalledWith('lintara.plans.v1',expect.any(String));
    expect(loadPlans()).toEqual({plans:[plan]});
  });
  it('round trips purchase-objective campaigns through persisted plan configuration',()=>{
    const storage=memoryStorage();vi.stubGlobal('localStorage',storage);
    const plan=freshScenario();
    plan.campaigns=[{id:'C1',name:'Morning offer',screenId:'AD1',tenantId:'T2',start:0,end:600,budget:20000,objective:'purchases'}];
    expect(savePlans([plan])).toEqual({ok:true});
    expect(loadPlans().plans[0].campaigns[0].objective).toBe('purchases');
  });
  it('handles quota or storage denial with an actionable error',()=>{
    vi.stubGlobal('localStorage',{getItem(){throw new Error('denied');},setItem(){throw new Error('quota');}});
    expect(loadPlans().error).toMatch(/storage|saved/i);
    expect(savePlans([freshScenario()])).toMatchObject({ok:false,error:expect.any(String)});
  });
  it('rejects corrupt and unsupported data without erasing it',()=>{
    const storage=memoryStorage();vi.stubGlobal('localStorage',storage);
    storage.setItem('lintara.plans.v1','{broken');
    expect(loadPlans()).toMatchObject({plans:[],error:expect.any(String)});
    expect(storage.removeItem).not.toHaveBeenCalled();
    storage.setItem('lintara.plans.v1',JSON.stringify({version:9,plans:[]}));
    expect(loadPlans().error).toMatch(/version/i);
  });
  it('rejects invalid and duplicate plans before overwriting existing saved data',()=>{
    const storage=memoryStorage();vi.stubGlobal('localStorage',storage);
    expect(savePlans([freshScenario()]).ok).toBe(true);
    const before=storage.getItem('lintara.plans.v1');
    const invalid=freshScenario();invalid.tenants[0].staff=-2;
    expect(savePlans([invalid]).ok).toBe(false);
    expect(savePlans([freshScenario(),freshScenario()]).ok).toBe(false);
    expect(storage.getItem('lintara.plans.v1')).toBe(before);
  });
  it('does not reference browser globals unguarded in a server environment',()=>{
    vi.stubGlobal('localStorage',undefined);
    expect(()=>loadPlans()).not.toThrow();
    expect(savePlans([freshScenario()]).ok).toBe(false);
  });
  it('also handles the browser localStorage getter throwing before methods are accessed',()=>{
    vi.stubGlobal('localStorage',undefined);
    Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('SecurityError');}});
    expect(loadPlans()).toMatchObject({plans:[],error:expect.stringMatching(/SecurityError/)});
    expect(savePlans([freshScenario()])).toMatchObject({ok:false});
  });
});

describe('current-plan download contracts',()=>{
  function browserDownload() {
    vi.useFakeTimers();
    const anchor={href:'',download:'',style:{display:''},click:vi.fn(),remove:vi.fn()};
    vi.stubGlobal('document',{createElement:()=>anchor,body:{append:vi.fn()}});
    const objectURL=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:lintara-test');
    const revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
    return {anchor,objectURL,revoke};
  }
  it('exports validated JSON and always revokes the object URL after download',async()=>{
    const browser=browserDownload();
    const plan=freshScenario();plan.name='My plan';
    downloadJSON(plan);
    const contents=await (browser.objectURL.mock.calls[0][0] as Blob).text();
    expect(JSON.parse(contents)).toEqual(plan);
    expect(browser.anchor.download).toBe('My-plan.lintara.json');
    expect(browser.anchor.click).toHaveBeenCalledOnce();
    expect(browser.anchor.remove).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(browser.revoke).toHaveBeenCalledWith('blob:lintara-test');
  });
  it('uses selected model numbers, explicit windows and units, and escapes spreadsheet formulas',async()=>{
    const browser=browserDownload();
    const scenario=freshScenario();scenario.name='=2+2';
    const metrics:Metrics={start:300,end:900,arrivals:11,departed:4,present:7,visits:5,transactions:3,sales:98765,contribution:-42,waitMean:2,waitP90:3,abandoned:1,exposure:30,qualifiedExposure:12,tenants:[]};
    const getMetrics=vi.fn(()=>metrics);
    const result:SimulationResult={scenario,duration:3600,metrics:getMetrics,buckets:[],snapshot:()=>({time:0,agents:[],present:0,queues:{},train:{phase:'absent',progress:0,platform:0}})};
    downloadCSV(result,300,900);
    const contents=await (browser.objectURL.mock.calls[0][0] as Blob).text();
    expect(getMetrics).toHaveBeenCalledWith(300,900);
    expect(contents).toContain("'=2+2");
    expect(contents).toContain('sales,98765,IDR,300,900,07:05:00 WIB,07:15:00 WIB');
    expect(contents).toContain('contribution,-42,IDR');
    expect(contents).toContain('waitMean,2,minutes');
    expect(()=>downloadCSV(result,1000,500)).toThrow(/period/i);
  });
  it('prints a same-window model comparison with escaped user text and inline brand assets',()=>{
    const scenario=freshScenario();scenario.name='</title><script>danger()</script>';
    const metrics:Metrics={start:300,end:900,arrivals:11,departed:4,present:7,visits:5,transactions:3,sales:98765,contribution:-42,waitMean:2,waitP90:3,abandoned:1,exposure:30,qualifiedExposure:12,tenants:[]};
    const compare=vi.spyOn(engine,'compareScenarios').mockReturnValue({baseline:{...metrics,contribution:10},proposed:metrics,stress:{...metrics,contribution:-100}});
    const doc={open:vi.fn(),write:vi.fn(),close:vi.fn()};
    const reportWindow={opener:{},document:doc,close:vi.fn()};
    vi.stubGlobal('window',{open:vi.fn(()=>reportWindow)});
    const result:SimulationResult={scenario,duration:3600,metrics:()=>metrics,buckets:[],snapshot:()=>({time:0,agents:[],present:0,queues:{},train:{phase:'absent',progress:0,platform:0}})};
    printReport(result,300,900);
    expect(compare).toHaveBeenCalledWith(scenario,300,900);
    const output=doc.write.mock.calls[0][0] as string;
    expect(output).toContain('&lt;script&gt;danger()&lt;/script&gt;');
    expect(output).not.toContain('<script>danger()');
    expect(output).toContain('07:05:00 WIB–07:15:00 WIB');
    expect(output).toContain('Rp 98.765');
    expect(output).toContain('<svg');
    expect(output).not.toMatch(/<(?:img|script|link)[^>]+(?:src|href)=/);
    expect(reportWindow.opener).toBeNull();
  });
  it('keeps competitor inputs and financial results out of tenant JSON/CSV/print',async()=>{
    const browser=browserDownload();
    const scenario=freshScenario();scenario.tenants[0].name='CONFIDENTIAL COMPETITOR';
    scenario.campaigns=[{id:'C1',name:'CONFIDENTIAL AD',screenId:'AD1',tenantId:'T1',start:0,end:600,budget:100000,objective:'visits'},{id:'C2',name:'My campaign',screenId:'AD1',tenantId:'T2',start:0,end:600,budget:50000,objective:'purchases'}];
    scenario.events=[{id:'rival-staff-secret',type:'staff',start:200,duration:600,magnitude:1,target:'T1'}];
    downloadJSON(scenario,'T2');
    const ownJSON=await (browser.objectURL.mock.calls[0][0] as Blob).text();
    expect(ownJSON).not.toContain('CONFIDENTIAL COMPETITOR');
    expect(ownJSON).not.toContain('CONFIDENTIAL AD');
    expect(ownJSON).not.toContain('rival-staff-secret');
    expect(JSON.parse(ownJSON).type).toBe('lintara-tenant-configuration');
    const base={passing:100,visits:20,completed:18,transactions:15,abandoned:2,sales:1234567,grossMargin:500000,labor:20000,occupancyCost:30000,campaignCost:0,contribution:450000,entryRate:.2,conversion:.83,waitMean:1,waitP90:2,dwellMean:3,queueLength:2,workload:15,coverage:3};
    const own={...base,tenantId:'T2',sales:654321,contribution:120000};
    const rival={...base,tenantId:'T1'};
    const metrics:Metrics={start:0,end:3600,arrivals:100,departed:40,present:60,visits:40,transactions:30,sales:1888888,contribution:570000,waitMean:1,waitP90:2,abandoned:4,exposure:30,qualifiedExposure:12,tenants:[rival,own]};
    const result:SimulationResult={scenario,duration:3600,metrics:vi.fn(()=>metrics),buckets:[],snapshot:()=>({time:0,agents:[],present:0,queues:{},train:{phase:'absent',progress:0,platform:0}})};
    downloadCSV(result,0,3600,'T2');
    const ownCSV=await (browser.objectURL.mock.calls[1][0] as Blob).text();
    expect(ownCSV).not.toContain('CONFIDENTIAL COMPETITOR');
    expect(ownCSV).not.toContain('1234567');
    expect(ownCSV).not.toContain('1888888');
    expect(ownCSV).toContain('654321');
    downloadTenantJSON(result,'T2',0,3600);
    const ownReport=JSON.parse(await (browser.objectURL.mock.calls[2][0] as Blob).text());
    expect(ownReport.type).toBe('lintara-tenant-report');
    expect(ownReport.metrics).toHaveLength(1);
    expect(ownReport.metrics[0].tenantId).toBe('T2');
    vi.spyOn(engine,'compareScenarios').mockReturnValue({baseline:metrics,proposed:metrics,stress:metrics});
    vi.spyOn(engine,'simulate').mockReturnValue(result);
    const doc={open:vi.fn(),write:vi.fn(),close:vi.fn()};
    vi.stubGlobal('window',{open:vi.fn(()=>({opener:null,document:doc,close:vi.fn()}))});
    printReport(result,0,3600,'T2','id');
    const printed=doc.write.mock.calls[0][0] as string;
    expect(printed).not.toContain('CONFIDENTIAL COMPETITOR');
    expect(printed).not.toContain('CONFIDENTIAL AD');
    expect(printed).not.toContain('1.234.567');
    expect(printed).not.toContain('1.888.888');
    expect(printed).toContain('654.321');
    expect(printed).toContain('Laporan usaha');
    expect(printed).toContain('Pembelian');
  });
});
