// Code page 437 texture-sheet test/demo.

import {
  CHAR_W,
  CHAR_H,
  SHEET_COLS,
  SHEET_ROWS,
  CHAR_COUNT,
  loadCp437Sheet,
  measureText,
} from "./lumic/cp437.js";

const BG = "#0d0f12";
const AMBER = "#ffb642";
const GREEN = "#7ee081";
const DIM = "#3a4048";

const TABLE_SCALE = 3;
const TEXT_SCALE = 2;
const MARGIN = 48;

let sheet;

window.preload = function () {
  sheet = loadCp437Sheet();
};

window.setup = function () {
  createCanvas(960, 880);
  pixelDensity(1); // 1 canvas pixel == 1 texture pixel
  noSmooth(); // nearest-neighbour scaling, no blur
  noLoop();
};

window.draw = function () {
  background(BG);

  let y = MARGIN;
  y = drawCharsetTable(MARGIN, y) + 44;
  y = drawTextDemo(MARGIN, y) + 32;
  drawBoxDemo(MARGIN, y);
};

/** All 256 glyphs, laid out exactly as they sit in the atlas. */
function drawCharsetTable(x, y) {
  const cw = CHAR_W * TABLE_SCALE;
  const ch = CHAR_H * TABLE_SCALE;

  label(x, y - 12, "ALL 256 GLYPHS - indexed by code, CP437 order");

  const top = y + 18;

  // Column headers (low nibble) and row headers (high nibble).
  noStroke();
  fill(DIM);
  textFont("monospace");
  textSize(10);
  textAlign(CENTER, BOTTOM);
  for (let c = 0; c < SHEET_COLS; c++) {
    text(c.toString(16).toUpperCase(), x + c * cw + cw / 2, top - 4);
  }
  textAlign(RIGHT, CENTER);
  for (let r = 0; r < SHEET_ROWS; r++) {
    text((r * SHEET_COLS).toString(16).toUpperCase().padStart(2, "0"), x - 8, top + r * ch + ch / 2);
  }

  // Cell grid, so a misaligned crop would show up immediately.
  stroke(DIM);
  strokeWeight(1);
  noFill();
  for (let c = 0; c <= SHEET_COLS; c++) {
    line(x + c * cw, top, x + c * cw, top + SHEET_ROWS * ch);
  }
  for (let r = 0; r <= SHEET_ROWS; r++) {
    line(x, top + r * ch, x + SHEET_COLS * cw, top + r * ch);
  }

  push();
  tint(AMBER);
  for (let code = 0; code < CHAR_COUNT; code++) {
    const c = code % SHEET_COLS;
    const r = (code / SHEET_COLS) | 0;
    sheet.drawChar(code, x + c * cw, top + r * ch, TABLE_SCALE);
  }
  pop();

  return top + SHEET_ROWS * ch;
}

/** Text indexed by character, including non-ASCII CP437 codepoints. */
function drawTextDemo(x, y) {
  label(x, y, "TEXT - indexed by character");

  const lines = [
    "Testing Testing",
    "0123456789 !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
    "Çüéâä ¢£¥₧ƒ ½¼ ░▒▓█ αßΓπΣσµτ ∞∩≡±≥≤ √ⁿ²■",
  ];

  push();
  tint(GREEN);
  sheet.drawText(lines.join("\n"), x, y + 18, TEXT_SCALE);
  pop();

  return y + 18 + measureText(lines.join("\n"), TEXT_SCALE).h;
}

/** Box-drawing runs — these only line up if the 9th column survived the crop. */
function drawBoxDemo(x, y) {
  label(x, y, "BOX DRAWING");

  const w = 30;
  const box = [
    "╔" + "═".repeat(w) + "╗",
    "║" + " CP437 - 9x16 - 32x8 sheet    " + "║",
    "╠" + "═".repeat(w) + "╣",
    "║" + " ░▒▓█ shades   ←↑→↓ arrows    " + "║",
    "╚" + "═".repeat(w) + "╝",
  ].join("\n");

  push();
  tint(AMBER);
  sheet.drawText(box, x, y + 18, TEXT_SCALE);
  pop();

  // Same content, drawn once more at 1x to show native resolution.
  const boxW = measureText(box, TEXT_SCALE).w;
  push();
  tint(GREEN);
  sheet.drawText(box, x + boxW + 40, y + 18, 1);
  pop();

  label(x + boxW + 40, y, "1x NATIVE");
}

function label(x, y, s) {
  noStroke();
  fill(DIM);
  textFont("monospace");
  textSize(11);
  textAlign(LEFT, BOTTOM);
  text(s, x, y + 10);
}

window.keyPressed = function () {
  if (key === "s" || key === "S") {
    save("054-cp437.png");
  }
};
