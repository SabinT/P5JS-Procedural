import { avg, polar2cart, vec2 } from "./lumic/common.js";
import { greenTheme, getColor } from "./lumic/palettes.js";
import * as m from "./lumic/mandala.js";

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

  noFill();
  stroke(200);

  stroke("white");

  let segments = [
    m.squareWaveSegment,
    m.triangleSegment,
    m.leafSegment,
    m.crissCrossPetalSegment
  ];

  let i = Math.floor(random(0, segments.length));

  m.drawRing(100, 200, segments[i], { count: Math.floor(random(16, 32))});
  

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
