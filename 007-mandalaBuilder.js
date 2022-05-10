import { avg, polar2cart, vec2 } from "./lumic/common.js";
import { greenTheme, getColor } from "./lumic/palettes.js";
import * as m from "./lumic/mandala.js";

const w = 600;
const hw = w / 2;
const h = 600;
const hh = h / 2;

let rCurrent = 10;

const defaultOptions = {
  count: 32,
  perimeter: false
};

function randomizeOptions(options) {
    return {
        ...options,
        flip: Math.random(1) < 0.5
    }
}

function addRing(ringFunc, rStep, options) {
  if (m.supportsInset.has(ringFunc) && random(1) < 0.5) {
    m.drawRing(rCurrent, rCurrent + rStep, ringFunc, {
      ...options,
      inset: 0.2,
    });
  }

  if (ringFunc === m.bezierSegment) {
      // Also repeat laterally
      m.drawRing(rCurrent, rCurrent + rStep, ringFunc, {...options, angleShiftFactor: 0.2 });
      m.drawRing(rCurrent, rCurrent + rStep, ringFunc, {...options, angleShiftFactor: -0.2 });
  }

  m.drawRing(rCurrent, rCurrent + rStep, ringFunc, options);

  rCurrent += rStep;
}

function addSpacer(rStep, start, end) {
  if (start) {
    m.cCircle(rCurrent);
  }

  rCurrent += rStep;

  if (end) {
    m.cCircle(rCurrent);
  }
}

function render() {
  push();
  translate(hw, hh);
  //   scale(0.9);

  stroke(200);
  noFill();

  const rMax = w * 0.4;
  for (let i = 0; rCurrent < rMax; i++) {
    const step = 10 + random(30);
    const seg = m.getRandomSegment();

    const baseMultiplier = Math.floor(random(3, 3));
    const count = Math.floor((3 * rCurrent) / rMax) * (baseMultiplier * 8);

    addRing(seg, step, { ...defaultOptions, count: count });

    if (random(1) < 0.5 && m.supportsRepeat.has(seg)) {
      // Small repeat chance
      addRing(seg, step, { ...defaultOptions, count: count });
    }

    addSpacer(5, true, true);
  }

  noFill();
  stroke(200);

  pop();
}

window.setup = function () {
  createCanvas(w, h, SVG);
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
