import { avg, polar2cart, vec2, TAU, GOLDEN_ANGLE_RADIANS, DEG2RAD } from "./lumic/common.js";
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
  m.setOverrides({ perimeter: true, shape: true});

  push();
  translate(hw, hh);
  scale(0.9);

  fill(0);
  //strokeWeight(2);
  stroke(0);


  fill(255);
  // m.cCircle(220);

  const count1 = 32;

  fill(0);
  m.drawRing(150, 190, m.leafSegment, { count: count1 });
  m.drawRing(150, 110, m.leafSegment, { count: count1 });
  m.drawRing(90, 70, m.diamondSegment, {  perimeter: false, count: count1 });
  m.drawRing(110, 90, m.bezierSegment, { count: count1, angleShift: 0.5 });
  fill(255);
  m.drawRing(140, 160, m.circleSegment, { count: count1 });
  noFill();
  stroke(255);
  m.drawRing(130, 170, m.circleSegment, { count: count1 });
  fill(0);
  m.drawRing(190, 170, m.circleSegment, { count: count1, angleShift: 0.5 });

  stroke(0);
  m.drawRing(70, 55, m.diamondSegment, { count: count1});
  m.drawRing(50, 30, m.leafSegment, { count: 16, angleShift: 0.5 });

  m.drawRing(30, 0, m.diamondSegment, { count: 16, angleShift: 0.5 });


  noFill();
  m.cCircle(190);
  m.cCircle(215);

  fill(0);
  const str = "WASTE-NOT-";
  const textMask = "-----x---x";
  const textMaskInverted = "xxxxx-xxx-";
  const textRepeat = 4;
  const count2 = str.length * textRepeat;
  m.drawRing(182.5, 210, m.textSegment, { count: count2, text: str, font: 'Scandia', fontSize: 18});
  // m.drawRing(200, 220, m.boxSegment, { count: str.length });
  // m.drawRing(200, 220, m.boxSegment, { count: count2, mask: textMask });
  stroke(255);
  noFill();
  // m.drawRing(220, 200, m.leafSegment, { count: count2, mask: textMask });
  // m.drawRing(200, 220, m.leafSegment, { count: count2, mask: textMask });

  fill(0);
  stroke(0);
  // m.drawRing(220, 240, m.boxSegment, { count: count2 * 2 });
  fill(0);
  m.drawRing(240, 270, m.leafSegment, { perimeter: false, shape: false, count: count2 * 1.25, angleShift: 0});
  m.drawRing(240, 215, m.leafSegment, { perimeter: false, shape: false, count: count2 * 1.25, angleShift: 0});
  stroke(255);
  m.drawRing(225, 260, m.bezierSegment, { count: count2 * 1.25, angleShift: 0.5});
  m.drawRing(260, 225, m.bezierSegment, { count: count2 * 1.25, angleShift: 0.5});
  
  noFill();
  stroke(0);
  // m.cCircle(245); 
  
  strokeWeight(1.5);
  fill(0);
  // m.drawRing(245, 270, m.diamondSegment, { count: count2, angleShift: 0.5, inset: 0. });
  // m.drawRing(245, 270, m.diamondSegment, { count: count2, angleShift: 0.5 });
  // m.drawRing(245, 270, m.diamondSegment, { count: count2, angleShift: 0.5 });
  // m.drawRing(270, 295, m.diamondSegment, { count: count2, angleShift: 0.5 });

  // m.drawRing(245, 270, m.s, { count: count2, angleShift: 0.5, inset: 0. });


  stroke(0);
  for (let i = 0; i <= 10; i++) {
    new Polygon(vec2(0,0), 350 + i * 5, 6, (10 - i) * DEG2RAD * 1.5).getLines().forEach((line) => { line.draw(); });
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
