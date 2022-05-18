import { sizes } from "./lumic/common.js";
import { renderGrid } from "./lumic/grids.js";

const gridOptions = {
  rows: 8,
  cols: 8,
  margin: 10,
  debug: false,
  renderCell: null,
  scale: 1,
};

function renderCell(i, j, w, h, gridOptions) {
  fill("orange");
  circle(0, 0, 10);
}

function render() {
  clear();
  renderGrid({
    rows: 8,
    cols: 8,
    debug: true,
    margin: 20,
    scale: 0.8,
    renderCell: renderCell,
  });
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
