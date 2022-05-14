import { avg, polar2cart, sizes, vec2 } from "./lumic/common.js";
import { circleSegment } from "./lumic/mandala.js";

const gridOptions = {
    rows: 8,
    cols: 8,
    margin: 10,
    debug: false,
    renderCell: null,
    scale: 1
};

function renderGrid(options) {
    const margin = options.margin || 0;
    const innerScale = options.scale || 1;
    const dx = (width - 2 * margin) / options.cols;
    const dy = (height - 2 * margin) / options.rows;

    const r = min (dx, dy);

    for (let i = 0;  i < options.rows; i++) {
        for (let j = 0; j < options.cols; j++) {
            const x =  margin + dx * (j + 0.5);
            const y = margin + dy * (i + 0.5);

            push();
            translate(x,y);
            scale(innerScale);

            if (options.debug) {
                rectMode(CENTER);
                noFill();
                stroke(255);
                circle (0,0,r);
                rect(0,0,dx,dy);
            }

            if (options.renderCell) {
                options.renderCell(i, j, options);
            }

            pop();
        }
    }
}

function renderCell(i, j, gridOptions) {
  
}

window.setup = function () {
  createCanvas(sizes.letter.w, sizes.letter.h, SVG);
  background(100);
  renderGrid({rows: 8, cols: 8, debug: true, margin: 20, scale: 0.8});
};

window.draw = function () {

};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }

  if (key === "r" || key === "R") {
    render();
  }
};
