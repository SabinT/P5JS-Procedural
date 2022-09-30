import { Lines, Polygon } from "./lumic/geomerty.js";
import { PI, vec2, vlerp, length, TAU } from "./lumic/common.js";
import { createSlider } from "./lumic/p5Extensions.js";
import { polarLine } from "./lumic/mandala.js";

const w = 800;
const hw = w / 2;
const h = 800;
const hh = h / 2;
let debug = false;

let anchorPos = 0.21862; // for sides 6
// let anchorPos = 0.21862; // for sides 6
let polySides = 6;
let ringCount = 8;

// let innerRadiusOffset = 9.37;
// let chiselLength = 0.4;
// let chiselInward = 0.56;

let innerRadiusOffset = 0;
let chiselLength = 0.74;
let chiselInward = 0.76;

let g;

function getOptimalAnchorPos(polySides, ringCount) {
  // Do a binary search step to find the optimal anchor position
  // so that the last polygon lines up with the first
  const targetAngle = TAU / (polySides * (ringCount - 1));
  let min = 0;
  let max = 1;
  let mid = 0.5;
  let epsilon = 0.0001;
  let error = 1;
  console.log("Target Angle", (targetAngle * 180) / PI);

  // Make sure the first side of polygon is horizontal
  const p = new Polygon(vec2(0, 0), 1, polySides); // dummy radius
  let iter = 0;
  let maxIter = 100;
  while (error > epsilon && iter < maxIter) {
    const p = new Polygon(vec2(0, 0), 1, polySides, 0);
    let [r, angle] = getRadiusAndAngleForAnchor(p, mid);

    error = abs(angle - targetAngle);
    if (angle > targetAngle) {
      max = mid;
    } else {
      min = mid;
    }
    mid = (min + max) / 2;
    iter++;
  }
  console.log("Iterations", iter);
  return mid;
}

function getRadiusAndAngleForAnchor(p, anchorPos) {
  const l = p.getLines()[0];
  const c = vlerp(l.a, l.b, anchorPos);

  // Find angle between p and c
  let angle = l.a.angleBetween(c);

  if (debug) {
    circle(c.x, c.y, 5);
  }

  let r = length(c);

  if (debug) {
    polarLine(0, 0, r, angle, 8, false, 0);
  }

  return [r, angle];
}

const baseWeight = 2;

function render(g) {
  noFill();
  stroke(0);
  translate(hw, hh);
  angleMode(RADIANS);
  rotate(PI / polySides + PI);

  const rStart = 300;
  let r = rStart;
  const polygons = [];

  let angle = 0;
  for (let i = 0; i < ringCount; i++) {
    const p = new Polygon(vec2(0, 0), r, polySides, angle);
    polygons.push(p);

    stroke(0);
    const last = i === ringCount - 1;
    const first = i === 0;
    if (first || last) {
      strokeWeight(baseWeight * 1.5);
      fill(0);
      p.draw();
      p.radius -= 3;
      fill(255);
      p.draw();

      if (last) {
        // fill(0);
        // noStroke();

        noFill();
        stroke(0);
        strokeWeight(baseWeight);
        const innerPoly = new Polygon(
          vec2(0, 0),
          p.radius - innerRadiusOffset,
          p.sides,
          p.rotation
        );
        innerPoly.drawChiseled(g, chiselInward, chiselLength);
      }
    } else {
      noFill();
      strokeWeight(baseWeight * 0.5);

      // Draw lines between anchor and second point for every line
      const lines = p.getLines();
      for (let j = 0; j < lines.length; j++) {
        const l = lines[j];
        const c = vlerp(l.a, l.b, anchorPos);
        line(c.x, c.y, l.b.x, l.b.y);
      }
    }

    if (debug) {
      // Draw first line of polygon in red
      stroke("red");
      p.getLines()[0].draw();
    }

    // Find the radius and angle for next polygon
    [r, angle] = getRadiusAndAngleForAnchor(p, anchorPos);
    angle *= i + 1;

    if (i == 0) {
      console.log("Degrees offset", (angle * 180) / PI);
    }
  }

  // Draw the lines between the polygons
  noFill();
  stroke(0);

  strokeWeight(baseWeight * 1.5);
  for (let angleIndex = 0; angleIndex < polySides; angleIndex++) {
    stroke(debug && angleIndex == 0 ? "red" : 0);
    beginShape();
    for (let i = 0; i < polygons.length - 1; i++) {
      const line = polygons[i].getLines()[angleIndex];
      const c = vlerp(line.a, line.b, anchorPos);
      curveVertex(c.x, c.y);
      if (i === 0 || i === polygons.length - 2) {
        curveVertex(c.x, c.y);
      }
    }
    endShape();
  }
}

window.setup = function () {
  createCanvas(w, h, SVG);
  createSlider(0, 1, anchorPos, 0.00001, "anchorPos", (v) => {
    anchorPos = v;
    redraw();
  });

  createSlider(3, 12, polySides, 1, "polySides", (v) => {
    polySides = v;
    anchorPos = getOptimalAnchorPos(polySides, ringCount);
    redraw();
  });

  createSlider(1, 32, ringCount, 1, "ringCount", (v) => {
    ringCount = v;
    anchorPos = getOptimalAnchorPos(polySides, ringCount);
    redraw();
  });

  createSlider(0, 1, chiselLength, 0.01, "chiselLength", (v) => {
    chiselLength = v;
    anchorPos = getOptimalAnchorPos(polySides, ringCount);
    redraw();
  });

  createSlider(0, 1, chiselInward, 0.01, "chiselRadial", (v) => {
    chiselInward = v;
    anchorPos = getOptimalAnchorPos(polySides, ringCount);
    redraw();
  });

  createSlider(0, 100, innerRadiusOffset, 0.01, "innerRadiusOffset", (v) => {
    innerRadiusOffset = v;
    anchorPos = getOptimalAnchorPos(polySides, ringCount);
    redraw();
  });

  // Calculate optimal anchor position for given number of sides
  anchorPos = getOptimalAnchorPos(polySides, ringCount);
};

window.draw = function () {
  background(255);
  render(g);
  noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
