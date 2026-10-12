import {describe,it,expect} from 'vitest';
import {createWorkspaceStore} from '../src/state/workspace';
import {freshScenario} from '../src/data/station';
describe('editable scenario history',()=>{
 it('undo restores a complete intervention and redo restores its costs',()=>{
  const store=createWorkspaceStore();const before=structuredClone(store.getState().scenario);
  const next=freshScenario();next.tenants[1].staff=3;next.events.push({id:'e1',type:'rain',start:900,duration:600,magnitude:.6});
  store.getState().commit(next);expect(store.getState().scenario.events).toHaveLength(1);
  next.tenants[1].staff=12;expect(store.getState().scenario.tenants[1].staff).toBe(3);
  store.getState().undo();expect(store.getState().scenario).toEqual(before);
  store.getState().redo();expect(store.getState().scenario.tenants[1].staff).toBe(3);expect(store.getState().scenario.events).toHaveLength(1);
 });
 it('editing after undo clears stale redo without touching a saved independent copy',()=>{
  const store=createWorkspaceStore();const saved=structuredClone(store.getState().scenario);const next=structuredClone(saved);next.tenants[0].staff=3;
  store.getState().commit(next);store.getState().undo();const branch=structuredClone(saved);branch.tenants[0].staff=4;store.getState().commit(branch);
  store.getState().redo();expect(store.getState().scenario.tenants[0].staff).toBe(4);expect(saved.tenants[0].staff).toBe(2);expect(store.getState().future).toHaveLength(0);
 });
 it('reset is undoable and repeated edits bound retained history',()=>{
  const store=createWorkspaceStore();for(let i=0;i<50;i++){const next=structuredClone(store.getState().scenario);next.name=`Plan ${i}`;store.getState().commit(next);}
  expect(store.getState().past.length).toBeLessThanOrEqual(30);store.getState().reset();expect(store.getState().scenario.name).toBe('Morning opportunity');store.getState().undo();expect(store.getState().scenario.name).toBe('Plan 49');
 });
});
