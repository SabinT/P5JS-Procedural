import { sizes } from "./lumic/common.js";
import { renderGrid } from "./lumic/grids.js";
import { butterfly, hypotrochoid } from "./lumic/parametric.js";

const gridOptions = {
  rows: 2,
  cols: 2,
  margin: 10,
  debug: false,
  renderCell: renderCell,
  scale: 1,
  innerScale : 50
};

function renderCell(i, j, w, h, gridOptions) {
  const cell = i + j * gridOptions.cols;

  stroke("orange");
  noFill();
  
  push();
  scale(gridOptions.innerScale);

  beginShape();
  
  let tStart = 0;
  let tEnd = 100;
  let tStep = 0.01;
  
  var f;

  if (cell == 0) {
    f = butterfly;
  } else {
    const R = 3;
    const r = Math.floor(random(1, 15)) / 13;
    const d = Math.floor(random(1, 15)) / 13;

    tEnd = 100;
    tStep = 0.01;
    f = function(t) {
      return hypotrochoid(R,r,d,t);
    }
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
  clear();
  renderGrid(gridOptions);
}

window.setup = function () {
  createCanvas(sizes.letter.w, sizes.letter.h, SVG);
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
