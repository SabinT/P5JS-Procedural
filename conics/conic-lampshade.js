import { DEG2RAD, RAD2DEG, TAU, avg, cart2Polar, dist2d, getRandom, lerp, line2D, normalize2d, polar2cart, scale2d, vec2 } from "../lumic/common.js";
import { greenTheme, cyberpunkTheme, getColor } from "../lumic/palettes.js";
import { angleNormPi, angleNormTau } from "../lumic/geomerty.js";
import * as m from "../lumic/mandala.js";
import { createSliderBox } from "../lumic/p5Extensions.js";
import { conicToPolar2d, distToAnnularSector } from "../lumic/conic.js";

const theme = cyberpunkTheme;

const ppi = 200;
let R1Inches = 3;
let R2Inches = 1.5;

let R1 = 3 * ppi;
let R2 = 1.5 * ppi;
const s = 2 * ppi;
const { r1, r2, theta } = conicToPolar2d(R1, R2, s);


// Choose width and height to fit the whole thing
const wi = 8;
const hi = wi;

const debug = false;

let g;

function createUI() {
  createSliderBox(1, 10, R1Inches, 0, "R1", (v) => { R1Inches = v; R1 = v * ppi; }, 10, 10, 200, 50);
  createSliderBox(1, 10, R2Inches, 0, "R2", (v) => { R2Inches = v; R2 = v * ppi; }, 10, 70, 200, 50);
}

function render(g) {
  push();
  translate(hw, hh);
  scale(0.9);

  noStroke();
  fill(255);

  m.setCurrentRadius(20);

  const rings = 3;
  const rStep = 20;
  const count = 16;
  const inset = 0.0;

  //   for (let i = 0; i < rings; i++) {
  //     m.addRing(m.diamondSegment, rStep, {
  //       count: count,
  //       inset: inset,
  //       shape: true,
  //     });
  //   }

  pop();
}



window.setup = function () {
  createUI();
  
  console.log(`w: ${wi}, h: ${hi}`)
  
  createCanvas(wi * ppi, hi * ppi);
  // pixelDensity(1);
  
  g = createGraphics(wi * ppi, hi * ppi);
  // g.pixelDensity(4);

  background(0);

  stroke(255);
  fill(255);

  if (debug) {
    text(`R1: ${R1/ppi}, R2: ${R2/ppi}, s: ${s/ppi}`, 10, 10);
  }


  if (debug) {
    text(`r1: ${r1/ppi}, r2: ${r2/ppi}, θ: ${theta.toFixed(4)}`, 10, 30);
  }

  let debugLines = [];
  let cutLines = [];
  // Draw polar-space subdivisions

  const nR = 4;
  const nTheta = 10;

  for (let i = 0; i <= nR; i++) {
    const t = i / nR;
    const r = lerp(r1, r2, t);
    debugLines.push({ r1: r, theta1: 0, r2: r, theta2: theta });

    // It's a cut line if at the extremes
    if (i === 0 || i === nR) {
      cutLines.push({ r1: r, theta1: 0, r2: r, theta2: theta });
    }
  }

  for (let i = 0; i <= nTheta; i++) {
    const t = i / nTheta;
    const th = t * theta;
    debugLines.push({ r1: r1, theta1: th, r2: r2, theta2: th });

    // It's a cut line if at the extremes
    if (i === 0 || i === nTheta) {
      cutLines.push({ r1: r1, theta1: th, r2: r2, theta2: th });
    }
  }

  // Add "wings" to the sides
  // The wings are like interlocking extruded segments,
  // alternating between inside and outside
  const nWings = 5;

  // Start-side wings
  // let prevPoint;
  // let thetaOffset = 5 * DEG2RAD;
  // const dr = (r2 - r1);
  // for (let i = 0; i < nWings; i++) {
  //   const t = i / nWings;
  //   const tNext = (i + 1) / nWings;
  //   const pushDir = i % 2 === 0 ? 1 : -1;
  //   const r = lerp(r1, r2, t);
  //   const rNext = lerp(r1, r2, tNext);
  //   const th = pushDir * thetaOffset;

  //   if (prevPoint) {
  //     cutLines.push({ r1: prevPoint.r, theta1: prevPoint.theta, r2: r, theta2: th });
  //   }

  //   cutLines.push({ r1: r, theta1: th, r2: rNext, theta2: th });

  //   prevPoint = { r: rNext, theta: th };
  // }

  // // End-side wings
  // prevPoint = undefined;

  // for (let i = 0; i < nWings; i++) {
  //   const t = i / nWings;
  //   const tNext = (i + 1) / nWings;
  //   const pushDir = i % 2 === 0 ? 1 : -1;
  //   const r = lerp(r1, r2, t);
  //   const rNext = lerp(r1, r2, tNext);
  //   const th = theta + pushDir * thetaOffset;

  //   if (prevPoint) {
  //     cutLines.push({ r1: prevPoint.r, theta1: prevPoint.theta, r2: r, theta2: th });
  //   }
  //   else {
  //     cutLines.push({ r1: r1, theta1: theta, r2: r, theta2: th });
  //   }

  //   cutLines.push({ r1: r, theta1: th, r2: rNext, theta2: th });

  //   prevPoint = { r: rNext, theta: th };
  // }

  // // Join back to the actual end point
  // cutLines.push({ r1: prevPoint.r, theta1: prevPoint.theta, r2: r2, theta2: theta });

  // Pack some circles inside the annular sector
  const nCircles = 100;
  const circles = [];
  const maxIterations = 1000;
  const minR = 0.1 * ppi;
  const maxR = abs(r1 - r2) * 0.2;
  const margin = 0.1 * ppi;
  let iterations = 0;

  while (circles.length < nCircles && iterations < maxIterations) {
    iterations++;

    // Sample a random point (polar) in the annular sector
    const r = lerp(r1, r2, Math.random());
    const angle = Math.random() * theta;
    const p = vec2(r, angle);

    // Distance from the annular sector?
    let d = distToAnnularSector(p, r1, r2, theta);
    // d = Math.max(d, margin);
    d = Math.min(d, maxR);

    // Check if inside any other circle
    let rejectNewCircle = false;
    for (let i = 0; i < circles.length; i++) {
      const c = circles[i];
      const dist = dist2d(polar2cart(p), c.center);
      
      // Is center inside existing circle?
      if (dist < c.r) {
        rejectNewCircle = true;
        break;
      }

      // Is the new circle overlapping with the existing one?
      const distFromCircumference = dist - c.r;
      d = Math.min(d, distFromCircumference);

      // d = Math.min(d, distFromCircumference);

      if (d < minR) {
        rejectNewCircle = true;
        break;
      }

      if (dist < d + c.r) {
        rejectNewCircle = true;
        break;
      }
    }

    if (rejectNewCircle) {
      continue;
    }

    // Add the circle
    d = Math.max(d - margin, minR * 0.25);
    circles.push({center: polar2cart(p), r: d});
  }
  
  push();
  translate(width / 2, height / 2);

  stroke(120)
  noFill();
  
  // Draw full debug circles at r1 and r2
  circle(0, 0, 2 * r1);
  circle(0, 0, 2 * r2);

  // Draw debug lines for edges of the annular sector, center to end of canvas
  let vLineEnd1 = polar2cart(vec2(r1, 0));
  vLineEnd1 = scale2d(normalize2d(vLineEnd1), width / 2);
  line(0, 0, vLineEnd1.x, vLineEnd1.y);

  let vLineEnd2 = polar2cart(vec2(r2, theta));
  vLineEnd2 = scale2d(normalize2d(vLineEnd2), width / 2);
  line(0, 0, vLineEnd2.x, vLineEnd2.y);

  

  // Debug lines
  for (let i = 0; i < debugLines.length; i++) {
    const p = debugLines[i];
    m.polarLine(p.r1, p.theta1, p.r2, p.theta2, 64);
  }

  
  // Draw the cut lines
  stroke("white");

  for (let i = 0; i < cutLines.length; i++) {
    const p = cutLines[i];
    m.polarLine(p.r1, p.theta1, p.r2, p.theta2, 64);
  }

  // Draw the circles
  for (let i = 0; i < circles.length; i++) {
    // Random color from palette
    const col = getRandom(theme.colors)
    stroke(col);
    fill(col);

    const c = circles[i];
    ellipse(c.center.x, c.center.y, 2 * c.r);
  }

  pop();

  // Copy canvas to g
  g.background(0);
  g.image(get(), 0, 0);
};

window.draw = function () {
  image(g, 0, 0);
  

  push();
  translate(width / 2, height / 2);

  const vMouseCart = vec2(mouseX - width / 2, mouseY - height / 2);
  const vMousePolar = cart2Polar(vMouseCart);

  
  const r = distToAnnularSector(vMousePolar, r1, r2, theta, /* debug */ true);
  
  noFill();
  stroke("#ffeb51");
  strokeWeight(2);
  line2D(vec2(0, 0), vMouseCart);
  circle(vMouseCart.x, vMouseCart.y, 2 * r);
  
  strokeWeight(0);
  fill("white")
  textAlign(CENTER, BOTTOM);
  textSize(24);
  text(`${r.toFixed(2)}`, vMouseCart.x, vMouseCart.y - r - 10);
  text(`${(angleNormPi(vMousePolar.y) * RAD2DEG).toFixed(2)}\u00B0`, vMouseCart.x, vMouseCart.y - r - 35);
  text(`${(angleNormTau(vMousePolar.y) * RAD2DEG).toFixed(2)}\u00B0`, vMouseCart.x, vMouseCart.y - r - 60);

  pop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
