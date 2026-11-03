// ============================================================
// RenderBlox — Face system (shared by the scene editor and character editor)
// Bone-attached decals, expression library, custom faces, texture cache.
// ============================================================
import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { drawLibraryFace } from './faces.js';
import { sceneState, findHeadMesh, findHeadBone, getMats, restoreHeadDefaultTexture } from './scene.js';
import { assetStore } from './zip-io.js';
import { toast } from './common.js';

export const faceHooks = { onFaceReady: null };

function loadTextureFromArrayBuffer(bytes) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([bytes]));
    const img = new Image();
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      tex.colorSpace = THREE.SRGBColorSpace;
      URL.revokeObjectURL(url);
      resolve(tex);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// ============================================================
// Faces — bone-attached decals, texture cache, expression library
// ============================================================
export const FACE_DEFAULTS = { scale: 1.15, xOff: 0, yOff: 0, zOff: 0.6 };
const faceTexCache = new Map();      // key -> THREE.Texture
const facePreviewCache = new Map();  // key -> dataURL
const myFaceAssetIds = new Map();    // my-face index -> assetId (this session)
const MYFACES_KEY = 'renderblox_myfaces_v1';

function loadMyFaces() { try { return JSON.parse(localStorage.getItem(MYFACES_KEY) || '[]'); } catch { return []; } }
function saveMyFaces(list) { try { localStorage.setItem(MYFACES_KEY, JSON.stringify(list.slice(-16))); } catch (e) { toast('⚠ Could not store face (storage full?)'); } }
let myFaces = loadMyFaces();

export async function ensureFaceTexture(key) {
  if (faceTexCache.has(key)) return faceTexCache.get(key);
  let tex = null;
  if (key.startsWith('lib:')) {
    const cv = await drawLibraryFace(key);
    tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
  } else if (key.startsWith('asset:')) {
    const a = assetStore.get(key.slice(6));
    if (a) tex = await loadTextureFromArrayBuffer(a.bytes);
  }
  if (tex) faceTexCache.set(key, tex);
  return tex;
}

export async function facePreview(key) {
  if (facePreviewCache.has(key)) return facePreviewCache.get(key);
  let url = '';
  if (key.startsWith('lib:')) {
    const cv = await drawLibraryFace(key);
    const sm = document.createElement('canvas'); sm.width = sm.height = 128;
    const g = sm.getContext('2d'); g.fillStyle = '#c9ccd2'; g.fillRect(0, 0, 128, 128); g.drawImage(cv, 0, 0, 128, 128);
    url = sm.toDataURL('image/png');
  } else if (key.startsWith('asset:')) {
    const a = assetStore.get(key.slice(6));
    if (a) url = URL.createObjectURL(new Blob([a.bytes]));
  }
  if (url) facePreviewCache.set(key, url);
  return url;
}

export function collectFaceKeys(obj) {
  const keys = new Set();
  if (obj.faceKey && obj.faceKey !== 'none' && obj.faceKey !== 'default') keys.add(obj.faceKey);
  (obj.lookKeys || []).forEach(k => { const f = k.look?.face; if (f && f !== 'none' && f !== 'default') keys.add(f); });
  return keys;
}

// The default R6 head texture has the smile baked in. Paint it out (keeping the
// skin shading) so the new face never shows through / doubles up.

function clearHeadFaceTexture(obj) {
  const headMesh = findHeadMesh(obj);
  if (!headMesh) return;
  obj.__headOriginalMap = obj.__headOriginalMap || {};
  getMats(headMesh).forEach((mat, i) => {
    if (!obj.__headOriginalMap[i] && mat.map) {
      obj.__headOriginalMap[i] = mat.map;
    }
    if (mat.map) {
      mat.map = null;
      mat.needsUpdate = true;
    }
  });
}


function disposeDecal(decal) {
  if (!decal) return;
  if (decal.parent) decal.parent.remove(decal);
  try { decal.geometry.dispose(); decal.material.dispose(); } catch {}  // textures are cached & shared: never disposed here
}

// Everything needed to project onto the head, expressed in the HEAD BONE's space
// so the face rides the bone exactly like the skinned head does.
function computeFaceFrame(obj) {
  if (obj.__faceFrame) return obj.__faceFrame;
  const headMesh = findHeadMesh(obj), headBone = findHeadBone(obj);
  if (!headMesh || !headBone || !headMesh.geometry?.attributes?.position) return null;
  obj.root.updateMatrixWorld(true);
  const toBone = new THREE.Matrix4();
  if (headMesh.isSkinnedMesh && headMesh.skeleton) {
    const bi = headMesh.skeleton.bones.indexOf(headBone);
    if (bi < 0) return null;
    toBone.multiplyMatrices(headMesh.skeleton.boneInverses[bi], headMesh.bindMatrix);
  } else {
    toBone.copy(headBone.matrixWorld).invert().multiply(headMesh.matrixWorld);
  }
  const geo = headMesh.geometry.clone();
  geo.applyMatrix4(toBone);
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;

  // Direction of the character's front/up in bone space, measured at the rest pose
  const saved = {};
  for (const n in obj.bones) saved[n] = { q: obj.bones[n].obj.quaternion.clone(), p: obj.bones[n].obj.position.clone() };
  for (const n in obj.bones) { obj.bones[n].obj.quaternion.copy(obj.bones[n].restQuat); obj.bones[n].obj.position.copy(obj.bones[n].restPos); }
  obj.root.updateMatrixWorld(true);
  const rel = new THREE.Matrix4().copy(obj.root.matrixWorld).invert().multiply(headBone.matrixWorld);
  const inv = rel.clone().invert();
  let f = new THREE.Vector3(0, 0, 1).transformDirection(inv);
  let up = new THREE.Vector3(0, 1, 0).transformDirection(inv);
  for (const n in obj.bones) { obj.bones[n].obj.quaternion.copy(saved[n].q); obj.bones[n].obj.position.copy(saved[n].p); }
  obj.root.updateMatrixWorld(true);

  // Built-in head: the model's own face lives at a known UV spot — use its normals as ground truth
  if (obj.builtin && uv && nor && pos.count === 1654) {
    const avg = new THREE.Vector3(); let n = 0;
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i), v = uv.getY(i);
      if (u > 0.3125 && u < 0.41 && v > 0.498 && v < 0.679) { avg.x += nor.getX(i); avg.y += nor.getY(i); avg.z += nor.getZ(i); n++; }
    }
    if (n >= 6 && avg.lengthSq() > 1e-6) f = avg.normalize();
  }
  f.normalize();
  up.sub(f.clone().multiplyScalar(up.dot(f))).normalize();
  const right = new THREE.Vector3().crossVectors(up, f).normalize();

  let dMin = Infinity, dMax = -Infinity, rMin = Infinity, rMax = -Infinity, uMin = Infinity, uMax = -Infinity;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const d = p.dot(f), r = p.dot(right), u = p.dot(up);
    if (d < dMin) dMin = d; if (d > dMax) dMax = d;
    if (r < rMin) rMin = r; if (r > rMax) rMax = r;
    if (u < uMin) uMin = u; if (u > uMax) uMax = u;
  }
  const tmpMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
  obj.__faceFrame = {
    bone: headBone, tmpMesh, f, up, right, dMin, dMax,
    cR: (rMin + rMax) / 2, cU: (uMin + uMax) / 2,
    spanR: Math.max(0.01, rMax - rMin), spanU: Math.max(0.01, uMax - uMin)
  };
  return obj.__faceFrame;
}

function buildFaceGeometry(obj, ud) {
  const fr = computeFaceFrame(obj);
  if (!fr) return null;
  const span = Math.max(fr.spanR, fr.spanU);
  const size = span * 0.9 * (ud.scale || 1);
  const depth = Math.max(0.01, fr.dMax - fr.dMin);
  const back = fr.dMax - depth * (ud.zOff ?? FACE_DEFAULTS.zOff);
  const front = fr.dMax + depth * 0.2;
  const center = new THREE.Vector3()
    .addScaledVector(fr.right, fr.cR + (ud.xOff || 0) * fr.spanR)
    .addScaledVector(fr.up, fr.cU + (ud.yOff || 0) * fr.spanU)
    .addScaledVector(fr.f, (back + front) / 2);
  const euler = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(fr.right, fr.up, fr.f), 'XYZ');
  try {
    const g = new DecalGeometry(fr.tmpMesh, center, euler, new THREE.Vector3(size, size, front - back));
    return g.attributes.position && g.attributes.position.count > 0 ? g : null;
  } catch (err) { console.warn('DecalGeometry failed:', err); return null; }
}

function makeDecalMaterial(texture) {
  return new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthTest: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    side: THREE.DoubleSide, alphaTest: 0.01
  });
}

// Sets a face by key: 'default' | 'none' | 'lib:<id>' | 'asset:<id>'
// ALWAYS clears the previous face texture first.
export function setFaceByKey(obj, key, settings) {
  if (!obj || obj.type !== 'r6') return;
  key = key || 'default';
  if (key === 'default') {
    removeFaceDecal(obj);
    obj.faceKey = null;
    return;
  }
  const prev = obj.faceDecal?.userData || settings || {};
  const ud = {
    scale: prev.scale ?? FACE_DEFAULTS.scale, yOff: prev.yOff ?? FACE_DEFAULTS.yOff, zOff: prev.zOff ?? FACE_DEFAULTS.zOff, xOff: prev.xOff ?? FACE_DEFAULTS.xOff
  };
  // 1) wipe whatever face is on the head right now
  disposeDecal(obj.faceDecal); obj.faceDecal = null;
  clearHeadFaceTexture(obj);
  obj.faceKey = key;
  if (key === 'none') return;   // blank head
  const tex = faceTexCache.get(key);
  if (tex) applyFaceTexture(obj, key, tex, ud);
  else ensureFaceTexture(key).then(t => { if (t && obj.faceKey === key && !obj.faceDecal) { applyFaceTexture(obj, key, t, ud); faceHooks.onFaceReady?.(); } });
}

function applyFaceTexture(obj, key, texture, ud) {
  clearHeadFaceTexture(obj); // always start from a clean head, never rely on the caller
  const headMesh = findHeadMesh(obj);
  const fr = headMesh ? computeFaceFrame(obj) : null;
  let decal = null;
  if (fr) {
    const geo = buildFaceGeometry(obj, ud);
    if (geo) {
      decal = new THREE.Mesh(geo, makeDecalMaterial(texture));
      decal.userData = { ...ud, isFaceDecal: true, faceKey: key, textureAssetId: key.startsWith('asset:') ? key.slice(6) : null };
      fr.bone.add(decal);
    }
  }
  if (!decal) {
    // No usable head mesh: float a flat quad on the head bone / root instead
    const parent = findHeadBone(obj) || obj.root;
    decal = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), makeDecalMaterial(texture));
    decal.userData = { ...ud, baseSize: 1, isFaceDecal: true, isFlat: true, faceKey: key, textureAssetId: key.startsWith('asset:') ? key.slice(6) : null };
    parent.add(decal);
  }
  decal.renderOrder = 10; decal.frustumCulled = false; decal.name = '__faceDecal';
  obj.faceDecal = decal;
  if (decal.userData.isFlat) updateFaceDecal(obj);
  // inherit the head's current opacity / visibility
  const hm = findHeadMesh(obj);
  const hmat = hm ? getMats(hm)[0] : null;
  if (hmat && hmat.opacity < 1) { decal.material.opacity = hmat.opacity; }
  if (hm) decal.visible = hm.visible;
}

// Legacy entry point (scene loading, direct uploads)
export function createFaceDecal(obj, texture, previewUrl, assetId) {
  const key = assetId ? 'asset:' + assetId : 'tmp:' + (faceTexCache.size + 1);
  if (texture) faceTexCache.set(key, texture);
  if (previewUrl) facePreviewCache.set(key, previewUrl);
  setFaceByKey(obj, key);
}

export function updateFaceDecal(obj) {
  const decal = obj.faceDecal;
  if (!decal) return;
  const ud = decal.userData;
  if (ud.isFlat) {
    const s = ud.scale || 1, bs = ud.baseSize || 1;
    decal.scale.set(bs * s, bs * s, 1);
    decal.position.set((ud.xOff || 0) * bs, (ud.yOff || 0) * bs, (ud.zOff ?? FACE_DEFAULTS.zOff) * bs);
    return;
  }
  const geo = buildFaceGeometry(obj, ud);
  if (geo) { decal.geometry.dispose(); decal.geometry = geo; }
}

export function removeFaceDecal(obj) {
  disposeDecal(obj.faceDecal);
  obj.faceDecal = null;
  obj.faceKey = null;
  restoreHeadDefaultTexture(obj);
}

export async function prepareAllFaces() {
  const keys = new Set();
  sceneState.objects.forEach(o => collectFaceKeys(o).forEach(k => keys.add(k)));
  await Promise.all([...keys].map(k => ensureFaceTexture(k)));
}

export function myFaceAssetId(i) {
  if (myFaceAssetIds.has(i)) return myFaceAssetIds.get(i);
  const f = myFaces[i]; if (!f) return null;
  const bin = atob(f.data.split(',')[1]);
  const bytes = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
  const id = assetStore.register('face', f.name || 'face.png', bytes.buffer);
  myFaceAssetIds.set(i, id);
  return id;
}

export async function addUploadedFace(file) {
  // normalise to <=512px PNG so it stays small in storage + saves
  const bytes = await file.arrayBuffer();
  const url = URL.createObjectURL(new Blob([bytes]));
  const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = url; });
  URL.revokeObjectURL(url);
  if (!img) return null;
  const sc = Math.min(1, 512 / Math.max(img.width, img.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  const data = cv.toDataURL('image/png');
  myFaces.push({ name: file.name.replace(/\.[^.]+$/, '').slice(0, 14) || 'My face', data });
  saveMyFaces(myFaces);
  myFaces = loadMyFaces();
  const idx = myFaces.length - 1;
  return 'asset:' + myFaceAssetId(idx);
}

export function myFaceKeys() { return myFaces.map((f, i) => ({ idx: i, name: f.name, data: f.data })); }

export function deleteMyFace(idx) { myFaces.splice(idx, 1); saveMyFaces(myFaces); myFaces = loadMyFaces(); myFaceAssetIds.clear(); }
