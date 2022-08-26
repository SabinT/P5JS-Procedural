import {
  avg,
  polar2cart,
  vec2,
  TAU,
  GOLDEN_ANGLE_RADIANS,
  DEG2RAD,
} from "./lumic/common.js";
import { greenTheme, getColor } from "./lumic/palettes.js";
import * as m from "./lumic/mandala.js";
import { defaultLeafOptions, drawLeafShape } from "./lumic/leaf.js";
import { Polygon } from "./lumic/geomerty.js";

const w = 800;
const hw = w / 2;
const h = 800;
const hh = h / 2;

const debug = false;

let g;

function render(g) {
  background(255);
  m.setOverrides({ perimeter: true, shape: true });

  push();
  translate(hw, hh);
  scale(0.9);

  stroke(0);
  fill(0);
  for (let i = 10; i >= 0; i--) {
    if (i == 0) {
      fill(255);
    }
    new Polygon(vec2(0, 0), 200 + i * 8, 6, (10 - i) * DEG2RAD * 3).draw();
  }

  noFill();
  stroke(0);
  strokeWeight(4);
  m.cCircle(300);

  fill(0);
  noStroke();
  m.drawRing(300, 400, m.leafSegment, { count: 18, angleShift: 0.5 });

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
