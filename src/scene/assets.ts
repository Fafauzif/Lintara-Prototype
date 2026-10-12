import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** One asset owner per WebGL surface. Repeated geometry is merged by material. */
export class Assets {
  readonly geometries = new Set<THREE.BufferGeometry>();
  readonly materials = new Map<string, THREE.Material>();
  readonly textures = new Set<THREE.Texture>();
  readonly cube = this.geometry(new THREE.BoxGeometry(1, 1, 1));
  readonly sphere = this.geometry(new THREE.SphereGeometry(1, 10, 7));
  readonly cylinder = this.geometry(new THREE.CylinderGeometry(1, 1, 1, 12));
  geometry<T extends THREE.BufferGeometry>(g: T): T { this.geometries.add(g); return g; }
  material(color: string, roughness = .82): THREE.MeshStandardMaterial {
    const key = `${color}:${roughness}`;
    let mat = this.materials.get(key);
    if (!mat) { mat = new THREE.MeshStandardMaterial({ color, roughness, metalness: .035 }); this.materials.set(key, mat); }
    return mat as THREE.MeshStandardMaterial;
  }
  label(text: string, width: number, height: number, color = '#243b75', background = '#ffffff', fontSize = 78): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = Math.max(128, Math.round(1024 * height / width));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color; ctx.font = `600 ${fontSize}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 512, canvas.height / 2, 960);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; this.textures.add(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false });
    this.materials.set(`label-${this.materials.size}`, material);
    const mesh = new THREE.Mesh(this.geometry(new THREE.PlaneGeometry(width, height)), material);
    mesh.userData.labelCanvas = canvas; mesh.userData.labelFont = fontSize; mesh.userData.labelColor = color; mesh.userData.labelBackground = background;
    return mesh;
  }
  dispose() { this.geometries.forEach(g => g.dispose()); this.materials.forEach(m => m.dispose()); this.textures.forEach(t => t.dispose()); }
}

export function updateLabel(mesh: THREE.Mesh, text: string, background?: string) {
  const canvas = mesh.userData.labelCanvas as HTMLCanvasElement | undefined;
  if (!canvas || mesh.userData.labelText === text + background) return;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = background ?? mesh.userData.labelBackground; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = mesh.userData.labelColor; ctx.font = `600 ${mesh.userData.labelFont}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text,canvas.width/2,canvas.height/2,canvas.width*.94);
  const material = mesh.material as THREE.MeshBasicMaterial; if(material.map)material.map.needsUpdate=true;
  mesh.userData.labelText=text+background;
}

export function translateLabel(mesh:THREE.Mesh,en:string,id:string):THREE.Mesh {mesh.userData.translations={en,id};return mesh;}
export function updateTranslations(root:THREE.Object3D,language:'en'|'id') {root.traverse(object=>{if(object instanceof THREE.Mesh&&object.userData.translations)updateLabel(object,object.userData.translations[language]);});}

export class Batch {
  private pieces = new Map<THREE.Material, THREE.BufferGeometry[]>();
  constructor(private assets: Assets) {}
  shape(g: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, rotation = new THREE.Euler()) {
    const part = g.clone();
    part.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(rotation), new THREE.Vector3(sx, sy, sz)));
    const pieces = this.pieces.get(material) ?? []; pieces.push(part); this.pieces.set(material, pieces);
  }
  box(color: string, x: number, y: number, z: number, w: number, h: number, d: number, rotation?: THREE.Euler) { this.shape(this.assets.cube, this.assets.material(color), x, y, z, w, h, d, rotation); }
  sphere(color: string, x: number, y: number, z: number, r: number, sy = r) { this.shape(this.assets.sphere, this.assets.material(color), x, y, z, r, sy, r); }
  cylinder(color: string, x: number, y: number, z: number, r: number, h: number, rotation?: THREE.Euler) { this.shape(this.assets.cylinder, this.assets.material(color), x, y, z, r, h, r, rotation); }
  beam(color: string, a: THREE.Vector3, b: THREE.Vector3, width: number) {
    const geometry = this.assets.cube.clone();
    const center = a.clone().add(b).multiplyScalar(.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), b.clone().sub(a).normalize());
    geometry.applyMatrix4(new THREE.Matrix4().compose(center, q, new THREE.Vector3(width, a.distanceTo(b), width)));
    const m = this.assets.material(color); const pieces = this.pieces.get(m) ?? []; pieces.push(geometry); this.pieces.set(m, pieces);
  }
  finish(parent: THREE.Object3D, shadows = true) {
    this.pieces.forEach((parts, material) => {
      const geometry = this.assets.geometry(mergeGeometries(parts, false)!);
      parts.forEach(p => p.dispose());
      const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = shadows; mesh.receiveShadow = true; parent.add(mesh);
    }); this.pieces.clear();
  }
}

export function pickVolume(assets: Assets, id: string, x: number, y: number, z: number, w: number, h: number, d: number): THREE.Mesh {
  let mat = assets.materials.get('pick-volume');
  if (!mat) { mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }); assets.materials.set('pick-volume', mat); }
  const mesh = new THREE.Mesh(assets.cube, mat); mesh.position.set(x,y,z); mesh.scale.set(w,h,d); mesh.userData.selectId = id; mesh.userData.pickVolume = true;
  return mesh;
}

export function outline(assets: Assets, w: number, d: number, color: string): THREE.LineSegments {
  const geometry = assets.geometry(new THREE.EdgesGeometry(new THREE.BoxGeometry(w,.08,d)));
  const material = new THREE.LineBasicMaterial({ color, linewidth: 2, transparent: true, opacity: .9, depthTest: false });
  assets.materials.set(`outline-${assets.materials.size}`, material);
  const line = new THREE.LineSegments(geometry, material); line.renderOrder = 5; return line;
}
