import { polar2cart, lerp, vec2, sub2d, normalize2d, add2d, scale2d, rot2d, dot2d, lerp2d }from "./lumic/common.js";

const w = 900;
const hw = w / 2;
const h = 960;
const hh = h / 2;

let col = "#cc9a54";
let bgCol = "#cecece";

function drawFracturedCircle() {
  background(bgCol);

  // draw the circle in the center
  let radius = 300;
  let center = vec2(hw, hh);
  fill(col);
  noStroke();
  circle(center.x, center.y, radius * 2);

  let fracturesMinMax = [3, 17];
  let fractureWidthMinMaxDegrees = [2, 3];
  let fractureStepsMinMax = [4, 200];
  let treadMinMax = [5, 6];

  // Create a second "off center" close to the center
  let offset = polar2cart(vec2(radius * 0.5, Math.random() * Math.PI * 2));
  let offCenter = add2d(center, offset);

  let nFractures = Math.floor(lerp(fracturesMinMax[0], fracturesMinMax[1], Math.random()));

  fill (bgCol);

  for (let i = 0; i < nFractures; i++) {
    // center angle of fracture line that starts from the circumference
    let angle = Math.random() * Math.PI * 2;
    let angleSpread = lerp(fractureWidthMinMaxDegrees[0], fractureWidthMinMaxDegrees[1], Math.random()) * Math.PI / 180;

    let startAngle = angle - angleSpread / 2
    let endAngle =angle + angleSpread / 2

    // start from slightly outside
    let start = polar2cart(vec2(radius + 5, startAngle));
    let end = polar2cart(vec2(radius + 5, endAngle));

    let frac = { a: add2d(center, start), b: add2d(center, end) };

    let fracSteps = Math.floor(lerp(fractureStepsMinMax[0], fractureStepsMinMax[1], Math.random()));

    for (let j = 0; j < fracSteps; j++) {
      let tShrink = 0.5 * j / (fracSteps - 1);

      // Vector perpendicular to ab, the one that is generally pointing towards the center
      let normal1 = rot2d(sub2d(frac.b, frac.a), Math.PI / 2);
      let normal2 = rot2d(sub2d(frac.a, frac.b), Math.PI / 2);

      let towardsCenter = sub2d(offCenter, frac.a);
      let dot1 = dot2d(normal1, towardsCenter);
      let dot2 = dot2d(normal2, towardsCenter);

      let nextDir = dot1 > dot2 ? normal1 : normal2;
      nextDir = normalize2d(nextDir);

      // Tread a and b with different values
      let treadA = lerp(treadMinMax[0], treadMinMax[1], Math.random());
      let treadB = lerp(treadMinMax[0], treadMinMax[1], Math.random());

      frac.aPrev = frac.a;
      frac.bPrev = frac.b;

      let aNext = add2d(frac.a, scale2d(nextDir, treadA));
      let bNext = add2d(frac.b, scale2d(nextDir, treadB));

      // Shrink, bring a and b towards each other
      frac.a = lerp2d(aNext, bNext, tShrink);
      frac.b = lerp2d(bNext, aNext, tShrink);

      // Draw a quad shape between the previous and current points
      stroke(bgCol);
      strokeWeight(1.5);
      fill(bgCol);
      beginShape();
      vertex(frac.aPrev.x, frac.aPrev.y);
      vertex(frac.bPrev.x, frac.bPrev.y);
      vertex(frac.b.x, frac.b.y);
      vertex(frac.a.x, frac.a.y);
      endShape(CLOSE);
    }
  }

}

window.setup = function () {
  createCanvas(900, 960);

  drawFracturedCircle();
  noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }

  if (key === "r" || key === "R") {
    drawFracturedCircle();
  }
};
