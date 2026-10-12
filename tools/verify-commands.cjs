// Actual JSX callbacks and clock labels, without browser or gesture claims.
require.extensions['.css']=()=>{};
const React=require('react');
const {SimulationControls}=require('../src/components/SimulationControls.tsx');
const {freshScenario}=require('../src/data/station.ts');
const {setScenarioHour}=require('../src/domain/period.ts');
function nodes(n){if(!n||typeof n!=='object')return [];if(Array.isArray(n))return n.flatMap(nodes);return [n,...nodes(n.props?.children)];}
let count=0;function check(value,label){if(!value)throw Error(label);count++;}
for(const hour of [5,7,8,12,18,22]){
 const scenario=setScenarioHour(freshScenario(),hour),seeked=[],chosen=[],previews=[];
 const internals=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internals.H;
 internals.H={useMemo(fn){return fn();},useId(){return 'clock-'+hour;}};
 let tree;try{tree=SimulationControls({lang:'en',scenario,currentTime:1460,playing:false,speed:1,onTogglePlay(){},onSpeedChange(){},onSeek:value=>seeked.push(value),onPreview:value=>previews.push(value),onAddArrival(){},onHourChange:value=>chosen.push(value)});}finally{internals.H=old;}
 const all=nodes(tree),clock=all.find(n=>n.type==='input'&&n.props.type==='time');
 check(clock.props.value===`${String(hour).padStart(2,'0')}:24:20`,'clock includes selected hour and seconds');
 check(clock.props.min===`${String(hour).padStart(2,'0')}:00`&&clock.props.max===`${String(hour+1).padStart(2,'0')}:00`,'clock bounds follow selected hour');
 clock.props.onChange({target:{value:`${String(hour).padStart(2,'0')}:24:30`}});check(seeked.at(-1)===1470,'current time edit seeks model seconds');
 clock.props.onChange({target:{value:`${String(hour+1).padStart(2,'0')}:00:00`}});check(seeked.at(-1)===3600,'current time can reach exact end');
 const before=seeked.length;clock.props.onChange({target:{value:''}});clock.props.onChange({target:{value:`${String(hour+1).padStart(2,'0')}:00:01`}});check(seeked.length===before,'blank and out-of-hour edits preserve clock');
 all.find(n=>n.props?.['data-testid']==='next-train').props.onClick();check(previews.at(-1)==='next','labeled Next train invokes preview');
 all.find(n=>n.props?.['data-testid']==='replay-arrival').props.onClick();check(previews.at(-1)==='replay','labeled Replay invokes preview');
 all.find(n=>n.props?.className==='period-presets').props.children.forEach(button=>button.props.onClick());check(chosen.join(',')==='7,12,17','visible presets choose distinct model windows');
 const start=all.find(n=>n.type==='select'&&n.props['aria-label']==='Start hour');start.props.onChange({target:{value:'22'}});check(chosen.at(-1)===22,'start-hour selector accepts a late window');
}
console.log(count+' actual command-bar callback and label checks passed across 05/07/08/12/18/22.');
console.log('Controlled source callbacks only; browser focus, gestures and responsive pixels remain unverified.');
