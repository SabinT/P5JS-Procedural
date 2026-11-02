// Shader-box engraving plate — two CP437 layers that tile the same grid and
// never share a cell, so they can be burned with different laser settings.
//
//   layer INK  : double border + the plate text          -> engrave DARK
//   layer BG   : vertical gradient through a character ramp -> engrave LIGHT
//
// Both layers export at the same pixel size, so the two files stack with no
// registration work: send file 1 at the dark setting, file 2 at the light
// setting, same origin, same scale.
//
// Non-overlap is structural, not cosmetic. The text/border layer runs on a
// COARSE grid whose cell is GRID.textCell fine cells across, which makes the
// lettering big enough to survive engraving; every coarse cell it writes marks
// the fine cells underneath (plus GRID.pad of clearance) as occupied, and the
// shader skips occupied cells outright. verifyLayers() re-checks the result
// cell by cell and logs the tally.
//
// Geometry: CP437 cells are 9x16, so 64x54 fine cells = 576x864 px = exactly
// 2:3. Every EXPORT.scale multiple keeps that ratio and lands on whole pixels
// (scale 4 -> 2304x3456, i.e. ~195x293 mm at 300 dpi, ~97x146 mm at 600 dpi).
//
// Keys: S save both layers   1 / 2 save one layer   V cycle view
//       R cycle ramp   I invert (white ink on black)

import { CHAR_W, CHAR_H, loadCp437Sheet } from "./lumic/cp437.js";
import { createBuffer } from "./lumic/asciiCanvas.js";

// ═══════════════════════ CONFIG ═══════════════════════

const GRID = {
  cols: 64, // fine columns — shader layer
  rows: 54, // fine rows      (64x54 cells @ 9x16 = 576x864 = 2:3)
  textCell: 2, // ink-layer cell size, in fine cells (2 -> 32x27 coarse grid)
  pad: 1, // fine cells of clearance kept around the text
  // ...and inside the border, per axis. 0 rows top/bottom lets the field run
  // one row closer there: cells are 9x16, so an equal count of cells reads as
  // a much bigger gap vertically than horizontally.
  borderPad: { x: 1, y: 0 },
  despeckle: true, // drop shader glyphs with no neighbour (see despeckle())
};

// Ink layer, addressed in COARSE cells (GRID.cols / textCell wide).
const PLATE = {
  border: "double", // 'double' | 'single'
  lines: [
    { row: 9, str: "SHADERBOX v0.1, 2026" },
    { row: 13, str: "Sabin Timalsena" },
    { row: 15, str: "www.sabin.art" },
    { row: 17, str: "IG: @artbysabin" },
  ],
  divider: { row: 11, inset: 6, weight: "single" }, // null to drop the rule
};

// Background layer: a vertical gradient, densest at the top and bottom edges
// and clear through the middle, so the field frames the text plate instead of
// competing with it. The bands are then displaced by a wave field, which is
// what gives them their wobble.
const SHADER = {
  ramps: [" .-o#", " ·∙•■", " ·∙•", " .:-=+*", " ░▒▓"], // dark -> bright
  rampIndex: 3,
  gamma: 2.5, // fade curve: >1 opens the middle up, <1 pushes ink inward
  noiseScale: 0.5, // wave frequency — roughly how many crests span the width
  noiseAmp: 0.05, // wave height, as a fraction of the plate; 0 = flat bands
};

const EXPORT = {
  scale: 4, // 4 -> 2304x3456 px
  invert: false, // false = black ink on white (normal for laser software)
  names: { ink: "058-shaderbox-1-dark.png", bg: "058-shaderbox-2-light.png" },
};

const INK = "#000000";
const PAPER = "#ffffff";
// Preview only — the two layers get different colors so the split is readable.
const PREVIEW = { ink: "#101014", bg: "#c03028", scale: 1, displayW: 480 };

// ═══════════════════════ SKETCH ═══════════════════════

const COARSE_COLS = GRID.cols / GRID.textCell;
const COARSE_ROWS = GRID.rows / GRID.textCell;

let sheet;
let inkBuf; // coarse grid: border + text
let bgBuf; // fine grid: shader
const TEXT = 1; // coarseMask values — they take different clearances
const BORDER = 2;

let coarseMask; // coarse cells claimed by the ink layer, by kind
let occupied; // fine cells the shader must leave alone
let view = 0; // 0 both, 1 ink only, 2 shader only
const exportGfx = {}; // one export surface per layer, built on first save
let verified = false;

window.preload = function () {
  sheet = loadCp437Sheet();
};

window.setup = function () {
  inkBuf = createBuffer(COARSE_COLS, COARSE_ROWS, { sheet });
  bgBuf = createBuffer(GRID.cols, GRID.rows, { sheet });
  coarseMask = new Uint8Array(COARSE_COLS * COARSE_ROWS);
  occupied = new Uint8Array(GRID.cols * GRID.rows);

  const cnv = createCanvas(GRID.cols * CHAR_W * PREVIEW.scale, GRID.rows * CHAR_H * PREVIEW.scale);
  pixelDensity(1); // 1 canvas pixel == 1 atlas pixel
  noSmooth(); // nearest-neighbour scaling, no blur
  noLoop();
  cnv.elt.style.width = `${PREVIEW.displayW}px`;
  cnv.elt.style.height = `${(PREVIEW.displayW * 3) / 2}px`;
  cnv.elt.style.imageRendering = "pixelated";
};

window.draw = function () {
  buildLayers(PREVIEW.ink, PREVIEW.bg);
  background(PAPER);
  if (view !== 2) inkBuf.blit(0, 0, GRID.textCell * PREVIEW.scale);
  if (view !== 1) bgBuf.blit(0, 0, PREVIEW.scale);
};

window.keyPressed = function () {
  const k = key.toLowerCase();
  if (k === "s") saveLayers();
  else if (k === "1") saveLayer("ink");
  else if (k === "2") saveLayer("bg");
  else if (k === "v") view = (view + 1) % 3;
  else if (k === "r") SHADER.rampIndex = (SHADER.rampIndex + 1) % SHADER.ramps.length;
  else if (k === "i") EXPORT.invert = !EXPORT.invert;
  else return;
  verified = false;
  redraw();
};

// ─────────────────────── layer construction ───────────────────────
// Order matters: the ink layer writes the occupancy mask that the shader
// layer reads. Both are cheap to rebuild, so every redraw rebuilds from
// scratch and the config above is the single source of truth.

function buildLayers(inkColor, bgColor) {
  coarseMask.fill(0);
  occupied.fill(0);
  buildInkLayer(inkColor);
  spreadOccupancy();
  buildShaderLayer(bgColor);
  if (!verified) {
    verifyLayers();
    verified = true;
  }
}

/** Border, optional rule, and the centered text block — coarse cells. */
function buildInkLayer(inkColor) {
  inkBuf.clear();
  inkBuf.color(inkColor).bgColor(null);

  inkBuf.box(0, 0, COARSE_COLS - 1, COARSE_ROWS - 1, PLATE.border);
  markCoarse(0, 0, COARSE_COLS - 1, 0, BORDER);
  markCoarse(0, COARSE_ROWS - 1, COARSE_COLS - 1, COARSE_ROWS - 1, BORDER);
  markCoarse(0, 0, 0, COARSE_ROWS - 1, BORDER);
  markCoarse(COARSE_COLS - 1, 0, COARSE_COLS - 1, COARSE_ROWS - 1, BORDER);

  if (PLATE.divider) {
    const { row, inset, weight } = PLATE.divider;
    const x1 = inset;
    const x2 = COARSE_COLS - 1 - inset;
    inkBuf.hline(x1, x2, row, weight);
    markCoarse(x1, row, x2, row, TEXT);
  }

  for (const line of PLATE.lines) {
    const x = Math.floor((COARSE_COLS - line.str.length) / 2);
    inkBuf.text(line.str, x, line.row);
    // The whole run is claimed, spaces included, so the shader cannot creep
    // into the word gaps.
    markCoarse(x, line.row, x + line.str.length - 1, line.row, TEXT);
  }
}

/** kind: TEXT or BORDER — they get different clearances in spreadOccupancy(). */
function markCoarse(x1, y1, x2, y2, kind) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (x >= 0 && x < COARSE_COLS && y >= 0 && y < COARSE_ROWS) {
        coarseMask[y * COARSE_COLS + x] = kind;
      }
    }
  }
}

/** Coarse mask -> fine occupancy, dilated by the clearance for its kind. */
function spreadOccupancy() {
  const n = GRID.textCell;
  for (let cy = 0; cy < COARSE_ROWS; cy++) {
    for (let cx = 0; cx < COARSE_COLS; cx++) {
      const kind = coarseMask[cy * COARSE_COLS + cx];
      if (!kind) continue;
      const padX = kind === BORDER ? GRID.borderPad.x : GRID.pad;
      const padY = kind === BORDER ? GRID.borderPad.y : GRID.pad;
      for (let fy = cy * n - padY; fy < cy * n + n + padY; fy++) {
        if (fy < 0 || fy >= GRID.rows) continue;
        for (let fx = cx * n - padX; fx < cx * n + n + padX; fx++) {
          if (fx < 0 || fx >= GRID.cols) continue;
          occupied[fy * GRID.cols + fx] = 1;
        }
      }
    }
  }
}

/** The gradient, sampled per free fine cell and quantized to the ramp. */
function buildShaderLayer(bgColor) {
  const ramp = SHADER.ramps[SHADER.rampIndex];
  bgBuf.clear();
  bgBuf.color(bgColor).bgColor(null);
  for (let cy = 0; cy < GRID.rows; cy++) {
    for (let cx = 0; cx < GRID.cols; cx++) {
      if (occupied[cy * GRID.cols + cx]) continue;
      const d = shadeAt(cx, cy);
      const ch = ramp[Math.min(ramp.length - 1, Math.floor(d * ramp.length))];
      if (ch === " ") continue;
      bgBuf.set(cx, cy, ch);
    }
  }
  if (GRID.despeckle) despeckle();
}

/**
 * Clear shader glyphs that have no neighbour in the 8 cells around them. A
 * lone dot floating in the clearance around the text reads as a defect on the
 * finished box (and at light settings a single isolated dot burns unevenly),
 * while the same dot inside the field is invisible.
 */
function despeckle() {
  const doomed = [];
  for (let cy = 0; cy < GRID.rows; cy++) {
    for (let cx = 0; cx < GRID.cols; cx++) {
      const i = cy * GRID.cols + cx;
      if (bgBuf.codes[i] === 0x20) continue;
      if (!hasNeighbour(cx, cy)) doomed.push(i);
    }
  }
  for (const i of doomed) bgBuf.codes[i] = 0x20;
}

function hasNeighbour(cx, cy) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || x >= GRID.cols || y < 0 || y >= GRID.rows) continue;
      if (bgBuf.codes[y * GRID.cols + x] !== 0x20) return true;
    }
  }
  return false;
}

// ─────────────────────── the field ───────────────────────

// Wave field: four sines at incommensurate frequencies, weights summing to 1,
// so the result stays inside [-1,1] and never repeats across the plate. Chosen
// over a simplex/permutation noise because the offline renderer has to produce
// the byte-identical field, and a fixed sine sum ports exactly.
// prettier-ignore
const WAVES = [
  // fx, fy: crests per plate width/height   ph: phase   w: weight
  { fx: 1.00, fy:  0.37, ph: 0.00, w: 0.55 },
  { fx: 1.93, fy: -0.61, ph: 1.37, w: 0.28 },
  { fx: 3.71, fy:  0.89, ph: 2.71, w: 0.12 },
  { fx: 0.53, fy:  1.43, ph: 4.13, w: 0.05 },
];

/** Signed wobble in [-1,1] at normalized plate position (u, v). */
function wobble(u, v) {
  let n = 0;
  for (const wv of WAVES) {
    n += wv.w * Math.sin(TWO_PI * SHADER.noiseScale * (wv.fx * u + wv.fy * v) + wv.ph);
  }
  return n;
}

/**
 * Density of the cell in [0,1]: 1 at the top and bottom edges, 0 across the
 * middle, so the plate reads dark -> clear -> dark down the page. The wave
 * field displaces the sample point vertically, which bends the bands into
 * their wobble; gamma then bends the fade between the ends.
 */
function shadeAt(cx, cy) {
  const u = (cx + 0.5) / GRID.cols; // 0 at the left column, 1 at the right
  const v = (cy + 0.5) / GRID.rows; // 0 at the top row, 1 at the bottom
  const warped = v + SHADER.noiseAmp * wobble(u, v);
  return Math.pow(constrain(Math.abs(2 * warped - 1), 0, 1), SHADER.gamma);
}

// ─────────────────────── verification ───────────────────────

/** Confirms the two layers are disjoint, and reports the cell budget. */
function verifyLayers() {
  let inked = 0;
  let shaded = 0;
  let collisions = 0;
  for (let cy = 0; cy < GRID.rows; cy++) {
    for (let cx = 0; cx < GRID.cols; cx++) {
      const i = cy * GRID.cols + cx;
      const hasShader = bgBuf.codes[i] !== 0x20;
      if (occupied[i]) inked++;
      if (hasShader) shaded++;
      if (occupied[i] && hasShader) collisions++;
    }
  }
  const total = GRID.cols * GRID.rows;
  console.log(
    `[058] ${GRID.cols}x${GRID.rows} fine cells — ink+clearance ${inked}, shader ${shaded}, ` +
      `free ${total - inked - shaded}, overlaps ${collisions}`
  );
  if (collisions) console.error(`[058] ${collisions} cells appear in BOTH layers`);
}

// ─────────────────────── export ───────────────────────
// Both files are rendered at the same size from the same grid, so they stack
// pixel-for-pixel in the laser software.

function layerGraphics(which) {
  if (!exportGfx[which]) {
    const g = createGraphics(GRID.cols * CHAR_W * EXPORT.scale, GRID.rows * CHAR_H * EXPORT.scale);
    g.pixelDensity(1);
    g.noSmooth();
    g.elt.style.display = "none";
    exportGfx[which] = g;
  }
  return exportGfx[which];
}

function saveLayer(which) {
  const ink = EXPORT.invert ? PAPER : INK;
  buildLayers(ink, ink);
  // One buffer per layer: saveCanvas() reads the canvas asynchronously, so the
  // two exports must not share (and overwrite) the same surface.
  const g = layerGraphics(which);
  g.background(EXPORT.invert ? INK : PAPER);
  if (which === "ink") inkBuf.blit(0, 0, GRID.textCell * EXPORT.scale, g);
  else bgBuf.blit(0, 0, EXPORT.scale, g);
  save(g, EXPORT.names[which]);
}

/** Both plates; the second save is deferred so the browser issues 2 downloads. */
function saveLayers() {
  saveLayer("ink");
  setTimeout(() => saveLayer("bg"), 600);
}
