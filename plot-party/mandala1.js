import { sizes, getRandom } from "../lumic/common.js";
import { renderGrid } from "../lumic/grids.js";
import * as m from "../lumic/mandala.js";
import * as e from "../lumic/p5Extensions.js"

const gridOptions = {
  rows: 9,
  cols: 12,
  margin: 10,
  debug: false,
  renderCell: null,
  scale: 1,
};

function renderMandala(i, j, w, h, gridOptions) {
  const odd = (i + j) % 2 === 0;

  const rMax = (min(w, h) - 10) / 2;
  const rMin = 5;
  m.resetMandalaContext();

  // Start from edge and work backwards
  m.addSpacer(rMax);
  m.setOverrides({ inverted: true, perimeter: false });

  noFill();
  stroke(200);

  m.addCircle();

  if (odd) {
    m.addSpacer(-5);
  }

  const counts = [8,8,6,6,3,3];
  let ringNum = 0;
  while (m.getCurrentRadius() > rMin) {
    let seg = m.getRandomSegment();
    if (seg === m.bezierSegment) {
        seg = m.diamondSegment;
    }

    // seg = getRandom([m.crissCrossPetalSegment, m.leafSegment, m.crossSegment]);

    let step = -10;

    if (seg === m.crissCrossPetalSegment || seg === m.crossSegment || seg === m.leafSegment) {
        step = -15;
    }

    if (m.getCurrentRadius() + step < rMin) {
        break;
    }

    const count = counts[min(ringNum++, counts.length - 1)];

    const skip = getRandom([0, 1]);

    const newOptions = {
      count: count,
      skip: random() < 0.5 ? skip : undefined,
      inverted: odd
    };

    m.addRing(seg, step, newOptions);

    if (random(1) < 0.5 && m.supportsRepeat.has(seg)) {
      // Small repeat chance
      m.addRing(seg, step, newOptions);
    }

    if (random() < 0.75) {
      // adding perimeter doesn't make sense for squareWaveSegment
      if (random(1) < 1 && seg !== m.squareWaveSegment) {
        m.addSpacer(-5, true, true);
      } else {
        m.addSpacer(-5, false, false);
      }
    }
  }
}

function render() {
  clear();
  renderGrid({
    rows: 12,
    cols: 9,
    debug: false,
    margin: 10,
    scale: 0.8,
    renderCell: renderMandala,
  });
}

window.setup = function () {
  createCanvas(sizes.nineTwelve.w, sizes.nineTwelve.h, SVG);
  render();
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
