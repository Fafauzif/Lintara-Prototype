/// <reference types="vite/client" />
import type { Language, Metrics, Scenario, SimulationResult, TenantMetrics } from '../domain/types';
import reportLogo from '../../public/brand/svg/lintara-horizontal-mono-navy.svg?raw';
import { BASELINE, CATEGORIES, UNITS } from '../data/station';
import { validateScenario } from '../domain/planning';
import { compareScenarios } from '../simulation/engine';
import {periodProfile,startHourOf} from '../domain/period';
import type {PeriodContext} from '../domain/period';

function filename(name:string) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'lintara-plan';
}
function download(contents:string,mime:string,name:string) {
  if(typeof document==='undefined'||typeof URL.createObjectURL!=='function')throw new Error('Downloads require a browser.');
  const url=URL.createObjectURL(new Blob([contents],{type:mime}));
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=name;anchor.style.display='none';
  try{document.body.append(anchor);anchor.click();}finally{anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
function tenantConfiguration(scenario:Scenario,tenantId:string) {
  const safe=validateScenario(scenario);
  const tenant=safe.tenants.find(t=>t.id===tenantId);
  if(!tenant)throw new Error('The selected tenant does not exist.');
  return {version:1,type:'lintara-tenant-configuration',scenario:{id:safe.id,name:safe.name,seed:safe.seed,...(safe.crowd?{crowd:safe.crowd}:{}),...(safe.period!==undefined?{period:safe.period}:{}),...(safe.startHour!==undefined?{startHour:safe.startHour}:{})},tenant,campaigns:safe.campaigns.filter(c=>c.tenantId===tenantId),events:safe.events.filter(e=>e.target===tenantId)};
}
export function downloadJSON(scenario:Scenario,tenantId?:string):void {
  const configuration=tenantId?tenantConfiguration(scenario,tenantId):validateScenario(scenario);
  const name='tenant' in configuration?configuration.tenant.name:configuration.name;
  download(JSON.stringify(configuration,null,2),'application/json',`${filename(name)}${tenantId?'.tenant':'.lintara'}.json`);
}
export function downloadTenantJSON(result:SimulationResult,tenantId:string,start=0,end=result.duration):void {
  const configuration=tenantConfiguration(result.scenario,tenantId);
  const metrics=windowMetrics(result,start,end,tenantId);
  download(JSON.stringify({...configuration,type:'lintara-tenant-report',window:{start,end,startLocal:reportTime(start,result.scenario),endLocal:reportTime(end,result.scenario),timezone:'Asia/Jakarta',period:periodProfile(result.scenario).period,startHour:startHourOf(result.scenario)},metrics:metrics.tenants},null,2),'application/json',`${filename(configuration.tenant.name)}-report.json`);
}
function csv(value:string|number|null) {
  if(value===null)return '';
  // Spreadsheet formulas are escaped only in text. Negative numeric values remain numbers.
  let string=String(value);
  if(typeof value==='string'&&/^[\s]*[=+\-@]/.test(string))string=`'${string}`;
  if(/[",\r\n]/.test(string))string=`"${string.replace(/"/g,'""')}"`;
  return string;
}
function reportTime(seconds:number,scenario:PeriodContext={}) {
  const total=startHourOf(scenario)*3600+Math.round(seconds);
  return `${String(Math.floor(total/3600)).padStart(2,'0')}:${String(Math.floor(total%3600/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')} WIB`;
}
const stationFields:Array<[keyof Omit<Metrics,'tenants'>,string]>=[
  ['arrivals','passengers'],['departed','passengers'],['present','passengers'],['visits','visits'],['transactions','transactions'],['sales','IDR'],['contribution','IDR'],['waitMean','minutes'],['waitP90','minutes'],['abandoned','visits'],['exposure','exposures'],['qualifiedExposure','exposures']
];
const tenantFields:Array<[keyof Omit<TenantMetrics,'tenantId'>,string]>=[
  ['passing','passengers'],['visits','visits'],['completed','visits'],['transactions','transactions'],['abandoned','visits'],['sales','IDR'],['grossMargin','IDR'],['labor','IDR'],['occupancyCost','IDR'],['campaignCost','IDR'],['contribution','IDR'],['entryRate','fraction'],['conversion','fraction'],['waitMean','minutes'],['waitP90','minutes'],['dwellMean','minutes'],['queueLength','passengers'],['workload','worker-minutes'],['coverage','fraction']
];
function scopeMetrics(metrics:Metrics,tenantId:string):Metrics {
  const tenants=metrics.tenants.filter(t=>t.tenantId===tenantId);
  const sum=(field:'visits'|'transactions'|'sales'|'contribution'|'abandoned')=>tenants.reduce((n,t)=>n+t[field],0);
  return {...metrics,tenants,visits:sum('visits'),transactions:sum('transactions'),sales:sum('sales'),contribution:sum('contribution'),abandoned:sum('abandoned'),waitMean:tenants[0]?.waitMean??0,waitP90:tenants[0]?.waitP90??0};
}
function windowMetrics(result:SimulationResult,start=0,end=result.duration,tenantId?:string) {
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>result.duration||end<=start)throw new Error('Choose a report period inside the simulation with end after start.');
  if(tenantId&&!result.scenario.tenants.some(t=>t.id===tenantId))throw new Error('The selected tenant does not exist.');
  return tenantId?scopeMetrics(result.metrics(start,end,tenantId),tenantId):result.metrics(start,end);
}
export function downloadCSV(result:SimulationResult,start=0,end=result.duration,tenantId?:string):void {
  const time=(seconds:number)=>reportTime(seconds,result.scenario);
  const metrics=windowMetrics(result,start,end,tenantId);
  const headers=['scenario_id','scenario_name','entity_type','entity_id','entity_name','metric','value','unit','start_seconds','end_seconds','start_local','end_local'];
  const rows:Array<Array<string|number|null>>=[headers];
  const add=(type:string,id:string,name:string,metric:string,value:string|number|null,unit:string)=>rows.push([result.scenario.id,result.scenario.name,type,id,name,metric,value,unit,metrics.start,metrics.end,time(metrics.start),time(metrics.end)]);
  if(!tenantId)for(const [field,unit] of stationFields)add('station','sudirman','Sudirman',field,metrics[field],unit);
  for(const tenant of metrics.tenants){
    const name=result.scenario.tenants.find(t=>t.id===tenant.tenantId)?.name??tenant.tenantId;
    for(const [field,unit] of tenantFields)add('tenant',tenant.tenantId,name,field,tenant[field],unit);
  }
  const notes=[[result.scenario.id,result.scenario.name,'metadata',result.scenario.id,result.scenario.name,'model_note','Authored planning scenario; financial values are estimates, not observed KAI data.','text',metrics.start,metrics.end,time(metrics.start),time(metrics.end)]];
  add('metadata',result.scenario.id,result.scenario.name,'demand_assumption',result.scenario.crowd??'legacy','text');
  const profile=periodProfile(result.scenario);
  add('metadata',result.scenario.id,result.scenario.name,'model_period',profile.period,'text');
  add('metadata',result.scenario.id,result.scenario.name,'model_start_hour',profile.startHour,'hour');
  add('metadata',result.scenario.id,result.scenario.name,'hourly_demand_factor',profile.hourlyDemandFactor,'factor');
  add('metadata',result.scenario.id,result.scenario.name,'boarding_probability',profile.boardingProbability,'fraction');
  download('\uFEFF'+[...rows,...notes].map(row=>row.map(csv).join(',')).join('\r\n'),'text/csv;charset=utf-8',`${filename(result.scenario.name)}-${Math.round(start)}-${Math.round(end)}.csv`);
}
function html(value:string|number) {
  return String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
}
const money=(value:number)=>`Rp ${Math.round(value).toLocaleString('id-ID')}`;
const number=(value:number)=>value.toLocaleString('en-GB',{maximumFractionDigits:2});
const costs=(metric:Metrics)=>metric.tenants.reduce((sum,t)=>({labor:sum.labor+t.labor,occupancy:sum.occupancy+t.occupancyCost,campaign:sum.campaign+t.campaignCost}),{labor:0,occupancy:0,campaign:0});

const reportID:Record<string,string>={
 Awareness:'Pengenalan merek',Purchases:'Pembelian',
 'Model period':'Periode model','Model start hour':'Jam awal model','Authored daypart assumptions':'Asumsi periode yang disusun',morning:'Pagi',midday:'Siang',evening:'Sore',
 'Background traffic':'Arus latar','Scheduled alighting':'Turun dari kereta terjadwal','Boarding share':'Porsi perjalanan naik kereta','Patience factor':'Faktor kesabaran','Category attraction':'Daya tarik kategori',
 'Wage / hour':'Upah / jam','Purchase probability':'Peluang pembelian',
 'These coefficients and hourly demand factors are authored planning assumptions, not measured station traffic.':'Koefisien dan faktor arus per jam ini merupakan asumsi perencanaan yang disusun, bukan arus stasiun yang diukur.',
 'Print / Save PDF':'Cetak / Simpan PDF',Close:'Tutup laporan','Station Intelligence':'Inteligensi Stasiun','Sudirman station':'Stasiun Sudirman','Planning report':'Laporan perencanaan','Business report':'Laporan usaha','Reporting window':'Periode laporan',Scenario:'Rencana','Assumed demand':'Asumsi arus',normal:'Normal',busy:'Ramai',legacy:'Versi awal',Seed:'Nilai acak','simulated minutes':'menit simulasi','tenants in the authored baseline':'toko dalam rencana awal','in this plan':'dalam rencana ini','Scenario comparison':'Perbandingan rencana',Baseline:'Rencana awal',Proposed:'Usulan',Stress:'Tekanan',Metric:'Indikator','Passenger arrivals':'Kedatangan penumpang','Passing traffic':'Penumpang yang lewat','Tenant visits':'Kunjungan toko',Transactions:'Transaksi',Sales:'Penjualan',Labor:'Biaya staf',Occupancy:'Biaya sewa','Campaign cost':'Biaya kampanye',Contribution:'Kontribusi','Mean queue wait (minutes)':'Rata-rata tunggu (menit)','90th percentile wait (minutes)':'Persentil 90 waktu tunggu (menit)','Abandoned visits':'Kunjungan yang batal','Decision evidence':'Dasar keputusan','Proposed tenant results':'Hasil toko pada usulan',Tenant:'Toko',Visits:'Kunjungan','Total cost':'Total biaya','Mean wait (min)':'Rata-rata tunggu (menit)','Plan inputs':'Masukan rencana',Unit:'Unit','Category / footprint':'Kategori / ukuran',Staff:'Staf',Hours:'Jam',Basket:'Nilai belanja','Service / preparation':'Pelayanan / persiapan','Gross margin':'Margin kotor','Rent per day':'Sewa per hari',Interventions:'Kejadian',Advertising:'Iklan','No interventions.':'Tidak ada kejadian.','No campaigns.':'Tidak ada kampanye.','No tenants in this plan.':'Belum ada toko dalam rencana ini.',magnitude:'besaran',target:'tujuan',budget:'anggaran','archived; inactive':'diarsipkan; tidak aktif',awareness:'pengenalan merek',visits:'kunjungan',arrival:'kedatangan',delay:'keterlambatan',rain:'hujan',closure:'penutupan',staff:'staf',bakery:'roti',coffee:'kopi',meals:'makanan',retail:'ritel',small:'kecil',medium:'sedang',large:'besar',
 'Contribution = gross margin − labor − prorated occupancy − campaign cost.':'Kontribusi = margin kotor − biaya staf − sewa sesuai periode − biaya kampanye.',
 'Baseline, proposed and stress use the same model, seed and reporting window.':'Rencana awal, usulan, dan tekanan memakai model, nilai acak, serta periode laporan yang sama.',
 'Stress adds a safely scheduled arrival surge and rain; one coffee service worker is absent when a coffee shop exists.':'Skenario tekanan menambah gelombang penumpang pada jadwal yang aman dan hujan. Jika ada toko kopi, satu staf pelayanannya absen.',
 'Higher footfall alone does not guarantee better contribution. Consider service capacity and the cost of the intervention together.':'Jumlah penumpang yang tinggi belum menjamin kontribusi yang lebih baik. Nilai kapasitas pelayanan dan biaya perubahan secara bersamaan.',
 'Only your shop inputs, campaigns and financial results are included. Neighboring business details remain private.':'Laporan ini hanya memuat masukan, kampanye, dan hasil keuangan toko Anda. Rincian usaha lain tetap pribadi.',
 'No matching shop exists in the baseline; its baseline business results are zero.':'Toko yang sama belum ada dalam rencana awal; hasil usahanya pada rencana awal bernilai nol.',
 'Lintara is a planning simulation. Commercial geometry and coefficients are authored assumptions, not measured KAI operating data. Financial outputs are estimates in IDR for the selected period; this report is not a safety assessment or financial guarantee. All report calculations come from the current scenario model.':'Lintara adalah simulasi perencanaan. Bentuk ruang usaha dan koefisien merupakan asumsi yang disusun, bukan data operasi KAI yang diukur. Hasil keuangan adalah perkiraan dalam rupiah untuk periode pilihan. Laporan ini bukan penilaian keselamatan atau jaminan keuangan. Semua perhitungan berasal dari model rencana aktif.'
};
export function printReport(result:SimulationResult,start=0,end=result.duration,tenantId?:string,lang:Language='en'):void {
  const time=(seconds:number)=>reportTime(seconds,result.scenario);
  const profile=periodProfile(result.scenario);
  const proposed=windowMetrics(result,start,end,tenantId);
  const own=tenantId?result.scenario.tenants.find(t=>t.id===tenantId):undefined;
  const r=(key:string)=>lang==='id'?reportID[key]??key:key;
  const displayName=own?.name??result.scenario.name;
  if(typeof window==='undefined')throw new Error('Printing requires a browser.');
  const report=window.open('','_blank','width=1024,height=760');
  if(!report)throw new Error('The report window was blocked. Allow pop-ups for Lintara, then try again.');
  report.opener=null;
  let comparison;
  try{
    const compared=compareScenarios(result.scenario,start,end);
    comparison={baseline:tenantId?scopeMetrics(compared.baseline,tenantId):compared.baseline,proposed,stress:tenantId?scopeMetrics(compared.stress,tenantId):compared.stress};
  }catch(error){report.close();throw error;}
  const series=[['Baseline',comparison.baseline],['Proposed',comparison.proposed],['Stress',comparison.stress]] as const;
  const row=(label:string,get:(metric:Metrics)=>string)=>`<tr><th>${r(label)}</th>${series.map(([,metric])=>`<td>${html(get(metric))}</td>`).join('')}</tr>`;
  const delta=proposed.contribution-comparison.baseline.contribution;
  const waitDelta=proposed.waitMean-comparison.baseline.waitMean;
  const conclusion=lang==='id'?(delta>0?`Usulan meningkatkan perkiraan kontribusi sebesar ${money(delta)} dalam periode ini.`:delta<0?`Usulan menurunkan perkiraan kontribusi sebesar ${money(Math.abs(delta))} dalam periode ini. Periksa biaya staf, sewa, dan kampanye.`:'Perkiraan kontribusi usulan sama dengan rencana awal dalam periode ini.'):(delta>0?`The proposed plan improves estimated contribution by ${money(delta)} in this period.`:delta<0?`The proposed plan reduces estimated contribution by ${money(Math.abs(delta))} in this period. Review its staffing, occupancy and campaign costs.`:'The proposed plan has the same estimated contribution as the baseline in this period.');
  const waitNote=lang==='id'?(waitDelta<0?`Rata-rata tunggu turun ${number(-waitDelta)} menit.`:waitDelta>0?`Rata-rata tunggu naik ${number(waitDelta)} menit.`:'Rata-rata tunggu tetap sama.'):(waitDelta<0?`Mean queue wait falls by ${number(-waitDelta)} minutes.`:waitDelta>0?`Mean queue wait increases by ${number(waitDelta)} minutes.`:'Mean queue wait remains unchanged.');
  const chosenTenants=result.scenario.tenants.filter(t=>!tenantId||t.id===tenantId);
  const tenants=chosenTenants.map(tenant=>{
    const parameters=CATEGORIES[tenant.category];
    return `<tr><td>${html(tenant.name)}</td><td>${html(tenant.unitId)}</td><td>${r(tenant.category)} / ${r(tenant.size)}</td><td>${tenant.staff}</td><td>${html(money(tenant.wagePerHour??parameters.wagePerHour))}</td><td>${html(number((tenant.purchaseProbability??.9)*100))}%</td><td>${html(time(tenant.open))}–${html(time(tenant.close))}</td><td>${html(money(tenant.basket??parameters.basket))}</td><td>${html(number(tenant.serviceSeconds??parameters.service))} s × ${html(number(tenant.preparation))}</td><td>${html(number((tenant.margin??parameters.margin)*100))}%</td><td>${html(money(tenant.occupancyPerDay??UNITS.find(u=>u.id===tenant.unitId)!.rentPerDay))}</td></tr>`;
  }).join('');
  const detail=proposed.tenants.map(tenant=>`<tr><td>${html(result.scenario.tenants.find(t=>t.id===tenant.tenantId)?.name??tenant.tenantId)}</td><td>${tenant.visits}</td><td>${tenant.transactions}</td><td>${html(money(tenant.sales))}</td><td>${html(money(tenant.labor+tenant.occupancyCost+tenant.campaignCost))}</td><td>${html(money(tenant.contribution))}</td><td>${html(number(tenant.waitMean))}</td></tr>`).join('');
  const chosenEvents=result.scenario.events.filter(e=>!tenantId||e.target===tenantId||!e.target||['central-route','spine-mid__spine-east','main-route','concourse','platform-a','platform-b','train-1','train-2','train-3','train-4','train-5','train-6'].includes(e.target));
  const events=chosenEvents.length?chosenEvents.map(event=>`<li>${r(event.type)}: ${html(time(event.start))}–${html(time(event.start+event.duration))}; ${r('magnitude')} ${html(event.magnitude)}${event.target?`; ${r('target')} ${html(event.target)}`:''}.</li>`).join(''):`<li>${r('No interventions.')}</li>`;
  const chosenCampaigns=result.scenario.campaigns.filter(c=>!tenantId||c.tenantId===tenantId);
  const campaigns=chosenCampaigns.length?chosenCampaigns.map(campaign=>`<li>${html(campaign.name)}: ${html(campaign.screenId)} → ${html(campaign.tenantId)}, ${html(time(campaign.start))}–${html(time(campaign.end))}; ${r(campaign.objective==='purchases'?'Purchases':campaign.objective==='awareness'?'Awareness':'Visits')}, ${r('budget')} ${html(money(campaign.budget))}${campaign.archived?` (${r('archived; inactive')})`:''}.</li>`).join(''):`<li>${r('No campaigns.')}</li>`;
  const heading=(key:string)=>`<h2>${r(key)}</h2>`;
  const headers=(keys:string[])=>`<thead><tr>${keys.map(key=>`<th>${r(key)}</th>`).join('')}</tr></thead>`;
  const intro=tenantId?`<p class="muted">${r('Only your shop inputs, campaigns and financial results are included. Neighboring business details remain private.')}</p>`:`<p class="muted">${BASELINE.tenants.length} ${r('tenants in the authored baseline')}, ${result.scenario.tenants.length} ${r('in this plan')}.</p>`;
  const baselineNote=tenantId&&!comparison.baseline.tenants.length?`<p class="muted">${r('No matching shop exists in the baseline; its baseline business results are zero.')}</p>`:'';
  const comparisonRows=(tenantId?row('Passing traffic',m=>number(m.tenants[0]?.passing??0)):row('Passenger arrivals',m=>number(m.arrivals)))+row('Tenant visits',m=>number(m.visits))+row('Transactions',m=>number(m.transactions))+row('Sales',m=>money(m.sales))+row('Labor',m=>money(costs(m).labor))+row('Occupancy',m=>money(costs(m).occupancy))+row('Campaign cost',m=>money(costs(m).campaign))+row('Contribution',m=>money(m.contribution))+row('Mean queue wait (minutes)',m=>number(m.waitMean))+row('90th percentile wait (minutes)',m=>number(m.waitP90))+row('Abandoned visits',m=>number(m.abandoned));
  const assumptionNote=`<p class="muted"><strong>${r('Authored daypart assumptions')}</strong>: ${r('Model period')} ${r(profile.period)}; ${r('Background traffic')} ×${number(profile.backgroundFactor*profile.hourlyDemandFactor)}; ${r('Scheduled alighting')} ×${number(profile.alightingFactor*profile.hourlyDemandFactor)}; ${r('Boarding share')} ${number(profile.boardingProbability*100)}%; ${r('Patience factor')} ×${number(profile.patienceFactor)}; ${r('Category attraction')} ${Object.entries(profile.attractionFactor).map(([category,factor])=>`${r(category)} ×${number(factor)}`).join(', ')}. ${r('These coefficients and hourly demand factors are authored planning assumptions, not measured station traffic.')}</p>`;
  const documentHTML=`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${html(displayName)} — Lintara ${r(tenantId?'Business report':'Planning report')}</title><style>
    @page{size:A4 landscape;margin:14mm}*{box-sizing:border-box}body{font:13px/1.5 Arial,sans-serif;color:#17233D;margin:36px;background:#fff}header{border-bottom:2px solid #243B75;padding-bottom:20px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center}.brand svg{width:164px;height:auto;display:block}h1{font-size:25px;margin:0 0 6px}h2{font-size:17px;margin:26px 0 10px}p{margin:7px 0}.muted{color:#667085;font-size:12px}table{border-collapse:collapse;width:100%;margin:10px 0;font-size:11px}th,td{padding:9px 8px;border-bottom:1px solid #dfe4ec;text-align:left;vertical-align:top}thead{background:#F5F7FB}th{font-weight:600}.conclusion{padding:18px;background:#F5F7FB;border-left:4px solid #243B75}.controls{margin-bottom:22px}button{padding:9px 14px;margin-right:10px;cursor:pointer}footer{margin-top:28px;border-top:1px solid #dfe4ec;padding-top:12px;font-size:11px}ul{margin:6px 0;padding-left:20px}@media print{body{margin:0}.controls{display:none}h2,thead{break-after:avoid}tr,.conclusion{break-inside:avoid}thead{display:table-header-group}}
    </style></head><body><div class="controls"><button type="button" onclick="window.print()">${r('Print / Save PDF')}</button><button type="button" onclick="window.close()">${r('Close')}</button></div><header><div class="brand">${reportLogo}</div><div class="muted">${r('Station Intelligence')}<br>${r('Sudirman station')} · ${r(tenantId?'Business report':'Planning report')}</div></header><h1>${html(displayName)}</h1><p>${r('Reporting window')}: <strong>${html(time(start))}–${html(time(end))}</strong> · ${r('Scenario')}: ${html(result.scenario.id)} · ${r('Seed')}: ${result.scenario.seed} · ${r('Assumed demand')}: ${r(result.scenario.crowd??'legacy')}</p><p class="muted">Asia/Jakarta · ${number((end-start)/60)} ${r('simulated minutes')}</p>${intro}${assumptionNote}${heading('Scenario comparison')}<table>${headers(['Metric',...series.map(([label])=>label)])}<tbody>${comparisonRows}</tbody></table>${baselineNote}<p class="muted">${r('Contribution = gross margin − labor − prorated occupancy − campaign cost.')} ${r('Baseline, proposed and stress use the same model, seed and reporting window.')} ${r('Stress adds a safely scheduled arrival surge and rain; one coffee service worker is absent when a coffee shop exists.')}</p><div class="conclusion"><strong>${r('Decision evidence')}</strong><p>${html(conclusion)} ${html(waitNote)}</p><p>${r('Higher footfall alone does not guarantee better contribution. Consider service capacity and the cost of the intervention together.')}</p></div>${heading('Proposed tenant results')}<table>${headers(['Tenant','Visits','Transactions','Sales','Total cost','Contribution','Mean wait (min)'])}<tbody>${detail||`<tr><td colspan="7">${r('No tenants in this plan.')}</td></tr>`}</tbody></table>${heading('Plan inputs')}<table>${headers(['Tenant','Unit','Category / footprint','Staff','Wage / hour','Purchase probability','Hours','Basket','Service / preparation','Gross margin','Rent per day'])}<tbody>${tenants||`<tr><td colspan="11">${r('No tenants in this plan.')}</td></tr>`}</tbody></table>${heading('Interventions')}<ul>${events}</ul>${heading('Advertising')}<ul>${campaigns}</ul><footer>${r('Lintara is a planning simulation. Commercial geometry and coefficients are authored assumptions, not measured KAI operating data. Financial outputs are estimates in IDR for the selected period; this report is not a safety assessment or financial guarantee. All report calculations come from the current scenario model.')}</footer></body></html>`;
  report.document.open();report.document.write(documentHTML);report.document.close();
}
