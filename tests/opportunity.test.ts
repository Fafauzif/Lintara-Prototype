import {describe,expect,it} from 'vitest';
import {freshScenario,DURATION} from '../src/data/station';
import {simulate} from '../src/simulation/engine';
import {updateTenant} from '../src/domain/planning';
import {evaluateOpportunity,opportunitySensitivity,findOpportunities,findOpportunitiesAsync,opportunityBrief} from '../src/domain/opportunity';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {OpportunityPage} from '../src/components/pages/OpportunityPage';
import type {ViewProps} from '../src/components/viewTypes';

describe('tenant opportunity evidence',()=>{
 it('reconciles contribution and break-even with the actual reporting ledger',()=>{
  const plan=freshScenario(),result=simulate(plan),out=evaluateOpportunity(plan,'T2',result);
  expect(out.metrics.contribution).toBe(out.metrics.grossMargin-out.fixedCosts);
  expect(out.breakEvenSales).toBeCloseTo(out.fixedCosts/(out.metrics.grossMargin/out.metrics.sales));
  expect(out.breakEvenTransactions).toBe(Math.ceil(out.fixedCosts/(out.metrics.grossMargin/out.metrics.transactions)));
  expect(out.metrics).toEqual(result.metrics(0,DURATION,'T2').tenants[0]);
  expect(out.busiestSalesWindow.end-out.busiestSalesWindow.start).toBe(300);
 });
 it('keeps the base run exact and sensitivities deterministic without inventing demand',()=>{
  const plan=freshScenario(),first=opportunitySensitivity(plan,'T2'),second=opportunitySensitivity(plan,'T2');
  expect(first.map(x=>x.outcome.metrics)).toEqual(second.map(x=>x.outcome.metrics));
  expect(first[1].outcome.metrics).toEqual(simulate(plan).metrics(0,DURATION,'T2').tenants[0]);
  expect(first.map(x=>x.outcome.metrics.passing)).toEqual([first[1].outcome.metrics.passing,first[1].outcome.metrics.passing,first[1].outcome.metrics.passing]);
  expect(first.map(x=>x.outcome.metrics.visits)).toEqual([first[1].outcome.metrics.visits,first[1].outcome.metrics.visits,first[1].outcome.metrics.visits]);
  expect(first[0].outcome.metrics.sales).toBeLessThanOrEqual(first[1].outcome.metrics.sales);
  expect(first[2].outcome.metrics.sales).toBeGreaterThanOrEqual(first[1].outcome.metrics.sales);
  expect(plan.tenants[1].basket).toBeUndefined();
 });
 it('handles zero revenue or margin without infinite values or a made-up gain',()=>{
  const plan=updateTenant(freshScenario(),'T2',{basket:0,margin:0,purchaseProbability:0});
  const out=evaluateOpportunity(plan,'T2');
  expect(out.breakEvenSales).toBeNull();expect(out.breakEvenTransactions).toBeNull();
  expect(out.metrics.sales).toBe(0);expect(out.metrics.contribution).toBe(-out.fixedCosts);
  const found=findOpportunities(plan,'T2',{unitIds:['U2'],staffCounts:[2]});
  expect(found.best).toBeNull();expect(found.candidates[0].delta).toBe(0);
  expect(()=>evaluateOpportunity(plan,'missing')).toThrow(/tenant/i);
  expect(evaluateOpportunity(updateTenant(freshScenario(),'T2',{basket:0}),'T2').breakEvenSales).toBeNull();
  expect(evaluateOpportunity(plan,'T2',simulate(freshScenario())).metrics.sales).toBe(0);
 });
 it('evaluates only legal candidates, preserves neighbors, and returns the true signed difference',()=>{
  const plan=freshScenario(),found=findOpportunities(plan,'T2',{unitIds:['U2','U1','rails'],staffCounts:[2,3]});
  expect(found.candidates).toHaveLength(2);
  expect(found.best).not.toBeNull();
  const best=found.best!;
  expect(best.delta).toBe(best.outcome.metrics.contribution-found.current.metrics.contribution);
  expect(best.scenario.tenants.filter(t=>t.id!=='T2')).toEqual(plan.tenants.filter(t=>t.id!=='T2'));
  expect(best.scenario.seed).toBe(plan.seed);expect(best.scenario.crowd).toBe(plan.crowd);
 });
 it('exports only the chosen tenant economics and marks all evidence as simulated',()=>{
  const plan=freshScenario(),brief=opportunityBrief(plan,'T2','en');
  expect(brief).toContain('Kopi Sela');expect(brief).toContain('Simulated');expect(brief).toContain('07:00');
  expect(brief).not.toContain('Roti Peron');expect(brief).not.toContain('Bekal Express');expect(brief).not.toContain('Saku Mart');
  expect(brief).toContain('Completed-visit conversion');expect(brief).toContain('24-hour');
 });
 it('integrates staff absences and tenant closures into approximate service capacity',()=>{
  const plan=freshScenario();plan.events=[{id:'absence',type:'staff',start:1200,duration:600,magnitude:-1,target:'T2'}];
  expect(evaluateOpportunity(plan,'T2').serviceCapacity).toBe(Math.floor((7200-600)*(1-10/60)/65));
  plan.events=[{id:'closed',type:'closure',start:0,duration:DURATION,magnitude:1,target:'T2'}];
  expect(evaluateOpportunity(plan,'T2').serviceCapacity).toBe(0);
  expect(evaluateOpportunity(plan,'T2').metrics.labor).toBeGreaterThan(0);
 });
 it('can stop an obsolete asynchronous search before the next simulation',async()=>{
  let checks=0;const found=await findOpportunitiesAsync(freshScenario(),'T2',undefined,()=>checks++<1);
  expect(found.candidates).toHaveLength(1);expect(found.best).toBeNull();
 });
});

describe('opportunity page scope',()=>{
 function props():ViewProps{const scenario=freshScenario();return {lang:'en',scenario,result:simulate(scenario),currentTime:0,role:'tenant',ownTenantId:'T2',selectedId:'T1',savedPlans:[],onSeek:()=>{},onChange:()=>{},onSelect:()=>{},onNavigate:()=>{},onToast:()=>{},onSave:()=>{},onOpen:()=>{},onDelete:()=>{},onImport:()=>{}};}
 it('keeps tenant output scoped to their own shop despite another selected inspector',()=>{
  const html=renderToStaticMarkup(createElement(OpportunityPage,props()));
  expect(html).toContain('Kopi Sela');expect(html).not.toContain('Roti Peron');expect(html).not.toContain('Bekal Express');expect(html).not.toContain('Saku Mart');
  expect(html).not.toContain('WIB WIB');expect(html).toContain('max="1000000"');expect(html).toContain('apply-opportunity-assumptions');
 });
 it('uses the selected inspector shop when an operator opens the opportunity page',()=>{
  const p={...props(),role:'operator' as const};const html=renderToStaticMarkup(createElement(OpportunityPage,p));
  expect(html).toContain('value="T1" selected=""');expect(html).toContain('Roti Peron · 07:00–08:00 WIB');
 });
});
