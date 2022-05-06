import {
  greenTheme,
  cyberpunkTheme,
  getRandomColor,
} from "./lumic/palettes.js";
import * as m from "./lumic/mandala.js";
import { getRandom, GOLDEN_ANGLE_RADIANS, polar2cart, TAU } from "./lumic/common.js";

const w = 600;
const hw = w / 2;
const h = 600;
const hh = h / 2;

const debug = false;

let g;

const strokeColors = ["#E6007D", "#E6007D", "#BE00E1", "#007DE6"];
const fillColors = ["#0F284Baa", "#007DE699"];

function render(g) {
  push();
  translate(hw, hh);

  noFill();
  background(0);

  const randomizeStyle = () => {
    stroke(getRandom(strokeColors));
    fill(getRandom(fillColors));
  };

  function randomPolarLines() {
    return (s) => {
      const sc = m.segmentCenter(s);
      const c = polar2cart(sc);
      circle(c.x, c.y, 2 * (s.r2 - s.r1) * 0.08);

      stroke(45);
      const angle = (Math.floor(random(4)) * PI) / 2;
      m.polarLine(random(800), angle, sc.x, sc.y, 32);
      m.polarLine(random(800), angle + PI / 2, sc.x, sc.y, 32);
      m.polarLine(random(800), angle + PI, sc.x, sc.y, 32);
      m.polarLine(random(800), angle + (3 * PI) / 2, sc.x, sc.y, 32);
    };
  }

  const baseOptions = {
    count: 32,
    shape: true,
  };

  for (let i = 0; i < 4; i++) {
    const seg = getRandom([m.boxSegment, m.diamondSegment]);
    stroke(50);
    m.drawRing(i * 20, (i + 1) * 20, seg, {
      ...baseOptions,
      count: 8,
      onAfterSegment: randomPolarLines(),
    });
  }

  const divisions = 8;
  const mWidth = width * 0.8;
  const angleRange = 1.75;
//   const angleRange = GOLDEN_ANGLE_RADIANS / TAU;
  const rStep = mWidth / (2 * divisions);
  const spiralFactor = 2;
  const r1 = 20;
  const r2 = r1 * spiralFactor;
  for (let i = 0; i < divisions; i++) {
    randomizeStyle();
    m.drawRing(r1, r2, m.getRandomSegment(), {
      ...baseOptions,
      angleStart: i * angleRange * TAU,
      angleRange: angleRange * TAU,
      onBeforeSegment: (s) => {
        s.r1 += spiralFactor * (rStep * s.a1) / (angleRange * TAU);
        s.r2 += spiralFactor * (rStep * s.a2) / (angleRange * TAU);
      },
    });
  }

  pop();
}

window.setup = function () {
  createCanvas(w, h, SVG);
  render(g);
};

window.draw = function () {
  //render(g);
  //noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }

  if (key === "r" || key === "R") {
    render(g);
  }
};
