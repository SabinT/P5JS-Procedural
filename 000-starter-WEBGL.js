import * as common from "./lumic/common.js";
import * as debug from "./lumic/debugutils.js";

const w = 2000;
const h = 2000;

const screenW = 800;
const screenH = 800;

let g;

let vec2 = function (a, b) {
  return new p5.Vector(a, b);
};

window.setup = function () {
  g = createGraphics(w, h, WEBGL);
  createCanvas(screenW, screenH);

  g.background(255);

  circle(w / 2, h / 2, 0.8 * min(w, h));

  image(g, 0, 0, screenW, screenH);
};

window.draw = function () {
  background(0);
  image(g, 0, 0, screenW, screenH);

  if (mouseIsPressed) {
    // Draw a zoomed in view
    debug.drawFullZoomSection(g, 200);
  }
};
