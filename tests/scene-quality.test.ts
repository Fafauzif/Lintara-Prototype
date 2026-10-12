import { describe, expect, it } from 'vitest';
import type { AgentSample, SimulationResult } from '../src/domain/types';

// These invariants guard quality-dependent omissions, capped crowds, and repeated
// work on unchanged paused frames without requiring a WebGL context.
import * as scene from '../src/scene/quality';

describe('scene crowd quality', () => {
 it('keeps the existing Standard surface and reserves a distinct Lite geometry', () => {
  expect(scene.qualitySettings('balanced')).toMatchObject({ pixelRatio: 1, shadows: true, shadowMapSize: 1024, capsuleSegments: 3, radialSegments: 7, headWidthSegments: 10, headHeightSegments: 7, unlit: false });
  expect(scene.qualitySettings('low')).toMatchObject({ pixelRatio: .75, shadows: false, unlit: true });
  expect(scene.qualitySettings('high')).toMatchObject({ pixelRatio: 1.5, shadows: true, shadowMapSize: 2048, unlit: false });
  expect(scene.qualitySettings('low').radialSegments).toBeLessThan(scene.qualitySettings('balanced').radialSegments ?? 0);
  expect(scene.qualitySettings('high').radialSegments).toBeGreaterThan(scene.qualitySettings('balanced').radialSegments ?? 0);
 });
 it('includes every eligible agent in identity order, including a 21,001-person crowd', () => {
  const agents = Array.from({length:21001}, (_, id) => ({id, z:id%2 ? 10 : 0})) as AgentSample[];
  expect(scene.eligibleCrowd(agents, 'all')).toBe(agents);
  expect(scene.eligibleCrowd(agents, 'hall').map(a=>a.id)).toEqual(agents.filter(a=>a.z<5.15).map(a=>a.id));
  expect(scene.eligibleCrowd(agents, 'platform').map(a=>a.id)).toEqual(agents.filter(a=>a.z>=5.15).map(a=>a.id));
 });
 it('grows in reusable chunks beyond 20,000 without dropping people', () => {
  expect(scene.growCrowdCapacity(512, 513)).toBe(1024);
  expect(scene.growCrowdCapacity(1024, 900)).toBe(1024);
  expect(scene.growCrowdCapacity(512, 21001)).toBe(21504);
 });
 it('throws an explicit overflow instead of returning a capacity below demand', () => {
  expect(() => scene.growCrowdCapacity(512, 32769)).toThrow(/32,768|32768/);
 });
 it('reuses an unchanged paused snapshot and refreshes on seek or model replacement', () => {
  let calls=0;
  const result={snapshot:(time:number)=>{calls++;return {time,agents:[]};}} as unknown as SimulationResult;
  const cache=scene.createSnapshotCache();
  const first=cache.read(result, 120);
  expect(cache.read(result,120)).toBe(first);
  expect(calls).toBe(1);
  expect(cache.read(result,121)).not.toBe(first);
  const replacement={snapshot:(time:number)=>({time,agents:[]})} as unknown as SimulationResult;
  expect(cache.read(replacement,121)).not.toBe(cache.read(result,121));
  expect(calls).toBe(3);
 });
 it('keeps placement and its first completed frame free of automatic camera focus', () => {
  expect(scene.cameraFocusAllowed(true,false,false)).toBe(false);
  expect(scene.cameraFocusAllowed(false,true,false)).toBe(false);
  expect(scene.cameraFocusAllowed(false,false,true)).toBe(false);
  expect(scene.cameraFocusAllowed(false,false,false)).toBe(true);
 });
});

import * as THREE from 'three';
import { UNITS, freshScenario } from '../src/data/station';
import { clearCachedTenantLocations, placementPreviewTarget, placementTargetStatus, setPlacement } from '../src/scene/tenants';
import type { TenantsWorld } from '../src/scene/tenants';
import { Assets } from '../src/scene/assets';

function previewWorld():TenantsWorld {
 return {assets:new Assets(),valid:new Map(),outlines:new Map(UNITS.map(u=>[u.id,new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial())])),previews:new Map(UNITS.map(u=>[u.id,new THREE.Group()]))};
}
describe('snapped placement preview',()=>{
 it('shows one ghost at the target instead of every unit that fits',()=>{
  const world=previewWorld();
  setPlacement(world,freshScenario(),'coffee',0,'medium',undefined,'U3');
  expect([...world.previews.entries()].filter(([,p])=>p.visible).map(([id])=>id)).toEqual(['U3']);
 });
 it('keeps an invalid target visible so its rejection can be explained',()=>{
  const world=previewWorld();
  setPlacement(world,freshScenario(),'coffee',0,'medium',undefined,'U1');
  expect(world.valid.get('U1')).toBe(false);
  expect(world.previews.get('U1')?.visible).toBe(true);
  expect([...world.previews.values()].filter(p=>p.visible)).toHaveLength(1);
 });
 it('shows no ghost until a unit is targeted',()=>{
  const world=previewWorld();
  setPlacement(world,freshScenario(),'coffee',0,'medium');
  expect([...world.previews.values()].filter(p=>p.visible)).toHaveLength(0);
 });
});

describe('placement drag payload',()=>{
 it('accepts only a supported shop category from text/plain',()=>{
  const decode=scene.decodePlacementCategory;
  expect(decode('coffee')).toBe('coffee');
  expect(decode('retail')).toBe('retail');
  expect(decode('unsupported')).toBe(null);
  expect(decode('coffee<script>')).toBe(null);
  expect(decode('')).toBe(null);
 });
});

describe('protected placement targets',()=>{
 it('reports a protected-area reason without inventing a unit',()=>{
  expect(placementTargetStatus(freshScenario(),'coffee',null)).toEqual({unitId:'protected-area',valid:false,reason:'Place the shop inside an available commercial unit.'});
  expect(placementTargetStatus(freshScenario(),null,null)).toBe(null);
 });
});

describe('tenant location rebuild',()=>{
 it('clears old shop locations while preserving authored unit and train locations',()=>{
  const group=new THREE.Group();group.userData.selectId='T5';
  const world={units:new Map([['U3',group]]),locations:new Map([['T5',new THREE.Vector3(1,1,1)],['U3',new THREE.Vector3(1,1,1)],['TRAIN1',new THREE.Vector3(1,1,1)]])};
  clearCachedTenantLocations(world);
  expect(world.locations.has('T5')).toBe(false);
  expect(world.locations.has('U3')).toBe(true);
  expect(world.locations.has('TRAIN1')).toBe(true);
 });
});

describe('placement hover priority',()=>{
 it('does not keep a selected-unit ghost when the pointer is over a protected surface',()=>{
  expect(placementPreviewTarget(true,null,'U3')).toBe(null);
  expect(placementPreviewTarget(true,'U6','U3')).toBe('U6');
  expect(placementPreviewTarget(false,null,'U3')).toBe('U3');
 });
});
