import { avg, polar2cart, vec2, vertexPolar } from "./lumic/common.js";
import { greenTheme, getColor } from "./lumic/palettes.js";
import * as m from "./lumic/mandala.js";

const w = 600;
const hw = w / 2;
const h = 600;
const hh = h / 2;

const debug = false;

function diamondSegment(r1, a1, r2, a2, i, options) {
  //  *----B----*   A = (rm, a2)
  //  *         *   B = (r2, am)
  //  A         C   C = (rm, a1)
  //  *         *   D = (r1, am)
  //  *----D----*

  const rm = avg(r1, r2);
  const am = avg(a1, a2);

  const divisions = options?.divisions || 8;

  const vertexMode = options?.shape;

  m.polarLine(rm, a2, r2, am, divisions, vertexMode);
  m.polarLine(r2, am, rm, a1, divisions, vertexMode);
  m.polarLine(rm, a1, r1, am, divisions, vertexMode);
  m.polarLine(r1, am, rm, a2, divisions, vertexMode);
}

function crossSegment(r1, a1, r2, a2, i, options) {
  //  A---------B   A = (r2, a2)
  //  *         *   B = (r2, a1)
  //  *         *   C = (r1, a2)
  //  *         *   D = (r1, a1)
  //  C---------D

  const divisions = options?.divisions || 8;
  const vertexMode = options?.shape;

  m.polarLine(r2, a2, r2, a1, divisions, vertexMode);
  m.polarLine(r2, a1, r1, a2, divisions, vertexMode);
  m.polarLine(r1, a2, r1, a1, divisions, vertexMode);
  m.polarLine(r1, a1, r2, a2, divisions, vertexMode);
}

function triangleSegment(r1, a1, r2, a2, i, options) {
  //  *----A----*   A = (r2, am)
  //  *         *   B = (r1, a2)
  //  *         *   C = (r1, a1)
  //  *         *
  //  B---------C

  const divisions = options?.divisions || 8;

  const am = avg(a1, a2);

  const vertexMode = options.shape;

  m.polarLine(r2, am, r1, a2, divisions, vertexMode);
  m.polarLine(r1, a2, r1, a1, divisions, vertexMode);
  m.polarLine(r1, a1, r2, am, divisions, vertexMode);
}

let g;

function render(g) {
  push();
  translate(hw, hh);

  noFill();
  background(200);
  stroke(12);

  fill("aquamarine");
  m.drawRing(40, 80, 16, diamondSegment, { shape: true });

  m.drawRing(80, 120, 16, diamondSegment, { shape: true });

  fill("turquoise");
  m.drawRing(130, 150, 32, crossSegment, { shape: true});

  fill("yellow");
  m.drawRing(160, 180, 16, triangleSegment, { shape: true });

  pop();
}

window.setup = function () {
  createCanvas(w, h, SVG);
};

window.draw = function () {
  background(10);
  render(g);
  // noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
