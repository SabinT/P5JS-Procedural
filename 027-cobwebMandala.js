import { PI, avg, polar2cart, vec2 } from "./lumic/common.js";
import { greenTheme, getColor } from "./lumic/palettes.js";
import * as m from "./lumic/mandala.js";

const w = 1080;
const hw = w / 2;
const h = 1080;
const hh = h / 2;

const debug = false;

const repeatCount = 9;

const bgColor = "#0a0000";
const lineColor = "#ff9451";
const dotColor = "#ffeadd";

function polarBlendAnim() {
  return sin((mouseX + mouseY) * PI / 300 + m.getCurrentRadius() / 20) * 2.5;
}

function render() {
  background(bgColor);

  push();
  translate(hw, hh);
  scale(0.9);

  noFill();
  stroke(lineColor);

  // stroke(getColor(greenTheme, 2));

  m.setCurrentRadius(20);

  m.addRing(m.triangleSegment, 40, {
    count: repeatCount,
    polarBlend: 0.5 + polarBlendAnim(),
  });

  m.addRing(m.triangleSegment, 50, {
    count: repeatCount,
    angleShift: 0.5,
    hidePerimeter: true,
    polarBlend: 0.5 + polarBlendAnim(),
  });

  m.addRing(m.triangleSegment, 30, {
    count: repeatCount,
    hidePerimeter: true,
    polarBlend: 0.5 + polarBlendAnim(),
  });

  m.addRing(m.triangleSegment, 75, { count: repeatCount, angleShift: 0.5, polarBlend: 0.5 + polarBlendAnim(), hidePerimeter: true });

  m.addRing(m.triangleSegment, 80, { count: repeatCount, polarBlend: 0.5 + polarBlendAnim(), hidePerimeter: true });

  m.cCircle(m.getCurrentRadius());

  stroke(dotColor);

  m.setCurrentRadius(20);

  strokeWeight(4);
  m.drawRepeat(m.circleSegment, { count: repeatCount, diameter: 2, angleShift: 0.5 });
  m.addSpacer(40);

  m.drawRepeat(m.circleSegment, { count: repeatCount, diameter: 5 });
  m.addSpacer(50);

  strokeWeight(5);
  m.drawRepeat(m.circleSegment, { count: repeatCount, diameter: 5, angleShift: 0.5 });
  m.addSpacer(30);

  strokeWeight(4);
  m.drawRepeat(m.circleSegment, { count: repeatCount, diameter: 5 });
  m.addSpacer(75);

  strokeWeight(5);
  m.drawRepeat(m.circleSegment, { count: repeatCount, diameter: 5, angleShift: 0.5 });
  m.addSpacer(80);

  strokeWeight(4);
  m.drawRepeat(m.circleSegment, { count: repeatCount, diameter: 5 });

  pop();
}

window.setup = function () {
  createCanvas(w, h, SVG);
};

window.draw = function () {
  render();
  // noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
