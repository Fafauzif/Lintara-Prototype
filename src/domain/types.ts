export type Category='bakery'|'coffee'|'meals'|'retail';
export type Language='en'|'id';
export interface Unit {id:string;label:string;x:number;z:number;width:number;depth:number;rentPerDay:number;zone:string;allowed:Category[];fit:number;frontage:number;}
export interface Tenant {id:string;name:string;category:Category;unitId:string;staff:number;size:'small'|'medium'|'large';rotation:number;open:number;close:number;preparation:number;basket?:number;serviceSeconds?:number;margin?:number;occupancyPerDay?:number;}
export type EventType='arrival'|'delay'|'rain'|'closure'|'staff';
export interface ScenarioEvent {id:string;type:EventType;start:number;duration:number;magnitude:number;target?:string;}
export interface Campaign {id:string;name:string;screenId:string;tenantId:string;start:number;end:number;budget:number;objective:'awareness'|'visits'|'purchases';creative?:'journey'|'fresh';archived?:boolean;}
export interface Scenario {version:1;id:string;name:string;seed:number;tenants:Tenant[];events:ScenarioEvent[];campaigns:Campaign[];}
export interface CategoryParameters {name:string;color:string;basket:number;margin:number;service:number;attraction:number;patience:number;wagePerHour:number;taskMinutesPerHour:number;icon:string;}
export interface AgentSample {id:number;x:number;y:number;z:number;angle:number;color:number;state:'walking'|'queue'|'service'|'browsing';tenantId?:string;}
export interface TenantMetrics {tenantId:string;passing:number;visits:number;completed:number;transactions:number;abandoned:number;sales:number;grossMargin:number;labor:number;occupancyCost:number;campaignCost:number;contribution:number;entryRate:number|null;conversion:number|null;waitMean:number;waitP90:number;dwellMean:number;queueLength:number;workload:number;coverage:number;}
export interface Metrics {start:number;end:number;arrivals:number;departed:number;present:number;visits:number;transactions:number;sales:number;contribution:number;waitMean:number;waitP90:number;abandoned:number;exposure:number;qualifiedExposure:number;tenants:TenantMetrics[];}
export interface Snapshot {time:number;agents:AgentSample[];present:number;queues:Record<string,number>;train:{phase:'approaching'|'dwell'|'departing'|'absent';progress:number;platform:number};trains?:{id:string;phase:'approaching'|'dwell'|'departing';progress:number;platform:number}[];}
export interface Bucket {time:number;arrivals:number;present:number;visits:number;sales:number;waitMean:number;}
export interface SimulationResult {scenario:Scenario;duration:number;snapshot:(time:number)=>Snapshot;metrics:(start?:number,end?:number,tenantId?:string)=>Metrics;buckets:Bucket[];}
export interface Comparison {baseline:Metrics;proposed:Metrics;stress:Metrics;}
export interface SceneProps {scenario:Scenario;result:SimulationResult;clock:{current:number;playing:boolean};selected:string|null;onSelect:(id:string)=>void;onPlace:(unitId:string)=>void;placement:Category|null;placementSize?:Tenant['size'];movingId?:string;rotation:number;roof:boolean;floor:'all'|'hall'|'platform';cutaway:boolean;transparent:boolean;heatmap:boolean;routes:boolean;quality:'high'|'balanced'|'low';cameraView:'overview'|'hall'|'platform'|'top';cameraReset:number;language:Language;onReady?:(info:{drawCalls:number;triangles:number})=>void;onError?:(message:string)=>void;}
