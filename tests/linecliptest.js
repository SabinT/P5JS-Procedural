import { clipLine } from "../lumic/cohensutherland.js";
import { vec2 } from "../lumic/common.js";

const w = 800;
const hw = w / 2;
const h = 800;
const hh = h / 2;

window.setup = function () {
  createCanvas(w, h, SVG);

  const boundsMin = vec2(100, 100);
  const boundsMax = vec2(700, 700);

  for (let i = 0; i < 1000; i++) {
    const a = vec2(random(0, width), random(0, height));
    const b = vec2(random(0, width), random(0, height));

    stroke(255);
    line(a.x, a.y, b.x, b.y);

    const clipped = clipLine(a, b, boundsMin, boundsMax);

    if (clipped) {
      stroke(255, 0, 0);
      const p = clipped[0];
      const q = clipped[1];
      line(p.x, p.y, q.x, q.y);
    }
  }
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
