import { drawPageBorder } from "./lumic/borders.js";
import { DEG2RAD, GOLDEN_ANGLE_DEGREES, GOLDEN_ANGLE_RADIANS, sizes, vec2 } from "./lumic/common.js";
import { addClipShape, Circle, clipLines, Polygon } from "./lumic/geomerty.js";

let lines = [];
let circ = new Circle(vec2(0, 0), 400);

addClipShape(circ, true);

window.setup = function () {
  createCanvas(800, 800, SVG);
  pixelDensity(1);

  const polySide = 3;
  const lineCount = 32;
  const rStart = 10;
  const rEnd = 800;
  const twist = GOLDEN_ANGLE_RADIANS * 0.5;
  const angleStep = twist / lineCount;

  {
    // Create lines for regular polygon
    let angle = 0;
    for (let i = 0; i < lineCount; i++) {
      let t = i / lineCount;
      let r = map(t, 0, 1, rStart, rEnd);
      const poly = new Polygon(vec2(0, 0), r, polySide, angle);
      lines = lines.concat(poly.getLines());
      angle += angleStep;
    }
  }

  // Clip lines
  lines = clipLines(lines);
};

function render() {
  noFill();
  stroke(255);

  circ.draw();

  lines.forEach((line) => {
    line.draw();
  });
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
