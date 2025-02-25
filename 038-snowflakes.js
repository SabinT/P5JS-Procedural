import { add2d, getRandom, lerp, lerp2d, line2D, normalize2d, polar2cart, rot2d, scale2d, sizes, vec2 } from "./lumic/common.js";
import { smoothstep } from "./lumic/easing.js";
import { renderGrid } from "./lumic/grids.js";
import { cCircle } from "./lumic/mandala.js";
import { radiatingDendrites, fernlikeStellarDendrites } from "./lumic/snowflake.js";

const gridOptions = {
  rows: 8,
  cols: 8,
  debug: false,
  margin: 20,
  scale: 0.8,
  renderCell: renderCell,
};

function renderCell(i, j, w, h, gridOptions) {
  fill("white");

  // Pick a random pattern
  let patterns = [fernlikeStellarDendrites, radiatingDendrites];
  let pattern = getRandom(patterns);

  pattern();
}

function render() {
  clear();
  renderGrid(gridOptions);
}

window.setup = function () {
  createCanvas(2160, 2160);
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

