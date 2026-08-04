// Animated take on 052-bitmapLines — same Xiaolin-Wu-era hatching mechanism
// (45/135/H/V fills that shrink toward the cell midpoint), but driven by
// seamlessly-looping noise fields and rendered as a color loop:
//   - fully black pixels of the source PNG: static full crosshatch, ink ramp
//   - anything between black and white (the shadow): coverage fluctuates
//     with a looping noise field, so the shadow shimmers
//   - fully white pixels (the background): 45°/135° crosshatch that swells
//     in and out of patches driven by two independent noise fields, drawn in
//     lighter (low-alpha) versions of the same palette
// Loop phase u in [0,1): renderFrame(u) is pure (fixed noise seed, no state),
// which is what lets frameExport re-render any phase deterministically.
// Keys: S save png, E export one loop as a PNG sequence (like 056).

import { vec2, line2D, lerp2d, TAU } from "./lumic/common.js";
import { clamp01 } from "./lumic/easing.js";
import { exportFrameSequence } from "./lumic/frameExport.js";

// ═══════════════════════ CONFIG ═══════════════════════

// Reference palette (max 5), ordered warm -> cool so it reads as a ramp.
const RAMP_HEX = ["#FCB913", "#BBCB34", "#00A5DF", "#8F67AD", "#DF1A89"];
// Background hatch: same colors at low alpha so they sit light on the white bg.
const BG_ALPHA = "55"; // appended to the hex, #RRGGBBAA

const CANVAS_PX = 1080;
const DISPLAY_PX = 720; // on-screen CSS size
const LOOP = { T: 240, fps: 30 }; // 8 s master period
const EXPORT = { prefix: "bitmapLoop_" };

// Source-pixel classification (0..255 brightness).
const IMG = { blackMax: 10, whiteMin: 250 };

// Ink cells (black + shadow), same mechanism as 052.
const INK = {
  divisions: 1,
  weight: 1.8,
  shadowAmp: 0.6, // +/- swing added to the shadow's base coverage
};

// Background crosshatch: noise value n maps to hatch growth over [on, full].
const BG = {
  divisions: 1,
  weight: 1.4,
  on: 0.42,
  full: 0.68,
};

// Looping noise fields: sampled along a circle in noise space, so the value
// at u=0 and u=1 is identical. scale = cells -> noise units, radius = how far
// the loop travels (bigger = more churn per loop), ox/oy decorrelate fields.
const FIELDS = {
  bg45: { scale: 0.09, radius: 0.9, ox: 0, oy: 0 },
  bg135: { scale: 0.09, radius: 0.9, ox: 137, oy: 71 },
  shadow: { scale: 0.16, radius: 1.5, ox: 311, oy: 233 },
  color: { scale: 0.045, radius: 0.5, ox: 523, oy: 419 },
};

// ═══════════════════════ SKETCH ═══════════════════════

let img;
let size; // cell size in px, CANVAS_PX / img.width
let cellType; // per cell: 0 ink-black, 1 shadow, 2 background
let cellC0; // per cell: base coverage from source brightness (052's c)
let rampInk = []; // css colors, straight from the palette
let rampLight = []; // same colors at low alpha, for the bg hatch

window.preload = function () {
  img = loadImage("../052-artcode80x80-shadow.png");
};

window.setup = function () {
  noiseSeed(4057); // fixed: renderFrame(u) must be pure for the exporter

  rampInk = [...RAMP_HEX];
  rampLight = RAMP_HEX.map((hex) => hex + BG_ALPHA);

  img.loadPixels();
  size = CANVAS_PX / img.width;
  cellType = new Uint8Array(img.width * img.height);
  cellC0 = new Float32Array(img.width * img.height);
  for (let i = 0; i < img.width * img.height; i++) {
    const b = (img.pixels[i * 4] + img.pixels[i * 4 + 1] + img.pixels[i * 4 + 2]) / 3;
    cellType[i] = b <= IMG.blackMax ? 0 : b >= IMG.whiteMin ? 2 : 1;
    cellC0[i] = 1 - b / 255;
  }

  const cnv = createCanvas(CANVAS_PX, img.height * size);
  pixelDensity(1);
  frameRate(LOOP.fps);
  cnv.elt.style.width = `${DISPLAY_PX}px`;
  cnv.elt.style.height = `${(DISPLAY_PX * img.height) / img.width}px`;

  window.renderFrame = renderFrame; // debug/testing hook
};

window.draw = function () {
  renderFrame((frameCount % LOOP.T) / LOOP.T);
};

window.keyPressed = function () {
  if (key === "s" || key === "S") save("057-bitmapLoop.png");
  if (key === "e" || key === "E") {
    exportFrameSequence({ frames: LOOP.T, fps: LOOP.fps, render: renderFrame, prefix: EXPORT.prefix });
  }
};

/** The whole frame at loop phase u in [0,1) — pure given the noise seed. */
function renderFrame(u) {
  background(255);
  noFill();

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = x + y * img.width;
      const rampIdx = rampIndex(loopNoise(x, y, u, FIELDS.color));

      if (cellType[i] === 2) {
        renderBgCell(x, y, u, rampLight[rampIdx]);
        continue;
      }

      let c = cellC0[i];
      if (cellType[i] === 1) {
        // Shadow: coverage wobbles around its base value, looping seamlessly.
        c = clamp01(c + INK.shadowAmp * (loopNoise(x, y, u, FIELDS.shadow) - 0.5) * 2);
      }
      stroke(rampInk[rampIdx]);
      strokeWeight(INK.weight);
      renderCell(x, y, c, INK.divisions);
    }
  }
}

/** Background pixel: 45° and 135° hatch lines, each grown by its own field. */
function renderBgCell(x, y, u, color) {
  const g45 = hatchGrowth(loopNoise(x, y, u, FIELDS.bg45));
  const g135 = hatchGrowth(loopNoise(x, y, u, FIELDS.bg135));
  if (g45 <= 0 && g135 <= 0) return;

  const hs = size / 2;
  push();
  translate(x * size + hs, y * size + hs);
  stroke(color);
  strokeWeight(BG.weight);
  if (g45 > 0) renderFill45(size, BG.divisions, 1 - g45);
  if (g135 > 0) renderFill135(size, BG.divisions, 1 - g135);
  pop();
}

function hatchGrowth(n) {
  return clamp01((n - BG.on) / (BG.full - BG.on));
}

function rampIndex(n) {
  // p5 noise clusters around the middle; spread it across all 5 colors.
  const v = clamp01((n - 0.25) * 2);
  return Math.min(RAMP_HEX.length - 1, Math.floor(v * RAMP_HEX.length));
}

/** Noise on a circular path through noise space: identical at u=0 and u=1. */
function loopNoise(x, y, u, f) {
  const a = TAU * u;
  return noise(
    f.ox + x * f.scale + f.radius * Math.cos(a),
    f.oy + y * f.scale + f.radius * Math.sin(a)
  );
}

// ─────────────── line mechanism, verbatim from 052 ───────────────
// (only change: lines go straight to the canvas, no SVG collection)

// If shrink = 1, nothing, if shrink = 0, full length
function renderFill45(size, divisions, shrink) {
  const hs = size / 2;
  const slantStep = size / divisions;

  // Assume center of cell is (0, 0)
  // Go up from bottom right
  let y = hs;
  let x = hs;
  for (let i = 0; i < divisions; i++) {
    let A = vec2(x, y);
    let B = vec2(y, x); // Reflect around y=x

    ({ A, B } = MoveTowardsMid(A, B, shrink));

    drawHatchLine(A, B);
    y -= slantStep;
  }

  // Go left from top right
  y = -hs;
  x = hs;
  for (let i = 0; i < divisions; i++) {
    let A = vec2(x, y);
    let B = vec2(y, x); // Reflect around y=x

    ({ A, B } = MoveTowardsMid(A, B, shrink));

    drawHatchLine(A, B);
    x -= slantStep;
  }
}

function MoveTowardsMid(A, B, shrink) {
  let mid = lerp2d(A, B, 0.5);
  A = lerp2d(A, mid, shrink);
  B = lerp2d(B, mid, shrink);
  return { A, B };
}

function renderFill135(size, divisions, shrink) {
  // x-flipped version of renderFill45
  push();

  scale(-1, 1);
  renderFill45(size, divisions, shrink);

  pop();
}

function renderFillHorizontal(size, divisions, shrink) {
  const hs = size / 2;
  const step = size / divisions;

  // Assume center of cell is (0, 0)
  // Start from top and go down
  let y = -hs;
  for (let i = 0; i <= divisions; i++) {
    let A = vec2(-hs, y);
    let B = vec2(hs, y);

    ({ A, B } = MoveTowardsMid(A, B, shrink));

    drawHatchLine(A, B);
    y += step;
  }
}

function renderFillVertical(size, divisions, shrink) {
  const hs = size / 2;
  const step = size / divisions;

  // Assume center of cell is (0, 0)
  // Start from left and go right
  let x = -hs;
  for (let i = 0; i <= divisions; i++) {
    let A = vec2(x, -hs);
    let B = vec2(x, hs);

    ({ A, B } = MoveTowardsMid(A, B, shrink));

    drawHatchLine(A, B);
    x += step;
  }
}

function renderCell(x, y, c, divisions) {
  let c5 = c * 5;
  let cn = floor(c5);

  const hs = size / 2;
  const cellCenter = vec2(x * size + hs, y * size + hs);
  push(); // Start a new drawing state
  translate(cellCenter.x, cellCenter.y); // Move to the correct position

  let shrink1 = c5 - cn > 1 ? 0 : 1 - clamp01(c5 - 1);
  let shrink2 = c5 - cn > 1 ? 0 : 1 - clamp01(c5 - 2);
  let shrink3 = c5 - cn > 1 ? 0 : 1 - clamp01(c5 - 3);
  let shrink4 = c5 - cn > 1 ? 0 : 1 - clamp01(c5 - 4);

  if (cn >= 0) {
    if (shrink1 < 1) {
      renderFill45(size, divisions, shrink1);
    }
  }

  if (cn > 0) {
    if (shrink2 < 1) {
      renderFill135(size, divisions, shrink2);
    }
  }

  if (cn > 1) {
    if (shrink3 < 1) {
      renderFillHorizontal(size, divisions, shrink3);
    }
  }

  if (cn > 2) {
    if (shrink4 < 1) {
      renderFillVertical(size, divisions, shrink4);
    }
  }

  pop(); // Restore the previous drawing state
}

function drawHatchLine(A, B) {
  // Zero-length segments show up as round-cap dots on canvas — skip them.
  if (Math.abs(A.x - B.x) < 1e-6 && Math.abs(A.y - B.y) < 1e-6) return;
  line2D(A, B);
}
