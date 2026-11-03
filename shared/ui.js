// ============================================================
// RenderBlox — UI module
// All panels. Pure DOM rendering + event wiring.
// Object creation/deletion delegates to scene.js which
// auto-adds to the Three.js scene via onObjectAdded/Removed.
// ============================================================

import * as THREE from 'three';
import {
  sceneState, getSelected, getObjectById, setSelected,
  addR6Character, addPrimitive, addLight, addModelFromRoot,
  removeObject, clearAllObjects, duplicateObject,
  getMats, setMeshColor, setMeshMap, clearMeshMap, getMeshColorHex,
  findHeadBone, measureHead, R6_BONES,
  bakePresetFor, bakeWalkFromTo, walkSetup,
  restoreHeadDefaultTexture, removeLookKeyNear
} from './scene.js';
import { soundStore } from './zip-io.js';
import {
  exportSettings, saveExportSettings, exportVideo, cancelExport, exportContext
} from './export.js';
import {
  timelineState, renderTimeline, updatePlayhead
} from './timeline.js';
import { toast, escapeHtml } from './common.js';

export function prettyMeshName(name) {
  if (!name) return 'Mesh';
  const map = {
    'Head': 'Head', 'Torso': 'Torso',
    'Left Arm': 'Left Arm', 'Right Arm': 'Right Arm',
    'Left Leg': 'Left Leg', 'Right Leg': 'Right Leg',
    'LeftArm': 'Left Arm', 'RightArm': 'Right Arm',
    'LeftLeg': 'Left Leg', 'RightLeg': 'Right Leg',
    'HumanoidRootPart': 'Root (invisible)',
    'UpperTorso': 'Upper Torso', 'LowerTorso': 'Lower Torso',
    'LeftUpperArm': 'L Upper Arm', 'LeftLowerArm': 'L Lower Arm', 'LeftHand': 'L Hand',
    'RightUpperArm': 'R Upper Arm', 'RightLowerArm': 'R Lower Arm', 'RightHand': 'R Hand',
    'LeftUpperLeg': 'L Upper Leg', 'LeftLowerLeg': 'L Lower Leg', 'LeftFoot': 'L Foot',
    'RightUpperLeg': 'R Upper Leg', 'RightLowerLeg': 'R Lower Leg', 'RightFoot': 'R Foot'
  };
  return map[name] || name;
}

// Callbacks the editor-main wires up
export const uiContext = {
  pushHistory: null,
  undo: null,
  redo: null,
  updateHistoryButtons: null,
  attachGizmo: null,
  detachGizmo: null,
  setGizmoMode: null,
  refreshAll: null,
  setCamera: null,
  fitCamera: null,
  toggleFPV: null,
  addCameraKeyframe: null,
  updateCamHelper: null,
  applyCameraAtTime: null,
  autoKeyIfOn: null,
  updateActiveCam: null,
  updateViewModeLabel: null,
  createFaceDecal: null,
  updateFaceDecal: null,
  removeFaceDecal: null,
  applyQuality: null,
  setFaceByKey: null, facePreview: null, faceDefs: null, faceName: null,
  myFaces: null, useMyFace: null, deleteMyFace: null, ensureFaceTexture: null,
  addLookKey: null, lookEdited: null, bakeLookEffect: null
};

// Hand-edited colours/parts: stop look keys from snapping the edit back (and auto-key if on)
function touchLook(obj) { uiContext.lookEdited?.(obj); }

// ------------------------------------------------------------
// Scene list
// ------------------------------------------------------------
export function renderSceneList() {
  const el = document.getElementById('sceneList');
  const count = document.getElementById('objCount');
  if (!el) return;
  if (sceneState.objects.length === 0) {
    el.innerHTML = '<em style="color:var(--dim-2);font-size:12px">No objects yet.</em>';
  } else {
    el.innerHTML = '';
    sceneState.objects.forEach(o => {
      const item = document.createElement('div');
      item.className = 'scene-item'
        + (o.id === sceneState.selectedId ? ' sel' : '')
        + (o.root.visible === false ? ' hidden' : '');
      const icon = o.type === 'r6' ? '🎭'
        : (o.type === 'light' ? '💡'
          : (o.type === 'primitive' ? '▢' : '📦'));
      const pin = o.__pinned ? '<span class="pinned" title="Pinned">⏸</span>' : '';
      item.innerHTML = `<span class="icon">${icon}</span>
        <span class="name">${escapeHtml(o.name)}</span>${pin}
        <button class="del">×</button>`;
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('del')) {
          e.stopPropagation();
          deleteObjectFromList(o.id);
          return;
        }
        setSelected(o.id);
        uiContext.attachGizmo?.();
      });
      el.appendChild(item);
    });
  }
  if (count) count.textContent = sceneState.objects.length;
}

function deleteObjectFromList(id) {
  const obj = getObjectById(id);
  if (!obj) return;
  removeObject(id);  // scene.js will call onObjectRemoved
  uiContext.pushHistory?.(`Delete ${obj.name}`);
  toast(`Deleted ${obj.name}`);
  renderSceneList();
  renderProperties();
  renderAppearance();
  renderBones();
  renderCamera();
  renderTimeline();
  uiContext.attachGizmo?.();
}

// ------------------------------------------------------------
// Properties
// ------------------------------------------------------------
export function renderProperties() {
  const propContent = document.getElementById('propContent');
  if (!propContent) return;
  const obj = getSelected();
  if (!obj) {
    propContent.innerHTML = `<div class="section"><div class="section-title">No Selection</div>
      <div class="tool-hint">Select an object from the scene list.</div></div>`;
    return;
  }

  const p = obj.root.position;
  const r = obj.root.rotation;
  const s = obj.root.scale;

  let html = `<div class="section"><div class="section-title">${
    obj.type === 'r6' ? '🎭 R6'
      : (obj.type === 'light' ? '💡 Light'
        : (obj.type === 'primitive' ? '▢ Primitive' : '📦 Model'))
  }</div>
    <div class="slider-row"><input type="text" id="propName" value="${escapeHtml(obj.name)}"></div></div>

    <div class="section"><div class="section-title">Position</div>
    <div class="slider-row"><label>X</label><input type="number" class="num-in" id="px" value="${p.x.toFixed(2)}" step="0.1"></div>
    <div class="slider-row"><label>Y</label><input type="number" class="num-in" id="py" value="${p.y.toFixed(2)}" step="0.1"></div>
    <div class="slider-row"><label>Z</label><input type="number" class="num-in" id="pz" value="${p.z.toFixed(2)}" step="0.1"></div></div>

    <div class="section"><div class="section-title">Rotation (°)</div>
    <div class="slider-row"><label>RX</label><input type="number" class="num-in" id="rx" value="${THREE.MathUtils.radToDeg(r.x).toFixed(0)}" step="5"></div>
    <div class="slider-row"><label>RY</label><input type="number" class="num-in" id="ry" value="${THREE.MathUtils.radToDeg(r.y).toFixed(0)}" step="5"></div>
    <div class="slider-row"><label>RZ</label><input type="number" class="num-in" id="rz" value="${THREE.MathUtils.radToDeg(r.z).toFixed(0)}" step="5"></div></div>

    <div class="section"><div class="section-title">Scale</div>
    <div class="slider-row"><label>SX</label><input type="number" class="num-in" id="sx" value="${s.x.toFixed(2)}" step="0.1"></div>
    <div class="slider-row"><label>SY</label><input type="number" class="num-in" id="sy" value="${s.y.toFixed(2)}" step="0.1"></div>
    <div class="slider-row"><label>SZ</label><input type="number" class="num-in" id="sz" value="${s.z.toFixed(2)}" step="0.1"></div>
    <div class="mini-grid" style="margin-top:6px">
      <button class="mini-btn" id="uniformScaleBtn">🔒 Uniform</button>
      <button class="mini-btn" id="resetScaleBtn">↺ Reset 1.0</button>
    </div></div>`;

  if (obj.type === 'r6') {
    const boneCount = Object.keys(obj.bones).length;
    html += `<div class="section"><div class="section-title">Pose <span class="badge">${boneCount} bones</span></div>`;
    if (boneCount === 0) {
      html += `<div class="tool-hint" style="color:var(--red)">⚠ No skeleton detected.</div>`;
    } else if (!R6_BONES.every(n => obj.bones[n])) {
      html += `<div class="tool-hint" style="color:var(--accent)">⚠ Non-R6 rig.</div>`;
    }
    html += `<div class="preset-grid" id="presetGrid">
      ${['idle','wave','point','walk','dance','rest'].map(k => {
        const em = { idle:'😀', wave:'👋', point:'👉', walk:'🚶', dance:'🕺', rest:'🧍' }[k];
        return `<button class="preset-btn ${obj.currentAction === k ? 'on' : ''}" data-preset="${k}">
          <span class="em">${em}</span>${k.charAt(0).toUpperCase() + k.slice(1)}
        </button>`;
      }).join('')}
    </div></div>

    <div class="section"><div class="section-title">Bake Animation</div>
    <div class="slider-row"><label>Type</label>
      <select id="abType">
        <option value="idle">Idle</option><option value="wave">Wave</option>
        <option value="point">Point</option><option value="walk">Walk</option>
        <option value="dance">Dance</option><option value="rest">Rest</option>
      </select></div>
    <div class="slider-row"><label>Sec</label>
      <input type="number" class="num-in" id="abDur" value="2.0" step="0.5"></div>
    <div id="walkControls" style="display:none">
      <div class="tool-hint" style="margin:0 0 8px 0">
        Walk uses FPV placement: fly from the character's eyes to the
        destination, look the way it should end up, then press
        <kbd style="padding:1px 5px;background:var(--panel-3);border-radius:4px;font-family:monospace">Enter</kbd>.
      </div>
      <button class="mini-btn purple" id="walkSetupBtn" style="width:100%;padding:10px">
        🎯 Place Walk (FPV)
      </button>
    </div>
    <button class="mini-btn green" id="bakeBtn" style="width:100%;padding:10px;margin-top:8px">
      Bake Animation
    </button></div>`;
  }

  if (obj.type === 'light') {
    const c = '#' + obj.color.toString(16).padStart(6, '0');
    html += `<div class="section"><div class="section-title">Light</div>
    <div class="slider-row"><label>Color</label>
      <input type="color" id="lightColor" value="${c}" style="flex:1;height:26px;border:1px solid var(--border);background:transparent;border-radius:6px;cursor:pointer"></div>
    <div class="slider-row"><label>Int</label>
      <input type="range" id="lightInt" min="0" max="15" step="0.2" value="${obj.intensity}">
      <span class="val" id="lightIntv">${obj.intensity.toFixed(1)}</span></div></div>`;
  }

  const ki = obj.keyframes.findIndex(k => Math.abs(k.time - sceneState.time) < 0.02);
  if (ki >= 0) {
    const k = obj.keyframes[ki];
    const interp = k.interp || 'ease';
    html += `<div class="section"><div class="section-title">Keyframe @ ${k.time.toFixed(2)}s</div>
    <div class="key-modes">
      <button class="key-mode ${interp === 'linear' ? 'on' : ''}" data-km="linear">1 Linear</button>
      <button class="key-mode ${interp === 'ease' ? 'on' : ''}" data-km="ease">2 Ease</button>
      <button class="key-mode ${interp === 'step' ? 'on' : ''}" data-km="step">3 Step</button>
    </div>
    <div class="mini-grid" style="margin-top:6px">
      <button class="mini-btn" id="kfCopy">📋 Copy</button>
      <button class="mini-btn red" id="kfDel">🗑 Delete</button>
    </div></div>`;
  }

  if (obj.keyframes.length > 0) {
    html += `<div class="section" id="bulkInterpBlock">
    <div class="section-title">All Keys <span class="badge">${obj.keyframes.length}</span></div>
    <div class="key-modes">
      <button class="key-mode" data-bulk="linear">All Linear</button>
      <button class="key-mode" data-bulk="ease">All Ease</button>
      <button class="key-mode" data-bulk="step">All Step</button>
    </div>
    <div class="tool-hint">Sets interpolation on every keyframe of "${escapeHtml(obj.name)}".</div>
    </div>`;
  }

  propContent.innerHTML = html;

  document.getElementById('propName')?.addEventListener('change', (e) => {
    obj.name = e.target.value || 'Object';
    renderSceneList();
    const vSel = document.getElementById('vSel');
    if (vSel) vSel.textContent = obj.name;
    uiContext.pushHistory?.('Rename');
  });

  const bindNum = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      const v = parseFloat(el.value);
      if (!isNaN(v)) {
        fn(v);
        uiContext.pushHistory?.('Transform');
        uiContext.autoKeyIfOn?.('Transform');
      }
    });
  };
  bindNum('px', v => obj.root.position.x = v);
  bindNum('py', v => obj.root.position.y = v);
  bindNum('pz', v => obj.root.position.z = v);
  bindNum('rx', v => obj.root.rotation.x = THREE.MathUtils.degToRad(v));
  bindNum('ry', v => obj.root.rotation.y = THREE.MathUtils.degToRad(v));
  bindNum('rz', v => obj.root.rotation.z = THREE.MathUtils.degToRad(v));
  bindNum('sx', v => { v = Math.max(0.001, v); obj.root.scale.x = v; });
  bindNum('sy', v => { v = Math.max(0.001, v); obj.root.scale.y = v; });
  bindNum('sz', v => { v = Math.max(0.001, v); obj.root.scale.z = v; });

  document.getElementById('uniformScaleBtn')?.addEventListener('click', () => {
    const v = obj.root.scale.x;
    obj.root.scale.set(v, v, v);
    renderProperties();
    uiContext.pushHistory?.('Uniform Scale');
  });
  document.getElementById('resetScaleBtn')?.addEventListener('click', () => {
    obj.root.scale.set(1, 1, 1);
    renderProperties();
    uiContext.pushHistory?.('Reset Scale');
  });

  if (obj.type === 'r6') {
    document.querySelectorAll('#presetGrid .preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        obj.currentAction = btn.dataset.preset;
        obj.__pinned = false;
        obj.__manualPose = false;
        sceneState.mode = 'live';
        renderProperties();
        uiContext.autoKeyIfOn?.('Preset');
      });
    });
    const ab = document.getElementById('abType');
    const wc = document.getElementById('walkControls');
    ab?.addEventListener('change', () => {
      if (wc) wc.style.display = ab.value === 'walk' ? 'block' : 'none';
    });
    document.getElementById('bakeBtn')?.addEventListener('click', () => {
      const t = ab.value;
      const d = Math.max(0.5, parseFloat(document.getElementById('abDur').value) || 2);
      if (t === 'walk') {
        toast('Use "Place Walk (FPV)" for walk animations');
      } else {
        bakePresetFor(obj, t, d, sceneState.time);
        renderTimeline();
        uiContext.pushHistory?.(`Bake ${t}`);
        toast(`Baked ${t} · ${d}s`);
      }
    });
    document.getElementById('walkSetupBtn')?.addEventListener('click', () => {
      window.__renderbloxStartWalkSetup?.(obj);
    });
  }

  if (obj.type === 'light') {
    document.getElementById('lightColor')?.addEventListener('input', (e) => {
      obj.color = parseInt(e.target.value.slice(1), 16);
      obj.root.color.setHex(obj.color);
    });
    document.getElementById('lightInt')?.addEventListener('input', (e) => {
      obj.intensity = parseFloat(e.target.value);
      obj.root.intensity = obj.intensity;
      const lv = document.getElementById('lightIntv');
      if (lv) lv.textContent = obj.intensity.toFixed(1);
    });
  }

  if (ki >= 0) {
    propContent.querySelectorAll('.key-mode[data-km]').forEach(b => {
      b.addEventListener('click', () => {
        obj.keyframes[ki].interp = b.dataset.km;
        renderProperties();
        renderTimeline();
        uiContext.pushHistory?.('Key interp');
      });
    });
    document.getElementById('kfCopy')?.addEventListener('click', () => {
      window.__renderbloxCopyKeyframe?.(obj, ki);
    });
    document.getElementById('kfDel')?.addEventListener('click', () => {
      obj.keyframes.splice(ki, 1);
      renderProperties();
      renderTimeline();
      uiContext.pushHistory?.('Delete Key');
    });
  }

  propContent.querySelectorAll('.key-mode[data-bulk]').forEach(b => {
    b.addEventListener('click', () => {
      const mode = b.dataset.bulk;
      obj.keyframes.forEach(k => k.interp = mode);
      renderProperties();
      renderTimeline();
      uiContext.pushHistory?.(`All keys → ${mode}`);
      toast(`${obj.keyframes.length} keys → ${mode}`);
    });
  });
}

// ------------------------------------------------------------
// Appearance
// ------------------------------------------------------------
export function renderAppearance() {
  const appearContent = document.getElementById('appearContent');
  if (!appearContent) return;
  const obj = getSelected();
  if (!obj) {
    appearContent.innerHTML = `<div class="section"><div class="section-title">No Selection</div>
      <div class="tool-hint">Select an object to edit its appearance.</div></div>`;
    return;
  }

  const meshes = obj.meshes || [];
  const hasSelMesh = obj.selectedMeshIndex >= 0 && obj.selectedMeshIndex < meshes.length;
  const selMesh = hasSelMesh ? meshes[obj.selectedMeshIndex].mesh : null;
  const selColorHex = selMesh ? getMeshColorHex(selMesh) : '#ff5566';

  let html = '';

  html += `<div class="section"><div class="section-title">Parts <span class="badge">${meshes.length}</span></div>`;
  if (meshes.length === 0) {
    html += `<div class="tool-hint">No body parts on this object.</div>`;
  } else {
    html += `<div class="mesh-list" id="meshList">`;
    meshes.forEach((m, i) => {
      const col = getMeshColorHex(m.mesh);
      const vis = m.mesh.visible;
      html += `<div class="mesh-row ${i === obj.selectedMeshIndex ? 'sel' : ''} ${vis ? '' : 'hidden-mesh'}" data-mesh-idx="${i}">
        <button class="mesh-eye" data-eye-idx="${i}" title="${vis ? 'Hide' : 'Show'}">${vis ? '👁' : '◌'}</button>
        <span class="mesh-name">${escapeHtml(prettyMeshName(m.name))}</span>
        <span class="mesh-color" style="background:${col}"></span>
      </div>`;
    });
    html += `</div>
    <div class="mini-grid" style="margin-top:8px">
      <button class="mini-btn" id="showAllParts">👁 Show All</button>
      <button class="mini-btn" id="hideAllParts">◌ Hide All</button>
    </div>`;
  }
  html += `</div>`;

  html += `<div class="section"><div class="section-title">Paint</div>`;
  if (hasSelMesh) {
    html += `<div style="font-size:11px;color:var(--dim);margin-bottom:8px">
      Selected: <b style="color:var(--text)">${escapeHtml(prettyMeshName(meshes[obj.selectedMeshIndex].name))}</b></div>`;
  } else {
    html += `<div class="tool-hint" style="margin:0 0 8px 0">
      Click a part above to select it, or use Paint All.</div>`;
  }
  html += `<div class="slider-row">
    <input type="color" id="paintColor" value="${selColorHex}"
      style="flex:1;height:28px;border:1px solid var(--border);background:transparent;border-radius:6px;cursor:pointer">
    <button class="mini-btn green" id="applyPaintSel" style="padding:6px 12px" ${hasSelMesh ? '' : 'disabled'}>Apply</button>
  </div>
  <div class="color-swatch-row" id="swatchRow"></div>
  <div class="mini-grid" style="margin-top:10px">
    <button class="mini-btn" id="paintAllBtn">🎨 Paint All</button>
    <button class="mini-btn red" id="resetPaintBtn">↺ Reset Colors</button>
  </div>
  <div class="mini-grid" style="margin-top:6px">
    <button class="mini-btn" id="copyColorBtn" ${hasSelMesh ? '' : 'disabled'}>📋 Copy Color</button>
    <button class="mini-btn" id="pasteColorBtn">📥 Paste Color</button>
  </div>
  </div>`;


  // --- Body Parts (Amputation & Color) ---
  if (obj.type === 'r6') {
    const hidden = obj.hiddenParts || [];
    const colors = obj.partColors || {};
    const partsList = [
      { id: 'head', label: 'Head' },
      { id: 'torso', label: 'Torso' },
      { id: 'left_arm', label: 'Left Arm' },
      { id: 'right_arm', label: 'Right Arm' },
      { id: 'left_leg', label: 'Left Leg' },
      { id: 'right_leg', label: 'Right Leg' }
    ];

    html += `<div class="section"><div class="section-title">Body Parts</div>
    <div style="display:flex;flex-direction:column;gap:6px">`;
    
    partsList.forEach(p => {
      const isVisible = !hidden.includes(p.id);
      const color = colors[p.id] || '#a3a3a3';
      
      const hideCheckbox = p.id === 'torso' 
        ? `<span style="width:16px;display:inline-block"></span>` 
        : `<input type="checkbox" data-hide-part="${p.id}" ${isVisible ? 'checked' : ''}>`;

      html += `<div class="part-color-row">
        <label>
          ${hideCheckbox}
          <span>${p.label}</span>
        </label>
        <input type="color" data-color-part="${p.id}" value="${color}">
      </div>`;
    });

    html += `</div>
    <div class="tool-hint" style="margin-top:8px">Uncheck to amputate. Click the color box to paint that limb.</div>
    </div>`;
  }

  if (obj.type === 'r6') {
    const curKey = obj.faceKey || 'default';
    const ud = obj.faceDecal?.userData;
    html += `<div class="section"><div class="section-title">Faces <span class="badge">${escapeHtml(uiContext.faceName?.(curKey) || curKey)}</span></div>
    <div class="face-grid" id="faceGrid"></div>
    <div class="mini-grid">
      <button class="mini-btn" id="faceRandBtn">🎲 Random</button>
      <button class="mini-btn" id="faceBlankBtn">◌ Blank</button>
      <button class="mini-btn" id="faceDefaultBtn">↺ Default</button>
      <button class="mini-btn green" id="faceUploadBtn">📥 Upload</button>
    </div>`;
    if (obj.faceDecal && ud) {
      const sc = ud.scale ?? 1.6, yo = ud.yOff ?? 0.6, xo = ud.xOff ?? 0, zo = ud.zOff ?? 0.6;
      html += `<div class="slider-row" style="margin-top:10px"><label>Size</label>
        <input type="range" id="faceScale" min="0.3" max="2.5" step="0.05" value="${sc}"><span class="val" id="faceScalev">${sc.toFixed(2)}</span></div>
      <div class="slider-row"><label>X</label>
        <input type="range" id="faceX" min="-1" max="1" step="0.01" value="${xo}"><span class="val" id="faceXv">${xo.toFixed(2)}</span></div>
      <div class="slider-row"><label>Y</label>
        <input type="range" id="faceY" min="-1" max="1" step="0.01" value="${yo}"><span class="val" id="faceYv">${yo.toFixed(2)}</span></div>
      <div class="slider-row"><label>Wrap</label>
        <input type="range" id="faceZ" min="0.2" max="1.0" step="0.02" value="${zo}"><span class="val" id="faceZv">${zo.toFixed(2)}</span></div>`;
    }
    html += `<button class="mini-btn" id="faceKeyBtn" style="width:100%;margin-top:8px;padding:8px">◉ Key this face at playhead</button>
    <div class="tool-hint">Picking a face wipes the old face texture first. Right-click a custom face to delete it. Key it to switch faces during the clip.</div></div>`;
  }

  html += `<div class="section"><div class="section-title">Look Keys <span class="badge">${(obj.lookKeys || []).length}</span></div>`;
  if (meshes.length) {
    const selMat = hasSelMesh ? getMats(selMesh)[0] : getMats(meshes[0].mesh)[0];
    const op = selMat ? (selMat.opacity ?? 1) : 1;
    const gl = selMat?.userData?.__glow || 0;
    html += `<div class="tool-hint" style="margin:0 0 8px 0">Paint / fade / glow ${hasSelMesh ? 'the selected part' : 'everything'}, then drop a key. The Look row on the timeline blends between keys.</div>
    <div class="slider-row"><label>Opacity</label><input type="range" id="lookOpacity" min="0" max="1" step="0.02" value="${op}"><span class="val" id="lookOpacityv">${op.toFixed(2)}</span></div>
    <div class="slider-row"><label>Glow</label><input type="range" id="lookGlow" min="0" max="1.5" step="0.05" value="${gl}"><span class="val" id="lookGlowv">${gl.toFixed(2)}</span></div>
    <div class="mini-grid" style="margin-top:6px">
      <button class="mini-btn green" id="lookKeyBtn">◉ Add Look Key (J)</button>
      <button class="mini-btn red" id="lookKeyDelBtn">🗑 Delete @ playhead</button>
    </div>
    <div class="slider-row" style="margin-top:10px"><label>Effect</label><input type="number" id="lookDur" value="1" min="0.2" max="20" step="0.2" style="width:60px;padding:4px;background:var(--panel-2);border:1px solid var(--border);border-radius:4px;color:var(--text)"><span class="val">sec</span></div>
    <div class="look-grid">
      <button class="mini-btn" data-fx="fadeout">🌫 Fade out</button>
      <button class="mini-btn" data-fx="fadein">✨ Fade in</button>
      <button class="mini-btn" data-fx="flash">🚨 Flash red</button>
      <button class="mini-btn" data-fx="pulse">💡 Glow pulse</button>
      <button class="mini-btn" data-fx="rainbow">🌈 Rainbow</button>
    </div>`;
  } else {
    html += `<div class="tool-hint" style="margin:0">This object has no paintable parts.</div>`;
  }
  html += `</div>`;

  html += `<div class="section"><div class="section-title">Texture on Selected Part</div>
    <div class="mini-grid">
      <button class="mini-btn green" id="texUploadBtn" ${hasSelMesh ? '' : 'disabled'}>📥 Upload</button>
      <button class="mini-btn red" id="texClearBtn" ${hasSelMesh ? '' : 'disabled'}>Clear</button>
    </div>
    <div class="tool-hint">Applies an image texture to the selected body part.</div>
  </div>`;

  html += `<div class="section"><div class="section-title">Attachments</div>
    <div class="mini-grid">
      <button class="mini-btn green" id="attImportBtn">📥 Import</button>
      <button class="mini-btn" id="attHatBtn">🎩 Hat</button>
    </div>
    <div class="mini-grid" style="margin-top:6px">
      <button class="mini-btn" id="attTextBtn">🅰 Text</button>
      <button class="mini-btn" id="attPrimBtn">▢ Box</button>
    </div>
    <div id="attList" style="margin-top:10px"></div>
  </div>`;

  html += `<div class="section"><div class="section-title">Danger Zone</div>
    <button class="mini-btn red" id="delObjBtn" style="width:100%;padding:10px">
      🗑 Delete Object</button></div>`;

  appearContent.innerHTML = html;

  // --- Body Parts Listeners ---
  document.querySelectorAll('input[data-hide-part]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const hiddenSet = new Set(obj.hiddenParts || []);
      if (e.target.checked) hiddenSet.delete(e.target.dataset.hidePart);
      else hiddenSet.add(e.target.dataset.hidePart);
      obj.hiddenParts = [...hiddenSet];
      
      sceneState.applyCharacterAppearance?.(obj, obj.hiddenParts, obj.partColors || {});
      
      if (uiContext.lookEdited) uiContext.lookEdited(obj);
      uiContext.pushHistory?.('Amputate Part');
    });
  });

  document.querySelectorAll('input[data-color-part]').forEach(inp => {
    inp.addEventListener('input', (e) => {
      if (!obj.partColors) obj.partColors = {};
      obj.partColors[e.target.dataset.colorPart] = e.target.value;
      sceneState.applyCharacterAppearance?.(obj, obj.hiddenParts || [], obj.partColors);
    });
    inp.addEventListener('change', () => {
      if (uiContext.lookEdited) uiContext.lookEdited(obj);
      uiContext.pushHistory?.('Paint Part');
    });
  });


  const meshListEl = document.getElementById('meshList');
  if (meshListEl) {
    meshListEl.querySelectorAll('.mesh-row').forEach(row => {
      const idx = parseInt(row.dataset.meshIdx);
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('mesh-eye')) return;
        obj.selectedMeshIndex = (obj.selectedMeshIndex === idx) ? -1 : idx;
        renderAppearance();
      });
    });
    meshListEl.querySelectorAll('.mesh-eye').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.eyeIdx);
        meshes[idx].mesh.visible = !meshes[idx].mesh.visible;
        sceneState.syncFaceDecal?.(obj);
        renderAppearance();
        touchLook(obj); uiContext.pushHistory?.('Toggle Part');
      });
    });
  }
  document.getElementById('showAllParts')?.addEventListener('click', () => {
    meshes.forEach(m => m.mesh.visible = true);
    sceneState.syncFaceDecal?.(obj);
    renderAppearance();
    touchLook(obj); uiContext.pushHistory?.('Show All Parts');
  });
  document.getElementById('hideAllParts')?.addEventListener('click', () => {
    meshes.forEach(m => m.mesh.visible = false);
    sceneState.syncFaceDecal?.(obj);
    renderAppearance();
    touchLook(obj); uiContext.pushHistory?.('Hide All Parts');
  });

  const colors = ['#ff5566','#3b82f6','#22c55e','#fbbf24','#a855f7','#ff6b35',
    '#ffffff','#000000','#8b5a2b','#10b981','#f43f5e','#eab308',
    '#14b8a6','#6366f1','#ec4899','#84cc16','#06b6d4','#f97316'];
  const sw = document.getElementById('swatchRow');
  if (sw) {
    colors.forEach(c => {
      const el = document.createElement('div');
      el.className = 'color-swatch';
      el.style.background = c;
      el.title = c;
      el.addEventListener('click', () => {
        const paintEl = document.getElementById('paintColor');
        if (paintEl) paintEl.value = c;
        if (hasSelMesh) {
          setMeshColor(selMesh, new THREE.Color(c));
          touchLook(obj); uiContext.pushHistory?.('Paint');
          renderAppearance();
          toast(`Painted ${prettyMeshName(meshes[obj.selectedMeshIndex].name)}`);
        }
      });
      sw.appendChild(el);
    });
  }

  document.getElementById('applyPaintSel')?.addEventListener('click', () => {
    if (!hasSelMesh) return;
    const paintEl = document.getElementById('paintColor');
    setMeshColor(selMesh, new THREE.Color(paintEl.value));
    touchLook(obj); uiContext.pushHistory?.('Paint');
    renderAppearance();
    toast(`Painted ${prettyMeshName(meshes[obj.selectedMeshIndex].name)}`);
  });

  document.getElementById('paintAllBtn')?.addEventListener('click', () => {
    const paintEl = document.getElementById('paintColor');
    const col = new THREE.Color(paintEl.value);
    meshes.forEach(m => setMeshColor(m.mesh, col));
    touchLook(obj); uiContext.pushHistory?.('Paint All');
    renderAppearance();
    toast(`Painted all ${meshes.length} parts`);
  });

  document.getElementById('copyColorBtn')?.addEventListener('click', () => {
    const paintEl = document.getElementById('paintColor');
    if (paintEl) {
      window.__renderbloxClipboardColor = paintEl.value;
      toast('📋 Color copied');
    }
  });

  document.getElementById('pasteColorBtn')?.addEventListener('click', () => {
    if (!window.__renderbloxClipboardColor) {
      toast('Nothing copied');
      return;
    }
    const col = new THREE.Color(window.__renderbloxClipboardColor);
    if (hasSelMesh) {
      setMeshColor(selMesh, col);
      touchLook(obj); uiContext.pushHistory?.('Paint');
      renderAppearance();
      toast('📥 Color pasted to selected');
    } else {
      meshes.forEach(m => setMeshColor(m.mesh, col));
      touchLook(obj); uiContext.pushHistory?.('Paint All');
      renderAppearance();
      toast('📥 Color pasted to all parts');
    }
  });

  document.getElementById('resetPaintBtn')?.addEventListener('click', () => {
    if (!confirm(`Reset all colors on "${obj.name}"?`)) return;
    meshes.forEach(m => {
      getMats(m.mesh).forEach(mat => {
        if (mat.userData?.__origColor) mat.color.copy(mat.userData.__origColor);
      });
    });
    touchLook(obj); uiContext.pushHistory?.('Reset Colors');
    renderAppearance();
    toast('↺ Colors reset');
  });

  // ---- Faces ----
  const faceGrid = document.getElementById('faceGrid');
  const applyFace = async (key, label) => {
    await uiContext.ensureFaceTexture?.(key);
    uiContext.setFaceByKey?.(obj, key);
    touchLook(obj);
    uiContext.pushHistory?.('Face: ' + label);
    renderAppearance();
  };
  if (faceGrid) {
    const cur = obj.faceKey || 'default';

    const tiles = [
      ...(uiContext.faceDefs?.() || []).map(d => ({ key: d.key, name: d.name, em: d.em })),
      ...(uiContext.myFaces?.() || []).map(f => ({ key: null, name: f.name, em: '', my: f.idx, data: f.data }))
    ];
    tiles.forEach(t => {
      const el = document.createElement('div');
      el.className = 'face-tile';
      el.title = t.name;
      el.innerHTML = `<div class="fn">${escapeHtml(t.name)}</div>`;
      if (t.my != null) el.style.backgroundImage = `url('${t.data}')`;
      else uiContext.facePreview?.(t.key).then(u => { if (u && el.isConnected) el.style.backgroundImage = `url('${u}')`; });
      const keyOf = () => t.my != null ? uiContext.useMyFace(t.my) : t.key;
      if (t.my == null && cur === t.key) el.classList.add('on');
      el.addEventListener('click', () => applyFace(keyOf(), t.name));
      if (t.my != null) el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (confirm(`Delete custom face "${t.name}"?`)) { uiContext.deleteMyFace(t.my); renderAppearance(); }
      });
      faceGrid.appendChild(el);
    });
  }
  document.getElementById('faceRandBtn')?.addEventListener('click', () => {
    const defs = uiContext.faceDefs?.() || [];
    const cur = obj.faceKey;
    const pool = defs.filter(d => d.key !== cur);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) applyFace(pick.key, pick.name);
  });
  document.getElementById('faceBlankBtn')?.addEventListener('click', () => {
    uiContext.setFaceByKey?.(obj, 'none'); touchLook(obj);
    uiContext.pushHistory?.('Blank Face'); renderAppearance(); toast('Face cleared');
  });
  document.getElementById('faceDefaultBtn')?.addEventListener('click', () => {
    uiContext.setFaceByKey?.(obj, 'default'); touchLook(obj);
    uiContext.pushHistory?.('Default Face'); renderAppearance(); toast('Default face restored');
  });
  document.getElementById('faceUploadBtn')?.addEventListener('click', () => {
    const inp = document.getElementById('fileInputFace');
    inp.dataset.targetObj = obj.id;
    inp.click();
  });
  document.getElementById('faceKeyBtn')?.addEventListener('click', () => uiContext.addLookKey?.());
  if (obj.faceDecal) {
    const bindFace = (id, prop, fixed = 2) => {
      const el = document.getElementById(id); if (!el) return;
      el.addEventListener('input', () => {
        const v = parseFloat(el.value);
        obj.faceDecal.userData[prop] = v;
        const out = document.getElementById(id + 'v'); if (out) out.textContent = v.toFixed(fixed);
        uiContext.updateFaceDecal?.(obj);
      });
      el.addEventListener('change', () => uiContext.pushHistory?.('Face ' + prop));
    };
    bindFace('faceScale', 'scale'); bindFace('faceX', 'xOff'); bindFace('faceY', 'yOff'); bindFace('faceZ', 'zOff');
  }

  // ---- Look keys ----
  const targets = () => hasSelMesh ? [selMesh] : meshes.map(m => m.mesh);
  const setOpacity = (o) => targets().forEach(m => getMats(m).forEach(mat => {
    mat.opacity = o; const t = o < 0.999; if (mat.transparent !== t) { mat.transparent = t; mat.needsUpdate = true; }
  }));
  const lo = document.getElementById('lookOpacity');
  lo?.addEventListener('input', () => {
    const v = parseFloat(lo.value); setOpacity(v);
    document.getElementById('lookOpacityv').textContent = v.toFixed(2);
    if (obj.faceDecal && (!hasSelMesh || /head/i.test(meshes[obj.selectedMeshIndex]?.name || ''))) obj.faceDecal.material.opacity = v;
    touchLook(obj);
  });
  lo?.addEventListener('change', () => { sceneState.syncFaceDecal?.(obj); uiContext.pushHistory?.('Opacity'); });
  const lg = document.getElementById('lookGlow');
  lg?.addEventListener('input', () => {
    const v = parseFloat(lg.value);
    targets().forEach(m => getMats(m).forEach(mat => {
      if (!mat.emissive) return;
      mat.userData.__glow = v; mat.emissive.copy(mat.color); mat.emissiveIntensity = v;
      if (v === 0) mat.emissive.setRGB(0, 0, 0);
    }));
    document.getElementById('lookGlowv').textContent = v.toFixed(2);
    touchLook(obj);
  });
  lg?.addEventListener('change', () => uiContext.pushHistory?.('Glow'));
  document.getElementById('lookKeyBtn')?.addEventListener('click', () => uiContext.addLookKey?.());
  document.getElementById('lookKeyDelBtn')?.addEventListener('click', () => {
    if (removeLookKeyNear(obj, sceneState.time)) { renderTimeline(); renderAppearance(); uiContext.pushHistory?.('Delete Look Key'); toast('Look key deleted'); }
    else toast('No look key at the playhead');
  });
  document.querySelectorAll('.look-grid [data-fx]').forEach(b => b.addEventListener('click', () => {
    const d = Math.max(0.2, parseFloat(document.getElementById('lookDur')?.value) || 1);
    uiContext.bakeLookEffect?.(obj, b.dataset.fx, d);
  }));

  document.getElementById('texUploadBtn')?.addEventListener('click', () => {
    if (!hasSelMesh) return;
    const inp = document.getElementById('fileInputTexture');
    inp.dataset.targetObj = obj.id;
    inp.dataset.meshIdx = obj.selectedMeshIndex;
    inp.click();
  });
  document.getElementById('texClearBtn')?.addEventListener('click', () => {
    if (!hasSelMesh) return;
    clearMeshMap(selMesh);
    selMesh.userData.textureAssetId = null;
    selMesh.userData.mapUrl = null;
    uiContext.pushHistory?.('Clear Texture');
    renderAppearance();
    toast('Texture cleared');
  });

  const attList = document.getElementById('attList');
  const refreshAttList = () => {
    if (!obj.attachments || obj.attachments.length === 0) {
      attList.innerHTML = '<div class="tool-hint" style="margin:0">No attachments.</div>';
      return;
    }
    attList.innerHTML = '';
    obj.attachments.forEach((att, i) => {
      const el = document.createElement('div');
      el.className = 'attach-item';
      el.innerHTML = `<span class="name">${escapeHtml(att.name)}</span><button class="del">✕</button>`;
      el.querySelector('.del').addEventListener('click', () => {
        obj.root.remove(att.mesh);
        obj.attachments.splice(i, 1);
        refreshAttList();
        uiContext.pushHistory?.('Remove Attachment');
      });
      attList.appendChild(el);
    });
  };
  refreshAttList();

  document.getElementById('attImportBtn')?.addEventListener('click', () => {
    const inp = document.getElementById('fileInputAttach');
    inp.dataset.targetObj = obj.id;
    inp.click();
  });
  document.getElementById('attHatBtn')?.addEventListener('click', () => {
    const hat = new THREE.Group();
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.08, 24),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 })
    );
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.6, 0.9, 24),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 })
    );
    crown.position.y = 0.48;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.57, 0.57, 0.12, 24),
      new THREE.MeshStandardMaterial({ color: 0x8a1414, roughness: 0.5 })
    );
    band.position.y = 0.15;
    hat.add(brim, crown, band);
    const m = measureHead(obj);
    m.attachTo.add(hat);
    hat.position.set(0, m.localY, 0);
    hat.scale.setScalar(m.scaleFactor);
    hat.traverse(o => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    obj.attachments.push({ name: 'Top Hat', mesh: hat });
    refreshAttList();
    uiContext.pushHistory?.('Add Hat');
  });
  document.getElementById('attTextBtn')?.addEventListener('click', () => {
    const txt = prompt('Text:', 'HELLO');
    if (!txt) return;
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 512, 128);
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#000000';
    g.lineWidth = 6;
    g.font = 'bold 80px Arial Black, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.strokeText(txt, 256, 64);
    g.fillText(txt, 256, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 0.75),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    );
    const hb = obj.bones?.['Head_01']?.obj;
    if (hb) { hb.add(plane); plane.position.set(0, 1.7, 0); }
    else { obj.root.add(plane); plane.position.set(0, 4, 0); }
    obj.attachments.push({ name: `Text: ${txt.slice(0, 12)}`, mesh: plane });
    refreshAttList();
    uiContext.pushHistory?.('Add Text');
  });
  document.getElementById('attPrimBtn')?.addEventListener('click', () => {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6 })
    );
    box.castShadow = true;
    box.receiveShadow = true;
    obj.root.add(box);
    box.position.set(0, 5, 0);
    obj.attachments.push({ name: 'Small Box', mesh: box });
    refreshAttList();
    uiContext.pushHistory?.('Add Box');
  });

  document.getElementById('delObjBtn')?.addEventListener('click', () => {
    deleteObjectFromList(obj.id);
  });
}

// ------------------------------------------------------------
// Bones
// ------------------------------------------------------------
export function renderBones() {
  const boneContent = document.getElementById('boneContent');
  if (!boneContent) return;
  const obj = getSelected();
  if (!obj || obj.type !== 'r6') {
    boneContent.innerHTML = `<div class="section"><div class="section-title">No Character Selected</div>
      <div class="tool-hint">Select an R6 or imported character.</div></div>`;
    return;
  }

  const boneNames = Object.keys(obj.bones);
  const boneModeOn = !!window.__renderbloxBoneMode;
  const selBone = window.__renderbloxSelectedBone;

  let html = `<div class="section">
    <div class="section-title">Bone Mode</div>
    <div class="mini-grid">
      <button class="mini-btn ${boneModeOn ? 'green' : ''}" id="bnToggle" style="grid-column:1/-1">
        ${boneModeOn ? '🦴 Bone Mode ON (B)' : '🦴 Enable Bone Mode'}
      </button>
    </div>
    <div class="tool-hint">Click a body part in the viewport.</div>
  </div>`;

  html += `<div class="section"><div class="section-title">Bones <span class="badge">${boneNames.length}</span></div>
    <div class="bone-list" id="boneList">`;
  if (boneNames.length === 0) {
    html += `<div class="tool-hint" style="padding:8px">No bones.</div>`;
  } else {
    const ordered = [];
    for (const n of R6_BONES) if (boneNames.includes(n)) ordered.push(n);
    for (const n of boneNames) if (!ordered.includes(n)) ordered.push(n);
    for (const n of ordered) {
      const isSel = selBone && selBone.name === n;
      const b = obj.bones[n].obj;
      const rx = THREE.MathUtils.radToDeg(b.rotation.x).toFixed(0);
      const ry = THREE.MathUtils.radToDeg(b.rotation.y).toFixed(0);
      const rz = THREE.MathUtils.radToDeg(b.rotation.z).toFixed(0);
      html += `<div class="bone-row ${isSel ? 'sel' : ''}" data-bone="${escapeHtml(n)}">
        <span class="dot"></span><span class="n">${escapeHtml(n)}</span>
        <span class="r">${rx}° ${ry}° ${rz}°</span>
      </div>`;
    }
  }
  html += `</div>
    <button class="mini-btn" id="bnReset" style="width:100%;padding:8px;margin-top:8px">↺ Reset All Bones</button>
  </div>`;

  boneContent.innerHTML = html;

  document.getElementById('bnToggle')?.addEventListener('click', () => {
    window.__renderbloxToggleBoneMode?.();
  });
  document.getElementById('bnReset')?.addEventListener('click', () => {
    for (const n in obj.bones) {
      const e = obj.bones[n];
      e.obj.quaternion.copy(e.restQuat);
      e.obj.position.copy(e.restPos);
    }
    renderProperties();
    renderBones();
    uiContext.pushHistory?.('Reset Bones');
  });

  boneContent.querySelectorAll('.bone-row').forEach(el => {
    el.addEventListener('click', () => {
      const n = el.dataset.bone;
      const b = obj.bones[n].obj;
      window.__renderbloxSelectBone?.(b);
    });
  });
}

// ------------------------------------------------------------
// Camera
// ------------------------------------------------------------
export function renderCamera() {
  const camContent = document.getElementById('camContent');
  if (!camContent) return;
  const sceneCam = window.__renderbloxSceneCam;
  if (!sceneCam) return;

  const camPreviewMode = window.__renderbloxCamPreviewMode || 'auto';

  let html = `<div class="section">
    <div class="section-title">Camera</div>
    <div class="mini-grid">
      <button class="mini-btn purple" id="camFPVBtn">🎥 FPV Mode</button>
      <button class="mini-btn purple" id="camKeyBtn">◈ Add Key</button>
    </div>
    <div class="tool-hint">FPV: WASD + Q/E + <b>scroll wheel = fly up/down</b>.</div>
  </div>

  <div class="section"><div class="section-title">Camera Position</div>
    <div class="slider-row"><label>X</label><input type="number" class="num-in" id="cx" value="${sceneCam.position.x.toFixed(2)}" step="0.1"></div>
    <div class="slider-row"><label>Y</label><input type="number" class="num-in" id="cy" value="${sceneCam.position.y.toFixed(2)}" step="0.1"></div>
    <div class="slider-row"><label>Z</label><input type="number" class="num-in" id="cz" value="${sceneCam.position.z.toFixed(2)}" step="0.1"></div>
    <div class="slider-row"><label>FOV</label><input type="range" id="camFovPanel" min="20" max="100" step="1" value="${sceneCam.fov}"><span class="val" id="camFovPanelv">${sceneCam.fov.toFixed(0)}</span></div>
  </div>

  <div class="section"><div class="section-title">Camera Keys <span class="badge">${sceneState.camKeyframes.length}</span></div>
    <div id="camKeyList" style="font-size:11px;font-weight:500;max-height:180px;overflow-y:auto"></div>
    <button class="mini-btn red" id="camClearAll" style="width:100%;padding:8px;margin-top:8px">
      Clear All Cam Keys</button>
  </div>

  <div class="section"><div class="section-title">Viewport Preview</div>
    <div class="mini-grid">
      <button class="mini-btn ${camPreviewMode === 'auto' ? 'green' : ''}" id="camAuto">🔄 Auto</button>
      <button class="mini-btn ${camPreviewMode === 'scene' ? 'purple' : ''}" id="camScene">🎥 Scene</button>
    </div>
    <div class="mini-grid" style="margin-top:6px">
      <button class="mini-btn ${camPreviewMode === 'editor' ? 'green' : ''}" id="camEditor" style="grid-column:1/-1">📷 Force Editor</button>
    </div>
  </div>`;

  camContent.innerHTML = html;

  document.getElementById('camFPVBtn')?.addEventListener('click', () => uiContext.toggleFPV?.());
  document.getElementById('camKeyBtn')?.addEventListener('click', () => uiContext.addCameraKeyframe?.());

  const bindCam = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      const v = parseFloat(el.value);
      if (!isNaN(v)) { fn(v); uiContext.updateCamHelper?.(); }
    });
  };
  bindCam('cx', v => sceneCam.position.x = v);
  bindCam('cy', v => sceneCam.position.y = v);
  bindCam('cz', v => sceneCam.position.z = v);

  const fp = document.getElementById('camFovPanel');
  if (fp) {
    fp.addEventListener('input', () => {
      sceneCam.fov = parseFloat(fp.value);
      sceneCam.updateProjectionMatrix();
      const lv = document.getElementById('camFovPanelv');
      if (lv) lv.textContent = sceneCam.fov.toFixed(0);
    });
  }

  const listEl = document.getElementById('camKeyList');
  if (sceneState.camKeyframes.length === 0) {
    listEl.innerHTML = '<div class="tool-hint" style="margin:0">No camera keys.</div>';
  } else {
    listEl.innerHTML = '';
    sceneState.camKeyframes.forEach((kf) => {
      const el = document.createElement('div');
      el.style.cssText = 'display:flex;justify-content:space-between;padding:6px 10px;border-radius:6px;cursor:pointer;margin-bottom:3px;background:var(--panel-2)';
      el.innerHTML = `<span style="font-weight:600">◈ ${kf.time.toFixed(2)}s</span>
        <span style="color:var(--cam);font-weight:600">${kf.fov.toFixed(0)}°</span>`;
      el.addEventListener('click', () => {
        sceneState.time = kf.time;
        updatePlayhead();
        uiContext.applyCameraAtTime?.(kf.time);
      });
      listEl.appendChild(el);
    });
  }

  document.getElementById('camClearAll')?.addEventListener('click', () => {
    if (sceneState.camKeyframes.length === 0) return;
    if (!confirm(`Delete all ${sceneState.camKeyframes.length} cam keys?`)) return;
    sceneState.camKeyframes = [];
    renderTimeline();
    renderCamera();
    uiContext.pushHistory?.('Clear Cam Keys');
    uiContext.updateActiveCam?.();
    uiContext.updateViewModeLabel?.();
  });

  document.getElementById('camAuto')?.addEventListener('click', () => {
    window.__renderbloxSetCamPreview?.('auto');
  });
  document.getElementById('camScene')?.addEventListener('click', () => {
    window.__renderbloxSetCamPreview?.('scene');
  });
  document.getElementById('camEditor')?.addEventListener('click', () => {
    window.__renderbloxSetCamPreview?.('editor');
  });
}

// ------------------------------------------------------------
// Menu bar
// ------------------------------------------------------------
export function initMenuBar(menuDefs) {
  const menubarEl = document.getElementById('menubar');
  if (!menubarEl) return;

  let openMenuEl = null;
  let openDropdownEl = null;

  const closeMenu = () => {
    if (openMenuEl) openMenuEl.classList.remove('open');
    if (openDropdownEl && openDropdownEl.parentNode) {
      openDropdownEl.parentNode.removeChild(openDropdownEl);
    }
    openMenuEl = null;
    openDropdownEl = null;
  };

  const openMenu = (menuKey, anchorEl) => {
    closeMenu();
    anchorEl.classList.add('open');
    openMenuEl = anchorEl;
    const items = menuDefs[menuKey] || [];
    const dd = document.createElement('div');
    dd.className = 'menu-dropdown';
    items.forEach(item => {
      if (item.sep) {
        const sep = document.createElement('div');
        sep.className = 'menu-sep';
        dd.appendChild(sep);
        return;
      }
      if (item.header) {
        const h = document.createElement('div');
        h.className = 'menu-header';
        h.textContent = item.header;
        dd.appendChild(h);
        return;
      }
      const row = document.createElement('div');
      row.className = 'menu-row';
      if (item.disabled && item.disabled()) row.classList.add('disabled');
      row.innerHTML = `<span class="menu-left">${item.label}</span>${item.shortcut ? `<span class="menu-shortcut">${item.shortcut}</span>` : ''}`;
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        if (item.disabled && item.disabled()) return;
        closeMenu();
        try { item.fn(); } catch (err) { console.error(err); }
      });
      dd.appendChild(row);
    });
    document.body.appendChild(dd);
    const r = anchorEl.getBoundingClientRect();
    const dw = dd.offsetWidth;
    let left = r.left;
    if (left + dw > window.innerWidth - 8) left = window.innerWidth - dw - 8;
    dd.style.left = left + 'px';
    dd.style.top = (r.bottom + 3) + 'px';
    dd.classList.add('show');
    openDropdownEl = dd;
  };

  menubarEl.querySelectorAll('.menu-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = el.dataset.menu;
      if (openMenuEl === el) { closeMenu(); return; }
      openMenu(key, el);
    });
    el.addEventListener('mouseenter', () => {
      if (openMenuEl && openMenuEl !== el) openMenu(openMenuEl.dataset.menu, el);
    });
  });

  document.addEventListener('click', (e) => {
    if (openDropdownEl && !openDropdownEl.contains(e.target) && !menubarEl.contains(e.target)) {
      closeMenu();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openMenuEl) closeMenu();
  });
}

// ------------------------------------------------------------
// Modals
// ------------------------------------------------------------
export function initModals() {
  // ---- Export mode buttons (Accurate / Quick) ----
  // Previously these had no click handler at all, so exportSettings.mode
  // was permanently stuck on "accurate". Wire them now.
  const accBtn = document.getElementById('expModeAccurate');
  const qckBtn = document.getElementById('expModeQuick');
  const applyModeUI = () => {
    const isQuick = exportSettings.mode === 'quick';
    accBtn?.classList.toggle('on', !isQuick);
    qckBtn?.classList.toggle('on', isQuick);
    // Speed-boost options only make sense in Accurate mode
    const accOpts = document.getElementById('accurateOnlyOpts');
    if (accOpts) accOpts.style.display = isQuick ? 'none' : '';
  };
  accBtn?.addEventListener('click', () => {
    exportSettings.mode = 'accurate';
    applyModeUI();
    saveExportSettings();
  });
  qckBtn?.addEventListener('click', () => {
    exportSettings.mode = 'quick';
    applyModeUI();
    saveExportSettings();
  });
  exportContext._applyModeUI = applyModeUI;

  const wire = (backdropId, cancelId) => {
    const back = document.getElementById(backdropId);
    if (!back) return;
    back.addEventListener('click', (e) => {
      if (e.target === back) back.classList.remove('show');
    });
    document.getElementById(cancelId)?.addEventListener('click', () => {
      back.classList.remove('show');
    });
  };

  wire('import-backdrop', 'impCancel');
  wire('help-backdrop', 'helpClose');

  const walkBack = document.getElementById('walkdur-backdrop');
  if (walkBack) {
    walkBack.addEventListener('click', (e) => {
      if (e.target === walkBack) walkBack.classList.remove('show');
    });
    document.getElementById('walkdur-cancel')?.addEventListener('click', () => {
      walkBack.classList.remove('show');
    });
  }

  const settingsBack = document.getElementById('settings-backdrop');
  if (settingsBack) {
    settingsBack.addEventListener('click', (e) => {
      if (e.target === settingsBack) settingsBack.classList.remove('show');
    });
    document.getElementById('btnSettingsCancel')?.addEventListener('click', () => {
      settingsBack.classList.remove('show');
    });
    document.getElementById('btnSettingsSave')?.addEventListener('click', () => {
      const res = document.getElementById('expRes');
      const fps = document.getElementById('expFps');
      const fmt = document.getElementById('expFormat');
      const br = document.getElementById('expBitrate');
      const noBloom = document.getElementById('expNoBloom');
      const smallShadow = document.getElementById('expSmallShadow');
      const quality = document.getElementById('expQuality');
      if (res) exportSettings.res = res.value;
      if (fps) exportSettings.fps = parseInt(fps.value);
      if (fmt) exportSettings.format = fmt.value;
      if (br) exportSettings.bitrate = parseInt(br.value);
      if (quality) {
        exportSettings.quality = parseInt(quality.value);
        // Apply live preview quality
        const qv = exportSettings.quality;
        if (qv <= 3) uiContext.applyQuality?.('low');
        else if (qv <= 7) uiContext.applyQuality?.('medium');
        else uiContext.applyQuality?.('high');
      }
      if (noBloom) exportSettings.noBloom = noBloom.checked;
      if (smallShadow) exportSettings.smallShadow = smallShadow.checked;
      saveExportSettings();
      settingsBack.classList.remove('show');
      window.dispatchEvent(new Event('rb-export-settings'));
      toast(`⚙ Settings saved · ${exportSettings.res} @ ${exportSettings.fps}fps`);
    });
  }
}

export function showSettingsModal() {
  const back = document.getElementById('settings-backdrop');
  if (!back) return;

  // Wire the quality slider ONCE so dragging it applies live preview quality.
  const qSlider = document.getElementById('expQuality');
  if (qSlider && !qSlider.dataset._rbWired) {
    qSlider.dataset._rbWired = '1';
    qSlider.addEventListener('input', () => {
      const qv = parseInt(qSlider.value);
      if (qv <= 3) uiContext.applyQuality?.('low');
      else if (qv <= 7) uiContext.applyQuality?.('medium');
      else uiContext.applyQuality?.('high');
    });
  }
  const res = document.getElementById('expRes');
  const fps = document.getElementById('expFps');
  const fmt = document.getElementById('expFormat');
  const br = document.getElementById('expBitrate');
  const noBloom = document.getElementById('expNoBloom');
  const smallShadow = document.getElementById('expSmallShadow');
  if (res) res.value = exportSettings.res;
  if (fps) fps.value = String(exportSettings.fps);
  if (fmt) fmt.value = exportSettings.format;
  if (br) br.value = String(exportSettings.bitrate);
  const quality = document.getElementById('expQuality');
  if (quality) quality.value = String(exportSettings.quality || 8);
  if (noBloom) noBloom.checked = exportSettings.noBloom !== false;
  if (smallShadow) smallShadow.checked = exportSettings.smallShadow !== false;
  exportContext._applyModeUI?.();
  back.classList.add('show');
}

export function refreshAllPanels() {
  renderSceneList();
  renderProperties();
  renderAppearance();
  renderBones();
  renderCamera();
  renderTimeline();
}