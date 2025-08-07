import { CubicHermite2D } from "./lumic/hermite.js";
import { vec2, add2d, sub2d, mul2d, normalize2d, line2D, scale2d } from "./lumic/common.js";

const w = 1920;
const h = 1080;

let splines = [];
let state = 0; // 0 = p0, 1 = m0, 2 = p1, 3 = m1
let wipSpline = { p0: null, m0: null, p1: null, m1: null };
let dragStart;
let previewBuffer;

window.setup = function () {
  createCanvas(w, h);
  previewBuffer = createGraphics(w, h);
};

window.draw = function () {
  background(10);

  // Clear preview buffer each frame
  previewBuffer.clear();

  // Draw completed splines
  for (const s of splines) {
    drawSpline(s);
  }

  // Draw in-progress selections
  if (state > 0) {
    stroke(100, 200, 255);
    if (wipSpline.p0) ellipse(wipSpline.p0.x, wipSpline.p0.y, 6);
    if (wipSpline.m0) line2D(wipSpline.p0, add2d(wipSpline.p0, wipSpline.m0));
    if (wipSpline.p1) ellipse(wipSpline.p1.x, wipSpline.p1.y, 6);
    if (wipSpline.m1) line2D(wipSpline.p1, add2d(wipSpline.p1, wipSpline.m1));
  }

  // Draw picking previews
  drawPickingPreview();

  // Composite the preview buffer on top
  image(previewBuffer, 0, 0);
};

window.mousePressed = function () {
  dragStart = vec2(mouseX, mouseY);

  if (state === 0) { wipSpline.p0 = dragStart; state = 1; }
  else if (state === 2) { wipSpline.p1 = dragStart; state = 3; }
};

window.mouseReleased = function () {
  if (state === 1) {
    wipSpline.m0 = sub2d(vec2(mouseX, mouseY), wipSpline.p0);
    state = 2;
  } else if (state === 3) {
    wipSpline.m1 = sub2d(vec2(mouseX, mouseY), wipSpline.p1);

    const spline = new CubicHermite2D(wipSpline.p0, wipSpline.m0, wipSpline.p1, wipSpline.m1);
    splines.push(spline);
    console.log("Added spline:", spline.ToJSONString());

    wipSpline = { p0: null, m0: null, p1: null, m1: null };
    state = 0;
  }
};

function drawSpline(spline) {
  const samples = 50;
  stroke(255);
  noFill();

  beginShape();
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = spline.GetPosition(t);
    vertex(p.x, p.y);

    const debugLength = 30;

    // Tangents (lines)
    const tangent = normalize2d(spline.GetTangent(t));
    stroke("red");
    line2D(p, add2d(p, scale2d(tangent, debugLength)));

    // Normals
    const normal = normalize2d(spline.GetNormal(t));
    stroke("green");
    line2D(p, add2d(p, scale2d(normal, debugLength)));
  }
  endShape();
}

function drawPickingPreview() {
  previewBuffer.push();
  previewBuffer.strokeWeight(1);
  previewBuffer.noFill();

  if (state === 1) {
    // Realtime tangent preview for m0
    previewBuffer.stroke(100, 200, 255);
    previewBuffer.line(wipSpline.p0.x, wipSpline.p0.y, mouseX, mouseY);
  }

  if (state === 3) {
    // Realtime tangent preview for m1
    previewBuffer.stroke(100, 200, 255);
    previewBuffer.line(wipSpline.p1.x, wipSpline.p1.y, mouseX, mouseY);
  }

  if (state === 2 || state === 3) {
    // Show realtime spline preview (20 samples)
    const p0 = wipSpline.p0;
    const m0 = wipSpline.m0;
    const p1 = (state === 2) ? vec2(mouseX, mouseY) : wipSpline.p1;
    const m1 = (state === 2)
      ? sub2d(vec2(mouseX, mouseY), p1)
      : sub2d(vec2(mouseX, mouseY), wipSpline.p1);

    const tempSpline = new CubicHermite2D(p0, m0, p1, m1);

    previewBuffer.stroke(200, 200, 100);
    previewBuffer.beginShape();
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const p = tempSpline.GetPosition(t);
      previewBuffer.vertex(p.x, p.y);
    }
    previewBuffer.endShape();
  }

  previewBuffer.pop();
}
