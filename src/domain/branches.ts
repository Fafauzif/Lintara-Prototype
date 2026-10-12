import type {Scenario} from './types';
import {BASELINE} from '../data/station';
import {createStressScenario} from '../simulation/engine';
export function branchScenario(scenario:Scenario,branch:'baseline'|'proposed'|'stress'):Scenario{return branch==='baseline'?structuredClone({...BASELINE,seed:scenario.seed}):branch==='stress'?createStressScenario(scenario):structuredClone(scenario);}
