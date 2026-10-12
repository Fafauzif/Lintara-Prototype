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
 const period=all.find(n=>n.type==='select'&&n.props['data-testid']==='time-period');[7,12,17].forEach(hour=>period.props.onChange({target:{value:String(hour)}}));check(chosen.join(',')==='7,12,17','visible period select chooses each rush and lunch window');
 const start=all.find(n=>n.type==='select'&&n.props['aria-label']==='Start hour');start.props.onChange({target:{value:'22'}});check(chosen.at(-1)===22,'start-hour selector accepts a late window');
}
// The compact dock must keep core controls reachable and disclose advanced controls.
for(const lang of ['en','id']){
 const scenario=setScenarioHour(freshScenario(),17),seeked=[],speeds=[],chosen=[],previews=[];let toggles=0,added=0;
 const internals=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internals.H;
 function render(currentTime=0,playing=false){
  internals.H={useMemo(fn){return fn();},useId(){return 'dock-'+lang;}};
  try{return SimulationControls({lang,scenario,currentTime,playing,speed:10,onTogglePlay(){toggles++;},onSpeedChange:value=>speeds.push(value),onSeek:value=>seeked.push(value),onPreview:value=>previews.push(value),onAddArrival(){added++;},onHourChange:value=>chosen.push(value)});}finally{internals.H=old;}
 }
 const tree=render(),all=nodes(tree),dock=all.find(n=>n.props?.className==='simulation-dock-row'),advanced=all.find(n=>n.type==='details'&&n.props.className==='simulation-more-controls');
 const primary=nodes(dock).filter(n=>n.props?.['data-testid']==='next-train');check(primary.length===1&&!primary[0].props.disabled,'one enabled Next train lives in dock');
 check(!nodes(advanced).some(n=>n.props?.['data-testid']==='next-train'),'Next train is outside advanced disclosure');
 check(nodes(advanced).some(n=>n.props?.['data-testid']==='replay-arrival')&&nodes(advanced).some(n=>n.props?.['data-testid']==='add-arrival'),'replay and add are retained under More controls');
 check(all.some(n=>n.type==='summary'&&n.props['aria-label']===(lang==='id'?'Kontrol lainnya':'More controls')),'advanced disclosure has visible accessible name');
 const period=all.find(n=>n.props?.['data-testid']==='time-period'),options=nodes(period).filter(n=>n.type==='option');
 check(options.length===18&&new Set(options.map(n=>n.props.value)).size===18,'all eighteen hourly windows are directly selectable');
 for(const hour of [5,8,18,22])period.props.onChange({target:{value:String(hour)}});check(chosen.join(',')==='5,8,18,22','custom hours stay directly reachable');
 all.find(n=>n.props?.['data-testid']==='play-pause').props.onClick();check(toggles===1,'Play callback remains operable');
 all.find(n=>n.type==='select'&&n.props['aria-label']===(lang==='id'?'Kecepatan':'Speed')).props.onChange({target:{value:'60'}});check(speeds.at(-1)===60,'speed change remains operable');
 all.find(n=>n.props?.['data-testid']==='add-arrival').props.onClick();check(added===1,'advanced Add arrival callback remains operable');
 all.find(n=>n.props?.['data-testid']==='timeline').props.onChange({target:{value:'2700'}});check(seeked.at(-1)===2700,'visible timeline seeks selected hour');
 const end=nodes(render(3600,true));check(end.find(n=>n.props?.['data-testid']==='next-train').props.disabled,'Next train disables when hour has no remaining arrival');
 check(end.find(n=>n.props?.['data-testid']==='play-pause').props['aria-label']===(lang==='id'?'Jeda':'Pause'),'playing state exposes Pause label');
 const marker=all.find(n=>n.props?.['data-testid']?.startsWith('train-marker-')&&!n.props.disabled),before=seeked.length;
 marker.props.onClick();check(seeked.length===before+1&&seeked.at(-1)>=0&&seeked.at(-1)<=3600,'advanced timetable marker previews within hour');
 scenario.events.push({id:'outside-delay',type:'delay',start:0,duration:3600,magnitude:5000});const outside=nodes(render());const outsideMarkers=outside.filter(n=>n.props?.['data-testid']?.startsWith('train-marker-'));check(outsideMarkers.length===6&&outsideMarkers.every(n=>n.props.disabled),'all fully delayed arrivals show disabled timetable markers');const beforeOutside=seeked.length;outsideMarkers[0].props.onClick();check(seeked.length===beforeOutside,'outside-hour marker callback cannot seek beyond modeled hour');
 let focused=0,prevented=0,stopped=0;const details={open:true,querySelector(){return{focus(){focused++;}}}};advanced.props.onKeyDown({key:'Escape',preventDefault(){prevented++;},stopPropagation(){stopped++;},currentTarget:details});check(!details.open&&focused===1&&prevented===1&&stopped===1,'Escape dismisses only the advanced panel and restores summary focus');
}
console.log(count+' actual simulation-dock callback and label checks passed across 05/07/08/12/18/22 and EN/ID.');
console.log('Controlled source callbacks only; browser focus, gestures and responsive pixels remain unverified.');
