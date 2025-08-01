import { BezierCubic } from "./lumic/bezier.js";
import { vec2, lerp, normalize2d, add2d, line2D, mul2d, scale2d, lerp2d, sub2d, dist2d } from "./lumic/common.js";
import { easeInOutElastic, easeInOutQuad, easeInOutQuart, easeInQuad, easeOutQuad } from "./lumic/easing.js";
import { centerCanvas } from "./lumic/p5Extensions.js";

// Outline of the feather:
// Feather contains:
// - A spine (hermite spline - p0,m1,p1,m1)
// - Tendrils (on both sides)
//   - grouped into clumps
//   - some properties are randomized per clump (ic = clump index)
//   - some properties are graded per clump (tc = 0-1 along clump)
//   - some peroperties are graded per feather (tf = 0-1 along feather)

const w = 1920;
const hw = w / 2;
const h = 1080;
const hh = h / 2;

const debug = false;

let g;

function feather() {
  // Generate spint points
  const spine = [];
  const nSpine = 100;
  const lenSpine = 600;

  const spinePts = [];
  for (let i = 0; i < nSpine; i++) {
    let t = i / (nSpine - 1);
    // t = 1 - Math.sqrt(1 - t);
    // t = Math.sqrt(t);
    let xt = easeOutQuad(t);
    let yt = (Math.sin(xt * 7 + Math.PI * 2));
    // let yt = lerp(easeInOutQuart(t), easeInOutQuad(t), 0.85);

    let x = lerp(-lenSpine / 2, lenSpine / 2, xt);
    let y = yt * 15;

    if (debug) {
      stroke(255);
      strokeWeight(1);
      circle(x, y, 3);

      if (i % 2 === 0) {
        noStroke();
        fill(255)
        textSize(12);
        // 2 decimals
        text(`${yt.toFixed(2)}`, x + 5, y - 100);
      }
    }

    spinePts.push(vec2(x, y));
  }

  // Generate tangents and normals
  for (let i = 0; i < nSpine; i++) {
    let P = spinePts[i];
    let pNext = spinePts[i + 1] || P;
    let pPrev = spinePts[i - 1] || P;

    let T = vec2(pNext.x - pPrev.x, pNext.y - pPrev.y);
    T = normalize2d(T);
    let N = vec2(-T.y, T.x);

    spine.push({ P, T, N });

    if (debug) {
      stroke(255, 0, 0);
      line(P.x, P.y, P.x + T.x * 20, P.y + T.y * 20);
      stroke(0, 255, 0);
      line(P.x, P.y, P.x + N.x * 20, P.y + N.y * 20);
    }
  }

  // Generate boxes along spine on both sides
  const boxes = [];
  const boxWidth = 100;

  // Small chance that boxes may coalesce and become a bigger box
  const pBoxCollapse = 0.75;

  // Normal side
  for (let i = 0; i < nSpine - 1; i++) {
    const t = i / (nSpine - 1);
    const cur = spine[i];
    const next = spine[i + 1];

    const shouldCollapse = Math.random() < pBoxCollapse;

    if (shouldCollapse && i < nSpine - 2) {

      // Merge this box with the next and skip the next iteration
      const nextNext = spine[i + 2];
      boxes.push({
        A: cur.P,
        B: nextNext.P,
        C: add2d(nextNext.P, scale2d(nextNext.N, boxWidth)),
        D: add2d(cur.P, scale2d(cur.N, boxWidth)),
        t
      });

      i++; // Skip the next iteration
      continue;
    }

    // Normal side (A,B along T, C,D parallel to T)
    boxes.push({
      A: cur.P,
      B: next.P,
      C: add2d(next.P, scale2d(next.N, boxWidth)),
      D: add2d(cur.P, scale2d(cur.N, boxWidth)),
      t
    });
  }

  // Binormal side
  for (let i = 0; i < nSpine - 1; i++) {
    const t = i / (nSpine - 1);
    const cur = spine[i];
    const next = spine[i + 1];

    const shouldCollapse = Math.random() < pBoxCollapse;

    if (shouldCollapse && i < nSpine - 2) {
      // Merge this box with the next and skip the next iteration
      const nextNext = spine[i + 2];
      boxes.push({
        A: cur.P,
        B: nextNext.P,
        C: add2d(nextNext.P, scale2d(nextNext.N, -boxWidth)),
        D: add2d(cur.P, scale2d(cur.N, -boxWidth)),
        t
      });

      i++; // Skip the next iteration
      continue;
    }

    // Binormal side
    boxes.push({
      A: cur.P,
      B: next.P,
      C: add2d(next.P, scale2d(next.N, -boxWidth)),
      D: add2d(cur.P, scale2d(cur.N, -boxWidth)),
      t
    });
  }

  // Draw bezier shapes in each box
  // D---C
  // |   |
  // A---B
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    const t = box.t;
    const A = box.A;
    const B = box.B;
    const T = normalize2d(sub2d(box.B, box.A)); // tangent
    const xShift = 50 + t * 50;
    let C = lerp2d(box.C, B, t);
    let D = lerp2d(box.D, A, t);
    C = add2d(C, scale2d(T, xShift));
    D = add2d(D, scale2d(T, xShift));

    if (debug) {
      stroke("yellow");
      strokeWeight(1);
      line2D(A, B);
      line2D(B, C);
      line2D(C, D);
      line2D(D, A);

      if (i == 0) {
        // Label A,B,C,D
        noStroke();
        fill("white");
        textSize(16);
        text("A", A.x, A.y);
        text("B", B.x, B.y);
        text("C", C.x, C.y);
        text("D", D.x, D.y);
      }
    }

    // Control points
    const p0 = A;
    const p1 = lerp2d(A, D, 0.5);
    const p2 = lerp2d(D, C, 0.5);
    const p3 = C;

    const bezier = new BezierCubic(p0, p1, p2, p3, 100);
    if (true) {
      stroke("yellow");
      drawStrand(bezier);
      

      // Draw text for A,B,C,D
      textSize(12);
      fill(255);
      noStroke();
      // text("A", A.x, A.y);
      // text("B", B.x, B.y);
      // text("C", C.x, C.y);
      // text("D", D.x, D.y);      

    }

    // Shift the whole curve along tangent to repeat strands
    const nStrands = 25;
    const dist = dist2d(A, B);
    for (let j = 0; j < nStrands; j++) {
      const t = j / (nStrands - 1);
      const shift = dist * t;
      const p0 = add2d(A, scale2d(T, shift));
      const p1 = add2d(lerp2d(A, D, 0.5), scale2d(T, shift));
      const p2 = add2d(lerp2d(D, C, 0.5), scale2d(T, shift));
      const p3 = add2d(C, scale2d(T, shift));

      const bezier = new BezierCubic(p0, p1, p2, p3, 100);
      if (random() < 0.8) {
        stroke("yellow");
        // bezier.Draw();
        drawStrand(bezier);
      }
    }
  }
}

function controlNoise(v) {
  const s = 0.01; 
  const a = 20;
  const nx = noise(v.x * s, v.y * s) * (-a +  Math.random() * a);
  const ny = noise(v.x * s, v.y * s) * (-a +  Math.random() * a);
  return vec2(nx, ny);
}

function drawStrand(bezier) {
  // add noise to control points
  bezier.a = add2d(bezier.a, controlNoise(bezier.a));
  bezier.b = add2d(bezier.b, controlNoise(bezier.b));
  bezier.c = add2d(bezier.c, controlNoise(bezier.c));
  bezier.d = add2d(bezier.d, controlNoise(bezier.d));

  bezier.Build();
  stroke("#78edff4c");
  // bezier.Draw();

  const color1 = color("white");
  const color2 = color("brown");

  for (let i = 0; i < bezier.points.length - 1; i++) {
    const t = i / (bezier.points.length - 1);
    const p = bezier.points[i];
    noStroke();
    fill(lerpColor(color1, color2, easeInQuad(t)));
    circle(p.x, p.y, noise(p.x, p.y) * 1);
  }
}

function render(g) {
  translate(hw, hh);
  angleMode(DEGREES);
  scale(1.5);
  rotate(0);
  feather();
}

window.setup = function () {
  canvas = createCanvas(w, h);
  centerCanvas(canvas);
  pixelDensity(1);
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
