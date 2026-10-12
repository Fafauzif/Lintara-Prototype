import type { AgentSample, SceneProps, SimulationResult, Snapshot } from '../domain/types';

export interface QualitySettings {
 pixelRatio:number;shadows:boolean;shadowMapSize:number;capsuleSegments:number;radialSegments:number;headWidthSegments:number;headHeightSegments:number;unlit:boolean;
}
const settings:Record<SceneProps['quality'],QualitySettings>={
 low:{pixelRatio:.75,shadows:false,shadowMapSize:1024,capsuleSegments:1,radialSegments:4,headWidthSegments:5,headHeightSegments:3,unlit:true},
 balanced:{pixelRatio:1,shadows:true,shadowMapSize:1024,capsuleSegments:3,radialSegments:7,headWidthSegments:10,headHeightSegments:7,unlit:false},
 high:{pixelRatio:1.5,shadows:true,shadowMapSize:2048,capsuleSegments:5,radialSegments:12,headWidthSegments:16,headHeightSegments:10,unlit:false},
};
export function qualitySettings(quality:SceneProps['quality']):Readonly<QualitySettings>{return settings[quality];}

export const CROWD_CHUNK=512;
export const MAX_CROWD_CAPACITY=32768;
/** Allocate every eligible person or fail explicitly; quality never limits counts. */
export function growCrowdCapacity(current:number,required:number):number {
 if(!Number.isSafeInteger(required)||required<0)throw new Error('Crowd count must be a finite non-negative integer.');
 if(required>MAX_CROWD_CAPACITY)throw new Error(`The 3D view supports up to ${MAX_CROWD_CAPACITY.toLocaleString('en-US')} people at once. This snapshot has ${required.toLocaleString('en-US')}; use the 2D plan and analysis for this scenario.`);
 return Math.max(current,Math.ceil(required/CROWD_CHUNK)*CROWD_CHUNK,CROWD_CHUNK);
}
export function eligibleCrowd(agents:AgentSample[],floor:SceneProps['floor']):AgentSample[]{
 return floor==='all'?agents:agents.filter(a=>floor==='hall'?a.z<5.15:a.z>=5.15);
}
/** A paused clock and unchanged model reuse the exact snapshot object. */
export function createSnapshotCache(){
 let previousResult:SimulationResult|null=null,previousTime=NaN,previousSnapshot:Snapshot|null=null;
 return{read(result:SimulationResult,time:number):Snapshot{
  if(previousResult!==result||previousTime!==time||!previousSnapshot){previousSnapshot=result.snapshot(time);previousTime=time;previousResult=result;}
  return previousSnapshot;
 }};
}
export function cameraFocusAllowed(placing:boolean,placementJustEnded:boolean,dropJustCommitted:boolean):boolean{
 return !placing&&!placementJustEnded&&!dropJustCommitted;
}
export function decodePlacementCategory(value:string):SceneProps['placement']{
 return value==='bakery'||value==='coffee'||value==='meals'||value==='retail'?value:null;
}
