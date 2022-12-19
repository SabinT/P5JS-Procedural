import { PHI, TAU, vec2 } from "./lumic/common.js";
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
  let pts = []
  for (let i = 0; i < n; i++) {
    let x = (i / PHI) % 1;
    let y = i / n;
        
    x = (x - 0.5) * s;
    y = (y - 0.5) * s;
    
    pts.push(vec2(x,y));
  }
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

const R = Math.random;

function pattern() {
  angleMode(RADIANS);
  const pal = vibrantTheme;

  const rMin = 30;
  const rMax = 50;
  const count = 100;

  // scale(0.5, 0.5);

  // random number biased towards 0.5
  const fx = (x) => sin(x * PI);

  // Draw circles randomly, thinner at the horizontal center.
  for (let i = 0; i < count; i++) {
    let x = R();

    if (R() < fx(x)) { continue; }

    x *= w;
    const y = random(0, h);
    const r = random(rMin, rMax);

    // if (abs(x) < sin(x / w * TAU)) {
    //   continue;
    // }

    const col = pal.colors[int(random(0, pal.colors.length))];
    fill(col);
    const df = () => circle(x, y, r);
    drawTileable(df);
  }
}

function render(g) {
  const df = () => circle(0, 0, 200);

  pattern();
}

window.setup = function () {
  createCanvas(w, h);
};

window.draw = function () {
  background(10);
  render(g);
  noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
