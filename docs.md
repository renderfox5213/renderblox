# 📚 RenderBlox — Complete Documentation

> The full technical reference for RenderBlox — from "what is a keyframe" to "why does the gizmo need to detach before it attaches".
>
> This document is intentionally long. It is written for three audiences:
> 1. **Users** who want to understand what they're doing (Part I)
> 2. **Developers** who want to understand the code (Parts II, III, IV)
> 3. **Contributors** who want to make RenderBlox better (Part IV, VI)

**Version:** 1.0.0
**Last updated:** 2026-11-03
**Maintainer:** [renderfox5213](https://github.com/renderfox5213)
**Live app:** [renderblox.vercel.app](https://renderblox.vercel.app)

---

## Table of Contents

**Part I — Using RenderBlox**
- [Chapter 1: What is RenderBlox?](#chapter-1-what-is-renderblox)
- [Chapter 2: Why it exists](#chapter-2-why-it-exists)
- [Chapter 3: The first animation, step by step](#chapter-3-the-first-animation-step-by-step)
- [Chapter 4: The Character Maker](#chapter-4-the-character-maker)
- [Chapter 5: The Scene Editor](#chapter-5-the-scene-editor)
- [Chapter 6: The Timeline](#chapter-6-the-timeline)
- [Chapter 7: Keyboard shortcuts reference](#chapter-7-keyboard-shortcuts-reference)
- [Chapter 8: File formats at a glance](#chapter-8-file-formats-at-a-glance)
- [Chapter 9: Frequently asked questions](#chapter-9-frequently-asked-questions)

**Part II — Architecture**
- [Chapter 10: Project structure](#chapter-10-project-structure)
- [Chapter 11: Module responsibilities](#chapter-11-module-responsibilities)
- [Chapter 12: The sceneState singleton](#chapter-12-the-scenestate-singleton)
- [Chapter 13: Callbacks and data flow](#chapter-13-callbacks-and-data-flow)
- [Chapter 14: The Three.js scene graph](#chapter-14-the-threejs-scene-graph)
- [Chapter 15: The R6 rig hierarchy](#chapter-15-the-r6-rig-hierarchy)
- [Chapter 16: The camera/gizmo sync invariant](#chapter-16-the-cameragizmo-sync-invariant)
- [Chapter 17: Boot sequence](#chapter-17-boot-sequence)

**Part III — Deep dives**
- [Chapter 18: The Amputation Engine](#chapter-18-the-amputation-engine)
- [Chapter 19: The Face Decal System](#chapter-19-the-face-decal-system)
- [Chapter 20: Bone name normalization](#chapter-20-bone-name-normalization)
- [Chapter 21: Keyframes and interpolation](#chapter-21-keyframes-and-interpolation)
- [Chapter 22: Look keys](#chapter-22-look-keys)
- [Chapter 23: Video export pipeline](#chapter-23-video-export-pipeline)
- [Chapter 24: The zip-io asset store](#chapter-24-the-zip-io-asset-store)
- [Chapter 25: The audio system](#chapter-25-the-audio-system)
- [Chapter 26: The pending file handoff](#chapter-26-the-pending-file-handoff)
- [Chapter 27: The frame guide](#chapter-27-the-frame-guide)

**Part IV — Extending RenderBlox**
- [Chapter 28: Adding a pose preset](#chapter-28-adding-a-pose-preset)
- [Chapter 29: Adding a face](#chapter-29-adding-a-face)
- [Chapter 30: Adding a primitive shape](#chapter-30-adding-a-primitive-shape)
- [Chapter 31: Adding a Look effect](#chapter-31-adding-a-look-effect)
- [Chapter 32: Adding an export format](#chapter-32-adding-an-export-format)
- [Chapter 33: Adding a camera view](#chapter-33-adding-a-camera-view)

**Part V — Reference**
- [Chapter 34: R6 bone reference](#chapter-34-r6-bone-reference)
- [Chapter 35: File format schema reference](#chapter-35-file-format-schema-reference)
- [Chapter 36: Common patterns and gotchas](#chapter-36-common-patterns-and-gotchas)
- [Chapter 37: Troubleshooting](#chapter-37-troubleshooting)
- [Chapter 38: Known limitations](#chapter-38-known-limitations)
- [Chapter 39: Roadmap](#chapter-39-roadmap)

**Part VI — Credits and disclosures**
- [Chapter 40: Credits](#chapter-40-credits)
- [Chapter 41: AI usage disclosure](#chapter-41-ai-usage-disclosure)
- [Chapter 42: License](#chapter-42-license)
- [Chapter 43: Glossary](#chapter-43-glossary)

---

# Part I — Using RenderBlox

## Chapter 1: What is RenderBlox?

RenderBlox is a **browser-based animation studio** for **Roblox R6 characters**. It exists so that anyone — even someone without Blender, without a gaming PC, without prior animation experience — can make a Roblox animation and export a finished video file.

The whole app is three HTML files served as static assets:

```
index.html          ← landing page + file drop zone
chareditor.html     ← character maker
editor.html         ← scene editor / animation studio
```

There's no backend. No login. No server-side rendering. Everything happens in your browser tab. When you save a character, the browser builds the file locally and downloads it. When you export a video, the browser encodes it locally using WebCodecs and hands you the MP4.

The two editors that matter:

**Character Maker** — build *one* R6 character. Pose it, colour it, give it a face, add hats. Save the result as a `.rx6` file. That file is completely self-contained — no external assets, no missing textures, no "download the model separately" nonsense.

**Scene Editor** — import one or more `.rx6` characters. Add primitives, lights, cameras. Animate everything on a timeline. Export a finished video file (MP4 or WebM).

You'll spend most of your time in the Scene Editor. The Character Maker is a one-shot stop on the way there.

### The workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Character    │ ──► │ Save .rx6    │ ──► │ Scene Editor │
│ Maker        │     │ file         │     │              │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │ Export MP4   │
                                          └──────────────┘
```

You can make as many characters as you want, save each one as its own `.rx6`, and import them all into a single scene. The Scene Editor supports multiple characters in one scene, dancing, walking, waving, doing whatever.

### What RenderBlox is NOT

To set expectations properly:

- **Not a Roblox Studio replacement.** RenderBlox doesn't export to Roblox's animation format. It exports video files. If you want to upload animations to Roblox, that's a different workflow entirely.
- **Not a general-purpose 3D animation tool.** It's purpose-built for R6 characters. You cannot rig a custom model, weight-paint a mesh, or use IK constraints. If you want a dragon with a twelve-bone tail, RenderBlox isn't it.
- **Not a modeling tool.** You can't create meshes. You can import GLBs, add primitives, and use procedural attachments. That's it.
- **Not a texturing tool.** You can apply a texture to a body part or upload a face, but you can't paint UV maps or author materials.

If your workflow needs any of those, use Blender. If your workflow is "make a Roblox character do a silly dance and export a video", RenderBlox will get you there in 90 seconds.

---

## Chapter 2: Why it exists

Making Roblox animations in Blender means:

- Installing a 500 MB program
- Learning 20 different workspaces
- Manually installing the Roblox rigs and the R6 skeleton
- Figuring out how to render at the right resolution
- Wrestling with FFmpeg to export a video file
- Having a PC that doesn't catch fire when you hit render

The barrier to entry is *enormous*. Most people who want to make a Roblox animation bounce off within the first hour. They *want* to make content — they just don't have the time to learn a professional 3D suite before they've made a single frame.

RenderBlox is the answer to that specific problem. It trades flexibility for immediacy:

- **No install** — open a URL
- **No account** — no email, no signup, no password
- **No tutorials** — the UI is immediately understandable
- **No render farm** — your GPU, your browser, done in seconds
- **No output format confusion** — one button, one MP4

It's not trying to compete with Blender on features. It's trying to **remove the barrier** so that people who would never touch Blender can still make animations.

### The design trade-offs

Every project has trade-offs. Here are the ones RenderBlox made deliberately:

| Trade-off | What we chose | Why |
|-----------|--------------|-----|
| **No build step vs. TypeScript safety** | Plain ES modules, no bundler | Deploy-on-save works on Vercel; contributors can edit any file and refresh |
| **No backend vs. cloud rendering** | Everything runs in browser | Zero cost, zero login, zero privacy concerns |
| **Procedural presets vs. real animation files** | Math functions in JS | Presets can be tuned live without re-exporting assets |
| **R6-only vs. generic rigs** | Locked to 6 bones | Simpler, more reliable, better UX for the target audience |
| **MIT license vs. controlled** | Fully open | Anyone can fork and modify; users can't get locked out |

None of these are unchangeable. If the community wants TypeScript, someone can fork and add it. If someone wants a backend render farm, that's a different product. The current choices are the ones that made RenderBlox exist at all, on a browser-only budget.

---

## Chapter 3: The first animation, step by step

The absolute minimum path from "I've never used RenderBlox" to "I have an MP4 on my desktop". If you get stuck, jump to [Chapter 37: Troubleshooting](#chapter-37-troubleshooting).

### Step 1 — Open the Character Maker

Go to [renderblox.vercel.app](https://renderblox.vercel.app). You'll see the landing page with two cards: **Scene Editor** and **Character Maker**. Click **Character Maker**.

The page loads. For a second you'll see a "Loading models/r6.glb…" overlay — that's the R6 rig loading. Once it disappears, you'll see an empty viewport with an empty-state overlay.

### Step 2 — Create a character

Click **🎭 New Character** in the top toolbar (or the button in the empty state). A gender-picker modal appears:

- **♂ Male** — loads `models/r6.glb`, the classic R6 rig
- **♀ Female** — loads `models/r6-girl.glb`, the "Blocky Women Rigged" variant

Pick one. The character appears. The empty state disappears.

### Step 3 — Pose it

The right panel has a **Pose** section with six buttons: Idle, Wave, Point, Walk, Dance, Rest. Click any of them. Idle, Wave, Dance, Walk are **animated** — the character will keep moving forever. Point and Rest are static.

### Step 4 — Colour it

Scroll to **Appearance**. There's a **Body Parts** section with a row per limb. Click any colour picker to change that limb's colour. You can uncheck a limb (except torso) to amputate it.

### Step 5 — Give it a face

Scroll to **Face Decal**. You'll see a grid of ~300 face thumbnails. Click one. The character's default smile disappears and your chosen face appears, projected onto the head. Adjust size/offset with the sliders below.

### Step 6 — Add a hat (optional)

Click **🎩 Top Hat** in the Attachments section. A cylinder hat appears on the character's head, correctly sized and positioned.

### Step 7 — Save as `.rx6`

Click **💾 Save .rx6** in the toolbar. A file downloads. That file is everything.

### Step 8 — Open the Scene Editor

Click the RenderBlox logo (or go back to `index.html`) and click **Scene Editor**.

The Scene Editor has a left panel, right panel, viewport, and bottom timeline. On first load, it auto-creates an "R6-1" character.

### Step 9 — Import your `.rx6`

Click **🎭 Import .rx6** in the toolbar. Select your file. It loads next to the default R6-1.

Delete R6-1: click it in the scene tree, press `Delete`.

### Step 10 — Frame it

Press `F` to fit the camera to the scene. Or use `Q`/`W`/`E`/`T` to snap to front/side/¾/top views.

### Step 11 — Keyframe an animation

1. Select the character
2. Drag the timeline playhead to `0.00`
3. Press `K` — first keyframe
4. Drag the playhead to `2.00`
5. Move the character with the gizmo (`G`)
6. Press `K` — second keyframe
7. Press `Space` to play — the character glides smoothly

### Step 12 — Export the video

Click **📹 Export Video**. A progress overlay appears with rotating tips. Wait for the render to finish. The browser downloads an MP4.

### Step 13 — Share it

Upload anywhere. Nobody needs to know you made it in a browser tab in 3 minutes.

---

## Chapter 4: The Character Maker

The Character Maker is `chareditor.html`. It's a stripped-down version of the Scene Editor that focuses on **one character at a time**.

### The layout

```
┌────────────────────────────────────────────────────────┐
│ Menubar  File Edit View Character Help                 │
├────────────────────────────────────────────────────────┤
│ Topbar  🎭New  📥Import  Gizmo modes  💾Save  ↶↷  🌙   │
├────────────────────────────────────────────────────────┤
│                                          ┌────────────┐│
│                                          │            ││
│                 VIEWPORT                 │  Pose      ││
│            (character + gizmo)           │  Appearance││
│                                          │  Face      ││
│                                          │  Attach    ││
│                                          │  Bones     ││
│                                          │  Export    ││
│                                          │            ││
├──────────────────────────────────────────┴────────────┤
│  Bottom bar (shortcut reminders only)                  │
└────────────────────────────────────────────────────────┘
```

Note: the Character Maker inherits the Scene Editor layout grid but disables the left panel entirely. The right panel takes up the full right column.

### The right panel sections

**Pose** — Six preset buttons. Clicking one sets `obj.currentAction` and clears `__manualPose`.

**Appearance** — Six rows, one per body part. Each row has:
- A checkbox (except torso) to hide that part
- A label
- A colour picker

Beneath that, a **Base Color** swatch grid for quick painting.

**Face Decal** — The face grid (300+ tiles), position/size/wrap sliders, and Random/Blank/Default/Upload buttons.

**Attachments** — Four buttons (Hat, Import GLB, Text, Box) plus a list of current attachments with delete buttons.

**Bones** — A scrollable list of every bone in the character, with current X/Y/Z rotation shown. Click any row to select that bone.

**Export** — A single button: **Save .rx6**.

### Bone mode

Press `B` to toggle **bone mode**. In bone mode:

- Clicking any body part attaches the gizmo to the **nearest bone** to the hit point
- A yellow skeleton overlay appears, showing bones as line segments
- A banner across the top of the viewport says "🦴 BONE MODE"
- The gizmo switches to **rotate** mode by default (rotating a bone is the point)

The rotation logic: `selectBone(bone)` calls `transformGizmo.attach(bone)` and sets mode to `rotate`. The bone rotates around its own local origin.

Exiting bone mode (`B` or `Escape`) leaves the pose intact. To revert, use `Ctrl+Z` (each bone rotation was pushed to history).

### Manual pose vs. preset

The core mechanic:

```js
if (!obj.__manualPose) {
  applyPreset(obj, obj.currentAction, time);
}
```

When you click a preset, `__manualPose = false` is set. The render loop applies the preset every frame.

When you rotate a bone with the gizmo, `__manualPose = true` is set. The render loop stops touching the bones — your manual pose is frozen.

This is why you can't have "half a preset and half manual" — either the preset runs and overwrites your manual rotation, or the preset doesn't run. There's no middle ground.

To go back to a preset: click a preset button (sets `__manualPose = false`, resets all bones, then applies the preset).

To wipe a manual pose without re-applying a preset: `Ctrl+Z` back through the history, or use **Reset All Bones** in the right panel (which copies each bone's `restQuat` and `restPos` back).

### The face system in the Character Maker

The face grid is populated by:

1. **Built-in faces** — the altiwyre SVG pack, ~300 faces
2. **User faces** — PNGs uploaded and stored in `localStorage` under `renderblox_myfaces_v1`

Each tile is a `<div>` with `background-image` set to the face thumbnail (a small data URL for user faces, or an async-loaded thumbnail for library faces). Clicking a tile:

```js
await ensureFaceTexture(key);   // decode + cache the texture
setFaceByKey(obj, key);         // clear old decal, apply new one
pushHistory('Face: ' + name);
renderFaceSection();            // refresh the UI
```

Right-clicking a **user face** tile opens a "Delete" confirm dialog.

### Attachments in detail

**Top Hat** — creates a `THREE.Group` with three cylinders (brim, crown, band). The group is parented to the **head bone**, not the character root. Position and scale come from `measureHead(obj)`:

```js
const m = measureHead(obj);
m.attachTo.add(hat);
hat.position.set(0, m.localY, 0);
hat.scale.setScalar(m.scaleFactor);
```

`measureHead()` returns:
- `attachTo` — the head bone (or root fallback)
- `localY` — Y position of the head top, in bone-local space
- `scaleFactor` — scalar to make the hat the right size for this character

This is critical for supporting both R6 rigs. The two rigs have different world scales, but the hat is parented to the head bone and measured in **bone-local space**, so it appears correctly sized on both.

**Import GLB** — loads a GLB or OBJ, normalizes to 0.5 world units, parents to head bone. The asset is registered in `assetStore` and referenced by `assetId` in the `.rx6`.

**Text** — renders text to a 512×128 canvas, converts to `CanvasTexture`, applies to `PlaneGeometry`. Procedural, so serialized inline.

**Box** — `BoxGeometry(0.4, 0.4, 0.4)`, blue material. Procedural.

### Saving as `.rx6`

The save flow:

1. Get the currently selected character
2. Build a manifest JSON with all character state
3. Collect all asset IDs referenced (GLB attachments, texture attachments, custom face PNGs)
4. Create a JSZip archive
5. Write `renderblox.json` to the root
6. Write each asset to `objects/{id}_{filename}`
7. Generate the zip as a Blob
8. Trigger a download

See [Chapter 35](#chapter-35-file-format-schema-reference) for the full manifest schema.

---

## Chapter 5: The Scene Editor

The Scene Editor is `editor.html`. It's the full animation studio.

### The layout

```
┌────────────────────────────────────────────────────────────┐
│ Menubar  File Edit View Character Camera Help              │
├────────────────────────────────────────────────────────────┤
│ Topbar  🎭AddR6 📥Import 💡Light Gizmo 🦴Bone 🎥FPV ...    │
├──────────────┬──────────────────────────┬──────────────────┤
│              │                          │                  │
│ Scene        │                          │ Props            │
│ Add Shape    │      VIEWPORT            │ Appearance       │
│ Lighting     │                          │ Camera           │
│ Views        │                          │ Bones            │
│ Quality      │                          │                  │
│              │                          │                  │
├──────────────┴──────────────────────────┴──────────────────┤
│ Timeline  Objects / Look / Camera                          │
├────────────────────────────────────────────────────────────┤
│ Transport  ⏮ ⏪ ▶ ⏩ ⏭ 🔁  Time  Speed  Duration           │
└────────────────────────────────────────────────────────────┘
```

### Left panel sections

**Scene** — A list of every object in the scene. Icons per type:
- 🎭 for R6 characters
- 💡 for lights
- ▢ for primitives
- 📦 for imported models

Each row has an ✕ delete button. Clicking a row selects that object.

**Add Shape** — Six buttons for primitives: Box, Sphere, Cylinder, Cone, Plane, Torus.

**World Lighting** — Sun intensity slider, sun colour picker, ambient intensity slider.

**Views** — Front, Side, ¾, Top, Fit. Keyboard shortcuts `Q`, `W`, `E`, `T`, `F`.

**Quality** — Low, Medium, High, Ultra chips. Controls shadow map size, bloom, pixel ratio.

### Right panel tabs

**Props** — Position/Rotation/Scale numeric inputs, pose preset buttons (for R6), Bake Animation section, keyframe interpolation controls.

**Appearance** — Body part colours (for R6), face grid, attachments, mesh list (for non-R6), paint controls, look key controls.

**Camera** — Scene camera position inputs, FOV slider, camera keyframe list.

**Bones** — Bone mode toggle, bone list, reset button.

### Topbar buttons

| Button | Action |
|--------|--------|
| 🎭 **Add R6** | Opens gender picker, adds a new R6 |
| 📥 **Import** | Import a GLB/OBJ with mode selector |
| 🎭 **Import .rx6** | Import a character file |
| 💡 **Light** | Add a point light |
| ✥ **Move** | Set gizmo to translate |
| ↻ **Rotate** | Set gizmo to rotate |
| ⤢ **Scale** | Set gizmo to scale |
| 🦴 **Bone** | Toggle bone mode |
| 🎥 **FPV** | Toggle first-person view |
| ◈ **Cam Key** | Add camera keyframe at current sceneCam pose |
| 👁 **Preview** | Cycle camera preview mode |
| ▭ **Frame** | Toggle frame guide |
| [dropdown] | Select frame guide aspect (match/shorts/youtube/square/portrait) |
| ◉ **Look Key** | Add look keyframe at playhead |
| ⏺ **Auto** | Toggle auto-key (edits write keys) |
| ↶ **Undo** | Undo |
| ↷ **Redo** | Redo |
| 📹 **Export Video** | Start export |
| ⚙ | Open export settings |
| 💾 **Save** | Save `.rdbx` |
| 📂 **Load** | Load `.rdbx` |
| 🌙 | Toggle dark mode |

### Menubar

**File** — New Scene, Open `.rdbx`, Save `.rdbx`, Import Model, Import Character, Export Video, Export Settings

**Edit** — Undo, Redo, Duplicate, Delete Selected, Add Keyframe, Add Look Key, Delete Keyframe, All keys → Ease, All keys → Linear

**View** — Front/Side/¾/Top, Fit, Focus, Toggle Frame Guide, Cycle Preview Mode, Toggle Dark Mode

**Character** — Add R6, Toggle Bone Mode, Pose Presets (Idle/Wave/Point/Walk/Dance/Rest), Place Walk (FPV)

**Camera** — Enter FPV, Add Camera Key, Clear All Camera Keys

**Help** — Keyboard Shortcuts, About

### The timeline

Three tracks stacked vertically:

```
Objects  ─◆──────◆────◆─────────◆────
Look     ◉──────◉──────────◉───────────
Camera   ◆────────────◆─────────────◆─
```

- **Objects** — Object keyframes (position, rotation, scale, bones)
- **Look** — Look keyframes (colour, opacity, glow, visibility, face)
- **Camera** — Camera keyframes (position, rotation, FOV)

Interactions:
- **Click ruler** — jump playhead
- **Drag playhead** — scrub
- **Drag key** — move the key in time
- **Right-click key** — delete (with confirm)
- **Double-click key** — jump playhead to key time
- **Scroll wheel** — zoom the visible time range

### The transport bar

Bottom of the screen. Buttons:

| Button | Action |
|--------|--------|
| ⏮ | Jump to start |
| ⏪ | Step back 1/60s |
| ▶ | Play/pause |
| ⏩ | Step forward 1/60s |
| ⏭ | Jump to end |
| 🔁 | Toggle loop |

Time input (editable), FPS display, speed slider (0.25× – 2×), duration input (1–300 seconds).

### Playback loop

The editor runs a `requestAnimationFrame` loop:

```js
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (sceneState.playing) {
    sceneState.time += dt * sceneState.playbackSpeed;
    if (sceneState.time >= sceneState.duration) {
      if (sceneState.loopPlayback) sceneState.time = 0;
      else { sceneState.playing = false; sceneState.time = sceneState.duration; }
    }
    updatePlayhead();
    applyCameraAtTime(sceneState.time);
  }

  // Apply keyframes to each object
  sceneState.objects.forEach(obj => {
    if (obj.keyframes.length >= 1 && (sceneState.mode === 'keyframe' || sceneState.playing)) {
      const kf = interpolateKeyframes(obj, sceneState.time);
      if (kf) applyKeyframeToObject(obj, kf);
    } else if (obj.type === 'r6' && !obj.__manualPose) {
      applyPreset(obj, obj.currentAction, sceneState.time);
    }
  });

  // Apply look keys
  sceneState.objects.forEach(obj => {
    if (obj.lookKeys && obj.lookKeys.length && !obj.__lookPinned) {
      applyLookAt(obj, sceneState.time);
    }
  });

  updateFPVMovement(dt);
  if (editorState.boneEditMode) updateSkeletonOverlay();
  renderFrame(dt);
}
```

This runs at whatever the browser's refresh rate is (usually 60Hz on desktop, 120Hz on high-refresh monitors).

---

## Chapter 6: The Timeline

The timeline is the most complex UI element in RenderBlox. This chapter explains its internals.

### Coordinate conversion

The timeline uses two functions to convert between time (seconds) and X (pixels):

```js
function timeToX(t) {
  const w = timelineState.timelineEl.clientWidth;
  const span = timelineState.viewEnd - timelineState.viewStart;
  return ((t - timelineState.viewStart) / span) * w;
}

function xToTime(x) {
  const w = timelineState.timelineEl.clientWidth;
  const span = timelineState.viewEnd - timelineState.viewStart;
  return timelineState.viewStart + (x / w) * span;
}
```

These are exact inverses. Scrubbing clicks translate to a time value, keyframes are positioned by time, and everything stays in sync even when the visible range changes.

### Zoom

Scroll wheel on the timeline zooms the **visible time range** (not the canvas size). The zoom is centered on the mouse position:

```js
const mouseT = xToTime(mouseX);
const oldSpan = viewEnd - viewStart;
const newSpan = oldSpan * (deltaY > 0 ? 1.25 : 0.8);
const ratio = mouseX / timelineWidth;
viewStart = mouseT - ratio * newSpan;
viewEnd = viewStart + newSpan;
```

`Shift` + scroll uses a gentler zoom factor (1.08× instead of 1.25×) for fine-tuning.

### Snapping

`Shift+Arrow` snaps the playhead to the nearest keyframe. `N` toggles snap-to-keys on/off. During playhead drags, if snap is on, the playhead snaps to the nearest of:

- Start (0)
- End (duration)
- Every object keyframe of the selected object
- Every look keyframe of the selected object
- Every camera keyframe

The threshold is 1.8% of the visible time range — so at a 10-second view range, snapping triggers within ~180ms.

### Keyframe markers

Each keyframe marker is an absolutely positioned `<div>` inside its track container:

```js
const el = document.createElement('div');
el.className = 'kf ' + kf.interp;  // 'linear', 'ease', or 'step'
el.style.left = timeToX(kf.time) + 'px';
el.style.top = '50%';
```

The marker is rotated 45° via CSS to look like a diamond. Ease keys get a smaller circle inside. Step keys are square (no rotation).

### Track types

**Objects track** — Blue diamonds. Rendered by `renderObjectKeys()`.

**Look track** — Circular markers with the first part's colour as background. Rendered by `renderLookKeys()`.

**Camera track** — Purple diamonds. Rendered by `renderCameraKeys()`.

Each track has its own `track-label` in the top-left corner, sitting on top of the keyframes.

### Drag-to-move

Each key has a `mousedown` handler that captures the mouse, computes the delta in pixels, converts to a time delta, and updates the key's `time` field:

```js
el.addEventListener('mousedown', (e) => {
  e.stopPropagation();
  if (e.button === 2) { /* right-click: delete */ return; }
  const startX = e.clientX;
  const startT = kf.time;
  const move = (ev) => {
    const dx = ev.clientX - startX;
    const timeSpan = viewEnd - viewStart;
    const newT = startT + (dx / timelineWidth) * timeSpan;
    kf.time = Math.max(0, Math.min(duration, newT));
    el.style.left = timeToX(kf.time) + 'px';
  };
  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    sortKeys();
    pushHistory('Move Keyframe');
    renderTimeline();
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
});
```

Keys are re-sorted by time after every drag to keep the array correct.

### The playhead

The playhead is a vertical red line with a circular draggable handle at the top. It reflects `sceneState.time`:

```js
function updatePlayhead() {
  playheadEl.style.left = timeToX(sceneState.time) + 'px';
}
```

If the playhead's time is outside the visible range, its `opacity` drops to 0 (invisible), but it's still tracked internally. Zooming out restores visibility.

---

## Chapter 7: Keyboard shortcuts reference

### Character Maker

| Key | Action |
|-----|--------|
| `B` | Toggle bone mode |
| `G` | Set gizmo to Move |
| `R` | Set gizmo to Rotate |
| `S` | Set gizmo to Scale |
| `F` | Focus on character |
| `Escape` | Deselect / exit bone mode |
| `Delete` | Delete selected attachment |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Save `.rx6` |
| `1`–`6` | Pose presets (Idle, Wave, Point, Walk, Dance, Rest) |

### Scene Editor

**Playback**

| Key | Action |
|-----|--------|
| `Space` | Play / pause |
| `L` | Toggle loop |
| `Home` | Jump to start |
| `End` | Jump to end |
| `←` / `→` | Step frame (1/60s) |
| `Shift+←` / `Shift+→` | Jump to previous/next key |
| `N` | Toggle snap-to-keys |

**Animation**

| Key | Action |
|-----|--------|
| `K` | Add keyframe at playhead |
| `J` | Add look key at playhead |
| `D` | Delete key at playhead |
| `Shift+D` | Delete look key at playhead |
| `C` | Add camera key |
| `1` / `2` / `3` | Selected key → Linear / Ease / Step |
| `Ctrl+C` / `Ctrl+V` | Copy / paste keyframe |

**Objects & Selection**

| Key | Action |
|-----|--------|
| `B` | Toggle bone mode |
| `Delete` | Delete selected object |
| `Ctrl+D` | Duplicate selected |
| `Z` | Focus selected object |
| `Escape` | Deselect / cancel |

**Gizmo**

| Key | Action |
|-----|--------|
| `G` | Move |
| `R` | Rotate |
| `S` | Scale |

**Views**

| Key | Action |
|-----|--------|
| `Q` | Front view |
| `W` | Side view |
| `E` | ¾ view |
| `T` | Top view |
| `F` | Enter/exit FPV mode |
| `O` | Toggle frame guide |

**FPV (when active)**

| Key | Action |
|-----|--------|
| `WASD` | Fly horizontally |
| `Q` / `E` | Down / up |
| `Shift` | Boost speed |
| `Scroll` | Vertical altitude |
| `K` | Drop camera key at current view |
| `Enter` | (Walk setup only) confirm walk duration |
| `Escape` | Exit FPV |

**Files**

| Key | Action |
|-----|--------|
| `Ctrl+S` | Save `.rdbx` |
| `Ctrl+O` | Open `.rdbx` |
| `Ctrl+E` | Export video |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo |

**Help**

| Key | Action |
|-----|--------|
| `?` | Show shortcut cheatsheet |

---

## Chapter 8: File formats at a glance

RenderBlox uses two custom formats. Both are ZIP archives with a JSON manifest.

### `.rx6` — Character file

```
renderblox_character_1234.rx6
├── renderblox.json           ← manifest (format: "RX6")
└── objects/                  ← optional assets
    ├── asset_1_face.png      ← custom face texture
    └── asset_2_hat.glb       ← imported hat GLB
```

Contains: one character (gender, pose, colours, face, attachments, bone state).

Used by: Character Maker save, Scene Editor import.

### `.rdbx` — Scene file

```
renderblox_scene_1234.rdbx
├── renderblox.json           ← manifest (format: "RDBX")
├── objects/                  ← assets
│   ├── asset_1_character.rx6 ← imported characters (full .rx6 embedded)
│   ├── asset_2_texture.png   ← textures
│   └── asset_3_model.glb     ← imported models
└── sounds/                   ← audio files
    └── sound_1.mp3
```

Contains: multiple objects, timeline, camera keys, look keys, environment settings, embedded audio.

Used by: Scene Editor save/load.

### Legacy format

Older `.rdbx` files (pre-zip) had this structure:

```
[4 bytes: "RDBX"]
[4 bytes: version]
[JSON body starting at first "{"]
```

Assets were base64-encoded inside the JSON. RenderBlox still loads these for backwards compatibility via `loadOldJsonFormat()`. It detects them by checking for the `RDBX` magic bytes at the start of the file.

---

## Chapter 9: Frequently asked questions

**Q: Do I need to install anything?**
No. Everything runs in your browser. Bookmark the URL.

**Q: Do I need an account?**
No. No email, no password, no signup. The app never sees your data.

**Q: Where are my files stored?**
On your own computer. The browser downloads them like any other file. RenderBlox never sends your files to a server.

**Q: Can I use RenderBlox offline?**
Yes, if you save the HTML files and models to your computer and serve them locally. See `README.md` for instructions.

**Q: Why MP4 and not `.rbxm` or `.rbxmx`?**
RenderBlox produces **video files**, not Roblox animations. If you want Roblox animation files, you need Roblox Studio's Animation Editor.

**Q: Can I import custom rigs?**
Yes — click **Import** and choose "Character (rigged)". RenderBlox will detect bones by name (see [Chapter 20](#chapter-20-bone-name-normalization)) and set up the pose presets.

**Q: Can I use my own faces?**
Yes. Click **Upload** in the Face Decal section. PNGs up to 512×512 are supported.

**Q: Does it work on mobile?**
Partially. Rendering works on modern mobile browsers. Video export usually fails or produces very low-resolution output. Best used on desktop.

**Q: How long can my animation be?**
Technically up to 300 seconds (5 minutes). Practically limited by your disk space and browser memory — a 5-minute HD video is ~500 MB in memory during export.

**Q: Can I add music?**
Yes. In the Scene Editor, click the audio lane in the timeline and add MP3/WAV files. See [Chapter 25](#chapter-25-the-audio-system).

**Q: Does it support multiple characters?**
Yes. Import as many `.rx6` files as you want.

**Q: Can I go back and edit a saved `.rx6`?**
Yes. Load it into the Character Maker (via **Import .rx6**), edit, save again.

**Q: What if the export fails?**
See [Chapter 37: Troubleshooting](#chapter-37-troubleshooting).

**Q: Is RenderBlox open source?**
Yes, MIT-licensed. Fork it, modify it, deploy your own copy.

**Q: Can I contribute?**
Yes! See [Chapter 40](#chapter-40-credits) for how to get involved via GitHub Issues.

---

# Part II — Architecture

## Chapter 10: Project structure

```
renderblox/
├── index.html              ← Landing page + file drop zone
├── chareditor.html         ← Character Maker shell
├── editor.html             ← Scene Editor shell
│
├── models/
│   ├── r6.glb              ← Male R6 rig
│   ├── r6-girl.glb         ← Female R6 rig
│   └── faces/              ← 300+ altiwyre SVG face pack
│
└── shared/
    ├── common.js           ← Utilities: toast, theme, recent files
    ├── style.css           ← Theme tokens + shared component styles
    ├── editor.css          ← Layout grid + panels + timeline
    │
    ├── viewport.js         ← Three.js scene setup + cameras + gizmo
    ├── scene.js            ← Object management + presets + keyframes + amputation
    ├── face-system.js      ← Face decals + texture cache
    ├── faces.js            ← Face library + SVG/PNG drawing
    │
    ├── ui.js               ← Panel rendering + event wiring
    ├── timeline.js         ← Keyframe track rendering
    ├── export.js           ← WebCodecs + MediaRecorder + Mediabunny
    ├── zip-io.js           ← .rdbx and .rx6 save/load
    ├── audio.js            ← WebAudio playback + 3D positioning
    │
    ├── chareditor-main.js  ← Character Maker orchestration
    └── editor-main.js      ← Scene Editor orchestration
```

Each `*-main.js` file is the "boot file" for its editor. It imports all the other modules, wires up callbacks, sets up event handlers, and starts the render loop. Everything else is a library module.

---

## Chapter 11: Module responsibilities

| Module | Responsibility | Depends on |
|--------|---------------|------------|
| `common.js` | Toast, theme, recent files, format sniffing, `syncGizmoCamera` | — |
| `style.css` | Theme tokens (light + dark), base typography | — |
| `editor.css` | Layout grid, panels, timeline, transport, modals | `style.css` |
| `viewport.js` | Three.js renderer, scene, cameras, gizmo, frame guide, quality | `common.js` |
| `scene.js` | Object management, presets, interpolation, amputation shader | `three` |
| `face-system.js` | Face decal lifecycle, texture cache, custom faces | `three`, `scene.js`, `zip-io.js` |
| `faces.js` | Face library + drawing library faces to canvases | — |
| `ui.js` | Panel rendering + event wiring | `scene.js`, `export.js`, `zip-io.js` |
| `timeline.js` | Keyframe track rendering + scrubbing | `scene.js`, `export.js` |
| `export.js` | WebCodecs + MediaRecorder + Mediabunny | `scene.js`, `common.js` |
| `zip-io.js` | `.rdbx` and `.rx6` save/load | `jszip`, `scene.js` |
| `audio.js` | WebAudio playback + 3D positioning | `three`, `zip-io.js`, `scene.js` |
| `chareditor-main.js` | Character Maker boot | All of the above |
| `editor-main.js` | Scene Editor boot | All of the above |

### The dependency graph

```
              common.js
                  │
                  ▼
              viewport.js ◄───────┐
                  │               │
                  ▼               │
               scene.js           │
                ▲  ▲              │
                │  └──┐           │
    face-system │     │           │
                │     ▼           │
              faces  ui.js        │
                        ▲         │
                        │         │
                  timeline.js     │
                        │         │
                        ▼         │
                  export.js       │
                                  │
                  zip-io.js ──────┤
                        ▲         │
                        │         │
                    audio.js ─────┘
                        │
                        ▼
              chareditor-main.js / editor-main.js
```

Every module can be imported independently. No circular dependencies. The `*-main.js` files are the only ones that reference the DOM at the top level.

---

## Chapter 12: The `sceneState` singleton

`sceneState` is the single source of truth for all editor state. It's a plain object exported from `scene.js`:

```js
export const sceneState = {
  objects: [],            // array of all objects in scene
  selectedId: null,       // currently selected object ID
  nextId: 1,              // auto-increment for new object IDs
  camKeyframes: [],       // array of camera keyframes
  duration: 10,           // total clip duration in seconds
  time: 0,                // current playhead time
  playing: false,         // whether playback is active
  mode: 'live',           // 'live' | 'keyframe'
  loopPlayback: true,     // whether playback loops at end
  playbackSpeed: 1.0,     // playback speed multiplier

  // Callbacks set by editor-main:
  onChanged: null,        // called when scene structure changes
  onSelectionChanged: null, // called when selection changes
  onObjectAdded: null,    // called when an object is added
  onObjectRemoved: null,  // called when an object is removed

  // Face system hooks:
  createFaceDecal: null,
  updateFaceDecal: null,
  findHeadBone: null,
  setFaceByKey: null,

  // Environment hooks:
  getEnvironment: null,
  applyEnvironment: null,

  // Amputation:
  applyCharacterAppearance: null,
};
```

### Why a singleton?

Because the alternative — a state manager, a Redux store, a MobX observable — would require a build step, a dependency, and a learning curve for contributors. The singleton is 20 lines, has no dependencies, and does exactly what's needed.

The trade-off is that there's no reactivity. When you mutate `sceneState.objects`, nothing updates automatically. You have to call the callbacks:

```js
// After adding an object:
sceneState.objects.push(obj);
sceneState.onObjectAdded?.(obj);    // add to Three.js scene
sceneState.onChanged?.();           // re-render UI lists

// After removing:
sceneState.objects.splice(i, 1);
sceneState.onObjectRemoved?.(obj);  // remove from Three.js scene
sceneState.onChanged?.();

// After changing selection:
sceneState.selectedId = id;
sceneState.onSelectionChanged?.(id);  // update properties panel, gizmo
```

This is manual but explicit. Contributors can always trace what's happening by searching for `onChanged`.

### Object shape

Every object in `sceneState.objects` has this shape:

```js
{
  id: number,               // unique
  type: 'r6' | 'primitive' | 'light' | 'model',
  name: string,
  root: THREE.Object3D,     // parented to Three.js scene
  keyframes: Keyframe[],    // animation keys
  lookKeys: LookKey[],      // appearance keys
  attachments: Attachment[],
  meshes: MeshEntry[],      // [{ mesh, name }, ...]
  selectedMeshIndex: number,
  faceDecal: THREE.Mesh | null,
  faceKey: string | null,
  currentAction: string,    // 'idle', 'wave', 'point', etc.
  __pinned: boolean,        // keyframe playback paused
  __manualPose: boolean,    // pose was manually edited
  __lookPinned: boolean,    // look animation paused

  // For R6 characters:
  bones?: { [canonicalName]: { obj: THREE.Bone, restQuat, restPos } },
  gender?: 'male' | 'female',
  builtin?: boolean,
  hiddenParts?: string[],
  partColors?: { [part]: string },

  // For imported models:
  assetId?: string,

  // For imported .rx6 characters:
  rx6AssetId?: string,
}
```

---

## Chapter 13: Callbacks and data flow

`sceneState` doesn't know anything about the DOM, the Three.js scene, or the UI. It's just data. All the "reach out" is via callbacks:

```js
sceneState.onObjectAdded = (obj) => {
  if (obj.root && !obj.root.parent) {
    viewport.scene.add(obj.root);
  }
};

sceneState.onObjectRemoved = (obj) => {
  if (obj.root && obj.root.parent) {
    viewport.scene.remove(obj.root);
  }
  // Optionally: dispose geometry/materials
};

sceneState.onChanged = () => {
  renderSceneList();
  renderTimeline();
};

sceneState.onSelectionChanged = (id) => {
  renderProperties();
  renderAppearance();
  renderBones();
  renderCamera();
  attachGizmo();
};
```

These are wired up in `editor-main.js → boot()`. If a module needs to know "what just happened", it subscribes via these callbacks.

### The full lifecycle of a click

Let's trace what happens when you click **Add R6** in the toolbar:

1. `wireTopbar()` wires the click handler to `promptAddCharacter()`
2. `promptAddCharacter()` shows the gender modal
3. You pick "♂ Male" — the modal's onclick handler calls `addR6Character('R6-2', 'male')`
4. `addR6Character()` (in `scene.js`):
   - Clones the R6 template
   - Calls `buildCharacter(clone, 'R6-2')`
5. `buildCharacter()`:
   - Applies materials, casts shadows
   - Sets up bone map with rest positions
   - Collects meshes
   - Creates the object record
   - Pushes to `sceneState.objects`
   - Calls `sceneState.onObjectAdded?.(obj)` → `viewport.scene.add(obj.root)`
   - Calls `sceneState.onChanged?.()` → re-renders scene list + timeline
   - Returns `obj`
6. Back in `promptAddCharacter()`: calls `setSelected(obj.id)`
7. `setSelected()`:
   - Sets `sceneState.selectedId`
   - Calls `sceneState.onSelectionChanged?.(id)` → re-renders properties panel, gizmo attaches
8. Back in the toolbar handler: calls `pushHistory('Add R6')` → snapshot pushed
9. The render loop (already running) picks up the new object naturally

Total time: about 50 milliseconds. The character appears instantly.

### History snapshots

`pushHistory(label)` captures a full snapshot of the scene:

```js
function snapshotScene() {
  return {
    selectedId: sceneState.selectedId,
    duration: sceneState.duration,
    camKeyframes: JSON.parse(JSON.stringify(sceneState.camKeyframes)),
    objects: sceneState.objects.map(o => ({
      id: o.id,
      type: o.type,
      name: o.name,
      pos: [o.root.position.x, o.root.position.y, o.root.position.z],
      quat: [o.root.quaternion.x, o.root.quaternion.y, o.root.quaternion.z, o.root.quaternion.w],
      scale: [o.root.scale.x, o.root.scale.y, o.root.scale.z],
      keyframes: JSON.parse(JSON.stringify(o.keyframes)),
      lookKeys: JSON.parse(JSON.stringify(o.lookKeys)),
      // ... more fields
    })),
  };
}
```

These snapshots are stored in `editorState.history.stack` (max 100 entries). `undo()` decrements the index and calls `restoreSnapshot()`, which applies the entire snapshot back to the scene.

This is why undo is so reliable — it doesn't try to undo individual operations, it just restores a saved state. The trade-off is memory: a 100-step history of a complex scene uses a few megabytes.

---

## Chapter 14: The Three.js scene graph

The full Three.js scene hierarchy:

```
THREE.Scene
├── editorCam (not in scene, but referenced)
├── sceneCam (not in scene, but referenced)
├── camHelper (LineSegments) — frustum visualization
├── skyDome (Mesh) — sphere with gradient shader
├── sunGroup (Group)
│   ├── sunDisc (CircleGeometry)
│   └── sunGlow (CircleGeometry, additive)
├── ground (Mesh) — 800×800 plane
├── hemisphereLight
├── ambientLight
├── sun (DirectionalLight) + sun.target
├── clouds[] (Sprites) — 20 sprites
├── transformGizmo (TransformControls)
└── [objects]
    ├── character1.root (Group)
    │   └── glTF scene (skinned mesh hierarchy)
    ├── character2.root
    ├── primitive1.root (Group with one Mesh)
    ├── light1.root (PointLight with helper Mesh child)
    └── ...
```

Two cameras exist but are not added to the scene graph (they don't need to be):

- **`editorCam`** — the camera you see through in editor mode. Attached to OrbitControls.
- **`sceneCam`** — the camera that gets exported. Positioned either by camera keyframes, FPV mode, or copied from editorCam.

The active camera is one of these two, controlled by `viewport.activeCam` and `setActiveCamera()`.

### Object parenting

Each `sceneState.objects[i].root` is parented directly to the scene:

```js
viewport.scene.add(obj.root);
```

For R6 characters, `obj.root` is a `THREE.Group` that contains the entire glTF scene:

```
characterRoot (Group)
└── glTF scene (Group)
    ├── Sketchfab_model (Group)
    │   └── ... hierarchy from GLB
    │       └── Object_5 (Group)
    │           ├── Skeleton (Bone hierarchy)
    │           └── Meshes (SkinnedMesh)
```

Attachments (hats, etc.) are parented to the **head bone**, not to `characterRoot`. This is why they follow head rotations.

### Material management

Every material is cloned on load so that per-character colours don't bleed into the template:

```js
o.material = cloneMaterialWithBackup(o.material);
```

The clone includes:

- Original colour backup (`__origColor`) for reset
- Original map backup (`__origMap`) for restore
- User data for glow intensity, texture asset ID

When you paint a part or apply the amputation shader, you're modifying the cloned material, not the template. This means two characters can have completely different appearances without interfering.

---

## Chapter 15: The R6 rig hierarchy

The R6 rig is a glTF file. The core hierarchy looks like this:

```
Sketchfab_model
└── .fbx (Group with transform)
    └── RootNode
        └── r6Rig (Group)
            └── Object_4 (Group)
                ├── _rootJoint (Group)
                │   └── Torso_00 (Bone)
                │       ├── Head_01 (Bone)
                │       │   └── Head_end_06 (Bone)
                │       ├── Left_Arm_02 (Bone)
                │       │   └── Left_Arm_end_07 (Bone)
                │       ├── Right_Arm_03 (Bone)
                │       │   └── Right_Arm_end_08 (Bone)
                │       ├── Left_Leg_04 (Bone)
                │       │   └── Left_Leg_end_09 (Bone)
                │       └── Right_Leg_05 (Bone)
                │           └── Right_Leg_end_010 (Bone)
                ├── Object_18 (SkinnedMesh with Head + body)
                └── Object_19 (SkinnedMesh with Torso)
```

Six bones matter for animation:

| Canonical name | Position (local to parent) | Purpose |
|----------------|---------------------------|---------|
| `Torso_00` | Bone at root | Body root |
| `Head_01` | Offset from Torso | Head |
| `Left_Arm_02` | Offset from Torso | Left arm (viewer's right) |
| `Right_Arm_03` | Offset from Torso | Right arm (viewer's left) |
| `Left_Leg_04` | Offset from root | Left leg |
| `Right_Leg_05` | Offset from root | Right leg |

The `_end_XX` bones are invisible IK targets — they're not animated, just present for the glTF skinning to work.

### Two skinned meshes

The R6 rig has **two** skinned meshes:

- `Object_18` — the head (separate mesh for face decal projection)
- `Object_19` — the torso + arms + legs (one continuous mesh)

This is why the amputation engine works — all of `Object_19`'s vertices have a skin index pointing to one of the 6 bones, so the shader can discard per-bone.

### Bone aliasing

Different rigs use different bone names. The R6 rig uses `Torso_00`, `Head_01`, etc. The "Girl" rig uses slightly different names (`RightArm 2_03` instead of `RightArm_03`). The Face rig might use Mixamo naming.

RenderBlox normalizes all bone names to canonical form via `normalizeBoneName()`. See [Chapter 20](#chapter-20-bone-name-normalization) for details.

---

## Chapter 16: The camera/gizmo sync invariant

**This is the most important architectural invariant in the codebase.** If you break it, the gizmo appears to be broken.

### The problem

Three.js's `TransformControls` uses its own `camera` property to do raycasting:

```js
// Inside TransformControls, roughly:
const pointer = new Vector2();
const raycaster = new Raycaster();
raycaster.setFromCamera(pointer, this.camera);
// ... test intersection with gizmo geometry ...
```

If `this.camera` is not the same camera the renderer is currently using (`renderer.activeCam`), the ray goes into a *different* point in 3D space than what the user is looking at. Every click misses the gizmo.

### The trigger conditions

This happens any time you switch cameras:

1. **Entering FPV mode** — `activeCam` changes from `editorCam` to `sceneCam`
2. **Entering export mode** — same switch
3. **Entering/exiting cam preview modes** (auto → scene → editor)
4. **Any time you call `setActiveCamera()`**

### The fix

Every camera switch must call `syncGizmoCamera()`:

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

### Why the detach/attach pair

Setting `transformGizmo.camera = activeCam` alone is **not sufficient**. `TransformControls` caches internal state — the projection matrix, the object's world position, the ray origin. Without a detach+attach cycle, these cached values are stale for the first frame after the switch.

The detach+attach sequence forces a full recompute:

- `detach()` clears the current object and calls `updateMatrixWorld`
- `attach(obj)` re-queries the object's world matrix and re-projects the gizmo

### Where it's called

Called from `setActiveCamera()`:

```js
export function setActiveCamera(cam) {
  if (viewport.activeCam === cam) return;
  viewport.activeCam = cam;
  viewport.renderPass.camera = cam;
  syncGizmoCamera(viewport.transformGizmo, cam);  // ← HERE
  viewport.onCameraChange?.(cam);
}
```

And from `attachGizmoTo()`:

```js
export function attachGizmoTo(object3D) {
  const gizmo = viewport.transformGizmo;
  if (!gizmo) return;
  gizmo.camera = viewport.activeCam;   // ← always sync before attaching
  if (gizmo.object !== object3D) {
    gizmo.detach();
    if (object3D) gizmo.attach(object3D);
  }
  gizmo.visible = !!object3D;
}
```

### The "gizmo stuck on old bone" bug

A related bug that shows up in the Scene Editor: when you select bone A on character 1, then select bone B on character 2, the gizmo stays attached to bone A (which is no longer visible / no longer relevant). The rotation controls work but affect the wrong bone.

The fix in `editor-main.js`:

```js
sceneState.onSelectionChanged = () => {
  const sb = editorState.selectedBone;
  if (sb) {
    let belongs = false;
    for (let p = sb; p && obj && obj.root; p = p.parent) {
      if (p === obj.root) { belongs = true; break; }
    }
    if (!belongs) {
      editorState.selectedBone = null;
      window.__renderbloxSelectedBone = null;
      document.getElementById('vBone').style.display = 'none';
    }
  }
  // ... render panels + attachGizmo() ...
};
```

The check walks up the parent chain from the previously-selected bone to see if it's still a descendant of the newly-selected object. If not, it deselects the bone so the gizmo won't attach to a stale target.

### The invariant in one sentence

> **Every time `activeCam` changes, you must call `syncGizmoCamera()` before the next frame renders.**

If you ever add a new camera switch, audit this invariant.

---

## Chapter 17: Boot sequence

Every editor runs a boot function when the page loads. Here's `editor-main.js → boot()` step by step:

### 1. Apply saved theme

```js
applySavedTheme();  // reads localStorage, sets body.classList.add('dark')
```

### 2. Initialize viewport

```js
const viewportEl = document.getElementById('viewport');
initViewport(viewportEl);
```

This creates the renderer, scene, cameras, composer, controls, gizmo, sky, ground, lights, and starts loading the R6 template.

### 3. Set up scene callbacks

```js
sceneState.onObjectAdded = (obj) => { viewport.scene.add(obj.root); };
sceneState.onObjectRemoved = (obj) => { viewport.scene.remove(obj.root); };
sceneState.onChanged = () => { renderSceneList(); renderTimeline(); };
sceneState.onSelectionChanged = () => { /* re-render all panels */ };
```

### 4. Wire export context

```js
exportContext.renderer = viewport.renderer;
exportContext.scene = viewport.scene;
exportContext.sceneCam = viewport.sceneCam;
// ... etc
```

The export module gets handles to all the relevant Three.js objects.

### 5. Wire UI context

```js
uiContext.pushHistory = pushHistory;
uiContext.undo = undo;
uiContext.redo = redo;
// ... etc
```

The UI module gets handles to the editor's internal functions.

### 6. Wire face system hooks

```js
sceneState.createFaceDecal = createFaceDecal;
sceneState.updateFaceDecal = updateFaceDecal;
sceneState.findHeadBone = findHeadBone;
sceneState.setFaceByKey = (obj, key) => setFaceByKey(obj, key);
```

`scene.js` doesn't import `face-system.js` (to avoid circular deps), so the callbacks are injected from `editor-main`.

### 7. Wire R6 load callbacks

```js
viewport.onR6LoadOk = () => {
  document.getElementById('status-overlay').classList.add('hide');
  // Add default R6 if not loading a file
  if (editorState.skipDefaultR6) return;
  const c = addR6Character('R6-1');
  setSelected(c.id);
};
viewport.onR6LoadError = (err) => {
  showModelError(err);
};
```

### 8. Initialize timeline

```js
initTimeline({
  timelineEl: document.getElementById('timeline'),
  rulerEl: document.getElementById('timeline-ruler'),
  tracksEl: document.getElementById('timeline-tracks'),
  playheadEl: document.getElementById('playhead'),
  snapLineEl: document.getElementById('snap-line')
});
```

### 9. Initialize UI

```js
initMenuBar(buildMenuDefs());
initModals();
renderSceneList();
renderProperties();
renderAppearance();
renderBones();
renderCamera();
fitTimelineToDuration();
```

### 10. Wire event handlers

```js
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
```

### 11. Handle pending file

```js
const pending = getPendingFile();
if (pending) {
  editorState.skipDefaultR6 = true;
  setTimeout(async () => {
    const result = await loadSceneZip(pending.file);
    // ... post-load
  }, 800);
}
```

If the user dropped a file on the landing page, it's now loaded into the scene.

### 12. Start render loop

```js
startRenderLoop();
```

The render loop is a `requestAnimationFrame` cycle that:
- Updates `sceneState.time` if playing
- Applies camera keyframes
- Applies object keyframes
- Applies look keys
- Updates FPV movement
- Updates skeleton overlay
- Renders the frame

### Character Maker variant

The Character Maker's boot function is nearly identical, but:

- No timeline initialization (the Character Maker has no timeline)
- No audio system
- No camera keys
- Uses a different UI callback setup that focuses on single-character editing

---

# Part III — Deep dives

## Chapter 18: The Amputation Engine

**The most technically ambitious part of RenderBlox.** This chapter explains exactly how it works and why every piece is necessary.

### The problem statement

R6 characters are a **single skinned mesh**. All five limbs (head, torso, two arms, two legs) are part of one continuous mesh. `mesh.visible = false` hides the entire character — that's useless for "delete just the head."

The naive solution is to split the mesh into per-bone sub-meshes at load time. That works, but:

1. It destroys the seamless appearance at limb boundaries
2. It requires re-rigging (each sub-mesh needs its own skeleton binding)
3. It breaks skinning for vertex weights that span multiple bones
4. It increases draw calls (6 meshes instead of 1)

All four are bad. RenderBlox does it differently.

### The solution: fragment-level discard

Intercept the shader. Each vertex in a skinned mesh has a **skin index** — a `vec4` that says which bone(s) it's bound to. If you pass that skin index through to the fragment shader as a varying, each pixel knows which bone it belongs to.

In R6:

| Bone | Skin index (typical) |
|------|---------------------|
| `Torso_00` | 0 |
| `Head_01` | 1 |
| `Left_Arm_02` | 2 |
| `Right_Arm_03` | 3 |
| `Left_Leg_04` | 4 |
| `Right_Leg_05` | 5 |

(The exact indices depend on the rig — RenderBlox looks them up dynamically via `mesh.skeleton.bones.indexOf(bone)`.)

To hide the head, you `discard` every pixel whose skin index is 1.

### The vertex shader injection

Three.js's built-in skinning pipeline uses `#include <skinning_vertex>` to apply bone transforms. RenderBlox hooks into that inclusion point and passes the skin index through:

```glsl
// Declare the varying at the top of the vertex shader
varying vec4 vSkinIndex;

// After the built-in skinning is applied, capture the skin index
#include <skinning_vertex>
vSkinIndex = skinIndex;
```

The `skinIndex` variable is automatically provided by Three.js when the mesh is a `SkinnedMesh`. It's a `vec4` containing four bone indices (up to 4 bones can influence a single vertex).

### The fragment shader injection

The fragment shader needs two things:

1. The varying declaration to receive the skin index
2. The discard logic at the top of `main()`

```glsl
// Declare the varying
varying vec4 vSkinIndex;

void main() {
  // Discard any pixel belonging to a hidden bone
  if (vSkinIndex.x == 1.0 || vSkinIndex.y == 1.0 ||
      vSkinIndex.z == 1.0 || vSkinIndex.w == 1.0) discard;

  // ... rest of main ...
}
```

The `discard` statement in GLSL halts fragment processing entirely — the pixel is never written to the framebuffer. It's the cheapest possible rejection.

### The colour injection

Per-limb colouring uses the same varying, but injected in a different place — after `#include <color_fragment>`, which is where Three.js sets `diffuseColor.rgb`:

```glsl
#include <color_fragment>

// Paint left arm (index 2) red
if (vSkinIndex.x == 2.0 || vSkinIndex.y == 2.0 ||
    vSkinIndex.z == 2.0 || vSkinIndex.w == 2.0) {
  diffuseColor.rgb = vec3(1.0, 0.3, 0.3);
}
```

Multiple paints compose naturally — one `if` per painted part, each overwriting `diffuseColor.rgb` if the pixel belongs to that bone. Since a pixel can only be bound to one bone (mostly), the last matching `if` wins.

### The cache key — the most important detail

**Every material variant needs a unique `customProgramCacheKey`, or Three.js will recompile the shader on every frame.**

Why? Three.js caches compiled shader programs by a key. If the key doesn't change, Three.js reuses the compiled program. If the key changes, Three.js recompiles.

When you use `onBeforeCompile` to modify a shader, Three.js doesn't know about your modifications — it uses the base material's cache key. If you have two materials with the same base but different `onBeforeCompile` output, they'll collide in the cache and One wins.

The fix:

```js
newMat.customProgramCacheKey = () =>
  'appearance_' +
  mesh.skeleton?.uuid + '_' +
  hiddenParts.join('_') + '_' +
  JSON.stringify(partColors);
```

This makes the key unique per:

- Skeleton (each character has its own skeleton UUID)
- Hidden parts configuration (`head_left_arm` vs `head`)
- Colour configuration (`{"head":"#ff0000"}` vs `{"head":"#00ff00"}`)

Result: each unique combination compiles once, caches forever. Without this, you'd get a compile per frame and FPS drops from 60 to 8.

### The non-skinned mesh bail-out

Attachments (hats, imported GLBs, text planes) are **not** skinned meshes. They don't use `#include <skinning_vertex>`. If you try to declare `varying vec4 vSkinIndex` and use `skinIndex` on a non-skinned mesh, the shader compile fails with a mysterious error.

The fix is an early return:

```js
newMat.onBeforeCompile = (shader) => {
  if (!mesh.isSkinnedMesh) return;  // ← bail out early
  // ...rest of shader injection...
};
```

This bail-out prevents a whole class of hard-to-debug failures.

### The full code

Here's the complete `applyCharacterAppearance()` function from `scene.js`:

```js
export function applyCharacterAppearance(obj, hiddenParts = [], partColors = {}) {
  if (!obj || obj.type !== 'r6') return;
  obj.hiddenParts = hiddenParts;
  obj.partColors = partColors;

  const boneMap = {
    'head': 'Head_01',
    'left_arm': 'Left_Arm_02',
    'right_arm': 'Right_Arm_03',
    'left_leg': 'Left_Leg_04',
    'right_leg': 'Right_Leg_05',
    'torso': 'Torso_00'
  };

  obj.meshes.forEach(entry => {
    const mesh = entry.mesh;
    const mats = getMats(mesh);

    mats.forEach(mat => {
      // Cache original material for "reset" purposes
      if (!mat.userData.__originalMat) {
        mat.userData.__originalMat = mat.clone();
        mat.userData.__originalMat.map = mat.map;
      }

      const newMat = mat.userData.__originalMat.clone();

      // No mods — restore original
      if (hiddenParts.length === 0 && Object.keys(partColors).length === 0) {
        mesh.material = mat.userData.__originalMat;
        return;
      }

      newMat.onBeforeCompile = (shader) => {
        if (!mesh.isSkinnedMesh) return;

        // Build the discard check and colour statements
        let fragmentLogic = '';
        const indicesToHide = [];

        hiddenParts.forEach(part => {
          const bone = obj.bones[boneMap[part]]?.obj;
          if (bone && mesh.skeleton) {
            const idx = mesh.skeleton.bones.indexOf(bone);
            if (idx !== -1) indicesToHide.push(idx);
          }
        });

        Object.keys(partColors).forEach(part => {
          const bone = obj.bones[boneMap[part]]?.obj;
          if (bone && mesh.skeleton) {
            const idx = mesh.skeleton.bones.indexOf(bone);
            if (idx !== -1) {
              const c = new THREE.Color(partColors[part]);
              const r = c.r.toFixed(3);
              const g = c.g.toFixed(3);
              const b = c.b.toFixed(3);
              fragmentLogic += `if (vSkinIndex.x == ${idx}.0 || vSkinIndex.y == ${idx}.0 ||
                                 vSkinIndex.z == ${idx}.0 || vSkinIndex.w == ${idx}.0) {
                diffuseColor.rgb = vec3(${r}, ${g}, ${b});
              }\n`;
            }
          }
        });

        // Combine into one discard check
        let discardLogic = '';
        if (indicesToHide.length > 0) {
          const checks = indicesToHide.map(i =>
            `vSkinIndex.x == ${i}.0 || vSkinIndex.y == ${i}.0 ||
             vSkinIndex.z == ${i}.0 || vSkinIndex.w == ${i}.0`
          ).join(' || ');
          discardLogic = `if (${checks}) discard;\n`;
        }

        if (!discardLogic && !fragmentLogic) return;

        // Inject the vertex varying
        shader.vertexShader = 'varying vec4 vSkinIndex;\n' + shader.vertexShader.replace(
          '#include <skinning_vertex>',
          '#include <skinning_vertex>\n vSkinIndex = skinIndex;'
        );

        // Inject the fragment varying
        shader.fragmentShader = 'varying vec4 vSkinIndex;\n' + shader.fragmentShader;

        // Inject the discard at the top of main()
        if (discardLogic) {
          shader.fragmentShader = shader.fragmentShader.replace(
            'void main() {',
            `void main() {\n${discardLogic}`
          );
        }

        // Inject the colour logic after color_fragment
        if (fragmentLogic) {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `#include <color_fragment>\n${fragmentLogic}`
          );
        }
      };

      newMat.customProgramCacheKey = () => 'appearance_' +
        (mesh.skeleton?.uuid || 'none') + '_' +
        hiddenParts.join('_') + JSON.stringify(partColors);
      newMat.needsUpdate = true;
      mesh.material = newMat;
    });
  });
}
```

### Why this works for both R6 rigs

Both `r6.glb` and `r6-girl.glb` have the same underlying skeleton structure (6 animated bones), even if their bone names differ slightly. The `normalizeBoneName()` function (see [Chapter 20](#chapter-20-bone-name-normalization)) maps both to the canonical names (`Head_01`, etc.), so `boneMap` finds the right bone in both rigs.

The colour and hide functionality works identically on both rigs because they both use the standard skinning pipeline.

### Debugging the amputation engine

If amputation "doesn't work" (the character disappears entirely, or nothing happens):

1. **Check the console for shader compile errors.** A `<shader error>` message means a syntax problem in the injected GLSL.
2. **Verify `mesh.skeleton.bones` contains the expected bones.** Log `mesh.skeleton.bones.map(b => b.name)` and check the names match what `boneMap` expects.
3. **Verify `indicesToHide` is non-empty.** If `bone.skeleton.bones.indexOf(bone)` returns -1, the bone isn't in the skeleton.
4. **Check the `customProgramCacheKey`.** If two materials accidentally share the same key but have different `onBeforeCompile` output, you'll get visual glitches (wrong colour, half-hidden).

---

## Chapter 19: The Face Decal System

RenderBlox supports two types of faces:

1. **Library faces** — the built-in altiwyre SVG pack (~300 faces)
2. **User faces** — PNGs uploaded by the user

Both work by projecting a texture onto the head mesh with `DecalGeometry`.

### Why not just replace the head texture?

Because the R6 head is a **skinned mesh with UV mapping that's designed for the default smile**. If you replace the head's `map` (base texture) with a new image, you'd have to author that image with the exact same UV layout as the original R6 head texture. That's:

- Extremely difficult for casual users
- Not what the face pack provides (those are designed as decals)
- Would break if the user uploads a face that doesn't align with R6's UVs

The decal approach decouples the face from the head's UV mapping. You project an image in 3D space, and `DecalGeometry` generates the UVs to make the projection look like it's painted onto the head surface.

### The bone-local projection trick

The hardest part of the face system is getting the projection right for a **posed** head. The head is a `SkinnedMesh` — its vertices are transformed by bone matrices at render time. If you compute the decal position in the *rest pose* and apply it to a *posed* head, the decal ends up in the wrong place.

The solution is to compute everything in **bone-local space**. Here's what `computeFaceFrame(obj)` does:

```js
function computeFaceFrame(obj) {
  if (obj.__faceFrame) return obj.__faceFrame;

  const headMesh = findHeadMesh(obj);
  const headBone = findHeadBone(obj);
  if (!headMesh || !headBone || !headMesh.geometry?.attributes?.position) return null;

  obj.root.updateMatrixWorld(true);

  // Compute the transform from mesh space to bone space
  const toBone = new THREE.Matrix4();
  if (headMesh.isSkinnedMesh && headMesh.skeleton) {
    const bi = headMesh.skeleton.bones.indexOf(headBone);
    if (bi < 0) return null;
    toBone.multiplyMatrices(
      headMesh.skeleton.boneInverses[bi],
      headMesh.bindMatrix
    );
  } else {
    toBone.copy(headBone.matrixWorld).invert().multiply(headMesh.matrixWorld);
  }

  // Apply that transform to every vertex of the head geometry
  const geo = headMesh.geometry.clone();
  geo.applyMatrix4(toBone);

  // Compute the bounding box in bone space
  geo.computeBoundingBox();
  const bb = geo.boundingBox;

  // ... compute face size, offset, direction from the bbox ...

  obj.__faceFrame = {
    bone: headBone,
    tmpMesh: new THREE.Mesh(geo, new THREE.MeshBasicMaterial()),
    // ... all the precomputed values ...
  };
  return obj.__faceFrame;
}
```

The result is a "face frame" — a cached bundle of geometry, bone reference, and computed extents. Every time the face is repositioned, this frame is used as the base.

### Building the decal geometry

Once the face frame exists, `buildFaceGeometry(obj, ud)` creates the actual `DecalGeometry`:

```js
function buildFaceGeometry(obj, ud) {
  const fr = computeFaceFrame(obj);
  if (!fr) return null;

  // Face size is proportional to the head's bounding box
  const span = Math.max(fr.spanR, fr.spanU);
  const size = span * 0.9 * (ud.scale || 1);

  // Position in bone space (offset by user's X/Y)
  const center = new THREE.Vector3()
    .addScaledVector(fr.right, fr.cR + (ud.xOff || 0) * fr.spanR)
    .addScaledVector(fr.up, fr.cU + (ud.yOff || 0) * fr.spanU)
    .addScaledVector(fr.f, /* depth computed from zOff */);

  // Orientation: align with the head's local axes
  const euler = new THREE.Euler().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(fr.right, fr.up, fr.f),
    'XYZ'
  );

  // The decal box: how deep the projection goes
  const depth = Math.max(0.01, fr.dMax - fr.dMin);
  const back = fr.dMax - depth * (ud.zOff ?? FACE_DEFAULTS.zOff);
  const front = fr.dMax + depth * 0.2;

  try {
    const g = new DecalGeometry(
      fr.tmpMesh,
      center,
      euler,
      new THREE.Vector3(size, size, front - back)
    );
    return g.attributes.position && g.attributes.position.count > 0 ? g : null;
  } catch (err) {
    console.warn('DecalGeometry failed:', err);
    return null;
  }
}
```

The `DecalGeometry` constructor takes:
- The mesh to project onto
- Center position
- Orientation
- Box dimensions (width, height, depth)

It raycasts from a grid of points on the box, projecting them onto the mesh surface, and generates a small mesh that conforms to the head shape. The result is a decal that looks painted onto the 3D head.

### The default face problem

The default R6 head texture has a **smile baked in**. If you project a face decal on top, you get the decal *plus* the original smile showing through, which looks awful.

The fix is `clearHeadFaceTexture(obj)`:

```js
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
```

This nulls the head's base texture map, so the head appears as a plain coloured mesh. The material's colour is preserved, so the head still has skin tone — just no face.

When you clear the decal (`setFaceByKey(obj, 'default')`), `restoreHeadDefaultTexture()` puts the original map back:

```js
export function restoreHeadDefaultTexture(obj) {
  const headMesh = findHeadMesh(obj);
  if (!headMesh) return;
  if (!obj.__headOriginalMap) return;

  getMats(headMesh).forEach((mat, i) => {
    if (obj.__headOriginalMap[i]) {
      mat.map = obj.__headOriginalMap[i];
      mat.needsUpdate = true;
    }
  });

  obj.__headOriginalMap = null;
}
```

### Custom face uploads

When you click **Upload** in the Face Decal section:

```js
document.getElementById('fileInputFace')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const key = await addUploadedFace(file);
  await ensureFaceTexture(key);
  setFaceByKey(obj, key);
  pushHistory('Face');
  renderFaceSection();
});
```

`addUploadedFace()` does the following:

1. Reads the file as an ArrayBuffer
2. Creates an Image via `URL.createObjectURL`
3. Scales it to ≤ 512×512
4. Re-encodes it as PNG data URL
5. Stores it in `localStorage` under `renderblox_myfaces_v1`
6. Returns an `asset:asset_N` key

The asset ID is assigned by `assetStore.register()` on first use. On subsequent loads, `myFaceAssetId(i)` looks up the existing ID from `myFaceAssetIds` (an in-memory cache for this session) or registers it if not present.

### Texture caching

Decoded face textures are cached in `faceTexCache` (a `Map`):

```js
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
```

This means every face is decoded once per page load. Switching between faces is instant after the first decode.

---

## Chapter 20: Bone name normalization

Different 3D rigs use different bone naming conventions. This matters because RenderBlox needs to find bones by *purpose* (head, left arm, etc.), not by *name*.

### The problem

- **Standard R6 rig**: `Torso_00`, `Head_01`, `Left_Arm_02`, `Right_Arm_03`, `Left_Leg_04`, `Right_Leg_05`
- **Girl R6 rig**: `Torso`, `Head`, `Left Arm`, `RightArm 2_03`, `Left Leg`, `Right Leg` (note the space!)
- **Mixamo rigs**: `mixamorigHead`, `mixamorigLeftArm`, `mixamorigRightUpLeg`, etc.
- **VRM rigs**: `J_Bip_C_Hips`, `J_Bip_C_Spine`, etc.
- **Unknown rigs**: whatever the artist decided to name things

If RenderBlox hardcoded `Head_01` and the rig uses `Head`, the head-related code silently breaks (face decal doesn't appear, bone mode doesn't attach to head).

### The solution

`normalizeBoneName()` maps every variation to a canonical name:

```js
export const BONE_ALIASES = {
  'Torso_00':     ['Torso', 'Spine', 'Chest', 'Torso_01'],
  'Head_01':      ['Head', 'Head_06', 'neck', 'mixamorigHead'],
  'Left_Arm_02':  ['LeftArm', 'Left_Arm', 'UpperArm_L', 'LeftArm_02', 'mixamorigLeftArm'],
  'Right_Arm_03': ['RightArm', 'Right_Arm', 'RightArm_2_03', 'UpperArm_R', 'RightArm_03', 'mixamorigRightArm'],
  'Left_Leg_04':  ['LeftLeg', 'Left_Leg', 'UpperLeg_L', 'LeftLeg_04', 'mixamorigLeftUpLeg'],
  'Right_Leg_05': ['RightLeg', 'Right_Leg', 'UpperLeg_R', 'RightLeg_05', 'mixamorigRightUpLeg']
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
  return rawName;  // fallback: keep the original name
}
```

The key insight is the `strip()` function. By removing all non-alphanumeric characters, `RightArm 2_03`, `RightArm_2_03`, and `RightArm-2-03` all become `rightarm203`. This handles the girl rig's space-instead-of-underscore naming without needing a specific alias.

### Where normalization is applied

In `buildCharacter()`:

```js
const bones = {};
root.traverse(o => {
  if (o.isBone) {
    const canonical = normalizeBoneName(o.name);
    bones[canonical] = {
      obj: o,
      restQuat: o.quaternion.clone(),
      restPos: o.position.clone()
    };
  }
});
```

Every bone is stored under its canonical name. So `obj.bones.Head_01` works regardless of the underlying bone's actual name.

Presets then refer to canonical names:

```js
boneRotateWorld(o, 'Head_01', AY, Math.sin(t * 0.7) * 0.15);
```

The amputation engine's `boneMap` also uses canonical names:

```js
const boneMap = {
  'head': 'Head_01',
  'left_arm': 'Left_Arm_02',
  // ...
};
```

### Adding new aliases

If you find a rig that doesn't work with the current aliases, add its bone names to `BONE_ALIASES`:

```js
'Head_01': ['Head', 'Head_06', 'neck', 'mixamorigHead', 'J_Bip_C_Head'],
```

The `strip()` comparison means you don't have to worry about casing or separators — `J_Bip_C_Head` and `j bip c head` normalize to the same thing.

---

## Chapter 21: Keyframes and interpolation

Keyframes are the fundamental unit of animation in RenderBlox. Every animated property is driven by them.

### Keyframe structure

A keyframe is a plain JSON object:

```json
{
  "time": 2.5,
  "pos": [0, 0, 0],
  "quat": [0, 0, 0, 1],
  "scale": [1, 1, 1],
  "interp": "ease",
  "bones": {
    "Torso_00": { "q": [0, 0, 0, 1], "p": [0, 0, 0] },
    "Head_01": { "q": [0, 0, 0, 1], "p": [0, 2, 0] },
    "Left_Arm_02": { "q": [0.78, 0.09, -0.61, 0.07], "p": [1, 2, 0] },
    "Right_Arm_03": { "q": [0.78, 0.09, -0.61, 0.07], "p": [-1, 2, 0] },
    "Left_Leg_04": { "q": [0, 0, 0, 1], "p": [0.5, 0, 0] },
    "Right_Leg_05": { "q": [0, 0, 0, 1], "p": [-0.5, 0, 0] }
  }
}
```

Fields:

- `time` — when the keyframe happens (seconds)
- `pos` — world position [x, y, z]
- `quat` — world rotation [x, y, z, w] (quaternion)
- `scale` — scale [x, y, z]
- `interp` — 'linear', 'ease', or 'step'
- `bones` — bone transforms (R6 only): quaternion + position per bone

### Interpolation

When you scrub to time `t`, `interpolateKeyframes(obj, t)` finds the two surrounding keyframes and interpolates:

```js
export function interpolateKeyframes(obj, t) {
  const kfs = obj.keyframes;
  if (kfs.length === 1) return kfs[0];
  if (t <= kfs[0].time) return kfs[0];
  if (t >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1];

  // Find surrounding keyframes
  let ia = 0;
  for (let i = 0; i < kfs.length - 1; i++) {
    if (t >= kfs[i].time && t <= kfs[i + 1].time) { ia = i; break; }
  }

  const a = kfs[ia];
  const b = kfs[ia + 1];
  const span = Math.max(0.001, b.time - a.time);
  let u = (t - a.time) / span;

  // Apply interpolation mode
  const mode = a.interp || DEFAULT_INTERP;
  if (mode === 'step') u = 0;
  else if (mode === 'ease') u = u * u * (3 - 2 * u);

  // Linear interpolation for positions
  const pos = [
    a.pos[0] + (b.pos[0] - a.pos[0]) * u,
    a.pos[1] + (b.pos[1] - a.pos[1]) * u,
    a.pos[2] + (b.pos[2] - a.pos[2]) * u
  ];

  // Spherical interpolation for rotations
  const qa = new THREE.Quaternion(a.quat[0], a.quat[1], a.quat[2], a.quat[3]);
  const qb = new THREE.Quaternion(b.quat[0], b.quat[1], b.quat[2], b.quat[3]);
  const qr = qa.clone().slerp(qb, u);

  // ... same for scale and bones ...

  return { time: t, pos, quat: [qr.x, qr.y, qr.z, qr.w], scale, bones };
}
```

### Why slerp, not lerp?

Quaternions must be interpolated **spherically**, not linearly. Linear interpolation of quaternions produces:

- Non-unit quaternions (invalid rotations)
- Pinching when rotations are far apart
- The "gimbal lock" artifact

`slerp()` (spherical linear interpolation) travels along the shortest path on the unit 4D hypersphere, keeping quaternions normalized and rotations smooth.

### Interpolation modes

**Linear** (`'linear'`) — `u` stays as-is. Constant speed. Good for mechanical movement.

**Ease** (`'ease'`) — `u = u²(3 - 2u)` (smoothstep). Smooth acceleration in, deceleration out. Good for most animation.

**Step** (`'step'`) — `u = 0`. Holds the previous value until the next key. Good for teleports, spins, snaps.

Default is `'ease'`.

### Writing keyframes

`writeKeyframeAt(obj, t)`:

```js
export function writeKeyframeAt(obj, t) {
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

  // Replace existing keyframe at same time, or append
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
```

The `Math.abs(k.time - t) < 0.02` check means "a keyframe already exists within 20ms of the playhead". If so, it's replaced instead of appending a near-duplicate.

### Applying keyframes

`applyKeyframeToObject(obj, kf)` writes the interpolated values to the Three.js objects:

```js
export function applyKeyframeToObject(obj, kf) {
  obj.root.position.set(kf.pos[0], kf.pos[1], kf.pos[2]);
  obj.root.quaternion.set(kf.quat[0], kf.quat[1], kf.quat[2], kf.quat[3]);
  obj.root.scale.set(kf.scale[0], kf.scale[1], kf.scale[2]);

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
```

This is called every frame during playback. It's a "destructive" write — it overwrites the current transform with the interpolated values.

### The `__pinned` flag

When you drag an object that has keyframes, you don't want the keyframe playback to snap it back to the last keyframe position. So after drag end, `__pinned = true` is set:

```js
transformGizmo.addEventListener('dragging-changed', (e) => {
  if (!e.value) {
    pushHistory('Transform');
    const obj = getSelected();
    if (obj && obj.keyframes.length > 0) {
      obj.__pinned = true;
      toast('⏸ Pinned — scrub to re-attach to keys');
    }
  }
});
```

The render loop checks `__pinned`:

```js
if (obj.__pinned && !sceneState.playing) return;  // skip keyframe application
```

Scrubbing the playhead or pressing play clears `__pinned`, snapping the object back to the animated position.

---

## Chapter 22: Look keys

Look keys are a **separate animation track** from object keyframes. They animate *appearance*, not *pose*.

### Why separate?

Because you might want to:

- Animate the pose (via object keyframes)
- Animate the colour (via look keys)
- Do both at once, on different timelines

If they were the same track, changing the colour would overwrite the pose, and vice versa.

### Look key structure

```json
{
  "time": 2.5,
  "interp": "ease",
  "look": {
    "parts": [
      { "c": [1.0, 1.0, 1.0], "o": 1.0, "g": 0.0, "v": 1 },
      { "c": [0.8, 0.2, 0.2], "o": 1.0, "g": 0.0, "v": 1 },
      // ... one entry per mesh ...
    ],
    "face": "lib:smile"
  }
}
```

Fields per part:
- `c` — colour [r, g, b] (0–1)
- `o` — opacity (0–1)
- `g` — glow intensity (0–1.5)
- `v` — visibility (0 or 1)

`face` — current face key (or null for "leave unchanged")

### Capturing

`captureLook(obj)` snapshots the current state:

```js
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
  return {
    parts,
    face: obj.type === 'r6' ? (obj.faceKey || 'default') : null
  };
}
```

Called when you click **◉ Add Look Key (J)**.

### Interpolating

`interpolateLook(obj, t)`:

```js
export function interpolateLook(obj, t) {
  const ks = obj?.lookKeys;
  if (!ks || ks.length === 0) return null;
  if (ks.length === 1 || t <= ks[0].time) return ks[0].look;
  if (t >= ks[ks.length - 1].time) return ks[ks.length - 1].look;

  let ia = 0;
  for (let i = 0; i < ks.length - 1; i++) {
    if (t >= ks[i].time && t <= ks[i + 1].time) { ia = i; break; }
  }

  const a = ks[ia], b = ks[ia + 1];
  const u0 = (t - a.time) / Math.max(0.001, b.time - a.time);
  const u = easeU(u0, a.interp || DEFAULT_INTERP);

  const parts = (a.look.parts || []).map((pa, i) => {
    const pb = b.look.parts?.[i] || pa;
    return {
      c: [0, 1, 2].map(k => pa.c[k] + (pb.c[k] - pa.c[k]) * u),
      o: pa.o + (pb.o - pa.o) * u,
      g: (pa.g || 0) + ((pb.g || 0) - (pa.g || 0)) * u,
      v: (a.interp === 'step' || u0 < 0.5) ? pa.v : pb.v
    };
  });

  // Faces never blend: hold the earlier face until the next key
  return {
    parts,
    face: u0 >= 1 ? b.look.face : a.look.face
  };
}
```

Note the **face handling**: faces are discrete, not continuous. You can't blend two faces. So the earlier face is held until `u0 >= 1` (100% to the next key), then the next face appears. It's an instant swap at the boundary.

Visibility is similar — flip halfway between keys. Smooth opacity fading is possible, but visibility is binary.

### Applying

`applyLookAt(obj, t)` calls `interpolateLook` then `applyLook`:

```js
export function applyLook(obj, look) {
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

  // Sync the face decal with the head's opacity/visibility
  if (obj.faceDecal) {
    const hm = findHeadMesh(obj);
    const idx = hm ? obj.meshes.findIndex(m => m.mesh === hm) : -1;
    const hp = idx >= 0 ? look.parts?.[idx] : null;
    if (hp) {
      obj.faceDecal.visible = hp.v !== 0;
      if (obj.faceDecal.material) {
        setMatOpacity(obj.faceDecal.material, hp.o ?? 1);
      }
    }
  }

  // Face changes
  if (look.face && obj.type === 'r6' && look.face !== (obj.faceKey || 'default')) {
    sceneState.setFaceByKey?.(obj, look.face);
  }
}
```

The **face decal sync** at the end is critical: when the head fades out via look keys, the face decal must fade too. Otherwise you get a floating face on an invisible head.

### One-click effects

The Appearance panel has five one-click effects that write a few look keys at the playhead:

- **Fade out** — 2 keys: current colour + full opacity → current colour + zero opacity
- **Fade in** — reverse
- **Flash red** — 7 keys alternating current ↔ red+glow (with `step` interp for instant flashing)
- **Rainbow** — N keys with HSL hue cycling (with `linear` interp for smooth cycling)
- **Glow pulse** — 3 keys: current → glow=1 → current

See `bakeLookEffect()` in `scene.js` for the implementation.

---

## Chapter 23: Video export pipeline

Export is one of the two hardest parts of RenderBlox (the other is the amputation engine). This chapter walks through exactly what happens when you click **Export Video**.

### High-level flow

```
User clicks Export
    │
    ├─ Validate duration > 0
    │
    ├─ Save current state (time, playing, camKeyframes, bloom, shadow)
    │
    ├─ Enter export mode (onStateChange(true))
    │    ├─ Hide gizmo, cam helper, skeleton overlay
    │    ├─ Force sceneCam to be active camera
    │    └─ Update view mode label
    │
    ├─ Apply quality (shadow map size, bloom, pixel ratio)
    │
    ├─ Show progress overlay (with rotating tips)
    │
    ├─ Dispatch to accurate or quick mode
    │    │
    │    ├─ Accurate: frame-by-frame, deterministic
    │    └─ Quick: MediaRecorder, real-time
    │
    ├─ [on cancel] cancelRequested = true, wait for loop to notice
    │
    ├─ Restore original state
    │
    ├─ Hide progress overlay
    │
    └─ Trigger file download
```

### Accurate mode

The default. Frame-by-frame, deterministic, produces the same output on every machine (modulo GPU floating-point differences).

```js
async function accurateExport(rw, rh, fps, duration) {
  // 1. Check WebCodecs support
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('WebCodecs not available in this browser.');
  }

  // 2. Force renderer to export resolution
  const _r = exportContext.renderer;
  const _prevW = _r.domElement.width;
  const _prevH = _r.domElement.height;
  _r.setSize(rw, rh, false);

  const _prevAspect = exportContext.sceneCam.aspect;
  exportContext.sceneCam.aspect = rw / rh;
  exportContext.sceneCam.updateProjectionMatrix();
  if (exportContext.composer) exportContext.composer.setSize(rw, rh);

  // 3. Configure encoder
  const config = {
    codec: 'vp09.00.10.08',   // VP9 profile 0, level 1.0, 8-bit
    width: rw,
    height: rh,
    bitrate: exportSettings.bitrate,
    framerate: fps
  };

  const support = await VideoEncoder.isConfigSupported(config);
  if (!support.supported) {
    throw new Error(`Browser can't encode ${config.codec} at ${rw}×${rh}.`);
  }

  // 4. Load muxer
  const mod = await import('https://unpkg.com/webm-muxer@5/build/webm-muxer.mjs');
  const target = new mod.ArrayBufferTarget();
  const muxer = new mod.Muxer({
    target,
    video: { codec: 'V_VP9', width: rw, height: rh, frameRate: fps },
    fastStart: 'in-memory'
  });

  // 5. Set up encoder with chunk buffering
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

  // 6. Frame loop
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const microsPerFrame = 1e6 / fps;
  const gopSize = Math.max(1, Math.round(fps * 2));  // keyframe every 2 seconds

  for (let i = 0; i < totalFrames; i++) {
    if (exportContext.cancelRequested) {
      try { encoder.close(); } catch {}
      throw new Error('cancelled');
    }
    if (encError) throw encError;

    // Evaluate and render this frame
    const t = i / fps;
    evaluateSceneAt(t);
    renderFrameForExport();

    // Capture the frame
    const frame = new VideoFrame(exportContext.renderer.domElement, {
      timestamp: Math.round(i * microsPerFrame),
      duration: Math.round(microsPerFrame)
    });
    encoder.encode(frame, { keyFrame: (i % gopSize) === 0 });
    frame.close();

    // Backpressure: wait for encoder queue to drain
    while (encoder.encodeQueueSize > 12) {
      await new Promise(r => setTimeout(r, 2));
      if (encError) throw encError;
    }

    // Update progress every other frame
    if (i % 2 === 0 || i === totalFrames - 1) {
      updateProgress((i + 1) / totalFrames, `Rendering frame ${i + 1} / ${totalFrames}`);
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // 7. Finalize
  await encoder.flush();
  encoder.close();
  flushChunks();
  if (encError) throw encError;
  muxer.finalize();

  const webmBlob = new Blob([target.buffer], { type: 'video/webm' });

  // 8. Optional MP4 conversion
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
    input, output: mp4Output,
    video: { codec: 'avc', bitrate: QUALITY_HIGH }
  });
  await conversion.execute();
  const mp4Blob = new Blob([mp4Output.target.buffer], { type: 'video/mp4' });
  _restoreCanvas();
  return { blob: mp4Blob, ext: 'mp4' };
}
```

### Why force the renderer size?

Without the `_r.setSize(rw, rh, false)` call, the encoder captures the canvas at its current size (e.g. 1600×900 viewport), not the configured `rw × rh`. The `false` parameter means "don't update CSS size, only drawing buffer size" — so the canvas appears the same size on screen but renders at the target resolution.

After export, `_restoreCanvas()` puts everything back.

### Backpressure

`encoder.encodeQueueSize` grows unbounded if the encoder can't keep up with submissions. In a 60-second export, this could queue hundreds of frames, consuming gigabytes of memory.

The `while (encoder.encodeQueueSize > 12)` loop throttles the frame loop. Whenever the queue exceeds 12 frames, the loop pauses 2ms and waits. This keeps memory usage bounded.

### GOP (Group of Pictures)

`gopSize = fps * 2` means a keyframe every 2 seconds. Keyframes are larger (full image), but they allow seeking and prevent error propagation across long stretches.

For a 10-second export at 30 fps: 300 frames, 5 keyframes (at frames 0, 60, 120, 180, 240). This balances file size with seek-ability.

### Quick mode

Real-time recording via `MediaRecorder`. The canvas is captured as a `MediaStream` and recorded while the scene plays back at normal speed.

```js
function quickExport(rw, rh, fps, duration) {
  return new Promise((resolve, reject) => {
    // 1. Try codecs in preference order
    const tries = exportSettings.format === 'mp4'
      ? ['video/mp4;codecs=h264', 'video/mp4']
      : ['video/webm;codecs=vp9', 'video/webm'];

    let mimeType = '';
    for (const t of tries) {
      if (MediaRecorder.isTypeSupported(t)) { mimeType = t; break; }
    }
    if (!mimeType) {
      reject(new Error('No supported recording codec.'));
      return;
    }

    // 2. Capture the canvas
    const stream = exportContext.renderer.domElement.captureStream(fps);
    const chunks = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: exportSettings.bitrate
    });

    // 3. Set up data handlers
    recorder.ondataavailable = e => {
      if (e.data && e.data.size) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      // 4. Optional MP4 conversion
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const rawBlob = new Blob(chunks, { type: mimeType.split(';')[0] });

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
          resolve({ blob: mp4Blob, ext: 'mp4' });
          return;
        } catch (err) {
          console.warn('[QuickExport] MP4 conversion failed:', err);
        }
      }

      resolve({ blob: rawBlob, ext });
    };

    // 5. Start recording and playing
    recorder.start(250);
    sceneState.time = 0;
    sceneState.playing = true;

    // 6. Stop when duration elapses or cancelled
    const watcherTimer = setInterval(() => {
      if (sceneState.time >= duration - 0.001 || exportContext.cancelRequested) {
        clearInterval(watcherTimer);
        sceneState.playing = false;
        setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop();
        }, 400);
      }
    }, 60);
  });
}
```

The 400ms delay before `recorder.stop()` gives the recorder time to flush the last chunks.

### MP4 conversion via Mediabunny

WebCodecs only supports VP8/VP9 for broad browser compatibility. H.264 (MP4) is patent-encumbered and not universally available in `VideoEncoder`.

Mediabunny works around this by:

1. Taking the WebM (VP9) encoded blob
2. Decoding it internally
3. Re-encoding as H.264
4. Muxing into MP4 format

The whole pipeline is:

```
Canvas → VideoFrame → VP9 Encoder → WebM → Mediabunny → H.264 → MP4
```

This is a transcoding step — slower than direct H.264 encoding, but works everywhere Mediabunny works.

### Progress overlay with tips

While export runs, a rotating set of tips appears in the progress overlay. These are stored in `EXPORT_TIPS` in `export.js`:

```js
const EXPORT_TIPS = [
  { em: '💡', text: 'Tip: New keyframes default to Ease — natural acceleration.' },
  { em: '🎬', text: 'Quick mode takes exactly the length of your clip.' },
  { em: '🦴', text: 'Tip: In Bone mode, click a body part in the viewport.' },
  { em: '⏱️', text: 'Joke: Why did the animator go to therapy? Too many unresolved keyframes.' },
  // ... 20+ more ...
];
```

They rotate every 4.2 seconds, with a fade transition. It's a small thing, but it makes long exports less boring.

### Cancel handling

Clicking **Cancel** in the progress overlay calls `cancelExport()`, which sets `exportContext.cancelRequested = true`. The frame loop checks this flag every iteration:

```js
if (exportContext.cancelRequested) {
  try { encoder.close(); } catch {}
  throw new Error('cancelled');
}
```

The `try` block catches the "cancelled" throw, shows a "Export cancelled" toast, and skips the file download.

---

## Chapter 24: The zip-io asset store

`.rdbx` and `.rx6` files are ZIP archives containing a JSON manifest and binary assets. This chapter explains the asset management.

### The asset store

`assetStore` is a global map of binary assets:

```js
export const assetStore = {
  nextId: 1,
  map: {},

  register(type, name, bytes) {
    const id = 'asset_' + (this.nextId++);
    this.map[id] = { type, name, bytes };
    return id;
  },

  get(id) { return this.map[id] || null; },

  clear() { this.map = {}; this.nextId = 1; }
};
```

Each asset has:
- `id` — auto-assigned `asset_N`
- `type` — `'glb'`, `'obj'`, `'texture'`, `'rx6'`, `'face'`
- `name` — original filename
- `bytes` — ArrayBuffer

### The sound store

Sounds are similar but have runtime metadata:

```js
export const soundStore = {
  nextId: 1,
  map: {},

  register(name, bytes) {
    const id = 'sound_' + (this.nextId++);
    this.map[id] = {
      id,
      name,
      bytes,
      position: [0, 2, 0],
      volume: 1.0,
      muted: false,
      startTime: 0,
      duration: 0
    };
    return id;
  },

  get(id) { return this.map[id] || null; },
  remove(id) { delete this.map[id]; },
  all() { return Object.values(this.map); },
  clear() { this.map = {}; this.nextId = 1; }
};
```

### Save flow

`saveSceneZip()` in `zip-io.js`:

```js
export async function saveSceneZip(filename = null) {
  const manifest = buildManifest();     // JSON manifest
  const zip = new JSZip();

  // 1. Write manifest
  zip.file('renderblox.json', JSON.stringify(manifest, null, 2));

  // 2. Write each referenced asset
  const objectsFolder = zip.folder('objects');
  for (const id of manifest.assetIds) {
    const asset = assetStore.get(id);
    if (!asset) continue;

    const safeName = (asset.name || 'asset').replace(/[^a-zA-Z0-9._-]/g, '_');
    objectsFolder.file(`${id}_${safeName}`, asset.bytes);
  }

  // 3. Write sounds
  const soundsFolder = zip.folder('sounds');
  for (const s of soundStore.all()) {
    const ext = (s.name || 'sound.mp3').split('.').pop() || 'mp3';
    const safeName = (s.name || 'sound').replace(/[^a-zA-Z0-9._-]/g, '_');
    soundsFolder.file(`${s.id}.${ext}`, s.bytes);
  }

  // 4. Generate zip
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  // 5. Trigger download
  const defaultName = filename || `renderblox_scene_${Date.now()}.rdbx`;
  triggerDownload(blob, defaultName);

  return { blob, filename: defaultName, manifest };
}
```

### Load flow

`loadSceneZip(file)` detects format:

```js
export async function loadSceneZip(file) {
  const buffer = await file.arrayBuffer();
  const format = await detectRdbxFormat(buffer);

  if (format === 'old-json') {
    return await loadOldJsonFormat(buffer, file.name);
  }
  if (format === 'zip') {
    return await loadZipFormat(buffer, file.name);
  }
  throw new Error('File is neither a valid .rdbx nor a zip archive.');
}
```

`loadZipFormat()`:

1. Loads the ZIP
2. Reads `renderblox.json`
3. Parses the manifest
4. Extracts each asset into `assetStore`
5. Extracts each sound into `soundStore`
6. Calls `rebuildScene()` to recreate objects

### The `rebuildScene()` complexity

`rebuildScene()` is the largest function in the codebase (~200 lines). For each object in the manifest, it:

- Detects the type (r6 / primitive / light / model)
- Rebuilds the object from source (template clone, primitive creation, etc.)
- Applies saved transform
- Restores keyframes, look keys, bones
- Restores mesh states (colour, opacity, glow, texture)
- Restores face decal (async)
- Restores attachments (async)

It's wrapped in a try/catch per-object so one failure doesn't abort the whole load.

### Serializing procedural attachments

Procedural attachments (hats, boxes, text planes) have no source file. Their geometry is generated at runtime. To save them, RenderBlox serializes the geometry parameters inline:

```js
export function serializeAttachmentMesh(root) {
  if (root.isGroup) {
    return {
      kind: 'group',
      name: root.name,
      position: [root.position.x, root.position.y, root.position.z],
      quaternion: [root.quaternion.x, root.quaternion.y, root.quaternion.z, root.quaternion.w],
      scale: [root.scale.x, root.scale.y, root.scale.z],
      children: root.children.map(c => serializeAttachmentMesh(c)).filter(Boolean)
    };
  }

  if (root.isMesh) {
    const geo = root.geometry;
    return {
      kind: 'mesh',
      name: root.name,
      position: [root.position.x, root.position.y, root.position.z],
      quaternion: [root.quaternion.x, root.quaternion.y, root.quaternion.z, root.quaternion.w],
      scale: [root.scale.x, root.scale.y, root.scale.z],
      geometry: {
        type: geo.type,
        params: JSON.parse(JSON.stringify(geo.parameters || {}))
      },
      materials: (Array.isArray(root.material) ? root.material : [root.material]).map(mat => ({
        type: mat.type,
        color: mat.color ? '#' + mat.color.getHexString() : null,
        roughness: mat.roughness ?? null,
        metalness: mat.metalness ?? null,
        transparent: mat.transparent ?? false,
        opacity: mat.opacity ?? 1,
        side: mat.side ?? 0
      }))
    };
  }

  return null;
}
```

`deserializeAttachmentMesh()` rebuilds them from scratch:

```js
export function deserializeAttachmentMesh(THREE, snap) {
  if (snap.kind === 'group') {
    const g = new THREE.Group();
    g.name = snap.name;
    g.position.set(...snap.position);
    g.quaternion.set(...snap.quaternion);
    g.scale.set(...snap.scale);
    for (const child of snap.children) {
      const c = deserializeAttachmentMesh(THREE, child);
      if (c) g.add(c);
    }
    return g;
  }

  if (snap.kind === 'mesh') {
    let geo;
    const { type, params } = snap.geometry;
    if (type === 'BoxGeometry') geo = new THREE.BoxGeometry(params.width, params.height, params.depth);
    else if (type === 'CylinderGeometry') geo = new THREE.CylinderGeometry(params.radiusTop, params.radiusBottom, params.height, params.radialSegments);
    else if (type === 'ConeGeometry') geo = new THREE.ConeGeometry(params.radius, params.height, params.radialSegments);
    else if (type === 'PlaneGeometry') geo = new THREE.PlaneGeometry(params.width, params.height);
    else if (type === 'SphereGeometry') geo = new THREE.SphereGeometry(params.radius, params.widthSegments, params.heightSegments);
    else geo = new THREE.BoxGeometry(1, 1, 1);

    const mats = snap.materials.map(m => new THREE.MeshStandardMaterial({
      color: m.color ? new THREE.Color(m.color) : 0xffffff,
      roughness: m.roughness ?? 0.7,
      metalness: m.metalness ?? 0.05,
      transparent: m.transparent,
      opacity: m.opacity
    }));

    const mesh = new THREE.Mesh(geo, mats.length > 1 ? mats : mats[0]);
    mesh.name = snap.name;
    mesh.position.set(...snap.position);
    mesh.quaternion.set(...snap.quaternion);
    mesh.scale.set(...snap.scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}
```

This is what makes `.rx6` files fully self-contained. Without procedural serialization, hats would disappear on reload because there's no GLB to reference.

---

## Chapter 25: The audio system

The Scene Editor supports adding audio files to the scene. This chapter explains how it works.

### Architecture

- **`soundStore`** — holds audio binary data + metadata
- **`audio.js`** — WebAudio playback with 3D positioning
- **Timeline audio lane** — UI for placing sounds on the timeline

### The sound data

Each sound has:

```js
{
  id: 'sound_1',
  name: 'music.mp3',
  bytes: ArrayBuffer,
  position: [x, y, z],       // 3D world position
  volume: 1.0,               // 0-1
  muted: false,
  startTime: 0,              // when the sound starts (seconds into the timeline)
  duration: 0,               // filled in after decoding
  assetId: null
}
```

### Decoding

`decodeSound(soundId)` converts the raw bytes into an `AudioBuffer`:

```js
export async function decodeSound(soundId) {
  if (!audioContext) initAudio();

  if (decodedBuffers.has(soundId)) return decodedBuffers.get(soundId);

  const sound = soundStore.get(soundId);
  if (!sound) throw new Error('Sound not found: ' + soundId);

  const arrayBuffer = sound.bytes instanceof ArrayBuffer
    ? sound.bytes
    : sound.bytes.buffer;

  const buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  decodedBuffers.set(soundId, buffer);
  sound.duration = buffer.duration;
  return buffer;
}
```

The `.slice(0)` is important — `decodeAudioData` **detaches** the ArrayBuffer (transfers ownership to the decoder). Slicing creates a copy so the original stays usable.

### Playback

`playSound(soundId, options)` creates an `AudioBufferSourceNode` connected to a `GainNode` connected to a `PannerNode`:

```js
export function playSound(soundId, { startOffset = 0, loop = false } = {}) {
  if (!audioContext) initAudio();

  const sound = soundStore.get(soundId);
  if (!sound || sound.muted) return null;

  const buffer = decodedBuffers.get(soundId);
  if (!buffer) {
    // Not decoded yet — decode then play
    decodeSound(soundId).then(() => playSound(soundId, { startOffset, loop }));
    return null;
  }

  stopSound(soundId);  // stop any existing playback

  // Create the audio chain
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

  activeSources.set(soundId, { source, gain, panner });

  source.onended = () => {
    if (activeSources.get(soundId) === { source }) {
      activeSources.delete(soundId);
    }
  };

  return { source, gain, panner };
}
```

The `HRTF` panning model uses Head-Related Transfer Functions — a binaural synthesis that makes audio sound like it's coming from a 3D direction relative to the listener.

### Listener tracking

The `AudioContext` has a listener (essentially the "ears" of the scene). When the camera moves, the listener must move with it, or the 3D audio positioning breaks:

```js
export function updateListenerFromCamera(camera) {
  if (!audioContext) return;
  const listener = audioContext.listener;
  const pos = camera.position;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  const up = new THREE.Vector3(0, 1, 0);

  if (listener.positionX) {
    // Modern API (AudioParam-based)
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
    // Legacy API (setPosition/setOrientation)
    listener.setPosition(pos.x, pos.y, pos.z);
    listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
  }
}
```

The modern API uses `AudioParam.value` assignments which can be scheduled with `setValueAtTime` for smooth motion. The legacy API uses instantaneous setter methods.

---

## Chapter 26: The pending file handoff

The landing page (`index.html`) has a file drop zone. When you drop a file there, it needs to be loaded into the appropriate editor. This chapter explains the handoff.

### The problem

Two separate HTML pages (landing, editor) with no shared JavaScript state. How does dropping a file on page A cause page B to load it?

### The solution

`sessionStorage`. When you drop a file on the landing page:

```js
async function handleFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const buf = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));

  sessionStorage.setItem('renderblox_pendingFile', JSON.stringify({
    name: file.name,
    size: file.size,
    type: isRx6 ? 'rx6' : 'rdbx',
    format: fmt,
    data: base64
  }));

  // Then navigate to the appropriate editor
  if (isRx6) {
    window.location.href = 'chareditor.html';
  } else {
    window.location.href = 'editor.html';
  }
}
```

The file is base64-encoded and stored in `sessionStorage`, which persists across page navigations within the same tab.

### The reading side

Both editors check for a pending file on boot:

```js
function getPendingFile() {
  try {
    const raw = sessionStorage.getItem('renderblox_pendingFile');
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    sessionStorage.removeItem('renderblox_pendingFile');  // consume it

    if (!parsed.data) return null;

    const bytes = base64ToArrayBuffer(parsed.data);
    return {
      name: parsed.name,
      type: parsed.type,
      format: parsed.format,
      size: parsed.size,
      file: new File([bytes], parsed.name)
    };
  } catch (err) {
    console.warn('Failed to read pending file', err);
    return null;
  }
}
```

`getPendingFile()` is called from boot:

```js
const pending = getPendingFile();
if (pending) {
  editorState.skipDefaultR6 = true;  // don't spawn default R6
  setTimeout(async () => {
    const result = await loadSceneZip(pending.file);
    // ... post-load
  }, 800);
}
```

The `skipDefaultR6` flag prevents the editor from spawning a blank R6 on top of the loaded scene.

### Storage limits

`sessionStorage` is typically limited to 5-10 MB per tab. Large `.rdbx` files (with embedded audio) can exceed this. In that case:

```js
try {
  sessionStorage.setItem('renderblox_pendingFile', JSON.stringify({ ... }));
} catch (err) {
  console.warn('Could not stash file in sessionStorage', err);
  // Non-fatal — file just won't auto-open
}
```

If storage fails, the file isn't stashed. The user has to manually open the editor and use the import button.

---

## Chapter 27: The frame guide

The frame guide is a semi-transparent overlay that shows **what the exported video will contain**. It's not just a UI decoration — it actually changes the camera's projection so the outlined rectangle is exactly the exported frame.

### The presets

```js
export const GUIDE_PRESETS = {
  shorts:   { label: 'Shorts 9:16',   ar: 9 / 16, res: '1080x1920' },
  youtube:  { label: 'YouTube 16:9',  ar: 16 / 9, res: '1920x1080' },
  square:   { label: 'Square 1:1',    ar: 1,      res: '1080x1080' },
  portrait: { label: 'Portrait 4:5',  ar: 4 / 5,  res: '1080x1350' }
};
```

Plus a **match** preset that follows whatever the current export resolution is.

### Computing the guide rectangle

```js
export function getGuideRect() {
  const el = viewport.renderer.domElement.parentElement;
  const W = el.clientWidth, H = el.clientHeight;
  const Ae = getGuideAspect();
  const rw = Math.min(W * 0.9, H * 0.9 * Ae);
  const rh = rw / Ae;
  return {
    x: (W - rw) / 2,
    y: (H - rh) / 2,
    w: rw,
    h: rh,
    W, H, Ae
  };
}
```

The guide rectangle fits within 90% of the viewport, centered, with the correct aspect ratio for the target export resolution.

### Camera projection adjustment

The magic is in `refreshProjection()`:

```js
export function refreshProjection() {
  const el = viewport.renderer.domElement.parentElement;
  const W = el.clientWidth, H = el.clientHeight;

  // Editor cam always uses full viewport aspect
  viewport.editorCam.aspect = W / H;
  viewport.editorCam.updateProjectionMatrix();

  // Scene cam uses view offset to match the guide rectangle
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
```

`setViewOffset()` is a Three.js `PerspectiveCamera` method that lets you render a *sub-rectangle* of the camera's frustum to the full canvas. The parameters are:

- `fullWidth`, `fullHeight` — the "would-be" full viewport size
- `x`, `y` — the offset of the sub-rectangle within the full viewport
- `width`, `height` — the sub-rectangle size (which is the canvas size)

By setting the offset so the sub-rectangle is centered and matches the guide's aspect ratio, the camera renders exactly what the guide outlines. Everything outside the guide is context for the user, not part of the export.

### Suspending during export

When exporting, the guide is suspended:

```js
exportContext.onStateChange = (isExporting) => {
  editorState.exporting = isExporting;
  frameGuide.suspended = isExporting;
  updateActiveCam();
  updateViewModeLabel();
  refreshProjection();
};
```

`suspended = true` causes `refreshProjection()` to skip the view offset — the scene cam renders the full viewport, and the export captures at the configured resolution.

### Overlay rendering

The visual overlay is a `<div>` with a semi-transparent rectangle and a darkening box-shadow:

```html
<div class="fg-rect" style="left: Xpx; top: Ypx; width: Wpx; height: Hpx;">
  <span class="fg-label">Shorts 9:16 · 1080×1920</span>
  <div class="fg-safe">
    <i class="t">Shorts top bar</i>
    <i class="r">Shorts buttons</i>
    <i class="b">Title / channel zone</i>
  </div>
</div>
```

The `.fg-rect` box-shadow trick:

```css
.fg-rect {
  box-shadow: 0 0 0 9999px rgba(8,10,18,.45);
}
```

This casts a shadow that extends 9999px in every direction — creating a darkened area outside the rectangle without affecting the rectangle itself. The rectangle is the visible frame; everything outside is dimmed.

For Shorts/Portrait aspect ratios (< 0.7), additional safe-zone overlays show where the TikTok UI, YouTube Shorts buttons, and title area will be.

---

# Part IV — Extending RenderBlox

## Chapter 28: Adding a pose preset

Pose presets are procedural animation functions in `shared/scene.js → PRESETS`. To add a new one:

### 1. Write the function

```js
export const PRESETS = {
  // ... existing presets ...

  myPreset: (o, t) => {
    resetAllBones(o);

    // Rotate the head side to side
    boneRotateWorld(o, 'Head_01', AY, Math.sin(t * 3) * 0.5);

    // Wave the left arm
    boneRotateWorld(o, 'Left_Arm_02', AX, Math.sin(t * 8) * 0.8);

    // Tilt the torso
    boneRotateWorld(o, 'Torso_00', AZ, Math.sin(t * 2) * 0.1);
  }
};
```

`boneRotateWorld(o, name, axis, angle)` rotates the bone by `angle` radians around `axis` in world space. `t` is the elapsed time in seconds.

### 2. Add the button to both editors

In `chareditor.html`:

```html
<button class="preset-btn" data-preset="myPreset">
  <span class="em">🎪</span>My Preset
</button>
```

In `editor.html` (or the `renderProperties()` function in `ui.js`):

```html
${['idle','wave','point','walk','dance','rest','myPreset'].map(k => {
  // ...
})}
```

### 3. Update the keyboard handler

In `chareditor-main.js` and `editor-main.js`:

```js
if (['1','2','3','4','5','6','7'].includes(e.key)) {
  const order = ['idle', 'wave', 'point', 'walk', 'dance', 'rest', 'myPreset'];
  // ...
}
```

### 4. Test

Open the Character Maker, create a character, click your new preset button. The character should animate. If not, check:

- `resetAllBones` was called at the start
- Bone names are canonical (`Head_01`, not `Head`)
- The bone exists on the rig (`if (o.bones.Head_01)`)

---

## Chapter 29: Adding a face

Faces come from `models/faces/*.svg`. The filename (minus extension) is the face's identifier.

### 1. Add the SVG

Drop your SVG into `models/faces/`. It should be a 512×512 SVG with the face drawn on a transparent background.

### 2. Add the filename to `faces.js`

In `faceDefs()`:

```js
export function faceDefs() {
  const list = [
    "anchor_face", "angry_frown", /* ... */
    "my_new_face",  // ← add this
  ];
  // ...
}
```

The name is derived automatically: `my_new_face` → "My New Face".

### 3. Test

Reload the editor. Open the Face Decal section. Your new face appears at the bottom of the grid. Click it to apply.

### Alternative: procedural faces

If you don't want to author an SVG, you can add a procedural face to `FACE_LIBRARY` in `faces.js`:

```js
export const FACE_LIBRARY = [
  {
    id: 'my_procedural_face',
    name: 'My Procedural',
    em: '🎨',
    draw(g) {
      // g is a 2D canvas context at 512x512
      g.fillStyle = '#000';
      g.beginPath();
      g.arc(160, 200, 20, 0, Math.PI * 2);
      g.arc(352, 200, 20, 0, Math.PI * 2);
      g.fill();
      // ... draw more ...
    }
  },
  // ... existing faces ...
];
```

These faces are drawn at load time and cached the same way as SVG faces.

---

## Chapter 30: Adding a primitive shape

Primitives are created in `addPrimitive()` in `shared/scene.js`.

### 1. Add the geometry

```js
export function addPrimitive(primType, color = 0x3b82f6) {
  let geo;
  if (primType === 'box')      geo = new THREE.BoxGeometry(1, 1, 1);
  if (primType === 'sphere')   geo = new THREE.SphereGeometry(0.5, 32, 20);
  if (primType === 'cylinder') geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
  if (primType === 'cone')     geo = new THREE.ConeGeometry(0.5, 1, 32);
  if (primType === 'plane')    geo = new THREE.PlaneGeometry(2, 2);
  if (primType === 'torus')    geo = new THREE.TorusGeometry(0.6, 0.22, 16, 32);
  if (primType === 'torusKnot') geo = new THREE.TorusKnotGeometry(0.5, 0.15, 100, 16);  // ← new

  // ... rest unchanged ...
}
```

### 2. Add the button to the left panel

In `editor.html`:

```html
<button class="prim-btn" data-prim="torusKnot">TorusKnot</button>
```

### 3. Test

Click the button. A torus knot appears in the scene.

---

## Chapter 31: Adding a Look effect

Look effects are one-click animations that write multiple look keys. They're implemented in `bakeLookEffect()` in `shared/scene.js`.

### 1. Write the effect function

```js
export function bakeLookEffect(obj, type, t0, dur = 1) {
  // ... existing effects ...

  if (type === 'shrink') {
    // Not actually possible with look keys (which don't touch scale)
    // But you could implement a fade-to-black-and-back:
    const base = captureLook(obj);
    const clone = (l) => JSON.parse(JSON.stringify(l));
    writeLookKeyAt(obj, t0, clone(base));
    writeLookKeyAt(obj, t0 + dur / 2, tint(base, p => { p.c = [0, 0, 0]; p.o = 0.2; }));
    writeLookKeyAt(obj, t0 + dur, clone(base));
  }
}
```

### 2. Add the button to the Appearance panel

In `ui.js → renderAppearance()`:

```html
<div class="look-grid">
  <!-- ... existing buttons ... -->
  <button class="mini-btn" data-fx="shrink">⬛ Shrink</button>
</div>
```

### 3. Test

Select an object. Click your new effect button. The playhead should be before the effect's start time.

---

## Chapter 32: Adding an export format

Export formats are chosen in the `exportSettings.format` dropdown. To add one:

### 1. Add the option to `editor.html`

```html
<select id="expFormat">
  <option value="mp4" selected>MP4 (H.264 — recommended)</option>
  <option value="webm-vp9">WebM (VP9)</option>
  <option value="webm-vp8">WebM (VP8)</option>
  <option value="gif">GIF (slower, larger)</option>  <!-- new -->
</select>
```

### 2. Handle it in `export.js → accurateExport()` and `quickExport()`

For WebM/MP4, the current code handles it. For GIF, you'd need a GIF encoder (e.g. gif.js) and a different output blob:

```js
if (exportSettings.format === 'gif') {
  // Use gif.js or similar
  // Encode frames as GIF
  // Return { blob, ext: 'gif' }
}
```

### 3. Test

Export a short clip. Check the file downloads and opens correctly.

---

## Chapter 33: Adding a camera view

Camera views are presets for the editor camera position. They're implemented in `setCamera()` in `editor-main.js`.

### 1. Add the view logic

```js
function setCamera(view) {
  // ... existing views ...

  if (view === 'bottom') {
    viewport.editorCam.position.set(center.x, center.y - d, center.z + 0.01);
    viewport.editorCam.lookAt(center);
  }

  viewport.controls.target.copy(center);
  viewport.controls.update();
}
```

### 2. Add a button to the left panel

```html
<button class="cam-btn" data-cam="bottom">Bottom</button>
```

### 3. Add a keyboard shortcut (optional)

In `wireKeyboard()`:

```js
if (e.key.toLowerCase() === 'b' && !editorState.boneEditMode) {
  // Wait, B is already bone mode. Pick a free key.
  // Let's use Y for bottom view:
}
if (e.key.toLowerCase() === 'y') { setCamera('bottom'); return; }
```

### 4. Add to the menu

In `buildMenuDefs()`:

```js
view: [
  // ... existing items ...
  { label: 'Bottom', shortcut: 'Y', fn: () => setCamera('bottom') },
]
```

---

# Part V — Reference

## Chapter 34: R6 bone reference

The six animated bones of the R6 rig. All names are **canonical** (post-normalization).

| Bone | Position | Default rest rotation | Used for |
|------|----------|----------------------|----------|
| `Torso_00` | (0, 0, 0) | identity | Body root, spine |
| `Head_01` | (0, 2, 0) | identity | Head, face decal anchor |
| `Left_Arm_02` | (1, 2, 0) | (-π/2 around Z) | Left arm (viewer's right) |
| `Right_Arm_03` | (-1, 2, 0) | (π/2 around Z) | Right arm (viewer's left) |
| `Left_Leg_04` | (0.5, 0, 0) | (π/2 around Y) | Left leg |
| `Right_Leg_05` | (-0.5, 0, 0) | (π/2 around Y) | Right leg |

### Skin indices

In the `Object_19` skinned mesh (body), the skin index → bone mapping is:

| Index | Bone |
|-------|------|
| 0 | Torso_00 |
| 1 | Head_01 |
| 2 | Left_Arm_02 |
| 3 | Right_Arm_03 |
| 4 | Left_Leg_04 |
| 5 | Right_Leg_05 |

The `Object_18` mesh (head) has all vertices bound to `Head_01` (index 1).

### Amputation indices

The `boneMap` in `applyCharacterAppearance()`:

| Part ID | Bone | Skin index |
|---------|------|-----------|
| `'head'` | Head_01 | 1 |
| `'torso'` | Torso_00 | 0 |
| `'left_arm'` | Left_Arm_02 | 2 |
| `'right_arm'` | Right_Arm_03 | 3 |
| `'left_leg'` | Left_Leg_04 | 4 |
| `'right_leg'` | Right_Leg_05 | 5 |

---

## Chapter 35: File format schema reference

### `.rx6` manifest

```json
{
  "format": "RX6",
  "version": "1.0.0",
  "saved": "ISO 8601 timestamp",
  "character": {
    "name": "string",
    "gender": "male | female",
    "currentAction": "idle | wave | point | walk | dance | rest",
    "hiddenParts": ["head", "left_arm", ...],
    "partColors": { "head": "#ff0000", "torso": "#00ff00", ... },
    "position": [x, y, z],
    "quat": [x, y, z, w],
    "scale": [x, y, z],
    "bones": {
      "Torso_00": { "q": [x, y, z, w], "p": [x, y, z] },
      "Head_01": { "q": [...], "p": [...] },
      ...
    },
    "meshes": [
      {
        "name": "string",
        "visible": true,
        "color": [r, g, b],
        "textureAssetId": "asset_1 | null"
      },
      ...
    ],
    "faceDecal": {
      "faceKey": "lib:smile | asset:asset_1 | none",
      "textureAssetId": "asset_1 | null",
      "scale": number,
      "xOff": number,
      "yOff": number,
      "zOff": number
    },
    "attachments": [
      {
        "name": "Top Hat",
        "assetId": "asset_1 | null",
        "transform": {
          "p": [x, y, z],
          "q": [x, y, z, w],
          "s": [x, y, z]
        },
        "inline": {
          "kind": "group | mesh",
          "name": "string",
          "position": [x, y, z],
          "quaternion": [x, y, z, w],
          "scale": [x, y, z],
          "children": [...],
          "geometry": { "type": "CylinderGeometry", "params": {...} },
          "materials": [{ "color": "#111111", "roughness": 0.6, ... }]
        }
      }
    ]
  },
  "assetIds": ["asset_1", "asset_2"]
}
```

### `.rdbx` manifest

```json
{
  "format": "RDBX",
  "version": "1.0.0",
  "saved": "ISO 8601 timestamp",
  "duration": number,
  "camKeyframes": [
    {
      "time": number,
      "pos": [x, y, z],
      "quat": [x, y, z, w],
      "fov": number
    }
  ],
  "objects": [
    {
      "type": "r6 | primitive | light | model",
      "name": "string",
      "primType": "box | sphere | ... | null",
      "position": [x, y, z],
      "quat": [x, y, z, w],
      "scale": [x, y, z],
      "visible": true,
      "color": "number (for lights)",
      "intensity": "number (for lights)",
      "currentAction": "string",
      "hiddenParts": [...],
      "partColors": {...},
      "keyframes": [
        { "time": number, "pos": [...], "quat": [...], "scale": [...], "interp": "...", "bones": {...} }
      ],
      "lookKeys": [
        { "time": number, "interp": "...", "look": { "parts": [...], "face": "..." } }
      ],
      "faceKey": "string | null",
      "assetId": "string | null",
      "rx6AssetId": "string | null",
      "meshStates": [
        {
          "name": "string",
          "visible": true,
          "color": [r, g, b],
          "colors": [[r, g, b], ...],
          "opacity": number,
          "glow": number,
          "textureAssetId": "string | null"
        }
      ],
      "bones": { "Torso_00": { "q": [...], "p": [...] }, ... },
      "faceDecal": { ... },
      "attachments": [ ... ]
    }
  ],
  "environment": {
    "sunIntensity": number,
    "sunColor": "#rrggbb",
    "ambIntensity": number
  },
  "sounds": [
    {
      "id": "sound_1",
      "name": "music.mp3",
      "position": [x, y, z],
      "volume": number,
      "muted": boolean,
      "startTime": number,
      "duration": number
    }
  ],
  "assetIds": ["asset_1", "asset_2"],
  "soundIds": ["sound_1"]
}
```

---

## Chapter 36: Common patterns and gotchas

### Always call `updateMatrixWorld(true)` before reading world positions

```js
// BAD — uses stale matrix
bone.getWorldPosition(pos);

// GOOD — forces matrix update first
bone.updateMatrixWorld(true);
bone.getWorldPosition(pos);
```

Every frame, Three.js updates all matrices during render. But if you mutate the scene graph and then immediately read world positions, you get stale values. `updateMatrixWorld(true)` forces a full refresh.

### The `__`-prefixed convention

Fields starting with `__` are internal state:

- `__pinned` — object has been manually moved, don't apply keyframes
- `__manualPose` — bones manually rotated, don't apply presets
- `__lookPinned` — look keys paused for manual editing
- `__faceFrame` — cached face projection frame
- `__headOriginalMap` — cached head texture for face restore
- `__origColor`, `__origMap` — cached material data for reset
- `__glow` — per-material glow intensity (user data)

These are not part of the save format — they're transient runtime state.

### `skeletonClone` for duplicating skinned meshes

If you need to duplicate a character, **do not** use `.clone()` on a `SkinnedMesh`. It doesn't clone the skeleton properly. Use `SkeletonUtils.clone()` from Three.js addons:

```js
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
const dup = skeletonClone(template.scene);
```

### `customProgramCacheKey` is mandatory for shader mods

If you use `onBeforeCompile` to modify a shader and don't set a unique `customProgramCacheKey`, Three.js may cache the wrong compiled program for your material. See [Chapter 18](#chapter-18-the-amputation-engine) for details.

### Material cloning is not optional

Every loaded character needs its materials cloned, or changing colours on one character affects all characters using the same template:

```js
if (Array.isArray(o.material)) {
  o.material = o.material.map(cloneMaterialWithBackup);
} else if (o.material) {
  o.material = cloneMaterialWithBackup(o.material);
}
```

### `material.needsUpdate = true` after changes

Any time you change:

- `material.map`
- `material.transparent`
- `material.side`
- `material.needsUpdate` itself

...you must set `material.needsUpdate = true`. Three.js caches material state and doesn't detect changes automatically.

### Async face textures — handle the race

```js
await ensureFaceTexture(key);
setFaceByKey(obj, key);  // ← safe: texture is guaranteed ready
```

If you call `setFaceByKey()` without awaiting, the face won't appear until the texture loads. `setFaceByKey` does handle this internally (calls the async path if not cached), but explicit awaiting is safer.

### `Escape` key handling

Multiple places listen for `Escape`:

- Exit FPV mode
- Exit bone mode
- Close modals
- Cancel walk setup
- Cancel export

Priority order matters. See `editor-main.js → wireKeyboard()` for the exact cascade. The general rule: modal closes first, then FPV/bone mode, then walk setup.

### Detach before attach (gizmo)

Already covered in [Chapter 16](#chapter-16-the-cameragizmo-sync-invariant). It bears repeating: **always detach before attaching the gizmo to a new object** to force a matrix refresh.

---

## Chapter 37: Troubleshooting

### Export doesn't start

**Symptom:** Click Export Video, nothing happens.

**Cause:** WebCodecs not supported, or GPU busy.

**Fix:**

1. Open DevTools (`F12`) → Console
2. Look for `VideoEncoder is not defined` — means your browser doesn't support WebCodecs
3. Use Chrome 94+ or Edge 94+
4. If supported but nothing happens: close other tabs, restart browser

### Export hangs at 100%

**Symptom:** Progress reaches 100% and stays there for a long time.

**Cause:** MP4 transcoding via Mediabunny. On slow machines, this can take 30-60 seconds for a large file.

**Fix:** Wait. Or cancel and export as WebM instead (which skips transcoding).

### Export produces 0-byte file

**Symptom:** The download completes but the file is empty.

**Cause:** Encoding failed silently.

**Fix:**

1. Try a lower resolution (720p instead of 4K)
2. Try a lower bitrate (4 Mbps instead of 25 Mbps)
3. Try WebM instead of MP4
4. Check browser console for error messages

### Character disappears when painted

**Symptom:** You paint a limb red and the entire character vanishes.

**Cause:** The amputation shader failed to compile, or `mesh.skeleton.bones` doesn't contain the expected bones.

**Fix:**

1. Check console for shader errors
2. Verify the character has the standard 6-bone rig
3. If it's an imported model (not standard R6), per-limb colouring may not work

### Gizmo doesn't respond to clicks

**Symptom:** The gizmo is visible but clicking it does nothing.

**Cause:** `transformGizmo.camera` is out of sync with `activeCam`.

**Fix:** Click any view button (Front / Side / ¾ / Top) to trigger a camera re-sync. This calls `setActiveCamera()`, which calls `syncGizmoCamera()`.

### Bone mode attaches to wrong bone

**Symptom:** You click the head, but the gizmo attaches to an arm.

**Cause:** Distance-based nearest-bone lookup picks the wrong bone.

**Fix:** Click directly on the bone's mesh center, not the boundary. Or use the Bones panel to select a specific bone.

### Face decal doesn't appear

**Symptom:** You pick a face, nothing changes.

**Cause:** The face texture failed to load, or the projection found no geometry.

**Fix:**

1. Wait 1 second (textures load async)
2. Try a different face (maybe that one's broken)
3. Check console for errors
4. Reload the page

### Custom face disappeared

**Symptom:** You uploaded a face yesterday, it's gone today.

**Cause:** `localStorage` was cleared (browsing data cleanup, private mode, different browser).

**Fix:** Save your character as `.rx6` — the face is embedded in the file. Load the `.rx6` to restore the face.

### Undo doesn't work

**Symptom:** You press Ctrl+Z and nothing happens.

**Cause:** History stack may be empty, or you're at the beginning.

**Fix:**

1. Check that `Ctrl+Z` is being received (not stolen by browser)
2. Try clicking the Undo button in the toolbar
3. History is limited to 100 steps — you may have exhausted it

### Character animations jitter

**Symptom:** Playback is smooth but animations stutter.

**Cause:** Linear interpolation, or keyframes too close together.

**Fix:**

1. Change keyframe interpolation to `ease` (press `2` with the key selected)
2. Ensure no two keyframes are within 20ms of each other
3. If a preset is animating (e.g. Walk), make sure it's not being interrupted every frame

### "R6 template not loaded" error

**Symptom:** Red error overlay, "Could not load r6.glb".

**Cause:** The `models/r6.glb` file is missing or failed to load.

**Fix:**

1. Verify the file exists in your deployment
2. Check Network tab — was there a 404?
3. Try refreshing the page
4. Check CORS if self-hosting

### Timeline keys won't drag

**Symptom:** You try to drag a keyframe marker, but the playhead moves instead.

**Cause:** You're dragging the empty track area, not the key.

**Fix:** Grab the diamond marker itself — it's a small 12×12px hitbox. The empty track area is for scrubbing.

### Scene save fails silently

**Symptom:** You click Save, nothing downloads.

**Cause:** Zip generation failed, or download was blocked.

**Fix:**

1. Check browser console for errors
2. Check if downloads are blocked for the site (browser settings)
3. Try a smaller scene (fewer objects, fewer textures)
4. Check disk space (zipping a large scene requires memory)

---

## Chapter 38: Known limitations

### R6 only

Only R6 characters get the full feature set (per-limb colouring, amputation, pose presets, face decals). Imported GLB models can be moved, scaled, rotated, and animated with basic keyframes, but they don't get the R6-specific features.

### No IK

Animations are FK (forward kinematics) only. There's no IK (inverse kinematics) to keep a hand attached to a point in space while the body moves. Every bone rotation is explicit.

### No constraint system

You can't constrain a bone to look at a target, follow a path, or maintain a minimum distance. Every frame is evaluated independently from the keyframes.

### No animation blending

Character A's pose and Character B's pose don't blend — each object has its own independent animation state. Cross-fades between two preset animations require baking out intermediate keyframes manually.

### No physics

No rigid body simulation, no cloth simulation, no fluid simulation. Everything is manual keyframing.

### No particle systems

No fire, smoke, sparkles, or particle effects. You could fake them with lots of small primitive spheres, but that would be tedious.

### No text rendering in 3D

The "text" attachment renders text to a canvas and applies it to a plane. That text can't be edited after creation. You'd need to delete the attachment and create a new one.

### Limited texture controls

You can apply a texture to a body part, but you can't edit UVs, blend between multiple textures, or use normal maps / metallic maps / roughness maps.

### Audio is playback-only

You can add audio to a scene, but you can't scrub through it. Scrubbing the timeline is silent — the audio plays only during playback. This is because audio scrubbing would require re-decoding chunks, which is expensive.

### 300-second duration limit

The duration input is clamped to 1-300 seconds. The practical limit is lower — a 5-minute HD video is ~500 MB in memory during export, which can crash low-memory browsers.

### Fixed primitives only

The primitive shapes are hardcoded (box, sphere, cylinder, cone, plane, torus). You can't add custom parametric shapes.

### No mobile video export

Mobile browsers usually fail video export due to limited WebCodecs support and memory constraints. Use desktop for export.

### Two R6 rigs only

The Character Maker only supports the two bundled rigs (`r6.glb` and `r6-girl.glb`). Imported rigged characters work in the Scene Editor but not the Character Maker.

### No animation import

You can't import `.fbx` or `.gltf` animation files. All animations must be authored in RenderBlox.

---

## Chapter 39: Roadmap

These are features that have been considered but not implemented. They're not promises — just ideas.

### Short-term (possible soon)

- **Better undo granularity** — currently undoes whole operations, could undo individual bone rotations
- **Copy/paste between scenes** — paste an object from one `.rdbx` into another
- **Preset previews** — animated thumbnails for pose presets
- **More primitives** — capsule, pyramid, icosahedron
- **Custom keyframe easing** — cubic bezier handles (like Blender's F-curve editor)
- **Multiple audio tracks** — currently one per scene (well, technically N sounds, but each can only play once per timeline)
- **Post-processing controls** — user-adjustable bloom strength, vignette, chromatic aberration

### Medium-term (would require more work)

- **IK solver** — basic two-bone IK for arms and legs
- **Animation library** — pre-made animation clips (walk cycles, dances, etc.) that can be applied without baking
- **Blend shapes** — for expressions beyond face decals
- **Particle system** — simple sprite-based particles for smoke, fire, sparkles
- **Import F-curves** — load Blender-exported animation as RenderBlox keyframes
- **Export to Roblox** — `.rbxm` / `.rbxmx` output (very hard, requires Roblox format understanding)

### Long-term (aspirational)

- **Custom rigs** — import arbitrary rigged GLBs and use them as characters
- **Real-time collaboration** — multiple users editing the same scene simultaneously
- **Cloud render farm** — offload heavy exports to a server
- **Web-based rigging** — actually rig models in-browser
- **Full shading editor** — node-based materials like Blender

None of these are currently in development. If you want any of them, open an issue on GitHub — a feature gets built when someone needs it enough to file it.

---

# Part VI — Credits and disclosures

## Chapter 40: Credits

RenderBlox exists because of a lot of people. This chapter names them and explains what each contributed.

### 👤 Project

**Creator & maintainer** — [renderfox5213](https://github.com/renderfox5213)

Renderfox5213 conceived the project, wrote the majority of the code, designed the UI, tested the workflows, and shipped the live app at [renderblox.vercel.app](https://renderblox.vercel.app). Every feature in RenderBlox either came from renderfox5213 directly or from an issue/PR submitted to the repo.

**AI coding partner** — **DeepSeek V4.1 Flash**

Heavily used for the amputation shader, the export pipeline refactor, the module splitting, and general code structure. See [Chapter 41](#chapter-41-ai-usage-disclosure) for the full disclosure of what the AI did and didn't do.

### 🎭 3D models

**`r6.glb` — Roblox R6 [Rigged]**  
Original author: **p0x38** on Sketchfab  
License: [CC-BY-SA-4.0](http://creativecommons.org/licenses/by-sa/4.0/)  
Source: [sketchfab.com/3d-models/roblox-r6-rigged-fd308c3375a94116b5958085ee6d77b8](https://sketchfab.com/3d-models/roblox-r6-rigged-fd308c3375a94116b5958085ee6d77b8)

The male R6 rig. Six-bone skeleton, two skinned meshes (head + body), matching the classic Roblox R6 proportions. Used by the Character Maker's male gender option and by the Scene Editor's default R6 character.

**`r6-girl.glb` — Roblox Women Rigged**  
Original author: **Piethekiddev** on Sketchfab  
License: [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/)  
Source: [sketchfab.com/3d-models/roblox-women-rigged-5c1b9239ccf349f397d7f3a99bfbcbdd](https://sketchfab.com/3d-models/roblox-women-rigged-5c1b9239ccf349f397d7f3a99bfbcbdd)

The female R6 rig. Same skeleton structure as the male rig, different proportions. Used by the Character Maker's female gender option. Note: the bone names differ slightly (`RightArm 2_03` instead of `RightArm_03`), which is why the bone normalization system ([Chapter 20](#chapter-20-bone-name-normalization)) exists.

### 🎨 Face library

**altiwyre face pack** — ~300 SVG faces

The face pack stored in `models/faces/` was originally created by the artist known as **altiwyre**. These are the same style of faces that Roblox animators have been re-uploading to the platform since around 2016. The SVGs cover every plausible expression:

- Smile, smirk, frown, pout
- Laughing, crying, screaming
- Angry, annoyed, deadpan
- Suspicious, smug, unhinged
- Blank stare, heart eyes, X eyes
- And roughly 290 more

RenderBlox uses these as the built-in face library. They are loaded by `shared/faces.js → drawLibraryFace()`, which draws each SVG to a 512×512 canvas and caches it as a `CanvasTexture`.

If you are the original artist and want to be credited differently (or want the pack removed), please open an issue on GitHub.

### 🧰 Libraries

RenderBlox uses the following open-source libraries. None of them are modified — they're imported directly from their CDN distributions via the import map in each HTML file.

**[Three.js](https://threejs.org)** — MIT license  
The 3D rendering engine. Every bit of 3D rendering goes through Three.js: the scene graph, the renderer, the cameras, the lights, the shaders, the geometry, the materials, the post-processing.

**[JSZip](https://stuk.github.io/jszip/)** — MIT / GPLv3 dual license  
The ZIP archive library. Used to create and read `.rdbx` and `.rx6` files.

**[Mediabunny](https://mediabunny.dev)** — MIT license  
The MP4 conversion library. Takes WebM blobs produced by WebCodecs and transcodes them to H.264 MP4.

**[webm-muxer](https://github.com/Vanilagy/webm-muxer)** — MIT license  
The WebM container library. Takes encoded video chunks and packages them into a valid WebM file.

**[three/addons](https://github.com/mrdoob/three.js/tree/dev/examples/jsm)** — MIT license (part of Three.js)  
Various helper classes: `GLTFLoader`, `OBJLoader`, `OrbitControls`, `TransformControls`, `EffectComposer`, `UnrealBloomPass`, `SkeletonUtils`.

**Browser APIs:**

- **WebCodecs** — `VideoEncoder`, `VideoFrame` for video encoding
- **WebAudio** — `AudioContext`, `PannerNode`, `GainNode` for audio
- **Canvas API** — `CanvasRenderingContext2D` for face rendering
- **File API** — `File`, `FileReader`, `Blob` for file I/O
- **LocalStorage** — persistent storage for theme, recent files, custom faces
- **SessionStorage** — pending file handoff between pages

### 🌐 Community

**Everyone who filed bugs.** The list is too long to enumerate here, but every issue on GitHub has shaped RenderBlox. Special thanks to anyone who filed a bug with a reproduction case and screenshots — those are 10× more useful than vague "it doesn't work" reports.

**Everyone who sent screenshots.** Seeing actual users' characters in the issue tracker is a huge morale boost and helped prioritize features.

**The r/robloxgamedev community.** The original inspiration for RenderBlox came from me getting the want to animate after reading community posts. However, Blender didn't feel like it hit the vibe I wanted for Roblox                                                                   animating

**The Three.js community.** No specific contribution, but the Three.js examples and docs are the single most important resource for building anything 3D on the web.

### 🏗️ Infrastructure

**Vercel** — free hosting for the live app at [renderblox.vercel.app](https://renderblox.vercel.app).

**GitHub** — repository hosting, issue tracking, and CI.

**Cloudflare** — CDN for the libraries (via jsDelivr and unpkg).

---

## Chapter 41: AI usage disclosure

RenderBlox was built with substantial AI assistance. This chapter is a full, honest disclosure of what the AI did and what it didn't.

### The AI partner

**DeepSeek V4.1 Flash** — a large language model made by DeepSeek, accessed via their API. It was used as a coding assistant, not as a code generator. Every line of AI-suggested code was reviewed, tested, and often substantially rewritten by the human maintainer.

### What the AI did

**Amputation shader (heavily AI-assisted)**

The core amputation logic — the `vSkinIndex` varying, the `discard` injection, the `customProgramCacheKey` — was iterated through many AI sessions. The initial versions had bugs:

- The fragment shader tried to use `varying vec4 vSkinIndex` on non-skinned meshes (compile errors)
- The cache key wasn't unique per-material (every frame recompiled the shader)
- The colour injection point was wrong (`#include <color_fragment>` was inserted in the wrong order)

The AI helped debug each of these iteratively. The final implementation is a mix of AI-suggested GLSL and human-refined logic (particularly the `strip()` function in bone normalization and the `boneMap` structure).

**Export pipeline refactor**

The split between "accurate" and "quick" export modes, the backpressure logic (`while (encoder.encodeQueueSize > 12)`), and the Mediabunny MP4 conversion pipeline were all AI-assisted. The AI wrote the initial working code, and the human maintainer refined it:

- Added the `preserveDrawingBuffer: true` fix for green frames
- Added the `_r.setSize(rw, rh, false)` fix for resolution mismatch
- Added the `chunkBuffer` with sort-before-flush logic to fix timestamp ordering

**Module splitting**

The original codebase had a single `editor.js` file with ~5000 lines. The AI helped refactor it into the current modular structure (`viewport.js`, `scene.js`, `ui.js`, etc.). This was mostly mechanical — splitting one big file into smaller files with clear responsibilities, adding imports and exports, resolving circular dependencies.

**Documentation (this file)**

The AI helped write the initial structure of this documentation file. The human maintainer then went through chapter by chapter, verified every technical claim, fixed errors, and rewrote sections that were vague or misleading.

**Bug fixes**

Whenever a specific bug was reported with a reproduction case, the AI was used to generate candidate fixes. The human maintainer tested each candidate and chose the one that worked.

### What the AI did NOT do

**Design decisions**

Every architectural choice in RenderBlox — using `sceneState` as a singleton instead of a state manager, splitting into accurate vs. quick export, using `SkeletonUtils.clone` instead of `.clone()`, requiring `preserveDrawingBuffer: true` — was made by the human maintainer. The AI was used to *implement* decisions, not *make* them.

**UI design**

The entire UI — layout, color scheme, spacing, iconography, the rotating tips, the empty states — was designed by renderfox5213. The AI helped with CSS implementation but not with the visual design.

**Feature scoping**

The set of features (what's in, what's out, what's planned) was decided by the human maintainer based on the project's goals. The AI was not consulted on "what should RenderBlox do".

**Testing**

Every feature was tested by the human maintainer in a real browser before being merged. The AI never ran code — it only suggested code. Whether the code worked was determined by clicking buttons in Chrome.

**Bug diagnosis**

When a bug was reported, the human maintainer investigated it, reproduced it, and determined the root cause. The AI helped generate fixes based on the diagnosed cause, but it did not diagnose bugs on its own.

### Specific AI-assisted code

For full transparency, here are the areas where AI output was most directly incorporated:

1. **`applyCharacterAppearance()`** in `scene.js` — the shader injection logic
2. **`syncGizmoCamera()`** in `common.js` — the detach/attach pair
3. **`normalizeBoneName()`** in `scene.js` — the aliasing table and strip logic
4. **`accurateExport()`** in `export.js` — the frame loop, backpressure, and muxer setup
5. **`quickExport()`** in `export.js` — the MediaRecorder wrapper
6. **`loadOldJsonFormat()`** in `zip-io.js` — the magic-byte detection
7. **`serializeAttachmentMesh()`** in `zip-io.js` — the recursive geometry serialization
8. **The CSS grid layouts** in `editor.css` — the `grid-template-areas` definitions
9. **This documentation file** — the initial structure and many of the deep-dive chapters

In each case, the AI-generated code was reviewed, tested, and often substantially modified before being merged.

### What this means for the project

RenderBlox is **not** an AI-generated project. It's a human-designed project that was built with AI assistance — the same way it would be built with Stack Overflow assistance, or GitHub Copilot assistance, or Pair programming assistance.

The analogy: no one claims a novel is "written by Grammarly" if the author used Grammarly to fix commas. RenderBlox was written by a human maintainer who used DeepSeek V4.1 Flash as a coding assistant. The creative vision, the architecture, the design, and the bug-fixing all come from the human.

That said, the AI contribution was substantial and non-trivial. The project would not exist in its current form without it — the amputation shader in particular is a piece of code that would have taken a human many hours to iterate through the necessary compile-error cycles.

### A note on AI transparency

If you're building a project with heavy AI assistance, consider writing a disclosure like this one. AI-assisted code is legitimate code — the output is what matters — but it's important to be transparent about the process. Users deserve to know who (or what) wrote the code they're running.

---

## Chapter 42: License

### The RenderBlox source code

The **source code** of RenderBlox is licensed under the **MIT License**:

```
MIT License

Copyright (c) 2026 renderfox5213

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Do whatever you want with the code — fork it, redistribute it, sell it, embed it in your commercial product. Just keep the copyright notice.

### Bundled assets

The bundled assets have **different licenses** that you must respect:

**`r6.glb`** — CC-BY-SA-4.0 (p0x38)  
Requires attribution and share-alike. If you fork RenderBlox, you must keep the attribution to p0x38 and distribute under a compatible license.

**`r6-girl.glb`** — CC-BY-4.0 (Piethekiddev)  
Requires attribution. You can use it in any product, but you must credit Piethekiddev.

**Face SVGs (altiwyre pack)** — original artist's terms  
No specific license is attached. If you use these in a product, credit altiwyre.

**Three.js, JSZip, Mediabunny, webm-muxer** — their respective licenses (all permissive).  
You can use them in commercial products without payment, but you must follow their terms.

### What this means for you

If you fork RenderBlox and use your own models:

- Your code: MIT (or whatever you choose)
- Your models: your choice

If you fork RenderBlox and use the bundled models:

- Your code: MIT (or whatever)
- `r6.glb`: CC-BY-SA-4.0 — must credit p0x38 and share-alike
- `r6-girl.glb`: CC-BY-4.0 — must credit Piethekiddev
- Faces: must credit altiwyre

The safest move for a commercial product is to use your own models, not the bundled ones.

---

## Chapter 43: Glossary

**`.rdbx`** — Scene file format. ZIP archive containing a JSON manifest and asset files.

**`.rx6`** — Character file format. ZIP archive containing a JSON manifest and asset files.

**Accurate export** — Frame-by-frame rendering mode. Deterministic, slower, better quality.

**Amputation** — Hiding a body part by discarding its fragments in the shader.

**Asset store** — In-memory registry of binary files (GLBs, textures, sounds).

**Auto-key** — Toggle that makes every edit write a keyframe at the playhead.

**Bone** — A joint in a skeleton. R6 has six: torso, head, two arms, two legs.

**Bone mode** — Editor mode where clicking the mesh attaches the gizmo to the nearest bone.

**Camera keyframe** — A keyframe for the scene camera (position, rotation, FOV).

**Decal geometry** — A mesh generated by projecting a 2D image onto a 3D surface.

**Ease interpolation** — Smoothstep function that accelerates then decelerates.

**FPV** — First-person view. Fly through the scene with WASD.

**Frame guide** — Semi-transparent overlay showing the export framing.

**Gizmo** — The 3D manipulator used to move, rotate, or scale objects.

**GOP** — Group of pictures. Number of frames between keyframes in a video.

**H.264** — Video codec used in MP4 files. Patent-encumbered but universally supported.

**HRTF** — Head-Related Transfer Function. Binaural audio synthesis.

**Keyframe** — A saved pose + transform at a specific time.

**Linear interpolation** — Constant-speed interpolation.

**Look key** — A keyframe for appearance (colour, opacity, face, glow).

**Manifest** — The `renderblox.json` file inside a `.rdbx` or `.rx6`.

**MediaRecorder** — Browser API for recording a MediaStream to a video file.

**Mediabunny** — Library for transcoding video between formats.

**MP4** — Container format for H.264 video.

**Preset** — A procedural animation function (Idle, Wave, Point, etc.).

**Quick export** — Real-time recording mode. Faster, non-deterministic.

**R6** — Roblox's blocky character model with six body parts.

**Skin index** — The bone(s) a vertex is bound to, expressed as a `vec4`.

**Skinned mesh** — A mesh whose vertices are deformed by bones at runtime.

**Slerp** — Spherical linear interpolation. Used for quaternions.

**Step interpolation** — Holds the previous value until the next key.

**TransformControls** — Three.js's gizmo class.

**VP9** — Video codec used in WebM files.

**WebCodecs** — Browser API for hardware-accelerated video encoding/decoding.

**WebM** — Container format for VP8/VP9 video.

**Walk setup** — FPV workflow for baking a walk animation.

---

**End of documentation.**

If you read this far, you're the kind of person who should be contributing. Open an issue at [github.com/renderfox5213/renderblox/issues](https://github.com/renderfox5213/renderblox/issues) and tell us what's broken, what's missing, or what's confusing.

— renderfox5213, 2026-11-03
