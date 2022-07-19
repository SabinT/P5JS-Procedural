import { drawPageBorder } from "./lumic/borders.js";
import { sizes, vec2 } from "./lumic/common.js";
import { Circle, Line } from "./lumic/geomerty.js";
import * as m from "./lumic/mandala.js";
import { easeInOutQuad, easeInOutQuart } from "./lumic/easing.js";

const pageMargin = 10;

let lines = [];

const mandalaSegments = [
  m.diamondSegment,
  // m.squareWaveSegment,
  m.circleSegment,
  // m.crissCrossPetalSegment,
  m.leafSegment,
  m.bezierSegment,
  m.boxSegment,
  m.crossSegment,
];

const mandala1 = {
  rMin: 200,
  rMax: 320,
  count: 64,
};

const mandala2 = {
  rMin: 0,
  rMax: 150,
  count: 64,
};

let circOuter1 = new Circle(vec2(0, 0), mandala1.rMax);
let circInner1 = new Circle(vec2(0, 0), mandala1.rMin);

let circOuter2 = new Circle(vec2(0, 0), mandala2.rMax);
let circInner2 = new Circle(vec2(0, 0), mandala2.rMin);

window.setup = function () {
  createCanvas(sizes.letter.w, sizes.letter.h, SVG);
  pixelDensity(1);

  let origLines = [];
  // Vertical lines
  {
    const y1 = -height / 2 + pageMargin;
    const y2 = height / 2 - pageMargin;
    const divisions = 110 / 2;
    for (let i = 0; i <= divisions; i++) {
      let t = i / divisions;
      t = easeInOutQuart(t);
      const x = map(t, 0, 1, -width / 2 + pageMargin, width / 2 - pageMargin);

      const line = new Line(vec2(x, y1), vec2(x, y2));
      origLines.push(line);
    }
  }

  // Clip against big circle (outside)
  origLines.forEach((line) => {
    const clipResult = circOuter1.clipLine(line, false);
    if (clipResult && clipResult.length > 0) {
      lines = lines.concat(clipResult);
    }
  });

  let tempLines = [];
  origLines.forEach((line) => {
    const clipResult = circInner1.clipLine(line, true);
    if (clipResult && clipResult.length > 0) {
      tempLines = tempLines.concat(clipResult);
    }
  });

  tempLines.forEach((line) => {
    const clipResult = circOuter2.clipLine(line, false);
    if (clipResult && clipResult.length > 0) {
      lines = lines.concat(clipResult);
    }
  });
};

function render() {
  noFill();
  stroke(255);

  circOuter1.draw();
  circInner1.draw();
  circOuter2.draw();
  circInner2.draw();

  lines.forEach((line) => {
    line.draw();
  });

  m.setOverrides({perimeter: true});
  m.drawRandomMandala(mandalaSegments, mandala1.rMin + 5, mandala1.rMax - 5, 20, [64]);

  m.drawRandomMandala(mandalaSegments, mandala2.rMin + 5, mandala2.rMax - 5, 20, [32]);

  drawPageBorder(pageMargin);
}

window.draw = function () {
  background(10);
  translate(width / 2, height / 2);
  render();
  noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }

  if (key === "r") {
    // Reload page
    window.location.reload();
  }
};
