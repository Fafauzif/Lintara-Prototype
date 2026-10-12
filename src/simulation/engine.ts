import type {AgentSample,Bucket,Campaign,Comparison,Metrics,Scenario,SimulationResult,Snapshot,Tenant,TenantMetrics} from '../domain/types';
import {BASELINE,CATEGORIES,DURATION,PLATFORM_FLOW,SCREENS,TRAIN_DOOR_X,UNITS} from '../data/station';
import {shopTransform} from '../domain/shopGeometry';
import {canPlace} from '../domain/planning';
import {buildTrainSchedule,checkTrainConflicts,TRAIN_APPROACH_SECONDS,TRAIN_DEPARTURE_SECONDS} from '../domain/trainSchedule';
import type {TrainScheduleEntry} from '../domain/trainSchedule';
import {draw,EventHeap} from './random';
import {distance,eventActive,nearestOnLeg,Router,ROUTE_CLOSURE_IDS,visibilityOnLeg} from './routing';
import type {Leg,Point,Route} from './routing';

interface Segment extends Leg{state:AgentSample['state'];tenantId?:string;}
interface Agent{id:number;born:number;depart:number;origin:Point;destination:Point;boarding:boolean;boardingDoor?:Point;lane:number;speed:number;color:number;segments:Segment[];passing:Set<string>;screens:Map<string,Exposure>;}
interface Visit{id:number;agent:Agent;tenant:Tenant;entry:number;join?:number;serviceStart?:number;serviceEnd?:number;exit?:number;queueEnd?:number;purchase?:number;sale:number;margin:number;abandoned:boolean;state:'browse'|'queue'|'service'|'complete';rawService:number;}
interface Shop{tenant:Tenant;pose:ReturnType<typeof shopTransform>;front:Point;entry:Point;inside:Point;queue:Visit[];busy:number;}
interface Pass{time:number;agent:number;tenant:string;}
interface Exposure{time:number;agent:number;screen:string;intervals:{start:number;end:number}[];}
interface Train extends TrainScheduleEntry{count:number;}
interface Birth{id:number;time:number;platform?:number;door?:number;}
const resultCache=new Map<string,SimulationResult>();
const bounded=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const overlap=(a:number,b:number,c:number,d:number)=>Math.max(0,Math.min(b,d)-Math.max(a,c));
const mean=(values:number[])=>values.length?values.reduce((n,v)=>n+v,0)/values.length:0;
const p90=(values:number[])=>values.length?[...values].sort((a,b)=>a-b)[Math.max(0,Math.ceil(values.length*.9)-1)]:0;
const inWindow=(time:number|undefined,start:number,end:number)=>time!==undefined&&time>=start&&time<end;
const activeAgent=(agent:Agent,time:number)=>agent.born<time&&agent.depart>=time;
const finite=(n:number)=>Number.isFinite(n);
function immutable<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))immutable(child);Object.freeze(value);}return value;}

function validate(scenario:Scenario){
 if(scenario.version!==1||!finite(scenario.seed))throw new Error('Unsupported scenario version or seed.');
 if(scenario.crowd!==undefined&&scenario.crowd!=='normal'&&scenario.crowd!=='busy')throw new Error('Crowd demand must be normal or busy.');
 const occupied=new Set<string>(),ids=new Set<string>();
 for(const tenant of scenario.tenants){
  const unit=UNITS.find(u=>u.id===tenant.unitId);
  if(!unit||!unit.allowed.includes(tenant.category))throw new Error(`Tenant ${tenant.id} has an invalid unit/category.`);
  if(occupied.has(unit.id)||ids.has(tenant.id))throw new Error('Each commercial unit and tenant ID must be unique.');
  const placement=canPlace(scenario,tenant.category,tenant.unitId,tenant.size,tenant.rotation,tenant.id);if(!placement.valid)throw new Error(placement.reason);
  if(!Number.isInteger(tenant.staff)||tenant.staff<0||tenant.staff>12)throw new Error('Staff must be an integer between 0 and 12.');
  if(!finite(tenant.open)||!finite(tenant.close)||tenant.open<0||tenant.close>DURATION||tenant.close<tenant.open)throw new Error('Shop hours must fit the modeled horizon.');
  if(!finite(tenant.preparation)||tenant.preparation<0||tenant.preparation>4)throw new Error('Preparation factor must be between 0 and 4.');
  if(tenant.basket!==undefined&&(!finite(tenant.basket)||tenant.basket<0))throw new Error('Basket must be nonnegative IDR.');
  if(tenant.serviceSeconds!==undefined&&(!finite(tenant.serviceSeconds)||tenant.serviceSeconds<5||tenant.serviceSeconds>600))throw new Error('Service duration must be 5–600 seconds.');
  if(tenant.margin!==undefined&&(!finite(tenant.margin)||tenant.margin<0||tenant.margin>1))throw new Error('Gross margin must be between 0 and 1.');
  if(tenant.occupancyPerDay!==undefined&&(!finite(tenant.occupancyPerDay)||tenant.occupancyPerDay<0))throw new Error('Occupancy cost must be nonnegative.');
  occupied.add(unit.id);ids.add(tenant.id);
 }
 for(const event of scenario.events){
  if(!finite(event.start)||!finite(event.duration)||!finite(event.magnitude)||event.start<0||event.duration<=0)throw new Error('Events require a valid time, duration and magnitude.');
  if(event.type==='closure'&&!ids.has(event.target??'')&&!(ROUTE_CLOSURE_IDS as readonly string[]).includes(event.target??'central-route'))throw new Error('Closure must preserve the known reachable concourse route.');
 }
 const trainError=checkTrainConflicts(scenario);if(trainError)throw new Error(trainError);
 for(const campaign of scenario.campaigns){if(!ids.has(campaign.tenantId)||!SCREENS.some(s=>s.id===campaign.screenId)||!finite(campaign.budget)||campaign.budget<0||campaign.start<0||campaign.end<=campaign.start||campaign.end>DURATION)throw new Error('Campaign target, screen, window and budget must be valid.');}
}
function schedule(scenario:Scenario):{births:Birth[];trains:Train[]}{
 // These are planning assumptions. Omitted crowd retains the original version-1 demand schedule.
 const multiplier=scenario.crowd==='normal'?1.6:scenario.crowd==='busy'?2.8:1,births:Birth[]=[],slots=Math.round(1200*multiplier);
 for(let slot=0;slot<slots;slot++)if(draw(scenario.seed,slot,'background-inclusion')<.65)births.push({id:slot+1,time:(slot*3+draw(scenario.seed,slot,'background-time')*2.8)/multiplier});
 const trains:Train[]=buildTrainSchedule(scenario).map(train=>({...train,count:train.authored?Math.round((65+Math.floor(draw(scenario.seed,train.id,'alighting-count')*21))*multiplier):Math.round(bounded(scenario.events.find(e=>`event:${e.id}`===train.identity)!.magnitude,0,1500))}));
 for(const train of trains)for(let n=0;n<train.count;n++){const identity=train.identity,base=train.authored?10000+Number(train.id.slice(6))*2000:1000000000+Math.floor(draw(scenario.seed,identity,'event-identity')*4294967296)*2048;const time=train.start+(n+.15+draw(scenario.seed,`${identity}|${n}`,'wave-time')*.7)/Math.max(1,train.count)*train.spread;if(time<DURATION)births.push({id:base+n,time,platform:train.platform,door:n%TRAIN_DOOR_X.length});}
 births.sort((a,b)=>a.time-b.time||a.id-b.id);trains.sort((a,b)=>a.start-b.start);return {births,trains};
}

/** Event ledger and trajectories are independent of renderer and replay order. */
export function simulate(input:Scenario):SimulationResult{
 validate(input);const key=JSON.stringify(input),cached=resultCache.get(key);if(cached)return cached;
 const scenario=immutable(structuredClone(input)),router=new Router(scenario),events=new EventHeap();
 const {births,trains}=schedule(scenario),agents:Agent[]=[],visits:Visit[]=[],passes:Pass[]=[],exposures:Exposure[]=[];
 const shops=new Map<string,Shop>();
 for(const tenant of scenario.tenants){const pose=shopTransform(router.unit(tenant),tenant);shops.set(tenant.id,{tenant,pose,front:pose.front,entry:pose.entry,inside:pose.inside,queue:[],busy:0});}
 let visitId=0;
 const staff=(tenant:Tenant,time:number)=>Math.max(0,tenant.staff+scenario.events.filter(e=>e.type==='staff'&&e.target===tenant.id&&eventActive(e,time)).reduce((n,e)=>n+Math.round(e.magnitude),0));
 const isOpen=(tenant:Tenant,time:number)=>time>=tenant.open&&time<tenant.close&&!scenario.events.some(e=>e.type==='closure'&&e.target===tenant.id&&eventActive(e,time));
 const stationary=(agent:Agent,start:number,end:number,point:Point,state:AgentSample['state'],tenantId?:string)=>{if(end>start)agent.segments.push({start,end,from:{...point},to:{...point},state,tenantId});};
 const move=(agent:Agent,start:number,end:number,from:Point,to:Point,state:AgentSample['state'],tenantId?:string)=>{if(end>start)agent.segments.push({start,end,from:{...from},to:{...to},state,tenantId});};
 const queuePosition=(shop:Shop,index:number):Point=>{const columns=Math.max(3,Math.floor((shop.pose.localWidth-.4)/.46)),row=Math.floor(index/columns),column=row%2===0?index%columns:columns-1-index%columns;return shop.pose.toWorld((column-(columns-1)/2)*.46,shop.pose.localDepth/2+.8+row*.32);};
 const pass=(agent:Agent,tenant:Tenant,time:number)=>{if(!agent.passing.has(tenant.id)&&isOpen(tenant,time)){agent.passing.add(tenant.id);passes.push({agent:agent.id,tenant:tenant.id,time});}};
 const addRoute=(agent:Agent,route:Route)=>{
  for(const leg of route.legs){agent.segments.push({...leg,state:'walking'});if(leg.from.y===1&&leg.to.y===1){
   for(const shop of shops.values()){const near=nearestOnLeg(shop.front,leg);if(near.distance<4.5)pass(agent,shop.tenant,near.time);}
   for(const screen of SCREENS){const visible=visibilityOnLeg({x:screen.x,y:1,z:screen.z},leg);if(!visible)continue;const previous=agent.screens.get(screen.id);if(previous)previous.intervals.push(visible);else{const exposure:Exposure={time:visible.start,agent:agent.id,screen:screen.id,intervals:[visible]};agent.screens.set(screen.id,exposure);exposures.push(exposure);}}
  }}
 };
 const depart=(agent:Agent,origin:Point,time:number)=>{
  const route=router.route(origin,agent.destination,time,agent.speed,agent.lane);addRoute(agent,route);let end=route.end;
  if(agent.boarding){
   const platform=agent.destination.z>14?1:0,train=trains.find(t=>t.platform===platform&&t.start+t.dwell>=end+8),leave=train?Math.max(end+8,train.start+train.dwell-8):end+90;
   stationary(agent,end,leave,agent.destination,'browsing');const door=agent.boardingDoor!;
   // The last door is beside the bridge stairs. Approach it along the clear rail-side strip.
   const points=door.x>20.85?[agent.destination,{...agent.destination,z:platform===0?10.38:17},door]:[agent.destination,door],length=points.slice(1).reduce((total,point,index)=>total+distance(points[index],point),0);let time=leave;
   for(let index=1;index<points.length;index++){const next=time+6*distance(points[index-1],points[index])/length;move(agent,time,next,points[index-1],points[index],'walking');time=next;}
   end=leave+6;
  }
  agent.depart=end;
 };
 const leaveDoor=(agent:Agent,shop:Shop,time:number)=>{const clear=time+distance(shop.entry,shop.front)/agent.speed;move(agent,time,clear,shop.entry,shop.front,'walking',shop.tenant.id);events.push(clear,()=>depart(agent,shop.front,clear));};
 const finishVisit=(visit:Visit,time:number)=>{visit.exit=time;visit.state='complete';leaveDoor(visit.agent,shops.get(visit.tenant.id)!,time);};
 const abandon=(visit:Visit,time:number)=>{if(visit.state!=='queue')return;const shop=shops.get(visit.tenant.id)!,index=shop.queue.indexOf(visit),position=time===visit.join?shop.front:queuePosition(shop,Math.max(0,index));shop.queue=shop.queue.filter(v=>v!==visit);visit.abandoned=true;visit.queueEnd=time;stationary(visit.agent,visit.join!,time,shop.front,'queue',visit.tenant.id);const clear=time+distance(position,shop.front)/visit.agent.speed;move(visit.agent,time,clear,position,shop.front,'walking',visit.tenant.id);events.push(clear,()=>{visit.exit=clear;visit.state='complete';depart(visit.agent,shop.front,clear);});};
 const pump=(shop:Shop,time:number)=>{
  if(!isOpen(shop.tenant,time))return;
  while(shop.busy<staff(shop.tenant,time)&&shop.queue.length){
   const visit=shop.queue.shift()!;if(visit.state!=='queue')continue;visit.state='service';visit.serviceStart=time;visit.queueEnd=time;stationary(visit.agent,visit.join!,time,shop.front,'queue',visit.tenant.id);
   const parameters=CATEGORIES[shop.tenant.category],tasks=bounded(parameters.taskMinutesPerHour/60*shop.tenant.preparation,0,.7),slot=queuePosition(shop,0),slotWalk=distance(shop.front,slot)/visit.agent.speed,progress=bounded((time-visit.join!)/Math.max(.001,slotWalk),0,1),servicePosition={x:shop.front.x+(slot.x-shop.front.x)*progress,y:1,z:shop.front.z+(slot.z-shop.front.z)*progress},approach=distance(servicePosition,shop.entry)/visit.agent.speed,walk=distance(shop.entry,shop.inside)/visit.agent.speed,seconds=Math.max(visit.rawService/(1-tasks),approach+walk+1);visit.serviceEnd=time+seconds;shop.busy++;
   move(visit.agent,time,time+approach,servicePosition,shop.entry,'walking',shop.tenant.id);move(visit.agent,time+approach,time+approach+walk,shop.entry,shop.inside,'service',shop.tenant.id);stationary(visit.agent,time+approach+walk,time+seconds,shop.inside,'service',shop.tenant.id);
   events.push(time+seconds,()=>{
    shop.busy--;if(draw(scenario.seed,visit.agent.id,`purchase:${shop.tenant.category}`)<.90){visit.purchase=time+seconds;visit.sale=Math.round((shop.tenant.basket??parameters.basket)*(.8+.4*draw(scenario.seed,visit.agent.id,`basket:${shop.tenant.category}`))/100)*100;visit.margin=Math.round(visit.sale*(shop.tenant.margin??parameters.margin));}
    const walkOut=distance(shop.inside,shop.entry)/visit.agent.speed,linger=Math.max(walkOut+1,(shop.tenant.category==='meals'?20:shop.tenant.category==='retail'?12:6)+draw(scenario.seed,visit.agent.id,'after-service')*8);stationary(visit.agent,time+seconds,time+seconds+linger-walkOut,shop.inside,'browsing',shop.tenant.id);move(visit.agent,time+seconds+linger-walkOut,time+seconds+linger,shop.inside,shop.entry,'browsing',shop.tenant.id);events.push(time+seconds+linger,()=>finishVisit(visit,time+seconds+linger));pump(shop,time+seconds);
   });
  }
 };
 const enter=(agent:Agent,shop:Shop,time:number)=>{
  if(!isOpen(shop.tenant,time)){leaveDoor(agent,shop,time);return;}
  const parameters=CATEGORIES[shop.tenant.category],workers=staff(shop.tenant,time),expectedWait=shop.queue.length*(shop.tenant.serviceSeconds??parameters.service)/Math.max(1,workers),acceptance=.97-.35*bounded(expectedWait/parameters.patience,0,1);
  if(draw(scenario.seed,agent.id,`enter:${shop.tenant.category}`)>acceptance){leaveDoor(agent,shop,time);return;}
  pass(agent,shop.tenant,time);
  const visit:Visit={id:++visitId,agent,tenant:shop.tenant,entry:time,sale:0,margin:0,abandoned:false,state:'browse',rawService:(shop.tenant.serviceSeconds??parameters.service)*(.75+.5*draw(scenario.seed,agent.id,`service:${shop.tenant.category}`))};visits.push(visit);
  const walkIn=distance(shop.entry,shop.inside)/agent.speed,clearDoor=distance(shop.entry,shop.front)/agent.speed,browsing=Math.max(walkIn*2+clearDoor+1,(shop.tenant.category==='retail'?22:shop.tenant.category==='meals'?12:6)+draw(scenario.seed,agent.id,`browse:${shop.tenant.category}`)*14);move(agent,time,time+walkIn,shop.entry,shop.inside,'browsing',shop.tenant.id);stationary(agent,time+walkIn,time+browsing-walkIn-clearDoor,shop.inside,'browsing',shop.tenant.id);move(agent,time+browsing-walkIn-clearDoor,time+browsing-clearDoor,shop.inside,shop.entry,'browsing',shop.tenant.id);move(agent,time+browsing-clearDoor,time+browsing,shop.entry,shop.front,'walking',shop.tenant.id);
  events.push(time+browsing,()=>{visit.join=time+browsing;visit.state='queue';shop.queue.push(visit);const maximum=shop.tenant.size==='small'?8:shop.tenant.size==='large'?18:12;if(shop.queue.length>maximum){abandon(visit,visit.join);return;}const patience=parameters.patience*(.7+.6*draw(scenario.seed,agent.id,`patience:${shop.tenant.category}`));events.push(visit.join+patience,()=>abandon(visit,visit.join!+patience));pump(shop,visit.join);});
 };
 const campaignLift=(tenant:Tenant,agent:Agent,path:Route,time:number,entryTime:number)=>{
  let lift=0;
  for(const campaign of scenario.campaigns){if(campaign.archived||campaign.tenantId!==tenant.id||time<campaign.start||time>=campaign.end||campaign.budget<=0)continue;const screen=SCREENS.find(s=>s.id===campaign.screenId)!;const seconds=path.legs.reduce((total,leg)=>{const visible=visibilityOnLeg({x:screen.x,y:1,z:screen.z},leg);return total+(visible?overlap(visible.start,visible.end,campaign.start,Math.min(campaign.end,entryTime)):0);},0);if(seconds>0&&(campaign.objective!=='purchases'||seconds>=2)&&draw(scenario.seed,agent.id,`notice:${campaign.screenId}`)<.7){const hourly=campaign.budget*3600/(campaign.end-campaign.start),coefficient=campaign.objective==='visits'?1:campaign.objective==='purchases'?.8:.55;lift+=Math.min(.65,hourly/250000)*coefficient;}}
  return Math.min(.75,lift);
 };
 const spawn=(birth:Birth)=>{
  const fromTrain=birth.platform!==undefined,side=draw(scenario.seed,birth.id,'origin-side')<.57,lane=(Math.floor(draw(scenario.seed,birth.id,'corridor-lane')*7)-3)*.2,boarding=!fromTrain&&draw(scenario.seed,birth.id,'boarding-journey')<.32,platform=boarding?(draw(scenario.seed,birth.id,'boarding-platform')<.5?0:1):birth.platform??0,doorIndex=birth.door??Math.floor(draw(scenario.seed,birth.id,'boarding-door')*TRAIN_DOOR_X.length),door={x:TRAIN_DOOR_X[doorIndex]+(draw(scenario.seed,birth.id,'door-position')-.5)*.3,y:0,z:PLATFORM_FLOW[platform].doorZ},waiting={x:Math.min(19.45,TRAIN_DOOR_X[doorIndex])+(draw(scenario.seed,birth.id,'waiting-position')-.5)*2.8,y:0,z:PLATFORM_FLOW[platform].waitRows[Math.floor(draw(scenario.seed,birth.id,'waiting-row')*3)]},origin=fromTrain?door:router.point(side?'W':'E',lane),destination=boarding?waiting:router.point(fromTrain?(side?'W':'E'):(side?'E':'W'),lane);
  const agent:Agent={id:birth.id,born:birth.time,depart:Infinity,origin,destination,boarding,...(boarding?{boardingDoor:door}:{}),lane,speed:.85+draw(scenario.seed,birth.id,'walking-speed')*.5,color:Math.floor(draw(scenario.seed,birth.id,'visual-color')*6),segments:[],passing:new Set(),screens:new Map()};agents.push(agent);
  const normal=router.route(origin,destination,birth.time,agent.speed,agent.lane),options:{shop:Shop;weight:number;route:Route}[]=[];
  for(const shop of shops.values()){
   let nearest=Infinity;for(const leg of normal.legs)if(leg.from.y===1&&leg.to.y===1)nearest=Math.min(nearest,nearestOnLeg(shop.front,leg).distance);if(nearest>5.8)continue;
   const route=router.route(origin,shop.front,birth.time,agent.speed,agent.lane);if(!isOpen(shop.tenant,route.end))continue;
   const parameter=CATEGORIES[shop.tenant.category],substitutes=[...shops.values()].filter(o=>o.tenant.category===shop.tenant.category&&distance(o.front,shop.front)<15).length,journey=boarding?.72:fromTrain?1.05:1,weight=parameter.attraction*router.unit(shop.tenant).fit*journey*(1-nearest/8)/Math.sqrt(substitutes)*(1+campaignLift(shop.tenant,agent,normal,birth.time,route.end+distance(shop.front,shop.entry)/agent.speed));if(weight>0)options.push({shop,weight,route});
  }
  const sum=options.reduce((n,o)=>n+o.weight,0),probability=Math.min(.58,1-Math.exp(-sum*1.28));
  if(sum>0&&draw(scenario.seed,birth.id,'shopping-opportunity')<probability){let choice=draw(scenario.seed,birth.id,'shop-choice')*sum,selected=options[options.length-1];for(const option of options){choice-=option.weight;if(choice<=0){selected=option;break;}}addRoute(agent,selected.route);const entryTime=selected.route.end+distance(selected.shop.front,selected.shop.entry)/agent.speed;move(agent,selected.route.end,entryTime,selected.shop.front,selected.shop.entry,'walking',selected.shop.tenant.id);events.push(entryTime,()=>enter(agent,selected.shop,entryTime));}else depart(agent,origin,birth.time);
 };
 for(const event of scenario.events)if(event.type==='staff'||event.type==='closure'){const targets=event.target&&shops.has(event.target)?[shops.get(event.target)!]:[...shops.values()];events.push(event.start,()=>targets.forEach(shop=>pump(shop,event.start)));events.push(event.start+event.duration,()=>targets.forEach(shop=>pump(shop,event.start+event.duration)));}
 for(const shop of shops.values())events.push(shop.tenant.open,()=>pump(shop,shop.tenant.open));for(const birth of births)events.push(birth.time,()=>spawn(birth));
 while(events.size){const event=events.pop();if(event.time>DURATION+1200)break;event.run();}
 for(const agent of agents)agent.segments.sort((a,b)=>a.start-b.start);passes.sort((a,b)=>a.time-b.time);exposures.sort((a,b)=>a.time-b.time);
 const queueAt=(tenantId:string,time:number)=>visits.filter(v=>v.tenant.id===tenantId&&v.join!==undefined&&v.join<time&&(v.queueEnd===undefined||v.queueEnd>=time));
 const serviceOverlap=(visit:Visit,start:number,end:number)=>visit.serviceStart!==undefined&&visit.serviceEnd!==undefined?overlap(start,end,visit.serviceStart,visit.serviceEnd)*(visit.rawService/(visit.serviceEnd-visit.serviceStart))/60:0;
 const cumulativeWorkerSeconds=(tenant:Tenant,end:number)=>{const breaks=[0,end,tenant.open,tenant.close,...scenario.events.filter(e=>e.type==='staff'&&e.target===tenant.id).flatMap(e=>[e.start,e.start+e.duration])].filter(t=>t>=0&&t<=end).sort((a,b)=>a-b);let seconds=0;for(let i=1;i<breaks.length;i++){const mid=(breaks[i]+breaks[i-1])/2;if(mid>=tenant.open&&mid<tenant.close)seconds+=(breaks[i]-breaks[i-1])*staff(tenant,mid);}return seconds;};
 const campaignCumulative=(campaign:Campaign,time:number)=>Math.round(campaign.budget*bounded((time-campaign.start)/(campaign.end-campaign.start),0,1));
 const metricCache=new Map<string,Metrics>();
 const metrics=(requestedStart=0,requestedEnd=DURATION,tenantId?:string):Metrics=>{
  const start=bounded(finite(requestedStart)?requestedStart:0,0,DURATION),end=Math.max(start,bounded(finite(requestedEnd)?requestedEnd:DURATION,0,DURATION)),cacheKey=`${start}|${end}|${tenantId??''}`,previous=metricCache.get(cacheKey);if(previous)return previous;
  const selected=scenario.tenants.filter(t=>!tenantId||t.id===tenantId),waitTimes:number[]=[];
  const tenants:TenantMetrics[]=selected.map(tenant=>{
   const parameter=CATEGORIES[tenant.category],cohort=visits.filter(v=>v.tenant.id===tenant.id),entries=cohort.filter(v=>inWindow(v.entry,start,end)),completed=cohort.filter(v=>inWindow(v.exit,start,end)),transactions=cohort.filter(v=>inWindow(v.purchase,start,end)),waits=cohort.filter(v=>inWindow(v.serviceStart,start,end)).map(v=>(v.serviceStart!-v.join!)/60);waitTimes.push(...waits);
   const sales=transactions.reduce((n,v)=>n+v.sale,0),grossMargin=transactions.reduce((n,v)=>n+v.margin,0),workerSeconds=cumulativeWorkerSeconds(tenant,end)-cumulativeWorkerSeconds(tenant,start),labor=Math.round(cumulativeWorkerSeconds(tenant,end)*parameter.wagePerHour/3600)-Math.round(cumulativeWorkerSeconds(tenant,start)*parameter.wagePerHour/3600),daily=tenant.occupancyPerDay??router.unit(tenant).rentPerDay,occupancyCost=Math.round(daily*end/86400)-Math.round(daily*start/86400),campaignCost=scenario.campaigns.filter(c=>!c.archived&&c.tenantId===tenant.id).reduce((n,c)=>n+campaignCumulative(c,end)-campaignCumulative(c,start),0),passing=new Set(passes.filter(p=>p.tenant===tenant.id&&inWindow(p.time,start,end)).map(p=>p.agent)).size,tasks=parameter.taskMinutesPerHour*tenant.preparation*overlap(start,end,tenant.open,tenant.close)/3600,workload=cohort.reduce((n,v)=>n+serviceOverlap(v,start,end),0)+tasks;
   const passingIds=new Set(passes.filter(p=>p.tenant===tenant.id&&inWindow(p.time,start,end)).map(p=>p.agent)),attributableEntries=entries.filter(v=>passingIds.has(v.agent.id)).length;
   return {tenantId:tenant.id,passing,visits:entries.length,completed:completed.length,transactions:transactions.length,abandoned:cohort.filter(v=>v.abandoned&&inWindow(v.exit,start,end)).length,sales,grossMargin,labor,occupancyCost,campaignCost,contribution:grossMargin-labor-occupancyCost-campaignCost,entryRate:passing?attributableEntries/passing:null,conversion:completed.length?completed.filter(v=>v.purchase!==undefined).length/completed.length:null,waitMean:mean(waits),waitP90:p90(waits),dwellMean:mean(completed.map(v=>(v.exit!-v.entry)/60)),queueLength:queueAt(tenant.id,end).length,workload,coverage:workload>0?workerSeconds/60/workload:0};
  });
  const present=agents.filter(a=>activeAgent(a,end)).length,eligibleExposure=exposures.filter(e=>inWindow(e.time,start,end)&&(!tenantId||scenario.campaigns.some(c=>!c.archived&&c.tenantId===tenantId&&c.screenId===e.screen&&inWindow(e.time,c.start,c.end))));
  const qualified=(exposure:Exposure)=>{const windows=tenantId?scenario.campaigns.filter(c=>!c.archived&&c.tenantId===tenantId&&c.screenId===exposure.screen).map(c=>({start:Math.max(start,c.start),end:Math.min(end,c.end)})):[{start,end}];const pieces=exposure.intervals.flatMap(interval=>windows.map(window=>({start:Math.max(interval.start,window.start),end:Math.min(interval.end,window.end)}))).filter(p=>p.end>p.start).sort((a,b)=>a.start-b.start);let seconds=0,lastStart=0,lastEnd=0;for(const piece of pieces){if(piece.start<=lastEnd)lastEnd=Math.max(lastEnd,piece.end);else{seconds+=lastEnd-lastStart;lastStart=piece.start;lastEnd=piece.end;}}return seconds+lastEnd-lastStart>=2;};
  const result:Metrics={start,end,arrivals:births.filter(b=>inWindow(b.time,start,end)).length,departed:agents.filter(a=>inWindow(a.depart,start,end)).length,present,visits:tenants.reduce((n,t)=>n+t.visits,0),transactions:tenants.reduce((n,t)=>n+t.transactions,0),sales:tenants.reduce((n,t)=>n+t.sales,0),contribution:tenants.reduce((n,t)=>n+t.contribution,0),waitMean:mean(waitTimes),waitP90:p90(waitTimes),abandoned:tenants.reduce((n,t)=>n+t.abandoned,0),exposure:eligibleExposure.length,qualifiedExposure:eligibleExposure.filter(qualified).length,tenants};
  metricCache.set(cacheKey,result);if(metricCache.size>32)metricCache.delete(metricCache.keys().next().value!);return result;
 };
 const snapshotCache=new Map<number,Snapshot>();
 const snapshot=(requestedTime:number):Snapshot=>{
  const time=bounded(finite(requestedTime)?requestedTime:0,0,DURATION),previous=snapshotCache.get(time);if(previous)return previous;
  const samples:AgentSample[]=[],queues:Record<string,number>={},queued=new Map<number,{shop:Shop;index:number;join:number}>();
  for(const shop of shops.values()){const waiting=queueAt(shop.tenant.id,time).sort((a,b)=>a.join!-b.join!||a.id-b.id);queues[shop.tenant.id]=waiting.length;waiting.forEach((v,index)=>queued.set(v.agent.id,{shop,index,join:v.join!}));}
  for(const agent of agents){if(!activeAgent(agent,time))continue;let lo=0,hi=agent.segments.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(agent.segments[mid].start<time)lo=mid;else hi=mid-1;}const segment=agent.segments[lo];if(!segment)continue;const fraction=bounded((time-segment.start)/Math.max(.0001,segment.end-segment.start),0,1);let x=segment.from.x+(segment.to.x-segment.from.x)*fraction,y=segment.from.y+(segment.to.y-segment.from.y)*fraction,z=segment.from.z+(segment.to.z-segment.from.z)*fraction;const queue=queued.get(agent.id);if(queue){const target=queuePosition(queue.shop,queue.index),walk=distance(queue.shop.front,target)/agent.speed,progress=bounded((time-queue.join)/Math.max(.001,walk),0,1);x=queue.shop.front.x+(target.x-queue.shop.front.x)*progress;z=queue.shop.front.z+(target.z-queue.shop.front.z)*progress;}samples.push({id:agent.id,x,y,z,angle:Math.atan2(segment.to.x-segment.from.x,segment.to.z-segment.from.z),color:agent.color,state:queue?'queue':segment.state,...(segment.tenantId?{tenantId:segment.tenantId}:{})});}
  const visible:NonNullable<Snapshot['trains']>=[];for(const scheduled of trains){if(time>=scheduled.start-TRAIN_APPROACH_SECONDS&&time<scheduled.start)visible.push({id:scheduled.id,phase:'approaching',progress:(time-(scheduled.start-TRAIN_APPROACH_SECONDS))/TRAIN_APPROACH_SECONDS,platform:scheduled.platform});else if(time>=scheduled.start&&time<scheduled.start+scheduled.dwell)visible.push({id:scheduled.id,phase:'dwell',progress:(time-scheduled.start)/scheduled.dwell,platform:scheduled.platform});else if(time>=scheduled.start+scheduled.dwell&&time<scheduled.start+scheduled.dwell+TRAIN_DEPARTURE_SECONDS)visible.push({id:scheduled.id,phase:'departing',progress:(time-scheduled.start-scheduled.dwell)/TRAIN_DEPARTURE_SECONDS,platform:scheduled.platform});}
  visible.sort((a,b)=>a.platform-b.platform);const primary=visible[0];const train:Snapshot['train']=primary?{phase:primary.phase,progress:primary.progress,platform:primary.platform}:{phase:'absent',progress:0,platform:0};
  const captured=immutable({time,agents:samples,present:samples.length,queues,train,trains:visible});snapshotCache.set(time,captured);if(snapshotCache.size>8)snapshotCache.delete(snapshotCache.keys().next().value!);return captured;
 };
 const buckets:Bucket[]=[];for(let time=0;time<DURATION;time+=300){const m=metrics(time,time+300);buckets.push({time,arrivals:m.arrivals,present:m.present,visits:m.visits,sales:m.sales,waitMean:m.waitMean});}
 const result:SimulationResult={scenario,duration:DURATION,snapshot,metrics,buckets};resultCache.set(key,result);if(resultCache.size>6)resultCache.delete(resultCache.keys().next().value!);return result;
}

/** Explicit demand/disruption condition, also used to display the stress world itself. */
export function createStressScenario(scenario:Scenario):Scenario{
 const stress=structuredClone(scenario);stress.id=`${scenario.id}-stress`;stress.name='Arrival pressure';
 stress.events=stress.events.filter(e=>!['stress-arrival','stress-absence','stress-rain'].includes(e.id));
 const timetable=buildTrainSchedule(stress),candidates:{start:number;platform:0|1}[]=[];
 for(const platform of [0,1] as const){candidates.push({start:1200,platform},{start:0,platform});for(const train of timetable.filter(t=>t.platform===platform))candidates.push({start:train.start+train.dwell+TRAIN_APPROACH_SECONDS+TRAIN_DEPARTURE_SECONDS,platform});}
 candidates.sort((a,b)=>Math.abs(a.start-1200)-Math.abs(b.start-1200)||a.platform-b.platform);
 let added=false;
 for(const candidate of candidates){if(candidate.start<0||candidate.start+150>DURATION)continue;const wave={id:'stress-arrival',type:'arrival' as const,start:candidate.start,duration:150,magnitude:180,target:candidate.platform===0?'platform-a':'platform-b'};if(!checkTrainConflicts({events:[...stress.events,wave]})){stress.events.push(wave);added=true;break;}}
 if(!added){const arrival=stress.events.filter(e=>e.type==='arrival'&&e.magnitude<1500).sort((a,b)=>Math.abs(a.start-1200)-Math.abs(b.start-1200))[0];if(arrival)arrival.magnitude+=Math.min(180,1500-arrival.magnitude);}
 const coffee=stress.tenants.find(t=>t.category==='coffee');if(coffee)stress.events.push({id:'stress-absence',type:'staff',start:1200,duration:600,magnitude:-1,target:coffee.id});
 stress.events.push({id:'stress-rain',type:'rain',start:1200,duration:600,magnitude:.6});return stress;
}
export function compareScenarios(scenario:Scenario,start=0,end=DURATION):Comparison{
 const baseline=structuredClone(BASELINE);baseline.seed=scenario.seed;
 if(scenario.crowd===undefined)delete baseline.crowd;else baseline.crowd=scenario.crowd;
 return {baseline:simulate(baseline).metrics(start,end),proposed:simulate(structuredClone(scenario)).metrics(start,end),stress:simulate(createStressScenario(scenario)).metrics(start,end)};
}
