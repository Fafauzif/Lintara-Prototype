import type { Campaign, Category, Scenario, ScenarioEvent, Tenant } from './types';
import { CATEGORIES, DURATION, SCREENS, UNITS } from '../data/station';
import { validateTrainSchedule } from './trainSchedule';

/** Authored planning footprints (metres), deliberately limited to commercial slots. */
export const FOOTPRINTS: Record<Tenant['size'], {width:number;depth:number}> = {
  small:{width:3,depth:2},medium:{width:4,depth:3},large:{width:6,depth:4}
};
const MAX_EVENTS=24, MAX_CAMPAIGNS=30;
const categories=Object.keys(CATEGORIES) as Category[];
const rotations=[0,90,180,270];
const routeIds=['central-route','spine-mid__spine-east','main-route','concourse'];
type Plain=Record<string,unknown>;
function object(value:unknown,label:string):Plain {
  if (!value || typeof value!=='object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Plain;
}
function finite(value:unknown,label:string,min:number,max:number,integer=false):number {
  if(typeof value!=='number'||!Number.isFinite(value)||(integer&&!Number.isInteger(value))||value<min||value>max)
    throw new Error(`${label} must be ${integer?'an integer':'a finite number'} between ${min} and ${max}.`);
  return value;
}
function string(value:unknown,label:string,max=80):string {
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f\u007f]/.test(value)) throw new Error(`${label} must be non-empty text of at most ${max} characters.`);
  return value.trim();
}
function id(value:unknown,label:string):string {
  const result=string(value,label,64);
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(result))throw new Error(`${label} contains unsupported ID characters.`);
  return result;
}
function list(value:unknown,label:string,max:number):unknown[] {
  if(!Array.isArray(value)||value.length>max)throw new Error(`${label} must be an array containing at most ${max} items.`);
  return value;
}
function unique(values:{id:string}[],label:string) {
  if(new Set(values.map(v=>v.id)).size!==values.length)throw new Error(`${label} IDs must be unique.`);
}
function footprint(size:Tenant['size'],rotation:number) {
  const dimensions=FOOTPRINTS[size];
  return rotation===90||rotation===270?{width:dimensions.depth,depth:dimensions.width}:dimensions;
}
function overlaps(a:{x:number;z:number;width:number;depth:number},b:{x:number;z:number;width:number;depth:number}) {
  return Math.abs(a.x-b.x)<(a.width+b.width)/2-1e-6 && Math.abs(a.z-b.z)<(a.depth+b.depth)/2-1e-6;
}

export function canPlace(scenario:Scenario,category:Category,unitId:string,size:Tenant['size']='medium',rotation=0,movingId?:string):{valid:boolean;reason:string} {
  if(!categories.includes(category))return {valid:false,reason:'Choose a supported tenant category.'};
  if(!Object.hasOwn(FOOTPRINTS,size))return {valid:false,reason:'Choose a small, medium, or large footprint.'};
  if(!rotations.includes(rotation))return {valid:false,reason:'Rotation must be 0°, 90°, 180°, or 270°.'};
  if(movingId&&!scenario.tenants.some(t=>t.id===movingId))return {valid:false,reason:'The tenant to move does not exist.'};
  const unit=UNITS.find(u=>u.id===unitId);
  if(!unit)return {valid:false,reason:'Choose a designated commercial unit or a bounded planning slot; routes and platforms are protected.'};
  if(!unit.allowed.includes(category))return {valid:false,reason:'This unit does not allow that tenant category.'};
  if(scenario.tenants.some(t=>t.id!==movingId&&t.unitId===unitId))return {valid:false,reason:'This unit is occupied. Move or remove its current tenant first.'};
  const dimensions=footprint(size,rotation);
  if(dimensions.width>unit.width||dimensions.depth>unit.depth)return {valid:false,reason:'The unit is too small for this footprint and rotation.'};
  // Unit polygons are authored outside through-routes, gates, steps, and track safety edges.
  // Requiring full containment protects those routes, including the bounded sandbox.
  if(unit.x-dimensions.width/2 < -25 || unit.x+dimensions.width/2>25 || unit.z-dimensions.depth/2 < -11 || unit.z+dimensions.depth/2>3.5)
    return {valid:false,reason:'This footprint crosses the commercial boundary or route clearance.'};
  const occupied=scenario.tenants.filter(t=>t.id!==movingId).some(t=>{
    const otherUnit=UNITS.find(u=>u.id===t.unitId);
    if(!otherUnit||!Object.hasOwn(FOOTPRINTS,t.size)||!rotations.includes(t.rotation))return true;
    return overlaps({...unit,...dimensions},{...otherUnit,...footprint(t.size,t.rotation)});
  });
  if(occupied)return {valid:false,reason:'This footprint overlaps another tenant or an invalid placement.'};
  return {valid:true,reason:'Fits the unit and preserves circulation.'};
}

export function validateScenario(input:unknown):Scenario {
  const source=object(input,'Scenario');
  if(source.version!==1)throw new Error('Unsupported scenario version. Import a version 1 Lintara plan.');
  const scenario:Scenario={version:1,id:id(source.id,'Scenario ID'),name:string(source.name,'Scenario name'),seed:finite(source.seed,'Seed',0,4294967295,true),tenants:[],events:[],campaigns:[]};
  if(source.crowd!==undefined){
    if(source.crowd!=='normal'&&source.crowd!=='busy')throw new Error('Crowd demand must be normal or busy.');
    scenario.crowd=source.crowd;
  }
  const tenants=list(source.tenants,'Tenants',UNITS.length);
  for(const [index,value] of tenants.entries()){
    const data=object(value,`Tenant ${index+1}`);
    const category=string(data.category,'Tenant category') as Category;
    if(!categories.includes(category))throw new Error('Tenant category is not supported.');
    const size=string(data.size,'Tenant size') as Tenant['size'];
    if(!Object.hasOwn(FOOTPRINTS,size))throw new Error('Tenant size must be small, medium, or large.');
    const tenant:Tenant={id:id(data.id,'Tenant ID'),name:string(data.name,'Tenant name'),category,unitId:id(data.unitId,'Tenant unit ID'),staff:finite(data.staff,'Tenant staff',1,12,true),size,rotation:finite(data.rotation,'Tenant rotation',0,270,true),open:finite(data.open,'Tenant open time',0,DURATION),close:finite(data.close,'Tenant close time',0,DURATION),preparation:finite(data.preparation,'Tenant preparation',.25,4)};
    if(data.basket!==undefined)tenant.basket=finite(data.basket,'Tenant basket',0,100000000,true);
    if(data.serviceSeconds!==undefined)tenant.serviceSeconds=finite(data.serviceSeconds,'Tenant service time',5,600);
    if(data.margin!==undefined)tenant.margin=finite(data.margin,'Tenant margin',0,1);
    if(data.occupancyPerDay!==undefined)tenant.occupancyPerDay=finite(data.occupancyPerDay,'Tenant occupancy cost per day',0,100000000,true);
    if(tenant.close<=tenant.open)throw new Error('Tenant opening hours must end after they start.');
    if(!rotations.includes(tenant.rotation))throw new Error('Tenant rotation must be 0, 90, 180, or 270 degrees.');
    if(scenario.tenants.some(t=>t.id===tenant.id))throw new Error('Tenant IDs must be unique.');
    const allowed=canPlace(scenario,tenant.category,tenant.unitId,tenant.size,tenant.rotation);
    if(!allowed.valid)throw new Error(`Tenant ${tenant.name}: ${allowed.reason}`);
    scenario.tenants.push(tenant);
  }
  for(const [index,value] of list(source.events,'Events',MAX_EVENTS).entries()){
    const data=object(value,`Event ${index+1}`);
    const type=string(data.type,'Event type') as ScenarioEvent['type'];
    if(!['arrival','delay','rain','closure','staff'].includes(type))throw new Error('Unsupported event type.');
    const event:ScenarioEvent={id:id(data.id,'Event ID'),type,start:finite(data.start,'Event start',0,DURATION),duration:finite(data.duration,'Event duration',1,DURATION),magnitude:0};
    if(event.start+event.duration>DURATION)throw new Error('Event window must fit inside the simulation period.');
    const ranges:Record<ScenarioEvent['type'],[number,number,boolean]>={arrival:[0,1500,true],delay:[0,900,true],rain:[0,1,false],closure:[1,1,true],staff:[-12,12,true]};
    event.magnitude=finite(data.magnitude,`${type} magnitude`,...ranges[type]);
    if(data.target!==undefined)event.target=id(data.target,'Event target');
    if(type==='staff'&&(!event.target||!scenario.tenants.some(t=>t.id===event.target)))throw new Error('Staff event target must reference an existing tenant.');
    if(type==='closure'&&event.target&&!routeIds.includes(event.target)&&!scenario.tenants.some(t=>t.id===event.target))throw new Error('Closure event target must reference a valid route or tenant.');
    if(type==='arrival'&&event.target&&!['platform-a','platform-b'].includes(event.target))throw new Error('Arrival event target must be platform-a or platform-b.');
    if(type==='delay'&&event.target&&!/^train-[1-6]$/.test(event.target))throw new Error('Delay event target must reference a valid train ID (train-1 through train-6).');
    if(type==='rain'&&event.target)throw new Error('Rain applies to the entire station and cannot have a target.');
    scenario.events.push(event);
  }
  unique(scenario.events,'Event');
  validateTrainSchedule(scenario.events);
  for(const [index,value] of list(source.campaigns,'Campaigns',MAX_CAMPAIGNS).entries()){
    const data=object(value,`Campaign ${index+1}`);
    const objective=string(data.objective,'Campaign objective') as Campaign['objective'];
    if(!['awareness','visits','purchases'].includes(objective))throw new Error('Campaign objective must be awareness, visits, or purchases.');
    const campaign:Campaign={id:id(data.id,'Campaign ID'),name:string(data.name,'Campaign name'),screenId:id(data.screenId,'Campaign screen ID'),tenantId:id(data.tenantId,'Campaign tenant ID'),start:finite(data.start,'Campaign start',0,DURATION),end:finite(data.end,'Campaign end',0,DURATION),budget:finite(data.budget,'Campaign budget',0,100000000,true),objective};
    if(data.creative!==undefined){
      if(data.creative!=='journey'&&data.creative!=='fresh')throw new Error('Campaign creative must be journey or fresh.');
      campaign.creative=data.creative;
    }
    if(data.archived!==undefined){
      if(typeof data.archived!=='boolean')throw new Error('Campaign archived must be a boolean.');
      campaign.archived=data.archived;
    }
    if(campaign.end<=campaign.start)throw new Error('Campaign end must be after its start.');
    if(!SCREENS.some(s=>s.id===campaign.screenId))throw new Error('Campaign screen reference does not exist.');
    if(!scenario.tenants.some(t=>t.id===campaign.tenantId))throw new Error('Campaign tenant reference does not exist.');
    scenario.campaigns.push(campaign);
  }
  unique(scenario.campaigns,'Campaign');
  return scenario;
}

export function placeTenant(scenario:Scenario,category:Category,unitId:string,size:Tenant['size']='medium',rotation=0,movingId?:string):Scenario {
  const check=canPlace(scenario,category,unitId,size,rotation,movingId);
  if(!check.valid)throw new Error(check.reason);
  let tenants:Tenant[];
  if(movingId)tenants=scenario.tenants.map(t=>t.id===movingId?{...t,category,unitId,size,rotation}:{...t});
  else {
    let number=1;while(scenario.tenants.some(t=>t.id===`T${number}`))number++;
    const count=scenario.tenants.filter(t=>t.category===category).length;
    tenants=[...scenario.tenants,{id:`T${number}`,name:CATEGORIES[category].name+(count?` ${count+1}`:''),category,unitId,size,rotation,staff:2,open:0,close:DURATION,preparation:1}];
  }
  return validateScenario({...scenario,tenants});
}
export function removeTenant(scenario:Scenario,tenantId:string):Scenario {
  if(!scenario.tenants.some(t=>t.id===tenantId))throw new Error('The tenant to remove does not exist.');
  return validateScenario({...scenario,tenants:scenario.tenants.filter(t=>t.id!==tenantId),campaigns:scenario.campaigns.filter(c=>c.tenantId!==tenantId),events:scenario.events.filter(e=>e.target!==tenantId)});
}
export function updateTenant(scenario:Scenario,tenantId:string,patch:Partial<Tenant>):Scenario {
  if(!scenario.tenants.some(t=>t.id===tenantId))throw new Error('The tenant to update does not exist.');
  if(patch.id!==undefined&&patch.id!==tenantId)throw new Error('Tenant identity cannot change during an update.');
  return validateScenario({...scenario,tenants:scenario.tenants.map(t=>t.id===tenantId?{...t,...patch}:t)});
}
