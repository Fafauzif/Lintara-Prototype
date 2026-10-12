import {createStore} from 'zustand/vanilla';
import {freshScenario} from '../data/station';
import type {Scenario} from '../domain/types';
export interface WorkspaceState {scenario:Scenario;past:Scenario[];future:Scenario[];commit:(next:Scenario)=>void;undo:()=>void;redo:()=>void;reset:()=>void;}
export function createWorkspaceStore(){return createStore<WorkspaceState>((set,get)=>({
 scenario:freshScenario(),past:[],future:[],
 commit:(next)=>set(s=>({past:[...s.past,structuredClone(s.scenario)].slice(-30),scenario:structuredClone(next),future:[]})),
 undo:()=>set(s=>s.past.length?{past:s.past.slice(0,-1),scenario:structuredClone(s.past.at(-1)!),future:[structuredClone(s.scenario),...s.future].slice(0,30)}:s),
 redo:()=>set(s=>s.future.length?{past:[...s.past,structuredClone(s.scenario)].slice(-30),scenario:structuredClone(s.future[0]),future:s.future.slice(1)}:s),
 reset:()=>get().commit(freshScenario())
}));}
export const workspaceStore=createWorkspaceStore();
