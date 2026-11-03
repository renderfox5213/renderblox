// ============================================================
// RenderBlox — Video export module
// Accurate (frame-by-frame via WebCodecs + muxer) and Quick
// (real-time MediaRecorder). MP4 conversion via Mediabunny.
// ============================================================

import { Input, Output, Conversion, ALL_FORMATS, BlobSource, Mp4OutputFormat, BufferTarget, QUALITY_HIGH } from 'mediabunny';
import { toast } from './common.js';
import { sceneState, interpolateKeyframes, interpolateCamera, applyKeyframeToObject, applyPreset, applyLookAt } from './scene.js';

// ------------------------------------------------------------
// Export tips (rotating messages during export)
// ------------------------------------------------------------
const EXPORT_TIPS = [
  { em:'💡', text:'Tip: New keyframes default to Ease — natural acceleration, unlike Linear\'s constant speed.' },
  { em:'🎬', text:'Quick mode takes exactly the length of your clip. Accurate mode takes however long your GPU wants.' },
  { em:'🦴', text:'Tip: In Bone mode, click a body part in the viewport to attach the gizmo directly to that bone.' },
  { em:'⏱️', text:'Joke: Why did the animator go to therapy? Too many unresolved keyframes.' },
  { em:'📐', text:'Tip: Scale has SX/SY/SZ sliders. Use Uniform to lock them together.' },
  { em:'🎥', text:'Tip: For a walk, click "Place Walk (FPV)", fly to the destination, press Enter, then type the duration.' },
  { em:'🖌️', text:'Tip: Appearance tab → click any body part to paint just that part. Nothing bleeds to other characters.' },
  { em:'😅', text:'Joke: My R6 walked into a bar. The bartender said "we don\'t serve rigged characters."' },
  { em:'🎨', text:'Tip: Upload a transparent PNG as a Face Decal — RenderBlox projects it onto the head and hides the default face.' },
  { em:'📼', text:'Tip: MP4 with H.264 is the most compatible format. Use it for CapCut, Premiere, iMovie.' },
  { em:'🔥', text:'Joke: I told my GPU I was exporting 4K at 60fps. It said "lol." Then it said "no."' },
  { em:'🧊', text:'Tip: If export is hot, drop to 720p. Nobody will notice in a Discord clip.' },
  { em:'🎭', text:'Tip: Duplicate an R6 (Ctrl+D) to have two characters face each other — dance-off guaranteed.' },
  { em:'💾', text:'Tip: Ctrl+S saves the whole scene as .rdbx — colors, keys, attachments, everything.' },
  { em:'🌈', text:'Tip: Bloom is auto-disabled during Accurate export for speed — it stays on in preview.' },
  { em:'⏳', text:'Fact: A 10-second clip at 30fps is 300 individual frames. You are generating a small film.' },
  { em:'🛠️', text:'Tip: MP4 is auto-converted from WebM using Mediabunny — hardware-accelerated.' },
  { em:'⚡', text:'Tip: Quick export is great for iteration. Use Accurate for your final render.' }
];

let tipBag = [];
let tipInterval = null;

function pickTip() {
  if (tipBag.length === 0) {
    tipBag = [...EXPORT_TIPS].sort(() => Math.random() - 0.5);
  }
  return tipBag.pop();
}

function startTipRotation() {
  const el = document.getElementById('po-tip');
  if (!el) return;
  const tipTextEl = document.getElementById('po-tip-text');
  const tipEmEl = el.querySelector('.em');
  const apply = () => {
    const t = pickTip();
    el.classList.add('fade');
    setTimeout(() => {
      if (tipEmEl) tipEmEl.textContent = t.em;
      if (tipTextEl) tipTextEl.textContent = t.text;
      el.classList.remove('fade');
    }, 220);
  };
  apply();
  tipInterval = setInterval(apply, 4200);
}

function stopTipRotation() {
  if (tipInterval) { clearInterval(tipInterval); tipInterval = null; }
}

// ------------------------------------------------------------
// Progress overlay
// ------------------------------------------------------------
function showProgress(title, sub) {
  const titleEl = document.getElementById('po-title');
  const overlay = document.getElementById('progress-overlay');
  if (titleEl) titleEl.textContent = title || '📹 Rendering frames…';
  if (overlay) overlay.classList.add('on');
  updateProgress(0, sub || 'Preparing…');
  startTipRotation();
}

function updateProgress(p, txt) {
  const fill = document.getElementById('po-fill');
  const sub = document.getElementById('po-sub');
  if (fill) fill.style.width = Math.round(p * 100) + '%';
  if (sub) sub.textContent = txt || (Math.round(p * 100) + '%');
}

function hideProgress() {
  stopTipRotation();
  const overlay = document.getElementById('progress-overlay');
  if (overlay) overlay.classList.remove('on');
}

// ------------------------------------------------------------
// The state object — set by editor-main to give us access to
// rendering, cameras, gizmo, etc. without circular imports
// ------------------------------------------------------------
export const exportContext = {
  renderer: null,
  scene: null,
  sceneCam: null,
  activeCam: null,
  renderPass: null,
  composer: null,
  bloomPass: null,
  skyDome: null,
  sunGroup: null,
  transformGizmo: null,
  camHelper: null,
  skeletonOverlay: null,
  sun: null,
  cancelRequested: false,
  onStateChange: null, // called when exporting changes true/false
  prepare: null,        // async hook: preload face textures etc. before rendering
  refreshProjection: null // re-applies the frame-guide projection after export
};

export const exportSettings = {
  mode: 'accurate',
  res: '1920x1080',
  fps: 30,
  format: 'mp4',
  bitrate: 8000000,
  quality: 8,
  noBloom: true,
  smallShadow: true
};

// Load from localStorage
try {
  const s = localStorage.getItem('renderblox_export_v7');
  if (s) Object.assign(exportSettings, JSON.parse(s));
} catch {}

export function saveExportSettings() {
  try {
    localStorage.setItem('renderblox_export_v7', JSON.stringify(exportSettings));
  } catch {}
}

// ------------------------------------------------------------
// Accurate export — frame-by-frame, deterministic
// ------------------------------------------------------------
async function accurateExport(rw, rh, fps, duration) {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    throw new Error('WebCodecs not available in this browser.');
  }

  const totalFrames = Math.max(1, Math.round(duration * fps));

  // Force renderer to export resolution (otherwise encoder captures viewport canvas size)
  const _r = exportContext.renderer;
  const _prevW = _r.domElement.width;
  const _prevH = _r.domElement.height;
  _r.setSize(rw, rh, false);
  const _prevAspect = exportContext.sceneCam.aspect;
  exportContext.sceneCam.aspect = rw / rh;
  exportContext.sceneCam.updateProjectionMatrix();
  if (exportContext.composer) exportContext.composer.setSize(rw, rh);
  const _restoreCanvas = () => {
    _r.setSize(_prevW, _prevH, false);
    exportContext.sceneCam.aspect = _prevAspect;
    exportContext.sceneCam.updateProjectionMatrix();
    if (exportContext.composer) exportContext.composer.setSize(_prevW, _prevH);
  };

  const pick = {
    container: 'webm',
    codec: 'vp09.00.10.08',
    muxCodec: 'V_VP9',
    ext: 'webm',
    mime: 'video/webm'
  };

  const config = {
    codec: pick.codec,
    width: rw,
    height: rh,
    bitrate: exportSettings.bitrate,
    framerate: fps
  };

  const support = await VideoEncoder.isConfigSupported(config);
  if (!support.supported) {
    throw new Error(`Browser can't encode ${pick.codec} at ${rw}×${rh}.`);
  }

  const mod = await import('https://unpkg.com/webm-muxer@5/build/webm-muxer.mjs');
  const target = new mod.ArrayBufferTarget();
  const muxer = new mod.Muxer({
    target,
    video: { codec: pick.muxCodec, width: rw, height: rh, frameRate: fps },
    fastStart: 'in-memory'
  });

  let encError = null;
  let chunkBuffer = [];
  const flushChunks = () => {
    if (!chunkBuffer.length) return;
    chunkBuffer.sort((a, b) => a.chunk.timestamp - b.chunk.timestamp);
    for (const { chunk, meta } of chunkBuffer) {
      try { muxer.addVideoChunk(chunk, meta); }
      catch (e) { encError = e; return; }
    }
    chunkBuffer = [];
  };

  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      chunkBuffer.push({ chunk, meta });
      if (chunkBuffer.length >= Math.max(30, fps * 3)) flushChunks();
    },
    error: (e) => { encError = e; }
  });
  encoder.configure(config);

  const microsPerFrame = 1e6 / fps;
  const gopSize = Math.max(1, Math.round(fps * 2));

  for (let i = 0; i < totalFrames; i++) {
    if (exportContext.cancelRequested) {
      try { encoder.close(); } catch {}
      throw new Error('cancelled');
    }
    if (encError) throw encError;

    const t = i / fps;
    evaluateSceneAt(t);
    renderFrameForExport();

    const frame = new VideoFrame(exportContext.renderer.domElement, {
      timestamp: Math.round(i * microsPerFrame),
      duration: Math.round(microsPerFrame)
    });
    encoder.encode(frame, { keyFrame: (i % gopSize) === 0 });
    frame.close();

    while (encoder.encodeQueueSize > 12) {
      await new Promise(r => setTimeout(r, 2));
      if (encError) throw encError;
    }

    if (i % 2 === 0 || i === totalFrames - 1) {
      updateProgress((i + 1) / totalFrames, `Rendering frame ${i + 1} / ${totalFrames}`);
      await new Promise(r => setTimeout(r, 0));
    }
  }

  await encoder.flush();
  encoder.close();
  flushChunks();
  if (encError) throw encError;
  muxer.finalize();

  const webmBlob = new Blob([target.buffer], { type: 'video/webm' });

  if (exportSettings.format !== 'mp4') {
    _restoreCanvas();
    return { blob: webmBlob, ext: 'webm' };
  }

  updateProgress(1, 'Converting WebM → MP4…');
  const input = new Input({ source: new BlobSource(webmBlob), formats: ALL_FORMATS });
  const mp4Output = new Output({
    format: new Mp4OutputFormat(),
    target: new BufferTarget()
  });
  const conversion = await Conversion.init({
    input,
    output: mp4Output,
    video: { codec: 'avc', bitrate: QUALITY_HIGH }
  });
  await conversion.execute();
  const mp4Blob = new Blob([mp4Output.target.buffer], { type: 'video/mp4' });
  _restoreCanvas();
  return { blob: mp4Blob, ext: 'mp4' };
}

// ------------------------------------------------------------
// Quick export — real-time MediaRecorder
// ------------------------------------------------------------
function quickExport(rw, rh, fps, duration) {
  // Match accurateExport: force renderer to export resolution so
  // captureStream() grabs the frame at rw x rh, not viewport size.
  const _r = exportContext.renderer;
  const _prevW = _r.domElement.width;
  const _prevH = _r.domElement.height;
  _r.setSize(rw, rh, false);
  const _prevAspect = exportContext.sceneCam.aspect;
  exportContext.sceneCam.aspect = rw / rh;
  exportContext.sceneCam.updateProjectionMatrix();
  if (exportContext.composer) exportContext.composer.setSize(rw, rh);
  const _restoreCanvas = () => {
    _r.setSize(_prevW, _prevH, false);
    exportContext.sceneCam.aspect = _prevAspect;
    exportContext.sceneCam.updateProjectionMatrix();
    if (exportContext.composer) exportContext.composer.setSize(_prevW, _prevH);
  };

  return new Promise((resolve, reject) => {
    let tries;
    if (exportSettings.format === 'mp4') {
      tries = ['video/mp4;codecs=h264', 'video/mp4'];
    } else if (exportSettings.format === 'webm-vp9') {
      tries = ['video/webm;codecs=vp9', 'video/webm'];
    } else if (exportSettings.format === 'webm-vp8') {
      tries = ['video/webm;codecs=vp8', 'video/webm'];
    } else {
      tries = ['video/mp4;codecs=h264', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
    }

    let mimeType = '';
    for (const t of tries) {
      if (MediaRecorder.isTypeSupported(t)) { mimeType = t; break; }
    }
    if (!mimeType) {
      reject(new Error('No supported recording codec.'));
      return;
    }

    const stream = exportContext.renderer.domElement.captureStream(fps);
    const chunks = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: exportSettings.bitrate
    });

    let progressTimer = null;
    let watcherTimer = null;
    let stopped = false;

    const stopTimers = () => {
      if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
      if (watcherTimer) { clearInterval(watcherTimer); watcherTimer = null; }
    };

    const finish = (fn) => {
      if (stopped) return;
      stopped = true;
      stopTimers();
      sceneState.playing = false;
      fn();
    };

    recorder.ondataavailable = e => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    recorder.onerror = (e) => finish(() => { _restoreCanvas(); reject(e.error || new Error('MediaRecorder error')); });
    recorder.onstop = () => finish(async () => {
      _restoreCanvas();
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const rawBlob = new Blob(chunks, { type: mimeType.split(';')[0] });

      // If the user wants MP4 but the recorder only produced WebM,
      // transcode via Mediabunny (hardware-accelerated in modern browsers).
      if (exportSettings.format === 'mp4' && ext !== 'mp4') {
        try {
          updateProgress(0.99, 'Converting WebM to MP4...');
          const input = new Input({ source: new BlobSource(rawBlob), formats: ALL_FORMATS });
          const mp4Output = new Output({
            format: new Mp4OutputFormat(),
            target: new BufferTarget()
          });
          const conversion = await Conversion.init({
            input, output: mp4Output,
            video: { codec: 'avc', bitrate: QUALITY_HIGH }
          });
          await conversion.execute();
          const mp4Blob = new Blob([mp4Output.target.buffer], { type: 'video/mp4' });
          resolve({ blob: mp4Blob, ext: 'mp4', actualMime: 'video/mp4' });
          return;
        } catch (err) {
          console.warn('[QuickExport] MP4 conversion failed, falling back to WebM:', err);
          toast('MP4 conversion failed - saved as WebM instead');
        }
      }
      resolve({ blob: rawBlob, ext, actualMime: mimeType });
    });

    sceneState.time = 0;
    sceneState.playing = false;

    try { recorder.start(250); }
    catch (err) { finish(() => reject(err)); return; }

    // Seed one synchronous frame so the first recorder chunk is not blank.
    try { renderFrameForExport(); } catch (e) { console.warn('pre-render failed', e); }

    // Now let the timeline drive.
    sceneState.playing = true;

    const startedAt = performance.now();
    progressTimer = setInterval(() => {
      const elapsed = (performance.now() - startedAt) / 1000;
      updateProgress(Math.min(1, elapsed / duration),
        `Recording ${elapsed.toFixed(1)} / ${duration.toFixed(1)}s`);
      if (exportContext.cancelRequested) {
        stopTimers();
        try { recorder.stop(); } catch {}
      }
    }, 100);

    watcherTimer = setInterval(() => {
      const done = sceneState.time >= duration - 0.001;
      if (done || exportContext.cancelRequested) {
        clearInterval(watcherTimer);
        watcherTimer = null;
        sceneState.playing = false;
        setTimeout(() => {
          if (recorder.state !== 'inactive') {
            try { recorder.stop(); } catch {}
          }
        }, 400);
      }
    }, 60);
  });
}

// ------------------------------------------------------------
// Scene evaluation for accurate export
// ------------------------------------------------------------
function evaluateSceneAt(t) {
  sceneState.objects.forEach(obj => {
    if (obj.keyframes && obj.keyframes.length >= 1) {
      const kf = interpolateKeyframes(obj, t);
      if (kf) applyKeyframeToObject(obj, kf);
    } else if (obj.type === 'r6') {
      applyPreset(obj, obj.currentAction, t);
    }
    if (obj.lookKeys && obj.lookKeys.length) applyLookAt(obj, t);
  });
  applyCameraAtTime(t);
  sceneState.time = t;
}

function applyCameraAtTime(t) {
  const sceneCam = exportContext.sceneCam;
  if (!sceneCam) return;
  const kf = interpolateCamera(t);
  if (!kf) return;
  sceneCam.position.set(...kf.pos);
  sceneCam.quaternion.set(...kf.quat);
  if (sceneCam.fov !== kf.fov) {
    sceneCam.fov = kf.fov;
    sceneCam.updateProjectionMatrix();
  }
}

function renderFrameForExport() {
  const {
    renderer, scene, sceneCam, renderPass, skyDome, sunGroup
  } = exportContext;
  skyDome.position.copy(sceneCam.position);
  sunGroup.lookAt(sceneCam.position);
  sunGroup.rotateY(Math.PI);
  renderPass.camera = sceneCam;
  renderer.render(scene, sceneCam);
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------
export async function exportVideo() {
  const isQuick = exportSettings.mode === 'quick';
  const [rw, rh] = exportSettings.res.split('x').map(Number);
  const fps = exportSettings.fps;
  const duration = sceneState.duration;
  const requestedFormat = exportSettings.format;

  if (duration <= 0) {
    toast('Cannot export a zero-length clip.');
    return;
  }

  // Save state for restoration
  const saved = {
    time: sceneState.time,
    playing: sceneState.playing,
    camKeyframes: JSON.parse(JSON.stringify(sceneState.camKeyframes)),
    bloomEnabled: exportContext.bloomPass?.enabled,
    shadowEnabled: exportContext.sun?.castShadow,
    shadowSize: exportContext.sun?.shadow?.mapSize?.x,
    pixelRatio: exportContext.renderer.getPixelRatio(),
    canvasW: exportContext.renderer.domElement.width,
    canvasH: exportContext.renderer.domElement.height,
    sceneAspect: exportContext.sceneCam.aspect
  };

  try { await exportContext.prepare?.(); } catch (e) { console.warn('export prepare failed', e); }

  // Enter export mode
  exportContext.cancelRequested = false;
  sceneState.playing = false;
  exportContext.onStateChange?.(true);

  if (exportContext.transformGizmo) {
    exportContext.transformGizmo.visible = false;
    exportContext.transformGizmo.enabled = false;
    exportContext.transformGizmo.detach();
  }
  if (exportContext.camHelper) exportContext.camHelper.visible = false;
  if (exportContext.skeletonOverlay) exportContext.skeletonOverlay.visible = false;

  const q = exportSettings.quality || 8;
  const qs = exportContext.sun;
  const qb = exportContext.bloomPass;
  
  // Apply quality logic BEFORE export starts
  if (!isQuick) {
    if (q <= 3) {
      if (qs) { qs.castShadow = false; }
      if (qb) { qb.enabled = false; }
    } else if (q <= 7) {
      if (qs) { 
        qs.castShadow = true; 
        qs.shadow.mapSize.set(1024, 1024); 
      }
      if (qb) { qb.enabled = false; }
    } else {
      if (qs) { 
        qs.castShadow = true; 
        qs.shadow.mapSize.set(2048, 2048); 
      }
      if (qb) { qb.enabled = true; }
    }
  }
    if (exportSettings.noBloom && exportContext.bloomPass) {
      exportContext.bloomPass.enabled = false;
    }
    if (exportSettings.smallShadow && exportContext.sun) {
      exportContext.sun.shadow.mapSize.set(1024, 1024);
      if (exportContext.sun.shadow.map) {
        exportContext.sun.shadow.map.dispose();
        exportContext.sun.shadow.map = null;
      }
    }

  showProgress(isQuick ? 'Recording...' : 'Rendering frames...');

  let result = null;
  try {
    if (isQuick) {
      result = await quickExport(rw, rh, fps, duration);
    } else {
      result = await accurateExport(rw, rh, fps, duration);
    }
  } catch (err) {
    console.error(err);
    toast(exportContext.cancelRequested ? 'Export cancelled' : ('Export failed: ' + err.message));
  } finally {
    hideProgress();

    sceneState.time = saved.time;
    sceneState.playing = saved.playing;
    sceneState.camKeyframes = saved.camKeyframes;
    if (exportContext.bloomPass && saved.bloomEnabled !== undefined) {
      exportContext.bloomPass.enabled = saved.bloomEnabled;
    }
    if (exportContext.sun) {
      if (saved.shadowEnabled !== undefined) exportContext.sun.castShadow = saved.shadowEnabled;
      if (saved.shadowSize) {
        exportContext.sun.shadow.mapSize.set(saved.shadowSize, saved.shadowSize);
        if (exportContext.sun.shadow.map) {
          exportContext.sun.shadow.map.dispose();
          exportContext.sun.shadow.map = null;
        }
      }
    }
    if (saved.canvasW && saved.canvasH && exportContext.renderer) {
      exportContext.renderer.setSize(saved.canvasW, saved.canvasH, false);
      if (exportContext.sceneCam) {
        exportContext.sceneCam.aspect = saved.sceneAspect;
        exportContext.sceneCam.updateProjectionMatrix();
      }
      if (exportContext.composer) exportContext.composer.setSize(saved.canvasW, saved.canvasH);
    }
    if (exportContext.transformGizmo) exportContext.transformGizmo.enabled = true;
    if (exportContext.camHelper) exportContext.camHelper.visible = true;
    exportContext.cancelRequested = false;
    exportContext.onStateChange?.(false);
  }

  if (result && result.blob) {
    const name = `renderblox_${Date.now()}.${result.ext}`;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(`Exported ${name} (${(result.blob.size / (1024 * 1024)).toFixed(1)} MB)`);
  }
}

export function cancelExport() {
  exportContext.cancelRequested = true;
}
