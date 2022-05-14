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

  stroke(getColor(greenTheme, 2));

  m.drawRing(10, 20, m.squareWaveSegment,, { count: 5});
  m.cCircle(30);

  m.cCircle(70);
  m.cCircle(75);
  m.drawRing(80, 90, m.squareWaveSegment,, { count: 24 });
  m.cCircle(95);
  m.cCircle(100);

  stroke(getColor(greenTheme, 2));

  m.drawRing(100, 110, m.cellSegment, { count: 40 });
  m.cCircle(110);
  m.drawRing(110, 130, m.bezierSegment, { count: 40 });
  m.cCircle(130);
  m.drawRing(130, 150, m.boxSegment, { count: 40 });
  m.drawRing(130, 150, m.boxSegment, { count: 40, inset: 0.2 });
  m.cCircle(150);

  stroke(getColor(greenTheme, 0));

  m.drawRing(150, 190, m.leafSegment, { count: 40 });
  m.drawRing(150, 170, m.leafSegment, { count: 40, hidePerimeter: true });
  m.drawRing(170, 185, m.leafSegment, { count: 40, hidePerimeter: true, angleShiftFactor : 0.5, insetA: 0.22 });
  m.cCircle(190);
  m.cCircle(200);

  //stroke("#ff0000");
  // var scale = remap(-1, 1, 0.75, 1.25, sin(millis() /  4000));
  fill(getColor(greenTheme, 3));
  m.drawRing(200, 220, m.crissCrossPetalSegment, {count: 72, scaler: 0.97 });

  stroke(getColor(greenTheme, 1));
  const leafCount = 72;
  m.drawRing(220, 240, m.leafTiltedSegment, {count: leafCount, skipFactor: 2});
  m.drawRing(240, 260, m.leafTiltedSegment, {count: leafCount, flip: true, skipFactor: 2});
  
  noFill();
  m.cCircle(240);

  //fill(getColor(greenTheme, 3));
  // m.drawRing(240, 240, m.circleSegment, { count: leafCount / 4, diameter: 20, angleShiftFactor: 0.75});
  // m.drawRing(240, 240, m.circleSegment, { count: leafCount / 4, diameter: 10, angleShiftFactor: 0.75});
  m.drawRing(240, 240, m.circleSegment, { count: leafCount /4, diameter: 10});
  m.drawRing(240, 240, m.circleSegment, { count: leafCount /4, diameter: 10, angleShiftFactor: 0.5});

  m.drawRing(260, 285, m.leafSegment, { count: leafCount /4, diameter: 10, angleShiftFactor: 0.25, insetA: 0.25, hidePerimeter: true});
  m.drawRing(260, 295, m.leafSegment, { count: leafCount /4, diameter: 10, angleShiftFactor: -0.25, insetA: 0.25, hidePerimeter: true});

  m.cCircle(300);

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
