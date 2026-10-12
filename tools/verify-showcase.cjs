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
find(n=>n.props?.['data-testid']==='quality-select').props.onChange({target:{value:'high'}});render();
let active=find(n=>n.props?.result&&typeof n.props?.onPlace==='function');
assert(active.props.quality==='high','High changes renderer quality');
assert(active.props.result.metrics().arrivals===demandBefore,'High preserves modeled passenger demand');
find(n=>n.props?.['data-testid']==='quality-select').props.onChange({target:{value:'low'}});render();
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
find(n=>n.props?.['data-testid']==='business-details').props.onClick();render();
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
// Discoverability and new-hour controls must be present in the visible shell.
workspaceStore.getState().reset();values.length=0;render();
const header=find(n=>n.type==='header');
assert(nodes(header).some(n=>n.props?.['data-testid']==='quality-select'),'quality is directly in the header beside roles');
const main=find(n=>n.type==='main');const children=nodes(main);
const playbackAt=children.findIndex(n=>typeof n.props?.onPreview==='function');
const sceneAt=children.findIndex(n=>n.props?.['data-testid']==='scene-container');
assert(playbackAt>=0&&playbackAt>sceneAt,'single playback dock follows the station scene');
const command=find(n=>typeof n.props?.onHourChange==='function');
command.props.onHourChange(18);render();
assert(workspaceStore.getState().scenario.startHour===18&&workspaceStore.getState().scenario.period==='evening','hour control changes the modeled evening profile');
assert(find(n=>typeof n.props?.onPreview==='function').props.currentTime===1460,'hour change preserves relative preview position');
const headerPlan=JSON.stringify(workspaceStore.getState().scenario);
find(n=>typeof n.props?.onPreview==='function').props.onPreview('next');render();
assert(find(n=>typeof n.props?.onPreview==='function').props.currentTime===1995,'dock Next train directly previews next approach');
assert(JSON.stringify(workspaceStore.getState().scenario)===headerPlan,'dock preview preserves period and business plan');
find(n=>n.props?.['data-testid']==='nav-business').props.onClick();render();
assert(nodes(tree).some(n=>n.type?.name==='OpportunityPage'),'opportunity page is directly reachable');
console.log(checks.length+' total workspace/showcase callbacks passed.');

// Revised shell: disclosure follows intent and navigation retains every workflow.
workspaceStore.getState().reset();values.length=0;render();
assert(nodes(tree).filter(n=>n.props?.['data-testid']?.startsWith('nav-')).length===3,'main navigation has three destinations');
assert(!nodes(tree).some(n=>n.props?.className?.includes('shop-dock')||n.type?.name==='ShopDock'),'catalog starts closed');
const initialScene=find(n=>n.props?.result&&typeof n.props?.onPlace==='function');
const resetBefore=initialScene.props.cameraReset;
initialScene.props.onSelect('T2');render();
assert(nodes(tree).some(n=>n.props?.['data-testid']==='shop-summary'),'shop selection opens a quick summary');
assert(!nodes(tree).some(n=>n.props?.className==='inspector'),'shop selection does not open full details');
assert(find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.cameraReset===resetBefore,'ordinary selection preserves the camera');
find(n=>n.props?.['data-testid']==='focus-shop').props.onClick();render();
assert(find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.cameraFocus==='T2','explicit focus targets the chosen shop');
find(n=>n.props?.['data-testid']==='business-details').props.onClick();render();
assert(nodes(tree).some(n=>n.props?.className==='inspector'),'Business details opens full inspector');
const detailMarkup=require('react-dom/server').renderToStaticMarkup(find(n=>n.props?.tenant?.id==='T2'&&typeof n.props?.onMove==='function'));
assert(detailMarkup.includes('Performance so far')&&detailMarkup.includes('Sales so far')&&detailMarkup.includes('07:00–'),'details clearly labels its elapsed performance window');
find(n=>n.props?.['data-testid']==='place-shop').props.onClick();render();
assert(nodes(tree).some(n=>n.type?.name==='ShopDock'),'Add shop opens the catalog');
assert(!nodes(tree).some(n=>n.props?.className==='inspector'),'placement closes full inspector');
find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.onPlace('U3','bakery');render();
assert(!nodes(tree).some(n=>n.type?.name==='ShopDock'),'successful placement closes the catalog');
const countPlaced=workspaceStore.getState().scenario.tenants.length;
find(n=>n.props?.['data-testid']==='undo-plan').props.onClick();render();
assert(workspaceStore.getState().scenario.tenants.length===countPlaced-1,'visible Undo reverses catalog placement');
find(n=>n.props?.['data-testid']==='nav-business').props.onClick();render();
assert(nodes(tree).some(n=>n.type?.name==='OpportunityPage'),'Business opens the opportunity workflow');
for(const id of ['business','tenants','locations','staffing','campaigns']) {
 find(n=>n.props?.['data-testid']==='business-tab-'+id).props.onClick();render();
 assert(!nodes(tree).some(n=>n.props?.className==='shop-catalog'),'business subpages retain a closed catalog');
}
find(n=>n.props?.['data-testid']==='nav-compare').props.onClick();render();
assert(nodes(tree).some(n=>n.type?.name==='ScenarioPage'),'Compare opens impact comparison');
find(n=>n.props?.['data-testid']==='compare-tab-overview').props.onClick();render();
assert(nodes(tree).some(n=>n.type?.name==='OverviewPage'),'Compare retains the report overview');
find(n=>n.type==='button'&&n.props?.children==='Tenant').props.onClick();render();
find(n=>n.props?.['data-testid']==='nav-station').props.onClick();render();
find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.onSelect('T1');render();
assert(!nodes(tree).some(n=>n.props?.['data-testid']==='shop-summary'),'tenant neighbor selection shows no business summary');
assert(!nodes(tree).some(n=>n.props?.['data-testid']==='place-shop'),'tenant cannot access Add shop');
console.log(checks.length+' total revised UX checks passed.');

// Camera modes remain available after grouping view controls.
workspaceStore.getState().reset();values.length=0;render();
find(n=>n.props?.['aria-controls']==='view-controls').props.onClick();render();
find(n=>n.type==='select'&&n.props?.['aria-label']==='Overview camera').props.onChange({target:{value:'top'}});render();
assert(find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.cameraView==='top','Top down remains available in View controls');
assert(find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.floor==='all','camera preset restores all floors');
console.log(checks.length+' final UX callbacks passed.');

// A renderer remount must not replay a focus command for an obsolete selection.
workspaceStore.getState().reset();values.length=0;render();
find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.onSelect('T2');render();
find(n=>n.props?.['data-testid']==='focus-shop').props.onClick();render();
find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.onSelect('T1');render();
assert(find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.cameraFocus===null,'ordinary selection clears obsolete focus for renderer remount');
find(n=>n.props?.['data-testid']==='focus-shop').props.onClick();render();
find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.onPlace('U3','bakery');render();
assert(find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.cameraFocus===null,'placement clears obsolete focus for renderer remount');
console.log(checks.length+' final revised workspace callbacks passed.');

// The placement toast must not undo an earlier edit after toolbar Undo consumed its entry.
workspaceStore.getState().reset();values.length=0;render();
const earlier=structuredClone(workspaceStore.getState().scenario);earlier.name='Earlier edit';workspaceStore.getState().commit(earlier);render();
find(n=>n.props?.result&&typeof n.props?.onPlace==='function').props.onPlace('U3','bakery');render();
assert(nodes(tree).some(n=>n.props?.className==='shop-undo'),'placement offers one Undo action');
find(n=>n.props?.['data-testid']==='undo-plan').props.onClick();render();
assert(!nodes(tree).some(n=>n.props?.className==='shop-undo'),'toolbar Undo consumes the placement toast action');
assert(workspaceStore.getState().scenario.name==='Earlier edit','placement Undo preserves the earlier edit');
console.log(checks.length+' verified v1.3 workspace callbacks passed.');
