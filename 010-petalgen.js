import * as e from "./lumic/p5Extensions.js";
import { vec2, DEG2RAD } from "./lumic/common.js";
import { BezierCubic } from "./lumic/bezier.js";

let debugDraw = false;

let curves = [];

let segments = 10;
let r1 = 150; // Distance of 2nd control point from first
let r2 = 150; // Distance of 3rd control point from 4th
let maxAngle1 = 30; // The max angle from the centerline that the 1st control point makes relative to the 2nd
let angleOffset1 = 0;
let maxAngle2 = 75; // The max angle from the centerline that the 3rd control point makes relative to the 4th
let angleOffset2 = 0;
let crossSegments = 8;
let leafLength = 685;

function buildControlGui() {
  e.createSlider(0, height / 2, leafLength, 0.01, "leafLength", (val) => {
    leafLength = val;
  });
  e.createSlider(0, 500, r1, 0.01, "r1", (val) => {
    r1 = val;
  });
  e.createSlider(0, 500, r2, 0.01, "r2", (val) => {
    r2 = val;
  });
  e.createSlider(0, 180, maxAngle1, 0.01, "maxAngle1", (val) => {
    maxAngle1 = val;
  });
  e.createSlider(0, 180, maxAngle2, 0.01, "maxAngle2", (val) => {
    maxAngle2 = val;
  });
  e.createSlider(-180, 180, angleOffset1, 0.01, "angleOffset1", (val) => {
    angleOffset1 = val;
  });
  e.createSlider(-180, 180, angleOffset2, 0.01, "angleOffset2", (val) => {
    angleOffset2 = val;
  });
  e.createSlider(1, 100, segments, 0.01, "segments", (val) => {
    segments = Math.floor(val);
  });
  e.createSlider(1, 100, crossSegments, 0.01, "crossSegments", (val) => {
    crossSegments = Math.floor(val);
  });

  //addToggle("debugDraw");
}

window.setup = function () {
  createCanvas(600, 600, SVG);
  background(40);
  buildControlGui();
};

window.draw = function () {
  background(40);
  translate(width / 2, height / 2);

  const leafStart = vec2(0, -leafLength / 2);
  const leafEnd = vec2(0, leafLength / 2);

  curves = [];

  for (let i = 0; i <= segments; i++) {
    let t = i / segments;

    const a = leafStart;

    let angle1 = angleOffset1 + lerp(-maxAngle1, maxAngle1, t);
    // Note: maxAngle is defined against a vertical line, get angle from horizontal line
    // Also convert to radians
    angle1 = (90 - angle1) * DEG2RAD;

    const b = vec2(r1 * Math.cos(angle1), r1 * Math.sin(angle1));
    b.add(a);

    const d = leafEnd;
    let angle2 = angleOffset2 + lerp(-maxAngle2, maxAngle2, t); // radians
    angle2 = (90 - angle2) * DEG2RAD;

    const c = vec2(r2 * Math.cos(angle2), r2 * -Math.sin(angle2));
    c.add(d);

    curves.push(new BezierCubic(a, b, c, d, 32));
  }

  if (debugDraw) {
    stroke(150, 150, 150);
    strokeWeight(1);
    noFill();
    circle(leafStart.x, leafStart.y, r1 * 2);
    circle(leafEnd.x, leafEnd.y, r2 * 2);
  }

  for (let curve of curves) {
    noFill();
    stroke("red");
    curve.Draw(debugDraw);
  }

  // Draw a "horizontal lines" along the length of the bands.
  // A "band" is the space between two vertical lines.
  // There are (n - 1) bands for (n) lines
  let tStep = 1.0 / crossSegments;
  for (let band = 0; band < curves.length - 1; band++) {
    // Start odd segments at an offset
    let t = (millis() / 20000 + (band % 2 == 0 ? 0 : tStep / 2)) % tStep;
    while (t < 1) {
      const curve = curves[band];
      const a = curve.EvaluatePoint(t);
      const b = curves[band + 1].EvaluatePoint(t);

      strokeWeight(2);
      line(a.x, a.y, b.x, b.y);
      t += tStep;
    }
  }
};
