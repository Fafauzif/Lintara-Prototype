import type {Tenant,Unit} from './types';
import {FOOTPRINTS} from './planning';

export interface ShopPoint{x:number;y:number;z:number;}
/** The one commercial pose contract consumed by planning-world rendering and movement. */
export function shopTransform(unit:Unit,tenant:Pick<Tenant,'size'|'rotation'>){
 const localWidth=FOOTPRINTS[tenant.size].width,localDepth=FOOTPRINTS[tenant.size].depth;
 const angle=((tenant.rotation%360)+360)%360,sideways=angle%180!==0,south=unit.z>0;
 const width=sideways?localDepth:localWidth,depth=sideways?localWidth:localDepth;
 const offsetX=(angle===90?1:angle===270?-1:0)*(unit.width-width)/2;
 const offsetZ=sideways?0:(south?-1:1)*(angle===180?-1:1)*(unit.depth-depth)/2;
 const centerX=unit.x+offsetX,centerZ=unit.z+offsetZ,angleY=south?Math.PI-angle*Math.PI/180:angle*Math.PI/180;
 const sine=Math.round(Math.sin(angleY)),cosine=Math.round(Math.cos(angleY));
 const toWorld=(x:number,z:number):ShopPoint=>({x:centerX+x*cosine+z*sine,y:1,z:centerZ-x*sine+z*cosine});
 return {localWidth,localDepth,width,depth,offsetX,offsetZ,centerX,centerZ,angleY,
  bounds:{minX:centerX-width/2,maxX:centerX+width/2,minZ:centerZ-depth/2,maxZ:centerZ+depth/2},
  front:toWorld(0,localDepth/2+.8),entry:toWorld(0,localDepth/2),inside:toWorld(0,localDepth/2-.1),toWorld,
 };
}
