// ============================================================
// RenderBlox — Editor main module
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { FACE_LIBRARY, faceDefs, faceName, drawLibraryFace, canvasToBytes } from './faces.js';
import {
  initViewport, viewport, loadR6Template,
  setActiveCamera, attachGizmoTo, detachGizmo,
  updateCamHelper, applyQuality, resizeViewport, renderFrame,
  frameGuide, GUIDE_PRESETS, refreshProjection, updateGuideOverlay, loadR6GirlTemplate
} from './viewport.js';
import {
  sceneState, getSelected, setSelected, getObjectById,
  addR6Character, addPrimitive, addLight, addModelFromRoot,
  removeObject, clearAllObjects, duplicateObject,
  buildCharacter,
  interpolateKeyframes, interpolateCamera,
  applyKeyframeToObject, applyPreset,
  writeKeyframeAt, bakePresetFor, bakeWalkFromTo, walkSetup,
  DEFAULT_INTERP,
  findHeadMesh, findHeadBone,
  getMats, setMeshMap,
  restoreHeadDefaultTexture,
  captureLook, applyLook, applyLookAt, writeLookKeyAt, removeLookKeyNear, bakeLookEffect,
  syncFaceDecalVisibility
} from './scene.js';
import {
  assetStore, soundStore, saveSceneZip, loadSceneZip,
  registerLoaders, getPendingFile, loadRx6IntoScene, deserializeAttachmentMesh } from './zip-io.js';
import {
  exportContext, exportVideo, cancelExport, exportSettings, saveExportSettings
} from './export.js';
import {
  timelineState, initTimeline, renderTimeline,
  updatePlayhead, fitTimelineToDuration
} from './timeline.js';
import {
  uiContext, renderSceneList, renderProperties, renderAppearance,
  renderBones, renderCamera, initMenuBar, initModals, showSettingsModal,
  refreshAllPanels, prettyMeshName
} from './ui.js';
import {
  toast, applySavedTheme, toggleTheme, pushRecentFile, isTypingInInput, escapeHtml
} from './common.js';

registerLoaders(THREE, GLTFLoader, OBJLoader);

const editorState = {
  gizmoMode: 'translate',
  activeTab: 'props',
  clipboard: null,
  fpvMode: false,
  boneEditMode: false,
  selectedBone: null,
  camPreviewMode: 'auto',
  autoKey: false,
  history: { stack: [], index: -1, maxSize: 100 },
  keysDown: {},
  fpv: { yaw: 0, pitch: 0, mouseLocked: false },
  exporting: false,
  pointerDownOnGizmo: false,
  bootComplete: false,
  skipDefaultR6: false
};
const graveyard = new Map(); // deleted objects, so Undo can bring them back

function boot() {
  applySavedTheme();

  const viewportEl = document.getElementById('viewport');
  initViewport(viewportEl);

  const { scene, editorCam, sceneCam, composer, renderPass, bloomPass, camHelper, sun, controls, transformGizmo } = viewport;

  window.__renderbloxScene = scene;
  window.__renderbloxSceneCam = sceneCam;
  window.__renderbloxEditorCam = editorCam;
  window.__renderbloxBoneMode = false;
  window.__renderbloxSelectedBone = null;
  window.__renderbloxCamPreviewMode = 'auto';

  sceneState.getR6Template = () => viewport.r6Template;
  window.__renderbloxLoadGirlTemplate = loadR6GirlTemplate;
  sceneState.onObjectAdded = (obj) => {
    if (obj && obj.root && !obj.root.parent) scene.add(obj.root);
  };
  sceneState.onObjectRemoved = (obj) => {
    if (obj) graveyard.set(obj.id, obj);
    if (obj && obj.root && obj.root.parent) scene.remove(obj.root);
  };
  sceneState.onChanged = () => { renderSceneList(); renderTimeline(); };
  sceneState.onSelectionChanged = () => {
    const obj = getSelected();
    // A bone picked on the previous character must not stay selected (it kept the
    // gizmo stuck on the old character and blocked editing the new one)
    const sb = editorState.selectedBone;
    if (sb) {
      let belongs = false;
      for (let p = sb; p && obj && obj.root; p = p.parent) { if (p === obj.root) { belongs = true; break; } }
      if (!belongs) {
        editorState.selectedBone = null;
        window.__renderbloxSelectedBone = null;
        const vBone = document.getElementById('vBone');
        if (vBone) vBone.style.display = 'none';
      }
    }
    // Selection highlight + the timeline's keyframe row both depend on the selection
    renderSceneList();
    renderTimeline();
    renderProperties();
    renderAppearance();
    renderBones();
    renderCamera();
    attachGizmo();
    updateSkeletonOverlay();
    const vSel = document.getElementById('vSel');
    if (vSel) vSel.textContent = obj ? obj.name : '—';
  };

  exportContext.renderer = viewport.renderer;
  exportContext.scene = scene;
  exportContext.sceneCam = sceneCam;
  exportContext.activeCam = editorCam;
  exportContext.renderPass = renderPass;
  exportContext.composer = composer;
  exportContext.bloomPass = bloomPass;
  exportContext.skyDome = viewport.skyDome;
  exportContext.sunGroup = viewport.sunGroup;
  exportContext.transformGizmo = transformGizmo;
  exportContext.camHelper = camHelper;
  exportContext.sun = sun;
  exportContext.prepare = prepareAllFaces;
  exportContext.refreshProjection = refreshProjection;
  exportContext.onStateChange = (isExporting) => {
    editorState.exporting = isExporting;
    frameGuide.suspended = isExporting;
    // Quick export records the live canvas: it must be looking through the scene camera
    updateActiveCam();
    updateViewModeLabel();
    refreshProjection();
  };

  uiContext.pushHistory = pushHistory;
  uiContext.undo = undo;
  uiContext.redo = redo;
  uiContext.attachGizmo = attachGizmo;
  uiContext.setGizmoMode = setGizmoMode;
  uiContext.refreshAll = refreshAllPanels;
  uiContext.setCamera = setCamera;
  uiContext.fitCamera = fitCamera;
  uiContext.toggleFPV = toggleFPV;
  uiContext.addCameraKeyframe = addCameraKeyframe;
  uiContext.updateCamHelper = updateCamHelper;
  uiContext.applyCameraAtTime = applyCameraAtTime;
  uiContext.autoKeyIfOn = autoKeyIfOn;
  uiContext.updateActiveCam = updateActiveCam;
  uiContext.updateViewModeLabel = updateViewModeLabel;
  uiContext.createFaceDecal = createFaceDecal;
  uiContext.updateFaceDecal = updateFaceDecal;
  // zip-io expects these on sceneState when rebuilding a loaded scene
  sceneState.createFaceDecal = createFaceDecal;
  sceneState.updateFaceDecal = updateFaceDecal;
  sceneState.findHeadBone = findHeadBone;
  sceneState.getEnvironment = () => ({
    sunIntensity: viewport.sun.intensity,
    sunColor: '#' + viewport.sun.color.getHexString(),
    ambIntensity: viewport.amb ? viewport.amb.intensity : null
  });
  sceneState.applyEnvironment = (env) => {
    if (env.sunIntensity != null) viewport.sun.intensity = env.sunIntensity;
    if (env.sunColor) viewport.sun.color.set(env.sunColor);
    if (env.ambIntensity != null && viewport.amb) viewport.amb.intensity = env.ambIntensity;
    const set = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
    const txt = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.textContent = Number(v).toFixed(2); };
    set('worldInt', env.sunIntensity); txt('worldIntv', env.sunIntensity);
    set('worldColor', env.sunColor);
    set('ambInt', env.ambIntensity); txt('ambIntv', env.ambIntensity);
  };
  uiContext.removeFaceDecal = removeFaceDecal;
  uiContext.applyQuality = applyQuality;
  faceHooks.onFaceReady = () => renderAppearance();
  uiContext.setFaceByKey = (obj, key) => { setFaceByKey(obj, key); };
  uiContext.facePreview = facePreview;
  uiContext.faceDefs = faceDefs;
  uiContext.faceName = faceName;
  uiContext.myFaces = myFaceKeys;
  uiContext.useMyFace = (idx) => 'asset:' + myFaceAssetId(idx);
  uiContext.deleteMyFace = deleteMyFace;
  uiContext.ensureFaceTexture = ensureFaceTexture;
  uiContext.addLookKey = addLookKey;
  uiContext.lookEdited = lookEdited;
  uiContext.bakeLookEffect = (obj, type, dur) => {
    if (bakeLookEffect(obj, type, sceneState.time, dur)) { renderTimeline(); renderAppearance(); pushHistory('Look effect: ' + type); toast(`✨ ${type} · ${dur}s`); }
    else toast('Nothing to animate on this object');
  };
  sceneState.setFaceByKey = (obj, key, settings) => setFaceByKey(obj, key, settings);
  sceneState.syncFaceDecal = syncFaceDecalVisibility;
  sceneState.ensureFaceTexture = ensureFaceTexture;

  window.__renderbloxPushHistory = pushHistory;
  window.__renderbloxRefreshProperties = renderProperties;
  window.__renderbloxRefreshCamera = renderCamera;
  window.__renderbloxRefreshPlayhead = () => updatePlayhead();
  window.__renderbloxApplyCamera = applyCameraAtTime;
  window.__renderbloxStartWalkSetup = startWalkSetup;
  window.__renderbloxToggleBoneMode = toggleBoneMode;
  window.__renderbloxSelectBone = selectBone;
  window.__renderbloxSetCamPreview = setCamPreviewMode;
  window.__renderbloxCopyKeyframe = copyKeyframe;
  window.__renderbloxClipboardColor = null;

  transformGizmo.addEventListener('dragging-changed', (e) => {
    controls.enabled = !e.value && viewport.activeCam === editorCam;
    if (e.value && document.pointerLockElement) document.exitPointerLock();
    if (!e.value) {
      pushHistory('Transform');
      const obj = getSelected();
      if (obj && obj.keyframes.length > 0 && !transformGizmo.object?.isBone) {
        obj.__pinned = true;
        toast('⏸ Pinned — scrub to re-attach to keys');
      }
      autoKeyIfOn('Transform');
    }
  });

  viewport.onR6LoadOk = () => {
    const statusEl = document.getElementById('status-overlay');
    if (statusEl) statusEl.classList.add('hide');
    // A file is being opened: don't spawn a blank default R6 on top of the saved character
    if (editorState.skipDefaultR6) return;
    try {
      const c = addR6Character('R6-1');
      setSelected(c.id);
      renderSceneList();
      pushHistory('Init');
      updateViewModeLabel();
      console.log('[RenderBlox] R6 loaded OK');
    } catch (err) {
      console.error('[RenderBlox] Failed to create R6:', err);
      toast(`⚠ R6 loaded but character creation failed: ${err.message}`);
    }
  };

  viewport.onR6LoadError = (err) => {
    const statusEl = document.getElementById('status-overlay');
    if (statusEl) statusEl.classList.add('hide');
    showModelError(err);
  };

  viewport.onCameraChange = () => {
    if (editorState.boneEditMode && editorState.selectedBone) {
      const obj = getSelected();
      if (obj) obj.__manualPose = true;
    }
  };

  initTimeline({
    timelineEl: document.getElementById('timeline'),
    rulerEl: document.getElementById('timeline-ruler'),
    tracksEl: document.getElementById('timeline-tracks'),
    playheadEl: document.getElementById('playhead'),
    snapLineEl: document.getElementById('snap-line')
  });
  timelineState.onTimeChanged = () => updatePlayhead();
  timelineState.onSelectionChanged = () => {};

  initMenuBar(buildMenuDefs());
  initModals();

  renderSceneList();
  renderProperties();
  renderAppearance();
  renderBones();
  renderCamera();
  fitTimelineToDuration();
  updateActiveCam();
  updateViewModeLabel();
  const initialQ = detectDefaultQuality();
  applyQuality(initialQ);
  document.querySelectorAll('#qualityChips .chip').forEach(c => {
    c.classList.toggle('on', c.dataset.q === initialQ);
  });

  wireTopbar();
  wireLeftPanel();
  wireRightPanel();
  wireBottombar();
  wireFileInputs();
  wireKeyboard();
  wireViewportEvents();
  wireResize();
  wireFrameGuide();
  wireExtras();

  setTimeout(() => {
    if (sceneState.objects.length > 0) fitCamera();
    renderTimeline();
    attachGizmo();
  }, 500);

  editorState.bootComplete = true;

  const pending = getPendingFile();
  if (pending) {
    editorState.skipDefaultR6 = true;
    setTimeout(async () => {
      try {
        const statusEl = document.getElementById('status-overlay');
        if (statusEl) {
          statusEl.textContent = `Loading ${pending.name}…`;
          statusEl.classList.remove('hide');
        }
        const result = await loadSceneZip(pending.file);
        if (statusEl) statusEl.classList.add('hide');
        fitTimelineToDuration();
        refreshAllPanels();
        attachGizmo();
        resetHistory();
        pushHistory('Load pending file');
        pushRecentFile({ name: pending.name, type: pending.type, size: pending.size });
        toast(`📂 Loaded ${pending.name} · ${result.objectsLoaded} objects`);
        if (result.warnings?.length) toast(`⚠ ${result.warnings.length} part(s) couldn't be restored — see console (F12)`);
      } catch (err) {
        console.error('Failed to load pending file:', err);
        if (sceneState.objects.length === 0 && viewport.r6Template) {
          try { const c = addR6Character('R6-1'); setSelected(c.id); } catch (e2) { console.warn(e2); }
        }
        toast(`❌ Could not open ${pending.name}: ${err.message}`);
        const statusEl = document.getElementById('status-overlay');
        if (statusEl) statusEl.classList.add('hide');
      }
    }, 800);
  }

  startRenderLoop();
}

function showModelError(err) {
  const overlay = document.getElementById('model-error-overlay');
  if (!overlay) { toast(`❌ ${err.hint || err.message}`); return; }
  const details = document.getElementById('model-error-details');
  const hint = document.getElementById('model-error-hint');
  if (details) {
    details.innerHTML = `
      <div><b>Type:</b> <span class="val">${escapeHtml(err.type || 'unknown')}</span></div>
      <div><b>URL:</b> <span class="val">${escapeHtml(err.url || 'models/r6.glb')}</span></div>
      ${err.status ? `<div><b>HTTP Status:</b> <span class="val">${err.status}</span></div>` : ''}
      <div><b>Message:</b> <span class="val">${escapeHtml(err.message || 'Unknown')}</span></div>
    `;
  }
  if (hint) hint.textContent = err.hint || '';
  overlay.classList.add('on');
  document.getElementById('model-error-retry')?.addEventListener('click', () => {
    overlay.classList.remove('on');
    loadR6Template();
  });
  document.getElementById('model-error-dismiss')?.addEventListener('click', () => {
    overlay.classList.remove('on');
  });
}

function snapshotScene() {
  return {
    selectedId: sceneState.selectedId,
    duration: sceneState.duration,
    camKeyframes: JSON.parse(JSON.stringify(sceneState.camKeyframes)),
    objects: sceneState.objects.map(o => ({
      id: o.id,
      type: o.type,
      name: o.name,
      primType: o.primType,
      pos: [o.root.position.x, o.root.position.y, o.root.position.z],
      quat: [o.root.quaternion.x, o.root.quaternion.y, o.root.quaternion.z, o.root.quaternion.w],
      scale: [o.root.scale.x, o.root.scale.y, o.root.scale.z],
      visible: o.root.visible,
      currentAction: o.currentAction,
      color: o.color,
      intensity: o.intensity,
      keyframes: JSON.parse(JSON.stringify(o.keyframes || [])),
      lookKeys: JSON.parse(JSON.stringify(o.lookKeys || [])),
      faceKey: o.faceKey || null,
      assetId: o.assetId,
      meshStates: (o.meshes || []).map(m => {
        const mats = getMats(m.mesh);
        return {
          name: m.name,
          visible: m.mesh.visible,
          color: mats[0]?.color ? [mats[0].color.r, mats[0].color.g, mats[0].color.b] : null,
          opacity: mats[0] ? mats[0].opacity : 1,
          glow: mats[0]?.userData?.__glow || 0,
          textureAssetId: m.mesh.userData.textureAssetId || null
        };
      })
    }))
  };
}

function pushHistory(label) {
  const h = editorState.history;
  h.stack = h.stack.slice(0, h.index + 1);
  h.stack.push({ label, snap: snapshotScene() });
  h.index = h.stack.length - 1;
  if (h.stack.length > h.maxSize) { h.stack.shift(); h.index--; }
  updateHistoryButtons();
}

function undo() {
  const h = editorState.history;
  if (h.index <= 0) return toast('Nothing to undo');
  h.index--;
  restoreSnapshot(h.stack[h.index].snap);
  updateHistoryButtons();
  toast('↶ Undo');
}

function redo() {
  const h = editorState.history;
  if (h.index >= h.stack.length - 1) return toast('Nothing to redo');
  h.index++;
  restoreSnapshot(h.stack[h.index].snap);
  updateHistoryButtons();
  toast('↷ Redo');
}

function restoreSnapshot(snap) {
  // Bring back objects that were deleted (and drop ones added after this snapshot)
  const want = snap.objects.map(od => od.id);
  const present = new Map(sceneState.objects.map(o => [o.id, o]));
  const next = [];
  want.forEach(id => { const o = present.get(id) || graveyard.get(id); if (o) next.push(o); });
  sceneState.objects.forEach(o => {
    if (!want.includes(o.id)) { if (o.root.parent) viewport.scene.remove(o.root); graveyard.set(o.id, o); }
  });
  next.forEach(o => { if (!o.root.parent) viewport.scene.add(o.root); });
  sceneState.objects = next;

  snap.objects.forEach(od => {
    const obj = getObjectById(od.id);
    if (!obj) return;
    obj.name = od.name;
    obj.root.position.set(...od.pos);
    obj.root.quaternion.set(...od.quat);
    if (Array.isArray(od.scale)) obj.root.scale.set(...od.scale);
    else obj.root.scale.setScalar(od.scale);
    obj.root.visible = od.visible !== false;
    obj.currentAction = od.currentAction || obj.currentAction;
    obj.keyframes = JSON.parse(JSON.stringify(od.keyframes || []));
    obj.lookKeys = JSON.parse(JSON.stringify(od.lookKeys || []));
    if (od.meshStates && obj.meshes) {
      od.meshStates.forEach((ms, i) => {
        const m = obj.meshes[i];
        if (!m) return;
        m.mesh.visible = ms.visible !== false;
        getMats(m.mesh).forEach(mat => {
          if (ms.color && mat.color) mat.color.setRGB(...ms.color);
          if (ms.opacity != null) { mat.opacity = ms.opacity; const t = ms.opacity < 0.999; if (mat.transparent !== t) { mat.transparent = t; mat.needsUpdate = true; } }
          if (mat.emissive && (ms.glow || mat.userData.__glow)) {
            mat.userData.__glow = ms.glow || 0; mat.emissiveIntensity = ms.glow || 0;
            if (ms.glow) mat.emissive.copy(mat.color); else mat.emissive.setRGB(0, 0, 0);
          }
        });
      });
    }
    if (obj.type === 'r6' && (obj.faceKey || null) !== (od.faceKey || null)) setFaceByKey(obj, od.faceKey || 'default');
  });
  sceneState.selectedId = (snap.selectedId != null && getObjectById(snap.selectedId)) ? snap.selectedId : (sceneState.objects[0]?.id ?? null);
  sceneState.duration = snap.duration;
  sceneState.camKeyframes = JSON.parse(JSON.stringify(snap.camKeyframes));
  const durIn = document.getElementById('duration-input');
  if (durIn) durIn.value = snap.duration;
  fitTimelineToDuration();
  refreshAllPanels();
  attachGizmo();
  const vSel = document.getElementById('vSel');
  if (vSel) vSel.textContent = getSelected()?.name || '—';
}

function resetHistory() {
  editorState.history.stack = [];
  editorState.history.index = -1;
  graveyard.clear();
}

function updateHistoryButtons() {
  const h = editorState.history;
  const undoBtn = document.getElementById('btnUndo');
  const redoBtn = document.getElementById('btnRedo');
  if (undoBtn) undoBtn.disabled = h.index <= 0;
  if (redoBtn) redoBtn.disabled = h.index >= h.stack.length - 1;
}

function attachGizmo() {
  if (editorState.boneEditMode && editorState.selectedBone && isInScene(editorState.selectedBone)) {
    if (viewport.transformGizmo.object !== editorState.selectedBone) {
      attachGizmoTo(editorState.selectedBone);
    }
    return;
  }
  const obj = getSelected();
  if (obj && isInScene(obj.root)) {
    if (viewport.transformGizmo.object !== obj.root) {
      attachGizmoTo(obj.root);
    }
  } else {
    detachGizmo();
  }
}

function isInScene(object3D) {
  let p = object3D;
  while (p) { if (p === viewport.scene) return true; p = p.parent; }
  return false;
}

function setGizmoMode(mode) {
  editorState.gizmoMode = mode;
  viewport.transformGizmo.setMode(mode);
  document.getElementById('btnModeMove')?.classList.toggle('on', mode === 'translate');
  document.getElementById('btnModeRotate')?.classList.toggle('on', mode === 'rotate');
  document.getElementById('btnModeScale')?.classList.toggle('on', mode === 'scale');
}

function updateActiveCam() {
  let cam;
  if (editorState.fpvMode) cam = viewport.sceneCam;
  else if (editorState.exporting) cam = viewport.sceneCam;
  else if (editorState.camPreviewMode === 'editor') cam = viewport.editorCam;
  else if (editorState.camPreviewMode === 'scene') cam = viewport.sceneCam;
  else cam = sceneState.camKeyframes.length > 0 ? viewport.sceneCam : viewport.editorCam;
  setActiveCamera(cam);
  viewport.controls.enabled = (cam === viewport.editorCam) && !editorState.fpvMode && !viewport.transformGizmo.dragging;
  window.__renderbloxCamPreviewMode = editorState.camPreviewMode;
}

function updateViewModeLabel() {
  let txt = 'Editor';
  if (editorState.exporting) txt = 'Export';
  else if (editorState.fpvMode) txt = walkSetup.active ? 'Walk Setup' : 'FPV';
  else if (editorState.boneEditMode) txt = 'Bone Edit';
  else if (editorState.camPreviewMode === 'editor') txt = 'Editor (forced)';
  else if (editorState.camPreviewMode === 'scene') txt = 'Scene Cam (forced)';
  else txt = sceneState.camKeyframes.length > 0 ? 'Scene Cam (auto)' : 'Editor (auto)';
  const vMode = document.getElementById('vMode');
  if (vMode) vMode.textContent = txt;
}

function setCamPreviewMode(mode) {
  editorState.camPreviewMode = mode;
  updateActiveCam();
  updateViewModeLabel();
  renderCamera();
  toast(`Preview: ${mode.toUpperCase()}`);
}

function addCameraKeyframe() {
  const kf = {
    time: sceneState.time,
    pos: [viewport.sceneCam.position.x, viewport.sceneCam.position.y, viewport.sceneCam.position.z],
    quat: [viewport.sceneCam.quaternion.x, viewport.sceneCam.quaternion.y, viewport.sceneCam.quaternion.z, viewport.sceneCam.quaternion.w],
    fov: viewport.sceneCam.fov
  };
  const i = sceneState.camKeyframes.findIndex(k => Math.abs(k.time - sceneState.time) < 0.02);
  if (i >= 0) sceneState.camKeyframes[i] = kf;
  else sceneState.camKeyframes.push(kf);
  sceneState.camKeyframes.sort((a, b) => a.time - b.time);
  renderTimeline();
  renderCamera();
  pushHistory('Camera Keyframe');
  updateActiveCam();
  updateViewModeLabel();
  toast(`◈ Camera key @ ${sceneState.time.toFixed(2)}s`);
}

function applyCameraAtTime(t) {
  if (editorState.fpvMode) return;
  if (viewport.transformGizmo.dragging) return;
  const kf = interpolateCamera(t);
  if (!kf) return;
  viewport.sceneCam.position.set(...kf.pos);
  viewport.sceneCam.quaternion.set(...kf.quat);
  if (viewport.sceneCam.fov !== kf.fov) {
    viewport.sceneCam.fov = kf.fov;
    viewport.sceneCam.updateProjectionMatrix();
  }
  updateCamHelper();
}

function toggleBoneMode() {
  editorState.boneEditMode = !editorState.boneEditMode;
  window.__renderbloxBoneMode = editorState.boneEditMode;
  document.getElementById('btnBoneMode')?.classList.toggle('on', editorState.boneEditMode);
  document.getElementById('viewport')?.classList.toggle('bone', editorState.boneEditMode);
  document.getElementById('bone-banner')?.classList.toggle('on', editorState.boneEditMode);
  if (!editorState.boneEditMode) {
    editorState.selectedBone = null;
    window.__renderbloxSelectedBone = null;
    const vBone = document.getElementById('vBone');
    if (vBone) vBone.style.display = 'none';
    setGizmoMode('translate');
    const obj = getSelected();
    // Keep the pose when leaving bone mode — user can K to key it or Ctrl+Z to revert
    if (obj) { obj.__manualPose = true; obj.__boneManual = true; }
  } else {
    setGizmoMode('rotate');
    updateSkeletonOverlay();
    toast('🦴 Bone mode — click a body part');
  }
  attachGizmo();
  renderBones();
  updateViewModeLabel();
}

function selectBone(bone) {
  editorState.selectedBone = bone;
  window.__renderbloxSelectedBone = bone;
  editorState.boneEditMode = true;
  window.__renderbloxBoneMode = true;
  const obj = getSelected();
  if (obj) { obj.__pinned = false; obj.__manualPose = true; obj.__boneManual = true; }
  document.getElementById('btnBoneMode')?.classList.add('on');
  document.getElementById('viewport')?.classList.add('bone');
  document.getElementById('bone-banner')?.classList.add('on');
  const vBone = document.getElementById('vBone');
  if (vBone) vBone.style.display = '';
  const vBoneName = document.getElementById('vBoneName');
  if (vBoneName) vBoneName.textContent = bone.name;
  viewport.transformGizmo.camera = viewport.activeCam;
  viewport.transformGizmo.detach();
  viewport.transformGizmo.attach(bone);
  viewport.transformGizmo.setMode('rotate');
  viewport.transformGizmo.visible = true;
  setGizmoMode('rotate');
  renderProperties();
  renderBones();
  toast(`🦴 ${bone.name}`);
}

let skeletonOverlay = null;
function updateSkeletonOverlay() {
  const obj = getSelected();
  const want = editorState.boneEditMode && obj && obj.type === 'r6';
  if (!want) {
    if (skeletonOverlay) { viewport.scene.remove(skeletonOverlay); skeletonOverlay = null; }
    return;
  }
  const pts = [];
  for (const n in obj.bones) {
    const bone = obj.bones[n].obj;
    if (bone.parent && bone.parent.isBone) {
      const a = new THREE.Vector3(), b = new THREE.Vector3();
      bone.getWorldPosition(a); bone.parent.getWorldPosition(b);
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  if (!skeletonOverlay) {
    const mat = new THREE.LineBasicMaterial({ color: 0xffcc44, depthTest: false, transparent: true, opacity: 0.9 });
    skeletonOverlay = new THREE.LineSegments(new THREE.BufferGeometry(), mat);
    skeletonOverlay.renderOrder = 999;
    skeletonOverlay.frustumCulled = false;
    viewport.scene.add(skeletonOverlay);
  }
  skeletonOverlay.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  skeletonOverlay.geometry.attributes.position.needsUpdate = true;
  exportContext.skeletonOverlay = skeletonOverlay;
}

function pickBone(mouseX, mouseY) {
  const obj = getSelected();
  if (!obj || obj.type !== 'r6') return null;
  const rect = viewport.renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((mouseX - rect.left) / rect.width) * 2 - 1,
    -((mouseY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, viewport.activeCam);
  const hits = raycaster.intersectObject(obj.root, true);
  if (!hits.length) return null;
  const hit = hits[0].point;
  let best = null, bd = Infinity;
  for (const n in obj.bones) {
    const bw = new THREE.Vector3();
    obj.bones[n].obj.getWorldPosition(bw);
    const d = bw.distanceToSquared(hit);
    if (d < bd) { bd = d; best = obj.bones[n].obj; }
  }
  return best;
}

function enterFPV() {
  editorState.fpvMode = true;
  document.getElementById('viewport')?.classList.add('fpv');
  document.getElementById('crosshair')?.classList.add('on');
  document.getElementById('fpv-banner')?.classList.add('on');
  document.getElementById('btnFPV')?.classList.add('on');
  if (sceneState.camKeyframes.length === 0) {
    viewport.sceneCam.position.copy(viewport.editorCam.position);
    viewport.sceneCam.quaternion.copy(viewport.editorCam.quaternion);
  }
  const dir = new THREE.Vector3();
  viewport.sceneCam.getWorldDirection(dir);
  editorState.fpv.yaw = Math.atan2(-dir.x, -dir.z);
  editorState.fpv.pitch = Math.asin(dir.y);
  updateActiveCam();
  updateViewModeLabel();
  updateFpvKeysHud();
  toast('🎥 FPV Mode');
}

function exitFPV() {
  editorState.fpvMode = false;
  document.getElementById('viewport')?.classList.remove('fpv');
  document.getElementById('crosshair')?.classList.remove('on');
  document.getElementById('fpv-banner')?.classList.remove('on');
  document.getElementById('btnFPV')?.classList.remove('on');
  if (document.pointerLockElement) document.exitPointerLock();
  updateActiveCam();
  updateViewModeLabel();
  updateFpvKeysHud();
}

function toggleFPV() { if (editorState.fpvMode) exitFPV(); else enterFPV(); }

function updateFpvKeysHud() {
  const hud = document.getElementById('fpv-keys-hud');
  if (!hud) return;
  if (editorState.fpvMode) {
    hud.classList.add('on');
    const extra = document.getElementById('fpv-keys-extra');
    if (extra) extra.style.display = walkSetup.active ? '' : 'none';
  } else {
    hud.classList.remove('on');
  }
}

function startWalkSetup(obj) {
  if (!obj || obj.type !== 'r6') return toast('Select an R6 first');
  if (walkSetup.active) return toast('Walk setup already active');
  const startPos = obj.root.position.clone();
  const startQuat = obj.root.quaternion.clone();
  let headPos = startPos.clone(); headPos.y += 3.6;
  const headBone = findHeadBone(obj);
  if (headBone) { const wp = new THREE.Vector3(); headBone.getWorldPosition(wp); headPos.copy(wp); }
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(startQuat).normalize();
  viewport.sceneCam.position.copy(headPos);
  viewport.sceneCam.lookAt(headPos.clone().add(forward.multiplyScalar(5)));
  const dir = new THREE.Vector3();
  viewport.sceneCam.getWorldDirection(dir);
  editorState.fpv.yaw = Math.atan2(-dir.x, -dir.z);
  editorState.fpv.pitch = Math.asin(dir.y);
  obj.__pinned = true;
  walkSetup.active = true;
  walkSetup.objId = obj.id;
  walkSetup.startPos = [startPos.x, startPos.y, startPos.z];
  walkSetup.startQuat = [startQuat.x, startQuat.y, startQuat.z, startQuat.w];
  enterFPV();
  const banner = document.getElementById('fpv-banner');
  if (banner) {
    banner.textContent = '🚶 WALK SETUP · Fly to destination · Enter to confirm · K to drop a camera key · Esc to cancel';
    banner.style.background = 'var(--green)';
  }
  updateViewModeLabel();
  updateFpvKeysHud();
  toast('🎯 Walk setup — Enter to confirm, K for camera key');
}

function cancelWalkSetup() {
  if (!walkSetup.active) return;
  const obj = getObjectById(walkSetup.objId);
  if (obj && walkSetup.startPos) {
    obj.root.position.set(...walkSetup.startPos);
    obj.root.quaternion.set(...walkSetup.startQuat);
    obj.__pinned = false;
  }
  walkSetup.active = false;
  walkSetup.objId = null;
  walkSetup.startPos = null;
  walkSetup.startQuat = null;
  const banner = document.getElementById('fpv-banner');
  if (banner) {
    banner.textContent = 'FPV MODE · WASD + Scroll to fly · Click to lock mouse';
    banner.style.background = 'var(--cam)';
  }
  exitFPV();
  updateViewModeLabel();
  updateFpvKeysHud();
  toast('Walk setup cancelled');
}

function promptWalkDuration() {
  if (!walkSetup.active) return;
  const obj = getObjectById(walkSetup.objId);
  if (!obj) { cancelWalkSetup(); return; }
  const endPos = viewport.sceneCam.position.clone();
  endPos.y = walkSetup.startPos[1];
  const camDir = new THREE.Vector3();
  viewport.sceneCam.getWorldDirection(camDir);
  camDir.y = 0;
  camDir.normalize();
  const endYaw = Math.atan2(camDir.x, camDir.z);
  walkSetup.endPos = [endPos.x, endPos.y, endPos.z];
  walkSetup.endYaw = endYaw;
  const back = document.getElementById('walkdur-backdrop');
  const inp = document.getElementById('walkdur-input');
  if (inp) inp.value = '2.0';
  if (back) back.classList.add('show');
  setTimeout(() => { inp?.focus(); inp?.select(); }, 60);
  if (document.pointerLockElement) document.exitPointerLock();
  const ok = () => {
    back?.classList.remove('show');
    const secs = parseFloat(inp?.value || '2');
    if (!secs || secs <= 0 || secs > 60) { toast('Invalid duration'); return; }
    finalizeWalk(secs);
  };
  const cancel = () => { back?.classList.remove('show'); cancelWalkSetup(); };
  document.getElementById('walkdur-ok').onclick = ok;
  document.getElementById('walkdur-cancel').onclick = cancel;
  if (inp) {
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); ok(); }
      if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    };
  }
}

function finalizeWalk(secs) {
  const obj = getObjectById(walkSetup.objId);
  if (!obj) { cancelWalkSetup(); return; }
  const banner = document.getElementById('fpv-banner');
  if (banner) {
    banner.textContent = 'FPV MODE · WASD + Scroll to fly · Click to lock mouse';
    banner.style.background = 'var(--cam)';
  }
  exitFPV();
  bakeWalkFromTo(obj, walkSetup.startPos, walkSetup.endPos, walkSetup.endYaw, secs, sceneState.time);
  walkSetup.active = false;
  walkSetup.objId = null;
  walkSetup.startPos = null;
  walkSetup.startQuat = null;
  walkSetup.endPos = null;
  obj.__pinned = false;
  updateViewModeLabel();
  updateFpvKeysHud();
  renderTimeline();
  renderProperties();
  renderBones();
  renderSceneList();
  pushHistory('Bake Walk');
  toast(`🚶 Walk baked · ${secs}s`);
}

function addLookKey() {
  const obj = getSelected();
  if (!obj || !obj.meshes?.length) return toast('Select an object with parts first');
  writeLookKeyAt(obj, sceneState.time);
  sceneState.mode = 'keyframe';
  renderTimeline();
  renderAppearance();
  pushHistory('Add Look Key');
  toast(`◉ Look key @ ${sceneState.time.toFixed(2)}s`);
}

// Called by the Appearance panel whenever colours/parts are edited by hand
function lookEdited(obj) {
  if (!obj) return;
  if (obj.lookKeys && obj.lookKeys.length) obj.__lookPinned = true; // stop keys from snapping the edit back
  if (editorState.autoKey && obj.meshes?.length) {
    writeLookKeyAt(obj, sceneState.time);
    sceneState.mode = 'keyframe';
    renderTimeline();
  }
}

function autoKeyIfOn(_label) {
  if (!editorState.autoKey) return;
  const obj = getSelected();
  if (!obj) return;
  writeKeyframeAt(obj, sceneState.time);
  renderTimeline();
}

import {
  FACE_DEFAULTS, faceHooks, ensureFaceTexture, facePreview, collectFaceKeys, setFaceByKey,
  createFaceDecal, updateFaceDecal, removeFaceDecal, prepareAllFaces, myFaceAssetId,
  addUploadedFace, myFaceKeys, deleteMyFace
} from './face-system.js';


function fitCamera() {
  const box = new THREE.Box3();
  if (sceneState.objects.length === 0) {
    box.setFromCenterAndSize(new THREE.Vector3(0, 2, 0), new THREE.Vector3(10, 5, 10));
  } else {
    sceneState.objects.forEach(o => box.expandByObject(o.root));
  }
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const d = Math.max(size.x, size.y, size.z) * 2.2;
  viewport.editorCam.position.set(center.x + d * 0.55, center.y + size.y * 0.5, center.z + d);
  viewport.controls.target.copy(center);
  viewport.controls.update();
}

function setCamera(view) {
  const box = new THREE.Box3();
  if (sceneState.objects.length === 0) {
    box.setFromCenterAndSize(new THREE.Vector3(0, 2, 0), new THREE.Vector3(10, 5, 10));
  } else {
    sceneState.objects.forEach(o => box.expandByObject(o.root));
  }
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const d = Math.max(size.x, size.y, size.z) * 2.2;
  if (view === 'front') viewport.editorCam.position.set(center.x, center.y + size.y * 0.35, center.z + d);
  if (view === 'side') viewport.editorCam.position.set(center.x + d, center.y + size.y * 0.35, center.z);
  if (view === 'threeq') viewport.editorCam.position.set(center.x + d * 0.6, center.y + size.y * 0.5, center.z + d * 0.7);
  if (view === 'top') viewport.editorCam.position.set(center.x, center.y + d, center.z + 0.01);
  if (view === 'fit') { fitCamera(); return; }
  viewport.controls.target.copy(center);
  viewport.controls.update();
}


function promptAddCharacter() {
  const back = document.getElementById('char-gender-backdrop');
  if (!back) { addR6Character('R6-1', 'male'); return; }

  back.style.display = 'flex';
  
  const cleanup = () => {
    back.style.display = 'none';
    document.getElementById('btn-gender-male').onclick = null;
    document.getElementById('btn-gender-female').onclick = null;
    document.getElementById('btn-gender-cancel').onclick = null;
  };

  document.getElementById('btn-gender-male').onclick = () => {
    cleanup();
    const n = sceneState.objects.filter(o => o.type === 'r6').length + 1;
    const obj = addR6Character('R6-' + n, 'male');
    setSelected(obj.id);
    pushHistory('Add R6');
  };

  document.getElementById('btn-gender-female').onclick = async () => {
    cleanup();
    const btn = document.getElementById('btnAddR6');
    const orig = btn.innerHTML;
    btn.innerHTML = '<span class="ico">⏳</span>Loading…';
    try {
      const tpl = await loadR6GirlTemplate();
      if (!tpl) throw new Error('Failed to load female model');
      window.__renderbloxSceneGirlTemplate = tpl;
      const n = sceneState.objects.filter(o => o.type === 'r6').length + 1;
      const obj = addR6Character('Girl-' + n, 'female');
      setSelected(obj.id);
      pushHistory('Add Girl');
    } catch (err) {
      console.error(err);
      toast('❌ Could not load female model: ' + err.message);
    } finally {
      btn.innerHTML = orig;
    }
  };

  document.getElementById('btn-gender-cancel').onclick = () => cleanup();
}

function wireTopbar() {
  document.getElementById('btnAddR6')?.addEventListener('click', promptAddCharacter);
  document.getElementById('btnImport')?.addEventListener('click', () => {
    document.getElementById('fileInput')?.click();
  });
  document.getElementById('btnAddLight')?.addEventListener('click', () => {
    const l = addLight();
    l.name = 'Light ' + (sceneState.objects.filter(o => o.type === 'light').length + 1);
    l.root.position.set(sceneState.objects.length * 1.5, 6, 0);
    setSelected(l.id);
    pushHistory('Add Light');
  });
  document.getElementById('btnModeMove')?.addEventListener('click', () => setGizmoMode('translate'));
  document.getElementById('btnModeRotate')?.addEventListener('click', () => setGizmoMode('rotate'));
  document.getElementById('btnModeScale')?.addEventListener('click', () => setGizmoMode('scale'));
  document.getElementById('btnBoneMode')?.addEventListener('click', toggleBoneMode);
  document.getElementById('btnFPV')?.addEventListener('click', toggleFPV);
  document.getElementById('btnCamKey')?.addEventListener('click', addCameraKeyframe);
  document.getElementById('btnCamPreview')?.addEventListener('click', () => {
    const modes = ['auto', 'scene', 'editor'];
    const i = modes.indexOf(editorState.camPreviewMode);
    setCamPreviewMode(modes[(i + 1) % modes.length]);
  });
  document.getElementById('btnUndo')?.addEventListener('click', undo);
  document.getElementById('btnRedo')?.addEventListener('click', redo);
  document.getElementById('btnExport')?.addEventListener('click', () => {
    if (editorState.exporting) { cancelExport(); return; }
    exportVideo();
  });
  document.getElementById('btnSettings')?.addEventListener('click', showSettingsModal);
  document.getElementById('btnSave')?.addEventListener('click', () => {
    saveSceneZip().then(({ filename }) => {
      pushRecentFile({ name: filename, type: 'rdbx', size: 0 });
      toast(`💾 Saved ${filename}`);
    }).catch((err) => {
      console.error(err);
      toast(`❌ Save failed: ${err.message}`);
    });
  });
  document.getElementById('btnLoad')?.addEventListener('click', () => {
    document.getElementById('fileInputRdbx')?.click();
  });
  document.getElementById('btnTheme')?.addEventListener('click', () => {
    const isDark = toggleTheme();
    const btn = document.getElementById('btnTheme');
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
  });
  if (document.body.classList.contains('dark')) {
    const btn = document.getElementById('btnTheme');
    if (btn) btn.textContent = '☀️';
  }
}

function wireLeftPanel() {
  document.querySelectorAll('.prim-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const o = addPrimitive(btn.dataset.prim);
      setSelected(o.id);
      pushHistory(`Add ${btn.dataset.prim}`);
    });
  });
  document.querySelectorAll('.cam-btn').forEach(btn => {
    btn.addEventListener('click', () => setCamera(btn.dataset.cam));
  });
  document.getElementById('btnSelectAll')?.addEventListener('click', () => {
    if (sceneState.objects.length === 0) return;
    let i = sceneState.objects.findIndex(o => o.id === sceneState.selectedId);
    i = (i + 1) % sceneState.objects.length;
    setSelected(sceneState.objects[i].id);
    attachGizmo();
  });
  document.getElementById('btnClearAll')?.addEventListener('click', () => {
    if (sceneState.objects.length === 0) return;
    if (!confirm(`Delete all ${sceneState.objects.length} objects?`)) return;
    clearAllObjects();
    pushHistory('Clear Scene');
  });
  document.querySelectorAll('#qualityChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      applyQuality(chip.dataset.q);
      document.querySelectorAll('#qualityChips .chip').forEach(c => {
        c.classList.toggle('on', c.dataset.q === chip.dataset.q);
      });
    });
  });
  document.getElementById('worldInt')?.addEventListener('input', (e) => {
    viewport.sun.intensity = parseFloat(e.target.value);
    const v = document.getElementById('worldIntv');
    if (v) v.textContent = viewport.sun.intensity.toFixed(2);
  });
  document.getElementById('worldColor')?.addEventListener('input', (e) => {
    viewport.sun.color.set(e.target.value);
  });
  document.getElementById('ambInt')?.addEventListener('input', (e) => {
    if (viewport.amb) viewport.amb.intensity = parseFloat(e.target.value);
    const v = document.getElementById('ambIntv');
    if (v) v.textContent = parseFloat(e.target.value).toFixed(2);
  });
}

function wireRightPanel() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
      tab.classList.add('on');
      editorState.activeTab = tab.dataset.tab;
      const key = { props: 'propContent', appear: 'appearContent', camera: 'camContent', bones: 'boneContent' };
      ['propContent', 'appearContent', 'camContent', 'boneContent'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === key[editorState.activeTab]) ? 'block' : 'none';
      });
    });
  });
}

function wireBottombar() {
  document.getElementById('btnJumpStart')?.addEventListener('click', () => {
    sceneState.time = 0; updatePlayhead(); applyCameraAtTime(0); renderTimeline();
  });
  document.getElementById('btnJumpEnd')?.addEventListener('click', () => {
    sceneState.time = sceneState.duration; updatePlayhead(); applyCameraAtTime(sceneState.duration); renderTimeline();
  });
  document.getElementById('btnStepBack')?.addEventListener('click', () => {
    sceneState.time = Math.max(0, sceneState.time - 1/60); updatePlayhead(); applyCameraAtTime(sceneState.time); renderTimeline();
  });
  document.getElementById('btnStepFwd')?.addEventListener('click', () => {
    sceneState.time = Math.min(sceneState.duration, sceneState.time + 1/60); updatePlayhead(); applyCameraAtTime(sceneState.time); renderTimeline();
  });
  document.getElementById('btnPlay')?.addEventListener('click', togglePlay);
  document.getElementById('btnLoop')?.addEventListener('click', () => {
    sceneState.loopPlayback = !sceneState.loopPlayback;
    document.getElementById('btnLoop')?.classList.toggle('on', sceneState.loopPlayback);
  });
  const loopBtn = document.getElementById('btnLoop');
  if (loopBtn) loopBtn.classList.toggle('on', sceneState.loopPlayback);
  document.getElementById('speedSlider')?.addEventListener('input', (e) => {
    sceneState.playbackSpeed = parseFloat(e.target.value);
    const lbl = document.getElementById('speedLabel');
    if (lbl) lbl.textContent = sceneState.playbackSpeed.toFixed(2) + '×';
  });
  document.getElementById('duration-input')?.addEventListener('change', (e) => {
    sceneState.duration = Math.max(1, parseFloat(e.target.value) || 10);
    fitTimelineToDuration();
    pushHistory('Change Duration');
  });
  document.getElementById('timeDisplay')?.addEventListener('change', (e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) {
      sceneState.time = Math.max(0, Math.min(sceneState.duration, v));
      updatePlayhead();
      applyCameraAtTime(sceneState.time);
    }
  });
  const speedSlider = document.getElementById('speedSlider');
  if (speedSlider) speedSlider.value = String(sceneState.playbackSpeed);
}

function togglePlay() {
  sceneState.objects.forEach(o => { o.__pinned = false; o.__manualPose = false; o.__lookPinned = false; });
  sceneState.playing = !sceneState.playing;
  const playBtn = document.getElementById('btnPlay');
  if (playBtn) {
    playBtn.textContent = sceneState.playing ? '⏸' : '▶';
    playBtn.classList.toggle('on', sceneState.playing);
  }
  if (sceneState.playing) {
    if (sceneState.time >= sceneState.duration) sceneState.time = 0;
    updateActiveCam();
    updateViewModeLabel();
  }
}

function wireFileInputs() {
  document.getElementById('fileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const mode = file.name.match(/\.obj$/i) ? 'model' : await askImportMode(file);
    if (!mode) return;
    try {
      const root = await loadModelRootFromFile(file);
      if (!root) { toast('Failed to load model'); return; }
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const h = box.getSize(new THREE.Vector3()).y;
      if (h > 30 || h < 0.3) root.scale.setScalar(5 / h);
      root.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(root);
      const c = box2.getCenter(new THREE.Vector3());
      root.position.set(-c.x, -box2.min.y, -c.z);
      const assetId = assetStore.register(file.name.match(/\.obj$/i) ? 'obj' : 'glb', file.name, await file.arrayBuffer());
      let obj;
      if (mode === 'character') {
        obj = buildCharacter(root, file.name.replace(/\.[^.]+$/, ''));
        obj.assetId = assetId;
      } else {
        obj = addModelFromRoot(root, file.name.replace(/\.[^.]+$/, ''), assetId);
      }
      setSelected(obj.id);
      pushHistory('Import Model');
      toast(`Imported "${obj.name}" as ${mode}`);
    } catch (err) {
      console.error(err);
      toast(`❌ Import failed: ${err.message}`);
    }
  });

  document.getElementById('fileInputAttach')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const targetObj = getObjectById(parseInt(e.target.dataset.targetObj));
    e.target.value = '';
    if (!targetObj) return;
    try {
      const root = await loadModelRootFromFile(file);
      if (!root) { toast('Failed to load attachment'); return; }
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0.001) root.scale.setScalar(1.5 / maxDim);
      root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const hb = findHeadBone(targetObj);
      if (hb) { hb.add(root); root.position.set(0, 1.8, 0); }
      else { targetObj.root.add(root); root.position.set(0, 3, 0); }
      const assetId = assetStore.register(file.name.match(/\.obj$/i) ? 'obj' : 'glb', file.name, await file.arrayBuffer());
      targetObj.attachments.push({ name: file.name, mesh: root, assetId });
      renderAppearance();
      pushHistory('Import Attachment');
    } catch (err) {
      console.error(err);
      toast(`❌ Import failed: ${err.message}`);
    }
  });

  document.getElementById('fileInputTexture')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const targetObj = getObjectById(parseInt(e.target.dataset.targetObj));
    const meshIdx = parseInt(e.target.dataset.meshIdx);
    e.target.value = '';
    if (!targetObj || isNaN(meshIdx) || meshIdx < 0) return;
    const entry = targetObj.meshes[meshIdx];
    if (!entry) return;
    try {
      const bytes = await file.arrayBuffer();
      const assetId = assetStore.register('texture', file.name, bytes);
      const tex = await loadTextureFromArrayBuffer(bytes);
      if (!tex) { toast('Could not read texture'); return; }
      setMeshMap(entry.mesh, tex);
      entry.mesh.userData.textureAssetId = assetId;
      pushHistory('Apply Texture');
      renderAppearance();
      toast(`Texture applied to ${prettyMeshName(entry.name)}`);
    } catch (err) {
      console.error(err);
      toast(`❌ Texture failed: ${err.message}`);
    }
  });

  document.getElementById('fileInputFace')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const targetObj = getObjectById(parseInt(e.target.dataset.targetObj));
    e.target.value = '';
    if (!targetObj) return;
    try {
      const key = await addUploadedFace(file);
      if (!key) { toast('Could not read image'); return; }
      await ensureFaceTexture(key);
      setFaceByKey(targetObj, key);
      lookEdited(targetObj);
      pushHistory('Face');
      renderAppearance();
      toast('Face applied · saved to My Faces');
    } catch (err) {
      console.error(err);
      toast(`❌ Face failed: ${err.message}`);
    }
  });

  document.getElementById('fileInputRdbx')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    try {
      const statusEl = document.getElementById('status-overlay');
      if (statusEl) { statusEl.textContent = 'Loading scene…'; statusEl.classList.remove('hide'); }
      const result = await loadSceneZip(file);
      if (statusEl) statusEl.classList.add('hide');
      fitTimelineToDuration();
      refreshAllPanels();
      attachGizmo();
      resetHistory();
      pushHistory('Load .rdbx');
      pushRecentFile({ name: file.name, type: 'rdbx', size: file.size });
      toast(`📂 Loaded ${file.name} · ${result.objectsLoaded} objects`);
      if (result.warnings?.length) toast(`⚠ ${result.warnings.length} part(s) couldn't be restored — see console (F12)`);
    } catch (err) {
      console.error(err);
      toast(`❌ Load failed: ${err.message}`);
      const statusEl = document.getElementById('status-overlay');
      if (statusEl) statusEl.classList.add('hide');
    }
  });

  document.getElementById('fileInputRx6')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    try {
      const statusEl = document.getElementById('status-overlay');
      if (statusEl) { statusEl.textContent = `Importing ${file.name}…`; statusEl.classList.remove('hide'); }
      const obj = await loadRx6IntoScene(file);
      if (statusEl) statusEl.classList.add('hide');
      if (obj) {
        setSelected(obj.id);
        refreshAllPanels();
        fitTimelineToDuration();
        attachGizmo();
        pushHistory(`Import ${file.name}`);
        toast(`📂 Imported character "${obj.name}"`);
      } else {
        toast('⚠ Import completed but no character was added');
      }
    } catch (err) {
      console.error(err);
      toast(`❌ Import failed: ${err.message}`);
      const statusEl = document.getElementById('status-overlay');
      if (statusEl) statusEl.classList.add('hide');
    }
  });
}

async function askImportMode(file) {
  return new Promise((resolve) => {
    const back = document.getElementById('import-backdrop');
    const nameEl = document.getElementById('impName');
    if (nameEl) nameEl.textContent = file.name;
    if (!back) { resolve('model'); return; }
    back.classList.add('show');
    const cleanup = () => {
      back.classList.remove('show');
      document.querySelectorAll('.imp-opt').forEach(b => b.onclick = null);
      const cancel = document.getElementById('impCancel');
      if (cancel) cancel.onclick = null;
    };
    document.querySelectorAll('.imp-opt').forEach(btn => {
      btn.onclick = () => { const mode = btn.dataset.mode; cleanup(); resolve(mode); };
    });
    const cancel = document.getElementById('impCancel');
    if (cancel) cancel.onclick = () => { cleanup(); resolve(null); };
  });
}

async function loadModelRootFromFile(file) {
  return new Promise((resolve) => {
    const isOBJ = file.name.match(/\.obj$/i);
    const url = URL.createObjectURL(file);
    if (isOBJ) {
      new OBJLoader().load(url, (root) => { URL.revokeObjectURL(url); resolve(root); }, undefined, () => { URL.revokeObjectURL(url); resolve(null); });
    } else {
      new GLTFLoader().load(url, (g) => { URL.revokeObjectURL(url); resolve(g.scene); }, undefined, () => { URL.revokeObjectURL(url); resolve(null); });
    }
  });
}

async function loadTextureFromArrayBuffer(bytes) {
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

function wireKeyboard() {
  addEventListener('keydown', (e) => {
    if (isTypingInInput()) return;
    if (editorState.exporting) { if (e.key === 'Escape') cancelExport(); e.preventDefault(); return; }
    const modalOpen = document.getElementById('settings-backdrop')?.classList.contains('show')
      || document.getElementById('help-backdrop')?.classList.contains('show')
      || document.getElementById('import-backdrop')?.classList.contains('show')
      || document.getElementById('walkdur-backdrop')?.classList.contains('show');
    if (modalOpen) {
      if (e.key === 'Escape') {
        document.getElementById('settings-backdrop')?.classList.remove('show');
        document.getElementById('help-backdrop')?.classList.remove('show');
        document.getElementById('import-backdrop')?.classList.remove('show');
      }
      return;
    }
    if (e.key === 'Escape') {
      if (walkSetup.active) { cancelWalkSetup(); return; }
      if (editorState.fpvMode) { exitFPV(); return; }
      return;
    }
    if (e.key === 'Enter' && walkSetup.active) { e.preventDefault(); promptWalkDuration(); return; }
    // FPV: allow K (key), C (camera key), J (look key). K during walk-setup
    // drops a camera key; otherwise K drops a bone/transform key.
    if (editorState.fpvMode) {
      const k = e.key.toLowerCase();
      if (k === 'k') {
        e.preventDefault();
        if (walkSetup.active) addCameraKeyframe(); else addKeyframe();
        return;
      }
      if (k === 'c') { e.preventDefault(); addCameraKeyframe(); return; }
      if (k === 'j') { e.preventDefault(); addLookKey(); return; }
      return;
    }
    const mod = e.ctrlKey || e.metaKey;
    const obj = getSelected();
    if (e.key === '?') { document.getElementById('help-backdrop')?.classList.add('show'); return; }
    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); document.getElementById('btnSave')?.click(); return; }
    if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); document.getElementById('btnLoad')?.click(); return; }
    if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); document.getElementById('btnExport')?.click(); return; }
    if (mod && e.key.toLowerCase() === 'c') {
      if (!obj) return;
      const ki = obj.keyframes.findIndex(k => Math.abs(k.time - sceneState.time) < 0.02);
      if (ki >= 0) { e.preventDefault(); copyKeyframe(obj, ki); }
      return;
    }
    if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteKeyframe(); return; }
    if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      if (!obj) return;
      const d = duplicateObject(obj);
      if (d) { setSelected(d.id); pushHistory('Duplicate'); }
      return;
    }
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); return; }
    if (e.key.toLowerCase() === 'b') { e.preventDefault(); toggleBoneMode(); return; }
    if (e.key.toLowerCase() === 'l') { e.preventDefault(); document.getElementById('btnLoop')?.click(); return; }
    if (e.key.toLowerCase() === 'n') { timelineState.snapToKeys = !timelineState.snapToKeys; toast('Snap ' + (timelineState.snapToKeys ? 'ON' : 'OFF')); return; }
    if (e.key.toLowerCase() === 'k') { addKeyframe(); return; }
    if (e.key.toLowerCase() === 'j') { addLookKey(); return; }
    if (e.key.toLowerCase() === 'z' && !mod) { focusSelected(); return; }
    if (e.key.toLowerCase() === 'd' && e.shiftKey && !mod) {
      const o = getSelected();
      if (o && removeLookKeyNear(o, sceneState.time)) { renderTimeline(); renderAppearance(); pushHistory('Delete Look Key'); toast('Look key deleted'); }
      return;
    }
    if (e.key.toLowerCase() === 'd' && !mod) { deleteKeyframeAtTime(sceneState.time); return; }
    if (['1','2','3'].includes(e.key)) {
      if (obj) {
        const ki = obj.keyframes.findIndex(k => Math.abs(k.time - sceneState.time) < 0.02);
        if (ki >= 0) {
          const order = { '1': 'linear', '2': 'ease', '3': 'step' };
          obj.keyframes[ki].interp = order[e.key];
          renderProperties(); renderTimeline();
          toast(`Key → ${order[e.key]}`);
        }
      }
      return;
    }
    if (e.key.toLowerCase() === 'g') { setGizmoMode('translate'); return; }
    if (e.key.toLowerCase() === 'r') { setGizmoMode('rotate'); return; }
    if (e.key.toLowerCase() === 's' && !e.shiftKey && !mod) { setGizmoMode('scale'); return; }
    if (e.key.toLowerCase() === 'f') { toggleFPV(); return; }
    if (e.key.toLowerCase() === 'c') { addCameraKeyframe(); return; }
    if (e.key === 'Delete') {
      if (obj) { removeObject(obj.id); pushHistory(`Delete ${obj.name}`); renderSceneList(); renderProperties(); renderAppearance(); renderBones(); renderCamera(); renderTimeline(); attachGizmo(); }
      return;
    }
    if (e.key === 'Home') { sceneState.time = 0; updatePlayhead(); applyCameraAtTime(0); return; }
    if (e.key === 'End') { sceneState.time = sceneState.duration; updatePlayhead(); applyCameraAtTime(sceneState.duration); return; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      if (e.shiftKey) {
        const sel = getSelected();
        const cands = [];
        if (sel) {
          sel.keyframes.forEach(k => cands.push(k.time));
          (sel.lookKeys || []).forEach(k => cands.push(k.time));
        }
        sceneState.camKeyframes.forEach(k => cands.push(k.time));
        cands.sort((a, b) => a - b);
        let target;
        if (dir > 0) target = cands.find(t => t > sceneState.time + 1e-3);
        else target = [...cands].reverse().find(t => t < sceneState.time - 1e-3);
        if (target == null) target = dir > 0 ? sceneState.duration : 0;
        sceneState.time = Math.max(0, Math.min(sceneState.duration, target));
      } else {
        sceneState.time = Math.max(0, Math.min(sceneState.duration, sceneState.time + dir * (1/60)));
      }
      updatePlayhead();
      applyCameraAtTime(sceneState.time);
      return;
    }
    if (e.key.toLowerCase() === 'q') { setCamera('front'); return; }
    if (e.key.toLowerCase() === 'w') { setCamera('side'); return; }
    if (e.key.toLowerCase() === 'e') { setCamera('threeq'); return; }
    if (e.key.toLowerCase() === 't') { setCamera('top'); return; }
  });
  addEventListener('keydown', (e) => { editorState.keysDown[e.key.toLowerCase()] = true; });
  addEventListener('keyup', (e) => { editorState.keysDown[e.key.toLowerCase()] = false; });
}

function addKeyframe() {
  const obj = getSelected();
  if (!obj) return;
  writeKeyframeAt(obj, sceneState.time);
  renderTimeline();
  renderProperties();
  pushHistory('Add Keyframe');
  toast(`◈ Keyframe @ ${sceneState.time.toFixed(2)}s`);
}

function deleteKeyframeAtTime(time) {
  const obj = getSelected();
  if (!obj) return;
  const i = obj.keyframes.findIndex(k => Math.abs(k.time - time) < 0.05);
  if (i >= 0) { obj.keyframes.splice(i, 1); renderTimeline(); renderProperties(); pushHistory('Delete Keyframe'); return; }
  if (removeLookKeyNear(obj, time)) { renderTimeline(); renderAppearance(); pushHistory('Delete Look Key'); toast('Look key deleted'); }
}

function focusSelected() {
  const o = getSelected();
  if (!o) return;
  const box = new THREE.Box3().setFromObject(o.root);
  if (box.isEmpty()) return;
  const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  const d = Math.max(sz.x, sz.y, sz.z) * 2.2 + 1;
  const dir = viewport.editorCam.position.clone().sub(viewport.controls.target).normalize();
  viewport.controls.target.copy(c);
  viewport.editorCam.position.copy(c).addScaledVector(dir, d);
  viewport.controls.update();
  toast('🎯 Focused ' + o.name);
}

function wireFrameGuide() {
  frameGuide.getExportAspect = () => {
    const [w, h] = (exportSettings.res || '1920x1080').split('x').map(Number);
    return w && h ? w / h : 16 / 9;
  };
  frameGuide.getExportRes = () => (exportSettings.res || '').replace('x', '×');
  try { const sv = JSON.parse(localStorage.getItem('renderblox_frameguide') || 'null'); if (sv) Object.assign(frameGuide, { on: sv.on !== false, preset: sv.preset || 'match', safe: sv.safe !== false }); } catch {}
  const host = document.getElementById('viewport');
  if (host && !document.getElementById('frame-guide')) {
    const g = document.createElement('div');
    g.id = 'frame-guide';
    g.innerHTML = '<div class="fg-rect"><span class="fg-label"></span><div class="fg-safe"><i class="t">Shorts top bar</i><i class="r">Shorts buttons</i><i class="b">Title / channel zone</i></div></div>';
    host.appendChild(g);
  }
  const sel = document.getElementById('frameSel');
  const btn = document.getElementById('btnFrame');
  const persist = () => { try { localStorage.setItem('renderblox_frameguide', JSON.stringify({ on: frameGuide.on, preset: frameGuide.preset, safe: frameGuide.safe })); } catch {} };
  const sync = () => {
    if (sel) sel.value = frameGuide.preset;
    btn?.classList.toggle('on', frameGuide.on);
    refreshProjection();
  };
  btn?.addEventListener('click', () => { frameGuide.on = !frameGuide.on; persist(); sync(); toast(frameGuide.on ? '▭ Frame guide on' : 'Frame guide off'); });
  sel?.addEventListener('change', () => {
    frameGuide.preset = sel.value;
    frameGuide.on = true;
    const p = GUIDE_PRESETS[frameGuide.preset];
    if (p) {
      exportSettings.res = p.res;           // keep Export Settings in sync with the guide
      saveExportSettings();
      toast(`▭ ${p.label} · export set to ${p.res.replace('x', '×')}`);
    }
    persist(); sync();
  });
  // Export Settings modal saved a new resolution -> guide follows it
  window.addEventListener('rb-export-settings', () => {
    const match = Object.keys(GUIDE_PRESETS).find(k => GUIDE_PRESETS[k].res === exportSettings.res);
    frameGuide.preset = match || 'match';
    persist(); sync();
  });
  window.addEventListener('keydown', (e) => {
    if (isTypingInInput() || e.ctrlKey || e.metaKey) return;
    if (e.key.toLowerCase() === 'o' && !editorState.fpvMode && !editorState.exporting) { frameGuide.on = !frameGuide.on; persist(); sync(); }
  });
  sync();
  new ResizeObserver(() => { if (!editorState.exporting) resizeViewport(); }).observe(document.getElementById('viewport'));
}

function wireExtras() {
  document.getElementById('btnImportRx6')?.addEventListener('click', () => {
    const inp = document.getElementById('fileInputRx6');
    if (inp) { inp.value = ''; inp.click(); }
  });
  document.getElementById('btnAutoKey')?.addEventListener('click', () => {
    editorState.autoKey = !editorState.autoKey;
    document.getElementById('btnAutoKey')?.classList.toggle('on', editorState.autoKey);
    toast(editorState.autoKey ? '⏺ Auto-key ON — edits write keys at the playhead' : 'Auto-key off');
  });
  document.getElementById('btnLookKey')?.addEventListener('click', addLookKey);
}

function copyKeyframe(obj, ki) {
  editorState.clipboard = { srcObjId: obj.id, kf: JSON.parse(JSON.stringify(obj.keyframes[ki])) };
  toast('📋 Keyframe copied');
}

function pasteKeyframe() {
  if (!editorState.clipboard) return toast('Nothing to paste');
  const obj = getSelected();
  if (!obj) return toast('Select an object first');
  const kf = JSON.parse(JSON.stringify(editorState.clipboard.kf));
  kf.time = sceneState.time;
  if (!kf.interp) kf.interp = DEFAULT_INTERP;
  const i = obj.keyframes.findIndex(k => Math.abs(k.time - sceneState.time) < 0.02);
  if (i >= 0) obj.keyframes[i] = kf;
  else obj.keyframes.push(kf);
  obj.keyframes.sort((a, b) => a.time - b.time);
  obj.__pinned = false;
  renderTimeline();
  renderProperties();
  pushHistory('Paste Keyframe');
  toast(`📋 Keyframe pasted @ ${sceneState.time.toFixed(2)}s`);
}

function wireViewportEvents() {
  const el = viewport.renderer.domElement;
  el.addEventListener('mousedown', (e) => {
    editorState.pointerDownOnGizmo = !!viewport.transformGizmo.axis || viewport.transformGizmo.dragging;
    if (editorState.boneEditMode && e.button === 0) {
      if (viewport.transformGizmo.axis || viewport.transformGizmo.dragging) return;
      const bone = pickBone(e.clientX, e.clientY);
      if (!bone) { viewport.transformGizmo.camera = viewport.activeCam; return; }
      viewport.transformGizmo.camera = viewport.activeCam;
      selectBone(bone);
      return;
    }
  });
  el.addEventListener('click', () => {
    if (editorState.fpvMode && !document.pointerLockElement && !editorState.pointerDownOnGizmo) el.requestPointerLock();
    editorState.pointerDownOnGizmo = false;
  });
  document.addEventListener('pointerlockchange', () => {
    editorState.fpv.mouseLocked = document.pointerLockElement === el;
  });
  document.addEventListener('mousemove', (e) => {
    if (!editorState.fpvMode || !editorState.fpv.mouseLocked) return;
    if (viewport.transformGizmo.dragging) return;
    const sens = 0.0022;
    editorState.fpv.yaw -= e.movementX * sens;
    editorState.fpv.pitch -= e.movementY * sens;
    editorState.fpv.pitch = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, editorState.fpv.pitch));
    const eu = new THREE.Euler(editorState.fpv.pitch, editorState.fpv.yaw, 0, 'YXZ');
    viewport.sceneCam.quaternion.setFromEuler(eu);
    updateCamHelper();
  });
  addEventListener('wheel', (e) => {
    if (!editorState.fpvMode) return;
    e.preventDefault();
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= 100;
    d = Math.max(-150, Math.min(150, d));
    const step = (editorState.keysDown['shift'] ? 0.7 : 0.22) * (d / 100);
    viewport.sceneCam.position.y -= step;
    updateCamHelper();
  }, { passive: false });
}

function updateFPVMovement(dt) {
  if (!editorState.fpvMode) return;
  if (viewport.transformGizmo.dragging) return;
  const speed = (editorState.keysDown['shift'] ? 15 : 5) * dt;
  const forward = new THREE.Vector3();
  viewport.sceneCam.getWorldDirection(forward);
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const move = new THREE.Vector3();
  if (editorState.keysDown['w'] || editorState.keysDown['arrowup']) move.add(forward);
  if (editorState.keysDown['s'] || editorState.keysDown['arrowdown']) move.sub(forward);
  if (editorState.keysDown['a'] || editorState.keysDown['arrowleft']) move.sub(right);
  if (editorState.keysDown['d'] || editorState.keysDown['arrowright']) move.add(right);
  if (editorState.keysDown['q']) move.y -= 1;
  if (editorState.keysDown['e']) move.y += 1;
  if (move.lengthSq() > 0) { move.normalize().multiplyScalar(speed); viewport.sceneCam.position.add(move); }
  updateCamHelper();
}

function wireResize() {
  addEventListener('resize', () => { resizeViewport(); renderTimeline(); });
}

function buildMenuDefs() {
  return {
    file: [
      { label: 'New Scene', fn: () => {
        if (sceneState.objects.length === 0) return;
        if (!confirm(`Delete all ${sceneState.objects.length} objects?`)) return;
        clearAllObjects();
        pushHistory('New Scene');
      }},
      { label: 'Open .rdbx…', shortcut: 'Ctrl+O', fn: () => document.getElementById('btnLoad')?.click() },
      { label: 'Save .rdbx…', shortcut: 'Ctrl+S', fn: () => document.getElementById('btnSave')?.click() },
      { sep: true },
      { label: 'Import Model…', fn: () => document.getElementById('btnImport')?.click() },
      { label: 'Import Character (.rx6)…', fn: () => {
        const inp = document.getElementById('fileInputRx6');
        if (inp) { inp.value = ''; inp.click(); }
      }},
      { sep: true },
      { label: 'Export Video…', shortcut: 'Ctrl+E', fn: () => document.getElementById('btnExport')?.click() },
      { label: 'Export Settings…', fn: showSettingsModal }
    ],
    edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', fn: undo, disabled: () => editorState.history.index <= 0 },
      { label: 'Redo', shortcut: 'Ctrl+Y', fn: redo, disabled: () => editorState.history.index >= editorState.history.stack.length - 1 },
      { sep: true },
      { label: 'Duplicate', shortcut: 'Ctrl+D', fn: () => {
        const obj = getSelected(); if (!obj) return;
        const d = duplicateObject(obj);
        if (d) { setSelected(d.id); pushHistory('Duplicate'); }
      }},
      { label: 'Delete Selected', shortcut: 'Del', fn: () => {
        const o = getSelected();
        if (o) { removeObject(o.id); pushHistory(`Delete ${o.name}`); refreshAllPanels(); attachGizmo(); }
      }},
      { sep: true },
      { label: 'Add Keyframe', shortcut: 'K', fn: addKeyframe },
      { label: 'Add Look Key (colour/face)', shortcut: 'J', fn: addLookKey },
      { label: 'Delete Keyframe', shortcut: 'D', fn: () => deleteKeyframeAtTime(sceneState.time) },
      { sep: true },
      { label: 'All keys → Ease', fn: () => {
        const obj = getSelected(); if (!obj) return;
        obj.keyframes.forEach(k => k.interp = 'ease');
        renderTimeline(); renderProperties(); pushHistory('All keys → ease');
      }},
      { label: 'All keys → Linear', fn: () => {
        const obj = getSelected(); if (!obj) return;
        obj.keyframes.forEach(k => k.interp = 'linear');
        renderTimeline(); renderProperties(); pushHistory('All keys → linear');
      }}
    ],
    view: [
      { label: 'Front', shortcut: 'Q', fn: () => setCamera('front') },
      { label: 'Side', shortcut: 'W', fn: () => setCamera('side') },
      { label: '3/4', shortcut: 'E', fn: () => setCamera('threeq') },
      { label: 'Top', shortcut: 'T', fn: () => setCamera('top') },
      { label: 'Fit to Scene', fn: fitCamera },
      { label: 'Focus Selected', shortcut: 'Z', fn: focusSelected },
      { label: 'Toggle Frame Guide', shortcut: 'O', fn: () => document.getElementById('btnFrame')?.click() },
      { sep: true },
      { label: 'Cycle Preview Mode', fn: () => {
        const modes = ['auto', 'scene', 'editor'];
        const i = modes.indexOf(editorState.camPreviewMode);
        setCamPreviewMode(modes[(i + 1) % modes.length]);
      }},
      { sep: true },
      { label: 'Toggle Dark Mode', fn: () => {
        const isDark = toggleTheme();
        const btn = document.getElementById('btnTheme');
        if (btn) btn.textContent = isDark ? '☀️' : '🌙';
      }}
    ],
    character: [
      { label: 'Add R6', fn: () => document.getElementById('btnAddR6')?.click() },
      { sep: true },
      { label: 'Toggle Bone Mode', shortcut: 'B', fn: toggleBoneMode },
      { sep: true },
      { header: 'Pose Presets' },
      { label: '😀 Idle', fn: () => setPreset('idle') },
      { label: '👋 Wave', fn: () => setPreset('wave') },
      { label: '👉 Point', fn: () => setPreset('point') },
      { label: '🚶 Walk', fn: () => setPreset('walk') },
      { label: '🕺 Dance', fn: () => setPreset('dance') },
      { label: '🧍 Rest', fn: () => setPreset('rest') },
      { sep: true },
      { label: '🎯 Place Walk (FPV)…', fn: () => {
        const obj = getSelected();
        if (obj && obj.type === 'r6') startWalkSetup(obj);
      }}
    ],
    camera: [
      { label: 'Enter FPV', shortcut: 'F', fn: toggleFPV },
      { label: 'Add Camera Key', shortcut: 'C', fn: addCameraKeyframe },
      { sep: true },
      { label: 'Clear All Camera Keys', fn: () => {
        if (sceneState.camKeyframes.length === 0) return;
        if (!confirm(`Delete all ${sceneState.camKeyframes.length} cam keys?`)) return;
        sceneState.camKeyframes = [];
        renderTimeline(); renderCamera(); pushHistory('Clear Cam Keys');
        updateActiveCam();
      }}
    ],
    help: [
      { label: 'Keyboard Shortcuts…', shortcut: '?', fn: () => document.getElementById('help-backdrop')?.classList.add('show') },
      { sep: true },
      { label: 'About RenderBlox', fn: () => alert('RenderBlox v1.0.0') }
    ]
  };
}

function setPreset(name) {
  const obj = getSelected();
  if (!obj || obj.type !== 'r6') return toast('Select an R6 first');
  obj.currentAction = name;
  obj.__pinned = false;
  obj.__manualPose = false;
  sceneState.mode = 'live';
  renderProperties();
}

function detectDefaultQuality() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile || cores <= 2 || mem <= 2) return 'low';
  if (cores <= 4 || mem <= 4) return 'medium';
  if (cores <= 8) return 'high';
  return 'ultra';
}

const clock = new THREE.Clock();
let fpsAcc = 0, fpsFrames = 0;

function startRenderLoop() {
  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    fpsAcc += dt; fpsFrames++;
    if (fpsAcc >= 0.5) {
      const fps = Math.round(fpsFrames / fpsAcc);
      const fpsEl = document.getElementById('fpsDisplay');
      const perfFps = document.getElementById('perfFps');
      const perfMs = document.getElementById('perfMs');
      const perfCalls = document.getElementById('perfCalls');
      if (fpsEl) fpsEl.textContent = fps;
      if (perfFps) perfFps.textContent = fps;
      if (perfMs) perfMs.textContent = (1000 / Math.max(1, fps)).toFixed(1);
      if (perfCalls) perfCalls.textContent = viewport.renderer.info.render.calls;
      fpsAcc = 0; fpsFrames = 0;
    }
    if (sceneState.playing) {
      sceneState.time += dt * sceneState.playbackSpeed;
      if (sceneState.time >= sceneState.duration) {
        if (sceneState.loopPlayback) sceneState.time = 0;
        else {
          sceneState.time = sceneState.duration;
          sceneState.playing = false;
          const playBtn = document.getElementById('btnPlay');
          if (playBtn) { playBtn.textContent = '▶'; playBtn.classList.remove('on'); }
        }
      }
      updatePlayhead();
      applyCameraAtTime(sceneState.time);
    }
    updateFPVMovement(dt);
    sceneState.objects.forEach(obj => {
      if (obj.lookKeys && obj.lookKeys.length && !obj.__lookPinned && (sceneState.playing || sceneState.mode === 'keyframe')) {
        applyLookAt(obj, sceneState.time);
      }
    });
    sceneState.objects.forEach(obj => {
      if (obj.__pinned && !sceneState.playing) return;
      if (obj.keyframes.length >= 1 && (sceneState.mode === 'keyframe' || sceneState.playing)) {
        const kf = interpolateKeyframes(obj, sceneState.time);
        if (kf) {
          if (viewport.transformGizmo.dragging && viewport.transformGizmo.object === obj.root) return;
          applyKeyframeToObject(obj, kf);
        }
      } else if (obj.type === 'r6') {
        // While in bone mode OR after any manual posing, the loop must NOT
        // reapply the preset — it would wipe the user's rotation every frame.
        // The user commits with K, or reverts with Ctrl+Z.
        const isPosing = editorState.boneEditMode
          && obj.id === sceneState.selectedId;
        if (!isPosing && !obj.__manualPose && !obj.__boneManual) {
          applyPreset(obj, obj.currentAction, sceneState.time);
        }
      }
    });
    (function updateR6Hud() {
      const hud = document.getElementById('r6-hud');
      if (!hud) return;
      const obj = getSelected();
      if (!obj || obj.type !== 'r6') { hud.style.display = 'none'; return; }
      hud.style.display = '';
      const nameEl = document.getElementById('r6-hud-name');
      const posEl = document.getElementById('r6-hud-pos');
      const rotEl = document.getElementById('r6-hud-rot');
      const sclEl = document.getElementById('r6-hud-scl');
      const actEl = document.getElementById('r6-hud-act');
      const keyEl = document.getElementById('r6-hud-key');
      if (nameEl) nameEl.textContent = obj.name;
      const p = obj.root.position, r = obj.root.rotation, sc = obj.root.scale;
      if (posEl) posEl.textContent = `${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`;
      if (rotEl) rotEl.textContent = `${THREE.MathUtils.radToDeg(r.x).toFixed(0)}°, ${THREE.MathUtils.radToDeg(r.y).toFixed(0)}°, ${THREE.MathUtils.radToDeg(r.z).toFixed(0)}°`;
      if (sclEl) sclEl.textContent = `${sc.x.toFixed(2)}, ${sc.y.toFixed(2)}, ${sc.z.toFixed(2)}`;
      if (actEl) actEl.textContent = obj.currentAction || '—';
      if (keyEl) {
        if (obj.keyframes.length === 0) keyEl.textContent = 'none';
        else {
          let best = obj.keyframes[0], bd = Math.abs(best.time - sceneState.time);
          for (const k of obj.keyframes) { const d = Math.abs(k.time - sceneState.time); if (d < bd) { bd = d; best = k; } }
          const dir = best.time < sceneState.time ? '◀' : best.time > sceneState.time ? '▶' : '●';
          keyEl.textContent = `${dir} ${best.time.toFixed(2)}s (${obj.keyframes.length})`;
        }
      }
    })();
    if (editorState.boneEditMode) updateSkeletonOverlay();
    renderFrame(dt);
  }
  tick();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
