import { PHI, scale2d, TAU, vec2 } from "./lumic/common.js";
import { vibrantTheme } from "./lumic/palettes.js";

const w = 1000;
const hw = w / 2;
const h = 1000;
const hh = h / 2;

let g;

/**
 *
 * @param {*} n Number of points
 * @param {*} s How much to scale unit square
 */
function rectFibo(n, s) {
  let pts = [];
  for (let i = 0; i < n; i++) {
    let x = (i / PHI) % 1;
    let y = i / n;

    x = x * s;
    y = y * s;

    pts.push(vec2(x, y));
  }

  return pts;
}

// A function that draws a tileable pattern using given draw function,
// by repeat drawing the same thing twice in each direction.
function drawTileable(drawFunc) {
  // Draw the pattern in the center.
  drawFunc();

  // return;

  // Draw the pattern in the four directions.
  push();
  translate(-w, 0);
  drawFunc();
  translate(w * 2, 0);
  drawFunc();
  pop();

  push();
  translate(0, -h);
  drawFunc();
  translate(0, h * 2);
  drawFunc();
  pop();

  push();
  translate(-w, -h);
  drawFunc();
  translate(w * 2, 0);
  drawFunc();
  translate(-w * 2, h * 2);
  drawFunc();
  translate(w * 2, 0);
  drawFunc();
  pop();
}

const fgcolors = ["#f14b73", "#ee8290", "#ffdf26", "#b4e77f", "#00d58f"];
const bgcolors = ["#085b41", "#0c7b5b", "#0e9a76", "#10b98d", "#12d8a3"];

const R = Math.random;

// Draw vertical lines randomly but thinner towards center
function lines() {
  // scale(0.5);
  strokeWeight(2);
  const fx = (x) => Math.pow(sin(x * PI), 10);

  const n = 100;
  for (let i = 0; i < n; i++) {
    let x = R();

    // Higher chance mid will be rejected
    while (R() < fx(x)) {
      x = R();
    }

    x *= w;

    const y1 = R() * h;
    const y2 = y1 + R() * h;

    const colIndex = Math.floor(R() * bgcolors.length);
    const col = bgcolors[colIndex];

    stroke(col);
    const df = () => line(x, y1, x, y2);
    drawTileable(df);
    // df();
  }
}

function pattern() {
  noStroke();

  const rMin = 10;
  const rMax = 30;
  const count = 200;

  // scale(0.5, 0.5);

  // random number biased towards 0.5
  const fx = (x) => Math.pow(1 - sin(x * PI), 0.3);

  // Get a list of points in fibonacci lattice
  const pts = rectFibo(count, /* scale: */ 1);

  // Draw the fibo points
  for (let i = 0; i < pts.length; i++) {
    let pt = pts[i];

    if (R() > fx(pt.x)) {
      continue;
    }

    pt = scale2d(pt, w);

    pt.x += noise(pt.x, pt.y) * 5;
    pt.y += noise(pt.x + 100, pt.y) * 5;

    // color according to y but with some randomness
    const colIndex = Math.floor((pt.y / h) * fgcolors.length);

    const col = fgcolors[colIndex];
    fill(col);

    const r = random(rMin, rMax);
    const df = () => circle(pt.x, pt.y, r);
    drawTileable(df);
  }
}

function render(g) {
  lines();
  pattern();
}

window.setup = function () {
  createCanvas(w, h);
  pixelDensity(1);

  angleMode(RADIANS);
};

window.draw = function () {
  background(bgcolors[0]);
  render(g);
  noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
