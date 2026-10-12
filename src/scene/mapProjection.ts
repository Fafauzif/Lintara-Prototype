import { SCREENS, UNITS } from '../data/station';
import { canPlace } from '../domain/planning';
import { shopTransform } from '../domain/shopGeometry';
import type { AgentSample, Category, Scenario, SceneProps, Snapshot, Tenant, Unit } from '../domain/types';

export interface MapPoint { x:number; z:number; }
export interface MapScreenPoint { x:number; y:number; }
export interface MapCamera { centerX:number; centerZ:number; scale:number; }
export interface MapViewport { width:number; height:number; }
export interface MapBounds { minX:number; maxX:number; minZ:number; maxZ:number; }

/** Metres from the authored station floor, rather than a second planning model. */
export const MAP_BOUNDS:MapBounds = {minX:-36,maxX:36,minZ:-13,maxZ:22};
export const HALL_BOUNDS:MapBounds = {minX:-30,maxX:30,minZ:-13,maxZ:6};
export const PLATFORM_BOUNDS:MapBounds = {minX:-36,maxX:36,minZ:5.15,maxZ:22};

export function worldToMap(point:MapPoint,camera:MapCamera,viewport:MapViewport):MapScreenPoint {
  return {x:viewport.width/2+(point.x-camera.centerX)*camera.scale,y:viewport.height/2+(point.z-camera.centerZ)*camera.scale};
}
export function mapToWorld(point:MapScreenPoint,camera:MapCamera,viewport:MapViewport):MapPoint {
  return {x:camera.centerX+(point.x-viewport.width/2)/camera.scale,z:camera.centerZ+(point.y-viewport.height/2)/camera.scale};
}
export function fitMapCamera(width:number,height:number,view:SceneProps['cameraView'],floor:SceneProps['floor']='all'):MapCamera {
  const bounds=floor==='hall'?HALL_BOUNDS:floor==='platform'?PLATFORM_BOUNDS:view==='hall'?HALL_BOUNDS:view==='platform'?PLATFORM_BOUNDS:MAP_BOUNDS;
  const roomWidth=Math.max(1,width-40),roomHeight=Math.max(1,height-40);
  return {centerX:(bounds.minX+bounds.maxX)/2,centerZ:(bounds.minZ+bounds.maxZ)/2,scale:Math.min(roomWidth/(bounds.maxX-bounds.minX),roomHeight/(bounds.maxZ-bounds.minZ))};
}
export function withinBounds(point:MapPoint,bounds:MapBounds):boolean {
  return Number.isFinite(point.x)&&Number.isFinite(point.z)&&point.x>=bounds.minX&&point.x<=bounds.maxX&&point.z>=bounds.minZ&&point.z<=bounds.maxZ;
}
export function hitUnitAt(point:MapPoint):Unit|null {
  return UNITS.find(unit=>withinBounds(point,{minX:unit.x-unit.width/2,maxX:unit.x+unit.width/2,minZ:unit.z-unit.depth/2,maxZ:unit.z+unit.depth/2}))??null;
}
/** The shared frontage/quarter-turn transform also defines clickable shop walls. */
export function hitShopAt(point:MapPoint,scenario:Scenario):Tenant|null {
  return scenario.tenants.find(tenant=>{
    const unit=UNITS.find(value=>value.id===tenant.unitId);
    return !!unit&&withinBounds(point,shopTransform(unit,tenant).bounds);
  })??null;
}
export interface MapPlacement { unitId:string|null; valid:boolean; reason:string; }
export function placementAt(point:MapPoint,scenario:Scenario,category:Category,size:Tenant['size']='medium',rotation=0,movingId?:string):MapPlacement {
  const unit=hitUnitAt(point);
  const check=canPlace(scenario,category,unit?.id??'',size,rotation,movingId);
  return {unitId:unit?.id??null,...check};
}
export function agentInFloor(agent:Pick<AgentSample,'z'>,floor:SceneProps['floor']):boolean {
  return floor==='all'||(floor==='hall'?agent.z<5.15:agent.z>=5.15);
}
export function trainMapPose(train:Snapshot['train']) {
  const progress=Math.max(0,Math.min(1,train.progress));
  return {x:train.phase==='approaching'?-83*(1-progress):train.phase==='departing'?83*progress:0,z:train.platform===1?15.15:12.35,width:49,depth:2.7,visible:train.phase!=='absent',doorsOpen:train.phase==='dwell'};
}
export function hitStationAt(point:MapPoint,scenario:Scenario,floor:SceneProps['floor'],snapshot?:Snapshot):string|null {
  if(floor!=='hall'){
    const trains=snapshot?.trains??(snapshot?[snapshot.train]:[]);
    for(const train of trains){const pose=trainMapPose(train);if(pose.visible&&withinBounds(point,{minX:pose.x-pose.width/2,maxX:pose.x+pose.width/2,minZ:pose.z-pose.depth/2,maxZ:pose.z+pose.depth/2}))return train.platform===1?'TRAIN2':'TRAIN1';}
  }
  if(floor!=='platform'){
    const tenant=hitShopAt(point,scenario);if(tenant)return tenant.id;
    const unit=hitUnitAt(point);if(unit)return unit.id;
    for(const screen of SCREENS){const halfWidth=screen.id==='AD1'?2.2:1.5;if(withinBounds(point,{minX:screen.x-halfWidth,maxX:screen.x+halfWidth,minZ:screen.z-.19,maxZ:screen.z+.19}))return screen.id;}
    if(withinBounds(point,{minX:6.3,maxX:13.5,minZ:3.25,maxZ:4.85}))return 'G1';
    if(withinBounds(point,{minX:-29,maxX:29,minZ:-12,maxZ:5.15}))return 'ZHALL';
  }
  if(floor!=='hall'){
    if(withinBounds(point,{minX:-33,maxX:33,minZ:6.6,maxZ:11}))return 'ZPLATFORM1';
    if(withinBounds(point,{minX:-33,maxX:33,minZ:16.3,maxZ:20.7}))return 'ZPLATFORM2';
  }
  return null;
}
