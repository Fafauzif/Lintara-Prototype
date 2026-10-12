import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, SCREENS, UNITS } from '../data/station';
import { shopTransform } from '../domain/shopGeometry';
import { translateError } from '../i18n/errors';
import type { Category, SceneProps, Snapshot, Tenant } from '../domain/types';
import { agentInFloor, fitMapCamera, hitStationAt, mapToWorld, placementAt, trainMapPose, worldToMap } from './mapProjection';
import type { MapBounds, MapCamera, MapPlacement, MapPoint, MapScreenPoint } from './mapProjection';
import './station-map.css';

const CLOTHES=['#657F9C','#BA8971','#779A8B','#A99C83','#566675','#A09FAE','#D1AB72','#8B9991'];
const categoryPayload=(value:string):Category|null=>Object.hasOwn(CATEGORIES,value)?value as Category:null;
const viewport=(width:number,height:number)=>({width,height});

/** One canvas dot per floor-eligible model agent, with no WebGL or crowd DOM. */
export default function StationMap(props:SceneProps){
  const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
  const requestDraw=useRef<()=>void>(()=>{}),zoomAction=useRef<(factor:number)=>void>(()=>{}),resetAction=useRef<()=>void>(()=>{});
  const [error,setError]=useState<string|null>(null);
  useEffect(()=>{requestDraw.current();});
  useEffect(()=>{
    const container=host.current!;
    const canvas=document.createElement('canvas'),background=document.createElement('canvas');
    const ctx=canvas.getContext('2d',{alpha:false}),back=background.getContext('2d',{alpha:false});
    if(!ctx||!back){const message='A 2D drawing surface is unavailable.';setError(message);latest.current.onError?.(message);return;}
    canvas.tabIndex=0;canvas.setAttribute('role','application');canvas.setAttribute('aria-roledescription','interactive station map');container.prepend(canvas);
    let width=0,height=0,dpr=1,camera:MapCamera=fitMapCamera(1,1,'overview'),baseScale=1;
    let mounted=true,visible=!document.hidden,intersecting=true,raf=0,timer=0,dirty=true,staticDirty=true,ready=false;
    let lastProps:SceneProps|undefined,lastReset=-1,lastView='',lastFloor='',lastQuality='',lastFrameTime=-Infinity;
    let lastSnapshot:Snapshot|undefined,lastResult=latest.current.result,lastTime=NaN;
    let hover:MapPlacement|null=null,hoverPoint:MapPoint|null=null,lastHover='',keyboardUnit=-1,dragCategory:Category|null=null;
    const pointers=new Map<number,MapScreenPoint>();
    let press:{id:number;start:MapScreenPoint;camera:MapCamera;moved:boolean}|null=null;
    let pinch:{distance:number;camera:MapCamera;world:MapPoint}|null=null;
    const point=(event:{clientX:number;clientY:number})=>{const rect=canvas.getBoundingClientRect();return{x:event.clientX-rect.left,y:event.clientY-rect.top};};
    const worldPoint=(event:{clientX:number;clientY:number})=>mapToWorld(point(event),camera,viewport(width,height));
    const tellHover=(next:MapPlacement|null)=>{
      hover=next;
      const key=next?`${next.unitId}:${next.valid}:${next.reason}`:'';
      if(key!==lastHover){lastHover=key;latest.current.onPlacementHover?.(next?.unitId?{unitId:next.unitId,valid:next.valid,reason:next.reason}:null);}
    };
    const invalidate=(station=false)=>{dirty=true;staticDirty=staticDirty||station;if(mounted&&visible&&!raf){window.clearTimeout(timer);timer=0;raf=requestAnimationFrame(render);}};
    requestDraw.current=()=>invalidate();
    const reset=()=>{const p=latest.current;camera=fitMapCamera(width,height,p.cameraView,p.floor);baseScale=camera.scale;invalidate(true);};
    resetAction.current=reset;
    const zoom=(factor:number,anchor:MapScreenPoint={x:width/2,y:height/2})=>{
      const before=mapToWorld(anchor,camera,viewport(width,height));
      camera.scale=Math.max(baseScale*.65,Math.min(baseScale*6,camera.scale*factor));
      const after=mapToWorld(anchor,camera,viewport(width,height));camera.centerX+=before.x-after.x;camera.centerZ+=before.z-after.z;invalidate(true);
    };
    zoomAction.current=factor=>zoom(factor);
    const resize=()=>{
      const rect=container.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
      const newWidth=Math.round(rect.width),newHeight=Math.round(rect.height),p=latest.current;
      const newDpr=Math.min(window.devicePixelRatio||1,p.quality==='high'?1.5:p.quality==='balanced'?1:.75);
      if(width===newWidth&&height===newHeight&&dpr===newDpr)return;
      const first=width===0;height=newHeight;width=newWidth;dpr=newDpr;
      canvas.width=background.width=Math.max(1,Math.round(width*dpr));canvas.height=background.height=Math.max(1,Math.round(height*dpr));
      const fitted=fitMapCamera(width,height,p.cameraView,p.floor);
      if(first)camera=fitted;else camera.scale*=fitted.scale/baseScale;
      baseScale=fitted.scale;invalidate(true);
    };
    const setupWorld=(target:CanvasRenderingContext2D)=>target.setTransform(dpr*camera.scale,0,0,dpr*camera.scale,dpr*(width/2-camera.centerX*camera.scale),dpr*(height/2-camera.centerZ*camera.scale));
    const rect=(target:CanvasRenderingContext2D,x:number,z:number,w:number,h:number,fill:string,stroke?:string,line=.08)=>{
      target.fillStyle=fill;target.fillRect(x-w/2,z-h/2,w,h);if(stroke){target.lineWidth=line;target.strokeStyle=stroke;target.strokeRect(x-w/2,z-h/2,w,h);}
    };
    const line=(target:CanvasRenderingContext2D,points:MapPoint[],color:string,lineWidth:number,dash:number[]=[])=>{
      target.beginPath();target.moveTo(points[0].x,points[0].z);for(const v of points.slice(1))target.lineTo(v.x,v.z);target.strokeStyle=color;target.lineWidth=lineWidth;target.setLineDash(dash);target.stroke();target.setLineDash([]);
    };
    const label=(target:CanvasRenderingContext2D,text:string,x:number,z:number,color='#526664',size=11,weight=500,backgroundColor?:string)=>{
      const at=worldToMap({x,z},camera,viewport(width,height));target.save();target.setTransform(dpr,0,0,dpr,0,0);target.font=`${weight} ${size}px system-ui,sans-serif`;target.textAlign='center';target.textBaseline='middle';
      if(backgroundColor){const measure=target.measureText(text);target.fillStyle=backgroundColor;target.fillRect(at.x-measure.width/2-4,at.y-size/2-3,measure.width+8,size+6);}
      target.fillStyle=color;target.fillText(text,at.x,at.y);target.restore();
    };
    const shop=(target:CanvasRenderingContext2D,tenant:Pick<Tenant,'size'|'rotation'|'category'>,unitId:string,ghost=false,valid=true)=>{
      const unit=UNITS.find(u=>u.id===unitId);if(!unit)return;
      const pose=shopTransform(unit,tenant),color=ghost?(valid?'#4f997f':'#cc6d55'):CATEGORIES[tenant.category].color;
      target.save();if(ghost)target.globalAlpha=.42;
      rect(target,pose.centerX,pose.centerZ,pose.width,pose.depth,color,ghost?color:'#fefbf0',ghost?.18:.12);
      const counterA=pose.toWorld(-pose.localWidth*.37,-pose.localDepth*.28),counterB=pose.toWorld(pose.localWidth*.37,-pose.localDepth*.28);
      line(target,[counterA,counterB],ghost?color:'#ffffff70',.35);
      const frontA=pose.toWorld(-pose.localWidth*.38,pose.localDepth/2),frontB=pose.toWorld(pose.localWidth*.38,pose.localDepth/2);
      line(target,[frontA,frontB],ghost?color:'#243b75',.13);
      target.fillStyle=ghost?color:'#f8f2dc';target.beginPath();target.arc(pose.entry.x,pose.entry.z,.18,0,Math.PI*2);target.fill();target.restore();
    };
    function drawBackground(){
      const p=latest.current;back!.setTransform(1,0,0,1,0,0);back!.fillStyle='#edf1ee';back!.fillRect(0,0,background.width,background.height);setupWorld(back!);
      if(p.floor!=='platform'){
        rect(back!,0,-3,58,18,'#e2e4d9','#bfc9c1',.15);rect(back!,0,-3,57.6,17.6,'#f2eee4');
        if(camera.scale>4){for(let x=-28;x<=28;x+=2)line(back!,[{x,z:-11.7},{x,z:5.7}],'#e4e1d6',.035);for(let z=-11;z<=5;z+=2)line(back!,[{x:-28.8,z},{x:28.8,z}],'#e4e1d6',.035);}
        line(back!,[{x:-27.5,z:-2.8},{x:27.5,z:-2.8}],'#e5bd58',.32);line(back!,[{x:8,z:-2.8},{x:8,z:5.6}],'#e5bd58',.28);
        line(back!,[{x:-27,z:-5},{x:27,z:-5}],'#9aa5a2',.11);
        for(const unit of UNITS){back!.setLineDash([.4,.25]);rect(back!,unit.x,unit.z,unit.width,unit.depth,'#edece2','#bdc7ba',.08);back!.setLineDash([]);}
        for(const tenant of p.scenario.tenants)shop(back!,tenant,tenant.unitId);
        for(const unit of UNITS){const tenant=p.scenario.tenants.find(t=>t.unitId===unit.id),pose=tenant?shopTransform(unit,tenant):null;
          label(back!,tenant?(camera.scale>7?tenant.name:unit.id):unit.id,pose?.centerX??unit.x,pose?.centerZ??unit.z,tenant?'#243b75':'#718478',camera.scale>7?10:9,tenant?600:500);
          if(!tenant&&camera.scale>6)label(back!,p.language==='id'?'Kosong':'Vacant',unit.x,unit.z+.75,'#7d8d7d',9);
        }
        rect(back!,-25.3,-8,2.1,4.2,'#b0bebb','#79958e');label(back!,p.language==='id'?'TIKET':'INFO',-25.3,-8,'#243b75',8,600);
        for(let i=0;i<5;i++){rect(back!,7.45+i*1.3,4.05,.42,1.28,'#9dafae','#74908b',.07);rect(back!,7.83+i*1.3,4.05,.28,.1,'#72bb9a');}
        label(back!,p.language==='id'?'GERBANG ↓':'GATES ↓',10,2.6,'#243b75',9,600,'#f2eee4');
        for(const ad of SCREENS){rect(back!,ad.x,ad.z,ad.id==='AD1'?4.4:3,.38,'#526b8a');if(camera.scale>6)label(back!,ad.id,ad.x,ad.z,'#fff',8);}
        label(back!,p.language==='id'?'← BARAT':'← WEST',-28,-2.8,'#243b75',9,600,'#edf1ee');label(back!,p.language==='id'?'TIMUR →':'EAST →',28,-2.8,'#243b75',9,600,'#edf1ee');
        label(back!,'SUDIRMAN',0,-12.3,'#243b75',Math.min(14,Math.max(10,camera.scale*2)),700);
      }
      if(p.floor!=='hall'){
        rect(back!,0,13.45,70,6.2,'#9daea6','#82978d',.1);
        for(let x=-34;x<35;x+=.85)for(const z of [12.4,15.15])rect(back!,x,z,.21,2.1,'#7f9188');
        for(const z of [11.7,13.1,14.45,15.85])line(back!,[{x:-35,z},{x:35,z}],'#d4dcd4',.12);
        for(const z of [8.8,18.5]){rect(back!,0,z,66,4.5,'#e2e5d9','#b6c5b9',.12);rect(back!,0,z+(z<12?1.75:-1.75),65.5,.34,'#e6bc55');
          for(const x of [-28,-16,-4,16,28])rect(back!,x,z+(z<12?-.9:.9),2.5,.52,'#9ead9b');
        }
        label(back!,p.language==='id'?'01  PERON':'01  PLATFORM',-19,7.5,'#243b75',10,600,'#e2e5d9');label(back!,p.language==='id'?'PERON  02':'PLATFORM  02',-19,19.7,'#243b75',10,600,'#e2e5d9');
        rect(back!,8,6.55,3.6,3.15,'#d3dbd0','#99ada1',.12);for(let z=5.2;z<8;z+=.45)line(back!,[{x:6.2,z},{x:9.8,z}],'#a9b9ac',.065);
        rect(back!,26,13.6,3,11.8,'#d5ded3','#92aa9a',.11);for(const z of [8.8,18.5]){rect(back!,23.4,z,4.5,2.5,'#d5ded3','#92aa9a',.08);for(let x=21.4;x<25.5;x+=.45)line(back!,[{x,z:z-1.1},{x,z:z+1.1}],'#a0b3a5',.06);}
        if(camera.scale>5)label(back!,p.language==='id'?'JEMBATAN':'TRANSFER',26,13.5,'#657d6e',8,600,'#d5ded3');
      }
      if(p.routes){
        if(p.floor!=='platform')line(back!,[{x:-27,z:-2.8},{x:27,z:-2.8}],'#63a094',.12,[.4,.35]);
        const path=[{x:12,z:-2.8},{x:12,z:4.5},{x:12,z:5.05},{x:8,z:6},{x:8,z:9},{x:-6,z:10}];
        line(back!,p.floor==='hall'?path.slice(0,4):p.floor==='platform'?path.slice(3):path,'#63a094',.13,[.45,.3]);
        if(p.floor!=='hall')line(back!,[{x:8,z:9},{x:21.4,z:8.8},{x:26,z:8.8},{x:26,z:18.5},{x:21.4,z:18.5},{x:5,z:17.5}],'#63a094',.13,[.45,.3]);
      }
    }
    const selectedBounds=(id:string|null):MapBounds|null=>{
      if(!id)return null;const p=latest.current,tenant=p.scenario.tenants.find(t=>t.id===id),unit=UNITS.find(u=>u.id===(tenant?.unitId??id));
      if(unit)return tenant?shopTransform(unit,tenant).bounds:{minX:unit.x-unit.width/2,maxX:unit.x+unit.width/2,minZ:unit.z-unit.depth/2,maxZ:unit.z+unit.depth/2};
      if(id==='G1')return {minX:6.7,maxX:13.4,minZ:3.1,maxZ:4.9};
      if(id==='ZHALL')return{minX:-28.7,maxX:28.7,minZ:-11.7,maxZ:5.1};
      if(id.startsWith('ZPLATFORM'))return {minX:-33,maxX:33,minZ:id==='ZPLATFORM1'?6.6:16.3,maxZ:id==='ZPLATFORM1'?11:20.7};
      const ad=SCREENS.find(s=>s.id===id);if(ad)return{minX:ad.x-2,maxX:ad.x+2,minZ:ad.z-.4,maxZ:ad.z+.4};
      const visibleTrains=lastSnapshot?.trains??(lastSnapshot?[lastSnapshot.train]:[]);
      const train=visibleTrains.find(t=>t.platform===(id==='TRAIN2'?1:0));
      if(train&&id.startsWith('TRAIN')){const pose=trainMapPose(train);if(pose.visible)return{minX:pose.x-pose.width/2,maxX:pose.x+pose.width/2,minZ:pose.z-pose.depth/2,maxZ:pose.z+pose.depth/2};}
      return null;
    };
    function drawSnapshot(snapshot:Snapshot){
      const p=latest.current;ctx!.setTransform(1,0,0,1,0,0);ctx!.drawImage(background,0,0);setupWorld(ctx!);
      if(p.floor!=='hall')for(const train of snapshot.trains??[snapshot.train]){
        const pose=trainMapPose(train);if(!pose.visible)continue;
        for(let car=0;car<4;car++){const x=pose.x+(car-1.5)*12.2;rect(ctx!,x,pose.z,11.85,2.65,'#eff0e4','#8da297',.09);rect(ctx!,x,pose.z,11.7,.5,'#dd8060');
          for(const dx of [-3.2,3.2])for(const side of [-1,1])rect(ctx!,x+dx,pose.z+side*1.3,pose.doorsOpen?.35:.8,.18,pose.doorsOpen?'#58a386':'#3f5f6d');
        }
      }
      let count=0;
      if(p.heatmap){ctx!.fillStyle='#e7a662';ctx!.globalAlpha=.06;for(const agent of snapshot.agents){if(!agentInFloor(agent,p.floor))continue;ctx!.beginPath();ctx!.arc(agent.x,agent.z,agent.state==='queue'?.7:.45,0,Math.PI*2);ctx!.fill();}ctx!.globalAlpha=1;}
      const radius=Math.max(.12,1.05/camera.scale);
      for(const agent of snapshot.agents){if(!agentInFloor(agent,p.floor))continue;count++;ctx!.fillStyle=CLOTHES[Math.abs(agent.color)%CLOTHES.length];ctx!.beginPath();ctx!.arc(agent.x,agent.z,radius,0,Math.PI*2);ctx!.fill();
        if(camera.scale>11){ctx!.strokeStyle='#f9efdf';ctx!.lineWidth=.06;ctx!.beginPath();ctx!.moveTo(agent.x,agent.z);ctx!.lineTo(agent.x+Math.sin(agent.angle)*radius,agent.z+Math.cos(agent.angle)*radius);ctx!.stroke();}
      }
      const selected=selectedBounds(keyboardUnit>=0?UNITS[keyboardUnit].id:p.selected);
      if(selected){ctx!.strokeStyle='#e88327';ctx!.lineWidth=Math.max(.14,1.5/camera.scale);ctx!.setLineDash(keyboardUnit>=0?[.45,.28]:[]);ctx!.strokeRect(selected.minX-.14,selected.minZ-.14,selected.maxX-selected.minX+.28,selected.maxZ-selected.minZ+.28);ctx!.setLineDash([]);}
      const category=dragCategory??p.placement,ghostUnit=hover?hover.unitId:p.placementUnit;
      let ghostCheck:MapPlacement|null=hover;
      if(category&&ghostUnit&&p.floor!=='platform'){
        const unit=UNITS.find(u=>u.id===ghostUnit);if(unit){const check=placementAt({x:unit.x,z:unit.z},p.scenario,category,p.placementSize,p.rotation,p.movingId);ghostCheck=check;shop(ctx!,{category,size:p.placementSize??'medium',rotation:p.rotation},unit.id,true,check.valid);}
      }else if(category&&hoverPoint&&p.floor!=='platform'){
        ctx!.strokeStyle='#cc6d55';ctx!.lineWidth=1.5/camera.scale;ctx!.beginPath();ctx!.moveTo(hoverPoint.x-.45,hoverPoint.z-.45);ctx!.lineTo(hoverPoint.x+.45,hoverPoint.z+.45);ctx!.moveTo(hoverPoint.x+.45,hoverPoint.z-.45);ctx!.lineTo(hoverPoint.x-.45,hoverPoint.z+.45);ctx!.stroke();
      }
      if(category&&ghostCheck&&p.floor!=='platform'){
        canvas.dataset.placementUnit=ghostCheck.unitId??'';canvas.dataset.placementValid=String(ghostCheck.valid);canvas.dataset.placementReason=ghostCheck.reason;
        if(!ghostCheck.unitId&&hoverPoint){
          // A single local reason remains visible even outside any commercial slot.
          const reason=p.language==='id'?'Pilih unit komersial. Jalur dan peron dilindungi.':'Choose a commercial unit. Routes and platforms are protected.';
          ctx!.save();ctx!.setTransform(dpr,0,0,dpr,0,0);ctx!.font='10px system-ui,sans-serif';ctx!.textAlign='center';ctx!.textBaseline='middle';const boxWidth=Math.min(width-24,270),y=18;ctx!.fillStyle='#fffaf0ed';ctx!.fillRect(width/2-boxWidth/2,y-10,boxWidth,36);ctx!.fillStyle='#985a43';
          const words=reason.split(' ');let row='',rows:string[]=[];for(const word of words){const trial=row?`${row} ${word}`:word;if(row&&ctx!.measureText(trial).width>boxWidth-16){rows.push(row);row=word;}else row=trial;}if(row)rows.push(row);rows.slice(0,2).forEach((text,index)=>ctx!.fillText(text,width/2,y+index*13));ctx!.restore();
        }
      }else{delete canvas.dataset.placementUnit;delete canvas.dataset.placementValid;delete canvas.dataset.placementReason;}
      canvas.dataset.modelPresent=String(snapshot.present);canvas.dataset.floorEligible=String(count);canvas.dataset.renderedAgents=String(count);canvas.dataset.submittedAgents=String(count);canvas.dataset.visualLimit='none';canvas.dataset.sampledAgents='0';canvas.dataset.renderMode='2d';
    }
    function render(now:number){
      raf=0;if(!mounted||!visible)return;
      try{
        const p=latest.current;
        if(p!==lastProps){
          dirty=true;staticDirty=staticDirty||!lastProps||p.scenario!==lastProps.scenario||p.floor!==lastProps.floor||p.routes!==lastProps.routes||p.language!==lastProps.language;
          lastProps=p;canvas.setAttribute('aria-label',p.language==='id'?'Peta interaktif Stasiun Sudirman. Seret untuk menggeser, cubit atau gulir untuk memperbesar. U memilih unit, Enter membuka atau menempatkan toko, tombol panah menggeser, R mengatur ulang.':'Interactive Sudirman station map. Drag to pan; pinch or scroll to zoom. U browses units, Enter selects or places a shop, arrow keys pan, R resets.');
          const category=dragCategory??p.placement;if(hoverPoint&&category&&p.floor!=='platform')tellHover(placementAt(hoverPoint,p.scenario,category,p.placementSize,p.rotation,p.movingId));else if(!category||p.floor==='platform')tellHover(null);
        }
        if(lastReset!==p.cameraReset||lastView!==p.cameraView||lastFloor!==p.floor){lastReset=p.cameraReset;lastView=p.cameraView;lastFloor=p.floor;reset();}
        if(lastQuality!==p.quality){lastQuality=p.quality;resize();}
        const interval=p.quality==='low'?1000/24:p.quality==='balanced'?1000/30:1000/45;
        const changedResult=lastResult!==p.result,changedTime=lastTime!==p.clock.current;
        if(!lastSnapshot||changedResult||(changedTime&&(!p.clock.playing||now-lastFrameTime>=interval||Math.abs(lastTime-p.clock.current)>1))){lastSnapshot=p.result.snapshot(p.clock.current);lastTime=p.clock.current;lastResult=p.result;lastFrameTime=now;dirty=true;}
        if(dirty&&lastSnapshot){if(staticDirty){drawBackground();staticDirty=false;}drawSnapshot(lastSnapshot);dirty=false;if(!ready){ready=true;p.onReady?.({drawCalls:1,triangles:0});}}
        if(p.clock.playing){if(!raf)raf=requestAnimationFrame(render);}else{timer=window.setTimeout(()=>{timer=0;if(mounted&&visible&&!raf)raf=requestAnimationFrame(render);},160);}
      }catch(e){const message=e instanceof Error?e.message:'Unable to draw the station map.';setError(message);latest.current.onError?.(message);mounted=false;}
    }
    const hoverAt=(at:MapPoint,category:Category|null=dragCategory??latest.current.placement)=>{
      const p=latest.current;hoverPoint=at;if(category&&p.floor!=='platform'){const next=placementAt(at,p.scenario,category,p.placementSize,p.rotation,p.movingId);tellHover(next);canvas.style.cursor=next.valid?'copy':'not-allowed';}else{tellHover(null);canvas.style.cursor=hitStationAt(at,p.scenario,p.floor,lastSnapshot)?'pointer':'grab';}invalidate();
    };
    const activate=(at:MapPoint,category:Category|null=dragCategory??latest.current.placement)=>{
      const p=latest.current;if(category&&p.floor!=='platform'){const check=placementAt(at,p.scenario,category,p.placementSize,p.rotation,p.movingId);tellHover(check);if(check.unitId&&check.valid)p.onPlace(check.unitId,category);}
      else{const id=hitStationAt(at,p.scenario,p.floor,lastSnapshot);if(id)p.onSelect(id);}invalidate();
    };
    const down=(event:PointerEvent)=>{
      if(event.button!==0&&event.button!==1)return;canvas.focus({preventScroll:true});const at=point(event);pointers.set(event.pointerId,at);canvas.setPointerCapture(event.pointerId);
      if(pointers.size===1){press={id:event.pointerId,start:at,camera:{...camera},moved:false};pinch=null;}
      else if(pointers.size===2){const [a,b]=[...pointers.values()],middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2};pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),camera:{...camera},world:mapToWorld(middle,camera,viewport(width,height))};if(press)press.moved=true;}
    };
    const move=(event:PointerEvent)=>{
      const at=point(event);if(pointers.has(event.pointerId))pointers.set(event.pointerId,at);
      if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()],middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2};camera.scale=Math.max(baseScale*.65,Math.min(baseScale*6,pinch.camera.scale*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance));camera.centerX=pinch.world.x-(middle.x-width/2)/camera.scale;camera.centerZ=pinch.world.z-(middle.y-height/2)/camera.scale;invalidate(true);return;}
      if(press&&press.id===event.pointerId){const dx=at.x-press.start.x,dy=at.y-press.start.y;if(Math.hypot(dx,dy)>6)press.moved=true;
        if((!latest.current.placement&&!dragCategory)||latest.current.floor==='platform'){camera.centerX=press.camera.centerX-dx/camera.scale;camera.centerZ=press.camera.centerZ-dy/camera.scale;canvas.style.cursor='grabbing';invalidate(true);return;}
      }
      hoverAt(mapToWorld(at,camera,viewport(width,height)));
    };
    const up=(event:PointerEvent)=>{
      const at=worldPoint(event),clicked=press?.id===event.pointerId&&!press.moved&&pointers.size===1;pointers.delete(event.pointerId);if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
      if(clicked){keyboardUnit=-1;activate(at);}pinch=null;
      const remaining=[...pointers.entries()][0];press=remaining?{id:remaining[0],start:remaining[1],camera:{...camera},moved:true}:null;hoverAt(at);
    };
    const cancel=(event:PointerEvent)=>{pointers.delete(event.pointerId);press=null;pinch=null;tellHover(null);invalidate();};
    const leave=()=>{if(!pointers.size){hoverPoint=null;tellHover(null);invalidate();}};
    const wheel=(event:WheelEvent)=>{event.preventDefault();zoom(Math.exp(-Math.max(-150,Math.min(150,event.deltaY))*.003),point(event));};
    const keydown=(event:KeyboardEvent)=>{
      const p=latest.current;if(event.key.toLowerCase()==='u'&&p.floor!=='platform'){event.preventDefault();keyboardUnit=keyboardUnit<0?(event.shiftKey?UNITS.length-1:0):(keyboardUnit+(event.shiftKey?-1:1)+UNITS.length)%UNITS.length;const unit=UNITS[keyboardUnit];hoverAt({x:unit.x,z:unit.z});return;}
      if(event.key==='Enter'&&keyboardUnit>=0){event.preventDefault();const unit=UNITS[keyboardUnit];activate({x:unit.x,z:unit.z});return;}
      if(event.key==='Escape'){keyboardUnit=-1;hoverPoint=null;tellHover(null);invalidate();return;}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const step=24/camera.scale;camera.centerX+=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0;camera.centerZ+=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;invalidate(true);}
      else if(event.key==='+'||event.key==='='){event.preventDefault();zoom(1.2);}else if(event.key==='-'){event.preventDefault();zoom(1/1.2);}else if(event.key.toLowerCase()==='r'&&!p.placement&&!dragCategory){event.preventDefault();reset();}
    };
    const dragover=(event:DragEvent)=>{const p=latest.current;if(p.floor==='platform')return;if(!p.placement&&!event.dataTransfer?.types.includes('text/plain'))return;event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='copy';hoverAt(worldPoint(event));};
    const drop=(event:DragEvent)=>{event.preventDefault();const p=latest.current;if(p.floor==='platform')return;const payload=event.dataTransfer?.getData('text/plain').trim()??'';dragCategory=payload?categoryPayload(payload):p.placement;if(dragCategory)activate(worldPoint(event),dragCategory);dragCategory=null;hoverPoint=null;tellHover(null);invalidate();};
    const dragleave=(event:DragEvent)=>{if(!event.relatedTarget||!container.contains(event.relatedTarget as Node)){dragCategory=null;hoverPoint=null;tellHover(null);invalidate();}};
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',keydown);canvas.addEventListener('dragover',dragover);canvas.addEventListener('drop',drop);canvas.addEventListener('dragleave',dragleave);
    const visibility=()=>{visible=intersecting&&!document.hidden;if(visible){resize();invalidate();}else{cancelAnimationFrame(raf);raf=0;window.clearTimeout(timer);timer=0;}};
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);
    const observer=new IntersectionObserver(entries=>{intersecting=entries.some(e=>e.isIntersecting);visibility();});observer.observe(container);document.addEventListener('visibilitychange',visibility);resize();invalidate(true);
    return()=>{
      mounted=false;cancelAnimationFrame(raf);window.clearTimeout(timer);resizeObserver.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',visibility);
      canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('keydown',keydown);canvas.removeEventListener('dragover',dragover);canvas.removeEventListener('drop',drop);canvas.removeEventListener('dragleave',dragleave);
      requestDraw.current=()=>{};zoomAction.current=()=>{};resetAction.current=()=>{};latest.current.onPlacementHover?.(null);canvas.remove();background.width=background.height=0;
    };
  },[]);
  return <div ref={host} className="station-map">
    <div className="station-map-hint">{props.language==='id'?'Seret / cubit · Ketuk unit':'Drag / pinch · Tap a unit'}</div>
    <div className="station-map-tools" aria-label={props.language==='id'?'Kontrol peta':'Map controls'}>
      <button type="button" aria-label={props.language==='id'?'Perbesar peta':'Zoom in'} onClick={()=>zoomAction.current(1.25)}>+</button>
      <button type="button" aria-label={props.language==='id'?'Perkecil peta':'Zoom out'} onClick={()=>zoomAction.current(.8)}>−</button>
      <button type="button" aria-label={props.language==='id'?'Atur ulang peta':'Reset map'} onClick={()=>resetAction.current()}>{props.language==='id'?'Pas':'Fit'}</button>
    </div>
    <span className="station-map-a11y">{props.language==='id'?'Tekan U untuk memilih unit, Enter untuk membuka atau menempatkan toko, tombol panah untuk menggeser, dan R untuk mengatur ulang.':'Press U to browse units, Enter to select or place a shop, arrow keys to pan, and R to reset.'}</span>
    {error&&<div className="station-map-error" role="status">{translateError(props.language,error)}</div>}
  </div>;
}
