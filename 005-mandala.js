import { avg, polar2cart, vec2 } from "./lumic/common.js";
import { greenTheme, getColor } from "./lumic/palettes.js";
import * as m from "./lumic/mandala.js";

const w = 600;
const hw = w / 2;
const h = 600;
const hh = h / 2;

const debug = false;

let g;

// Assuming angle1 < angle2
function squareSegment(r1, angle1, r2, angle2, i) {
  const midAngle = constrain(avg(angle1, angle2), angle1, angle2);
  m.cArc(r1, angle1, midAngle);
  m.cArc(r2, midAngle, angle2);
  m.polarLine(r1, angle1, r2, angle1);
  m.polarLine(r1, midAngle, r2, midAngle);
}

function cellSegment(r1, angle1, r2, angle2, i) {
  // leading line, closing line will be provided by next segment
  m.polarLine(r1, angle1, r2, angle1);
}

function boxSegment(r1, angle1, r2, angle2, i, offset = 0.8) {
  const r3 = lerp(r1, r2, offset);
  const r4 = lerp(r2, r1, offset);
  const a3 = lerp(angle1, angle2, offset);
  const a4 = lerp(angle2, angle1, offset);

  m.polarLine(r1, angle1, r2, angle1);
  m.polarBox(r3, a3, r4, a4);
}

function boxSegmentDouble(r1, angle1, r2, angle2, i) {
  boxSegment(r1, angle1, r2, angle2, i, 0.8);
  boxSegment(r1, angle1, r2, angle2, i, 0.6);
}

function bezier2D(a, b, c, d) {
  bezier(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y);
}

function bezierQuadratic2DShape(a, b, c) {
  vertex(a.x, a.y);
  quadraticVertex(b.x, b.y, c.x, c.y);
}

function line2D(a, b) {
  line(a.x, a.y, b.x, b.y);
}

function bezierSegment(r1, a1, r2, a2, i) {
  let a, b, c, d;

  a = polar2cart(vec2(r1, a1));
  d = polar2cart(vec2(r2, a2));
  b = polar2cart(vec2(r2, a1));
  c = polar2cart(vec2(r1, a2));
  bezier2D(a, b, c, d);
}

function leafSegment(r1, a1, r2, a2, i) {
  let a, b, c, d;

  if (i % 2 == 0) {
    a = polar2cart(vec2(r1, a1));
    d = polar2cart(vec2(r2, a2));
    b = polar2cart(vec2(r2, a1));
    c = polar2cart(vec2(r1, a2));
  } else {
    a = polar2cart(vec2(r2, a1));
    b = polar2cart(vec2(r1, a1));
    c = polar2cart(vec2(r2, a2));
    d = polar2cart(vec2(r1, a2));
  }

  b = p5.Vector.lerp(a, b, 0.5);
  c = p5.Vector.lerp(c, d, 0.5);

  bezier(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y);
}

function crissCrossPetalSegment(r1, a1, r2, a2, i, options) {
  var a = polar2cart(vec2(r1, a1)); // bottom left
  var b = polar2cart(vec2(r2, a1)); // top left
  var c = polar2cart(vec2(r2, a2)); // top right
  var d = polar2cart(vec2(r1, a2)); // bottom right

  var phi = a2 - a1; // angle subtended by arc
  var r3 = r2 / Math.cos(0.5 * phi);
  r3 *= options.scaler;
  var e = polar2cart(vec2(r3, avg(a1, a2)));

  bezier2D(a, b, e, c);
  bezier2D(b, e, c, d);
}

function leafTiltedSegment(r1, a1, r2, a2, i, options) {
  const da = Math.abs(a2 - a1);
  a1 -= 0.5 * da;
  a2 -= 0.5 * da;

  var a = polar2cart(vec2(r1, a1)); // bottom left
  var b = polar2cart(vec2(r2, a1)); // top left
  var c = polar2cart(vec2(r2, a2)); // top right
  var d = polar2cart(vec2(r1, a2)); // bottom right

  const skipFactor = options?.skipFactor || 1;
  const j = Math.floor((i + 1) / skipFactor);

  if (j % 2 == 1) {
    return;
  }

  const m = (options?.flip || false) ? 0 : 1;

  beginShape();
  if (i % 2 == m) {
    bezierQuadratic2DShape(a, b, c);
    bezierQuadratic2DShape(c, d, a);
  } else {
    bezierQuadratic2DShape(d, c, b);
    bezierQuadratic2DShape(b, a, d);
  }
  endShape();
}

function circleSegment(r1, a1, r2, a2, i, options) {
  var a = polar2cart(vec2(avg(r1,r2), avg(a1,a2))); // bottom left

  const diameter = options?.diameter || (r2 - r1);
  circle(a.x,a.y,diameter);
}

function render(g) {
  push();
  translate(hw, hh);

  noFill();
  stroke(200);

  stroke(getColor(greenTheme, 2));

  m.drawRing(10, 20, 5, squareSegment);
  m.cCircle(30);

  m.cCircle(70);
  m.cCircle(75);
  m.drawRing(80, 90, 24, squareSegment);
  m.cCircle(95);
  m.cCircle(100);

  stroke(getColor(greenTheme, 2));

  m.drawRing(100, 110, 40, cellSegment);
  m.cCircle(110);
  m.drawRing(110, 130, 40, bezierSegment);
  m.cCircle(130);
  m.drawRing(130, 150, 40, boxSegmentDouble);
  m.cCircle(150);

  stroke(getColor(greenTheme, 0));


  m.drawRing(150, 190, 40, leafSegment);
  m.cCircle(190);
  m.cCircle(200);

  //stroke("#ff0000");
  // var scale = remap(-1, 1, 0.75, 1.25, sin(millis() /  4000));
  fill(getColor(greenTheme, 3));
  m.drawRing(200, 220, 72, crissCrossPetalSegment, { scaler: 0.97 });

  stroke(getColor(greenTheme, 1));
  const leafCount = 144;
  m.drawRing(220, 230, leafCount, leafTiltedSegment, {skipFactor: 2});
  m.drawRing(230, 240, leafCount, leafTiltedSegment, {flip: true, skipFactor: 2});
  
  noFill();
  m.cCircle(230);

  fill(getColor(greenTheme, 3));
  m.drawRing(250, 250, 144, circleSegment, { diameter: 5});

  pop();
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
