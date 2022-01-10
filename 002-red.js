import * as common from "./lumic/common.js";
import * as debug from "./lumic/debugutils.js";
import * as geom from "./lumic/geomerty.js";

const w = 2000;
const h = 2000;

const screenW = 800;
const screenH = 800;

let g;

const black = "#000000";
const white = "#FFFFFF";
const gray1 = "#555555";
const gray2 = "#AAAAAA";
const gray3 = "#EEEEEE";
const red = "#AA0000";
const bgColor = "#222222";

let vec2 = function (a, b) {
  return new p5.Vector(a, b);
};

const nsx1 = 0.1;
const nsy1 = 0.2;

var bigOffset = false;

function noise1(x, y) {
  return noise(100 + x * nsx1, 100 + y * nsy1) - 0.5;
}

function average(x, y) {
  return 0.5 * (x + y);
}

var ow1 = 30;
var ow2 = 15;
var ow3 = 5;
var cmod = 100;

function streak(startX, startY, length, width) {
  g.stroke(black);
  g.strokeWeight(4);

  const cOffset1 = Math.floor(noise(200 + startX * 100) * cmod);
  const cOffset2 = Math.floor((noise(200 + startX * 100) - 0.5) * cmod * 0.5);

  for (var i = 0; i < length; i += 1) {
    let x =
      startX + (noise(200 + startX * 100, 100 + 100 * startY) - 0.5) * 500;

    x += (noise(x, i * 0.01) - 0.5) * 80;

    const y = startY + i;

    var t = 1 - i / length;
    const dx1 = -10 + noise1(x - 1, y) * width;
    const dx2 = 10 + noise1(x + 1, y) * width;

    const x1 = x + dx1 * t;
    const x2 = x + dx2 * t;
    const cx = average(x1, x2);

    let off0 = (ow1 + 1) * t;
    g.stroke(black);
    g.line(-off0 + x1, y, off0 + x2, y);

    let off1 = ow1 * t;
    g.stroke(gray3);
    g.line(-off1 + x1, y, off1 + x2, y);

    if ((i + cOffset1) % (cmod + cOffset2) == 0) {
      g.stroke(red);
      g.strokeWeight(8);
      g.circle(cx, y, (dx1 + dx2 + ow1) * t + (ow1 + 40) * t);

      g.stroke(white);
      g.strokeWeight(8);
      g.circle(cx, y, (dx1 + dx2 + ow1) * t + (ow1 + 44) * t);
    }

    const off2 = ow2 * t * t;
    g.stroke(gray2);
    g.line(-off2 + x1, y, off2 + x2, y);

    let off3 = ow3 * t;
    g.stroke(gray1);
    g.line(-off3 + x1, y, off3 + x2, y);

    g.stroke(black);
    g.line(x1, y, x2, y);
  }
}

window.setup = function () {
  g = createGraphics(w, h, WEBGL);
  createCanvas(screenW, screenH);

  g.background(bgColor);

  rect(0, 0, 0.5, 0.5);

  const c = 15;
  const dx = w / (2 * c);
  for (var i = -c; i <= c; i += 1) {
    const x = i * dx;
    const length = h - noise(x) * 0.1 * h;
    streak(i * dx, -h / 2, length, 0);
  }

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
