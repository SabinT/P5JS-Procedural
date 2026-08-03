import { avg, getRandom, polar2cart, vec2 } from "./lumic/common.js";
import { greenTheme, cyberpunkTheme, getColor, getRandomColor } from "./lumic/palettes.js";
import * as m from "./lumic/mandala.js";

const w = 600;
const hw = w / 2;
const h = 600;
const hh = h / 2;

// All segments including those that need special options (e.g. textSegment).
const allSegments = [
  ...m.allSegments,
  m.textSegment,
];

// Per-segment option overrides required for correct rendering.
const segmentOptionOverrides = new Map([
  [m.textSegment,      { text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", fontSize: 0 }],
  [m.rippleSegment,    { ripples: 4 }],
  [m.thornSegment,     { thorns: 3 }],
  [m.gearToothSegment, {}],
  [m.arrowSegment,     {}],
  [m.bracketSegment,   {}],
  [m.zigzagSegment,    { steps: 6 }],
  [m.noiseSegment,     { steps: 8, amplitude: 0.5 }],
  [m.sparkSegment,     { sparks: 7 }],
  [m.rootSegment,      {}],
  [m.mazeTileSegment,  {}],
  [m.truchetSegment,   {}],
  [m.dotWaveSegment,   { dots: 14, dotSize: 4 }],
]);

const defaultOptions = {
  count: 24,
  hidePerimeter: true,
};

m.setOverrides({ hidePerimeter: true });

function render() {
  clear();
  m.resetMandalaContext();
  m.addSpacer(60);

  push();
  translate(hw, hh);

  stroke(200);
  noFill();

  if (random() < 0.5) {
    m.addCircle();
  }

  const rMax = w * 0.4;
  for (let i = 0; m.getCurrentRadius() < rMax; i++) {
    const step = 10 + random(30);
    const seg = getRandom(allSegments);

    // Merge any per-segment required options.
    const segOverrides = segmentOptionOverrides.get(seg) ?? {};

    const newOptions = {
      ...defaultOptions,
      ...segOverrides,
      invertSkip: true,
    };

    m.addRing(seg, step, newOptions);

    if (random(1) < 0.5 && m.supportsRepeat.has(seg)) {
      m.addRing(seg, step, newOptions);
    }

    noFill();

    if (random() < 0.5) {
      if (random(1) < 1 && seg !== m.squareWaveSegment) {
        m.addSpacer(5, true, true);
      } else {
        m.addSpacer(5, false, false);
      }
    }
  }

  if (random() < 0.5) {
    m.addCircle();
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
