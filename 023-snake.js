import {
  add2d,
  line2D,
  remap,
  scale2d,
  subtract2d,
  vec2,
} from "./lumic/common.js";
import * as debug from "./lumic/debugutils.js";
import { perpendicular2d, Frame2D } from "./lumic/frame.js";
import { Spiro2D, Wheel } from "./lumic/spiro.js";

const w = 1000;
const h = 1000;

const screenW = 800;
const screenH = 800;

let g;

const frame = new Frame2D(vec2(0, 0), vec2(0, -100));

const wheels = [
  new Wheel(vec2(0, 0), 100, 1),
  new Wheel(vec2(0, 0), 40, -20),
  new Wheel(vec2(0, 0), 10, 7),
];

const spiro = new Spiro2D(frame, wheels);

const frames = [];

let tCur = 0;
let tStep = 0.001;

let framesToAdd = 1 / tStep;

let prevPos;
function drawThingy() {
  g.stroke("white");

  //   drawSnake(frames, 0, 100);
  drawSnake(frames, 100, 150);

  image(g, 0, 0, screenW, screenH);
}

function drawSnake(frames, start, end) {
  const offset = Math.floor(millis() / 50);
  const step = Math.sign(end - start);

  let prev;
  for (let i = start; i <= end; i += step) {
    const isHead = i == end;

    const j = (i + offset) % frames.length;
    const f = frames[j];
    let p = f.origin;
    const q = scale2d(f.right, sin(j / 3) * 20);
    p = add2d(p, q);

    if (prev) {
      const d = 8 - remap(end, start, 0, 1, i) * 8;
      g.strokeWeight(d);
      g.stroke("#66bbff");
      g.noFill();
      line2D(p, prev, g);

      if (isHead) {
        g.fill("white");
        g.noStroke();
        g.circle(p.x, p.y, d * 0.5);
      }
    }

    prev = p;
    // g.circle(p.x, p.y, isHead ? 5: 2);
  }
}

window.setup = function () {
  g = createGraphics(w, h, WEBGL);
  createCanvas(screenW, screenH);

  g.scale(3);
  g.background(0);

  g.noFill();

  prevPos = spiro.getPosition(-0.001);

  while (framesToAdd > 0) {
    const pos = spiro.getPosition(tCur);
    const tangent = subtract2d(pos, prevPos);
    tangent.normalize();

    frames.push(new Frame2D(pos, tangent));

    tCur += tStep;
    framesToAdd--;
  }
};

function drawSpiro() {
  for (let i = 0; i < frames.length; i++) {
    const j = (i + 1) % frames.length;
    g.stroke(255);
    g.strokeWeight(1);
    line2D(frames[i].origin, frames[j].origin, g);
  }
}

window.draw = function () {
  g.background(color(0, 0, 0, 255));

  g.push();
  g.rotate(frameCount / 1000);
  g.scale(sin(millis() / 2000) * 0.1 + 0.75);

  // Draw the whole spiro
//   drawSpiro();

  drawThingy();

  // background(0);
  image(g, 0, 0, screenW, screenH);

  if (mouseIsPressed) {
    // To save battery
    noLoop();
    // Draw a zoomed in view
    debug.drawFullZoomSection(g, 200);
  }

  tCur += tStep;

  g.pop();
};
