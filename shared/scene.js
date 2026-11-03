// ============================================================
// RenderBlox — Scene module
// Object management, presets, keyframe interpolation, history,
// walk setup, character duplication. Scene-graph-agnostic.
//
// The Three.js scene lives in viewport.js. This module keeps a
// flat list of RenderBlox objects and calls back into the editor
// via sceneState.onObjectAdded / onObjectRemoved so the Three.js
// scene stays in sync without this module needing a reference
// to the actual THREE.Scene.
// ============================================================

import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

export const DEFAULT_INTERP = 'ease';
export const R6_BONES = [
  'Torso_00', 'Head_01', 'Left_Arm_02', 'Right_Arm_03',
  'Left_Leg_04', 'Right_Leg_05'
];

// ------------------------------------------------------------
// Bone Aliasing
// Different rigs use different naming conventions (spaces, suffixes,
// Mixamo prefixes). We normalize them to the canonical R6_BONES list
// so presets, faces, and save files work universally.
// ------------------------------------------------------------
export const BONE_ALIASES = {
  'Torso_00':    ['Torso', 'Spine', 'Chest', 'Torso_01'],
  'Head_01':     ['Head', 'Head_06', 'neck', 'mixamorigHead'],
  'Left_Arm_02': ['LeftArm', 'Left_Arm', 'UpperArm_L', 'LeftArm_02', 'mixamorigLeftArm'],
  'Right_Arm_03':['RightArm', 'Right_Arm', 'RightArm_2_03', 'UpperArm_R', 'RightArm_03', 'mixamorigRightArm'],
  'Left_Leg_04': ['LeftLeg', 'Left_Leg', 'UpperLeg_L', 'LeftLeg_04', 'mixamorigLeftUpLeg'],
  'Right_Leg_05':['RightLeg', 'Right_Leg', 'UpperLeg_R', 'RightLeg_05', 'mixamorigRightUpLeg']
};

export function normalizeBoneName(rawName) {
  // Strip ALL non-alphanumerics so "RightArm 2_03", "RightArm_2_03", "RightArm-2-03"
  // all normalize to the same key. Fixes the girl R6, whose right-arm bone is
  // "RightArm 2_03" -- a space where the male rig uses an underscore.
  const strip = s => s.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const check = strip(rawName);
  for (const [canonical, aliases] of Object.entries(BONE_ALIASES)) {
    if (strip(canonical) === check) return canonical;
    for (const alias of aliases) {
      if (strip(alias) === check) return canonical;
    }
  }
  return rawName;
}


// ------------------------------------------------------------
// State
// ------------------------------------------------------------
export const sceneState = {
  objects: [],
  selectedId: null,
  nextId: 1,
  camKeyframes: [],
  duration: 10,
  time: 0,
  playing: false,
  mode: 'live', // 'live' | 'keyframe'
  loopPlayback: true,
  playbackSpeed: 1.0,

  // Callbacks set by editor-main
  onChanged: null,
  onSelectionChanged: null,
  onObjectAdded: null,
  onObjectRemoved: null,
  getR6Template: null,

  // Face decal callbacks — set by editor-main so zip-io can
  // restore decals during load without importing editor-main
  createFaceDecal: null,
  updateFaceDecal: null,
  findHeadBone: null,
  setFaceByKey: null,   // (obj, key) => void — set by editor-main
};

// ------------------------------------------------------------
// Accessors
// ------------------------------------------------------------
export function getSelected() {
  return sceneState.objects.find(o => o.id === sceneState.selectedId) || null;
}

export function getObjectById(id) {
  return sceneState.objects.find(o => o.id === id) || null;
}

export function setSelected(id) {
  const changed = sceneState.selectedId !== id;
  sceneState.selectedId = id;
  if (changed) sceneState.onSelectionChanged?.(id);
}

// ------------------------------------------------------------
// Object creation
// ------------------------------------------------------------

export function buildCharacter(root, name) {
  root.traverse(o => {
    if (o.isMesh || o.isSkinnedMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.isSkinnedMesh) o.frustumCulled = false;
      if (Array.isArray(o.material)) {
        o.material = o.material.map(cloneMaterialWithBackup);
      } else if (o.material) {
        o.material = cloneMaterialWithBackup(o.material);
      }
      o.userData.textureAssetId = null;
      o.userData.mapUrl = null;
    }
  });
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const h = box.getSize(new THREE.Vector3()).y;
  if (h > 0.0001) root.scale.setScalar(5 / h);
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  const c = box2.getCenter(new THREE.Vector3());
  root.position.set(-c.x, -box2.min.y, -c.z);

  const bones = {};
  root.traverse(o => {
    if (o.isBone) {
      // Normalize the name so presets and the UI always see canonical R6 names
      const canonical = normalizeBoneName(o.name);
      bones[canonical] = {
        obj: o,
        restQuat: o.quaternion.clone(),
        restPos: o.position.clone()
      };
    }
  });
  const meshes = [];
  root.traverse(o => {
    if (o.isMesh || o.isSkinnedMesh) {
      meshes.push({ mesh: o, name: o.name || `Mesh_${meshes.length}` });
    }
  });

  const obj = {
    id: sceneState.nextId++,
    type: 'r6',
    name: name || 'R6',
    root,
    bones,
    keyframes: [],
    currentAction: 'idle',
    presetPhase: 0,
    attachments: [],
    meshes,
    selectedMeshIndex: -1,
    faceDecal: null,
    faceKey: null,
    lookKeys: [],
    __pinned: false,
    __manualPose: false
  };
  sceneState.objects.push(obj);
  sceneState.onObjectAdded?.(obj);
  sceneState.onChanged?.();
  return obj;
}

export function addR6Character(name, gender = 'male') {
  // Get the template for the requested gender
  const template = gender === 'female'
    ? window.__renderbloxSceneGirlTemplate
    : sceneState.getR6Template?.();

  if (!template) throw new Error(`r6 template not loaded for ${gender}`);

  const obj = buildCharacter(skeletonClone(template.scene), name);
  obj.builtin = true;
  obj.gender = gender;
  // Save the template reference so duplicateObject can clone it
  obj.templateSource = gender;
  return obj;
}

export function addPrimitive(primType, color = 0x3b82f6) {
  let geo;
  if (primType === 'box')      geo = new THREE.BoxGeometry(1, 1, 1);
  if (primType === 'sphere')   geo = new THREE.SphereGeometry(0.5, 32, 20);
  if (primType === 'cylinder') geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
  if (primType === 'cone')     geo = new THREE.ConeGeometry(0.5, 1, 32);
  if (primType === 'plane')    geo = new THREE.PlaneGeometry(2, 2);
  if (primType === 'torus')    geo = new THREE.TorusGeometry(0.6, 0.22, 16, 32);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const box = new THREE.Box3().setFromObject(mesh);
  if (primType !== 'plane') mesh.position.y = -box.min.y;
  const root = new THREE.Group();
  root.add(mesh);

  const obj = {
    id: sceneState.nextId++,
    type: 'primitive',
    name: primType.charAt(0).toUpperCase() + primType.slice(1),
    root,
    keyframes: [],
    primType,
    attachments: [],
    meshes: [{ mesh, name: primType.charAt(0).toUpperCase() + primType.slice(1) }],
    selectedMeshIndex: 0,
    faceDecal: null,
    faceKey: null,
    lookKeys: [],
    __pinned: false,
    __manualPose: false
  };
  sceneState.objects.push(obj);
  sceneState.onObjectAdded?.(obj);
  sceneState.onChanged?.();
  return obj;
}

export function addModelFromRoot(root, name, assetId) {
  root.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (Array.isArray(o.material)) o.material = o.material.map(cloneMaterialWithBackup);
      else if (o.material) o.material = cloneMaterialWithBackup(o.material);
      o.userData.textureAssetId = null;
      o.userData.mapUrl = null;
    }
  });
  const meshes = [];
  root.traverse(o => {
    if (o.isMesh) meshes.push({ mesh: o, name: o.name || `Mesh_${meshes.length}` });
  });
  const obj = {
    id: sceneState.nextId++,
    type: 'model',
    name: name || 'Model',
    root,
    keyframes: [],
    attachments: [],
    assetId,
    meshes,
    selectedMeshIndex: -1,
    faceDecal: null,
    faceKey: null,
    lookKeys: [],
    __pinned: false,
    __manualPose: false
  };
  sceneState.objects.push(obj);
  sceneState.onObjectAdded?.(obj);
  sceneState.onChanged?.();
  return obj;
}

export function addLight(color = 0xffffff, intensity = 3, distance = 15) {
  const light = new THREE.PointLight(color, intensity, distance, 2);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  light.position.set(3, 6, 3);
  const helper = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffdd55 })
  );
  light.add(helper);
  const obj = {
    id: sceneState.nextId++,
    type: 'light',
    name: 'Light',
    root: light,
    color,
    intensity,
    keyframes: [],
    attachments: [],
    meshes: [],
    selectedMeshIndex: -1,
    faceDecal: null,
    faceKey: null,
    lookKeys: [],
    __pinned: false,
    __manualPose: false
  };
  sceneState.objects.push(obj);
  sceneState.onObjectAdded?.(obj);
  sceneState.onChanged?.();
  return obj;
}

// ------------------------------------------------------------
// Deletion
// ------------------------------------------------------------

export function removeObject(id) {
  const i = sceneState.objects.findIndex(o => o.id === id);
  if (i < 0) return null;
  const obj = sceneState.objects[i];
  sceneState.objects.splice(i, 1);
  sceneState.onObjectRemoved?.(obj);
  if (sceneState.selectedId === id) {
    sceneState.selectedId = sceneState.objects[0]?.id ?? null;
    sceneState.onSelectionChanged?.(sceneState.selectedId);
  }
  sceneState.onChanged?.();
  return obj;
}

export function clearAllObjects() {
  const list = [...sceneState.objects];
  list.forEach(o => sceneState.onObjectRemoved?.(o));
  sceneState.objects = [];
  sceneState.selectedId = null;
  sceneState.onChanged?.();
  sceneState.onSelectionChanged?.(null);
  return list;
}

// ------------------------------------------------------------
// Duplication
// ------------------------------------------------------------

export function duplicateObject(obj) {
  if (!obj) return null;
  let dup;
  if (obj.type === 'r6') {
    if (obj.builtin) {
      dup = addR6Character(obj.name + ' Copy', obj.gender || 'male');
    } else {
      dup = buildCharacter(skeletonClone(obj.root), obj.name + ' Copy');
    }
    if (dup.meshes && obj.meshes) {
      obj.meshes.forEach((m, i) => {
        const dm = dup.meshes[i];
        if (!dm) return;
        dm.mesh.visible = m.mesh.visible;
        const srcMat = getMats(m.mesh)[0];
        if (srcMat?.color) setMeshColor(dm.mesh, srcMat.color.clone());
      });
    }
  } else if (obj.type === 'primitive') {
    dup = addPrimitive(obj.primType);
  } else if (obj.type === 'light') {
    dup = addLight(obj.color, obj.intensity);
  } else {
    return null;
  }
  dup.root.position.copy(obj.root.position).add(new THREE.Vector3(2, 0, 0));
  dup.root.quaternion.copy(obj.root.quaternion);
  dup.root.scale.copy(obj.root.scale);
  dup.currentAction = obj.currentAction;
  dup.presetPhase = obj.presetPhase;
  dup.keyframes = JSON.parse(JSON.stringify(obj.keyframes || []));
  dup.lookKeys = JSON.parse(JSON.stringify(obj.lookKeys || []));
  if (obj.faceKey && obj.type === 'r6') sceneState.setFaceByKey?.(dup, obj.faceKey, obj.faceDecal?.userData);
  if (dup.meshes && obj.meshes) {
    obj.meshes.forEach((m, i) => {
      const dm = dup.meshes[i]; if (!dm) return;
      const sm = getMats(m.mesh)[0], dmm = getMats(dm.mesh)[0];
      if (sm && dmm && sm.transparent) { dmm.transparent = true; dmm.opacity = sm.opacity; }
    });
  }
  sceneState.onChanged?.();
  return dup;
}

// ------------------------------------------------------------
// Material helpers
// ------------------------------------------------------------

export function getMats(mesh) {
  if (!mesh.material) return [];
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

export function setMeshColor(mesh, color) {
  getMats(mesh).forEach(m => { if (m.color) m.color.copy(color); });
}

export function setMeshMap(mesh, tex) {
  getMats(mesh).forEach(m => { m.map = tex; m.needsUpdate = true; });
}

export function clearMeshMap(mesh) {
  getMats(mesh).forEach(m => {
    if (m.map) { try { m.map.dispose?.(); } catch {} m.map = null; }
    m.needsUpdate = true;
  });
}

export function getMeshColorHex(mesh) {
  const mats = getMats(mesh);
  if (!mats.length || !mats[0].color) return '#ffffff';
  return '#' + mats[0].color.getHexString();
}

export function cloneMaterialWithBackup(mat) {
  const cl = mat.clone();
  cl.userData = cl.userData || {};
  cl.userData.__origColor = mat.color ? mat.color.clone() : null;
  cl.userData.__origMap = mat.map || null;
  return cl;
}

// ------------------------------------------------------------
// Presets (R6 pose math)
// ------------------------------------------------------------

const AX = new THREE.Vector3(1, 0, 0);
const AY = new THREE.Vector3(0, 1, 0);
const AZ = new THREE.Vector3(0, 0, 1);

function resetBone(o, n) {
  const e = o.bones[n];
  if (!e) return;
  e.obj.quaternion.copy(e.restQuat);
  e.obj.position.copy(e.restPos);
}

function resetAllBones(o) {
  Object.keys(o.bones).forEach(n => resetBone(o, n));
}

function boneRotateWorld(o, n, axis, angle) {
  const e = o.bones[n];
  if (!e) return;
  e.obj.quaternion.copy(e.restQuat);
  e.obj.updateMatrixWorld(true);
  e.obj.rotateOnWorldAxis(axis, angle);
}

export const PRESETS = {
  rest: (o) => resetAllBones(o),

  idle: (o, t) => {
    resetAllBones(o);
    boneRotateWorld(o, 'Torso_00', AX, Math.sin(t * 1.8) * 0.03);
    const s = Math.sin(t * 1.2) * 0.08;
    boneRotateWorld(o, 'Left_Arm_02', AX, s);
    boneRotateWorld(o, 'Right_Arm_03', AX, -s);
    boneRotateWorld(o, 'Head_01', AY, Math.sin(t * 0.7) * 0.15);
  },

  wave: (o, t) => {
    resetAllBones(o);
    boneRotateWorld(o, 'Right_Arm_03', AZ, -Math.PI / 2 - Math.PI / 4);
    const w = Math.sin(t * 12) * 0.35;
    const e = o.bones.Right_Arm_03;
    if (e) e.obj.rotateOnWorldAxis(AY, w);
    boneRotateWorld(o, 'Left_Arm_02', AZ, 0.05);
    boneRotateWorld(o, 'Head_01', AY, -0.15);
    boneRotateWorld(o, 'Torso_00', AX, Math.sin(t * 1.5) * 0.03);
  },

  point: (o) => {
    resetAllBones(o);
    boneRotateWorld(o, 'Right_Arm_03', AX, -1.5);
    boneRotateWorld(o, 'Left_Arm_02', AX, 0.15);
    boneRotateWorld(o, 'Head_01', AX, 0.1);
  },

  walk: (o, t) => {
    resetAllBones(o);
    const s = Math.sin(t * 4) * 0.7;
    boneRotateWorld(o, 'Left_Leg_04', AX, s);
    boneRotateWorld(o, 'Right_Leg_05', AX, -s);
    boneRotateWorld(o, 'Left_Arm_02', AX, -s * 0.6);
    boneRotateWorld(o, 'Right_Arm_03', AX, s * 0.6);
    const b = Math.abs(Math.sin(t * 4)) * 0.05;
    if (o.bones.Torso_00) {
      o.bones.Torso_00.obj.position.y = o.bones.Torso_00.restPos.y + b;
    }
  },

  dance: (o, t) => {
    resetAllBones(o);
    const b = Math.sin(t * 6);
    boneRotateWorld(o, 'Torso_00', AY, b * 0.3);
    boneRotateWorld(o, 'Left_Arm_02', AZ, -1.2 - b * 0.5);
    boneRotateWorld(o, 'Right_Arm_03', AZ, 1.2 + b * 0.5);
    boneRotateWorld(o, 'Head_01', AY, b * 0.3);
    boneRotateWorld(o, 'Left_Leg_04', AX, b * 0.3);
    boneRotateWorld(o, 'Right_Leg_05', AX, -b * 0.3);
  }
};

export function applyPreset(o, n, p) {
  (PRESETS[n] || PRESETS.idle)(o, p);
}

// ------------------------------------------------------------
// Keyframe read / write
// ------------------------------------------------------------

export function writeKeyframeAt(obj, t) {
  if (!obj) return;
  const kf = {
    time: t,
    pos: [obj.root.position.x, obj.root.position.y, obj.root.position.z],
    quat: [obj.root.quaternion.x, obj.root.quaternion.y, obj.root.quaternion.z, obj.root.quaternion.w],
    scale: [obj.root.scale.x, obj.root.scale.y, obj.root.scale.z],
    interp: DEFAULT_INTERP
  };
  if (obj.type === 'r6') {
    const bd = {};
    for (const n in obj.bones) {
      const b = obj.bones[n].obj;
      bd[n] = {
        q: [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w],
        p: [b.position.x, b.position.y, b.position.z]
      };
    }
    kf.bones = bd;
  }
  const i = obj.keyframes.findIndex(k => Math.abs(k.time - t) < 0.02);
  if (i >= 0) {
    kf.interp = obj.keyframes[i].interp || DEFAULT_INTERP;
    obj.keyframes[i] = kf;
  } else {
    obj.keyframes.push(kf);
  }
  obj.keyframes.sort((a, b) => a.time - b.time);
  obj.__pinned = false;
  sceneState.mode = 'keyframe';
}

export function applyKeyframeToObject(obj, kf) {
  if (!obj || !kf) return;
  obj.root.position.set(kf.pos[0], kf.pos[1], kf.pos[2]);
  if (kf.quat) {
    obj.root.quaternion.set(kf.quat[0], kf.quat[1], kf.quat[2], kf.quat[3]);
  }
  if (kf.scale) {
    if (Array.isArray(kf.scale)) {
      obj.root.scale.set(kf.scale[0], kf.scale[1], kf.scale[2]);
    } else {
      obj.root.scale.setScalar(kf.scale);
    }
  }
  if (obj.type === 'r6' && kf.bones) {
    for (const n in kf.bones) {
      const e = obj.bones[n];
      if (!e) continue;
      const d = kf.bones[n];
      e.obj.quaternion.set(d.q[0], d.q[1], d.q[2], d.q[3]);
      e.obj.position.set(d.p[0], d.p[1], d.p[2]);
    }
  }
}

// ------------------------------------------------------------
// Interpolation
// ------------------------------------------------------------

export function interpolateKeyframes(obj, t) {
  if (!obj || !obj.keyframes || obj.keyframes.length === 0) return null;
  const kfs = obj.keyframes;
  if (kfs.length === 1) return kfs[0];
  if (t <= kfs[0].time) return kfs[0];
  if (t >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1];

  let ia = 0;
  for (let i = 0; i < kfs.length - 1; i++) {
    if (t >= kfs[i].time && t <= kfs[i + 1].time) { ia = i; break; }
  }
  const a = kfs[ia];
  const b = kfs[ia + 1];
  const span = Math.max(0.001, b.time - a.time);
  let u = (t - a.time) / span;
  const mode = a.interp || DEFAULT_INTERP;
  if (mode === 'step') u = 0;
  else if (mode === 'ease') u = u * u * (3 - 2 * u);

  const pos = [
    a.pos[0] + (b.pos[0] - a.pos[0]) * u,
    a.pos[1] + (b.pos[1] - a.pos[1]) * u,
    a.pos[2] + (b.pos[2] - a.pos[2]) * u
  ];
  const qa = new THREE.Quaternion(a.quat[0], a.quat[1], a.quat[2], a.quat[3]);
  const qb = new THREE.Quaternion(b.quat[0], b.quat[1], b.quat[2], b.quat[3]);
  const qr = qa.clone().slerp(qb, u);
  const sa = Array.isArray(a.scale) ? a.scale : [a.scale || 1, a.scale || 1, a.scale || 1];
  const sb = Array.isArray(b.scale) ? b.scale : [b.scale || 1, b.scale || 1, b.scale || 1];
  const scale = [
    sa[0] + (sb[0] - sa[0]) * u,
    sa[1] + (sb[1] - sa[1]) * u,
    sa[2] + (sb[2] - sa[2]) * u
  ];

  const result = { time: t, pos, quat: [qr.x, qr.y, qr.z, qr.w], scale };

  if (obj.type === 'r6' && a.bones && b.bones) {
    const rb = {};
    const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qR = new THREE.Quaternion();
    const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pR = new THREE.Vector3();
    for (const n in a.bones) {
      if (!b.bones[n]) { rb[n] = a.bones[n]; continue; }
      const da = a.bones[n];
      const db = b.bones[n];
      qA.set(da.q[0], da.q[1], da.q[2], da.q[3]);
      qB.set(db.q[0], db.q[1], db.q[2], db.q[3]);
      qR.slerpQuaternions(qA, qB, u);
      pA.set(da.p[0], da.p[1], da.p[2]);
      pB.set(db.p[0], db.p[1], db.p[2]);
      pR.lerpVectors(pA, pB, u);
      rb[n] = { q: [qR.x, qR.y, qR.z, qR.w], p: [pR.x, pR.y, pR.z] };
    }
    result.bones = rb;
  }
  return result;
}

// ------------------------------------------------------------
// Camera keyframe interpolation (always eased)
// ------------------------------------------------------------

export function interpolateCamera(t) {
  const kfs = sceneState.camKeyframes;
  if (kfs.length === 0) return null;
  if (kfs.length === 1) return kfs[0];
  if (t <= kfs[0].time) return kfs[0];
  if (t >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1];

  let a = kfs[0], b = kfs[1];
  for (let i = 0; i < kfs.length - 1; i++) {
    if (t >= kfs[i].time && t <= kfs[i + 1].time) {
      a = kfs[i]; b = kfs[i + 1]; break;
    }
  }
  const span = Math.max(0.001, b.time - a.time);
  let u = (t - a.time) / span;
  u = u * u * (3 - 2 * u);

  const pos = [
    a.pos[0] + (b.pos[0] - a.pos[0]) * u,
    a.pos[1] + (b.pos[1] - a.pos[1]) * u,
    a.pos[2] + (b.pos[2] - a.pos[2]) * u
  ];
  const qa = new THREE.Quaternion(a.quat[0], a.quat[1], a.quat[2], a.quat[3]);
  const qb = new THREE.Quaternion(b.quat[0], b.quat[1], b.quat[2], b.quat[3]);
  const qr = qa.clone().slerp(qb, u);
  const fov = a.fov + (b.fov - a.fov) * u;
  return { time: t, pos, quat: [qr.x, qr.y, qr.z, qr.w], fov };
}


// ------------------------------------------------------------
// Look keyframes — colour / opacity / glow / visibility / face
// A separate track from transform keys so painting never overwrites a pose.
// ------------------------------------------------------------

export function captureLook(obj) {
  const parts = (obj.meshes || []).map(m => {
    const mat = getMats(m.mesh)[0];
    return {
      c: mat?.color ? [mat.color.r, mat.color.g, mat.color.b] : [1, 1, 1],
      o: mat ? (mat.opacity ?? 1) : 1,
      g: mat?.userData?.__glow || 0,
      v: m.mesh.visible ? 1 : 0
    };
  });
  return { parts, face: obj.type === 'r6' ? (obj.faceKey || 'default') : null };
}

function setMatOpacity(mat, o) {
  const wasT = mat.transparent;
  const t = o < 0.999;
  if (mat.opacity !== o) mat.opacity = o;
  if (wasT !== t) { mat.transparent = t; mat.needsUpdate = true; }
}

export function applyLook(obj, look) {
  if (!obj || !look) return;
  (look.parts || []).forEach((p, i) => {
    const m = obj.meshes?.[i];
    if (!m || !p) return;
    m.mesh.visible = p.v !== 0;
    getMats(m.mesh).forEach(mat => {
      if (mat.color && p.c) mat.color.setRGB(p.c[0], p.c[1], p.c[2]);
      if (p.o != null) setMatOpacity(mat, p.o);
      const gl = p.g || 0;
      if (mat.emissive && (gl > 0 || mat.userData.__glow)) {
        mat.emissive.copy(mat.color);
        mat.emissiveIntensity = gl;
        mat.userData.__glow = gl;
        if (gl === 0) mat.emissive.setRGB(0, 0, 0);
      }
    });
  });
  // keep the face decal in sync with the head's opacity/visibility
  if (obj.faceDecal) {
    const hm = findHeadMesh(obj);
    const idx = hm ? obj.meshes.findIndex(m => m.mesh === hm) : -1;
    const hp = idx >= 0 ? look.parts?.[idx] : null;
    if (hp) {
      obj.faceDecal.visible = hp.v !== 0;
      if (obj.faceDecal.material) { setMatOpacity(obj.faceDecal.material, hp.o ?? 1); }
    }
  }
  if (look.face && obj.type === 'r6' && look.face !== (obj.faceKey || 'default')) {
    sceneState.setFaceByKey?.(obj, look.face);
  }
}

function easeU(u, mode) {
  if (mode === 'step') return 0;
  if (mode === 'ease') return u * u * (3 - 2 * u);
  return u;
}

export function interpolateLook(obj, t) {
  const ks = obj?.lookKeys;
  if (!ks || ks.length === 0) return null;
  if (ks.length === 1 || t <= ks[0].time) return ks[0].look;
  if (t >= ks[ks.length - 1].time) return ks[ks.length - 1].look;
  let ia = 0;
  for (let i = 0; i < ks.length - 1; i++) if (t >= ks[i].time && t <= ks[i + 1].time) { ia = i; break; }
  const a = ks[ia], b = ks[ia + 1];
  const u0 = (t - a.time) / Math.max(0.001, b.time - a.time);
  const u = easeU(u0, a.interp || DEFAULT_INTERP);
  const parts = (a.look.parts || []).map((pa, i) => {
    const pb = b.look.parts?.[i] || pa;
    return {
      c: [0, 1, 2].map(k => pa.c[k] + (pb.c[k] - pa.c[k]) * u),
      o: pa.o + (pb.o - pa.o) * u,
      g: (pa.g || 0) + ((pb.g || 0) - (pa.g || 0)) * u,
      v: (a.interp === 'step' || u0 < 0.5) ? pa.v : pb.v  // visibility flips halfway
    };
  });
  // faces never blend: hold the earlier face until the next key is reached
  return { parts, face: u0 >= 1 ? b.look.face : a.look.face };
}

export function applyLookAt(obj, t) {
  const look = interpolateLook(obj, t);
  if (look) applyLook(obj, look);
}

export function writeLookKeyAt(obj, t, lookOverride = null) {
  if (!obj) return null;
  const k = { time: t, look: lookOverride || captureLook(obj), interp: DEFAULT_INTERP };
  if (!obj.lookKeys) obj.lookKeys = [];
  const i = obj.lookKeys.findIndex(x => Math.abs(x.time - t) < 0.02);
  if (i >= 0) { k.interp = obj.lookKeys[i].interp || DEFAULT_INTERP; obj.lookKeys[i] = k; }
  else obj.lookKeys.push(k);
  obj.lookKeys.sort((a, b) => a.time - b.time);
  obj.__lookPinned = false;
  return k;
}

export function removeLookKeyNear(obj, t, tol = 0.05) {
  const i = (obj?.lookKeys || []).findIndex(k => Math.abs(k.time - t) < tol);
  if (i >= 0) { obj.lookKeys.splice(i, 1); return true; }
  return false;
}

// One-click effects. Each writes a few look keys starting at time t0.
export function bakeLookEffect(obj, type, t0, dur = 1) {
  if (!obj || !obj.meshes?.length) return false;
  const base = captureLook(obj);
  const clone = (l) => JSON.parse(JSON.stringify(l));
  const tint = (l, fn) => { const c = clone(l); c.parts.forEach(p => fn(p)); return c; };
  const hsl = (h) => { const c = new THREE.Color().setHSL(((h % 1) + 1) % 1, 0.9, 0.55); return [c.r, c.g, c.b]; };
  if (type === 'fadeout') {
    writeLookKeyAt(obj, t0, clone(base));
    writeLookKeyAt(obj, t0 + dur, tint(base, p => { p.o = 0; }));
  } else if (type === 'fadein') {
    writeLookKeyAt(obj, t0, tint(base, p => { p.o = 0; }));
    writeLookKeyAt(obj, t0 + dur, clone(base));
  } else if (type === 'flash') {
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const on = i % 2 === 1;
      writeLookKeyAt(obj, t0 + (dur * i) / n, on ? tint(base, p => { p.c = [1, 0.1, 0.1]; p.g = 0.9; }) : clone(base));
    }
    obj.lookKeys.forEach(k => { if (k.time >= t0 - 0.001 && k.time <= t0 + dur + 0.001) k.interp = 'step'; });
  } else if (type === 'rainbow') {
    const n = Math.max(4, Math.round(dur * 4));
    for (let i = 0; i <= n; i++) writeLookKeyAt(obj, t0 + (dur * i) / n, tint(base, (p) => { p.c = hsl(i / n); }));
    obj.lookKeys.forEach(k => { if (k.time >= t0 - 0.001 && k.time <= t0 + dur + 0.001) k.interp = 'linear'; });
  } else if (type === 'pulse') {
    writeLookKeyAt(obj, t0, clone(base));
    writeLookKeyAt(obj, t0 + dur / 2, tint(base, p => { p.g = 1; }));
    writeLookKeyAt(obj, t0 + dur, clone(base));
  } else return false;
  obj.__lookPinned = false;
  sceneState.mode = 'keyframe';
  return true;
}

// ------------------------------------------------------------
// Walk setup
// ------------------------------------------------------------

export const walkSetup = {
  active: false,
  objId: null,
  startPos: null,
  startQuat: null,
  endPos: null,
  endYaw: 0
};

export function bakeWalkFromTo(obj, startPos, endPos, endYaw, dur, currentTime) {
  const sT = currentTime;
  obj.keyframes = obj.keyframes.filter(k =>
    k.time < sT - 0.01 || k.time > sT + dur + 0.01
  );
  const dx = endPos[0] - startPos[0];
  const dz = endPos[2] - startPos[2];
  const step = 0.08;
  const count = Math.max(4, Math.ceil(dur / step));
  const sx = obj.root.scale.x, sy = obj.root.scale.y, sz = obj.root.scale.z;

  for (let i = 0; i <= count; i++) {
    const u = i / count;
    const t = sT + u * dur;
    const px = startPos[0] + dx * u;
    const pz = startPos[2] + dz * u;
    applyPreset(obj, 'walk', u * dur);  // real seconds — preset cadence is tuned for it
    obj.root.rotation.set(0, endYaw, 0);
    obj.root.position.set(px, startPos[1], pz);

    const bd = {};
    for (const n in obj.bones) {
      const b = obj.bones[n].obj;
      bd[n] = {
        q: [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w],
        p: [b.position.x, b.position.y, b.position.z]
      };
    }
    obj.keyframes.push({
      time: t,
      bones: bd,
      pos: [px, startPos[1], pz],
      quat: [obj.root.quaternion.x, obj.root.quaternion.y, obj.root.quaternion.z, obj.root.quaternion.w],
      scale: [sx, sy, sz],
      interp: 'linear'
    });
  }
  obj.keyframes.sort((a, b) => a.time - b.time);
  obj.currentAction = 'walk';
  obj.__pinned = false;
  sceneState.mode = 'keyframe';
}

export function bakePresetFor(obj, type, dur, currentTime) {
  const sT = currentTime;
  obj.keyframes = obj.keyframes.filter(k =>
    k.time < sT - 0.01 || k.time > sT + dur + 0.01
  );
  const step = 0.08;
  const count = Math.max(4, Math.ceil(dur / step));
  const sx = obj.root.scale.x, sy = obj.root.scale.y, sz = obj.root.scale.z;

  for (let i = 0; i <= count; i++) {
    const u = i / count;
    const t = sT + u * dur;
    applyPreset(obj, type, u * dur);  // real seconds — was u*dur*2 (double-speed)

    const bd = {};
    for (const n in obj.bones) {
      const b = obj.bones[n].obj;
      bd[n] = {
        q: [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w],
        p: [b.position.x, b.position.y, b.position.z]
      };
    }
    obj.keyframes.push({
      time: t,
      bones: bd,
      pos: [obj.root.position.x, obj.root.position.y, obj.root.position.z],
      quat: [obj.root.quaternion.x, obj.root.quaternion.y, obj.root.quaternion.z, obj.root.quaternion.w],
      scale: [sx, sy, sz],
      interp: 'linear'
    });
  }
  obj.keyframes.sort((a, b) => a.time - b.time);
  obj.currentAction = type;
  obj.__pinned = false;
  sceneState.mode = 'keyframe';
}

// ------------------------------------------------------------
// Face decal helpers
// ------------------------------------------------------------

export function findHeadMesh(obj) {
  if (!obj || !obj.meshes) return null;

  // 1) Name match — works for most rigs.
  for (const m of obj.meshes) {
    if (/head/i.test(m.name || '')) return m.mesh;
  }

  // 2) R6-specific node fallback.
  for (const m of obj.meshes) {
    const mesh = m.mesh;
    if (!mesh) continue;
    if (mesh.name === 'Object_18' || mesh.parent?.name === 'Object_18') return mesh;
  }

  // 3) Skinning fallback — checks which mesh is skinned to the Head bone.
  const headBone = findHeadBone(obj);
  if (headBone) {
    for (const m of obj.meshes) {
      const mesh = m.mesh;
      if (mesh?.isSkinnedMesh && Array.isArray(mesh.skeleton?.bones)) {
        if (mesh.skeleton.bones.includes(headBone)) return mesh;
      }
    }
  }

  // 4) Single-mesh fallback.
  if (obj.meshes.length === 1) return obj.meshes[0].mesh;

  return null;
}



export function findHeadBone(obj) {
  if (!obj || !obj.bones) return null;
  for (const n in obj.bones) {
    if (/head/i.test(n)) return obj.bones[n].obj;
  }
  return null;
}

// Measures the head and returns where/how big to put a hat (shared by all editors)
// Keeps the face decal in lockstep with the head mesh — hiding the head
// must hide the face, and head opacity must drive decal opacity.
export function syncFaceDecalVisibility(obj) {
  if (!obj || !obj.faceDecal) return;
  const headMesh = findHeadMesh(obj);
  if (!headMesh) return;
  const headMats = getMats(headMesh);
  obj.faceDecal.visible = headMesh.visible;
  if (headMats[0] && obj.faceDecal.material) {
    obj.faceDecal.material.opacity = headMats[0].opacity;
    const wantT = headMats[0].transparent || headMats[0].opacity < 1;
    if (obj.faceDecal.material.transparent !== wantT) {
      obj.faceDecal.material.transparent = wantT;
      obj.faceDecal.material.needsUpdate = true;
    }
  }
}

export function measureHead(obj) {
  const headBone = findHeadBone(obj);
  const headMesh = findHeadMesh(obj);
  if (!headBone) {
    return { attachTo: obj.root, localY: 5, scaleFactor: 1, headWidth: 2, hasBone: false };
  }

  headBone.updateWorldMatrix(true, true);

  let localY = 1.1;
  let headWidth = 1.0;

  if (headMesh && headMesh.geometry && headMesh.geometry.attributes.position) {
    // Measure in bone-local space so hat size tracks the REAL head size,
    // regardless of the rig's world scale. Same technique as computeFaceFrame()
    // in face-system.js.
    obj.root.updateMatrixWorld(true);
    const toBone = new THREE.Matrix4();
    if (headMesh.isSkinnedMesh && headMesh.skeleton) {
      const bi = headMesh.skeleton.bones.indexOf(headBone);
      if (bi >= 0) toBone.multiplyMatrices(headMesh.skeleton.boneInverses[bi], headMesh.bindMatrix);
      else toBone.copy(headBone.matrixWorld).invert().multiply(headMesh.matrixWorld);
    } else {
      toBone.copy(headBone.matrixWorld).invert().multiply(headMesh.matrixWorld);
    }
    const geo = headMesh.geometry.clone();
    geo.applyMatrix4(toBone);
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (bb && !bb.isEmpty()) {
      headWidth = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z, 0.01);
      localY = bb.max.y;          // bone-local Y of the head top
    }
    geo.dispose();
  }

  // Hat brim is CylinderGeometry(1, 1, ...) → total width 2 at scale 1.
  // Width is now expressed in bone-LOCAL units, so the size is stable
  // across rigs with different world scales.
  const targetLocalWidth = headWidth * 1.15;
  let scaleFactor = targetLocalWidth / 2;
  if (!isFinite(scaleFactor) || scaleFactor < 0.05 || scaleFactor > 20) scaleFactor = 0.55;

  return { attachTo: headBone, localY, scaleFactor, headWidth, hasBone: true };
}

export function hideHeadDefaultTexture(obj) {
  const headMesh = findHeadMesh(obj);
  if (!headMesh) return;
  obj.__headOriginalMap = obj.__headOriginalMap || {};
  const mats = getMats(headMesh);
  mats.forEach((mat, i) => {
    if (mat.map && !obj.__headOriginalMap[i]) {
      obj.__headOriginalMap[i] = mat.map;
      mat.map = null;
      mat.needsUpdate = true;
    }
  });
}

export function restoreHeadDefaultTexture(obj) {
  const headMesh = findHeadMesh(obj);
  if (!headMesh) return;
  if (!obj.__headOriginalMap) return;
  const mats = getMats(headMesh);
  mats.forEach((mat, i) => {
    if (obj.__headOriginalMap[i]) {
      mat.map = obj.__headOriginalMap[i];
      mat.needsUpdate = true;
    }
  });
  obj.__headOriginalMap = null;
}

// ------------------------------------------------------------
// Utility
// ------------------------------------------------------------

export function isInScene(object3D, scene) {
  let p = object3D;
  while (p) {
    if (p === scene) return true;
    p = p.parent;
  }
  return false;
}

// ------------------------------------------------------------
// Character Part Visibility (Amputation)
// Injects a shader check into the material. If a vertex is close to a
// hidden bone, it discards the pixel. Works on R6 and R6-Girl!
// ------------------------------------------------------------

// ------------------------------------------------------------
// Unified Appearance (Amputation + Coloring)
// ------------------------------------------------------------
export function applyCharacterAppearance(obj, hiddenParts = [], partColors = {}) {
  if (!obj || obj.type !== 'r6') return;
  obj.hiddenParts = hiddenParts;
  obj.partColors = partColors;
  
  const boneMap = {
    'head': 'Head_01', 'left_arm': 'Left_Arm_02', 'right_arm': 'Right_Arm_03',
    'left_leg': 'Left_Leg_04', 'right_leg': 'Right_Leg_05', 'torso': 'Torso_00'
  };

  obj.meshes.forEach(entry => {
    const mesh = entry.mesh;
    const mats = getMats(mesh);
    mats.forEach(mat => {
      // Cache original material
      if (!mat.userData.__originalMat) {
        mat.userData.__originalMat = mat.clone();
        mat.userData.__originalMat.map = mat.map;
      }
      
      const newMat = mat.userData.__originalMat.clone();
      
      // If no mods, restore original
      if (hiddenParts.length === 0 && Object.keys(partColors).length === 0) {
        mesh.material = mat.userData.__originalMat;
        return;
      }

      newMat.onBeforeCompile = (shader) => {
        // Appearance/amputation only makes sense on skinned meshes (R6 body parts).
        // Skipping non-skinned meshes prevents shader compile errors on attachments.
        if (!mesh.isSkinnedMesh) return;
        let fragmentLogic = '';
        const indicesToHide = [];
        
        // 1. Build Hide Logic
        hiddenParts.forEach(part => {
          const bone = obj.bones[boneMap[part]]?.obj;
          if (bone && mesh.skeleton) {
            const idx = mesh.skeleton.bones.indexOf(bone);
            if (idx !== -1) indicesToHide.push(idx);
          }
        });
        
        // 2. Build Color Logic
        Object.keys(partColors).forEach(part => {
          const bone = obj.bones[boneMap[part]]?.obj;
          if (bone && mesh.skeleton) {
            const idx = mesh.skeleton.bones.indexOf(bone);
            if (idx !== -1) {
              const c = new THREE.Color(partColors[part]);
              const r = c.r.toFixed(3);
              const g = c.g.toFixed(3);
              const b = c.b.toFixed(3);
              fragmentLogic += `if (vSkinIndex.x == ${idx}.0 || vSkinIndex.y == ${idx}.0 || vSkinIndex.z == ${idx}.0 || vSkinIndex.w == ${idx}.0) { diffuseColor.rgb = vec3(${r}, ${g}, ${b}); }\n`;
            }
          }
        });

        // Combine into one discard check at the very top
        let discardLogic = '';
        if (indicesToHide.length > 0) {
          const checks = indicesToHide.map(i => `vSkinIndex.x == ${i}.0 || vSkinIndex.y == ${i}.0 || vSkinIndex.z == ${i}.0 || vSkinIndex.w == ${i}.0`).join(' || ');
          discardLogic = `if (${checks}) discard;\n`;
        }

        if (!discardLogic && !fragmentLogic) return;

        // --- Vertex Shader ---
        shader.vertexShader = 'varying vec4 vSkinIndex;\n' + shader.vertexShader.replace(
          '#include <skinning_vertex>',
          '#include <skinning_vertex>\n vSkinIndex = skinIndex;'
        );

        // --- Fragment Shader ---
        shader.fragmentShader = 'varying vec4 vSkinIndex;\n' + shader.fragmentShader;
        
        // Inject discard early (right after main starts)
        if (discardLogic) {
          shader.fragmentShader = shader.fragmentShader.replace(
            'void main() {',
            `void main() {\n${discardLogic}`
          );
        }
        
        // Inject color after the base texture is sampled
        if (fragmentLogic) {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `#include <color_fragment>\n${fragmentLogic}`
          );
        }
      };
      
      newMat.customProgramCacheKey = () => 'appearance_' + (mesh.skeleton?.uuid || 'none') + '_' + hiddenParts.join('_') + JSON.stringify(partColors);
      newMat.needsUpdate = true;
      mesh.material = newMat;
    });
  });
}

sceneState.applyCharacterAppearance = applyCharacterAppearance;
