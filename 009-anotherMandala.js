import { avg, getRandom, polar2cart, vec2 } from "./lumic/common.js";
import { greenTheme, cyberpunkTheme, getColor, getRandomColor } from "./lumic/palettes.js";
import * as m from "./lumic/mandala.js";

const w = 600;
const hw = w / 2;
const h = 600;
const hh = h / 2;


const defaultOptions = {
  count: 32,
  hidePerimeter: true,
};

m.setOverrides({ hidePerimeter: true });

function render() {
  clear();
  m.resetMandalaContext();
  m.addSpacer(60);

  push();
  translate(hw, hh);
  //   scale(0.9);

  stroke(200);
  noFill();

  if (random() < 0.5) {
    m.addCircle();
  }

  const rMax = w * 0.4;
  for (let i = 0; m.getCurrentRadius() < rMax; i++) {
    const step = 10 + random(30);
     const seg = m.getRandomSegment();
    //const seg = getRandom([m.bezierSegment, m.bezierSegment]);

    const baseMultiplier = Math.floor(random(3, 3));
    const count = Math.floor((3 * m.getCurrentRadius()) / rMax) * (baseMultiplier * 6);

    const skip = getRandom([0, 2]);

    const newOptions = {
      ...defaultOptions,
      count: 24,
      // skip: random() < 0.5 ? skip : undefined,
      invertSkip: true,
    };

    // fill(getRandomColor(cyberpunkTheme));

    m.addRing(seg, step, newOptions);

    if (random(1) < 0.5 && m.supportsRepeat.has(seg)) {
      // Small repeat chance
      m.addRing(seg, step, newOptions);
    }

    noFill();

    if (random() < 0.5) {
      // adding perimeter doesn't make sense for squareWaveSegment
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
