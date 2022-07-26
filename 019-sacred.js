import {
  avg,
  polar2cart,
  vec2,
  TAU,
  GOLDEN_ANGLE_RADIANS,
  DEG2RAD,
  line2D,
} from "./lumic/common.js";
import { greenTheme, getColor } from "./lumic/palettes.js";
import * as m from "./lumic/mandala.js";
import { defaultLeafOptions, drawLeafShape } from "./lumic/leaf.js";
import {
  addClipShape,
  Circle,
  clearClipShapes,
  Polygon,
} from "./lumic/geomerty.js";

const w = 800;
const hw = w / 2;
const h = 800;
const hh = h / 2;

const debug = false;

let g;

function render(pattern) {
  clear();
  clearClipShapes();
  m.setOverrides({ perimeter: true, shape: true });

  push();
  translate(hw, hh);

  noFill();
  stroke(255);

  pattern();

  pop();
}

window.setup = function () {
  createCanvas(w, h, SVG);
};

const defaultPattern = hexPatternMandalas;

window.draw = function () {
  render(defaultPattern);
  noLoop();
};

window.keyTyped = function () {
  switch (key) {
    case "1":
      render(hexPattern1);
      break;

    case "2":
      render(hexPattern2);
      break;

    case "3":
      render(hexPattern3);
      break;

    case "4":
      render(hexPatternMandalas);
      break;

    case "s":
      save();
      break;

    case "r":
      window.location.reload();
      break;
  }
};

function hexPattern1() {
  m.drawRing(0, 96, m.circleSegment, { count: 6 });
  m.drawRing(144, 144, m.circleSegment, { count: 6, diameter: 50 });
  m.cCircle(144);
  new Polygon(vec2(0, 0), 144, 3, 30 * DEG2RAD).draw();
  new Polygon(vec2(0, 0), 144, 3, 90 * DEG2RAD).draw();

  const hex1 = new Polygon(vec2(0, 0), 250, 6, 30 * DEG2RAD);
  hex1.draw();
  hex1.drawInscribedCircle();
  new Polygon(vec2(0, 0), 250, 3).draw();
  new Polygon(vec2(0, 0), 250, 3, PI).draw();

  m.cCircle(300);
}

function hexPattern2() {
  push();
  m.cCircle(50);
  m.drawRing(100, 100, m.circleSegment, { count: 6, diameter: 100 });
  m.drawRing(200, 200, m.circleSegment, { count: 6, diameter: 100 });
  new Polygon(vec2(0, 0), 200, 6).draw();
  new Polygon(vec2(0, 0), 100, 6).draw();

  line2D(vec2(-200, 0), vec2(200, 0));
  rotate(60 * DEG2RAD);
  line2D(vec2(-200, 0), vec2(200, 0));
  rotate(60 * DEG2RAD);
  line2D(vec2(-200, 0), vec2(200, 0));

  m.cCircle(300);

  pop();
}

function hexPattern3() {
  m.drawRing(0, 96, m.circleSegment, { count: 6 });
  m.drawRing(144, 144, m.circleSegment, { count: 6, diameter: 50 });
  m.cCircle(144);

  const hex1 = new Polygon(vec2(0, 0), 250, 6, 30 * DEG2RAD);

  // Draw circles at polygon vertices
  for (let i = 0; i < hex1.sides; i++) {
    const v = hex1.getPoint(i);
    const circ = new Circle(v, 50);
    circ.draw();
    addClipShape(circ);
  }

  new Polygon(vec2(0, 0), 144, 3).draw();
  new Polygon(vec2(0, 0), 144, 3, PI).draw();

  hex1.draw();
  // hex1.drawInscribedCircle();
  new Polygon(vec2(0, 0), 250, 3).draw();
  new Polygon(vec2(0, 0), 250, 3, PI).draw();

  m.cCircle(300);
}

function hexPatternMandalas() {
  m.drawRing(0, 96, m.circleSegment, { count: 6 });
  m.drawRing(144, 144, m.circleSegment, { count: 6, diameter: 50 });

  m.cCircle(144);

  const hex1 = new Polygon(vec2(0, 0), 250, 6, 30 * DEG2RAD);

  // Draw circles at polygon vertices
  for (let i = 0; i < hex1.sides; i++) {
    const v = hex1.getPoint(i);
    const circ = new Circle(v, 75);
    circ.draw();
    addClipShape(circ);

    push();
    translate(circ.center.x, circ.center.y);
    m.drawRandomMandala(m.allSegments, 10, 60, 15);
    pop();
  }

  // TODO fix this
  // new Polygon(vec2(0,0), 144, 6).getPoints().forEach(p => {
  //   const circ = new Circle(p, 40);
  //   circ.draw();
  //   addClipShape(circ);
  // });

  new Polygon(vec2(0, 0), 144, 3).drawLines();
  new Polygon(vec2(0, 0), 144, 3, PI).drawLines();

  hex1.drawLines();
  // hex1.drawInscribedCircle();
  new Polygon(vec2(0, 0), 250, 3).drawLines();
  new Polygon(vec2(0, 0), 250, 3, PI).drawLines();

  m.cCircle(350);
  m.drawRing(360,360,m.circleSegment, {count: 128, diameter: 5});
  m.cCircle(400);
}
