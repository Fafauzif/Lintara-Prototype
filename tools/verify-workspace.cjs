// Source callback integration checks, not browser or WebGL verification.
require.extensions['.css']=()=>{};
const reportPath=require.resolve('../src/reports/export.ts');
require.cache[reportPath]={id:reportPath,filename:reportPath,loaded:true,exports:Object.fromEntries(['downloadJSON','downloadCSV','downloadTenantJSON','printReport'].map(name=>[name,()=>{}]))};
const React=require('react');
global.window={matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};
global.document={documentElement:{lang:'en'},hidden:false};
const App=require('../src/app/App.tsx').default;
const {workspaceStore}=require('../src/state/workspace.ts');
const {buildTrainSchedule}=require('../src/domain/trainSchedule.ts');
const values=[];let cursor=0,tree;
function render(){
 cursor=0;const internal=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internal.H;
 internal.H={useState(initial){const i=cursor++;if(!(i in values))values[i]=typeof initial==='function'?initial():initial;return [values[i],v=>values[i]=typeof v==='function'?v(values[i]):v];},useRef(initial){const i=cursor++;if(!(i in values))values[i]={current:initial};return values[i];},useMemo(fn){return fn();},useEffect(){},useCallback(fn){return fn;},useDebugValue(){},useSyncExternalStore(_subscribe,getSnapshot){return getSnapshot();}};
 try{tree=App();}finally{internal.H=old;}return tree;
}
function nodes(n){if(!n||typeof n!=='object')return [];if(Array.isArray(n))return n.flatMap(nodes);return [n,...nodes(n.props?.children)];}
function find(predicate){const node=nodes(tree).find(predicate);if(!node)throw Error('Expected workspace control not found');return node;}
const checks=[];function assert(ok,label){if(!ok)throw Error(label);checks.push(label);}
workspaceStore.getState().reset();render();
const before=workspaceStore.getState().scenario.tenants.length;const historyBefore=workspaceStore.getState().past.length;
// Invoke the actual scene drop callback with a payload, without opening palette state.
find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.onPlace('U3','bakery');
assert(workspaceStore.getState().scenario.tenants.length===before+1,'valid drop commits the shop in one action');
assert(workspaceStore.getState().past.length===historyBefore+1,'a drop creates one undo entry');
workspaceStore.getState().undo();render();
assert(workspaceStore.getState().scenario.tenants.length===before,'undo restores the complete pre-drop plan');
find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.onPlace('U1','coffee');
assert(workspaceStore.getState().scenario.tenants.length===before,'invalid occupied drop preserves all shops');
assert(workspaceStore.getState().past.length===historyBefore,'invalid drop does not add history');
render();const scene=find(n=>n.props?.result&&typeof n.props?.onPlace==='function');
assert(scene.props.cameraView==='hall','default camera frames the commercial hall');
const demandBefore=scene.props.result.metrics().arrivals;
find(n=>n.props?.['data-testid']==='quality-high').props.onClick();render();
let active=find(n=>n.props?.result&&typeof n.props?.onPlace==='function');
assert(active.props.quality==='high','High changes renderer quality');
assert(active.props.result.metrics().arrivals===demandBefore,'High preserves modeled passenger demand');
find(n=>n.props?.['data-testid']==='quality-low').props.onClick();render();
active=find(n=>n.props?.result&&typeof n.props?.onPlace==='function');
assert(active.props.quality==='low'&&active.props.result.metrics().arrivals===demandBefore,'Lite preserves the same modeled demand');
const plan=JSON.stringify(workspaceStore.getState().scenario);
const controls=find(n=>typeof n.props?.onPreview==='function');controls.props.onPreview('next');render();
const controlsAfter=find(n=>typeof n.props?.onPreview==='function');
const upcoming=buildTrainSchedule(workspaceStore.getState().scenario).find(t=>t.start>1460);
assert(controlsAfter.props.currentTime===upcoming.start-45&&controlsAfter.props.playing,'Next train seeks before approach and plays');
assert(JSON.stringify(workspaceStore.getState().scenario)===plan,'previewing a train preserves the plan');
find(n=>n.type==='button'&&n.props?.children==='Tenant').props.onClick();render();
find(n=>n.props?.['data-testid']==='nav-station').props.onClick();render();
find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.onSelect('T2');render();
find(n=>n.props?.tenant?.id==='T2'&&typeof n.props?.onMove==='function').props.onMove();render();
find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.onPlace('U3','coffee');render();
assert(workspaceStore.getState().scenario.tenants.find(t=>t.id==='T2').unitId==='U3','tenant can directly move their own shop');
assert(workspaceStore.getState().scenario.tenants.find(t=>t.id==='T1').unitId==='U1','own move preserves neighboring shops');
const ownPlan=JSON.stringify(workspaceStore.getState().scenario);
find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.onPlace('U6','bakery');render();
assert(JSON.stringify(workspaceStore.getState().scenario)===ownPlan,'tenant cannot add a shop with a forged drop payload');
const delayed=structuredClone(workspaceStore.getState().scenario);delayed.events.push({id:'late-train',type:'delay',start:3240,duration:300,magnitude:900,target:'train-6'});
workspaceStore.getState().commit(delayed);render();
const priorTime=find(n=>typeof n.props?.onPreview==='function').props.currentTime;
find(n=>typeof n.props?.onPreview==='function').props.onPreview('replay','train-6');render();
assert(find(n=>typeof n.props?.onPreview==='function').props.currentTime===priorTime,'outside-hour explicit replay leaves the clock unchanged');
console.log(checks.length+' workspace callback checks passed: '+checks.join('; '));
console.log('Controlled React hook callbacks only; no browser, drag gesture, pixel or GPU claim.');
