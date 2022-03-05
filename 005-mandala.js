import { avg, polar2cart } from "./lumic/common.js";

const w = 600;
const hw = w / 2;
const h = 600;
const hh = h / 2;

let g;

function drawRing(r1, r2, segments, drawRingSegmentFunc) {
  const anglePerSegment = TAU / segments;
  const offset = 0.5 * anglePerSegment;
  for (let i = 0; i < segments; i++) {
    const angle1 = -offset + i * anglePerSegment;
    const angle2 = angle1 + anglePerSegment;
    drawRingSegmentFunc(r1, angle1, r2, angle2, i);
  }
}

function centeredArc(radius, angle1, angle2) {
  const diameter = 2 * radius;
  noFill();
  arc(hw, hh, diameter, diameter, angle1, angle2);
}

function centeredCircle(radius) {
  circle(hw, hh, 2 * radius);
}

function polarLine(r1, theta1, r2, theta2) {
  const a = polar2cart(r1, theta1).add(hw, hh);
  const b = polar2cart(r2, theta2).add(hw, hh);
  line(a.x, a.y, b.x, b.y);
}

function polarBox(r3, a3, r4, a4) {
  polarLine(r3, a3, r4, a3);
  polarLine(r3, a4, r4, a4);
  polarLine(r3, a3, r3, a4);
  polarLine(r4, a3, r4, a4);
}

// Assuming angle1 < angle2
function squareSegment(r1, angle1, r2, angle2, i) {
  const midAngle = constrain(avg(angle1, angle2), angle1, angle2);
  centeredArc(r1, angle1, midAngle);
  centeredArc(r2, midAngle, angle2);
  polarLine(r1, angle1, r2, angle1);
  polarLine(r1, midAngle, r2, midAngle);
}

function cellSegment(r1, angle1, r2, angle2, i) {
  // leading line, closing line will be provided by next segment
  polarLine(r1, angle1, r2, angle1);
}

function boxSegment(r1, angle1, r2, angle2, i, offset = 0.8) {
  const r3 = lerp(r1, r2, offset);
  const r4 = lerp(r2, r1, offset);
  const a3 = lerp(angle1, angle2, offset);
  const a4 = lerp(angle2, angle1, offset);

  polarLine(r1, angle1, r2, angle1);
  polarBox(r3, a3, r4, a4);
}

function boxSegmentDouble(r1, angle1, r2, angle2, i) {
  boxSegment(r1, angle1, r2, angle2, i, 0.8);
  boxSegment(r1, angle1, r2, angle2, i, 0.6);
}

function bezierSegment(r1, a1, r2, a2, i) {
  let a, b, c, d;

  a = polar2cart(r1, a1).add(hw, hh);
  d = polar2cart(r2, a2).add(hw, hh);
  b = polar2cart(r2, a1).add(hw, hh);
  c = polar2cart(r1, a2).add(hw, hh);
  bezier(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y);
}

function leafSegment(r1, a1, r2, a2, i) {
  let a, b, c, d;

  if (i % 2 == 0) {
    a = polar2cart(r1, a1).add(hw, hh);
    d = polar2cart(r2, a2).add(hw, hh);
    b = polar2cart(r2, a1).add(hw, hh);
    c = polar2cart(r1, a2).add(hw, hh);
  } else {
    a = polar2cart(r2, a1).add(hw, hh);
    b = polar2cart(r1, a1).add(hw, hh);
    c = polar2cart(r2, a2).add(hw, hh);
    d = polar2cart(r1, a2).add(hw, hh);
  }

  b = p5.Vector.lerp(a, b, 0.5);
  c = p5.Vector.lerp(c, d, 0.5);

  bezier(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y);
}

function render(g) {
  noFill();
  stroke(200);
  //circle(hw, hh, 350);

  drawRing(10, 20, 5, squareSegment);
  centeredCircle(30);

  centeredCircle(70);
  centeredCircle(75);
  drawRing(80, 90, 24, squareSegment);
  centeredCircle(95);
  centeredCircle(100);
  drawRing(100, 110, 40, cellSegment);
  centeredCircle(110);
  drawRing(110, 130, 40, bezierSegment);
  centeredCircle(130);
  drawRing(130, 150, 40, boxSegmentDouble);
  centeredCircle(150);
  drawRing(150, 190, 40, leafSegment);
  centeredCircle(190);
  centeredCircle(200);
}

window.setup = function () {
  createCanvas(w, h, SVG);
};

window.draw = function () {
  background(10);
  render(g);
  noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
