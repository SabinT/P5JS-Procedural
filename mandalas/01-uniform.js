import { avg, polar2cart, vec2 } from "../lumic/common.js";
import { greenTheme, getColor } from "../lumic/palettes.js";
import * as m from "../lumic/mandala.js";

const w = 600;
const hw = w / 2;
const h = 600;
const hh = h / 2;

const debug = false;

let g;

function render(g) {
  push();
  translate(hw, hh);
  scale(0.9);

  noStroke();
  fill(255);

  m.setCurrentRadius(20);

  const rings = 3;
  const rStep = 20;
  const count = 16;
  const inset = 0.0;

  for (let i = 0; i < rings; i++) {
    m.addRing(m.diamondSegment, rStep, {
      count: count,
      inset: inset,
      shape: true,
    });
  }

  pop();
}

window.setup = function () {
  createCanvas(w, h, SVG);
};

window.draw = function () {
  render(g);
  noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
