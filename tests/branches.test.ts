import {it,expect} from 'vitest';
import {branchScenario} from '../src/domain/branches';
import {freshScenario} from '../src/data/station';
import {simulate,compareScenarios} from '../src/simulation/engine';
it('a non-default imported demand seed uses the same baseline in the world and aligned reports',()=>{
 const imported=freshScenario();imported.seed=42;imported.tenants[1].staff=3;
 const baseline=branchScenario(imported,'baseline');
 expect(baseline.seed).toBe(42);
 expect(simulate(baseline).metrics().arrivals).toBe(compareScenarios(imported).baseline.arrivals);
 expect(baseline.tenants[1].staff).toBe(2);
 baseline.tenants[1].staff=12;expect(imported.tenants[1].staff).toBe(3);
});
it('stress remains a separate branch and cannot alter proposed settings or demand',()=>{
 const proposed=freshScenario();proposed.seed=42;const frozen=structuredClone(proposed);
 const stress=branchScenario(proposed,'stress');
 expect(stress.seed).toBe(42);expect(proposed).toEqual(frozen);expect(stress.events.length).toBeGreaterThan(proposed.events.length);
});
