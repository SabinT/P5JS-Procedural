// Uses Xiaolin Wu's anti-aliased line algorithm
// https://en.wikipedia.org/wiki/Xiaolin_Wu%27s_line_algorithm
// https://dl.acm.org/doi/10.1145/127719.122734

import { vec2, line2D, lerp2d, PI } from "./lumic/common.js";
import { clamp01, easeInOutElastic, easeInOutQuad, easeInOutQuart, easeInQuad, easeOutQuad } from "./lumic/easing.js";
import { Polygon } from "./lumic/geomerty.js";

let size = 54; // Global variable for square size
let edgeDivisions = 2; 

window.setup = function() {
  pixelDensity(1.5);
  createCanvas(1080, 1080);
}

const loopTime = 10; // seconds
window.draw = function() {
  const secs = millis() / 1000;
  const loopFac = millis() / 1000 * TAU * 1 / loopTime;
  randomSeed(floor(loopFac / 10));
  
  
  background(255,255,255,20);
  strokeWeight(1);
  
  const rows = width / size;
  const cols = height / size;
  
  // draw dots in every cell as a grid
  stroke(color(200,200,200,20))
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      renderCell(i, j, random(0, 1.5));
    }
  }
  
  const loopParam = (4 * secs / loopTime) % 4;
  const loopInt = floor(loopParam);
  const loopFrac = loopParam - loopInt;

  const angle = loopInt * PI / 4 + easeInOutQuad(loopFrac) * PI / 4;

  stroke(0)
  drawLowResShape(rows, cols, rows * 0.4, 4, angle);
  // drawLowResShape(rows, cols, rows * 0.75, 4, PI * 0.25);
  drawLowResShape(rows, cols, rows * 0.2, 4, PI * 0.25 + angle);
  // drawLowResShape(rows, cols, rows * 0.1, 4, PI * 0.125);
}

function drawLowResShape(rows, cols, shapeRadius, shapeSides, rotation) {
  let shape = new Polygon(vec2(rows / 2, cols / 2), shapeRadius, shapeSides, rotation);
  const pts = shape.getPoints();

  // draw line between consecutive points
  for (let i = 0; i < pts.length; i++) {
    const iNext = (i + 1) % pts.length;
    drawLine(pts[i].x, pts[i].y, pts[iNext].x, pts[iNext].y);
  }
}

// If span = 0, nothing, if span = 1, full length
function renderFill45(size, divisions, shrink) {
    const hs = size / 2;
    const slantStep = size / divisions;

    // Assume center of cell is (0, 0)
    // Go up from bottom right
    let y = hs;
    let x = hs;
    for (let i = 0; i < divisions; i++) {
        let A = vec2(x, y);
        let B = vec2(y, x); // Reflect arond y=x

        // stroke("red");
        // line2D(A, B);

        ({ A, B } = MoveTowardsMid(A, B, shrink));

        // stroke("black")
        line2D(A, B);
        y -= slantStep;
    }

    // Go left from top right
    y = -hs;
    x = hs;
    for (let i = 0; i < divisions; i++) {
        let A = vec2(x, y);
        let B = vec2(y, x); // Reflect around y=x

        // stroke("red");
        // line2D(A, B);

        ({ A, B } = MoveTowardsMid(A, B, shrink));

        // stroke("black")
        line2D(A, B);
        x -= slantStep;
    }
}

function MoveTowardsMid(A, B, shrink) {
  let mid = lerp2d(A, B, 0.5);
  A = lerp2d(A, mid, shrink);
  B = lerp2d(B, mid, shrink);
  return { A, B };
}

function renderFill135(size, divisions, shrink) {
    // x-flipped version of renderFill45
    push();

    scale(-1, 1);
    renderFill45(size, divisions, shrink);

    pop();
}

function renderFillHorizontal(size, divisions, shrink) {
  const hs = size / 2;
  const step = size / divisions;

  // Assume center of cell is (0, 0)
  // Start from top and go down
  let y = -hs;
  for (let i = 0; i <= divisions; i++) {
      let A = vec2(-hs, y);
      let B = vec2(hs, y);

      // stroke("red")
      // line2D(A, B);

      ({ A, B } = MoveTowardsMid(A, B, shrink));

      // stroke("black")
      line2D(A, B);
      y += step;
  }
}

function renderFillVertical(size, divisions, shrink) {
  const hs = size / 2;
  const step = size / divisions;

  // Assume center of cell is (0, 0)
  // Start from left and go right
  let x = -hs;
  for (let i = 0; i <= divisions; i++) {
      let A = vec2(x, -hs);
      let B = vec2(x, hs);

      // stroke("red")
      // line2D(A, B);

      ({ A, B } = MoveTowardsMid(A, B, shrink));

      // stroke("black")
      line2D(A, B);
      x += step;
  }
}

function renderCell(x, y, c) {
  const divisions = edgeDivisions;

  let c5 = c * 5;
  let cn = floor(c5);

  const hs = size / 2;
  const cellCenter = vec2(x * size + hs, y * size + hs);
  push(); // Start a new drawing state
  translate(cellCenter.x, cellCenter.y); // Move to the correct position

  let shrink1 = (c5 - cn > 1) ? 0 : 1 - clamp01(c5 - 1);
  let shrink2 = (c5 - cn > 1) ? 0 : 1 - clamp01(c5 - 2);
  let shrink3 = (c5 - cn > 1) ? 0 : 1 - clamp01(c5 - 3);
  let shrink4 = (c5 - cn > 1) ? 0 : 1 - clamp01(c5 - 4);

  // if (shrink4 < 1) {
  //   // swap 3 and 4
  //   [shrink3, shrink4] = [shrink4, shrink3];
  // }

  // if (shrink3 < 1) {
  //   // swap 2 and 3
  //   [shrink2, shrink3] = [shrink3, shrink2];
  // }

  // if (shrink2 < 1) {
  //   // swap 1 and 2
  //   [shrink1, shrink2] = [shrink2, shrink1];
  // }
  
  if (cn >= 0) {
    if (shrink1 < 1) {
      renderFill45(size, divisions, shrink1);
    }
  } 

  if (cn > 0) {
    // const span = clamp01(c5 - cn);
    if (shrink2 < 1) {
      renderFill135(size, divisions, shrink2);
    }
  }

  if (cn > 1) {
    if (shrink3 < 1) {
      renderFillHorizontal(size, divisions, shrink3);
    }
  }

  if (cn > 2) {
    if (shrink4 < 1) {
      renderFillVertical(size, divisions, shrink4);
    }
  }

  pop(); // Restore the previous drawing state
}

function ipart(x) {
  return floor(x);
}

function fpart(x) {
  return x - ipart(x);
}

function rfpart(x) {
  return 1 - fpart(x);
}

function drawLine(x0, y0, x1, y1) {
  let steep = abs(y1 - y0) > abs(x1 - x0);
  if (steep) {
    [x0, y0] = [y0, x0];
    [x1, y1] = [y1, x1];
  }
  if (x0 > x1) {
    [x0, x1] = [x1, x0];
    [y0, y1] = [y1, y0];
  }
  let dx = x1 - x0;
  let dy = y1 - y0;
  let gradient = dx == 0 ? 1 : dy / dx;
  
  let xend = round(x0);
  let yend = y0 + gradient * (xend - x0);
  let xgap = rfpart(x0 + 0.5);
  let xpxl1 = xend;
  let ypxl1 = ipart(yend);
  if (steep) {
    renderCell(ypxl1, xpxl1, rfpart(yend) * xgap);
    renderCell(ypxl1 + 1, xpxl1, fpart(yend) * xgap);
  } else {
    renderCell(xpxl1, ypxl1, rfpart(yend) * xgap);
    renderCell(xpxl1, ypxl1 + 1, fpart(yend) * xgap);
  }
  let intery = yend + gradient;
  
  xend = round(x1);
  yend = y1 + gradient * (xend - x1);
  xgap = fpart(x1 + 0.5);
  let xpxl2 = xend;
  let ypxl2 = ipart(yend);
  if (steep) {
    renderCell(ypxl2, xpxl2, rfpart(yend) * xgap);
    renderCell(ypxl2 + 1, xpxl2, fpart(yend) * xgap);
  } else {
    renderCell(xpxl2, ypxl2, rfpart(yend) * xgap);
    renderCell(xpxl2, ypxl2 + 1, fpart(yend) * xgap);
  }

  if (steep) {
    for (let x = xpxl1 + 1; x <= xpxl2 - 1; x++) {
      renderCell(ipart(intery), x, rfpart(intery));
      renderCell(ipart(intery) + 1, x, fpart(intery));
      intery += gradient;
    }
  } else {
    for (let x = xpxl1 + 1; x <= xpxl2 - 1; x++) {
      renderCell(x, ipart(intery), rfpart(intery));
      renderCell(x, ipart(intery) + 1, fpart(intery));
      intery += gradient;
    }
  }
}
