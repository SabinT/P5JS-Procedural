import { avg, polar2cart, remap } from "./lumic/common.js";
import { greenTheme, getColor } from "./lumic/palettes.js";

const w = 600;
const hw = w / 2;
const h = 600;
const hh = h / 2;

const debug = false;

let g;

/**
 *
 * @param {*} r1 Start radius of ring
 * @param {*} r2 End radius of ring
 * @param {integer} segments Repititions
 * @param {function} drawRingSegmentFunc A function that takes (r1, a1, r2, a2, i, options)
 * @param {object} options Arbitrary data for custom ring functions
 */
function drawRing(r1, r2, segments, drawRingSegmentFunc, options) {
  const anglePerSegment = TAU / segments;
  const offset = 0.5 * anglePerSegment;
  for (let i = 0; i < segments; i++) {
    const angle1 = -offset + i * anglePerSegment;
    const angle2 = angle1 + anglePerSegment;
    drawRingSegmentFunc(r1, angle1, r2, angle2, i, options);
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
  // beginShape();
  // TODO turn this to begin shape and end shape, interpolate over r, theta, add fill
  polarLine(r3, a3, r4, a3);
  polarLine(r3, a4, r4, a4);
  polarLine(r3, a3, r3, a4);
  polarLine(r4, a3, r4, a4);
  // endShape(CLOSE);
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

function bezier2D(a, b, c, d) {
  bezier(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y);
}

function bezierQuadratic2D(a, b, c, shouldClose = false) {
  beginShape();
  vertex(a.x, a.y);
  quadraticVertex(b.x, b.y, c.x, c.y);

  if (shouldClose) {
    endShape(CLOSE);
  } else {
    endShape();
  }
}

function line2D(a, b) {
  line(a.x, a.y, b.x, b.y);
}

function bezierSegment(r1, a1, r2, a2, i) {
  let a, b, c, d;

  a = polar2cart(r1, a1).add(hw, hh);
  d = polar2cart(r2, a2).add(hw, hh);
  b = polar2cart(r2, a1).add(hw, hh);
  c = polar2cart(r1, a2).add(hw, hh);
  bezier2D(a, b, c, d);
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

function crissCrossPetalSegment(r1, a1, r2, a2, i, options) {
  var a = polar2cart(r1, a1).add(hw, hh); // bottom left
  var b = polar2cart(r2, a1).add(hw, hh); // top left
  var c = polar2cart(r2, a2).add(hw, hh); // top right
  var d = polar2cart(r1, a2).add(hw, hh); // bottom right

  var phi = a2 - a1; // angle subtended by arc
  var r3 = r2 / Math.cos(0.5 * phi);
  r3 *= options.scaler;
  var e = polar2cart(r3, avg(a1, a2)).add(hw, hh);

  bezier2D(a, b, e, c);
  bezier2D(b, e, c, d);
}

function leafTiltedSegment(r1, a1, r2, a2, i, options) {
  const da = Math.abs(a2 - a1);
  a1 -= 0.5 * da;
  a2 -= 0.5 * da;

  var a = polar2cart(r1, a1).add(hw, hh); // bottom left
  var b = polar2cart(r2, a1).add(hw, hh); // top left
  var c = polar2cart(r2, a2).add(hw, hh); // top right
  var d = polar2cart(r1, a2).add(hw, hh); // bottom right

  const skipFactor = options?.skipFactor || 1;
  const j = Math.floor((i + 1) / skipFactor);

  if (j % 2 == 1) {
    return;
  }

  const m = (options?.flip || false) ? 0 : 1;

  if (i % 2 == m) {
    bezierQuadratic2D(a, b, c, true);
    bezierQuadratic2D(c, d, a, true);
  } else {
    bezierQuadratic2D(b, c, d, true);
    bezierQuadratic2D(b, a, d, true);
  }
}

function circleSegment(r1, a1, r2, a2, i, options) {
  var a = polar2cart(avg(r1,r2), avg(a1,a2)).add(hw, hh); // bottom left

  const diameter = options?.diameter || 4;
  circle(a.x,a.y,diameter);
}

function render(g) {
  noFill();
  stroke(200);
  //circle(hw, hh, 350);

  stroke(getColor(greenTheme, 2));

  drawRing(10, 20, 5, squareSegment);
  centeredCircle(30);

  centeredCircle(70);
  centeredCircle(75);
  drawRing(80, 90, 24, squareSegment);
  centeredCircle(95);
  centeredCircle(100);

  stroke(getColor(greenTheme, 2));

  drawRing(100, 110, 40, cellSegment);
  centeredCircle(110);
  drawRing(110, 130, 40, bezierSegment);
  centeredCircle(130);
  drawRing(130, 150, 40, boxSegmentDouble);
  centeredCircle(150);

  stroke(getColor(greenTheme, 0));


  drawRing(150, 190, 40, leafSegment);
  centeredCircle(190);
  centeredCircle(200);

  //stroke("#ff0000");
  // var scale = remap(-1, 1, 0.75, 1.25, sin(millis() /  4000));
  fill(getColor(greenTheme, 3));
  drawRing(200, 220, 72, crissCrossPetalSegment, { scaler: 0.97 });

  stroke(getColor(greenTheme, 1));
  const leafCount = 144;
  drawRing(220, 230, leafCount, leafTiltedSegment, {skipFactor: 2});
  drawRing(230, 240, leafCount, leafTiltedSegment, {flip: true, skipFactor: 2});
  
  noFill();
  centeredCircle(230);

  fill(getColor(greenTheme, 3));
  drawRing(250, 250, 144, circleSegment, { diameter: 5});
}

window.setup = function () {
  createCanvas(w, h, SVG);
};

window.draw = function () {
  background(10);
  render(g);
  // noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
