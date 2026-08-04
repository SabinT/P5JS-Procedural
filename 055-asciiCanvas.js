// AsciiBuffer demo — p5-like drawing onto a CP437 character-cell buffer,
// rebuilt from scratch every frame and blitted in one call.

import { loadCp437Sheet } from "./lumic/cp437.js";
import { createBuffer } from "./lumic/asciiCanvas.js";
import { cyberpunkTheme, getColor } from "./lumic/palettes.js";

const BG = "#0d0f12"; // buffer background
const CANVAS_BG = "#232833"; // shows through transparent cells
const AMBER = "#ffb642";
const GREEN = "#7ee081";
const DIM = "#5a6472";
const PAPER = "#e8e2d0";
const BLUE = "#5C82F2";

const COLS = 100;
const ROWS = 52;
const MARGIN = 20;

let sheet;
let buf;

const ball = { x: 55, y: 40, vx: 11, vy: 7.5 };
const trail = [];
const TRAIL_MAX = 24;
const TRAIL_COLORS = ["#22402a", "#3f7040", GREEN]; // old -> new

window.preload = function () {
  sheet = loadCp437Sheet();
};

window.setup = function () {
  buf = createBuffer(COLS, ROWS, { sheet });
  createCanvas(buf.pxWidth() + 2 * MARGIN, buf.pxHeight() + 2 * MARGIN);
  pixelDensity(1); // 1 canvas pixel == 1 texture pixel
  noSmooth(); // nearest-neighbour scaling, no blur
};

window.draw = function () {
  const t = millis() / 1000;
  background(CANVAS_BG);
  buf.clear(BG);

  drawChrome();
  drawPanels();
  drawShadeRamp(t);
  drawJunctions();
  drawPlasma(t);
  drawBouncer();
  drawStatus();

  buf.blit(MARGIN, MARGIN);
};

/** Outer double border with a title punched through the top edge. */
function drawChrome() {
  buf.color(DIM).bgColor(null);
  buf.box(0, 0, COLS - 1, ROWS - 1, "double");
  buf.color(AMBER).bgColor("#1a1d22");
  buf.text(" 055 ASCII CANVAS ", 3, 0);
  buf.bgColor(null);
}

/** Colored panels — per-cell backgrounds, inverse video, transparency. */
function drawPanels() {
  buf.bgColor("#301020");
  buf.fillRect(2, 2, 33, 9);
  buf.bgColor(null); // preserve: text keeps the panel's bg
  buf.color("#ff6f9c").text("PANEL A", 4, 3);
  buf.color(PAPER);
  buf.text("fg + bg per cell,", 4, 5);
  buf.text("DOS text-mode style", 4, 6);

  buf.bgColor("#101c3c");
  buf.fillRect(35, 2, 64, 9);
  buf.bgColor(null);
  buf.color("#7fa3ff").text("PANEL B", 37, 3);
  buf.color(PAPER).text("normal text", 37, 5);
  buf.color("#101c3c").bgColor("#7fa3ff");
  buf.text(" INVERSE VIDEO ", 37, 7);

  buf.bgColor("#0c3230");
  buf.fillRect(66, 2, 97, 9);
  buf.bgColor(null);
  buf.color("#59d6c9").text("PANEL C", 68, 3);
  buf.color(PAPER).text("text keeps panel bg", 68, 5);
  buf.bgColor(0, 0, 0, 0); // stamp transparency: canvas shows through
  buf.text("punched to canvas", 68, 7);
  buf.bgColor(null);
}

/** pixel() maps [0,1] onto the " ░▒▓█" ramp. */
function drawShadeRamp(t) {
  buf.color(DIM).bgColor(null);
  buf.text("PIXEL() SHADE RAMP", 2, 11);
  buf.color(PAPER);
  for (let x = 2; x <= 97; x++) {
    buf.pixel(x, 12, (x - 2) / 95);
  }
  buf.color(AMBER);
  for (let x = 2; x <= 97; x++) {
    buf.pixel(x, 13, 0.5 + 0.5 * sin(x * 0.25 - t * 2));
  }
}

/** Crossing lines and boxes resolve into junction glyphs automatically. */
function drawJunctions() {
  buf.color(DIM).bgColor(null);
  buf.text("AUTO-MERGED JUNCTIONS", 2, 15);

  // Lattice: single + double lines crossing inside a single box produces
  // all four crosses (┼ ╪ ╫ ╬) and the full tee family on the edges.
  buf.color(GREEN);
  buf.box(2, 16, 26, 28, "single");
  buf.hline(2, 26, 20, "single");
  buf.hline(2, 26, 24, "double");
  buf.vline(10, 16, 28, "single");
  buf.vline(18, 16, 28, "double");

  // Mixed-weight boxes built from raw lines: ╒╕╘╛ and ╓╖╙╜ corners.
  buf.color(AMBER);
  buf.hline(30, 46, 16, "double");
  buf.hline(30, 46, 22, "double");
  buf.vline(30, 16, 22, "single");
  buf.vline(46, 16, 22, "single");
  buf.hline(30, 46, 24, "single");
  buf.hline(30, 46, 30, "single");
  buf.vline(30, 24, 30, "double");
  buf.vline(46, 24, 30, "double");

  // Adjacent boxes share an edge: ╦ and ╩ form at the joint.
  buf.color(BLUE);
  buf.box(2, 30, 14, 32, "double");
  buf.box(14, 30, 26, 32, "double");
}

/** Animated two-sine plasma through pixel(), fg quantized to a palette. */
function drawPlasma(t) {
  buf.color(DIM).bgColor(null);
  buf.text("PLASMA", 50, 15);
  for (let y = 16; y <= 32; y++) {
    for (let x = 50; x <= 97; x++) {
      const u = x - 50;
      const v = y - 16;
      const s =
        sin(u * 0.22 + t) + sin(v * 0.4 - t * 0.8) + sin((u + v) * 0.17 + t * 0.5);
      const c = 0.5 + s / 6;
      buf.color(getColor(cyberpunkTheme, min(2, floor(c * 3))));
      buf.pixel(x, y, c);
    }
  }
}

/** A bouncing @ with a fading trail, roaming over everything else. */
function drawBouncer() {
  const dt = min(deltaTime, 50) / 1000;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  if (ball.x < 1 || ball.x > COLS - 2) {
    ball.x = constrain(ball.x, 1, COLS - 2);
    ball.vx *= -1;
  }
  if (ball.y < 1 || ball.y > ROWS - 3) {
    ball.y = constrain(ball.y, 1, ROWS - 3);
    ball.vy *= -1;
  }
  trail.push([ball.x | 0, ball.y | 0]);
  if (trail.length > TRAIL_MAX) trail.shift();

  buf.bgColor(null);
  for (let i = 0; i < trail.length; i++) {
    buf.color(TRAIL_COLORS[floor((i / trail.length) * TRAIL_COLORS.length)]);
    buf.set(trail[i][0], trail[i][1], 0xf9); // ∙
  }
  buf.color(GREEN);
  buf.set(ball.x | 0, ball.y | 0, "@");
}

function drawStatus() {
  buf.color(DIM).bgColor(null);
  buf.text(`${frameRate().toFixed(0).padStart(2)} FPS  ${COLS}x${ROWS} CELLS  [S] SAVE PNG`, 2, 50);
}

window.keyPressed = function () {
  if (key === "s" || key === "S") {
    save("055-asciiCanvas.png");
  }
};
