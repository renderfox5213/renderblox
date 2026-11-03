// ============================================================
// RenderBlox shared helpers
// Imported by deditor.html and chareditor.html. Not used by index.html.
// ============================================================

// ---- Toast ----
let _toastTimer = null;
export function toast(msg, ms = 1800) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ---- HTML escape ----
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- Number formatting ----
export function fmt(n, decimals = 2) {
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}

// ---- File detection ----
// Returns 'old-json', 'zip', or 'unknown'
export async function detectRdbxFormat(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer.slice(0, 8));
  // Zip files start with "PK\x03\x04"
  if (bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return 'zip';
  }
  // Old format: "RDBX\x00\x00\x00\x09" header then JSON
  const header = new TextDecoder().decode(bytes);
  if (header.startsWith('RDBX')) return 'old-json';
  return 'unknown';
}

// ---- Keyboard modifier helpers ----
// Used by editors to decide if a shortcut should fire.
export function isTypingInInput() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

// ---- Recent files (localStorage) ----
const RECENT_KEY = 'renderblox_recent';

export function pushRecentFile({ name, type, size }) {
  try {
    const list = getRecentFiles();
    // De-dup by name
    const filtered = list.filter(f => f.name !== name);
    filtered.unshift({ name, type, size, time: Date.now() });
    // Keep only 8
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 8)));
  } catch {}
}

export function getRecentFiles() {
  try {
    const s = localStorage.getItem(RECENT_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function clearRecentFiles() {
  try { localStorage.removeItem(RECENT_KEY); } catch {}
}

// ---- Format helpers ----
export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// ---- Format time ----
export function formatRelativeTime(ms) {
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ms).toLocaleDateString();
}

// ---- Simple event emitter ----
// Used by editors for cross-module communication without tight coupling.
export class Emitter {
  constructor() { this.listeners = {}; }
  on(evt, fn) {
    (this.listeners[evt] ||= []).push(fn);
    return () => this.off(evt, fn);
  }
  off(evt, fn) {
    const arr = this.listeners[evt];
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i >= 0) arr.splice(i, 1);
  }
  emit(evt, ...args) {
    (this.listeners[evt] || []).forEach(fn => {
      try { fn(...args); } catch (e) { console.error(`[emitter ${evt}]`, e); }
    });
  }
}

// ---- Theme ----
const THEME_KEY = 'renderblox_theme';

export function applySavedTheme() {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    if (theme === 'dark') document.body.classList.add('dark');
  } catch {}
}

export function toggleTheme() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  try { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); } catch {}
  return isDark;
}

// ---- Clock (for consistent timekeeping across editors) ----
// Returns seconds since page load, useful for animation timing.
const _startTime = performance.now();
export function elapsedSeconds() {
  return (performance.now() - _startTime) / 1000;
}

// ---- Camera/gizmo bone fix ----
// NOTE: This is the fix for the "bone editor randomly doesn't work" bug.
// It lives here as documentation so both editors know the invariant.
//
// THE INVARIANT:
// TransformControls raycasts against `transformGizmo.camera`. If that
// doesn't match `activeCam` — the camera currently rendering the scene —
// clicking the gizmo appears to do nothing, because the click ray goes
// into a different point in space than the one you're looking at.
//
// Every time `activeCam` changes, you MUST do:
//     transformGizmo.camera = activeCam;
//     if (transformGizmo.object) {
//       const obj = transformGizmo.object;
//       transformGizmo.detach();
//       transformGizmo.attach(obj);
//     }
// The detach/attach pair forces TransformControls to recompute its world
// matrix against the new camera. Without it, the first frame after a
// camera switch uses the old camera and the click misses.
//
// Additionally, while dragging the gizmo you must NOT move the camera
// (i.e. skip applyCameraAtTime or similar) or the drag delta will be
// computed against a moving target and behave erratically.
export function syncGizmoCamera(transformGizmo, activeCam) {
  if (!transformGizmo) return;
  if (transformGizmo.camera === activeCam) return;
  transformGizmo.camera = activeCam;
  if (transformGizmo.object) {
    const obj = transformGizmo.object;
    transformGizmo.detach();
    transformGizmo.attach(obj);
  }
}