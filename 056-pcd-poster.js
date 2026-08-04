// PCD Seattle poster — CP437 terminal broadside, perfectly looping.
// Static design: posters/B-pcd.txt (+ inline review notes), system: posters/README.md.
// Every animated component is its own draw*() function of loop time.

import { loadCp437Sheet } from "./lumic/cp437.js";
import { createBuffer } from "./lumic/asciiCanvas.js";

// ═══════════════════════ CONFIG ═══════════════════════

const PALETTE = {
  bg: "#131110",
  frame: "#6a5c40",
  title1: "#ffb642", // PCD
  title2: "#ff6f9c", // SEA
  titleShine: "#ffe9b8", // shimmer band sweeping the title
  titleShadow: "#4a3320",
  text: "#d8c8a8",
  accent: "#ffdf8a",
  dim: "#8a7a58",
  white: "#ffffff",
  linkSweep: "#fff6dd", // highlight window sweeping the interest-form link
  // Art-pane colors, dark -> bright, indexed by the spiral's band value.
  artColors: ["#2a2318", "#5a4526", "#a87c34", "#ffb642", "#ffe9b8"],
};

// ASCII ramps for the art pane, dark -> bright. Cycle with the R key.
const RAMPS = [" .-o#", " ░▒▓█", " .:-=+*#%@", " ·∙•█"];

const ART = {
  zoom: 1.0, // shader-space scale
  tightness: 0.55, // spiral winding density (bands per radius octave)
  turns: 1, // band-periods advanced per loop — integer keeps the loop seamless
  centerSoften: 0.02, // added to r² so the center doesn't degenerate into noise
  rampIndex: 0,
};

const LAYOUT = {
  cols: 80,
  rows: 45,
  titleRow: 2, // faces titleRow..+5, shadow tail +6
  titleWords: [
    { color: "title1", cols: { P: 11, C: 20, D: 29 } },
    { color: "title2", cols: { S: 44, E: 53, A: 62 } },
  ],
  dividers: [10, 27],
  art: { x1: 1, x2: 78, y1: 11, y2: 26 },
  // Bottom text zone: all 1.5x, center-justified. Each line is 1.5 base rows
  // tall; fractional rows land on whole pixels at the 2x render scale.
  bottom: [
    { copy: "infoTitle", row: 28, scale: 1.5, color: "accent" },
    { copy: "infoWhen", row: 29.5, scale: 1.5, color: "accent" },
    { copy: "anniversary", row: 32, scale: 1.5, color: "text" },
    { copy: "learnMore", row: 33.5, scale: 1.5 },
    { copy: "question", row: 36, scale: 1.5, color: "text" },
    { copy: "cta1", row: 37.5, scale: 1.5, color: "text" },
    { copy: "cta2", row: 39, scale: 1.5, color: "text" },
    { copy: "interest", row: 41.5, scale: 1.5 },
  ],
};

// A COPY entry is a string (single color from the line) or an array of
// segments [{text, color, sweep?}] for mixed colors within one line.
const COPY = {
  infoTitle: "Processing Community Day",
  infoWhen: "(late) Oct 2026, Date/Venue TBD",
  anniversary: "Processing turns 25 this year!",
  learnMore: [
    { text: "Learn more : ", color: "dim" },
    { text: "day.processing.org", color: "white" },
  ],
  question: "Do you use Processing / p5js?",
  cta1: "Do you want to participate/help organize?",
  cta2: "Have ideas/resources/time to share?",
  interest: [
    { text: "Interest form: ", color: "text" },
    { text: "bit.ly/pcdseattle", color: "title2", sweep: true },
  ],
};

const LOOP = { T: 480, fps: 60 }; // 8 s master period
// Render at 2x (1440x1440): every cell scale lands on whole pixels (1x=18px,
// 1.5x=27px, 2x=36px cells), which is what keeps the 1.5x rows sharp — at
// render scale 1 they'd be 13.5px cells with lumpy 1px/2px pixel columns.
// The canvas is displayed at DISPLAY_PX via CSS with point filtering; saves
// export the full 1440x1440.
const SCALE = 2;
const DISPLAY_PX = 720; // on-screen CSS size (1:1 with the backing store on HiDPI)

// ═══════════════════════ SKETCH ═══════════════════════

const CHAR_W = 9;
const CHAR_H = 16;

let sheet;
let buf;
let lineBufs = {}; // cell scale -> one-row buffer, reused per scaled line
let glyphLines;
let glyphs; // name -> array of mask rows (strings)

window.preload = function () {
  sheet = loadCp437Sheet();
  glyphLines = loadStrings("../posters/glyphs.txt");
};

window.setup = function () {
  glyphs = parseGlyphs(glyphLines);
  buf = createBuffer(LAYOUT.cols, LAYOUT.rows, { sheet });
  for (const line of LAYOUT.bottom) {
    if (line.scale > 1 && !lineBufs[line.scale]) {
      lineBufs[line.scale] = createBuffer(Math.floor(LAYOUT.cols / line.scale), 1, { sheet });
    }
  }
  const cnv = createCanvas(buf.pxWidth(SCALE), buf.pxHeight(SCALE));
  pixelDensity(1);
  noSmooth();
  frameRate(LOOP.fps);
  // Show the 2x render at poster size with point filtering (no resample blur).
  cnv.elt.style.width = `${DISPLAY_PX}px`;
  cnv.elt.style.height = `${DISPLAY_PX}px`;
  cnv.elt.style.imageRendering = "pixelated";
};

window.draw = function () {
  const ft = frameCount % LOOP.T; // frame within the loop
  const u = ft / LOOP.T; // loop phase 0..1

  background(PALETTE.bg);
  buf.clear(PALETTE.bg);

  drawFrame();
  drawTitle(u);
  drawArtPane(u);

  buf.blit(0, 0, SCALE);

  drawBottomText(u); // 2x rows blit over the main canvas
};

window.keyPressed = function () {
  if (key === "s" || key === "S") save("056-pcd-poster.png");
  if (key === "r" || key === "R") ART.rampIndex = (ART.rampIndex + 1) % RAMPS.length;
};

// ─────────────────────── static chassis ───────────────────────

function drawFrame() {
  buf.color(PALETTE.frame).bgColor(null);
  buf.box(0, 0, LAYOUT.cols - 1, LAYOUT.rows - 1, "double");
  for (const y of LAYOUT.dividers) buf.hline(0, LAYOUT.cols - 1, y, "single");
}

// ─────────────────────── title ───────────────────────
// Two words in their own colors, each glyph with a same-size ▒ shadow at
// (+1,+1), and a bright shimmer band sweeping the whole title once per loop.

function drawTitle(u) {
  const top = LAYOUT.titleRow;
  const all = LAYOUT.titleWords.flatMap((w) => Object.entries(w.cols));

  buf.color(PALETTE.titleShadow).bgColor(null);
  for (const [name, col] of all) {
    forEachMaskCell(glyphs[name], (r, c) => {
      if (buf.get(col + c + 1, top + r + 1)?.char === " ") {
        buf.set(col + c + 1, top + r + 1, "▒");
      }
    });
  }

  const firstCol = Math.min(...all.map(([, col]) => col));
  const lastCol = Math.max(...all.map(([name, col]) => col + maskWidth(glyphs[name])));
  for (const word of LAYOUT.titleWords) {
    const base = PALETTE[word.color];
    for (const [name, col] of Object.entries(word.cols)) {
      forEachMaskCell(glyphs[name], (r, c, ch) => {
        const span = (col + c - firstCol) / (lastCol - firstCol);
        const wave = Math.sin(TWO_PI * (span - u));
        buf.color(wave > 0.75 ? PALETTE.titleShine : base);
        buf.set(col + c, top + r, ch);
      });
    }
  }
}

// ─────────────────────── art pane: spiral SDF -> ASCII ───────────────
// Adaptation of the user's spiral SDF:
//   float spiralSdf(vec2 p, float t) {
//     float r2 = dot(p,p);
//     float angle = atan(p.y, p.x);
//     return abs((fract(log(r2) * t + angle * 0.159)));
//   }
// Changes for the poster: the 0.159 approximation becomes exactly 1/2π (the
// approximation leaves a radial seam where atan2 wraps), winding density is a
// fixed config value, and rotation comes from adding `turns * u` inside the
// fract — an integer number of band-periods per loop, so it loops seamlessly.
// The fract value itself indexes the ASCII ramp, shading each band dark ->
// bright across its width ("shadows").

function drawArtPane(u) {
  const { x1, x2, y1, y2 } = LAYOUT.art;
  const ramp = RAMPS[ART.rampIndex];
  const paneW = (x2 - x1 + 1) * CHAR_W;
  const paneH = (y2 - y1 + 1) * CHAR_H;
  buf.bgColor(null);
  for (let cy = y1; cy <= y2; cy++) {
    for (let cx = x1; cx <= x2; cx++) {
      const px = (cx - x1 + 0.5) * CHAR_W;
      const py = (cy - y1 + 0.5) * CHAR_H;
      const ux = ((px - paneW * 0.5) / paneH) * ART.zoom;
      const uy = ((paneH * 0.5 - py) / paneH) * ART.zoom; // GLSL y-up
      const v = spiralValue(ux, uy, u);
      const ch = ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length))];
      if (ch === " ") continue;
      buf.color(PALETTE.artColors[Math.min(PALETTE.artColors.length - 1, Math.floor(v * PALETTE.artColors.length))]);
      buf.set(cx, cy, ch);
    }
  }
}

/** Log-spiral band value in [0,1): the shading ramp position within a band. */
function spiralValue(x, y, u) {
  const r2 = x * x + y * y + ART.centerSoften;
  const angle = Math.atan2(y, x);
  const s = Math.log(r2) * ART.tightness + angle / TWO_PI + ART.turns * u;
  return s - Math.floor(s); // fract
}

// ─────────────────────── bottom text zone ───────────────────────
// Every line renders through a one-row buffer blitted at its cell scale,
// center-justified. String entries take the line color; segment arrays mix
// colors within a line (with an optional sweep highlight).

function drawBottomText(u) {
  for (const line of LAYOUT.bottom) {
    const lb = lineBufs[line.scale];
    lb.clear();
    lb.bgColor(null);
    const entry = COPY[line.copy];
    const segs = typeof entry === "string" ? [{ text: entry, color: line.color }] : entry;
    const total = segs.reduce((n, seg) => n + seg.text.length, 0);
    let x = Math.floor((lb.w - total) / 2);
    for (const seg of segs) {
      if (seg.sweep) {
        sweepText(lb, seg.text, x, u, PALETTE[seg.color]);
      } else {
        lb.color(PALETTE[seg.color]);
        lb.text(seg.text, x, 0);
      }
      x += seg.text.length;
    }
    lb.blit(0, Math.round(line.row * CHAR_H * SCALE), line.scale * SCALE);
  }
}

/** Attention animation: a bright window sweeps the segment once per loop. */
function sweepText(target, s, x0, u, baseColor) {
  const winW = 6;
  const pos = u * (s.length + winW) - winW;
  for (let i = 0; i < s.length; i++) {
    target.color(i >= pos && i < pos + winW ? PALETTE.linkSweep : baseColor);
    target.set(x0 + i, 0, s[i]);
  }
}

// ─────────────────────── helpers ───────────────────────

/** Parse posters/glyphs.txt: "=NAME" line starts a glyph, rows follow. */
function parseGlyphs(lines) {
  const out = {};
  let name = null;
  let rows = [];
  for (const line of lines) {
    if (line.startsWith("=")) {
      if (name) out[name] = rows;
      name = line.slice(1);
      rows = [];
    } else if (name) {
      rows.push(line);
    }
  }
  if (name) out[name] = rows;
  for (const key of Object.keys(out)) {
    while (out[key].length && out[key][out[key].length - 1].trim() === "") out[key].pop();
  }
  return out;
}

function maskWidth(mask) {
  return Math.max(...mask.map((row) => row.length));
}

function forEachMaskCell(mask, fn) {
  for (let r = 0; r < mask.length; r++) {
    for (let c = 0; c < mask[r].length; c++) {
      if (mask[r][c] !== " ") fn(r, c, mask[r][c]);
    }
  }
}
