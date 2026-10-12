import type {Scenario,ScenarioEvent,Tenant,Unit} from '../domain/types';
import {UNITS} from '../data/station';
import {shopTransform} from '../domain/shopGeometry';
export interface Point{x:number;y:number;z:number;}
export interface Leg{from:Point;to:Point;start:number;end:number;}
export interface Route{legs:Leg[];end:number;}
const p=(x:number,z:number,y=1):Point=>({x,y,z});
const nodes:Record<string,Point>={W:p(-28,-2.8),N1:p(-19,-2.8),N2:p(-10,-2.8),N3:p(-1,-2.8),N4:p(8,-2.8),N5:p(17,-2.8),E:p(28,-2.8),B1:p(-10,4.2),B2:p(8,4.2),G:p(12,-2.8),Gate:p(12,4.5),Stair:p(8,6),Down:p(8,9,0),PA:p(-6,10,0),BridgeBase:p(21.4,8.8,0),BridgeStart:p(26,8.8,2.65),BridgeEnd:p(26,18.5,2.65),BridgeFar:p(21.4,18.5,0),PB:p(5,17.5,0)};
interface Edge{from:string;to:string;central?:boolean;}
const edges:Edge[]=[{from:'W',to:'N1'},{from:'N1',to:'N2'},{from:'N2',to:'N3'},{from:'N3',to:'N4',central:true},{from:'N4',to:'G'},{from:'G',to:'N5'},{from:'N5',to:'E'},{from:'N2',to:'B1'},{from:'B1',to:'B2'},{from:'B2',to:'N4'},{from:'G',to:'Gate'},{from:'Gate',to:'Stair'},{from:'Stair',to:'Down'},{from:'Down',to:'PA'},{from:'Down',to:'BridgeBase'},{from:'BridgeBase',to:'BridgeStart'},{from:'BridgeStart',to:'BridgeEnd'},{from:'BridgeEnd',to:'BridgeFar'},{from:'BridgeFar',to:'PB'}];
export const ROUTE_CLOSURE_IDS=['central-route','spine-mid__spine-east','main-route','concourse'] as const;
export function eventActive(event:ScenarioEvent,time:number){return time>=event.start&&time<event.start+event.duration;}
export function distance(a:Point,b:Point){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}
export function front(tenant:Tenant,unit:Unit):Point{return shopTransform(unit,tenant).front;}
export function nearestOnLeg(point:Point,leg:Leg){const dx=leg.to.x-leg.from.x,dy=leg.to.y-leg.from.y,dz=leg.to.z-leg.from.z,length=dx*dx+dy*dy+dz*dz;const fraction=length===0?0:Math.max(0,Math.min(1,((point.x-leg.from.x)*dx+(point.y-leg.from.y)*dy+(point.z-leg.from.z)*dz)/length));return {distance:distance(point,{x:leg.from.x+dx*fraction,y:leg.from.y+dy*fraction,z:leg.from.z+dz*fraction}),time:leg.start+(leg.end-leg.start)*fraction,fraction};}
/** Circle/segment intersection clipped to the actual leg, never an unbounded chord. */
export function visibilityOnLeg(point:Point,leg:Leg,radius=4.5):{start:number;end:number}|null{
 if(leg.from.y!==point.y||leg.to.y!==point.y)return null;
 const dx=leg.to.x-leg.from.x,dz=leg.to.z-leg.from.z,ox=leg.from.x-point.x,oz=leg.from.z-point.z;
 const a=dx*dx+dz*dz,c=ox*ox+oz*oz-radius*radius;
 if(a<1e-10)return c<0?{start:leg.start,end:leg.end}:null;
 const b=2*(ox*dx+oz*dz),discriminant=b*b-4*a*c;if(discriminant<=0)return null;
 const root=Math.sqrt(discriminant),lo=Math.max(0,(-b-root)/(2*a)),hi=Math.min(1,(-b+root)/(2*a));
 if(hi<=lo)return null;return {start:leg.start+(leg.end-leg.start)*lo,end:leg.start+(leg.end-leg.start)*hi};
}
/** Cached graph paths. Platform access occurs only through the authored gate and stairs. */
export class Router{
 private paths=new Map<string,string[]>();private connectors=new Map<string,Point[]>();constructor(private scenario:Scenario){}
 point(id:string){return {...nodes[id]};}
 rain(time:number){return Math.min(1,this.scenario.events.filter(e=>e.type==='rain'&&eventActive(e,time)).reduce((n,e)=>n+e.magnitude,0));}
 route(origin:Point,destination:Point,start:number,speed:number):Route{
  const from=this.nearest(origin),to=this.nearest(destination);let time=start;const legs:Leg[]=[];
  const add=(a:Point,b:Point)=>{if(distance(a,b)<.01)return;const seconds=distance(a,b)/(speed*(1-.18*this.rain(time)));legs.push({from:{...a},to:{...b},start:time,end:time+seconds});time+=seconds;};
  const connect=(a:Point,b:Point)=>{const points=this.connector(a,b);for(let i=1;i<points.length;i++)add(points[i-1],points[i]);};
  connect(origin,nodes[from]);let current=from,hops=0;
  while(current!==to&&hops++<50){const path=this.path(current,to,this.closed(time)),next=path[1];if(!next)throw new Error('Required station route is inaccessible.');const a=nodes[current],b=nodes[next],wet=this.rain(time);if(a.y===1&&b.y===1&&a.z===-2.8&&b.z===-2.8&&wet>0){const offset=-.65*wet;add(a,{...a,z:a.z+offset});add({...a,z:a.z+offset},{...b,z:b.z+offset});add({...b,z:b.z+offset},b);}else add(a,b);current=next;}
  connect(nodes[to],destination);return {legs,end:time};
 }
 unit(tenant:Tenant){return UNITS.find(u=>u.id===tenant.unitId)!;}
 private nearest(point:Point){let best='W',score=Infinity;for(const [id,node] of Object.entries(nodes)){if(node.y!==point.y)continue;const d=distance(point,node);if(d<score){score=d;best=id;}}return best;}
 private closed(time:number){return this.scenario.events.some(e=>e.type==='closure'&&(ROUTE_CLOSURE_IDS as readonly string[]).includes(e.target??'central-route')&&eventActive(e,time));}
 private connector(a:Point,b:Point):Point[]{
  if(a.y!==1||b.y!==1)return [a,b];
  const key=`${a.x},${a.z}|${b.x},${b.z}`,cached=this.connectors.get(key);if(cached)return cached;
  const obstacles=this.scenario.tenants.map(t=>shopTransform(this.unit(t),t).bounds).map(b=>({minX:b.minX-.3,maxX:b.maxX+.3,minZ:b.minZ-.3,maxZ:b.maxZ+.3}));
  const blocked=(from:Point,to:Point)=>obstacles.some(rect=>{
   let lo=0,hi=1;
   for(const [value,delta,min,max] of [[from.x,to.x-from.x,rect.minX,rect.maxX],[from.z,to.z-from.z,rect.minZ,rect.maxZ]]){
    if(Math.abs(delta)<1e-8){if(value<=min+1e-7||value>=max-1e-7)return false;continue;}
    const first=(min+1e-7-value)/delta,last=(max-1e-7-value)/delta;lo=Math.max(lo,Math.min(first,last));hi=Math.min(hi,Math.max(first,last));if(lo>=hi)return false;
   }
   return lo<hi&&hi>0&&lo<1;
  });
  if(!blocked(a,b)){this.connectors.set(key,[a,b]);return [a,b];}
  const points=[a,b,...obstacles.flatMap(r=>[p(r.minX,r.minZ),p(r.maxX,r.minZ),p(r.minX,r.maxZ),p(r.maxX,r.maxZ)])];
  const costs=points.map(()=>Infinity),previous=points.map(()=>-1),visited=new Set<number>();costs[0]=0;
  for(let step=0;step<points.length;step++){let current=-1,lowest=Infinity;for(let i=0;i<points.length;i++)if(!visited.has(i)&&costs[i]<lowest){current=i;lowest=costs[i];}if(current<0)break;if(current===1)break;visited.add(current);for(let i=0;i<points.length;i++){if(visited.has(i)||i===current||blocked(points[current],points[i]))continue;const next=lowest+distance(points[current],points[i]);if(next<costs[i]){costs[i]=next;previous[i]=current;}}}
  if(!Number.isFinite(costs[1]))throw new Error('Shop entrance is obstructed.');
  const route=[b];let current=1;while(current!==0){current=previous[current];if(current<0)throw new Error('Shop entrance is obstructed.');route.unshift(points[current]);}
  this.connectors.set(key,route);return route;
 }
 private path(from:string,to:string,closed:boolean){const key=`${from}|${to}|${closed?1:0}`,cached=this.paths.get(key);if(cached)return cached;const costs=new Map<string,number>([[from,0]]),previous=new Map<string,string>(),todo=new Set(Object.keys(nodes));while(todo.size){let here:string|undefined,lowest=Infinity;for(const node of todo){const c=costs.get(node)??Infinity;if(c<lowest){here=node;lowest=c;}}if(!here)break;todo.delete(here);if(here===to)break;for(const edge of edges){if(closed&&edge.central)continue;const next=edge.from===here?edge.to:edge.to===here?edge.from:undefined;if(!next||!todo.has(next))continue;const weight=distance(nodes[here],nodes[next])*(nodes[here].y!==nodes[next].y?2.2:1),cost=lowest+weight;if(cost<(costs.get(next)??Infinity)){costs.set(next,cost);previous.set(next,here);}}}const path=[to];while(path[0]!==from){const before=previous.get(path[0]);if(!before)throw new Error('Required station route is inaccessible.');path.unshift(before);}this.paths.set(key,path);return path;}
}
