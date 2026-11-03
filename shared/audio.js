// ============================================================
// RenderBlox — Audio module
// Sound import, WebAudio playback, 3D positioning.
// Play-only — scrubbing is silent. Playback uses Space.
// ============================================================

import * as THREE from 'three';
import { soundStore } from './zip-io.js';
import { sceneState } from './scene.js';
import { toast } from './common.js';

let audioContext = null;
const activeSources = new Map(); // soundId -> { source, gain, panner }
const decodedBuffers = new Map(); // soundId -> AudioBuffer

// ------------------------------------------------------------
// Init — must be called from a user gesture (button click) for
// browser autoplay policy
// ------------------------------------------------------------
export function initAudio() {
  try { window.__renderbloxAudioCtx = (typeof audioContext !== 'undefined' && audioContext) || (typeof ctx !== 'undefined' && ctx); } catch {}
  if (audioContext) return;
  try {
    audioContext = new(window.AudioContext || window.webkitAudioContext)();
    console.log('[Audio] Context created, sample rate:', audioContext.sampleRate);
  } catch (err) {
    console.error('[Audio] Failed to create context:', err);
  }
}

export function getAudioContext() {
  return audioContext;
}

// ------------------------------------------------------------
// Decode — turns bytes into an AudioBuffer (cached)
// ------------------------------------------------------------
export async function decodeSound(soundId) {
  if (!audioContext) initAudio();
  if (!audioContext) throw new Error('WebAudio unavailable');
  
  if (decodedBuffers.has(soundId)) return decodedBuffers.get(soundId);
  
  const sound = soundStore.get(soundId);
  if (!sound) throw new Error('Sound not found: ' + soundId);
  
  const arrayBuffer = sound.bytes instanceof ArrayBuffer ?
    sound.bytes :
    sound.bytes.buffer;
  const buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  decodedBuffers.set(soundId, buffer);
  sound.duration = buffer.duration;
  return buffer;
}

// ------------------------------------------------------------
// Play a single sound (used for preview + scene playback)
// ------------------------------------------------------------
export function playSound(soundId, { startOffset = 0, loop = false } = {}) {
  if (!audioContext) initAudio();
  if (!audioContext) return null;
  
  const sound = soundStore.get(soundId);
  if (!sound || sound.muted) return null;
  
  const buffer = decodedBuffers.get(soundId);
  if (!buffer) {
    // Not decoded yet — decode then play
    decodeSound(soundId).then(() => playSound(soundId, { startOffset, loop }));
    return null;
  }
  
  stopSound(soundId);
  
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;
  
  const gain = audioContext.createGain();
  gain.gain.value = sound.volume;
  
  const panner = audioContext.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = 1;
  panner.maxDistance = 100;
  panner.rolloffFactor = 1;
  panner.positionX.value = sound.position[0];
  panner.positionY.value = sound.position[1];
  panner.positionZ.value = sound.position[2];
  
  source.connect(gain);
  gain.connect(panner);
  panner.connect(audioContext.destination);
  
  source.start(0, startOffset);
  
  const entry = { source, gain, panner };
  activeSources.set(soundId, entry);
  
  source.onended = () => {
    if (activeSources.get(soundId) === entry) {
      activeSources.delete(soundId);
    }
  };
  
  return entry;
}

export function stopSound(soundId) {
  const entry = activeSources.get(soundId);
  if (!entry) return;
  try { entry.source.stop(); } catch {}
  try { entry.source.disconnect(); } catch {}
  try { entry.gain.disconnect(); } catch {}
  try { entry.panner.disconnect(); } catch {}
  activeSources.delete(soundId);
}

export function stopAllSounds() {
  Array.from(activeSources.keys()).forEach(stopSound);
}

// ------------------------------------------------------------
// Scene playback — sync sounds with timeline
// Called when the user hits Space
// ------------------------------------------------------------
export function startSceneAudio() {
  if (!audioContext) initAudio();
  if (!audioContext) return;
  
  stopAllSounds();
  
  const t = sceneState.time;
  const sounds = soundStore.all();
  
  for (const sound of sounds) {
    if (sound.muted) continue;
    if (!decodedBuffers.has(sound.id)) continue;
    
    const buffer = decodedBuffers.get(sound.id);
    const relativeStart = sound.startTime - t;
    
    // Sound starts in the future — schedule it
    if (relativeStart > 0) {
      scheduleSound(sound.id, relativeStart);
      continue;
    }
    
    // Sound is currently within its clip
    const offset = t - sound.startTime;
    if (offset < buffer.duration) {
      playSound(sound.id, { startOffset: offset });
    }
    // Otherwise: sound has already finished — don't play
  }
}

function scheduleSound(soundId, delaySeconds) {
  setTimeout(() => {
    if (!sceneState.playing) return;
    playSound(soundId);
  }, delaySeconds * 1000 / sceneState.playbackSpeed);
}

// ------------------------------------------------------------
// Update panner positions from gizmo manipulation
// Called when the user drags a sound's gizmo
// ------------------------------------------------------------
export function updateSoundPosition(soundId, position) {
  const sound = soundStore.get(soundId);
  if (!sound) return;
  sound.position = [position.x, position.y, position.z];
  
  const entry = activeSources.get(soundId);
  if (entry) {
    entry.panner.positionX.value = position.x;
    entry.panner.positionY.value = position.y;
    entry.panner.positionZ.value = position.z;
  }
}

// ------------------------------------------------------------
// Volume/mute
// ------------------------------------------------------------
export function setSoundVolume(soundId, volume) {
  const sound = soundStore.get(soundId);
  if (!sound) return;
  sound.volume = Math.max(0, Math.min(1, volume));
  const entry = activeSources.get(soundId);
  if (entry) {
    entry.gain.gain.setValueAtTime(sound.volume, audioContext.currentTime);
  }
}

export function setSoundMuted(soundId, muted) {
  const sound = soundStore.get(soundId);
  if (!sound) return;
  sound.muted = !!muted;
  if (sound.muted) stopSound(soundId);
}

// ------------------------------------------------------------
// Listener position — update from active camera
// ------------------------------------------------------------
export function updateListenerFromCamera(camera) {
  if (!audioContext) return;
  const listener = audioContext.listener;
  const pos = camera.position;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  const up = new THREE.Vector3(0, 1, 0);
  
  if (listener.positionX) {
    // Modern API
    listener.positionX.value = pos.x;
    listener.positionY.value = pos.y;
    listener.positionZ.value = pos.z;
    listener.forwardX.value = forward.x;
    listener.forwardY.value = forward.y;
    listener.forwardZ.value = forward.z;
    listener.upX.value = up.x;
    listener.upY.value = up.y;
    listener.upZ.value = up.z;
  } else {
    // Legacy API
    listener.setPosition(pos.x, pos.y, pos.z);
    listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
  }
}

// ------------------------------------------------------------
// Import — async because decode is async
// ------------------------------------------------------------
export async function importSoundFromFile(file) {
  const bytes = await file.arrayBuffer();
  const name = file.name;
  const id = soundStore.register(name, bytes);
  
  // Try to decode immediately so we know the duration
  try {
    await decodeSound(id);
  } catch (err) {
    console.error('[Audio] Failed to decode imported sound:', err);
    soundStore.remove(id);
    throw new Error(`Could not decode "${name}". Supported formats: MP3, WAV, OGG.`);
  }
  
  const sound = soundStore.get(id);
  // Default to playing at current playhead time
  sound.startTime = sceneState.time;
  
  return sound;
}

// ------------------------------------------------------------
// Preview a sound from its beginning (used when clicking a clip)
// ------------------------------------------------------------
export function previewSound(soundId) {
  const sound = soundStore.get(soundId);
  if (!sound) return;
  playSound(soundId, { startOffset: 0 });
  // Auto-stop after 3 seconds so it doesn't overlap scene audio
  setTimeout(() => stopSound(soundId), 3000);
}

// ------------------------------------------------------------
// Cleanup
// ------------------------------------------------------------
export function disposeAudio() {
  stopAllSounds();
  decodedBuffers.clear();
  if (audioContext) {
    try { audioContext.close(); } catch {}
    audioContext = null;
  }
}