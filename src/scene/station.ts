import * as THREE from 'three';
import { SCREENS, UNITS } from '../data/station';
import { Assets, Batch, pickVolume, translateLabel } from './assets';

export interface StationWorld {
  hall: THREE.Group; platforms: THREE.Group; roof: THREE.Group; walls: THREE.Group;
  routes: THREE.Group; heat: THREE.Group; train: THREE.Group; trainDoors: THREE.Group[]; train2:THREE.Group; trainDoors2:THREE.Group[];
  units: Map<string,THREE.Group>; locations: Map<string,THREE.Vector3>;
  screens: Map<string,THREE.Mesh>; shellMaterials: THREE.Material[];
}
const C={white:'#F6F4E9',tile:'#DFDDD1',tile2:'#E9E7DF',seam:'#CFCDC4',band:'#737D81',steel:'#CBD4D4',navy:'#243B75',yellow:'#E6BB56',sand:'#EEEDE5',grass:'#AEC2AD',track:'#9BABA9'};

function plant(b:Batch,x:number,y:number,z:number,size=.7) {
 b.cylinder('#CDCABC',x,y+.24,z,size*.45,.5); b.cylinder('#E4E0D5',x,y+.46,z,size*.48,.12);
 b.cylinder('#748768',x,y+.9,z,.055,.85);
 b.sphere('#91AA83',x,y+1.15,z,size*.58,size*.8);b.sphere('#769C7C',x+.23,y+1.15,z+.15,size*.4,size*.5);b.sphere('#ABC195',x-.2,y+1.38,z,size*.4,size*.5);
}
function bench(b:Batch,x:number,y:number,z:number,turn=false) {
 const w=turn?.52:2.5,d=turn?2.5:.52;
 b.box('#B2B7B6',x,y+.35,z,w,.15,d); b.box('#8C999A',x,y+.05,z,w*.85,.55,d*.8);
 b.box('#D3D0C5',x,y+.66,z+(turn?0:.22),w,.48,turn?2.5:.12);
 for(let i=0;i<5;i++)b.box('#B5AE97',x+(turn?0:(i-2)*.46),y+.43,z,turn?.5:.38,.09,turn?2.5:.48);
}
function arrow(b:Batch,x:number,y:number,z:number,rotation=0,color='#DAA342'){
 const center=new THREE.Vector3(x,y,z);const transform=(dx:number,dz:number)=>center.clone().add(new THREE.Vector3(dx*Math.cos(rotation)+dz*Math.sin(rotation),0,-dx*Math.sin(rotation)+dz*Math.cos(rotation)));
 b.beam(color,transform(-.28,-.2),transform(0,.2),.06);b.beam(color,transform(.28,-.2),transform(0,.2),.06);
}

export function buildStation(scene:THREE.Scene,assets:Assets):StationWorld {
 const hall=new THREE.Group(), platforms=new THREE.Group(), roof=new THREE.Group(),walls=new THREE.Group(),routes=new THREE.Group(),heat=new THREE.Group();
 hall.name='commercial-hall';platforms.name='platform-and-track';roof.name='pitched-roof';
 scene.add(hall,platforms,roof,routes,heat);hall.add(walls);
 const locations=new Map<string,THREE.Vector3>();
 const world:StationWorld={hall,platforms,roof,walls,routes,heat,train:new THREE.Group(),trainDoors:[],train2:new THREE.Group(),trainDoors2:[],units:new Map(),locations,screens:new Map(),shellMaterials:[]};
 const ground=new Batch(assets);
 ground.box('#E9EEEB',0,-1.05,4,76,.5,47);
 ground.box('#FAFAF6',0,-.7,4,69,.24,40);
 ground.box('#D1DCD7',-34,-.52,-3,5,.05,20);ground.box('#D1DCD7',34,-.52,-3,5,.05,20);
 for(const side of [-1,1])for(let z=-11;z<16;z+=6)plant(ground,side*34.5,-.45,z,1.35);
 // A few subdued external masses keep the station readable as a miniature.
 for(const [x,z,h,w] of [[-32,-19,3.5,7],[-21,-20,2.3,10],[26,-20,4,8],[34,24,2,6]]) {
  ground.box('#DDE3DF',x,h/2-.4,z,w,h,5);ground.box('#CBD6D0',x,h-.3,z,w+.15,.16,5.15);
 }
 ground.finish(scene);
 const floor=new Batch(assets);
 floor.box('#C9D1CD',0,.64,-3,58,.65,18);
 floor.box('#F2EEE4',0,.94,-3,57.6,.15,17.6);
 for(let x=-27;x<28;x+=2)for(let z=-10.5;z<5;z+=2) floor.box(((x+z)%4===0)?C.tile:C.tile2,x,1.025,z,1.976,.045,1.976);
 floor.box(C.band,0,1.058,-5,54,.024,.24);floor.box(C.band,0,1.058,0,54,.024,.24);
 for(const x of [-26,-12,2,16,26])floor.box('#A3ADAE',x,1.06,-3,.22,.03,14.5);
 // The yellow spine and T branches echo the supplied concourse photographs.
 floor.box(C.yellow,0,1.083,-2.8,55,.04,.38);floor.box(C.yellow,8,1.083,1.4,.38,.04,8.4);
 for(let x=-27;x<28;x+=.32)for(const offset of [-.1,0,.1])floor.box('#F1D177',x,1.11,-2.8+offset,.22,.018,.025);
 for(let z=-2.5;z<5;z+=.32)for(const offset of [-.1,0,.1])floor.box('#F1D177',8+offset,1.11,z,.025,.018,.22);
 for(const x of [-27,27]) {
  floor.box('#DDDCCF',x,.62,-3,4,.7,3.5);
  for(let i=0;i<4;i++)floor.box('#EFEEE6',x+(x<0?-1:1)*(1+i*.3),.88-i*.17,-3,.4,.18,3.5);
 }
 floor.finish(hall,false);
 hall.add(pickVolume(assets,'ZHALL',0,1.04,-3,55,.08,16));locations.set('ZHALL',new THREE.Vector3(0,1,-3));
 const furnishing=new Batch(assets);
 for(const [x,z]of[[-24,2.8],[-14,3.3],[21,3.4],[-24,-5.2],[24,-5.2]])plant(furnishing,x,1.08,z,.8);
 for(const x of [-13,0,23])bench(furnishing,x,1.1,3.7);
 furnishing.box('#A6B1AF',-25,1.65,1.5,.45,1.1,.5);furnishing.box('#243B75',-25,2.15,1.5,.45,.08,.5);
 for(const x of [-26,26]) {
  furnishing.box(C.navy,x,3.3,-3,.18,4.6,.18);furnishing.box(C.navy,x,5.3,-3,.18,.5,4);
  const sign=translateLabel(assets.label(x<0?'← WEST ENTRANCE':'EAST ENTRANCE →',4,.5,'#ffffff','#243b75',76),x<0?'← WEST ENTRANCE':'EAST ENTRANCE →',x<0?'← PINTU BARAT':'PINTU TIMUR →');sign.position.set(x,5.32,-.88);hall.add(sign);
 }
 // Ticket and service point remains outside the commercial units.
 furnishing.box('#E4E3DD',-25.3,2.2,-8,2.1,2.3,4.2);furnishing.box('#879F9D',-25.3,2.1,-5.84,1.9,1.1,.09);
 furnishing.box(C.navy,-25.3,3.1,-5.77,2.2,.52,.18);
 const ticket=translateLabel(assets.label('TICKETS • INFO',2,.43,'#ffffff','#243b75',86),'TICKETS • INFO','TIKET • INFO');ticket.position.set(-25.3,3.11,-5.67);hall.add(ticket);
 // Fare-gate bank: stainless pedestals, display readers, green access fins.
 const gates=new THREE.Group();gates.userData.selectId='G1';gates.name='fare-gates';
 const gateBatch=new Batch(assets);
 for(let i=0;i<5;i++){const x=7.45+i*1.3;gateBatch.box('#8FA6A6',x,1.57,4.05,.42,.96,1.28);gateBatch.box('#D2DEDD',x,2.05,4.05,.44,.08,1.3);gateBatch.box('#1A3D4A',x,2.11,3.75,.32,.045,.32);gateBatch.box('#59B493',x+.35,1.66,4.05,.25,.68,.065);gateBatch.box('#9BDDC1',x,2.15,3.74,.12,.016,.13);}
 gateBatch.finish(gates);gates.add(pickVolume(assets,'G1',9.8,1.75,4.05,7,1.5,1.6));hall.add(gates);locations.set('G1',new THREE.Vector3(10,1,4));
 const gateSign=translateLabel(assets.label('↓ PLATFORMS   01 / 02',6.8,.6,'#ffffff','#243b75',70),'↓ PLATFORMS   01 / 02','↓ PERON   01 / 02');gateSign.position.set(9.8,4.3,4.05);hall.add(gateSign);
 furnishing.box('#D7DACE',7,3.15,4.13,.11,2.6,.1);furnishing.box('#D7DACE',13,3.15,4.13,.11,2.6,.1);
 furnishing.finish(hall);
 const structural=new Batch(assets);
 const beams=new Batch(assets);
 for(const x of [-27,-18,-9,0,9,18,27]){
  for(const z of [-11.5,4.65]) { structural.box('#C5CDCB',x,3.95,z,.28,5.85,.28);structural.box('#F2F0E5',x,1.2,z,.52,.28,.52); }
  const a=new THREE.Vector3(x,6.7,-11.6),b=new THREE.Vector3(x,10,-3.5),c=new THREE.Vector3(x,6.7,4.65);
  beams.beam(C.white,a,b,.14);beams.beam(C.white,b,c,.14);beams.beam(C.white,a,c,.13);
  const zpoints=[-11.5,-7.5,-3.5,.5,4.5];
  for(let i=1;i<4;i++){const z=zpoints[i],top=10-Math.abs(z+3.5)*.41;beams.beam(C.white,new THREE.Vector3(x,6.7,z),new THREE.Vector3(x,top,z),.09);}
  beams.beam(C.white,new THREE.Vector3(x,6.7,-7.5),b,.09);beams.beam(C.white,new THREE.Vector3(x,6.7,.5),b,.09);
 }
 for(const z of [-11.5,-7.5,-3.5,.5,4.65])beams.beam('#F0EFE5',new THREE.Vector3(-27,10-Math.abs(z+3.5)*.41,z),new THREE.Vector3(27,10-Math.abs(z+3.5)*.41,z),.1);
 for(const x of [-27,27])for(let y=7;y<9.8;y+=.31){const depth=(10-y)/.41*2;beams.box('#B7C3BD',x,y,-3.5,.08,.065,depth);}
 structural.finish(hall);beams.finish(hall);
 const stationSign=assets.label('SUDIRMAN',6.4,.84,'#ffffff','#243b75',108);stationSign.position.set(-21,5.85,4.72);hall.add(stationSign);
 const wayfinding=assets.label('KRL • COMMUTER LINE',6.4,.3,'#536966','#EDF0E8',65);wayfinding.position.set(-21,5.29,4.73);hall.add(wayfinding);
 // Quiet louver wall at the back; front wall is deliberately removed in cutaway.
 const wallBatch=new Batch(assets);
 wallBatch.box('#D6DCD8',0,4.45,-11.85,55,2.5,.22);
 for(let i=0;i<8;i++)wallBatch.box('#AFBCB8',0,5.05+i*.2,-11.99,54,.085,.11);
 wallBatch.finish(walls);walls.traverse(o=>{if(o instanceof THREE.Mesh){const m=(o.material as THREE.Material).clone();assets.materials.set(`shell-${assets.materials.size}`,m);o.material=m;world.shellMaterials.push(m);}});
 const roofBatch=new Batch(assets);const slope=Math.atan2(3.3,8.1);const len=Math.hypot(3.3,8.1);
 for(let x=-25.5;x<28;x+=3)for(const side of [-1,1]) {
  const z=-3.5+side*4.05;const isLight=Math.abs(x)%9<3.2;
  roofBatch.box(isLight?'#E9D6AA':'#AAB8B3',x,8.45,z,2.95,.1,len,new THREE.Euler(side*slope,0,0));
 }
 roofBatch.finish(roof);roof.traverse(o=>{if(o instanceof THREE.Mesh){const m=(o.material as THREE.Material).clone();assets.materials.set(`roof-${assets.materials.size}`,m);o.material=m;world.shellMaterials.push(m);}});
 // Slender tiled side platforms and rail sleepers distinguish the transport level.
 const rail=new Batch(assets);
 rail.box('#879995',0,-.36,13.45,70,.5,6.2);
 for(let x=-34;x<35;x+=.85)for(const z of [12.4,15.15])rail.box('#697C76',x,-.04,z,.21,.13,2.1);
 for(const z of [11.7,13.1,14.45,15.85])rail.box('#C8D2CE',0,.03,z,70,.1,.1);
 for(const z of [8.8,18.5]) {
  rail.box('#BDC9C3',0,-.33,z,66,.6,4.5);rail.box('#E3E5DA',0,-.008,z,65.8,.09,4.4);
  rail.box('#E8BD54',0,.055,z+(z<12?1.75:-1.75),65.5,.05,.34);
  for(let x=-30;x<32;x+=2)rail.box('#A4B1AC',x,.051,z,.016,.015,4.2);
  for(const x of [-28,-16,-4,16,28]){bench(rail,x,.1,z+(z<12?-.9:.9));plant(rail,x+2,.08,z+(z<12?-.9:.9),.62);rail.box('#B6C3BA',x,2.1,z,.13,4,.13);rail.box('#FAF6E5',x,4.13,z,1.4,.15,.3);}
 }
 rail.finish(platforms);
 for(const [id,z]of [['ZPLATFORM1',8.8],['ZPLATFORM2',18.5]] as const){platforms.add(pickVolume(assets,id,0,.13,z,65,.2,4.4));locations.set(id,new THREE.Vector3(0,0,z));}
 for(const [name,z]of[['01  MANGGARAI →',8.3],['← TANAH ABANG  02',19]]as const){const sign=assets.label(name,5,.7,'#ffffff','#243b75',68);sign.position.set(-21,3.3,z);platforms.add(sign);}
 const stairs=new Batch(assets);
 for(let i=0;i<7;i++)stairs.box('#E8E7DC',8,.96-i*.135,5.1+i*.46,3.6,.14,.55);
 stairs.beam('#AABCB5',new THREE.Vector3(6.25,1.8,5),new THREE.Vector3(6.25,.9,8.4),.09);stairs.beam('#AABCB5',new THREE.Vector3(9.75,1.8,5),new THREE.Vector3(9.75,.9,8.4),.09);
 for(let z=5.1;z<8.5;z+=.8)for(const x of [6.25,9.75])stairs.box('#AABCB5',x,1.28-(z-5.1)*.27,z,.07,.8,.07);
 stairs.finish(platforms);locations.set('STAIR1',new THREE.Vector3(8,.5,6.4));
 // Authored transfer footbridge keeps the far platform physically connected.
 const bridge=new Batch(assets);
 bridge.box('#D6DED8',26,2.65,13.5,3,.25,11.5);bridge.box('#BFCFC4',24.55,3.1,13.5,.08,.8,11.7);bridge.box('#BFCFC4',27.45,3.1,13.5,.08,.8,11.7);
 for(let i=0;i<10;i++)for(const z of [8.8,18.5])bridge.box('#D6DED8',21.4+i*.46,.19+i*.25,z, .5,.18,2.5);
 bridge.finish(platforms);
 const flow=new Batch(assets);
 flow.box('#74A79B',0,1.16,-2.8,51,.025,.055);flow.box('#74A79B',8,1.16,1.4,.055,.025,8.4);
 for(let x=-23;x<26;x+=4)arrow(flow,x,1.19,-2.8,Math.PI/2,'#548A7D');
 for(let z=-1;z<9;z+=2)arrow(flow,8,1.19,z,0,'#548A7D');
 flow.finish(routes,false);routes.visible=false;
 // Ad panels use an original miniature product visual, never a copied advertiser.
 for(const ad of SCREENS){
  const panel=assets.label(ad.id==='AD2'?'WELCOME TO SUDIRMAN':ad.id==='AD1'?'A LITTLE PAUSE. A BETTER MORNING.':'RIDE. PAUSE. REPEAT.',ad.id==='AD1'?6:4.8,1.25,'#fff9ec',ad.id==='AD1'?'#789589':'#263e71',42);
  panel.position.set(ad.x,3.65,ad.z);panel.userData.selectId=ad.id;hall.add(panel);world.screens.set(ad.id,panel);locations.set(ad.id,panel.position.clone());
  const panelFrame=new Batch(assets),frameWidth=ad.id==='AD1'?6.25:5.05;panelFrame.box('#F1EEE1',ad.x,3.65,ad.z-.06,frameWidth,1.48,.13);for(const side of [-1,1])panelFrame.box('#9EACA5',ad.x+side*(frameWidth/2-.12),2.02,ad.z-.04,.08,1.84,.08);panelFrame.finish(hall);
 }
 for(const unit of UNITS){const group=new THREE.Group();group.name=unit.id;group.position.set(unit.x,1.12,unit.z);world.units.set(unit.id,group);hall.add(group);locations.set(unit.id,new THREE.Vector3(unit.x,1,unit.z));}
 buildTrain(world,assets);
 // A second platform's train reuses all owned geometry/material assets.
 world.train2=world.train.clone(true);world.train2.name='second-commuter-train';world.train2.visible=false;
 world.train2.traverse(object=>{if(object.userData.selectId==='TRAIN1')object.userData.selectId='TRAIN2';if(object instanceof THREE.Group&&object.userData.trainDoor)world.trainDoors2.push(object);});
 world.train2.position.z=15.15;world.platforms.add(world.train2);world.locations.set('TRAIN2',new THREE.Vector3(0,0,15.15));
 return world;
}

function buildTrain(world:StationWorld,assets:Assets) {
 const train=world.train;train.name='commuter-train';train.userData.selectId='TRAIN1';world.platforms.add(train);world.locations.set('TRAIN1',new THREE.Vector3(0,1,12.35));
 const b=new Batch(assets);
 for(let car=0;car<4;car++) {
  const x=(car-1.5)*12.2;
  b.box('#C5D0CA',x,1.33,0,11.85,2.28,2.65);b.box('#F3F0E7',x,2.5,0,11.35,.3,2.6);
  b.box('#E17758',x,.94,0,11.87,.48,2.68);b.box('#314963',x,.2,0,10.75,.35,2);
  b.box('#C0C9C3',x,2.71,0,5,.19,1.8);
  for(let j=-4;j<5;j+=2)for(const z of [-1.34,1.34]){
   b.box('#405B69',x+j,1.72,z,1.28,.79,.035);b.box('#D5E4D7',x+j,1.77,z+.022,1.08,.025,.02);
  }
  for(const dx of [-3.2,3.2])for(const z of [-1.36,1.36]) {
   const doors=new THREE.Group();doors.position.set(x+dx,1.36,z);doors.userData.selectId='TRAIN1';doors.userData.trainDoor=true;
   const db=new Batch(assets);db.box('#E1E4D9',-.31,0,0,.56,1.9,.06);db.box('#E1E4D9',.31,0,0,.56,1.9,.06);db.box('#334C58',-.31,.42,.045,.39,.66,.023);db.box('#334C58',.31,.42,.045,.39,.66,.023);db.finish(doors);world.trainDoors.push(doors);train.add(doors);
  }
  for(const dx of [-3.8,3.8])for(const z of [-.95,.95])b.cylinder('#3F5255',x+dx,.19,z,.3,.23,new THREE.Euler(Math.PI/2,0,0));
  if(car<3)b.box('#6D7C74',x+6.08,1.3,0,.27,1.8,2.15);
 }
 b.box('#E17758',-24.15,1.43,0,.13,2.1,2.5);b.box('#31495A',-24.24,1.98,0,.06,.72,2.15);b.box('#F3E4AA',-24.27,.84,-.82,.08,.17,.35);b.box('#F3E4AA',-24.27,.84,.82,.08,.17,.35);
 b.finish(train);train.add(pickVolume(assets,'TRAIN1',0,1.4,0,49,2.8,2.8));train.position.set(0,0,12.35);
}
