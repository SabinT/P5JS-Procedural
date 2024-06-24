import { BezierCubic } from "./lumic/bezier.js";
import { vec2, lerp, normalize2d, add2d, line2D, mul2d, scale2d, lerp2d, sub2d, dist2d } from "./lumic/common.js";
import { easeInOutElastic, easeInOutQuad, easeInOutQuart, easeOutQuad } from "./lumic/easing.js";

const w = 1080;
const hw = w / 2;
const h = 1080;
const hh = h / 2;

const debug = false;

let g;

function feather() {
  // Generate spint points
  const spine = [];
  const nSpine = 30;
  const lenSpine = 600;

  const spinePts = [];
  for (let i = 0; i < nSpine; i++) {
    let t = i / (nSpine - 1);
    // t = 1 - Math.sqrt(1 - t);
    // t = Math.sqrt(t);
    let xt = easeOutQuad(t);
    let yt = lerp(easeInOutQuart(t), easeInOutQuad(t), 0.85);

    let x = lerp(-lenSpine / 2, lenSpine / 2, xt);
    let y = lerp(1, -1, yt) * 50; // bend it later

    if (debug) {
      stroke(255);
      strokeWeight(1);
      circle(x, y, 3);
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
  for (let i = 0; i < nSpine - 1; i++) {
    const t = i / (nSpine - 1);
    const cur = spine[i];
    const next = spine[i + 1];

    // Normal side (A,B along T, C,D parallel to T)
    boxes.push({
      A: cur.P,
      B: next.P,
      C: add2d(next.P, scale2d(next.N, boxWidth)),
      D: add2d(cur.P, scale2d(cur.N, boxWidth)),
      t
    });

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
      stroke(50);
      strokeWeight(1);
      line2D(A, B);
      line2D(B, C);
      line2D(C, D);
      line2D(D, A);
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
    const nStrands = 20;
    const dist = dist2d(A, B);
    for (let j = 0; j < nStrands; j++) {
      const t = j / (nStrands - 1);
      const shift = dist * t;
      const p0 = add2d(A, scale2d(T, shift));
      const p1 = add2d(lerp2d(A, D, 0.5), scale2d(T, shift));
      const p2 = add2d(lerp2d(D, C, 0.5), scale2d(T, shift));
      const p3 = add2d(C, scale2d(T, shift));

      const bezier = new BezierCubic(p0, p1, p2, p3, 100);
      if (true) {
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

  for (let i = 0; i < bezier.points.length - 1; i++) {
    const t = i / (bezier.points.length - 1);
    const p = bezier.points[i];
    noStroke();
    fill("#78edff69");
    circle(p.x, p.y, noise(p.x, p.y) * 1);
  }
}

function render(g) {
  translate(hw, hh);
  angleMode(DEGREES);
  scale(1.5);
  rotate(-110);
  feather();
}

window.setup = function () {
  createCanvas(w, h);
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
