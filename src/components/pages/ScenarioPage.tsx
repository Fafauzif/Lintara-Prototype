import {useEffect,useMemo,useState} from 'react';
import {ArrowRight,Check,Copy,Download,FolderOpen,Printer,Save,Trash2,Upload} from 'lucide-react';
import type {Language,Metrics,Scenario} from '../../domain/types';
import type {ViewProps} from '../viewTypes';
import {DURATION} from '../../data/station';
import {money,number} from '../../i18n';
import {time,windowLabel} from '../../domain/period';
import {compareScenarios,createStressScenario} from '../../simulation/engine';
import {downloadCSV,downloadJSON,downloadTenantJSON,printReport} from '../../reports/export';
import {Button,Card,PageTitle} from '../UI';
import {describeImpact,formatImpactValue,ImpactChange,roundedImpactDelta} from '../ImpactChange';
import type {ImpactMetric} from '../ImpactChange';
import {MissingTenant,Period,safeAction,useText} from './shared';
import './impacts.css';

function costs(metric:Metrics){
 return metric.tenants.reduce((sum,tenant)=>({labor:sum.labor+tenant.labor,occupancy:sum.occupancy+tenant.occupancyCost,campaigns:sum.campaigns+tenant.campaignCost,goods:sum.goods+tenant.sales-tenant.grossMargin}),{labor:0,occupancy:0,campaigns:0,goods:0});
}

/** A tenant comparison contains that business's outcomes and costs only. */
export function scopeComparisonMetrics(metric:Metrics,tenantId:string):Metrics{
 const tenants=metric.tenants.filter(m=>m.tenantId===tenantId);const own=tenants[0];
 return {...metric,tenants,arrivals:0,departed:0,present:0,exposure:0,qualifiedExposure:0,visits:own?.visits??0,transactions:own?.transactions??0,sales:own?.sales??0,contribution:own?.contribution??0,waitMean:own?.waitMean??0,waitP90:own?.waitP90??0,abandoned:own?.abandoned??0};
}

export function stressInterventionDescription(scenario:Scenario,lang:Language){
 const sourceEvents=new Map(scenario.events.map(event=>[event.id,event]));
 const stress=createStressScenario(scenario);
 const additions=stress.events.filter(event=>!sourceEvents.has(event.id));
 // A full timetable can make stress increase an existing arrival rather than add a new one.
 const passengers=stress.events.filter(event=>event.type==='arrival').reduce((sum,event)=>{
  const source=sourceEvents.get(event.id);
  return sum+Math.max(0,event.magnitude-(source?.type==='arrival'?source.magnitude:0));
 },0);
 const absent=additions.filter(event=>event.type==='staff'&&event.magnitude<0).reduce((sum,event)=>sum+Math.abs(event.magnitude),0);
 const rain=stress.events.some(event=>event.type==='rain'&&event.magnitude>0);
 const sentences:string[]=[];
 if(passengers>0)sentences.push(lang==='id'?`Tekanan menambah ${number(lang,passengers)} penumpang datang.`:`Stress adds ${number(lang,passengers)} arriving passengers.`);
 if(absent>0)sentences.push(lang==='id'?`Dalam skenario tekanan, ${number(lang,absent)} staf pelayanan tidak hadir.`:`Stress includes ${number(lang,absent)} absent service ${absent===1?'worker':'workers'}.`);
 if(passengers===0&&absent===0)sentences.push(lang==='id'?'Tidak ada tambahan intervensi kedatangan atau staf.':'No additional arrival or staff intervention is added.');
 if(rain)sentences.push(lang==='id'?'Hujan diaktifkan.':'Rain is enabled.');
 return sentences.join(' ');
}

export function comparisonRecommendation(lang:Language,baseline:Metrics,proposed:Metrics){
 const delta={contribution:proposed.contribution-baseline.contribution,sales:proposed.sales-baseline.sales,waitMean:proposed.waitMean-baseline.waitMean,abandoned:proposed.abandoned-baseline.abandoned};
 const contribution=roundedImpactDelta('contribution',delta.contribution);
 const serviceWorse=roundedImpactDelta('waitMean',delta.waitMean)>0||delta.abandoned>0;
 const headline=contribution<0
  ?lang==='id'?'Periksa margin dan kecocokan unit sebelum menerapkan rencana.':'Check margin and unit fit before committing this plan.'
  :serviceWorse
   ?lang==='id'?'Periksa kapasitas pelayanan untuk menjaga hasil usaha.':'Check service capacity to protect the business outcome.'
   :lang==='id'?'Uji langkah berikutnya pada unit, kapasitas, atau margin.':'Test the next opportunity in unit fit, capacity or margin.';
 const detail=lang==='id'
  ?'Gunakan analisis peluang untuk memilih perubahan yang sesuai, lalu bandingkan kembali pada periode yang sama.'
  :'Use the opportunity analysis to choose a focused change, then compare it over the same reporting window.';
 const strengths=(['contribution','sales','waitMean','abandoned'] as const).filter(metric=>describeImpact(lang,metric,delta[metric]).tone==='favorable');
 return {headline,detail,strengths,delta,contributionDrops:contribution<0};
}

export function ScenarioPage(props:ViewProps){
 const {lang,scenario,result,savedPlans}=props;const t=useText(lang);const local=(en:string,id:string)=>lang==='id'?id:en;
 const [start,setStart]=useState(0);const [end,setEnd]=useState(DURATION);
 const tenantId=props.role==='tenant'?props.ownTenantId:undefined;
 const [planName,setPlanName]=useState(scenario.name==='Morning opportunity'?t(scenario.name):scenario.name);
 useEffect(()=>setPlanName(scenario.name==='Morning opportunity'?t(scenario.name):scenario.name),[scenario.name,lang]);
 const comparison=useMemo(()=>{
  const c=compareScenarios(scenario,start,end);
  return tenantId!==undefined?{baseline:scopeComparisonMetrics(c.baseline,tenantId),proposed:scopeComparisonMetrics(c.proposed,tenantId),stress:scopeComparisonMetrics(c.stress,tenantId)}:c;
 },[scenario,start,end,tenantId]);
 if(props.role==='tenant'&&!scenario.tenants.some(shop=>shop.id===props.ownTenantId))return <div className="analysis-page"><PageTitle eyebrow={t('Scenario workspace')} title={t('Your operating outlook')}/><MissingTenant props={props}/></div>;

 const series=[['Baseline',comparison.baseline],['Proposed',comparison.proposed],['Stress',comparison.stress]] as const;
 const rows:{label:string;metric:ImpactMetric;get:(m:Metrics)=>number}[]=[
  ...(!tenantId?[{label:'Arriving passengers',metric:'arrivals' as const,get:(m:Metrics)=>m.arrivals}]:[]),
  {label:'Shop visits',metric:'visits',get:m=>m.visits},
  {label:'Transactions',metric:'transactions',get:m=>m.transactions},
  {label:'Sales outlook',metric:'sales',get:m=>m.sales},
  {label:'Cost of goods',metric:'goods',get:m=>costs(m).goods},
  {label:'Labor cost',metric:'labor',get:m=>costs(m).labor},
  {label:'Occupancy allocation',metric:'occupancy',get:m=>costs(m).occupancy},
  {label:'Campaign cost',metric:'campaigns',get:m=>costs(m).campaigns},
  {label:'Contribution',metric:'contribution',get:m=>m.contribution},
  {label:'Average wait',metric:'waitMean',get:m=>m.waitMean},
  {label:'90th percentile wait',metric:'waitP90',get:m=>m.waitP90},
  {label:'Queue abandonment',metric:'abandoned',get:m=>m.abandoned},
 ];
 const recommendation=comparisonRecommendation(lang,comparison.baseline,comparison.proposed);
 const impactCards=[
  {metric:'contribution' as const,label:t('Contribution'),value:comparison.proposed.contribution,baseline:comparison.baseline.contribution,explanation:local('Sales after goods, labor, occupancy and campaign costs.','Penjualan setelah biaya bahan, tenaga kerja, ruang, dan kampanye.')},
  {metric:'sales' as const,label:t('Sales outlook'),value:comparison.proposed.sales,baseline:comparison.baseline.sales,explanation:recommendation.delta.sales<0
   ?local('Lower sales reduce revenue; inspect visits and transactions below.','Penjualan yang lebih rendah mengurangi pendapatan; periksa kunjungan dan transaksi di bawah.')
   :recommendation.delta.sales>0
    ?local('Sales growth helps when the margin covers the costs.','Kenaikan penjualan bermanfaat jika margin menutup biaya.')
    :local('Sales match the baseline for this reporting window.','Penjualan sama dengan kondisi awal pada periode laporan ini.')},
  {metric:'waitMean' as const,label:t('Average wait'),value:comparison.proposed.waitMean,baseline:comparison.baseline.waitMean,explanation:roundedImpactDelta('waitMean',recommendation.delta.waitMean)<0
   ?local('Shorter waits improve service; compare the staffing cost too.','Antrean lebih singkat memperbaiki pelayanan; bandingkan juga biaya staf.')
   :roundedImpactDelta('waitMean',recommendation.delta.waitMean)>0
    ?local('Longer waits call for a check of service capacity.','Antrean lebih lama perlu ditinjau dari kapasitas pelayanan.')
    :local('Average wait matches the baseline to the nearest second.','Rata-rata antre sama dengan kondisi awal setelah dibulatkan ke detik terdekat.')},
 ];

 return <div className="analysis-page" data-testid="scenarios-page">
  <PageTitle eyebrow={t('Scenario workspace')} title={t('Decisions you can revisit. Outcomes you can compare.')} description={windowLabel(scenario)} actions={<Button className="primary" onClick={props.onSave} testId="save-plan-page"><Save size={16}/>{t('Save plan')}</Button>}/>
  <Card title={t('Active plan')}>
   <div className="scenario-toolbar">
    <label className="field"><span>{t('Plan name')}</span><input value={planName} maxLength={80} onChange={e=>setPlanName(e.target.value)} onBlur={()=>{const name=planName.trim();if(!name){setPlanName(t(scenario.name));return;}if(name!==scenario.name&&name!==t(scenario.name))props.onChange({...scenario,name});}}/></label>
    <div className="page-actions">
     <Button className="secondary" onClick={()=>safeAction(props,()=>tenantId?downloadTenantJSON(result,tenantId,start,end):downloadJSON(scenario))}><Download size={15}/>{t('Export JSON')}</Button>
     <Button className="secondary" onClick={()=>safeAction(props,()=>downloadCSV(result,start,end,tenantId))}><Download size={15}/>{t('Export CSV')}</Button>
     <Button className="secondary" onClick={()=>safeAction(props,()=>printReport(result,start,end,tenantId,lang))}><Printer size={15}/>{t('Print report')}</Button>
     <Button className="secondary" onClick={props.onImport}><Upload size={15}/>{t('Import plan')}</Button>
    </div>
   </div>
  </Card>
  <Card title={t('Aligned comparison')} action={<span className="pill">{t('Common window')}</span>}>
   <Period lang={lang} scenario={scenario} start={start} end={end} onChange={(s,e)=>{setStart(s);setEnd(e);props.onSeek(s);}}/>
   <div className="scenario-impact-grid" aria-label={local('Proposed impact against baseline','Dampak usulan terhadap kondisi awal')}>
    {impactCards.map(card=><div className="scenario-impact-card" key={card.metric} data-testid={`impact-card-${card.metric}`}>
     <span>{t('Proposed')} · {card.label}</span>
     <strong>{formatImpactValue(lang,card.metric,card.value)}</strong>
     <ImpactChange lang={lang} metric={card.metric} value={card.value-card.baseline}/>
     <p>{card.explanation}</p>
     <small>{t('Baseline')}: {formatImpactValue(lang,card.metric,card.baseline)} · {time(start,scenario)}–{time(end,scenario)} WIB</small>
    </div>)}
   </div>
   <div className="scenario-decision" data-testid="scenario-recommendation">
    <span className="eyebrow">{t('Your next move')}</span>
    <h3>{recommendation.headline}</h3>
    <p>{recommendation.detail}</p>
    {recommendation.strengths.length>0&&<ul className="scenario-strengths">{recommendation.strengths.map(metric=><li key={metric}><Check size={15} aria-hidden="true"/>{describeImpact(lang,metric,recommendation.delta[metric]).text}</li>)}</ul>}
    {recommendation.contributionDrops&&<p className="scenario-caution">{local('Contribution is lower. Check margin, operating costs and unit reach before applying the plan.','Kontribusi menurun. Periksa margin, biaya operasional, dan jangkauan unit sebelum menerapkan rencana.')}</p>}
    <Button className="secondary" onClick={()=>props.onNavigate('opportunity')}>{local('Explore the next opportunity','Jelajahi peluang berikutnya')}<ArrowRight size={14}/></Button>
   </div>
   <div className="table-wrap"><table className="data-table comparison-table impact-comparison-table">
    <thead><tr><th>{t('Metric')}</th>{series.map(([label])=><th key={label}>{t(label)}</th>)}<th>{t('Proposed change')}<span className="impact-reference">{local('Against baseline','Terhadap kondisi awal')}</span></th></tr></thead>
    <tbody>{rows.map(({label,metric,get})=><tr key={metric} className={metric==='contribution'?'contribution-row':''}>
     <th>{t(label)}</th>{series.map(([name,m])=><td key={name}>{formatImpactValue(lang,metric,get(m))}</td>)}
     <td><ImpactChange lang={lang} metric={metric} value={get(comparison.proposed)-get(comparison.baseline)}/></td>
    </tr>)}</tbody>
   </table></div>
   <p className="muted scenario-costs-note">{t('Same seed, same model, same reporting window.')}</p>
   <p className="muted">{stressInterventionDescription(scenario,lang)}</p>
  </Card>
  <Card title={t('Cost allocation')}>
   <div className="list-row"><span>{t('Cost of goods')}</span><strong>{money(lang,costs(comparison.proposed).goods)}</strong></div>
   <div className="list-row"><span>{t('Labor cost')}</span><strong>{money(lang,costs(comparison.proposed).labor)}</strong></div>
   <div className="list-row"><span>{t('Occupancy allocation')}</span><strong>{money(lang,costs(comparison.proposed).occupancy)}</strong></div>
   <div className="list-row"><span>{t('Campaign cost')}</span><strong>{money(lang,costs(comparison.proposed).campaigns)}</strong></div>
   <p className="muted">{t('Sales − goods − labor − occupancy − campaigns.')}</p>
   <p className="muted">{t('Occupancy is prorated over a 24-hour calendar day.')}</p>
  </Card>
  <Card title={t('Saved plans')} action={<span className="pill">{number(lang,savedPlans.length)}</span>}>
   {savedPlans.length?<div className="saved-plans">{savedPlans.map(plan=>{
    const visibleTenants=tenantId?plan.tenants.filter(tenant=>tenant.id===tenantId):plan.tenants;
    const visibleEvents=tenantId?plan.events.filter(event=>event.target===tenantId):plan.events;
    const visibleCampaigns=plan.campaigns.filter(c=>!c.archived&&(!tenantId||c.tenantId===tenantId));
    return <div className="saved-plan-row" key={plan.id}>
     <div className="saved-plan-icon"><FolderOpen size={21}/></div>
     <div className="saved-plan-info"><strong>{t(plan.name)}</strong><span>{number(lang,visibleTenants.length)} {t('Tenants').toLowerCase()} · {number(lang,visibleEvents.length)} {t('Events').toLowerCase()} · {number(lang,visibleCampaigns.length)} {t('Campaigns').toLowerCase()}</span></div>
     <div className="page-actions">
      <Button className="secondary" onClick={()=>props.onOpen(plan)}>{t('Open')}</Button>
      <Button className="ghost" title={t('Duplicate')} onClick={()=>{if(props.onDuplicate)props.onDuplicate(plan);else{props.onOpen({...structuredClone(plan),id:`plan-${Date.now().toString(36)}`,name:`${plan.name} (${t('Copy')})`});props.onToast(t('Plan copy opened. Save it to keep the copy.'));}}}><Copy size={15}/></Button>
      <Button className="ghost" title={t('Export JSON')} onClick={()=>safeAction(props,()=>downloadJSON(plan,tenantId))}><Download size={15}/></Button>
      <Button className="ghost danger" title={t('Delete')} onClick={()=>props.onDelete(plan.id)}><Trash2 size={15}/></Button>
     </div>
    </div>;
   })}</div>:<div className="empty-state"><FolderOpen size={28}/><h3>{t('No saved plans')}</h3><p>{t('Save the active plan to compare and revisit your decisions.')}</p><Button className="primary" onClick={props.onSave}>{t('Save plan')}</Button></div>}
  </Card>
 </div>;
}
