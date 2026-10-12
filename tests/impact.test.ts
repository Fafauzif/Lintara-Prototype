import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {freshScenario} from '../src/data/station';
import {money} from '../src/i18n';
import {simulate} from '../src/simulation/engine';
import {describeImpact,formatImpactValue,ImpactChange,roundedImpactDelta} from '../src/components/ImpactChange';
import {comparisonRecommendation,ScenarioPage,scopeComparisonMetrics} from '../src/components/pages/ScenarioPage';
import type {ViewProps} from '../src/components/viewTypes';

describe('honest, readable scenario impacts',()=>{
 it('explains negative visits, transactions and revenue without double negatives',()=>{
  expect(describeImpact('en','visits',-23).text).toBe('23 fewer visits');
  expect(describeImpact('en','transactions',-4).text).toBe('4 fewer transactions');
  const revenue=describeImpact('en','sales',-236100);
  expect(revenue.text).toBe(`${money('en',236100)} lower sales`);
  expect(revenue.tone).toBe('unfavorable');
  expect(revenue.text).not.toContain('-');
  expect(describeImpact('id','sales',-236100).text).toBe(`Penjualan turun ${money('id',236100)}`);
 });

 it('treats lower operating costs as favorable and unchanged costs as neutral',()=>{
  expect(describeImpact('en','labor',-42000)).toMatchObject({text:`${money('en',42000)} lower labor cost`,tone:'favorable',direction:'down'});
  for(const metric of ['sales','labor','waitMean','abandoned'] as const){
   const markup=renderToStaticMarkup(createElement(ImpactChange,{lang:'en',metric,value:0}));
   expect(markup).toContain('data-impact-tone="neutral"');
   expect(markup).toContain('No change');
   expect(markup).not.toContain('impact-unfavorable');
  }
  expect(describeImpact('id','labor',0).text).toBe('Tidak berubah');
 });

 it('uses seconds for wait changes and rounds tiny changes to neutral without negative zero',()=>{
  expect(describeImpact('en','waitMean',-.2)).toMatchObject({text:'12s shorter wait',tone:'favorable'});
  expect(describeImpact('id','waitMean',-.2).text).toBe('12 detik lebih singkat · antrean');
  for(const delta of [-.49/60,.49/60,-0,0]){
   expect(describeImpact('en','waitMean',delta)).toMatchObject({text:'No change',tone:'neutral',amount:0});
   expect(Object.is(roundedImpactDelta('waitMean',delta),-0)).toBe(false);
  }
  expect(roundedImpactDelta('waitMean',-.5/60)).toBe(-1);
  expect(roundedImpactDelta('waitMean',.5/60)).toBe(1);
 });

 it('keeps an actual loss visible and recommends a margin check from simulated costs',()=>{
  const baseline=simulate(freshScenario()).metrics();
  const scenario=freshScenario();
  scenario.campaigns.push({id:'costly-impact-test',name:'Costly campaign',screenId:'AD1',tenantId:scenario.tenants[0].id,start:0,end:3600,budget:20000000,objective:'awareness'});
  const proposed=simulate(scenario).metrics();
  expect(proposed.contribution).toBeLessThan(0);
  expect(formatImpactValue('en','contribution',proposed.contribution)).toContain('-');
  const recommendation=comparisonRecommendation('en',baseline,proposed);
  expect(recommendation.contributionDrops).toBe(true);
  expect(recommendation.delta.contribution).toBe(proposed.contribution-baseline.contribution);
  expect(recommendation.headline).toContain('Check margin and unit fit');
  expect(recommendation.strengths).not.toContain('contribution');
 });

 it('acknowledges actual service gains while cautioning about a contribution drop',()=>{
  const before=freshScenario();
  const after=structuredClone(before);after.tenants.forEach(tenant=>{tenant.staff=3;});
  after.campaigns.push({id:'service-tradeoff-test',name:'Costly campaign',screenId:'AD1',tenantId:after.tenants[0].id,start:0,end:3600,budget:20000000,objective:'awareness'});
  const baseline=simulate(before).metrics();const proposed=simulate(after).metrics();
  expect(proposed.waitMean).toBeLessThan(baseline.waitMean);
  expect(proposed.contribution).toBeLessThan(baseline.contribution);
  const recommendation=comparisonRecommendation('en',baseline,proposed);
  expect(recommendation.contributionDrops).toBe(true);
  expect(recommendation.strengths).toContain('waitMean');
  expect(recommendation.strengths).toContain('abandoned');
  expect(recommendation.strengths.every(metric=>describeImpact('en',metric,recommendation.delta[metric]).tone==='favorable')).toBe(true);
  expect(recommendation.strengths).not.toContain('contribution');
 });

 it('limits every tenant comparison outcome and cost record to the current business',()=>{
  const metrics=simulate(freshScenario()).metrics();const own=metrics.tenants[0];
  const scoped=scopeComparisonMetrics(metrics,own.tenantId);
  expect(scoped.tenants).toEqual([own]);
  for(const metric of ['visits','transactions','sales','contribution','waitMean','waitP90','abandoned'] as const)expect(scoped[metric]).toBe(own[metric]);
  expect(scoped.arrivals).toBe(0);expect(scoped.exposure).toBe(0);
  expect(scopeComparisonMetrics(metrics,'missing-business').sales).toBe(0);
  expect(metrics.tenants.length).toBeGreaterThan(1);
 });

 it('renders baseline-referenced impact cards and a period-aware next action for the tenant',()=>{
  const scenario=freshScenario();scenario.period='evening';scenario.startHour=17;
  const result=simulate(scenario);const ownTenantId=scenario.tenants[0].id;
  const noop=()=>{};
  const props:ViewProps={lang:'en',scenario,result,currentTime:0,onSeek:noop,onChange:noop,onSelect:noop,onNavigate:noop,onToast:noop,ownTenantId,role:'tenant',savedPlans:[],onSave:noop,onOpen:noop,onDelete:noop,onImport:noop};
  const markup=renderToStaticMarkup(createElement(ScenarioPage,props));
  expect(markup).toContain('data-testid="impact-card-contribution"');
  expect(markup).toContain('data-testid="impact-card-sales"');
  expect(markup).toContain('data-testid="impact-card-waitMean"');
  expect(markup).toContain('Against baseline');
  expect(markup).toContain('17:00–18:00 WIB');
  expect(markup).toContain('Explore the next opportunity');
  expect(markup).not.toContain('Arriving passengers');
  expect(markup).not.toContain('Morning plan, 07:00');
 });

 it('reports the actual stress arrivals and rain without claiming an absence when no coffee business exists',()=>{
  const scenario=freshScenario();scenario.tenants=scenario.tenants.filter(tenant=>tenant.category!=='coffee');
  const noop=()=>{};const result=simulate(scenario);
  const props:ViewProps={lang:'en',scenario,result,currentTime:0,onSeek:noop,onChange:noop,onSelect:noop,onNavigate:noop,onToast:noop,ownTenantId:scenario.tenants[0].id,role:'tenant',savedPlans:[],onSave:noop,onOpen:noop,onDelete:noop,onImport:noop};
  const english=renderToStaticMarkup(createElement(ScenarioPage,props));
  expect(english).toContain('Stress adds 180 arriving passengers. Rain is enabled.');
  expect(english).not.toContain('absent service worker');
  const indonesian=renderToStaticMarkup(createElement(ScenarioPage,{...props,lang:'id'}));
  expect(indonesian).toContain('Tekanan menambah 180 penumpang datang. Hujan diaktifkan.');
  expect(indonesian).not.toContain('staf pelayanan tidak hadir');
  expect(english).not.toContain('Saku Mart');
 });
});
