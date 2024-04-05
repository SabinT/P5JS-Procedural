import { vec2 } from "../lumic/common.js";

const w = 800;
const hw = w / 2;
const h = 800;
const hh = h / 2;

let g;

// Parametric eqn for a superellipse https://en.wikipedia.org/wiki/Superellipse
// n = 2 is a circle (or ordinary ellipse), lower = concave, higher = convex
function superellipse(a, b, n, t) {
    const x = Math.pow(Math.abs(Math.cos(t)), 2 / n) * a * Math.sign(Math.cos(t));
    const y = Math.pow(Math.abs(Math.sin(t)), 2 / n) * b * Math.sign(Math.sin(t));

    return vec2(x, y);
}


window.setup = function () {
    background(10);

    createCanvas(w, h, SVG);

    stroke(255);
    fill(255);

    const margin = 10;
    const nRows = 30;
    const nCols = 30;
    const dx = (width - margin * 2) / nCols;
    const dy = (height - margin * 2) / nRows;

    const rMin = 10;
    const rMax = 5;

    const nMin = 0.2;
    const nMax = 4;

    for (let rows = 0; rows < nRows; rows++) {
        for (let cols = 0; cols < nCols; cols++) {
            const cx = margin + cols * dx + dx / 2;
            const cy = margin + rows * dy + dy / 2;

            const r = map(rows, 0, nRows - 1, rMin, rMax);
            const n = map(cols, 0, nCols - 1, nMin, nMax);

            beginShape();
            for (let t = 0; t < TWO_PI; t += 0.1) {
                const p = superellipse(r, r, n, t);
                vertex(cx + p.x, cy + p.y);
            }
            endShape(CLOSE);
        }
    }

};


window.keyTyped = function () {
    if (key === "s") {
        save();
    }
};
