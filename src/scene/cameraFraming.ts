import type { MapBounds, MapCamera } from './mapProjection';

export interface FramePoint { x:number; y:number; z:number; }
export interface FrameBounds extends MapBounds { minY:number; maxY:number; }
export interface CameraFrame { target:FramePoint; offset:FramePoint; bounds:FrameBounds; }
type View='overview'|'hall'|'platform'|'top';
type Floor='all'|'hall'|'platform';

const STATION:FrameBounds={minX:-38,maxX:38,minY:-1.3,maxY:10.5,minZ:-19.5,maxZ:27.5};
// Three central storefronts, their queues and the planning court are the arrival view.
const HALL:FrameBounds={minX:-16,maxX:13,minY:.8,maxY:6.6,minZ:-12,maxZ:5};
const PLATFORM:FrameBounds={minX:-36,maxX:36,minY:-.65,maxY:5,minZ:5.15,maxZ:22};
const MAP_STATION:MapBounds={minX:-36,maxX:36,minZ:-13,maxZ:22};
const center=(bounds:FrameBounds):FramePoint=>({x:(bounds.minX+bounds.maxX)/2,y:(bounds.minY+bounds.maxY)/2,z:(bounds.minZ+bounds.maxZ)/2});
const measured=(size:number)=>Number.isFinite(size)&&size>0?Math.max(1,Math.min(16384,size)):1;
const normalize=(point:FramePoint):FramePoint=>{const length=Math.hypot(point.x,point.y,point.z)||1;return{x:point.x/length,y:point.y/length,z:point.z/length};};
const cross=(a:FramePoint,b:FramePoint):FramePoint=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const dot=(a:FramePoint,b:FramePoint)=>a.x*b.x+a.y*b.y+a.z*b.z;

export function cameraFrame(view:View,floor:Floor='all'):CameraFrame {
  if(floor==='platform')view='platform';else if(floor==='hall'&&view==='platform')view='hall';
  const bounds=floor==='hall'?HALL:view==='hall'?HALL:view==='platform'?PLATFORM:STATION;
  const offset=view==='hall'?{x:13,y:19,z:28}:view==='platform'?{x:23,y:31,z:38}:view==='top'?{x:.01,y:75,z:.01}:{x:38,y:54,z:45};
  return {target:center(bounds),offset,bounds:{...bounds}};
}
/** A selected storefront keeps adjacent frontage and the queue in the shot. */
export function shopCameraFrame(point:FramePoint):CameraFrame {
  const bounds:FrameBounds={minX:point.x-10,maxX:point.x+10,minY:point.y-.4,maxY:point.y+5.2,minZ:point.z-5,maxZ:point.z+8};
  return {target:center(bounds),offset:{x:10,y:15,z:25},bounds};
}
export function frameCorners(bounds:FrameBounds):FramePoint[] {
  const points:FramePoint[]=[];
  for(const x of [bounds.minX,bounds.maxX])for(const y of [bounds.minY,bounds.maxY])for(const z of [bounds.minZ,bounds.maxZ])points.push({x,y,z});
  return points;
}
export function projectFramePoint(point:FramePoint,frame:CameraFrame):{x:number;y:number} {
  const back=normalize(frame.offset),right=normalize(cross({x:0,y:1,z:0},back)),up=normalize(cross(back,right));
  const relative={x:point.x-frame.target.x,y:point.y-frame.target.y,z:point.z-frame.target.z};
  return{x:dot(relative,right),y:dot(relative,up)};
}
/** Fit projected world bounds, rather than an unrelated fixed 50-metre frustum. */
export function cameraFrustum(frame:CameraFrame,width:number,height:number):{left:number;right:number;top:number;bottom:number} {
  let halfWidth=1,halfHeight=1;
  for(const corner of frameCorners(frame.bounds)){const projected=projectFramePoint(corner,frame);halfWidth=Math.max(halfWidth,Math.abs(projected.x));halfHeight=Math.max(halfHeight,Math.abs(projected.y));}
  const aspect=measured(width)/measured(height),top=Math.max(halfHeight,halfWidth/aspect)*1.08,right=top*aspect;
  return {left:-right,right,top,bottom:-top};
}
export function mapFrameBounds(view:View,floor:Floor):MapBounds {
  if(floor==='platform'||(view==='platform'&&floor!=='hall'))return {...PLATFORM};
  if(view==='hall'||floor==='hall')return {...HALL};
  return {...MAP_STATION};
}
export function fitBoundsMapCamera(bounds:MapBounds,width:number,height:number):MapCamera {
  const roomWidth=Math.max(1,measured(width)-40),roomHeight=Math.max(1,measured(height)-40);
  return {centerX:(bounds.minX+bounds.maxX)/2,centerZ:(bounds.minZ+bounds.maxZ)/2,scale:Math.min(roomWidth/Math.max(1,bounds.maxX-bounds.minX),roomHeight/Math.max(1,bounds.maxZ-bounds.minZ))};
}
/** Resize keeps the user's center and zoom factor; it never re-centers a panned map. */
export function resizeMapCamera(camera:MapCamera,oldBaseScale:number,newBaseScale:number):MapCamera {
  const base=Number.isFinite(newBaseScale)&&newBaseScale>0?newBaseScale:1;
  const ratio=Number.isFinite(oldBaseScale)&&oldBaseScale>0&&Number.isFinite(camera.scale)&&camera.scale>0?camera.scale/oldBaseScale:1;
  return {...camera,scale:Math.max(Number.MIN_VALUE,Math.min(Number.MAX_VALUE,base*ratio))};
}
