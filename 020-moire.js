import {
  avg,
  polar2cart,
  vec2,
  TAU,
  GOLDEN_ANGLE_RADIANS,
  DEG2RAD,
  line2D,
} from "./lumic/common.js";
import {
  addClipShape,
  Circle,
  clearClipShapes,
  Polygon,
} from "./lumic/geomerty.js";

const w = 1000;
const hw = w / 2;
const h = 1000;
const hh = h / 2;

const debug = false;

window.setup = function () {
  pixelDensity(1);
  createCanvas(w, h, SVG);
  translate(hw, hh);

  background(255);
  noFill();
  stroke(0)

  strokeWeight(1.5);
  const numCircles = 50;
  const rStart = 0;
  const rEnd = 250;

  for (let i = 0; i < numCircles; i++) {
    const r = ((rEnd - rStart) * i) / numCircles + rStart;
    circle(0,0, 2 * r);
  }

  // new Polygon(vec2(0, 0), 250, 6).getPoints().forEach((p) => {
  //   translate(random() * 10, random() * 10);
  //   for (let i = 0; i < numCircles; i++) {
  //     const r = ((rEnd - rStart) * i) / numCircles + rStart;
  //     circle(p.x, p.y, 2 * r);
  //   }
  // });

  noLoop();
};

window.draw = function () {};

window.keyTyped = function () {
  switch (key) {
    case "s":
      save();
      break;

    case "r":
      window.location.reload();
      break;
  }
};
