import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { AgentSample, Category, SceneProps, Snapshot } from '../domain/types';
import { CATEGORIES, UNITS } from '../data/station';
import { Assets, updateLabel, updateTranslations } from './assets';
import { buildStation } from './station';
import { buildTenants, placementPreviewTarget, placementTargetStatus, setPlacement } from './tenants';
import { cameraFocusAllowed, createSnapshotCache, CROWD_CHUNK, decodePlacementCategory, eligibleCrowd, growCrowdCapacity, MAX_CROWD_CAPACITY, qualitySettings } from './quality';

const clothes=['#657F9C','#BA8971','#779A8B','#A99C83','#566675','#A09FAE','#D1AB72','#8B9991'];
const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** One clock, shared instanced crowd geometry, and no quality-dependent person sampling. */
export default function StationScene(props:SceneProps){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 const [error,setError]=useState<string|null>(null);
 useEffect(()=>{
  const container=host.current!;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}
  catch(e){const message=e instanceof Error?e.message:'WebGL unavailable';setError(message);latest.current.onError?.(message);return;}
  renderer.setClearColor('#EDF1EE',1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.21;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  const canvas=renderer.domElement;canvas.style.cssText='width:100%;height:100%;display:block;touch-action:none';canvas.setAttribute('tabindex','0');canvas.setAttribute('role','img');canvas.setAttribute('aria-roledescription','interactive 3D station');container.appendChild(canvas);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#EDF1EE');
  const camera=new THREE.OrthographicCamera(-42,42,24,-24,.1,250);camera.position.set(23,26,24);
  const controls=new OrbitControls(camera,canvas);controls.target.set(0,1,-4);controls.enableDamping=true;controls.dampingFactor=.075;controls.rotateSpeed=.65;controls.panSpeed=.7;controls.zoomSpeed=.7;controls.minZoom=.65;controls.maxZoom=4.8;controls.minPolarAngle=.1;controls.maxPolarAngle=Math.PI*.455;controls.enablePan=true;
  controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};
  scene.add(new THREE.HemisphereLight('#FFFFFF','#B9C8B5',2.8));
  const sun=new THREE.DirectionalLight('#FFF5DF',3.1);sun.position.set(-25,48,24);sun.castShadow=true;sun.shadow.camera.left=-43;sun.shadow.camera.right=43;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;sun.shadow.camera.near=.1;sun.shadow.camera.far=120;sun.shadow.bias=-.0007;sun.shadow.normalBias=.025;scene.add(sun);
  const fill=new THREE.DirectionalLight('#D7E8F0',1.2);fill.position.set(30,20,-20);scene.add(fill);
  const assets=new Assets();let world:ReturnType<typeof buildStation>,tenants:ReturnType<typeof buildTenants>;
  try{world=buildStation(scene,assets);tenants=buildTenants(world,latest.current.scenario);}
  catch(e){const message=e instanceof Error?e.message:'Unable to build station';setError(message);latest.current.onError?.(message);assets.dispose();renderer.dispose();canvas.remove();controls.dispose();return;}

  let poolCapacity=CROWD_CHUNK,poolChanged=true;
  const initialQuality=qualitySettings(latest.current.quality);
  let bodyGeometry=new THREE.CapsuleGeometry(.16,.64,initialQuality.capsuleSegments,initialQuality.radialSegments),headGeometry=new THREE.SphereGeometry(1,initialQuality.headWidthSegments,initialQuality.headHeightSegments);
  const personMaterial=(tint:string,unlit:boolean)=>unlit?new THREE.MeshBasicMaterial({color:tint}):new THREE.MeshStandardMaterial({color:tint,roughness:.82,metalness:.035});
  let bodyMaterial=personMaterial('#ffffff',initialQuality.unlit),headMaterial=personMaterial('#D4B99A',initialQuality.unlit);
  const heatMaterial=new THREE.MeshBasicMaterial({color:'#E7A662',transparent:true,opacity:.17,depthWrite:false});assets.materials.set('heatmap',heatMaterial);
  const heatGeometry=assets.geometry(new THREE.CircleGeometry(.9,12));
  const pool=(geometry:THREE.BufferGeometry,material:THREE.Material,name:string,parent:THREE.Object3D)=>{const mesh=new THREE.InstancedMesh(geometry,material,poolCapacity);mesh.name=name;mesh.count=0;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;parent.add(mesh);return mesh;};
  let body=pool(bodyGeometry,bodyMaterial,'all-passenger-bodies',scene),head=pool(headGeometry,headMaterial,'all-passenger-heads',scene),heatmesh=pool(heatGeometry,heatMaterial,'all-passenger-heat',world.heat);heatmesh.rotation.x=-Math.PI/2;world.heat.visible=false;
  let colorIds:number[]=[],colorValues:number[]=[];
  const ensureCapacity=(required:number)=>{
   const capacity=growCrowdCapacity(poolCapacity,required);if(capacity===poolCapacity)return;
   for(const mesh of [body,head,heatmesh]){mesh.removeFromParent();mesh.dispose();}
   poolCapacity=capacity;body=pool(bodyGeometry,bodyMaterial,'all-passenger-bodies',scene);head=pool(headGeometry,headMaterial,'all-passenger-heads',scene);heatmesh=pool(heatGeometry,heatMaterial,'all-passenger-heat',world.heat);heatmesh.rotation.x=-Math.PI/2;poolChanged=true;colorIds=[];colorValues=[];
  };
  const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3(),axisY=new THREE.Vector3(0,1,0),color=new THREE.Color();
  const heatQuat=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2),invHeat=new THREE.Matrix4().makeRotationX(Math.PI/2);
  const selection=new THREE.Group();scene.add(selection);
  const selectMaterial=new THREE.MeshBasicMaterial({color:'#F47B20',transparent:true,opacity:.75,depthWrite:false});assets.materials.set('selected',selectMaterial);
  const ring=new THREE.Mesh(assets.geometry(new THREE.RingGeometry(.91,1,48)),selectMaterial);ring.rotation.x=-Math.PI/2;selection.add(ring);selection.visible=false;
  let active=true,intersectionVisible=true,contextLost=false,frame=0,raf=0,lastReady=false,width=0,height=0,scenarioKey=JSON.stringify(latest.current.scenario.tenants),lastQuality='',lastView='',lastReset=-1,lastSelected:string|null=null,lastPlacement='',lastShell='',lastLanguage='';
  let lastTenantSource=latest.current.scenario.tenants,lastFrameProps:SceneProps|null=null,renderDirty=true,wasPlacing=false,dropCommitted=false;
  let cameraTween:{fromPos:THREE.Vector3;fromTarget:THREE.Vector3;toPos:THREE.Vector3;toTarget:THREE.Vector3;fromZoom:number;toZoom:number;start:number}|null=null;
  const snapshotCache=createSnapshotCache();let lastSnapshot:Snapshot|null=null,lastCrowdSnapshot:Snapshot|null=null,lastCrowdFloor='',lastCrowdAnimated=false,lastHeatmap=false,visibleAgents:AgentSample[]=[];
  const mouse=new THREE.Vector2(),raycaster=new THREE.Raycaster();let pointerStart:THREE.Vector2|null=null,hoverUnit:string|null=null,lastHover='',dragActive=false,pointerOverCanvas=false;
  const resize=()=>{const r=container.getBoundingClientRect();if(r.width<1||r.height<1)return;const w=Math.round(r.width),h=Math.round(r.height);if(width===w&&height===h)return;width=w;height=h;renderer.setSize(w,h,false);const span=Math.max(50,83*h/w);camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();renderDirty=true;};
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);resize();
  const moveCamera=(target:THREE.Vector3,offset:THREE.Vector3,zoom:number)=>{const pos=target.clone().add(offset);renderDirty=true;if(reducedMotion()){camera.position.copy(pos);controls.target.copy(target);camera.zoom=zoom;camera.updateProjectionMatrix();controls.update();return;}cameraTween={fromPos:camera.position.clone(),fromTarget:controls.target.clone(),toPos:pos,toTarget:target,fromZoom:camera.zoom,toZoom:zoom,start:performance.now()};};
  const preset=(view:string)=>{
   if(view==='hall')moveCamera(new THREE.Vector3(0,1,-4),new THREE.Vector3(23,25,28),1.5);
   else if(view==='platform')moveCamera(new THREE.Vector3(0,0,13),new THREE.Vector3(32,36,39),1.2);
   else if(view==='top')moveCamera(new THREE.Vector3(0,0,3),new THREE.Vector3(.01,75,.01),1);
   else moveCamera(new THREE.Vector3(0,1,3),new THREE.Vector3(38,60,49),1);
  };
  const cancelTween=()=>{cameraTween=null;renderDirty=true;};controls.addEventListener('start',cancelTween);
  const freezeCamera=()=>{
   cameraTween=null;controls.enabled=false;
   // Drain orbit damping without allowing the remaining momentum to move the frame.
   const savedPosition=camera.position.clone(),savedTarget=controls.target.clone(),savedZoom=camera.zoom;
   controls.enableDamping=false;controls.update();camera.position.copy(savedPosition);controls.target.copy(savedTarget);camera.zoom=savedZoom;camera.updateProjectionMatrix();controls.update();controls.enableDamping=true;renderDirty=true;
  };
  const selectable=(event:MouseEvent)=>{
   const rect=canvas.getBoundingClientRect();mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);
   const hits=raycaster.intersectObjects([world.hall,world.platforms],true);
   for(const hit of hits){let node:THREE.Object3D|null=hit.object;let visible=true;while(node){if(!node.visible){visible=false;break;}node=node.parent;}if(!visible)continue;node=hit.object;while(node){if(node.userData.selectId)return node.userData.selectId as string;node=node.parent;}}
   return null;
  };
  const targetUnit=(id:string|null)=>UNITS.find(u=>u.id===id)||UNITS.find(u=>latest.current.scenario.tenants.some(t=>t.id===id&&t.unitId===u.id));
  const publishHover=(unitId:string|null,category:Category|null=latest.current.placement)=>{
   const p=latest.current,status=placementTargetStatus(p.scenario,category,unitId,p.placementSize,p.rotation,p.movingId);
   const key=JSON.stringify(status);if(key!==lastHover){lastHover=key;p.onPlacementHover?.(status);}return status;
  };
  const updateHover=(event:MouseEvent,category:Category|null=latest.current.placement)=>{
   const id=selectable(event),unit=targetUnit(id),next=unit?.id??null;if(!pointerOverCanvas){pointerOverCanvas=true;lastPlacement='';renderDirty=true;}if(hoverUnit!==next){hoverUnit=next;lastPlacement='';renderDirty=true;}
   const status=publishHover(hoverUnit,category);canvas.style.cursor=category?(status?.valid?'copy':'not-allowed'):id?'pointer':'grab';return unit;
  };
  const commitPlacement=(unitId:string,category:Category)=>{
   const p=latest.current,status=publishHover(unitId,category);if(!status?.valid)return;
   freezeCamera();dropCommitted=true;p.onPlace(unitId,category);
  };
  const down=(e:PointerEvent)=>{if(latest.current.placement)freezeCamera();pointerStart=e.button===0?new THREE.Vector2(e.clientX,e.clientY):null;};
  const up=(e:PointerEvent)=>{
   if(!pointerStart)return;const moved=pointerStart.distanceTo(new THREE.Vector2(e.clientX,e.clientY))>5;pointerStart=null;
   const p=latest.current;if(moved&&!p.placement)return;const id=selectable(e);if(!id)return;
   if(p.placement){const unit=targetUnit(id);if(unit){updateHover(e);commitPlacement(unit.id,p.placement);}}else p.onSelect(id);
  };
  const pointerMove=(e:PointerEvent)=>{if(pointerStart&&!latest.current.placement)return;updateHover(e);};
  const leave=()=>{hoverUnit=null;dragActive=false;pointerOverCanvas=false;lastPlacement='';renderDirty=true;publishHover(null);};
  const dragover=(e:DragEvent)=>{
   if(!latest.current.placement&&!e.dataTransfer?.types.includes('text/plain'))return;
   e.preventDefault();dragActive=true;freezeCamera();updateHover(e);
   // The browser protects text/plain until drop. Accept the release, then validate
   // its actual category rather than vetoing it using potentially stale props.
   if(e.dataTransfer)e.dataTransfer.dropEffect='copy';
  };
  const drop=(e:DragEvent)=>{
   e.preventDefault();dragActive=false;const p=latest.current,payload=e.dataTransfer?.getData('text/plain')??'',category=decodePlacementCategory(payload)||(!payload?p.placement:null);
   if(!category)return;const unit=updateHover(e,category);if(unit)commitPlacement(unit.id,category);
  };
  const keydown=(e:KeyboardEvent)=>{
   if(latest.current.placement)return;
   if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();cameraTween=null;const dx=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,dz=e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0;camera.position.x+=dx*1.5;camera.position.z+=dz*1.5;controls.target.x+=dx*1.5;controls.target.z+=dz*1.5;renderDirty=true;}
   else if(e.key==='+'||e.key==='='){camera.zoom=Math.min(4.8,camera.zoom*1.12);camera.updateProjectionMatrix();renderDirty=true;}
   else if(e.key==='-'){camera.zoom=Math.max(.65,camera.zoom/1.12);camera.updateProjectionMatrix();renderDirty=true;}
   else if(e.key.toLowerCase()==='r')preset(latest.current.cameraView);
  };
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('keydown',keydown);canvas.addEventListener('dragover',dragover);canvas.addEventListener('dragleave',leave);canvas.addEventListener('drop',drop);
  const visibility=()=>{active=intersectionVisible&&!document.hidden;if(active&&!contextLost){renderDirty=true;resize();if(!raf)raf=requestAnimationFrame(render);}};document.addEventListener('visibilitychange',visibility);
  const lost=(e:Event)=>{e.preventDefault();contextLost=true;setError('The graphics surface was interrupted. Restoring the station…');latest.current.onError?.('WebGL context lost');};
  const restored=()=>{contextLost=false;setError(null);lastReady=false;renderDirty=true;poolChanged=true;renderer.shadowMap.needsUpdate=true;if(!raf)raf=requestAnimationFrame(render);};canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
  const intersection=new IntersectionObserver(entries=>{intersectionVisible=entries.some(e=>e.isIntersecting);active=intersectionVisible&&!document.hidden;if(active&&!contextLost&&!raf){renderDirty=true;resize();raf=requestAnimationFrame(render);}},{threshold:0});intersection.observe(container);
  function render(now:number){
   try{renderFrame(now);}catch(e){raf=0;contextLost=true;const message=e instanceof Error?e.message:'The station view was interrupted';setError(message);latest.current.onError?.(message);}
  }
  function renderFrame(now:number){
   raf=0;if(!active||contextLost)return;const p=latest.current;frame++;
   if(lastFrameProps!==p){renderDirty=true;lastFrameProps=p;}
   let tenantsChanged=false;
   if(lastTenantSource!==p.scenario.tenants){const key=JSON.stringify(p.scenario.tenants);lastTenantSource=p.scenario.tenants;if(key!==scenarioKey){tenants.assets.dispose();tenants=buildTenants(world,p.scenario);scenarioKey=key;tenantsChanged=true;lastPlacement='';lastLanguage='';renderer.shadowMap.needsUpdate=true;}}
   if(lastLanguage!==p.language){lastLanguage=p.language;updateTranslations(world.hall,p.language);canvas.setAttribute('aria-roledescription',p.language==='id'?'stasiun 3D interaktif':'interactive 3D station');canvas.setAttribute('aria-label',p.language==='id'?'Miniatur interaktif Stasiun Sudirman. Seret untuk memutar. Seret kanan untuk menggeser. Gulir untuk memperbesar. Pilih toko lalu klik unit atau seret kartu toko ke unit. Tombol panah menggeser, tambah dan kurang memperbesar, R mengatur ulang.':'Interactive miniature of Sudirman station. Drag to orbit. Right-drag to pan. Scroll to zoom. Choose a shop and click a unit or drop a shop card into a unit. Arrow keys pan, plus and minus zoom, R resets.');}
   const placing=!!p.placement||dragActive;if(placing&&!wasPlacing)freezeCamera();controls.enabled=!placing;
   const focusAllowed=cameraFocusAllowed(placing,wasPlacing&&!placing,dropCommitted);
   const placementTarget=placementPreviewTarget(pointerOverCanvas,hoverUnit,p.placementUnit),placementKey=`${p.placement}:${p.placementSize}:${p.movingId}:${p.rotation}:${placementTarget}:${scenarioKey}`;
   if(lastPlacement!==placementKey){setPlacement(tenants,p.scenario,p.placement,p.rotation,p.placementSize,p.movingId,placementTarget);lastPlacement=placementKey;renderDirty=true;if(placing)publishHover(placementTarget);}
   world.hall.visible=p.floor!=='platform';world.platforms.visible=p.floor!=='hall';world.roof.visible=p.roof&&p.floor!=='platform';world.walls.visible=!p.cutaway;
   const shellKey=`${p.floor}:${p.roof}:${p.cutaway}:${p.transparent}`;if(lastShell!==shellKey){lastShell=shellKey;renderer.shadowMap.needsUpdate=true;for(const mat of world.shellMaterials){mat.transparent=p.transparent;mat.opacity=p.transparent?.2:1;mat.depthWrite=!p.transparent;}}
   world.routes.visible=p.routes&&p.floor!=='platform';world.heat.visible=p.heatmap;
   if(lastQuality!==p.quality){
    lastQuality=p.quality;const quality=qualitySettings(p.quality);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,quality.pixelRatio));renderer.shadowMap.enabled=quality.shadows;sun.shadow.mapSize.set(quality.shadowMapSize,quality.shadowMapSize);sun.shadow.map?.dispose();sun.shadow.map=null;renderer.shadowMap.needsUpdate=true;
    bodyGeometry.dispose();headGeometry.dispose();bodyMaterial.dispose();headMaterial.dispose();bodyGeometry=new THREE.CapsuleGeometry(.16,.64,quality.capsuleSegments,quality.radialSegments);headGeometry=new THREE.SphereGeometry(1,quality.headWidthSegments,quality.headHeightSegments);bodyMaterial=personMaterial('#ffffff',quality.unlit);headMaterial=personMaterial('#D4B99A',quality.unlit);body.geometry=bodyGeometry;head.geometry=headGeometry;body.material=bodyMaterial;head.material=headMaterial;poolChanged=true;resize();
   }
   const resetChanged=lastReset!==p.cameraReset,viewChanged=lastView!==p.cameraView,selectionChanged=lastSelected!==p.selected;
   const shouldFocus=focusAllowed&&!!p.selected&&frame>1&&(selectionChanged||(resetChanged&&lastReset>=0&&!viewChanged));
   if(viewChanged||resetChanged){lastView=p.cameraView;lastReset=p.cameraReset;if(focusAllowed)preset(p.cameraView);}
   if(selectionChanged||resetChanged||tenantsChanged){lastSelected=p.selected;const focus=p.selected?world.locations.get(p.selected):undefined;selection.visible=!!focus;if(focus){selection.position.copy(focus);selection.position.y+=.16;const unit=targetUnit(p.selected);ring.scale.set(unit?Math.max(unit.width,unit.depth)*.64:2,unit?Math.max(unit.width,unit.depth)*.64:2,1);if(shouldFocus&&p.selected!=='ZHALL'&&!p.selected?.startsWith('ZPLATFORM'))moveCamera(focus,new THREE.Vector3(17,24,26),p.selected?.startsWith('TRAIN')?.9:1.9);}}
   const snapshot=snapshotCache.read(p.result,p.clock.current),snapshotChanged=snapshot!==lastSnapshot;
   if(snapshotChanged){lastSnapshot=snapshot;renderDirty=true;}
   const floorChanged=lastCrowdFloor!==p.floor;if(lastCrowdSnapshot!==snapshot||floorChanged)visibleAgents=eligibleCrowd(snapshot.agents,p.floor);
   const n=visibleAgents.length;canvas.dataset.modelPresent=String(snapshot.present);canvas.dataset.floorEligible=String(n);canvas.dataset.samplingCount='0';canvas.dataset.overflowAgents=String(Math.max(0,n-MAX_CROWD_CAPACITY));
   if(n>MAX_CROWD_CAPACITY){canvas.dataset.submittedAgents='0';canvas.dataset.renderedAgents='0';growCrowdCapacity(poolCapacity,n);}
   ensureCapacity(n);body.count=n;head.count=n;heatmesh.count=n;canvas.dataset.renderedAgents=String(n);canvas.dataset.submittedAgents=String(n);canvas.dataset.crowdCapacity=String(poolCapacity);
   const animatePeople=p.clock.playing&&!reducedMotion(),uploadCrowd=lastCrowdSnapshot!==snapshot||floorChanged||poolChanged||lastCrowdAnimated!==animatePeople||lastHeatmap!==p.heatmap;
   if(uploadCrowd){
    let colorsChanged=false;
    for(let i=0;i<n;i++){
     const a=visibleAgents[i],bob=animatePeople&&a.state==='walking'?Math.sin(p.clock.current*5+a.id)*.023:0;
     position.set(a.x,a.y+.64+bob,a.z);quaternion.setFromAxisAngle(axisY,a.angle);scale.set(1,1,1);matrix.compose(position,quaternion,scale);body.setMatrixAt(i,matrix);
     position.y=a.y+1.3+bob;scale.set(.18,.19,.18);matrix.compose(position,quaternion,scale);head.setMatrixAt(i,matrix);
     if(colorIds[i]!==a.id||colorValues[i]!==a.color){colorIds[i]=a.id;colorValues[i]=a.color;color.set(clothes[Math.abs(a.color)%clothes.length]);body.setColorAt(i,color);colorsChanged=true;}
     if(p.heatmap){position.set(a.x,a.y+.135,a.z);scale.set(a.state==='queue'?1.2:.75,a.state==='queue'?1.2:.75,1);matrix.compose(position,heatQuat,scale);matrix.premultiply(invHeat);heatmesh.setMatrixAt(i,matrix);}
    }
    colorIds.length=n;colorValues.length=n;body.instanceMatrix.needsUpdate=true;head.instanceMatrix.needsUpdate=true;if(colorsChanged&&body.instanceColor)body.instanceColor.needsUpdate=true;if(p.heatmap)heatmesh.instanceMatrix.needsUpdate=true;
    lastCrowdSnapshot=snapshot;lastCrowdFloor=p.floor;lastCrowdAnimated=animatePeople;lastHeatmap=p.heatmap;poolChanged=false;renderDirty=true;
   }
   if(snapshotChanged){
    const updateTrain=(group:THREE.Group,doors:THREE.Group[],id:string,train:Snapshot['train']|undefined)=>{group.visible=!!train&&train.phase!=='absent';if(!train)return;const progress=Math.max(0,Math.min(1,train.progress)),tx=train.phase==='approaching'?-83*(1-progress):train.phase==='departing'?83*progress:0;group.position.set(tx,0,train.platform===1?15.15:12.35);world.locations.set(id,new THREE.Vector3(tx,0,group.position.z));doors.forEach(d=>{d.scale.x=train.phase==='dwell'?.3:1;});};
    if(snapshot.trains){updateTrain(world.train,world.trainDoors,'TRAIN1',snapshot.trains.find(t=>t.platform===0));updateTrain(world.train2,world.trainDoors2,'TRAIN2',snapshot.trains.find(t=>t.platform===1));}else{updateTrain(world.train,world.trainDoors,'TRAIN1',snapshot.train);world.train2.visible=false;}
   }
   if(selection.visible&&p.selected){const focus=world.locations.get(p.selected);if(focus)selection.position.set(focus.x,focus.y+.17,focus.z);}
   if(p.selected==='TRAIN1')selection.visible=world.train.visible;else if(p.selected==='TRAIN2')selection.visible=world.train2.visible;
   for(const [id,panel]of world.screens){const campaign=p.scenario.campaigns.find(c=>!c.archived&&c.screenId===id&&p.clock.current>=c.start&&p.clock.current<c.end),tenant=campaign?p.scenario.tenants.find(t=>t.id===campaign.tenantId):undefined;const defaultText=p.language==='id'?(id==='AD2'?'SELAMAT DATANG • SUDIRMAN':id==='AD1'?'SEJENAK SINGGAH. PAGI LEBIH BAIK.':'BERANGKAT. SINGGAH. LANJUTKAN.'):(id==='AD2'?'WELCOME TO SUDIRMAN':id==='AD1'?'A LITTLE PAUSE. A BETTER MORNING.':'RIDE. PAUSE. REPEAT.');const campaignText=campaign?.creative==='fresh'?(p.language==='id'?'AWALI HARI LEBIH SEGAR':'A FRESH START'):(p.language==='id'?'SINGGAH DI SINI':'YOUR NEXT STOP');updateLabel(panel,tenant?`${tenant.name.toUpperCase()} • ${campaignText}`:defaultText,tenant?CATEGORIES[tenant.category].color:undefined);}
   if(cameraTween&&!placing){const t=Math.min(1,(now-cameraTween.start)/380),ease=1-Math.pow(1-t,3);camera.position.lerpVectors(cameraTween.fromPos,cameraTween.toPos,ease);controls.target.lerpVectors(cameraTween.fromTarget,cameraTween.toTarget,ease);camera.zoom=THREE.MathUtils.lerp(cameraTween.fromZoom,cameraTween.toZoom,ease);camera.updateProjectionMatrix();renderDirty=true;if(t===1)cameraTween=null;}
   const controlsChanged=!placing&&controls.update();
   if(renderDirty||controlsChanged||!lastReady){renderer.render(scene,camera);renderDirty=false;if(!lastReady){lastReady=true;p.onReady?.({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});}}
   wasPlacing=placing;if(!placing)dropCommitted=false;
   // A lightweight clock/prop watcher stays awake so mutable-clock playback, seeks,
   // controls, placement, resize, and visibility always wake a settled paused view.
   raf=requestAnimationFrame(render);
  }
  raf=requestAnimationFrame(render);
  return()=>{
   active=false;cancelAnimationFrame(raf);resizeObserver.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('keydown',keydown);canvas.removeEventListener('dragover',dragover);canvas.removeEventListener('dragleave',leave);canvas.removeEventListener('drop',drop);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);controls.removeEventListener('start',cancelTween);controls.dispose();body.dispose();head.dispose();heatmesh.dispose();bodyGeometry.dispose();headGeometry.dispose();bodyMaterial.dispose();headMaterial.dispose();tenants.assets.dispose();assets.dispose();sun.shadow.dispose();renderer.dispose();canvas.remove();
  };
 },[]);
 return <div ref={host} className="station-scene" style={{width:'100%',height:'100%',position:'relative',minHeight:300,overflow:'hidden',background:'#edf1ee'}}>
  {error&&<div role="status" style={{position:'absolute',inset:0,display:'grid',placeContent:'center',textAlign:'center',padding:32,background:'#edf1eef2',zIndex:3,color:'#243b75'}}><strong>{props.language==='id'?'Tampilan stasiun belum tersedia':'Station view is unavailable'}</strong><p style={{maxWidth:400,fontSize:14}}>{props.language==='id'?'Rencana dan hasil analisis tetap tersedia. Muat ulang halaman untuk memulihkan tampilan.':'Your plan and analysis remain available. Reload to restore the station view.'}</p></div>}
 </div>;
}
