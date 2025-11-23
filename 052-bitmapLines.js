// Uses Xiaolin Wu's anti-aliased line algorithm
// https://en.wikipedia.org/wiki/Xiaolin_Wu%27s_line_algorithm
// https://dl.acm.org/doi/10.1145/127719.122734

import { vec2, line2D, lerp2d, PI } from "./lumic/common.js";
import { clamp01, easeInOutElastic, easeInOutQuad, easeInOutQuart, easeInQuad, easeOutQuad } from "./lumic/easing.js";
import { Polygon } from "./lumic/geomerty.js";
import { SVGDrawing } from "./lumic/svg.js";

let size = 10; // Global variable for square size
let edgeDivisions = 1; 

let img;
let svg = new SVGDrawing(/* widthMM */ 100, /* heightMM */ 100);

window.preload = function() {
  img = loadImage('../052-artcode80x80-shadow.png');
}

window.setup = function() {
    pixelDensity(1.5);

    // Read all pixels from the image
    img.loadPixels();

    // Get image width and height
    const imgWidth = img.width;
    const imgHeight = img.height;

    // Canvas size = image size * cell size
    createCanvas(imgWidth * size, imgHeight * size, SVG);
    background(255);
    stroke(0);
    strokeWeight(1);

    // Draw the grid based on image pixels
    for (let x = 0; x < imgWidth; x++) {
        for (let y = 0; y < imgHeight; y++) {
            // Get the color of the pixel at (x, y)
            const index = (x + y * imgWidth) * 4;
            const r = img.pixels[index];
            const g = img.pixels[index + 1];
            const b = img.pixels[index + 2];
            const brightness = (r + g + b) / 3; // Simple brightness calculation
            const c = 1 - map(brightness, 0, 255, 0, 1); // Map brightness to c value

            // Render the cell at (x, y) with the calculated c value
            renderCell(x, y, c);
        }
    }

    // svg.save('bitmapLines.svg');

    save('bitmapLines.svg');

    noLoop();
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
        // addToSvgLine2D(A, B);

        ({ A, B } = MoveTowardsMid(A, B, shrink));

        // stroke("black")
        addToSvgLine2D(A, B);
        y -= slantStep;
    }

    // Go left from top right
    y = -hs;
    x = hs;
    for (let i = 0; i < divisions; i++) {
        let A = vec2(x, y);
        let B = vec2(y, x); // Reflect around y=x

        // stroke("red");
        // addToSvgLine2D(A, B);

        ({ A, B } = MoveTowardsMid(A, B, shrink));

        // stroke("black")
        addToSvgLine2D(A, B);
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
      // addToSvgLine2D(A, B);

      ({ A, B } = MoveTowardsMid(A, B, shrink));

      // stroke("black")
      addToSvgLine2D(A, B);
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
      // addToSvgLine2D(A, B);

      ({ A, B } = MoveTowardsMid(A, B, shrink));

      // stroke("black")
      addToSvgLine2D(A, B);
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

const svgLines = [];
function addToSvgLine2D(lineStart, lineEnd) {
    // Use vpype for optimization / dedupe / etc
    // svg.addPath([lineStart, lineEnd]);

    // Also show a preview in canvas
    line2D(lineStart, lineEnd);
}