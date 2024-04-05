import { getRandom, sizes, vec2 } from "./lumic/common.js";
import { Polygon } from "./lumic/geomerty.js";
import { renderGrid } from "./lumic/grids.js";
import { butterfly, hypotrochoid } from "./lumic/parametric.js";
import * as pal from "./lumic/palettes.js";
import { drawPageBorder } from "./lumic/borders.js";

const gridOptions = {
  rows: 12,
  cols: 9,
  margin: 0,
  debug: false,
  renderCell: renderCell,
  scale: 0.5,
  innerScale: 18,
};

function renderCell(i, j, w, h, gridOptions) {
  const cell = i + j * gridOptions.cols;

  stroke("#9e9e9e");
  noFill();

  push();
  scale(gridOptions.innerScale);

  strokeWeight(0.2);

  beginShape();

  let tStart = 0;
  let tEnd = 10;
  let tStep = 0.1;

  var f;

  if (cell < 10) {
    f = butterfly;
  } else {
    const R = 3;
    const r = Math.floor(random(9, 15)) / random(9, 15);
    const d = Math.floor(random(7, 20)) / random(10, 12);

    tEnd = 20;
    tStep = 0.01;
    f = function (t) {
      return hypotrochoid(R, r, d, t);
    };
  }

  if (f) {
    for (let t = tStart; t < tEnd; t += tStep) {
      const p = f(t);
      vertex(p.x, p.y);
    }
  }

  endShape();

  pop();
}

function render() {
  // clear();
  background("#181818");

  // Random rectangales of the same aspect ratio, varying sizes, varying brightness
  const aspectRatio = width / height;

  for (let i = 0; i < 250; i++) {
    const w = random(0.1, 0.5) * width * 0.4;
    const h = w / aspectRatio;

    const x = random(0, width);
    const y = random(0, height);

    // const c = color(random(0, 255));
    // const c = color(getRandom(pal.cyberpunkTheme.colors));
    const c = color(pal.cyberpunkTheme.colors[2]);
    c.setAlpha(random(0, 10));

    fill(c);
    noStroke();
    // rect(x, y, w, h);

    const p = new Polygon(vec2(x, y), w, random(3, 7), random(0, TWO_PI));
    // p.draw();
  }

  renderGrid(gridOptions);

  stroke("#9e9e9e");
  strokeWeight(2);
  translate(width / 2, height / 2);
//   drawPageBorder(width * 0.99);
}

window.setup = function () {
  createCanvas(900, 1200, SVG);
  pixelDensity(1);
  render();
};

window.draw = function () {};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }

  if (key === "r" || key === "R") {
    render();
  }
};
