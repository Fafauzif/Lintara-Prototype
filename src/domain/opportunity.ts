import type {Language,Scenario,SimulationResult,Tenant,TenantMetrics} from './types';
import {CATEGORIES,DURATION,UNITS} from '../data/station';
import {canPlace,placeTenant,updateTenant,validateScenario} from './planning';
import {simulate} from '../simulation/engine';
import {time,windowLabel} from './period';

export interface OpportunityOutcome {
 tenant:Tenant;metrics:TenantMetrics;fixedCosts:number;breakEvenSales:number|null;breakEvenTransactions:number|null;
 grossPerTransaction:number;breakEvenBasis:'ledger'|'assumption';serviceCapacity:number;
 busiestSalesWindow:{start:number;end:number;sales:number;transactions:number};
 busiestArrivalWindow:{start:number;end:number;arrivals:number};
}
export interface SensitivityCase {key:'cautious'|'base'|'upside';basketFactor:number;purchaseProbability:number;outcome:OpportunityOutcome;}
export interface OpportunityCandidate {scenario:Scenario;outcome:OpportunityOutcome;delta:number;waitDelta:number;}
const finite=(value:number)=>Number.isFinite(value);
const bound=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

/** Approximate service capacity at the assumed average speed, before routing and queue losses. */
function capacity(scenario:Scenario,tenant:Tenant):number{
 const times=[0,DURATION,tenant.open,tenant.close,...scenario.events.filter(e=>e.target===tenant.id&&(e.type==='staff'||e.type==='closure')).flatMap(e=>[e.start,e.start+e.duration])].filter(t=>t>=0&&t<=DURATION).sort((a,b)=>a-b);
 let workerSeconds=0;
 for(let i=1;i<times.length;i++){
  const middle=(times[i]+times[i-1])/2;
  if(middle<tenant.open||middle>=tenant.close||scenario.events.some(e=>e.type==='closure'&&e.target===tenant.id&&middle>=e.start&&middle<e.start+e.duration))continue;
  const staff=Math.max(0,tenant.staff+scenario.events.filter(e=>e.type==='staff'&&e.target===tenant.id&&middle>=e.start&&middle<e.start+e.duration).reduce((sum,e)=>sum+Math.round(e.magnitude),0));
  workerSeconds+=(times[i]-times[i-1])*staff;
 }
 const parameters=CATEGORIES[tenant.category],taskFraction=bound(parameters.taskMinutesPerHour*tenant.preparation/60,0,.7);
 return Math.floor(workerSeconds*(1-taskFraction)/(tenant.serviceSeconds??parameters.service));
}

export function evaluateOpportunity(scenario:Scenario,tenantId:string,result?:SimulationResult):OpportunityOutcome{
 const tenant=scenario.tenants.find(t=>t.id===tenantId);if(!tenant)throw new Error('The selected tenant does not exist.');
 const simulation=result&&JSON.stringify(result.scenario)===JSON.stringify(scenario)?result:simulate(scenario),metrics=simulation.metrics(0,DURATION,tenantId).tenants[0];
 if(!metrics||metrics.tenantId!==tenantId||Object.values(metrics).some(value=>typeof value==='number'&&!finite(value)))throw new Error('Opportunity metrics must be finite and belong to the selected tenant.');
 const fixedCosts=metrics.labor+metrics.occupancyCost+metrics.campaignCost,parameters=CATEGORIES[tenant.category];
 const effectiveMargin=metrics.sales>0?metrics.grossMargin/metrics.sales:tenant.margin??parameters.margin;
 const ledger=metrics.transactions>0&&metrics.grossMargin>0,grossPerTransaction=ledger?metrics.grossMargin/metrics.transactions:(tenant.basket??parameters.basket)*(tenant.margin??parameters.margin);
 const windows=Array.from({length:Math.ceil(DURATION/300)},(_,index)=>{const start=index*300,end=Math.min(DURATION,start+300),m=simulation.metrics(start,end,tenantId);return {start,end,sales:m.sales,transactions:m.transactions,arrivals:m.arrivals};});
 const busiestSalesWindow=[...windows].sort((a,b)=>b.sales-a.sales||a.start-b.start)[0],busiestArrivalWindow=[...windows].sort((a,b)=>b.arrivals-a.arrivals||a.start-b.start)[0];
 return {tenant,metrics,fixedCosts,breakEvenSales:effectiveMargin>0&&grossPerTransaction>0?fixedCosts/effectiveMargin:null,breakEvenTransactions:grossPerTransaction>0?Math.ceil(fixedCosts/grossPerTransaction):null,grossPerTransaction,breakEvenBasis:ledger?'ledger':'assumption',serviceCapacity:capacity(scenario,tenant),busiestSalesWindow,busiestArrivalWindow};
}

/** Financial sensitivity uses identical traffic, service settings, seed and window. These are assumptions, not probabilities of a forecast. */
export function opportunitySensitivity(scenario:Scenario,tenantId:string,result?:SimulationResult):SensitivityCase[]{
 const tenant=scenario.tenants.find(t=>t.id===tenantId);if(!tenant)throw new Error('The selected tenant does not exist.');
 const basket=tenant.basket??CATEGORIES[tenant.category].basket,probability=tenant.purchaseProbability??.9;
 return ([['cautious',.85,-.1],['base',1,0],['upside',1.15,.05]] as const).map(([key,basketFactor,adjustment])=>{
  const purchaseProbability=bound(probability+adjustment,0,1);
  const plan=key==='base'?scenario:updateTenant(scenario,tenantId,{basket:bound(Math.round(basket*basketFactor),0,100000000),purchaseProbability});
  return {key,basketFactor,purchaseProbability,outcome:evaluateOpportunity(plan,tenantId,key==='base'?result:undefined)};
 });
}

/** Bounded search leaves every neighboring tenant and every demand assumption in place. */
export function findOpportunities(scenario:Scenario,tenantId:string,options:{unitIds?:string[];staffCounts?:number[]}={}):{current:OpportunityOutcome;candidates:OpportunityCandidate[];best:OpportunityCandidate|null}{
 const safe=validateScenario(scenario),tenant=safe.tenants.find(t=>t.id===tenantId);if(!tenant)throw new Error('The selected tenant does not exist.');
 const current=evaluateOpportunity(safe,tenantId),unitIds=[...new Set(options.unitIds??UNITS.filter(u=>u.id===tenant.unitId||!safe.tenants.some(t=>t.unitId===u.id)).map(u=>u.id))].slice(0,UNITS.length),staffCounts=[...new Set(options.staffCounts??[1,2,3,4])].filter(n=>Number.isInteger(n)&&n>=1&&n<=4).slice(0,4);
 const candidates:OpportunityCandidate[]=[];
 for(const unitId of unitIds){
  if(!canPlace(safe,tenant.category,unitId,tenant.size,tenant.rotation,tenantId).valid)continue;
  for(const staff of staffCounts){
   const moved=placeTenant(safe,tenant.category,unitId,tenant.size,tenant.rotation,tenantId);
   const plan=updateTenant(moved,tenantId,{staff});const outcome=evaluateOpportunity(plan,tenantId);
   candidates.push({scenario:plan,outcome,delta:outcome.metrics.contribution-current.metrics.contribution,waitDelta:outcome.metrics.waitMean-current.metrics.waitMean});
  }
 }
 candidates.sort((a,b)=>b.delta-a.delta||a.outcome.metrics.waitMean-b.outcome.metrics.waitMean||a.outcome.tenant.unitId.localeCompare(b.outcome.tenant.unitId)||a.outcome.tenant.staff-b.outcome.tenant.staff);
 return {current,candidates,best:candidates.find(candidate=>candidate.delta>0)??null};
}

/** Same bounded search, with browser yields between candidates so progress can paint. */
export async function findOpportunitiesAsync(scenario:Scenario,tenantId:string,onProgress?:(done:number,total:number)=>void,shouldContinue?:()=>boolean):Promise<ReturnType<typeof findOpportunities>>{
 const safe=validateScenario(scenario),tenant=safe.tenants.find(t=>t.id===tenantId);if(!tenant)throw new Error('The selected tenant does not exist.');
 const unitIds=UNITS.filter(u=>(u.id===tenant.unitId||!safe.tenants.some(t=>t.unitId===u.id))&&canPlace(safe,tenant.category,u.id,tenant.size,tenant.rotation,tenantId).valid).map(u=>u.id),current=evaluateOpportunity(safe,tenantId),candidates:OpportunityCandidate[]=[];
 let done=0;const total=unitIds.length*4;
 search:for(const unitId of unitIds)for(const staff of [1,2,3,4]){
  if(shouldContinue&&!shouldContinue())break search;
  const found=findOpportunities(safe,tenantId,{unitIds:[unitId],staffCounts:[staff]});candidates.push(...found.candidates);onProgress?.(++done,total);
  await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 candidates.sort((a,b)=>b.delta-a.delta||a.outcome.metrics.waitMean-b.outcome.metrics.waitMean||a.outcome.tenant.unitId.localeCompare(b.outcome.tenant.unitId)||a.outcome.tenant.staff-b.outcome.tenant.staff);
 return {current,candidates,best:candidates.find(candidate=>candidate.delta>0)??null};
}

/** Tenant-scoped printable text. No other tenant identity or individual finances are included. */
export function opportunityBrief(scenario:Scenario,tenantId:string,lang:Language,result?:SimulationResult):string{
 const cases=opportunitySensitivity(scenario,tenantId,result),out=cases[1].outcome,tenant=out.tenant,p=CATEGORIES[tenant.category],unit=UNITS.find(u=>u.id===tenant.unitId)!;
 const id=lang==='id',currency=(v:number|null)=>v===null?'—':new Intl.NumberFormat(id?'id-ID':'en-US',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(v),num=(v:number)=>new Intl.NumberFormat(id?'id-ID':'en-US',{maximumFractionDigits:2}).format(v);
 const rows=[
  id?'LINTARA · RINGKASAN PELUANG USAHA':'LINTARA · BUSINESS OPPORTUNITY BRIEF',
  `${tenant.name} · ${id?'Unit':'Unit'} ${tenant.unitId} · ${windowLabel(scenario)}`,
  id?'Hasil simulasi satu jam; bukan pengukuran arus nyata atau jaminan pendapatan.':'Simulated one-hour outcomes; not measured traffic or guaranteed income.',
  `${id?'Seed':'Seed'}: ${scenario.seed} · ${id?'Asumsi permintaan':'Assumed demand'}: ${scenario.crowd??'legacy'}`,
  '',id?'ASUMSI YANG DAPAT DIUBAH':'EDITABLE ASSUMPTIONS',
  `${id?'Staf':'Staff'}: ${tenant.staff}; ${id?'belanja':'basket'}: ${currency(tenant.basket??p.basket)}; ${id?'margin kotor':'gross margin'}: ${num((tenant.margin??p.margin)*100)}%; ${id?'upah per staf per jam':'wage per worker per hour'}: ${currency(tenant.wagePerHour??p.wagePerHour)}; ${id?'peluang beli setelah dilayani':'purchase probability after service'}: ${num((tenant.purchaseProbability??.9)*100)}%; ${id?'ruang per hari':'occupancy per day'}: ${currency(tenant.occupancyPerDay??unit.rentPerDay)}`,
  '',id?'BUKTI PERIODE MODEL':'MODEL WINDOW EVIDENCE',
  `${id?'Melintas':'Passing'}: ${out.metrics.passing}; ${id?'kunjungan':'visits'}: ${out.metrics.visits}; ${id?'kunjungan selesai':'completed visits'}: ${out.metrics.completed}; ${id?'transaksi':'transactions'}: ${out.metrics.transactions}`,
  `${id?'Konversi kunjungan selesai':'Completed-visit conversion'}: ${out.metrics.conversion===null?'—':num(out.metrics.conversion*100)+'%'} (${id?'pembeli di antara kunjungan yang selesai':'purchasers among completed visits'})`,
  `${id?'Penjualan':'Sales'}: ${currency(out.metrics.sales)}; ${id?'margin kotor':'gross margin'}: ${currency(out.metrics.grossMargin)}; ${id?'tenaga kerja':'labor'}: ${currency(out.metrics.labor)}; ${id?'alokasi ruang':'occupancy allocation'}: ${currency(out.metrics.occupancyCost)}; ${id?'kampanye':'campaigns'}: ${currency(out.metrics.campaignCost)}; ${id?'kontribusi':'contribution'}: ${currency(out.metrics.contribution)}`,
  `${id?'Penjualan impas':'Break-even sales'}: ${currency(out.breakEvenSales)}; ${id?'transaksi impas':'break-even transactions'}: ${out.breakEvenTransactions??'—'}; ${id?'dasar':'basis'}: ${out.breakEvenBasis==='ledger'?(id?'rata-rata margin transaksi dalam ledger':'average transaction gross margin from ledger'):(id?'asumsi belanja × margin':'assumed basket × margin')}`,
  `${id?'Perkiraan kapasitas pelayanan':'Approximate service capacity'}: ${out.serviceCapacity}; ${id?'waktu pelayanan':'service time'}: ${tenant.serviceSeconds??p.service} s; ${id?'faktor persiapan':'preparation factor'}: ${tenant.preparation}`,
  `${id?'Periode penjualan tersibuk':'Busiest modeled sales window'}: ${time(out.busiestSalesWindow.start,scenario)}–${time(out.busiestSalesWindow.end,scenario)} WIB; ${currency(out.busiestSalesWindow.sales)}; ${id?'transaksi':'transactions'}: ${out.busiestSalesWindow.transactions}`,
  `${id?'Periode kedatangan tersibuk':'Busiest modeled arrival window'}: ${time(out.busiestArrivalWindow.start,scenario)}–${time(out.busiestArrivalWindow.end,scenario)} WIB; ${out.busiestArrivalWindow.arrivals} ${id?'kedatangan stasiun':'station arrivals'}`,
  '',id?'UJI SENSITIVITAS':'SENSITIVITY',
  ...cases.map(c=>`${id?({cautious:'Hati-hati',base:'Dasar',upside:'Potensi naik'}[c.key]):({cautious:'Cautious',base:'Base',upside:'Upside'}[c.key])}: ${id?'belanja':'basket'} ×${c.basketFactor}, ${id?'peluang beli setelah dilayani':'purchase probability after service'} ${num(c.purchaseProbability*100)}%; ${id?'penjualan':'sales'} ${currency(c.outcome.metrics.sales)}, ${id?'kontribusi':'contribution'} ${currency(c.outcome.metrics.contribution)}`),
  '',id?'Ketiga kasus menggunakan seed, arus, kapasitas, dan periode yang sama. Potensi naik adalah asumsi yang dapat diuji, bukan janji.':'All three cases use the same seed, traffic, capacity and window. Upside is a testable assumption, not a promise.',
  id?'Kontribusi = margin kotor − tenaga kerja − alokasi ruang − kampanye. Biaya ruang dibagi proporsional sepanjang hari kalender 24 jam; penjualan satu jam tidak dikalikan menjadi pendapatan harian atau bulanan.':'Contribution = gross margin − labor − occupancy allocation − campaigns. Occupancy is prorated over a 24-hour calendar day; one-hour sales are not multiplied into daily or monthly income.',
  id?'Bentuk ruang, arus, biaya dan koefisien model merupakan asumsi yang disusun. Ringkasan hanya memuat toko yang dipilih.':'Commercial geometry, traffic, costs and model coefficients are authored assumptions. This brief contains only the selected shop.'
 ];return rows.join('\n');
}
