# 🎭 RenderBlox

### Make Roblox R6 animations in your browser — no Blender required.

**Live at [renderblox.vercel.app](https://renderblox.vercel.app)**

[![Live](https://img.shields.io/badge/live-renderblox.vercel.app-ff6b35?style=for-the-badge)](https://renderblox.vercel.app)
[![Made with Three.js](https://img.shields.io/badge/Three.js-r160-black?style=for-the-badge&logo=three.js)](https://threejs.org)
[![Powered by WebCodecs](https://img.shields.io/badge/WebCodecs-Enabled-3b82f6?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-22c55e?style=for-the-badge)](docs.md#contributing)

**Build a character → pose it → animate it → export a video.**
All inside a browser tab. All free. All open.

---

## ✨ What is RenderBlox?

**RenderBlox** is a browser-based animation studio for **Roblox R6 characters**. If you've ever tried to make a short Roblox skit, a meme, or a full-blown short film and bounced off Blender's 40-hour learning curve, RenderBlox is what you're looking for.

It's two tools that feed each other:

| Tool | URL | What it does |
|------|-----|--------------|
| 🎭 **Character Maker** | `/chareditor.html` | Build, colour, pose, and decorate a Roblox R6. Export as `.rx6`. |
| 🎬 **Scene Editor** | `/editor.html` | Place characters, add lights and props, keyframe everything, export a finished **MP4**. |
| 📁 **Landing Page** | `/index.html` | Drop a `.rdbx` or `.rx6` file and it opens the right tool automatically. |

> 💡 **The workflow:** Make your characters in the Character Maker → save each one as a `.rx6` → import them all into the Scene Editor → animate and render.

---

## 🎯 Why does this exist?

Making Roblox animations in Blender means:

- Installing a 500 MB program
- Learning 20 different workspaces
- Manually installing the Roblox rigs
- A render pipeline that takes minutes for a single clip
- Exporting through FFmpeg
- Having a PC that doesn't catch fire

RenderBlox means:

- Open a tab
- Drag a slider
- Hit **Export Video**
- Done

The whole app is a **single-page web app** — three HTML files, a shared JavaScript layer, and the two R6 rigs. Nothing gets installed. The heaviest operation is WASM-level video encoding through WebCodecs.

---

## 🚀 Features at a glance

### 🎭 Character Maker (`/chareditor.html`)

- **Male and female R6 rigs** — both included, both rigged correctly
- **Six pose presets** — Idle, Wave, Point, Walk, Dance, Rest
- **Bone mode** — click any body part, rotate it with a gizmo
- **Per-limb colouring** — paint the head, torso, arms, and legs independently
- **Amputation engine** — delete limbs entirely with a GPU shader (yes, really)
- **Face decal system** — 300+ altiwyre-style SVG faces built in, plus custom PNG uploads
- **Attachments** — top hats, imported GLB models, custom text, primitive boxes
- **Undo / redo** — 60-step history
- **`.rx6` export** — one file, everything included (no external assets needed)

### 🎬 Scene Editor (`/editor.html`)

- **Multi-character scenes** — import as many R6s as you want
- **Primitives** — box, sphere, cylinder, cone, plane, torus
- **Point lights** with colour and intensity
- **Full timeline** with three separate tracks:
  - **Objects** — keyframe position, rotation, scale, and bones
  - **Camera** — keyframe position, rotation, and FOV
  - **Look** — keyframe colour, opacity, glow, visibility, and face swaps
- **Three interpolation modes** — Linear, Ease, Step
- **FPV mode** — fly through the scene with WASD, place camera keys live
- **Walk setup** — point where the character should walk, enter the duration, get a baked walk animation
- **Auto-key** — every edit drops a key at the playhead
- **Frame guide** — outlines the export framing for Shorts / YouTube / Square / Portrait
- **One-click Look effects** — fade in/out, flash, rainbow, glow pulse
- **Video export** — MP4 (H.264) via WebCodecs + Mediabunny, or WebM VP8/VP9
- **Save / load `.rdbx`** — zip-based scenes with all assets and audio embedded

### 🎥 Export pipeline

- **Accurate mode** — frame-by-frame, deterministic, same output on every machine
- **Quick mode** — real-time recording, takes exactly as long as your clip
- **Ten resolution presets** — from 640×360 to 4K, including Shorts 9:16, Square 1:1, Portrait 4:5
- **Four bitrate options** — 4 to 25 Mbps
- **Quality slider 1–10** — from "no lights no shadows" to "max bloom 4K shadows"
- **Hardware-accelerated MP4 muxing** via Mediabunny

---

## 🧱 Quick start

1. Go to **[renderblox.vercel.app](https://renderblox.vercel.app)**
2. Click **Character Maker** to build a character
3. Choose **♂ male** or **♀ female**
4. Pose it, paint it, give it a face, add a hat
5. Click **Save .rx6**
6. Go back, open the **Scene Editor**
7. Import your `.rx6`, add a camera, animate it
8. Hit **Export Video**
9. Post the MP4. Get famous.

That's it. No account, no login, no upload limit.

---

## ⌨️ Keyboard shortcuts

### Character Maker

| Key | Action |
|-----|--------|
| `B` | Toggle bone mode |
| `G` / `R` / `S` | Move / Rotate / Scale gizmo |
| `F` | Focus on character |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+S` | Save as `.rx6` |
| `Delete` | Delete selected attachment |
| `1`–`6` | Pose presets |
| `Escape` | Deselect / exit bone mode |

### Scene Editor

| Key | Action |
|-----|--------|
| `Space` | Play / pause |
| `←` / `→` | Step a frame (`Shift` = snap to nearest key) |
| `Home` / `End` | Jump to start / end |
| `B` | Bone mode |
| `K` | Keyframe at playhead |
| `J` | Look key at playhead |
| `D` | Delete key at playhead (`Shift+D` deletes look key) |
| `C` | Camera key |
| `F` | Enter / exit FPV |
| `L` | Loop toggle |
| `O` | Toggle frame guide |
| `N` | Toggle snap-to-keys |
| `Q` / `W` / `E` / `T` | Front / Side / ¾ / Top view |
| `Z` | Focus selected |
| `G` / `R` / `S` | Move / Rotate / Scale |
| `1` / `2` / `3` | Selected key → Linear / Ease / Step |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+S` / `Ctrl+O` | Save / Open `.rdbx` |
| `Ctrl+E` | Export |
| `Ctrl+D` | Duplicate |
| `Ctrl+C` / `Ctrl+V` | Copy / paste keyframe |
| `Delete` | Delete object |
| `?` | Shortcut help panel |

---

## 📦 File formats

Both formats are **ZIP archives** with a `renderblox.json` manifest inside, plus an `objects/` folder for GLBs, textures, and nested files.

### `.rx6` — Character file

One R6 character. Contains:
- Bone pose (all six R6 bones)
- Colours per body part
- Face decal key + custom face textures
- Attachments (with transforms, and inline meshes for procedural ones)
- Gender (male / female)

### `.rdbx` — Scene file

Everything a `.rx6` has, times infinity. Contains:
- All objects (characters, primitives, lights, imported models)
- Full timeline (object keys, camera keys, look keys)
- World lighting (sun intensity / colour, ambient)
- Duration
- All embedded textures and audio

Older versions used a `.rdbx` header + JSON + base64 assets — RenderBlox still loads those for backwards compatibility.

---

## 🎨 The amputation engine

The most technically ambitious part of the project. When you uncheck "head" in the Appearance tab, the head doesn't just hide — the vertices are **discarded in the fragment shader** based on the skin index of each pixel.

This works because R6 body parts are all one continuous skinned mesh. Each vertex is bound to a bone (`Head_01`, `Torso_00`, `Left_Arm_02`, etc.), and the shader checks:

```glsl
if (vSkinIndex.x == 1.0 || vSkinIndex.y == 1.0 ||
    vSkinIndex.z == 1.0 || vSkinIndex.w == 1.0) discard;
```

The same `vSkinIndex` varying powers the **per-limb colouring** — a pixel assigned to `Left_Arm_02` gets a specific tint, independent of every other body part, with zero bleeding into the other limbs.

> This shader was **heavily co-written with DeepSeek V4.1 Flash**. The uniform cache key that prevents recompiling on every frame, the correct injection point after `#include <color_fragment>`, and the fallback for non-skinned attachment meshes were all AI-assisted iterations.

For the full technical breakdown, see **[docs.md → The Amputation Engine](docs.md#amputation-engine)**.

---

## 🧩 Tech stack

| Layer | Technology |
|-------|-----------|
| Rendering | [Three.js r160](https://threejs.org) + EffectComposer bloom |
| Model loading | GLTFLoader, OBJLoader |
| Video encoding | WebCodecs (`VideoEncoder`) + [webm-muxer](https://github.com/Vanilagy/webm-muxer) |
| MP4 transcoding | [Mediabunny](https://mediabunny.dev) |
| Archive format | [JSZip](https://stuk.github.io/jszip/) |
| Audio | WebAudio API with HRTF panning |
| Deploy | [Vercel](https://vercel.com) |

No bundler. No build step. Just ES modules and an import map.

---

## 🏗 Project structure

```
renderblox/
├── index.html              ← Landing page + file drop zone
├── chareditor.html         ← Character Maker shell
├── editor.html             ← Scene Editor shell
│
├── models/
│   ├── r6.glb              ← Male R6 rig
│   ├── r6-girl.glb         ← Female R6 rig
│   └── faces/              ← 300+ altiwyre-style SVG face pack
│
└── shared/
    ├── common.js           ← toast, theme, recent files, format sniff
    ├── style.css           ← theme tokens + shared component styles
    ├── editor.css          ← editor layout + panels + timeline
    │
    ├── viewport.js         ← Three.js scene, cameras, gizmo, frame guide
    ├── scene.js            ← object management, presets, keyframes, shaders
    ├── face-system.js      ← face decals, texture cache, custom faces
    ├── faces.js            ← face library + SVG/PNG drawing
    │
    ├── ui.js               ← panel rendering + event wiring
    ├── timeline.js         ← keyframe track rendering + scrubbing
    ├── export.js           ← WebCodecs / MediaRecorder / Mediabunny
    ├── zip-io.js           ← .rdbx and .rx6 save/load
    ├── audio.js            ← WebAudio playback + 3D positioning
    │
    ├── chareditor-main.js  ← Character Maker orchestration
    └── editor-main.js      ← Scene Editor orchestration
```

---

## 🎓 How animation works

Under the hood, RenderBlox stores every keyframe as a plain JSON object — no skeletal animation files, no glTF animation channels, no special tooling required.

A keyframe looks like this:

```json
{
  "time": 2.5,
  "pos": [0, 0, 0],
  "quat": [0, 0, 0, 1],
  "scale": [1, 1, 1],
  "bones": {
    "Torso_00":    { "q": [0, 0.707, 0, 0.707], "p": [0, 0, 0] },
    "Head_01":     { "q": [0, 0, 0, 1],         "p": [0, 2, 0] },
    "Left_Arm_02": { "q": [0.78, 0.09, -0.61, 0.07], "p": [1, 2, 0] }
  },
  "interp": "ease"
}
```

When you scrub the timeline, RenderBlox:

1. Finds the two keyframes surrounding the playhead
2. Slerps the quaternions, lerps the positions
3. Applies each bone's local transform
4. Renders the frame

That's it. No skinning tricks, no extra rigs, no export round-trip.

Bone presets are procedural — they're implemented as small sine-wave functions in `scene.js` so the walk cycle actually loops correctly, the wave arm oscillates, and the dance body bobs. When you **bake** a preset, RenderBlox samples the preset every 80 ms and drops a keyframe at each sample. Then it's a normal animation like any other.

---

## 🎥 How export works

### Accurate mode (default)

1. Forces the renderer to the export resolution (e.g. 1920×1080)
2. Loops through every frame: evaluates the scene at `t = frame / fps`, renders, captures a `VideoFrame`
3. Feeds each frame to a `VideoEncoder` (VP9 by default)
4. Muxes the encoded chunks with `webm-muxer`
5. If the output format is MP4, transcodes the WebM through Mediabunny using `avc`

Total frames = `duration × fps`. A 10-second clip at 30 fps = 300 individual renders. Fast GPUs chew through this in a few seconds.

### Quick mode

1. Captures the renderer's canvas as a `MediaStream` at the requested resolution
2. Starts a `MediaRecorder` in whatever format the browser supports (MP4 if Chrome, WebM otherwise)
3. Calls `sceneState.playing = true` and lets the real-time timeline drive
4. Stops when the playhead hits duration

Good for iteration. Not perfectly deterministic — a slow machine will drop frames.

### Tips

- **MP4 needs Chrome 94+** for native `MediaRecorder` support. Safari and Firefox both fall back to WebM → MP4 conversion through Mediabunny, which is slower but works.
- **Bloom is disabled** during Accurate export for speed. If you want the exact preview look baked into the video, do a Quick export instead.
- **Shadows get their resolution clamped** to 1024×1024 during export unless you drag the quality slider to 8 or above.
- **Frame guide overlays do not appear in the video** — the guide is suspended during export and restored afterwards.

---

## 🎨 Custom faces

RenderBlox ships with **300+ pre-loaded SVG faces** in the "altiwyre" style — the same ones that Roblox animators have been re-uploading to the platform since 2016. They cover every expression you'd plausibly need:

- Smile, smirk, frown, pout
- Laughing, crying, screaming
- Angry, annoyed, deadpan
- Suspicious, smug, unhinged
- Blank stare, heart eyes, X eyes

On top of that, you can **upload your own PNG** and it will:

1. Get scaled to ≤ 512×512 for storage
2. Get saved to `localStorage` under `renderblox_myfaces_v1`
3. Become available in every future session
4. Get included in every `.rx6` you export

Faces are applied as **decal geometry** — projected onto the head mesh with `DecalGeometry`, riding the head bone like the skinned head itself does. Move the head, the face moves with it. Turn the head, the face wraps around it.

---

## 🦴 The bone-mode fix (developer note)

If you've ever worked with `TransformControls`, you know this pain: **the gizmo appears on the wrong object, or doesn't respond to clicks at all, after switching cameras**.

The root cause is that `TransformControls` raycasts against `transformGizmo.camera`, not against the renderer's active camera. If those two diverge — because you switched from editor cam to scene cam, or because the gizmo was attached to a bone before the camera changed — every click misses.

RenderBlox solves this in `common.js → syncGizmoCamera()`:

```js
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
```

The detach/attach pair is not optional. Without it, `TransformControls` uses the *old* camera's projection for the first frame after the switch, and the click misses by a few pixels. Every time.

This is called from `setActiveCamera()` on every camera switch — the invariant is enforced by construction.

---

## 🤝 Contributing

The full contributor guide is in **[docs.md → Contributing](docs.md#contributing)**. Short version:

- **Bugs** → [open an issue](https://github.com/renderfox5213/renderblox/issues/new)
- **Feature requests** → [open an issue](https://github.com/renderfox5213/renderblox/issues/new), describe the use case
- **PRs** → fork, branch off `main`, keep diffs focused, add screenshots for UI changes
- **No sexual animations, no NSFW content** — see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

RenderBlox is meant to be a **kid-friendly alternative to Blender**. Any contribution that undermines that intent gets closed.

All bugs, feature requests, and support questions go through **[GitHub Issues](https://github.com/renderfox5213/renderblox/issues)**. There is no Discord, no chat server, no DMs — one issue tracker, one place to look.

---

## 🙏 Credits

RenderBlox exists because of a lot of people.

### 👤 Project

- **Creator & maintainer** — [**renderfox5213**](https://github.com/renderfox5213)
- **AI coding partner** — **DeepSeek V4.1 Flash** — heavily used for the amputation shader, the export pipeline refactor, and general code structure

### 🎭 Models

- **`r6.glb` — Roblox R6 [Rigged]** by [**p0x38**](https://sketchfab.com/p0x38) on Sketchfab
  License: [CC-BY-SA-4.0](http://creativecommons.org/licenses/by-sa/4.0/)
  Source: [sketchfab.com/3d-models/roblox-r6-rigged-fd308c3375a94116b5958085ee6d77b8](https://sketchfab.com/3d-models/roblox-r6-rigged-fd308c3375a94116b5958085ee6d77b8)

- **`r6-girl.glb` — Roblox Women Rigged** by [**Piethekiddev**](https://sketchfab.com/Piethekiddev) on Sketchfab
  License: [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/)
  Source: [sketchfab.com/3d-models/roblox-women-rigged-5c1b9239ccf349f397d7f3a99bfbcbdd](https://sketchfab.com/3d-models/roblox-women-rigged-5c1b9239ccf349f397d7f3a99bfbcbdd)

### 🎨 Face library

- **Face pack** — **altiwyre** (original SVG face library, ~300 expressions)
  The SVGs are stored in `models/faces/` and rendered via `shared/faces.js`.
  Original artist maintains an online archive; RenderBlox is a downstream user, not the source.

### 🧰 Libraries

- [Three.js](https://threejs.org) — MIT
- [JSZip](https://stuk.github.io/jszip/) — MIT / GPLv3 dual
- [Mediabunny](https://mediabunny.dev) — MIT
- [webm-muxer](https://github.com/Vanilagy/webm-muxer) — MIT

### 🌐 Community

- Everyone who filed bugs, sent screenshots, and pushed back on bad ideas via GitHub Issues
- The r/robloxgamedev community for the original inspiration

---

## 📜 License

The **source code** of RenderBlox is licensed under the **MIT License** — do whatever you want with it, just keep the copyright notice.

The **included 3D models** (`r6.glb`, `r6-girl.glb`) and **face SVGs** are licensed under their respective original licenses (CC-BY-SA-4.0, CC-BY-4.0, and the altiwyre face pack's own terms). If you redistribute a fork of RenderBlox, you must preserve those attributions.

Third-party libraries retain their own licenses.

---

## 🔗 Links

- **Live app** — [renderblox.vercel.app](https://renderblox.vercel.app)
- **Full documentation** — [docs.md](docs.md)
- **Code of Conduct** — [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- **Bug reports & feature requests** — [GitHub Issues](https://github.com/renderfox5213/renderblox/issues)

---

<div align="center">

w or l?

🎭 → 🎬 → 📹 → 🎉

</div>
