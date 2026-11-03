// ============================================================
// RenderBlox — Timeline module
// Three lanes: object keyframes, camera keyframes, audio clips.
// Scrub, drag, zoom, right-click delete. Exports helpers used
// by editor-main for playhead positioning and snapping.
// ============================================================

import { sceneState, getSelected, interpolateCamera } from './scene.js';
import { exportSettings } from './export.js';
import { toast } from './common.js';

// ------------------------------------------------------------
// Public state
// ------------------------------------------------------------
export const timelineState = {
  viewStart: 0,
  viewEnd: 10,
  snapToKeys: true,
  lastSnapTime: null,
  selectedSoundId: null,
  // Callbacks
  onTimeChanged: null,     // (time) => void
  onSelectionChanged: null, // (soundId | null) => void
  onSoundAdded: null,       // () => void
  onSoundDeleted: null,     // (soundId) => void
  onSoundMoved: null,       // (soundId) => void
  // Refs to DOM
  timelineEl: null,
  rulerEl: null,
  tracksEl: null,
  playheadEl: null,
  snapLineEl: null
};

// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------
const TRACK_HEIGHTS = { obj: 40, cam: 40 };
const RULER_HEIGHT = 22;
const CLIP_HEIGHT = 26;
const CLIP_ROW_HEIGHT = 30;

// ------------------------------------------------------------
// Coordinate conversion
// ------------------------------------------------------------
function timeToX(t) {
  const w = timelineState.timelineEl?.clientWidth || 0;
  const span = Math.max(0.001, timelineState.viewEnd - timelineState.viewStart);
  return ((t - timelineState.viewStart) / span) * w;
}

function xToTime(x) {
  const w = timelineState.timelineEl?.clientWidth || 0;
  const span = Math.max(0.001, timelineState.viewEnd - timelineState.viewStart);
  return timelineState.viewStart + (x / w) * span;
}

export function setViewRange(start, end) {
  timelineState.viewStart = Math.max(0, start);
  timelineState.viewEnd = Math.min(sceneState.duration, Math.max(start + 0.5, end));
  renderTimeline();
}

export function fitTimelineToDuration() {
  timelineState.viewStart = 0;
  timelineState.viewEnd = sceneState.duration;
  renderTimeline();
}

// ------------------------------------------------------------
// Snap
// ------------------------------------------------------------
export function snapTime(t) {
  if (!timelineState.snapToKeys) {
    timelineState.lastSnapTime = null;
    return t;
  }
  const obj = getSelected();
  const candidates = [0, sceneState.duration];
  if (obj) { for (const k of obj.keyframes) candidates.push(k.time); for (const k of (obj.lookKeys || [])) candidates.push(k.time); }
  for (const k of sceneState.camKeyframes) candidates.push(k.time);
  const span = Math.max(0.001, timelineState.viewEnd - timelineState.viewStart);
  const threshold = span * 0.018;
  let best = t, bd = threshold;
  for (const c of candidates) {
    const d = Math.abs(c - t);
    if (d < bd) { bd = d; best = c; }
  }
  timelineState.lastSnapTime = (best !== t) ? best : null;
  return best;
}

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
export function initTimeline({ timelineEl, rulerEl, tracksEl, playheadEl, snapLineEl }) {
  timelineState.timelineEl = timelineEl;
  timelineState.rulerEl = rulerEl;
  timelineState.tracksEl = tracksEl;
  timelineState.playheadEl = playheadEl;
  timelineState.snapLineEl = snapLineEl;

  // Scrub on ruler click
  rulerEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    handleScrub(e);
    const move = (ev) => handleScrub(ev);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setTimeout(() => {
        timelineState.lastSnapTime = null;
        updateSnapLine();
      }, 250);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });

  // Scrub on empty track area
  tracksEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.kf') || e.target.closest('.audio-clip') || e.target.closest('.audio-add-btn')) return;
    handleScrub(e);
    const move = (ev) => handleScrub(ev);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setTimeout(() => {
        timelineState.lastSnapTime = null;
        updateSnapLine();
      }, 250);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });

  // Playhead handle drag
  playheadEl.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    const move = (ev) => handleScrub(ev);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setTimeout(() => {
        timelineState.lastSnapTime = null;
        updateSnapLine();
      }, 250);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });

  // Wheel zoom on timeline
  timelineEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = timelineEl.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const w = timelineEl.clientWidth;
    const mT = xToTime(mx);
    const sp = timelineState.viewEnd - timelineState.viewStart;
    const fine = e.shiftKey ? 1.08 : 1.25;
    const f = e.deltaY > 0 ? fine : 1 / fine;
    let nsp = Math.max(0.5, Math.min(sceneState.duration, sp * f));
    const r = mx / w;
    let ns = mT - r * nsp;
    let ne = ns + nsp;
    if (ns < 0) { ns = 0; ne = nsp; }
    if (ne > sceneState.duration) { ne = sceneState.duration; ns = ne - nsp; }
    timelineState.viewStart = ns;
    timelineState.viewEnd = ne;
    renderTimeline();
  }, { passive: false });

  // Right-click deletes clips and keyframes
  tracksEl.addEventListener('contextmenu', e => e.preventDefault());

  renderTimeline();
}

function handleScrub(e) {
  const rect = timelineState.timelineEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const t = Math.max(0, Math.min(sceneState.duration, snapTime(xToTime(x))));
  sceneState.time = t;
  timelineState.onTimeChanged?.(t);
  updatePlayhead();
  updateSnapLine();
  sceneState.objects.forEach(o => { o.__lookPinned = false; });
  if (sceneState.objects.some(o => o.keyframes.length >= 1 || (o.lookKeys && o.lookKeys.length >= 1))) {
    sceneState.mode = 'keyframe';
  }
  // Apply camera keyframe to sceneCam
  const kf = interpolateCamera(t);
  if (kf && window.__renderbloxApplyCamera) {
    window.__renderbloxApplyCamera(t);
  }
}

// ------------------------------------------------------------
// Render
// ------------------------------------------------------------
export function renderTimeline() {
  if (!timelineState.timelineEl) return;
  renderRuler();
  renderTracks();
  updatePlayhead();
  updateHeader();
}

function renderRuler() {
  const rulerEl = timelineState.rulerEl;
  const w = timelineState.timelineEl.clientWidth;
  rulerEl.innerHTML = '';
  const span = Math.max(0.001, timelineState.viewEnd - timelineState.viewStart);
  let step;
  if (span <= 1) step = 0.1;
  else if (span <= 3) step = 0.25;
  else if (span <= 8) step = 0.5;
  else if (span <= 20) step = 1;
  else if (span <= 60) step = 2;
  else step = 5;

  const first = Math.ceil(timelineState.viewStart / step) * step;
  for (let t = first; t <= timelineState.viewEnd + 0.001; t += step) {
    const x = timeToX(t);
    if (x < -20 || x > w + 20) continue;
    const tick = document.createElement('div');
    tick.className = 'tick' + (Math.abs(t % 1) < 0.001 || step >= 1 ? ' major' : '');
    tick.style.left = x + 'px';
    tick.textContent = t.toFixed(step < 1 ? 1 : 0) + 's';
    rulerEl.appendChild(tick);
  }
}

function renderTracks() {
  const tracksEl = timelineState.tracksEl;
  tracksEl.innerHTML = '';

  // Object track
  const objTrack = document.createElement('div');
  objTrack.className = 'track track-obj';
  objTrack.innerHTML = '<div class="track-label">Objects</div>';
  renderObjectKeys(objTrack);
  tracksEl.appendChild(objTrack);

  // Look track (colour / opacity / face keys)
  const lookTrack = document.createElement('div');
  lookTrack.className = 'track track-look';
  lookTrack.innerHTML = '<div class="track-label look">Look</div>';
  renderLookKeys(lookTrack);
  tracksEl.appendChild(lookTrack);

  // Camera track
  const camTrack = document.createElement('div');
  camTrack.className = 'track track-cam';
  camTrack.innerHTML = '<div class="track-label cam">Camera</div>';
  renderCameraKeys(camTrack);
  tracksEl.appendChild(camTrack);

}

function renderObjectKeys(parent) {
  const obj = getSelected();
  if (!obj || obj.keyframes.length === 0) return;

  obj.keyframes.forEach((kf, idx) => {
    if (kf.time < timelineState.viewStart - 0.1 || kf.time > timelineState.viewEnd + 0.1) return;
    const el = document.createElement('div');
    const interp = kf.interp || 'ease';
    el.className = 'kf ' + interp;
    el.style.left = timeToX(kf.time) + 'px';
    el.style.top = '50%';
    el.title = `t=${kf.time.toFixed(2)}s · ${interp}`;

    el.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (e.button === 2) {
        if (confirm('Delete this keyframe?')) {
          obj.keyframes.splice(idx, 1);
          renderTimeline();
          window.__renderbloxRefreshProperties?.();
          window.__renderbloxPushHistory?.('Delete Key');
        }
        return;
      }
      const sx = e.clientX, st = kf.time;
      const w = timelineState.timelineEl.clientWidth;
      const move = (ev) => {
        const dx = ev.clientX - sx;
        const sp = Math.max(0.001, timelineState.viewEnd - timelineState.viewStart);
        kf.time = Math.max(0, Math.min(sceneState.duration, st + (dx / w) * sp));
        el.style.left = timeToX(kf.time) + 'px';
        obj.keyframes.sort((a, b) => a.time - b.time);
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        renderTimeline();
        window.__renderbloxPushHistory?.('Move Keyframe');
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
    el.addEventListener('dblclick', () => {
      sceneState.time = kf.time;
      window.__renderbloxRefreshPlayhead?.();
    });
    parent.appendChild(el);
  });
}


function renderLookKeys(parent) {
  const obj = getSelected();
  if (!obj || !obj.lookKeys || obj.lookKeys.length === 0) return;
  obj.lookKeys.forEach((kf, idx) => {
    if (kf.time < timelineState.viewStart - 0.1 || kf.time > timelineState.viewEnd + 0.1) return;
    const el = document.createElement('div');
    const interp = kf.interp || 'ease';
    el.className = 'kf look ' + interp;
    el.style.left = timeToX(kf.time) + 'px';
    el.style.top = '50%';
    const first = kf.look?.parts?.[0]?.c;
    if (first) el.style.background = `rgb(${first.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255)).join(',')})`;
    el.title = `LOOK t=${kf.time.toFixed(2)}s · ${interp}${kf.look?.face ? ' · face: ' + kf.look.face : ''}`;
    el.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (e.button === 2) {
        if (confirm('Delete this look key?')) {
          obj.lookKeys.splice(idx, 1);
          renderTimeline();
          window.__renderbloxPushHistory?.('Delete Look Key');
        }
        return;
      }
      const sx = e.clientX, st = kf.time;
      const w = timelineState.timelineEl.clientWidth;
      const move = (ev) => {
        const sp = Math.max(0.001, timelineState.viewEnd - timelineState.viewStart);
        kf.time = Math.max(0, Math.min(sceneState.duration, st + ((ev.clientX - sx) / w) * sp));
        el.style.left = timeToX(kf.time) + 'px';
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        obj.lookKeys.sort((a, b) => a.time - b.time);
        renderTimeline();
        window.__renderbloxPushHistory?.('Move Look Key');
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
    el.addEventListener('dblclick', () => {
      sceneState.time = kf.time;
      sceneState.objects.forEach(o => { o.__lookPinned = false; });
      sceneState.mode = 'keyframe';
      window.__renderbloxRefreshPlayhead?.();
    });
    parent.appendChild(el);
  });
}

function renderCameraKeys(parent) {
  sceneState.camKeyframes.forEach((kf, idx) => {
    if (kf.time < timelineState.viewStart - 0.1 || kf.time > timelineState.viewEnd + 0.1) return;
    const el = document.createElement('div');
    el.className = 'kf cam';
    el.style.left = timeToX(kf.time) + 'px';
    el.style.top = '50%';
    el.title = `CAM t=${kf.time.toFixed(2)}s fov=${kf.fov.toFixed(0)}°`;

    el.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (e.button === 2) {
        if (confirm('Delete this camera key?')) {
          sceneState.camKeyframes.splice(idx, 1);
          renderTimeline();
          window.__renderbloxRefreshCamera?.();
          window.__renderbloxPushHistory?.('Delete Cam Key');
        }
        return;
      }
      const sx = e.clientX, st = kf.time;
      const w = timelineState.timelineEl.clientWidth;
      const move = (ev) => {
        const dx = ev.clientX - sx;
        const sp = Math.max(0.001, timelineState.viewEnd - timelineState.viewStart);
        kf.time = Math.max(0, Math.min(sceneState.duration, st + (dx / w) * sp));
        el.style.left = timeToX(kf.time) + 'px';
        sceneState.camKeyframes.sort((a, b) => a.time - b.time);
      };
      const up = () => {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        renderTimeline();
        window.__renderbloxPushHistory?.('Move Cam Key');
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
    parent.appendChild(el);
  });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ------------------------------------------------------------
// Playhead / snap line
// ------------------------------------------------------------
export function updatePlayhead() {
  const playheadEl = timelineState.playheadEl;
  if (!playheadEl) return;
  const t = sceneState.time;
  if (t < timelineState.viewStart || t > timelineState.viewEnd) {
    playheadEl.style.opacity = 0;
  } else {
    playheadEl.style.opacity = 1;
    playheadEl.style.left = timeToX(t) + 'px';
  }
  const timeDisplay = document.getElementById('timeDisplay');
  const vTime = document.getElementById('vTime');
  if (timeDisplay && document.activeElement !== timeDisplay) timeDisplay.value = t.toFixed(2);
  if (vTime) vTime.textContent = t.toFixed(2) + 's';
}

function updateSnapLine() {
  const snapLineEl = timelineState.snapLineEl;
  if (!snapLineEl) return;
  if (timelineState.lastSnapTime == null) {
    snapLineEl.classList.remove('on');
    return;
  }
  snapLineEl.style.left = timeToX(timelineState.lastSnapTime) + 'px';
  snapLineEl.classList.add('on');
}

function updateHeader() {
  const obj = getSelected();
  const hKeys = document.getElementById('hKeys');
  const hCamKeys = document.getElementById('hCamKeys');
  const hBoneKeys = document.getElementById('hBoneKeys');
  const hDur = document.getElementById('hDur');
  const hLookKeys = document.getElementById('hLookKeys');
  if (hLookKeys) hLookKeys.textContent = obj ? (obj.lookKeys || []).length : 0;

  if (hKeys) hKeys.textContent = obj ? obj.keyframes.length : 0;
  if (hCamKeys) hCamKeys.textContent = sceneState.camKeyframes.length;
  if (hBoneKeys) {
    if (obj) {
      const hasBones = obj.keyframes.some(k => k.bones);
      hBoneKeys.textContent = hasBones ? '✓' : '—';
    } else {
      hBoneKeys.textContent = '—';
    }
  }
  if (hDur) hDur.textContent = sceneState.duration.toFixed(1) + 's';
}