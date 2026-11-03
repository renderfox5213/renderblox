// ============================================================
// RenderBlox — Viewport module
// Three.js setup, cameras, gizmo (with bone fix), R6 loader.
// Exported as a singleton to be consumed by editor-main.js.
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { syncGizmoCamera } from './common.js';

// ------------------------------------------------------------
// Public state object
// ------------------------------------------------------------
export const viewport = {
  renderer: null,
  scene: null,
  editorCam: null,
  sceneCam: null,
  activeCam: null,
  controls: null,
  transformGizmo: null,
  composer: null,
  renderPass: null,
  bloomPass: null,
  camHelper: null,
  skyDome: null,
  sunGroup: null,
  clouds: [],
  r6Template: null,
  r6GirlTemplate: null, // loaded lazily
  r6LoadError: null,
  r6LoadState: 'idle', // idle | loading | ok | error
  currentQuality: 'high',
  // callbacks set by editor-main
  onR6LoadOk: null,
  onR6LoadError: null,
  onCameraChange: null, // fired when activeCam changes
  onPerfUpdate: null,   // fired every ~0.5s with { fps, ms, calls }
};

// ------------------------------------------------------------
// Quality presets
// ------------------------------------------------------------
const QUALITY = {
  low:    { shadows:false, shadowMapSize:512,  bloom:false, pixelRatio:1.0 },
  medium: { shadows:true,  shadowMapSize:1024, bloom:false, pixelRatio:1.5 },
  high:   { shadows:true,  shadowMapSize:2048, bloom:true,  pixelRatio:2.0 },
  ultra:  { shadows:true,  shadowMapSize:4096, bloom:true,  pixelRatio:2.0 }
};

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
export function initViewport(viewportEl) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
    stencil: false
  });
  renderer.setSize(viewportEl.clientWidth, viewportEl.clientHeight, true);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewportEl.appendChild(renderer.domElement);
  viewport.renderer = renderer;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87c5ee);
  scene.fog = new THREE.FogExp2(0xb8d4e8, 0.005);
  viewport.scene = scene;

  const editorCam = new THREE.PerspectiveCamera(42, viewportEl.clientWidth / viewportEl.clientHeight, 0.1, 5000);
  editorCam.position.set(8, 6, 12);
  const sceneCam = new THREE.PerspectiveCamera(42, viewportEl.clientWidth / viewportEl.clientHeight, 0.1, 5000);
  sceneCam.position.set(8, 6, 12);
  sceneCam.lookAt(0, 2, 0);
  viewport.editorCam = editorCam;
  viewport.sceneCam = sceneCam;
  viewport.activeCam = editorCam;

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, editorCam);
  composer.addPass(renderPass);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(viewportEl.clientWidth, viewportEl.clientHeight),
    0.25, 0.4, 0.9
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  viewport.composer = composer;
  viewport.renderPass = renderPass;
  viewport.bloomPass = bloomPass;

  // Camera helper (scene cam frustum visualization)
  const camHelper = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xa855f7 })
  );
  camHelper.frustumCulled = false;
  scene.add(camHelper);
  viewport.camHelper = camHelper;

  // Orbit controls for editor camera
  const controls = new OrbitControls(editorCam, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 2, 0);
  controls.minDistance = 0.5;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI * 0.55;
  controls.zoomSpeed = 0.75;
  viewport.controls = controls;

  // Transform gizmo — the bone fix lives here
  const gizmo = new TransformControls(editorCam, renderer.domElement);
  gizmo.setSize(1.0);
  gizmo.setSpace('world');
  scene.add(gizmo);
  viewport.transformGizmo = gizmo;

  // When dragging starts, freeze orbit controls
  gizmo.addEventListener('dragging-changed', (e) => {
    controls.enabled = !e.value && viewport.activeCam === editorCam;
    if (e.value && document.pointerLockElement) document.exitPointerLock();
  });

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x88a060, 0.75));
  const amb = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(amb);
  viewport.amb = amb;

  const sun = new THREE.DirectionalLight(0xfff2d6, 1.15);
  sun.position.set(-8, 14, 10);
  sun.castShadow = true;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 100;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  viewport.sun = sun;

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshStandardMaterial({ color: 0x4a8f3a, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  viewport.ground = ground;

  // Sky dome
  const skyGeo = new THREE.SphereGeometry(500, 32, 24);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x3a7ab8) },
      midColor: { value: new THREE.Color(0xa8cee8) },
      botColor: { value: new THREE.Color(0xd8e8f0) }
    },
    vertexShader: `varying vec3 vWorldPos;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `varying vec3 vWorldPos;
      uniform vec3 topColor, midColor, botColor;
      void main(){
        float h = normalize(vWorldPos).y;
        vec3 c;
        if (h > 0.0) c = mix(midColor, topColor, pow(clamp(h, 0.0, 1.0), 0.7));
        else c = mix(midColor, botColor, pow(clamp(-h, 0.0, 1.0), 0.5));
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);
  viewport.skyDome = skyDome;

  // Sun disc
  const sunGroup = new THREE.Group();
  scene.add(sunGroup);
  sunGroup.add(new THREE.Mesh(
    new THREE.CircleGeometry(12, 48),
    new THREE.MeshBasicMaterial({
      color: 0xfff2b8, transparent: true, opacity: 0.95, fog: false, depthWrite: false
    })
  ));
  const sunGlow = new THREE.Mesh(
    new THREE.CircleGeometry(28, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffe8a0, transparent: true, opacity: 0.35, fog: false,
      depthWrite: false, blending: THREE.AdditiveBlending
    })
  );
  sunGlow.position.z = -0.5;
  sunGroup.add(sunGlow);
  sunGroup.position.set(-200, 180, -180);
  viewport.sunGroup = sunGroup;

  // Clouds
  const cloudTexture = makeCloudTexture();
  for (let i = 0; i < 20; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cloudTexture, transparent: true, opacity: 0.85,
      depthWrite: false, fog: false, color: 0xffffff
    }));
    const angle = (i / 20) * Math.PI * 2 + Math.random() * 0.5;
    const radius = 200 + Math.random() * 250;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 70 + Math.random() * 90;
    const s = 25 + Math.random() * 35;
    sprite.position.set(x, y, z);
    sprite.scale.set(s * 1.6, s * 0.7, 1);
    sprite.userData = {
      speed: (0.4 + Math.random() * 0.8) * (Math.random() > 0.5 ? 1 : -1),
      startX: x, range: 800
    };
    scene.add(sprite);
    viewport.clouds.push(sprite);
  }

  // Load the R6 model
  loadR6Template();

  return viewport;
}

function makeCloudTexture() {
  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const cx = size / 2, cy = size / 2;
  const blobs = [
    { x: cx - 45, y: cy + 8,  r: 40 },
    { x: cx - 15, y: cy - 12, r: 52 },
    { x: cx + 20, y: cy - 6,  r: 48 },
    { x: cx + 55, y: cy + 10, r: 38 },
    { x: cx + 5,  y: cy + 20, r: 42 }
  ];
  blobs.forEach(b => {
    const grad = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    g.fill();
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ------------------------------------------------------------
// R6 loader — hard error if models/r6.glb fails to load
// ------------------------------------------------------------
const R6_PATH = 'models/r6.glb';

export function loadR6Template() {
  viewport.r6LoadState = 'loading';
  viewport.r6LoadError = null;

  const loader = new GLTFLoader();
  const timer = setTimeout(() => {
    if (viewport.r6LoadState === 'loading') {
      viewport.r6LoadState = 'error';
      viewport.r6LoadError = {
        type: 'timeout',
        url: R6_PATH,
        message: 'The model took longer than 20 seconds to load.',
        hint: 'Check your network connection and that the file exists at the URL above.'
      };
      viewport.onR6LoadError?.(viewport.r6LoadError);
    }
  }, 20000);

  loader.load(
    R6_PATH,
    (gltf) => {
      clearTimeout(timer);
      viewport.r6LoadState = 'ok';
      viewport.r6Template = gltf;
      viewport.onR6LoadOk?.(gltf);
    },
    (xhr) => {
      // Progress — could surface in the status overlay
      if (viewport.onR6Progress) {
        viewport.onR6Progress(xhr.loaded, xhr.total);
      }
    },
    (err) => {
      clearTimeout(timer);
      viewport.r6LoadState = 'error';
      const status = err?.target?.status || err?.status || null;
      const url = err?.target?.responseURL || R6_PATH;
      let hint = '';
      let type = 'network';
      if (status === 404) {
        type = 'not-found';
        hint = `The file wasn't found at "${R6_PATH}". Put r6.glb inside the models/ folder next to editor.html.`;
      } else if (status === 0 || !status) {
        type = 'cors-or-network';
        hint = `The request failed before receiving a response. Check that you're serving from a local server (not file://), and that the file exists.`;
      } else {
        hint = `The server responded with HTTP ${status}.`;
      }
      viewport.r6LoadError = {
        type, url,
        status,
        message: err?.message || 'Unknown error',
        hint
      };
      viewport.onR6LoadError?.(viewport.r6LoadError);
    }
  );
}


export function loadR6GirlTemplate() {
  if (viewport.r6GirlTemplate) return Promise.resolve(viewport.r6GirlTemplate);
  if (viewport.r6GirlLoading) return viewport.r6GirlLoading;

  viewport.r6GirlLoading = new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load('models/r6-girl.glb', (gltf) => {
      viewport.r6GirlTemplate = gltf;
      resolve(gltf);
    }, undefined, (err) => {
      console.error('Failed to load r6-girl.glb', err);
      resolve(null);
    });
  });
  return viewport.r6GirlLoading;
}

// ------------------------------------------------------------
// Active camera + gizmo sync (THE BONE FIX)
// ------------------------------------------------------------
export function setActiveCamera(cam) {
  if (viewport.activeCam === cam) return;
  viewport.activeCam = cam;
  viewport.renderPass.camera = cam;

  // This is the critical bit — see common.js syncGizmoCamera for details
  syncGizmoCamera(viewport.transformGizmo, cam);

  viewport.onCameraChange?.(cam);
}

export function attachGizmoTo(object3D) {
  const gizmo = viewport.transformGizmo;
  if (!gizmo) return;
  // Force sync before attaching
  gizmo.camera = viewport.activeCam;
  if (object3D && object3D.parent === null) {
    // Object isn't in the scene graph — likely stale
    gizmo.detach();
    gizmo.visible = false;
    return;
  }
  if (gizmo.object !== object3D) {
    gizmo.detach();
    if (object3D) gizmo.attach(object3D);
  }
  gizmo.visible = !!object3D;
}

export function detachGizmo() {
  const gizmo = viewport.transformGizmo;
  if (!gizmo) return;
  gizmo.detach();
  gizmo.visible = false;
}

// ------------------------------------------------------------
// Camera helper visualization
// ------------------------------------------------------------
export function updateCamHelper() {
  const sceneCam = viewport.sceneCam;
  const camHelper = viewport.camHelper;
  if (!sceneCam || !camHelper) return;
  const fov = THREE.MathUtils.degToRad(sceneCam.fov);
  const aspect = sceneCam.aspect;
  const near = 0.3, far = 1.2;
  const h = Math.tan(fov / 2);
  const nH = h * near, nW = nH * aspect;
  const fH = h * far, fW = fH * aspect;
  const positions = [];
  const nc = [[-nW,-nH,-near],[nW,-nH,-near],[nW,nH,-near],[-nW,nH,-near]];
  const fc = [[-fW,-fH,-far],[fW,-fH,-far],[fW,fH,-far],[-fW,fH,-far]];
  for (const c of nc) positions.push(0,0,0,...c);
  for (let i = 0; i < 4; i++) positions.push(...nc[i], ...nc[(i + 1) % 4]);
  for (let i = 0; i < 4; i++) positions.push(...fc[i], ...fc[(i + 1) % 4]);
  for (let i = 0; i < 4; i++) positions.push(...nc[i], ...fc[i]);
  camHelper.geometry.setAttribute('position',
    new THREE.Float32BufferAttribute(positions, 3));
  camHelper.geometry.attributes.position.needsUpdate = true;
  camHelper.position.copy(sceneCam.position);
  camHelper.quaternion.copy(sceneCam.quaternion);
}

// ------------------------------------------------------------
// Quality
// ------------------------------------------------------------
export function applyQuality(q) {
  const cfg = QUALITY[q];
  if (!cfg) return;
  const renderer = viewport.renderer;
  const sun = viewport.sun;
  const bloom = viewport.bloomPass;
  const composer = viewport.composer;
  const el = viewport.renderer.domElement.parentElement;

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = cfg.shadows;
  if (cfg.shadows) {
    sun.shadow.mapSize.set(cfg.shadowMapSize, cfg.shadowMapSize);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    sun.castShadow = true;
  } else {
    sun.castShadow = false;
  }
  bloom.enabled = cfg.bloom;
  renderer.setSize(el.clientWidth, el.clientHeight, true);
  composer.setSize(el.clientWidth, el.clientHeight);
  viewport.currentQuality = q;
}

// ------------------------------------------------------------
// Resize
// ------------------------------------------------------------
export function resizeViewport() {
  const el = viewport.renderer.domElement.parentElement;
  const w = el.clientWidth, h = el.clientHeight;
  if (w < 2 || h < 2) return;
  viewport.renderer.setSize(w, h, true);
  viewport.composer.setSize(w, h);
  viewport.bloomPass?.setSize(w, h);
  refreshProjection();
}

// ------------------------------------------------------------
// Frame guide — translucent outline showing what the exported video will
// contain (Shorts 9:16, YouTube 16:9, ...). The scene camera is rendered
// with a view offset so the outlined rectangle is EXACTLY the export frame,
// and anything outside it is just extra context you can see while framing.
// ------------------------------------------------------------
export const GUIDE_PRESETS = {
  shorts:   { label: 'Shorts 9:16',   ar: 9 / 16, res: '1080x1920' },
  youtube:  { label: 'YouTube 16:9',  ar: 16 / 9, res: '1920x1080' },
  square:   { label: 'Square 1:1',    ar: 1,      res: '1080x1080' },
  portrait: { label: 'Portrait 4:5',  ar: 4 / 5,  res: '1080x1350' }
};

export const frameGuide = {
  on: true,
  preset: 'match',        // 'match' = follow Export Settings resolution
  safe: true,             // show Shorts UI-covered zones
  suspended: false,       // true while exporting
  getExportAspect: null   // set by editor-main
};

export function getGuideAspect() {
  if (frameGuide.preset !== 'match' && GUIDE_PRESETS[frameGuide.preset]) return GUIDE_PRESETS[frameGuide.preset].ar;
  return frameGuide.getExportAspect?.() || (16 / 9);
}

export function getGuideRect() {
  const el = viewport.renderer.domElement.parentElement;
  const W = el.clientWidth, H = el.clientHeight;
  const Ae = getGuideAspect();
  const rw = Math.min(W * 0.9, H * 0.9 * Ae);
  const rh = rw / Ae;
  return { x: (W - rw) / 2, y: (H - rh) / 2, w: rw, h: rh, W, H, Ae };
}

export function refreshProjection() {
  if (!viewport.renderer) return;
  const el = viewport.renderer.domElement.parentElement;
  const W = el.clientWidth, H = el.clientHeight;
  if (W < 2 || H < 2) return;
  viewport.editorCam.aspect = W / H;
  viewport.editorCam.updateProjectionMatrix();
  const sc = viewport.sceneCam;
  if (frameGuide.on && !frameGuide.suspended) {
    const r = getGuideRect();
    sc.aspect = r.Ae;
    sc.setViewOffset(r.w, r.h, (r.w - W) / 2, (r.h - H) / 2, W, H);
  } else {
    sc.clearViewOffset();
    sc.aspect = W / H;
  }
  sc.updateProjectionMatrix();
  updateCamHelper();
  updateGuideOverlay();
}

export function updateGuideOverlay() {
  const host = document.getElementById('frame-guide');
  if (!host) return;
  const show = frameGuide.on && !frameGuide.suspended;
  host.style.display = show ? 'block' : 'none';
  if (!show) return;
  const r = getGuideRect();
  const rect = host.querySelector('.fg-rect');
  rect.style.left = r.x + 'px'; rect.style.top = r.y + 'px';
  rect.style.width = r.w + 'px'; rect.style.height = r.h + 'px';
  const p = GUIDE_PRESETS[frameGuide.preset];
  const label = host.querySelector('.fg-label');
  if (label) {
    const aspTxt = p ? p.label : 'Export frame';
    label.textContent = `${aspTxt}${frameGuide.getExportRes ? ' · ' + frameGuide.getExportRes() : ''}`;
  }
  host.querySelector('.fg-safe')?.classList.toggle('on', frameGuide.safe && r.Ae < 0.7);
}

// ------------------------------------------------------------
// Frame loop — called by editor-main
// ------------------------------------------------------------
export function renderFrame(dt) {
  const v = viewport;
  // Sky/ground follow active camera
  v.skyDome.position.copy(v.activeCam.position);
  v.sunGroup.lookAt(v.activeCam.position);
  v.sunGroup.rotateY(Math.PI);

  // Drift clouds
  v.clouds.forEach(c => {
    c.position.x += c.userData.speed * dt * 4;
    if (c.position.x > c.userData.startX + c.userData.range / 2) {
      c.position.x = c.userData.startX - c.userData.range / 2;
    }
    if (c.position.x < c.userData.startX - c.userData.range / 2) {
      c.position.x = c.userData.startX + c.userData.range / 2;
    }
  });

  // Adaptive zoom speed
  const dist = v.editorCam.position.distanceTo(v.controls.target);
  v.controls.zoomSpeed = THREE.MathUtils.clamp(dist / 18, 0.22, 1.0);
  v.controls.update();

  v.renderPass.camera = v.activeCam;

  const bloomOn = QUALITY[v.currentQuality].bloom && v.bloomPass.enabled;
  if (bloomOn) v.composer.render();
  else v.renderer.render(v.scene, v.activeCam);
}