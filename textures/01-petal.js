import { PHI, scale2d, TAU, vec2 } from "../lumic/common.js";

const w = 1000;
const hw = w / 2;
const h = 1000;
const hh = h / 2;

let g;

const bright = {
  bg: "#efe8d0",
  circles: ["#ff49ad", "#c588aa", "#6e1f4b"],
  lines: ["#eeb672"],
  rMin: 5,
  rMax: 20,
  count: 150,
  lineCount: 50,
};

const dark = {
  bg: "#286492",
  circles: ["#8eb9c2", "#dad1bd", "#ecc47f"],
  lines: ["#d3596e"],
  rMin: 10,
  rMax: 30,
  count: 150,
  lineCount: 0,
};

let settings = bright;

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
function drawTileable(drawFunc, w, h) {
  w |= width;
  h |= height;

  // Draw the pattern in the center.
  drawFunc();

  // Draw the pattern in the various directions.
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

const R = Math.random;

// Draw vertical lines randomly but thinner towards center
function lines() {
  // scale(0.5);
  strokeWeight(2);
  const fx = (x) => Math.pow(sin(x * PI), 10);

  for (let i = 0; i < settings.lineCount; i++) {
    let x = R();

    // Higher chance mid will be rejected
    while (R() < fx(x)) {
      x = R();
    }

    x *= w;

    const y1 = R() * h;
    const y2 = y1 + R() * h;

    const colIndex = Math.floor(R() * settings.lines.length);
    const col = settings.lines[colIndex];

    stroke(col);
    const df = () => line(x, y1, x, y2);
    drawTileable(df);
    // df();
  }
}

function pattern() {
  noStroke();

  // scale(0.5, 0.5);

  // random number biased towards 0.5
  const fx = (x) => Math.pow(1 - sin(x * PI), 0.3);

  // Get a list of points in fibonacci lattice
  const pts = rectFibo(settings.count, /* scale: */ 1);

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
    const colIndex = Math.floor((pt.y / h) * settings.circles.length);
    const col = settings.circles[colIndex];
    fill(col);

    const r = random(settings.rMin, settings.rMax);
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
  pixelDensity(2);

  angleMode(RADIANS);
};

window.draw = function () {
  background(settings.bg);
  render(g);
  noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }

  if (key === "1") {
    settings = bright;
    redraw();
  }

  if (key === "2") {
    settings = dark;
    redraw();
  }
};
