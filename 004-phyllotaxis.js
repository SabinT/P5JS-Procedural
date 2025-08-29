/**
 * Some helpful resources for planar phyllotaxis:
 * http://algorithmicbotany.org/papers/modelling-spiral-phyllotaxis.pdf
 * http://algorithmicbotany.org/papers/abop/abop-ch4.pdf
 */

import { GOLDEN_ANGLE_RADIANS, polar2cart, sqRand2D, vec2 } from "./lumic/common.js";

const color1 = "#fcfbf9";
const color2 = "#2ce7f8";
const color3 = "#b9132c";
const color4 = "#fb6a54";
const color5 = "#fdbf38";

const palette = [color1, color2, color3, color4, color5];

const w = 800;
const hw = w / 2;
const h = 800;
const hh = h / 2;

const screenW = w;
const screenH = h;

let g;

const innerScale = 5;
const innerDiameter = 6;
const totalCount = 3300;

function rndXYSeed(x, y, seed) {
  return sqRand2D(x, y, seed) - 0.5;
}

/**
 * Angle = n * GOLDEN_ANGLE (137.5 deg)
 * radius = radialCoeff * sqrt(n)
 */
function drawPhyllotactic(n, radialCoeff) {
  const angle = n * GOLDEN_ANGLE_RADIANS;
  const r = radialCoeff * sqrt(n);

  const cart = polar2cart(vec2(r, angle));

  const x = cart.x + hw;
  const y = cart.y + hh;
  circle(x, y, innerDiameter);
}

let remainder1 = 0;
let remainder2 = 0;
let mod1 = 17;
let mod2 = 23;

function render(g) {
  for (let i = 1; i < totalCount; i++) {
    if (i % mod1 == remainder1) {
      continue;
    }

    const col = palette[Math.floor(i / 1) % 5];
    stroke(col);
    fill(col);

    if (i % mod2 == remainder2) {
      // noFill();
      continue;
    }

    // noFill();
    drawPhyllotactic(i, innerScale);
  }

  noFill();
  circle(hw, hh, 600);
}

window.setup = function () {
  createCanvas(screenW, screenH, SVG);

  background(10);
  // fill(255);
  // circle(0, 0, 50);

  render(g);
};

window.draw = function () {
  background(10);

  remainder1 = frameCount % mod1;
  remainder2 = frameCount % mod2;

  render(g);
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
