const S = 512;
const INK = '#0b0b0b';

function stroke(g, w = 16) { g.strokeStyle = INK; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; }
function fill(g, c = INK) { g.fillStyle = c; }
function ell(g, x, y, rx, ry, rot = 0, style = 'fill') {
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (style === 'fill') g.fill(); else g.stroke();
}
function line(g, pts) {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
}
function quad(g, a, c, b) { g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(...c, ...b); g.stroke(); }
function eyeWhite(g, x, y, rx, ry, pupilDx = 0, pupilDy = 0, pr = null) {
  fill(g, '#fff'); ell(g, x, y, rx, ry); stroke(g, 7); ell(g, x, y, rx, ry, 0, 'stroke');
  fill(g); ell(g, x + pupilDx, y + pupilDy, pr ?? rx * 0.45, pr ?? rx * 0.45);
}

export const FACE_LIBRARY = [
  { id: 'smug', name: 'Smug', em: '😏', draw(g) {
    stroke(g, 14);
    quad(g, [120, 195], [175, 165], [230, 190]); quad(g, [282, 190], [340, 160], [395, 195]);
    fill(g, '#fff'); stroke(g, 8);
    g.save(); g.beginPath(); g.rect(110, 215, 125, 36); g.rect(277, 215, 125, 36); g.clip();
    ell(g, 172, 232, 56, 36); ell(g, 340, 232, 56, 36); g.restore();
    fill(g); ell(g, 190, 234, 17, 17); ell(g, 358, 234, 17, 17);
    stroke(g, 14); quad(g, [105, 232], [172, 205], [235, 232]); quad(g, [277, 232], [340, 205], [405, 232]);
    stroke(g, 16); quad(g, [165, 345], [290, 385], [385, 320]); line(g, [[385, 320], [405, 295]]);
  }},
  { id: 'derp', name: 'Derp', em: '🤪', draw(g) {
    eyeWhite(g, 175, 210, 58, 62, -22, 14, 22); eyeWhite(g, 340, 200, 48, 50, 18, -10, 17);
    stroke(g, 14); quad(g, [120, 140], [175, 120], [230, 150]); quad(g, [290, 135], [345, 105], [395, 125]);
    stroke(g, 16); quad(g, [170, 345], [260, 390], [350, 340]);
    fill(g, '#ff6f91'); stroke(g, 10); g.beginPath(); g.moveTo(265, 372); g.quadraticCurveTo(280, 470, 318, 440); g.quadraticCurveTo(335, 410, 310, 365); g.fill(); g.stroke();
  }},
  { id: 'scream', name: 'AAAA', em: '😱', draw(g) {
    eyeWhite(g, 170, 195, 52, 66, 0, 0, 14); eyeWhite(g, 342, 195, 52, 66, 0, 0, 14);
    stroke(g, 14); quad(g, [105, 110], [165, 90], [225, 125]); quad(g, [287, 125], [350, 90], [410, 110]);
    fill(g); ell(g, 256, 375, 72, 88);
    fill(g, '#ff5577'); ell(g, 256, 415, 44, 34);
  }},
  { id: 'sus', name: 'Sus', em: '🤨', draw(g) {
    eyeWhite(g, 170, 225, 54, 44, 22, 0, 18); eyeWhite(g, 342, 225, 54, 44, 22, 0, 18);
    stroke(g, 16); line(g, [[110, 160], [225, 185]]); quad(g, [290, 190], [350, 120], [410, 175]);
    stroke(g, 14); line(g, [[200, 350], [330, 340]]);
  }},
  { id: 'cry', name: 'Cry', em: '😭', draw(g) {
    stroke(g, 14); quad(g, [120, 215], [170, 175], [225, 215]); quad(g, [287, 215], [342, 175], [392, 215]);
    stroke(g, 14); line(g, [[110, 150], [220, 130]]); line(g, [[292, 130], [402, 150]]);
    fill(g, '#5ec8ff'); stroke(g, 6);
    for (const x of [150, 362]) { g.beginPath(); g.moveTo(x, 235); g.quadraticCurveTo(x - 45, 330, x - 25, 460); g.lineTo(x + 25, 460); g.quadraticCurveTo(x + 45, 330, x, 235); g.fill(); }
    fill(g); ell(g, 256, 395, 62, 46);
  }},
  { id: 'angry', name: 'Angry', em: '😡', draw(g) {
    eyeWhite(g, 170, 230, 46, 38, 0, 6, 16); eyeWhite(g, 342, 230, 46, 38, 0, 6, 16);
    stroke(g, 24); line(g, [[100, 150], [215, 205]]); line(g, [[412, 150], [297, 205]]);
    stroke(g, 16); quad(g, [160, 400], [256, 330], [352, 400]);
    fill(g, '#fff'); stroke(g, 6); g.beginPath(); g.moveTo(190, 380); g.lineTo(322, 380); g.lineTo(300, 350); g.lineTo(212, 350); g.closePath(); g.fill(); g.stroke();
  }},
  { id: 'wink', name: 'Wink', em: '😉', draw(g) {
    stroke(g, 14); quad(g, [115, 225], [170, 190], [225, 225]);
    eyeWhite(g, 342, 215, 50, 58, 4, 4, 20);
    stroke(g, 12); quad(g, [290, 150], [345, 125], [400, 145]);
    stroke(g, 16); quad(g, [150, 335], [256, 420], [372, 320]);
    fill(g, '#ff9fb2'); ell(g, 402, 300, 22, 14);
  }},
  { id: 'cursed', name: 'Cursed Grin', em: '😬', draw(g) {
    eyeWhite(g, 170, 175, 48, 44, 0, 0, 20); eyeWhite(g, 342, 175, 48, 44, 0, 0, 20);
    fill(g); g.beginPath(); g.moveTo(90, 290); g.quadraticCurveTo(256, 470, 422, 290); g.quadraticCurveTo(256, 330, 90, 290); g.fill();
    fill(g, '#fff'); g.save(); g.beginPath(); g.moveTo(105, 298); g.quadraticCurveTo(256, 450, 407, 298); g.quadraticCurveTo(256, 335, 105, 298); g.clip();
    g.fillRect(90, 290, 340, 60); g.restore();
    stroke(g, 5); for (let x = 140; x < 400; x += 30) line(g, [[x, 300], [x, 395]]);
    stroke(g, 5); quad(g, [105, 345], [256, 385], [407, 345]);
  }},
  { id: 'gacha', name: 'Sleepy Blush', em: '😌', draw(g) {
    stroke(g, 12); quad(g, [105, 210], [165, 185], [225, 215]); quad(g, [287, 215], [347, 185], [407, 210]);
    fill(g, '#3a3f6b'); ell(g, 165, 245, 38, 26); ell(g, 347, 245, 38, 26);
    fill(g, '#fff'); ell(g, 175, 238, 8, 8); ell(g, 357, 238, 8, 8);
    g.globalAlpha = 0.55; fill(g, '#ff6b81'); ell(g, 118, 290, 40, 20); ell(g, 394, 290, 40, 20); g.globalAlpha = 1;
    stroke(g, 8); quad(g, [225, 345], [256, 365], [290, 340]);
  }},
  { id: 'shock', name: 'Shocked', em: '😮', draw(g) {
    eyeWhite(g, 170, 210, 50, 62, 0, 0, 10); eyeWhite(g, 342, 210, 50, 62, 0, 0, 10);
    stroke(g, 14); quad(g, [110, 115], [170, 85], [230, 115]); quad(g, [282, 115], [342, 85], [402, 115]);
    fill(g); ell(g, 256, 380, 30, 42);
  }},
  { id: 'troll', name: 'Troll', em: '🧌', draw(g) {
    stroke(g, 12); quad(g, [105, 165], [160, 135], [225, 170]); quad(g, [287, 170], [352, 135], [407, 165]);
    stroke(g, 10); quad(g, [105, 230], [165, 190], [225, 230]); quad(g, [287, 230], [347, 190], [407, 230]);
    fill(g); g.beginPath(); g.moveTo(75, 275); g.quadraticCurveTo(256, 520, 437, 275); g.quadraticCurveTo(256, 330, 75, 275); g.fill();
    fill(g, '#fff'); g.beginPath(); g.moveTo(110, 300); g.quadraticCurveTo(256, 380, 402, 300); g.quadraticCurveTo(256, 335, 110, 300); g.fill();
    stroke(g, 5); for (let x = 150; x < 380; x += 36) line(g, [[x, 310], [x, 350]]);
  }},
  { id: 'dead', name: 'Dead', em: '💀', draw(g) {
    stroke(g, 20);
    for (const x of [170, 342]) { line(g, [[x - 40, 170], [x + 40, 250]]); line(g, [[x + 40, 170], [x - 40, 250]]); }
    stroke(g, 14); quad(g, [165, 380], [256, 330], [350, 380]);
    fill(g, '#ff6f91'); stroke(g, 8); g.beginPath(); g.moveTo(300, 360); g.quadraticCurveTo(310, 440, 345, 420); g.quadraticCurveTo(360, 385, 335, 355); g.fill(); g.stroke();
  }},
  { id: 'love', name: 'Heart Eyes', em: '😍', draw(g) {
    const heart = (x, y, s) => { fill(g, '#ff3b6b'); g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(0, 30); g.bezierCurveTo(-60, -10, -35, -55, 0, -22); g.bezierCurveTo(35, -55, 60, -10, 0, 30); g.fill(); g.restore(); };
    heart(170, 215, 1.5); heart(342, 215, 1.5);
    stroke(g, 16); quad(g, [150, 335], [256, 420], [372, 335]);
  }},
  { id: 'nervous', name: 'Nervous', em: '😅', draw(g) {
    eyeWhite(g, 170, 215, 46, 52, -10, 0, 14); eyeWhite(g, 342, 215, 46, 52, -10, 0, 14);
    stroke(g, 12); quad(g, [105, 135], [165, 150], [225, 125]); quad(g, [287, 125], [350, 150], [410, 135]);
    stroke(g, 12); g.beginPath(); g.moveTo(170, 360); for (let i = 0; i <= 6; i++) g.lineTo(170 + i * 30, 360 + (i % 2 ? 22 : -10)); g.stroke();
    fill(g, '#5ec8ff'); stroke(g, 5); g.beginPath(); g.moveTo(425, 130); g.quadraticCurveTo(395, 190, 425, 215); g.quadraticCurveTo(455, 190, 425, 130); g.fill(); g.stroke();
  }},
  { id: 'rizz', name: 'Rizz', em: '😎', draw(g) {
    fill(g, '#111'); g.beginPath(); g.roundRect(90, 150, 150, 90, 24); g.roundRect(272, 150, 150, 90, 24); g.fill();
    stroke(g, 14); line(g, [[240, 175], [272, 175]]);
    g.globalAlpha = 0.5; fill(g, '#fff'); g.beginPath(); g.moveTo(110, 165); g.lineTo(150, 165); g.lineTo(120, 200); g.closePath(); g.fill(); g.globalAlpha = 1;
    stroke(g, 16); quad(g, [165, 340], [270, 380], [375, 315]); line(g, [[375, 315], [395, 292]]);
  }},
  { id: 'crazy', name: 'Unhinged', em: '🤡', draw(g) {
    eyeWhite(g, 170, 200, 60, 60, 0, 0, 10); eyeWhite(g, 342, 200, 60, 60, 0, 0, 10);
    stroke(g, 8); for (const [x, y] of [[170, 200], [342, 200]]) { g.beginPath(); for (let a = 0; a < 18; a += 0.2) { const r = a * 2.4; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.stroke(); }
    stroke(g, 16); g.beginPath(); g.moveTo(110, 330); g.quadraticCurveTo(256, 480, 402, 330); g.stroke();
  }},
  { id: 'blank', name: 'Blank Stare', em: '😐', draw(g) {
    fill(g); ell(g, 170, 215, 16, 16); ell(g, 342, 215, 16, 16);
    stroke(g, 12); line(g, [[200, 360], [312, 360]]);
  }},
  { id: 'evil', name: 'Evil', em: '😈', draw(g) {
    fill(g); g.beginPath(); g.moveTo(95, 190); g.quadraticCurveTo(170, 170, 230, 235); g.quadraticCurveTo(160, 255, 95, 190); g.fill();
    g.beginPath(); g.moveTo(417, 190); g.quadraticCurveTo(342, 170, 282, 235); g.quadraticCurveTo(352, 255, 417, 190); g.fill();
    fill(g, '#ff2a2a'); ell(g, 180, 218, 12, 12); ell(g, 332, 218, 12, 12);
    stroke(g, 22); line(g, [[95, 130], [225, 190]]); line(g, [[417, 130], [287, 190]]);
    stroke(g, 14); quad(g, [130, 340], [256, 440], [382, 340]);
    fill(g, '#fff'); stroke(g, 4); g.beginPath(); g.moveTo(190, 378); g.lineTo(205, 410); g.lineTo(220, 385); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(292, 385); g.lineTo(307, 410); g.lineTo(322, 378); g.fill(); g.stroke();
  }}
];




export function faceDefs() {
  const list = [
    "anchor_face", "angry_frown", "angry_scowl", "angry_shout", "anguish_lines",
    "barely_there", "beard_laugh", "big_eyes", "big_grin", "big_laugh", "big_mustache",
    "black_smile", "blue_blob", "braces_grin", "cat_mouth", "cheeky_grin", "content_grin",
    "crooked_line", "crying_blue", "curly_brow", "cute_smile", "dark_beard", "dark_grin",
    "dark_squint", "deadpan", "dead_x", "default_smile", "diamond_glasses", "dizzy_x",
    "dot_dash", "dot_eyes", "evil_grin", "eye_roll", "faint_neutral", "faint_worry",
    "flat_brows", "flat_teeth", "frog_frown", "furious_snarl", "gentle_smile", "glasses_smirk",
    "glitch_angry", "gold_teeth", "grin_curve", "gritted_teeth", "grumpy_scrunch",
    "happy_dots", "happy_open", "happy_pout", "happy_squint", "helmet_scream",
    "hook_grin", "horned_rage", "laugh_dashes", "laughing_open", "lip_bite",
    "lopsided_worry", "mustache_nose", "nervous_stare", "nervous_sweat", "neutral_flat",
    "nose_dots", "nostril_scream", "number_three", "oval_eyes", "oval_flat",
    "pensive_dot", "pink_pout", "pout_blob", "red_eyes", "ring_eyes",
    "roar_open", "rotten_teeth", "round_eyes", "round_glasses", "sad_droop",
    "sad_frown", "screaming", "scribble_rage", "shocked_eyes", "side_eye",
    "side_tongue", "simple_smile", "sketchy_grin", "slash_eyes", "sleepy_lines",
    "sleepy_smile", "slit_eyes", "small_brows", "smirk_laugh", "smirk_scar",
    "smug_brows", "sneer_brows", "squint_cry", "squint_smirk", "sunglasses",
    "suspicious", "swirl_eyes", "teary_blue", "teeth_grin", "tent_nose",
    "terrified", "tiny_eyes", "tiny_glasses", "tiny_goatee", "tiny_mouth",
    "tiny_smirk", "tired_frown", "tongue_cheeky", "tongue_out", "triangle_gasp",
    "unamused", "v_smile", "wavy_smile", "wavy_worry", "wide_scream",
    "wide_smile", "wink_squint", "worried_brows", "zigzag_mouth"
  ];
  
  return list.map(name => ({
    key: 'lib:' + name,
    name: name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    em: '✨'
  }));
}

export function faceName(key) {
  if (key === 'none') return 'Blank';
  if (key === 'default') return 'Default';
  
  if (key === 'lib:layered') return 'Custom Face';
  if (key?.startsWith('lib:')) return FACE_LIBRARY.find(f => 'lib:' + f.id === key)?.name || key;
  if (key?.startsWith('asset:')) return 'Custom';
  return String(key || '');
}

function loadImg(src) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

export async function drawLibraryFace(key) {
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  
  if (key.startsWith('lib:')) {
    const name = key.slice(4);
    const def = FACE_LIBRARY.find(f => 'lib:' + f.id === key);
    if (def) {
      def.draw(g);
      return c;
    }
    // Load the SVG instead of PNG
    const img = await loadImg('models/faces/' + name + '.svg');
    if (img) {
      g.drawImage(img, 0, 0, S, S);
    }
  }
  return c;
}

export function canvasToBytes(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob(async (b) => resolve(b ? new Uint8Array(await b.arrayBuffer()) : null), 'image/png');
  });
}