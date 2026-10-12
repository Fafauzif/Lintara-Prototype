import {cpus,platform,release,totalmem} from 'node:os';
import {BASELINE,DURATION} from '../src/data/station';
import {compareScenarios,createStressScenario,simulate} from '../src/simulation/engine';
import type {Scenario} from '../src/domain/types';

const rounded=(n:number)=>Math.round(n*1000)/1000;
const stats=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {samples:values.length,medianMs:rounded(sorted[Math.floor(sorted.length/2)]),p95Ms:rounded(sorted[Math.ceil(sorted.length*.95)-1]),maxMs:rounded(sorted.at(-1)!)};};
const timed=<T>(run:()=>T)=>{const before=performance.now();const value=run();return {value,ms:performance.now()-before};};
const startHeap=process.memoryUsage().heapUsed;
const cold:number[]=[];
for(let n=0;n<12;n++){
 const scenario:Scenario=structuredClone(BASELINE);scenario.id=`benchmark-${n}`;scenario.seed+=n;
 cold.push(timed(()=>simulate(scenario)).ms);
}
const baseline=simulate(BASELINE),stressScenario=createStressScenario(BASELINE);
const stress=timed(()=>simulate(stressScenario));
const seeks:number[]=[];let peakPresent=0,totalAgentsRead=0;
for(let n=0;n<1000;n++){
 const time=((n*7919)%360001)/100;
 const measurement=timed(()=>baseline.snapshot(time));seeks.push(measurement.ms);
 peakPresent=Math.max(peakPresent,measurement.value.present);totalAgentsRead+=measurement.value.present;
}
const metricQueries:number[]=[];
for(let n=0;n<100;n++)metricQueries.push(timed(()=>baseline.metrics(n*13,Math.min(DURATION,n*13+1200))).ms);
const comparison=timed(()=>compareScenarios(BASELINE));
const whole=baseline.metrics();
const heapBeforeCollection=process.memoryUsage().heapUsed;
const gcAvailable=typeof globalThis.gc==='function';
if(gcAvailable)globalThis.gc!();
const report={
 type:'renderer-independent model benchmark',
 caveat:'CPU and Node memory evidence only. This does not establish browser GPU FPS on an 8 GB integrated-graphics laptop.',
 runtime:{node:process.version,platform:platform(),release:release(),cpu:cpus()[0]?.model??'unknown',logicalCpus:cpus().length,hostMemoryGiB:rounded(totalmem()/1024**3)},
 configuration:{seed:BASELINE.seed,durationSeconds:DURATION,shops:BASELINE.tenants.length,resultCacheLimit:6,metricCacheLimitPerResult:32},
 simulationCold:stats(cold),stressSimulationMs:rounded(stress.ms),randomSeek:stats(seeks),reportQuery:stats(metricQueries),comparisonMs:rounded(comparison.ms),
 demand:{arrivals:whole.arrivals,departed:whole.departed,presentAtEnd:whole.present,peakPresentObserved:peakPresent,seekSamples:1000,agentsReadAcrossSeeks:totalAgentsRead,visits:whole.visits,transactions:whole.transactions,waitMeanMinutes:rounded(whole.waitMean),waitP90Minutes:rounded(whole.waitP90)},
 finance:{salesIdr:whole.sales,contributionIdr:whole.contribution,tenants:whole.tenants.map(t=>({id:t.tenantId,transactions:t.transactions,sales:t.sales,grossMargin:t.grossMargin,labor:t.labor,occupancy:t.occupancyCost,campaign:t.campaignCost,contribution:t.contribution}))},
 memory:{collectionRequested:gcAvailable,heapBeforeCollectionMiB:rounded(heapBeforeCollection/1024**2),heapGrowthMiB:rounded((process.memoryUsage().heapUsed-startHeap)/1024**2),heapUsedMiB:rounded(process.memoryUsage().heapUsed/1024**2),rssMiB:rounded(process.memoryUsage().rss/1024**2),note:gcAvailable?'Heap after explicit GC retains the bounded model caches.':'Heap includes collectible discarded cold runs; use node --expose-gc --import tsx tools/benchmark.ts for retained-cache measurement.'},
 conservationPassed:whole.arrivals-whole.departed===whole.present,
};
console.log(JSON.stringify(report,null,2));
if(!report.conservationPassed)process.exitCode=1;
