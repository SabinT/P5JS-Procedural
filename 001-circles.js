import * as common from "./lumic/common.js";

const w = 2000;
const h = 2000;

const screenW = 800;
const screenH = 800;

let t1 = 16;
let t2 = 8;

let g;

let vec2 = function (a, b) {
  return new p5.Vector(a, b);
};

let bgColor = "#17260a";
let palette0 = ["#6336F6", "#2F35D4", "#4074EB", "#2F8CD4", "#36D5F6"];
let palette1 = ["#A7F636", "#CAD42F", "#EBDC3F", "#D4B52F", "#F6BF36"];
let palette2 = [
  "#40F6DEAA",
  "#37D492AA",
  "#4AEB7AAA",
  "#37D43AAA",
  "#7CF640AA",
];

let palette = palette2;

function bunchaSparks(n, lb, l, d, s = 1, stroke = null) {
  for (let i = 0; i < n; i++) {
    const a1 = -random() * TAU;
    const a2 = lb + random() * PI * l + a1;
    spark(random() * s * 1000, a1, a2, Math.floor(random() * 5), d, stroke);
  }
}

let spark = function (r, a, b, c, density = 1, stroke = null) {
  // Determine ideal step size
  // The radius is also "pixels per radian" along the arc
  const arcLength = r * Math.abs(a - b); // arc length in pixels
  const steps = arcLength * density;

  if (stroke) {
    g.stroke(stroke);
    g.strokeWeight(2);
  } else {
    g.noStroke();
  }

  g.fill(palette[c % palette.length]);
  common.arcSweepCircle(g, vec2(w / 2, h / 2), r, a, b, steps, t1);

  g.fill(palette[(c + 1) % palette.length]);
  common.arcSweepCircle(g, vec2(w / 2, h / 2), r, a, b, steps, t2);
};

window.setup = function () {
  g = createGraphics(w, h);
  createCanvas(screenW, screenH);

  g.drawingContext.shadowOffsetX = 2;
  g.drawingContext.shadowOffsetY = -2;
  g.drawingContext.shadowBlur = 10;
  g.drawingContext.shadowColor = "#142108";

  g.background(bgColor);

  drawBorderBox();

  let l = 0.1; // length (random, max)
  let lb = 0.6; // length (bias)
  let d = 1; // density

  t1 = 16;
  t2 = 12;
  l = 0.2;
  bunchaSparks(64, lb, l, d, 1.25);

  t1 = 64;
  t2 = 48;
  l = 0.6;
  bunchaSparks(10, lb, l, d, 1.5);

  drawBorderBox();

  t1 = 16;
  t2 = 8;
  l = 0.6;
  bunchaSparks(32, lb, l, d);

  drawBorderBox();

  t1 = 8;
  t2 = 4;
  l = 0.8;
  d = 0.5;
  bunchaSparks(128, lb, l, d, 1.75);

  palette = palette1;
  t1 = 10;
  t2 = 4;
  l = 0.6;
  d = 0.04;
  bunchaSparks(64, lb, l, d, 1, "#142108");

  image(g, 0, 0, screenW, screenH);
};

function drawBorderBox() {
  g.rectMode(RADIUS);
  g.noFill();
  g.stroke("#FFFFFFAA");
  g.strokeWeight(6);

  let r = 1000 - 40;
  g.rect(w / 2, h / 2, r, r);

  r = 1000 - 80;
  g.strokeWeight(4);
  g.rect(w / 2, h / 2, r, r);
}

/**
 * Draws a box with full zoom of a subsection of the graphics object
 * Example usage:
 *   `g = createGraphics(4000, 4000);`
 *   `...`
 *   `image(g, 0, 0, screenW, screenH);`
 *   `...`
 *   `if (mouseIsPressed) { drawFullZoomSection(g, 200); }`
 *
 * @param g object created with `createGraphics`
 * @param b bounds of the zoom box
 */
function drawFullZoomSection(g, b) {
  const h = Math.floor(b / 2);
  const dw = 2 * h + 1; // pixel extents of the box

  // Mouse pos in the hi-res buffer
  let cx = (mouseX / width) * g.width;
  let cy = (mouseY / height) * g.height;

  rectMode(CORNERS);

  // make sure zoom box is not transparent (could use a checker texture here too)
  fill(0);
  rect(mouseX - h, mouseY - h, mouseX + h, mouseY + h);

  // image(graphics, destTopleftx, destToplefty, destW, destH, srcTopLeftX, srcTopLeftY, srcW, srcH)
  image(g, mouseX - h, mouseY - h, dw, dw, cx - h, cy - h, dw, dw);

  noFill();
  stroke(255);
  strokeWeight(1);
  rect(mouseX - h, mouseY - h, mouseX + h, mouseY + h);
}

window.draw = function () {
  background(palette2[1]);
  image(g, 0, 0, screenW, screenH);

  if (mouseIsPressed) {
    // Draw a zoomed in view
    drawFullZoomSection(g, 200);
  }
};
