import * as THREE from 'three';
import type { Category, Scenario, Tenant, Unit } from '../domain/types';
import { CATEGORIES, UNITS } from '../data/station';
import { canPlace, FOOTPRINTS } from '../domain/planning';
import { shopTransform } from '../domain/shopGeometry';
import { Assets, Batch, outline, pickVolume, translateLabel } from './assets';
import type { StationWorld } from './station';

export interface TenantsWorld {assets:Assets; outlines:Map<string,THREE.LineSegments>; valid:Map<string,boolean>; previews:Map<string,THREE.Group>;}

export function clearCachedTenantLocations(world:Pick<StationWorld,'units'|'locations'>){
 for(const [unitId,parent]of world.units){const id=parent.userData.selectId;if(typeof id==='string'&&id!==unitId)world.locations.delete(id);}
}

export function buildTenants(world:StationWorld,scenario:Scenario):TenantsWorld {
 clearCachedTenantLocations(world);
 const assets=new Assets();const outlines=new Map<string,THREE.LineSegments>(),valid=new Map<string,boolean>(),previews=new Map<string,THREE.Group>();
 for(const unit of UNITS){
  const parent=world.units.get(unit.id)!;parent.clear();const tenant=scenario.tenants.find(t=>t.unitId===unit.id);
  parent.userData.selectId=tenant?.id??unit.id;
  const shell=new Batch(assets);
  shell.box(tenant?'#E8E3D6':'#ECEDE4',0,0,0,unit.width,.05,unit.depth);
  // Landlord envelope: two fine paving bands, retained when the shop is moved.
  shell.box('#CBD4CD',0,.04,-unit.depth/2,unit.width,.08,.1);shell.box('#CBD4CD',-unit.width/2,.04,0,.1,.08,unit.depth);
  if(!tenant){shell.box('#DAE1D9',0,.045,0,unit.width-.5,.03,unit.depth-.5);}
  shell.finish(parent,false);
  parent.add(pickVolume(assets,tenant?.id??unit.id,0,.04,0,unit.width,.1,unit.depth));
  const border=outline(assets,unit.width,unit.depth,tenant?CATEGORIES[tenant.category].color:'#BBC8BE');border.position.y=.075;parent.add(border);outlines.set(unit.id,border);outlines.set(tenant?.id??unit.id,border);
  // One target is visible at a time; the translucent shell shows the actual shop footprint.
  const preview=new THREE.Group();const previewMaterial=new THREE.MeshBasicMaterial({color:'#21866B',transparent:true,opacity:.28,depthWrite:false});assets.materials.set(`ghost-${unit.id}`,previewMaterial);
  const previewBox=(x:number,y:number,z:number,w:number,h:number,d:number)=>{const mesh=new THREE.Mesh(assets.cube,previewMaterial);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.renderOrder=4;preview.add(mesh);};
  previewBox(0,.05,0,3,.1,2);previewBox(0,1.4,-1,3,2.7,.13);previewBox(-1.5,1.4,0,.13,2.7,2);previewBox(1.5,1.4,0,.13,2.7,2);previewBox(0,2.65,1,3.2,.5,.2);previewBox(0,.65,.35,2.3,1.1,.6);
  const previewOutline=outline(assets,FOOTPRINTS.small.width,FOOTPRINTS.small.depth,'#21866B');preview.add(previewOutline);preview.visible=false;parent.add(preview);previews.set(unit.id,preview);
  if(tenant){
   const shop=buildShop(assets,tenant,unit);parent.add(shop);const pose=shopTransform(unit,tenant);world.locations.set(tenant.id,new THREE.Vector3(pose.centerX,1,pose.centerZ));
  }else{
   const text=translateLabel(assets.label(unit.id.startsWith('S')?'PLANNING '+unit.label:'UNIT '+unit.label,Math.min(unit.width-1,4),.55,'#7A8C86','#E4EAE0',85),unit.id.startsWith('S')?'PLANNING '+unit.label:'UNIT '+unit.label,unit.id.startsWith('S')?'AREA RENCANA '+unit.label:'UNIT '+unit.label);text.rotation.x=-Math.PI/2;text.position.set(0,.09,0);parent.add(text);
  }
 }
 return{assets,outlines,valid,previews};
}

function buildShop(assets:Assets,tenant:Tenant,unit:Unit):THREE.Group{
 const shop=new THREE.Group();shop.userData.selectId=tenant.id;
 const pose=shopTransform(unit,tenant),w=pose.localWidth,d=pose.localDepth;
 // A frontage aligned footprint retains the clear middle concourse.
 shop.position.set(pose.offsetX,0,pose.offsetZ);shop.rotation.y=pose.angleY;
 const color=CATEGORIES[tenant.category].color,b=new Batch(assets);const hh=2.7;
 b.box('#F9F6EB',0,.1,0,w+.12,.16,d+.1);
 b.box('#E8E4D8',0,hh/2+.1,-d/2,w,hh,.14);
 b.box('#E8E4D8',-w/2,hh/2+.1,0,.14,hh,d);b.box('#E8E4D8',w/2,hh/2+.1,0,.14,hh,d);
 // Open front/top cutaway provides a useful view of the actual category fixtures.
 b.box(color,0,2.65,d/2,w+.22,.53,.25);b.box('#F6F3E8',0,2.39,d/2+.14,w+.26,.04,.23);
 b.box('#D7D5C4',-w/2,1.28,d/2,.11,2.55,.11);b.box('#D7D5C4',w/2,1.28,d/2,.11,2.55,.11);
 b.box('#728580',0,.22,d/2,w,.16,.11);
 const sign=assets.label(tenant.name,Math.min(w-.2,5.5),.4,'#ffffff',color,85);sign.position.set(0,2.68,d/2+.138);shop.add(sign);
 const slogans={bakery:['FRESH FROM THE OVEN','HANGAT DARI OVEN'],coffee:['BREWED FOR YOUR NEXT STOP','KOPI UNTUK PERJALANANMU'],meals:['GOOD FOOD. ON THE GO.','BEKAL ENAK. SIAP BERANGKAT.'],retail:['YOUR EVERYDAY ESSENTIALS','KEBUTUHAN HARIANMU']} as const;
 const accent=translateLabel(assets.label(slogans[tenant.category][0],w-.3,.2,'#576963','#F5F2E7',45),slogans[tenant.category][0],slogans[tenant.category][1]);accent.position.set(0,2.29,d/2+.06);shop.add(accent);
 b.box('#C1B499',-.2,.58,d/2-.65,w-.75,1.12,.7);b.box('#F1EEDC',-.2,1.19,d/2-.65,w-.7,.11,.79);
 b.box('#243B75',w/2-.65,1.39,d/2-.64,.33,.35,.28);b.box('#DFE5DB',w/2-.65,1.6,d/2-.56,.25,.1,.1);
 b.box('#BEC5B7',0,.72,-d/2+.32,w-.55,1.24,.49);b.box('#EEECE1',0,1.4,-d/2+.32,w-.6,.1,.55);
 switch(tenant.category){
  case'bakery':bakery(b,w,d);break;
  case'coffee':coffee(b,w,d);break;
  case'meals':meals(b,w,d);break;
  case'retail':retail(b,w,d);break;
 }
 // Staff are stationary props, not added to passenger simulation counts.
 for(let i=0;i<Math.min(tenant.staff,3);i++){const x=-w/2+.7+i*.65;b.cylinder(color,x,.99,-.08,.14,.48);b.sphere('#D3B493',x,1.36,-.08,.145);b.box('#E7E5D5',x,1,-.01,.18,.35,.11);}
 b.finish(shop);
 const small=new THREE.Group();small.position.set(w/2+.27,0,d/2+.36);const pb=new Batch(assets);
 pb.cylinder('#CFC8B7',0,.2,0,.19,.37);pb.sphere('#7C9A72',0,.68,0,.3,.46);pb.finish(small);shop.add(small);
 shop.add(pickVolume(assets,tenant.id,0,1.4,0,w,2.8,d));return shop;
}
function bakery(b:Batch,w:number,d:number){
 b.box('#BBA988',-w*.25,1.48,d/2-.66,w*.5,.52,.64);b.box('#D9E4D8',-w*.25,1.78,d/2-.66,w*.52,.06,.68);
 for(let shelf=0;shelf<2;shelf++)for(let k=0;k<4;k++){const x=-w*.48+.22+k*w*.115;b.sphere('#D6A152',x,1.27+shelf*.27,d/2-.5,.13,.1);b.sphere('#E8BA70',x+.13,1.27+shelf*.27,d/2-.7,.12,.08);}
 for(let k=0;k<5;k++)b.sphere('#C89955',-w*.35+k*w*.16,1.59,-d/2+.32,.18,.13);
 b.box('#D5B46C',w/2-.4,1.1,-d/2+.3,.33,.4,.3);
}
function coffee(b:Batch,w:number,d:number){
 b.box('#3E5352',-w*.23,1.48,d/2-.68,.88,.53,.47);b.box('#8FA8A1',-w*.23,1.79,d/2-.68,.88,.09,.49);
 for(const x of [-w*.23-.2,-w*.23+.2]){b.cylinder('#EFF0E4',x,1.24,d/2-.39,.09,.15);b.box('#BBC3B3',x,1.53,d/2-.39,.05,.18,.07);}
 b.box('#506965',w*.22,1.43,-d/2+.27,.29,.53,.26);b.cylinder('#AEB9A8',w*.22,1.85,-d/2+.27,.18,.42);
 for(let k=0;k<5;k++)b.cylinder('#E5DCCC',-w*.35+k*.33,1.56,-d/2+.3,.095,.3);
 b.box('#526C5F',-w*.27,2.05,-d/2+.1,w*.43,.69,.045);
}
function meals(b:Batch,w:number,d:number){
 for(let k=0;k<4;k++){const x=-w*.35+k*w*.18;b.box('#E4DDD0',x,1.32,d/2-.68,.43,.16,.44);b.sphere(['#C08561','#8B9E6E','#D9B771','#E8E4CF'][k],x,1.44,d/2-.68,.13,.045);}
 b.box('#667C79',-w*.27,1.72,-d/2+.27,.84,.51,.5);b.box('#A4B7AC',-w*.27,2.03,-d/2+.27,.9,.09,.54);
 for(let k=0;k<4;k++)b.box('#DEB47E',w*.15+k*.17,1.53,-d/2+.28,.13,.2,.2);
 b.box('#DCD0B7',w*.27,2.18,-d/2+.12,.6,.67,.04);
}
function retail(b:Batch,w:number,d:number){
 for(const x of [-w/2+.36,w/2-.36]){
  b.box('#CCD1C1',x,1.25,-.14,.46,2.18,Math.max(1,d-1.25));
  for(let level=0;level<3;level++)for(let k=0;k<4;k++){b.box(['#A6AF7C','#D9A880','#96AFA6','#AFB4C7'][k],x, .5+level*.5,-.62+k*.28,.34,.33,.18);}
 }
 b.box('#9DB1A7',-w*.23,1.6,-d/2+.3,.55,1.31,.54);b.box('#D0DFD5',-w*.23,1.6,-d/2+.61,.45,1.11,.04);
 for(let k=0;k<3;k++)b.box('#D0B884',w*.08+k*.31,1.62,-d/2+.25,.22,.43,.25);
}

export function setPlacement(t:TenantsWorld,scenario:Scenario,category:Category|null,rotation:number,size:Tenant['size']='medium',movingId?:string,targetUnit?:string|null){
 for(const unit of UNITS){
  const fits=!!category&&canPlace(scenario,category,unit.id,size,rotation,movingId).valid;
  t.valid.set(unit.id,fits);const line=t.outlines.get(unit.id)!;const mat=line.material as THREE.LineBasicMaterial;
  const targeted=!!category&&unit.id===targetUnit,tenant=scenario.tenants.find(s=>s.unitId===unit.id),tint=fits?'#21866B':'#CD594D';
  mat.color.set(targeted?tint:tenant?CATEGORIES[tenant.category].color:'#BBC8BE');mat.opacity=targeted?.95:.5;
  const preview=t.previews.get(unit.id)!,pose=shopTransform(unit,{size,rotation});preview.visible=targeted;preview.rotation.y=pose.angleY;
  preview.scale.set(pose.localWidth/FOOTPRINTS.small.width,1,pose.localDepth/FOOTPRINTS.small.depth);preview.position.set(pose.offsetX,.15,pose.offsetZ);
  if(targeted)preview.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.LineSegments){const materials=Array.isArray(object.material)?object.material:[object.material];for(const material of materials){if(material instanceof THREE.MeshBasicMaterial||material instanceof THREE.LineBasicMaterial)material.color.set(tint);}}});
 }
}

export function placementTargetStatus(scenario:Scenario,category:Category|null,unitId:string|null,size:Tenant['size']='medium',rotation=0,movingId?:string):{unitId:string;valid:boolean;reason:string}|null{
 if(!category)return null;
 if(!unitId)return {unitId:'protected-area',valid:false,reason:'Place the shop inside an available commercial unit.'};
 return {unitId,...canPlace(scenario,category,unitId,size,rotation,movingId)};
}

export function placementPreviewTarget(overCanvas:boolean,hovered:string|null,selected?:string|null):string|null{
 return overCanvas?hovered:selected??null;
}
