/** Original CPU projection of the actual authored scene. This is not a browser screenshot. */
import * as THREE from 'three';
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import { Assets } from '../src/scene/assets';
import { buildStation } from '../src/scene/station';
import { buildTenants } from '../src/scene/tenants';
import { BASELINE } from '../src/data/station';
import { simulate } from '../src/simulation/engine';

const runtimeModules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if(!runtimeModules)throw new Error('CODEX_PRIMARY_RUNTIME_NODE_MODULES must locate the native canvas and image runtime.');
const requireRuntime=createRequire(`${runtimeModules}/scene-preview.cjs`);
const { createCanvas }=requireRuntime('@napi-rs/canvas');
const sharp=requireRuntime('sharp');
Object.assign(globalThis,{document:{createElement:(name:string)=>{if(name==='canvas')return createCanvas(1024,256);throw new Error(`CPU preview does not support ${name}.`);}}});

const W=1800,H=1120,TIME=1460;
const scene=new THREE.Scene(),assets=new Assets();
const world=buildStation(scene,assets),tenantWorld=buildTenants(world,BASELINE);
world.walls.visible=false;world.roof.visible=false;world.routes.visible=false;world.heat.visible=false;
const snapshot=simulate(BASELINE).snapshot(TIME);
world.train.visible=snapshot.train.phase!=='absent';world.train.position.set(0,0,snapshot.train.platform===1?15.15:12.35);world.trainDoors.forEach(d=>d.scale.x=.3);
const camera=new THREE.OrthographicCamera(-41.5,41.5,41.5*H/W,-41.5*H/W,.1,250);camera.position.set(38,61,52);camera.lookAt(0,1,3);camera.updateMatrixWorld();
const palette=['#657F9C','#BA8971','#779A8B','#A99C83','#566675','#A09FAE','#D1AB72','#8B9991'];
const bodyGeometry=assets.geometry(new THREE.CapsuleGeometry(.16,.64,3,7));
for(const a of snapshot.agents){
 const body=new THREE.Mesh(bodyGeometry,assets.material(palette[Math.abs(a.color)%palette.length]));body.position.set(a.x,a.y+.64,a.z);body.rotation.y=a.angle;scene.add(body);
 const head=new THREE.Mesh(assets.sphere,assets.material('#D4B99A'));head.position.set(a.x,a.y+1.3,a.z);head.scale.set(.18,.19,.18);scene.add(head);
}
scene.updateMatrixWorld(true);
type Face={depth:number;svg:string};const faces:Face[]=[];
const light=new THREE.Vector3(-.5,.84,.27).normalize();const view=camera.position.clone().sub(new THREE.Vector3(0,1,3)).normalize();
const project=(p:THREE.Vector3)=>{const v=p.clone().project(camera);return{x:(v.x*.5+.5)*W,y:(-.5*v.y+.5)*H};};
const depth=(p:THREE.Vector3)=>p.clone().applyMatrix4(camera.matrixWorldInverse).z;
const rounded=(n:number)=>Math.round(n*10)/10;
const pixels=new Uint8ClampedArray(W*H*4),zbuffer=new Float32Array(W*H);zbuffer.fill(-Infinity);
type TextureSample={data:Uint8ClampedArray;width:number;height:number;uv:THREE.Vector2[]};
function rasterTriangle(vertices:THREE.Vector3[],fill:string,texture?:TextureSample){
 const p=vertices.map(v=>({...project(v),z:depth(v)}));
 const minX=Math.max(0,Math.floor(Math.min(...p.map(v=>v.x)))),maxX=Math.min(W-1,Math.ceil(Math.max(...p.map(v=>v.x))));
 const minY=Math.max(0,Math.floor(Math.min(...p.map(v=>v.y)))),maxY=Math.min(H-1,Math.ceil(Math.max(...p.map(v=>v.y))));
 const denominator=(p[1].y-p[2].y)*(p[0].x-p[2].x)+(p[2].x-p[1].x)*(p[0].y-p[2].y);if(Math.abs(denominator)<1e-7)return;
 const rgb=[parseInt(fill.slice(0,2),16),parseInt(fill.slice(2,4),16),parseInt(fill.slice(4,6),16)];
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
  const px=x+.5,py=y+.5;
  const a=((p[1].y-p[2].y)*(px-p[2].x)+(p[2].x-p[1].x)*(py-p[2].y))/denominator;
  const b=((p[2].y-p[0].y)*(px-p[2].x)+(p[0].x-p[2].x)*(py-p[2].y))/denominator;const c=1-a-b;if(a<-.00001||b<-.00001||c<-.00001)continue;
  const z=a*p[0].z+b*p[1].z+c*p[2].z,j=y*W+x;if(z<zbuffer[j])continue;
  let r=rgb[0],g=rgb[1],blue=rgb[2],alpha=255;
  if(texture){const u=a*texture.uv[0].x+b*texture.uv[1].x+c*texture.uv[2].x,v=a*texture.uv[0].y+b*texture.uv[1].y+c*texture.uv[2].y;const tx=Math.max(0,Math.min(texture.width-1,Math.round(u*(texture.width-1)))),ty=Math.max(0,Math.min(texture.height-1,Math.round((1-v)*(texture.height-1)))),k=(ty*texture.width+tx)*4;r=texture.data[k];g=texture.data[k+1];blue=texture.data[k+2];alpha=texture.data[k+3];if(alpha<128)continue;}
  zbuffer[j]=z;const k=j*4;pixels[k]=r;pixels[k+1]=g;pixels[k+2]=blue;pixels[k+3]=alpha;
 }
}

scene.traverseVisible(object=>{
 if(!(object instanceof THREE.Mesh))return;
 const material=object.material as THREE.MeshStandardMaterial;
 if(material.opacity===0||object.userData.pickVolume)return;
 const label=object.userData.labelCanvas;
 if(label){
  const g=object.geometry as THREE.PlaneGeometry;const w=g.parameters.width,h=g.parameters.height;
  const origin=project(new THREE.Vector3(-w/2,h/2,0).applyMatrix4(object.matrixWorld));
  const right=project(new THREE.Vector3(w/2,h/2,0).applyMatrix4(object.matrixWorld));const bottom=project(new THREE.Vector3(-w/2,-h/2,0).applyMatrix4(object.matrixWorld));
  const matrix=[(right.x-origin.x)/label.width,(right.y-origin.y)/label.width,(bottom.x-origin.x)/label.height,(bottom.y-origin.y)/label.height,origin.x,origin.y];
  const normal=new THREE.Vector3(0,0,1).transformDirection(object.matrixWorld);if(normal.dot(view)<0&&material.side!==THREE.DoubleSide)return;
  const labelPosition=g.getAttribute('position'),labelUV=g.getAttribute('uv'),labelIndex=g.index!;const textureData=label.getContext('2d').getImageData(0,0,label.width,label.height).data;
  for(let i=0;i<labelIndex.count;i+=3){const vertexIds=[labelIndex.getX(i),labelIndex.getX(i+1),labelIndex.getX(i+2)];rasterTriangle(vertexIds.map(k=>new THREE.Vector3().fromBufferAttribute(labelPosition,k).applyMatrix4(object.matrixWorld)),'ffffff',{data:textureData,width:label.width,height:label.height,uv:vertexIds.map(k=>new THREE.Vector2(labelUV.getX(k),labelUV.getY(k)))});}
  faces.push({depth:depth(new THREE.Vector3().setFromMatrixPosition(object.matrixWorld)),svg:`<image width="${label.width}" height="${label.height}" transform="matrix(${matrix.map(n=>n.toFixed(5)).join(' ')})" href="data:image/png;base64,${label.toBuffer('image/png').toString('base64')}"/>`});return;
 }
 const geometry=object.geometry,position=geometry.getAttribute('position'),normalAttribute=geometry.getAttribute('normal'),index=geometry.index;
 const count=index?.count??position.count;const vertex=(i:number)=>new THREE.Vector3().fromBufferAttribute(position,index?index.getX(i):i).applyMatrix4(object.matrixWorld);
 const normal=(i:number)=>normalAttribute?new THREE.Vector3().fromBufferAttribute(normalAttribute,index?index.getX(i):i).transformDirection(object.matrixWorld):new THREE.Vector3();
 for(let i=0;i<count;i+=3){
  let vertices=[vertex(i),vertex(i+1),vertex(i+2)];
  const n=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize();if(n.length()<.1||n.dot(view)<-.001)continue;
  const color=material.color.clone().multiplyScalar(.64+.42*Math.max(0,n.dot(light))).getHexString();
  rasterTriangle(vertices,color);
  // Adjacent planar triangles form a single face, reducing file size without changing geometry.
  if(i+5<count&&normal(i).distanceTo(normal(i+1))<.001&&normal(i).distanceTo(normal(i+2))<.001&&normal(i).distanceTo(normal(i+3))<.001&&normal(i).distanceTo(normal(i+4))<.001&&normal(i).distanceTo(normal(i+5))<.001){
   const next=[vertex(i+3),vertex(i+4),vertex(i+5)],unique:THREE.Vector3[]=[];for(const v of [...vertices,...next])if(!unique.some(u=>u.distanceToSquared(v)<1e-8))unique.push(v);
   if(unique.length===4){rasterTriangle(next,color);vertices=unique;i+=3;}
  }
  const center=vertices.reduce((a,v)=>a.add(v),new THREE.Vector3()).multiplyScalar(1/vertices.length);const points=vertices.map(v=>project(v));
  if(points.every(p=>p.x<-30||p.x>W+30||p.y<-30||p.y>H+30))continue;
  if(points.length===4){const center2=project(center);points.sort((a,b)=>Math.atan2(a.y-center2.y,a.x-center2.x)-Math.atan2(b.y-center2.y,b.x-center2.x));}
  const path=`M${points.map(p=>`${rounded(p.x)},${rounded(p.y)}`).join('L')}Z`;
  faces.push({depth:depth(center),svg:`<path d="${path}" fill="#${color}"/>`});
 }
});
faces.sort((a,b)=>a.depth-b.depth);
const foreground=await sharp(Buffer.from(pixels.buffer),{raw:{width:W,height:H,channels:4}}).png().toBuffer();
const shadow=new Uint8ClampedArray(W*H*4);for(let y=0;y<H-14;y++)for(let x=0;x<W;x++){const source=(y*W+x)*4,target=((y+14)*W+x)*4;shadow[target]=61;shadow[target+1]=81;shadow[target+2]=72;shadow[target+3]=Math.round(pixels[source+3]*.17);}
const shadowPng=await sharp(Buffer.from(shadow.buffer),{raw:{width:W,height:H,channels:4}}).blur(14).png().toBuffer();
const png=await sharp({create:{width:W,height:H,channels:4,background:'#edf1ee'}}).composite([{input:shadowPng},{input:foreground}]).png().toBuffer();
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc"><title id="title">Sudirman station miniature</title><desc id="desc">Original CPU depth-buffer projected illustration of Lintara's authored Sudirman model at 07:24:20 WIB. Roof cutaway, commercial hall, tiled tactile routes, fare gates, two platforms, commuter train, footbridge and model passengers. Not a browser screenshot or measured station plan.</desc><image width="${W}" height="${H}" href="data:image/png;base64,${png.toString('base64')}"/></svg>`;
await mkdir('public',{recursive:true});await writeFile('public/station-preview.svg',svg);
await sharp(png).resize(1400).webp({quality:86,effort:6}).toFile('public/station-preview.webp');
await writeFile('tools/scene-preview-inspection.png',png);
await writeFile('docs/SCENE_PREVIEW.md',`# Station preview\n\nThe mobile/fallback SVG and WebP are an original CPU depth-buffer projection of the actual authored station geometry and baseline simulation snapshot at ${TIME} seconds (07:24:20 WIB). Generated by tools/scene-preview.ts with Three.js matrix projection, explicit triangle rasterization, native canvas and Sharp. The SVG is an accessible wrapper around that original raster illustration, while WebP is the lightweight application asset. The roof/wall cutaway is enabled. The scene fixtures, train, passengers, unit footprints and tenant category props are imported directly from the same source builders as the interactive model.\n\nThis is an original model illustration, not a browser screenshot. It does not establish successful WebGL initialization, interaction, frame rate, GPU-memory behavior, or application layout. Browser preview was blocked by the execution environment and was not bypassed.\n\nRebuild from the project root with: node --import tsx tools/scene-preview.ts (the primary runtime dependency environment variables must be present).\n\nProjected faces: ${faces.length}; baseline present: ${snapshot.present}; time: ${TIME}.\n`);
console.log(JSON.stringify({faces:faces.length,modelPresent:snapshot.present,time:TIME,svgBytes:Buffer.byteLength(svg)}));
tenantWorld.assets.dispose();assets.dispose();
