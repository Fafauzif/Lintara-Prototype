import type {Scenario} from './types';
import {BASELINE} from '../data/station';
import {createStressScenario} from '../simulation/engine';
export function branchScenario(scenario:Scenario,branch:'baseline'|'proposed'|'stress'):Scenario{
 if(branch==='stress')return createStressScenario(scenario);
 if(branch==='proposed')return structuredClone(scenario);
 const baseline=structuredClone(BASELINE);baseline.seed=scenario.seed;
 if(scenario.crowd)baseline.crowd=scenario.crowd;else delete baseline.crowd;
 if(scenario.period!==undefined)baseline.period=scenario.period;else delete baseline.period;
 if(scenario.startHour!==undefined)baseline.startHour=scenario.startHour;else delete baseline.startHour;
 return baseline;
}
