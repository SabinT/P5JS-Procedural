/**
 * To find missing frames from a sequence
 
const nums = [1,2,... etc.]
const missing = []
const last = 1
for (n of nums) {
    const m = parseInt(n)
    if (m != last) {
        console.log(`${last} to ${m - 1}`);
    }
    while (last < m) {
        missing.push(last);
        last++;
    }
    last = m + 1;
}

 */

import {
  cart2Polar,
  DEG2RAD,
  getUrlParam,
  PI,
  TAU,
  vec2,
} from "./lumic/common.js";
import { Polygon } from "./lumic/geomerty.js";
import { getHexRing, hexToCartesianAxial } from "./lumic/hex.js";
import * as pal from "./lumic/palettes.js";

const w = 1920;
const hw = w / 2;
const h = 1080;
const hh = h / 2;

let g;

const rec = {
  fps: 60,
  loopTime: 8,
  recLoopCount: 2,
  currentFrame: 1,
};

const R = 80;
const minR = 0;
let insetStep = 10;
const rings = 8;

var colIndex = 0;

let hexSeq = 0;
function drawHex(p, R, ring) {
  stroke(0);
  strokeWeight(2);
  noFill();

  push();
  const q = hexToCartesianAxial(p.x, p.y, R);
  translate(q.x, q.y);
  //   const angleOffset = + hexSeq * 0.1 + t;
  const angleOffset = 0;

  const hex = new Polygon(vec2(0, 0), R, 6, PI / 2 + angleOffset);

  // Draw a circle at center

  const period = 10;
  const t = ((millis() / 1000) * TAU) / period;
  const ns = 20;

  let i = 0;
  const n1 = sin(t + i) * 1;
  const n2 = cos(t + i) * 1;

  stroke(255);
  var col = color(pal.getColor(pal.vibrantTheme, colIndex));
  col.setAlpha(50);
  fill(col);

  const x = noise(q.x + n1, q.y) * ns;
  const y = noise(q.x, q.y + n2) * ns;

  // Looping noise for radius, based on dist from center
  const pp = cart2Polar(q);
  const nr = noise(pp.x, pp.y + t) * 50;

  const r = R * sin(60 * DEG2RAD) * 4 - nr;
  circle(x, y, r);
  colIndex++;

  // hex.draw();

  // const t = (TAU * rec.currentFrame) / (rec.fps * rec.loopTime) + hexSeq;
  // let step = insetStep + map(sin(t), -1, 1, 0, 20);
  // let r = R - ring * step;
  // for (let i = 0; i <= rings - ring && r > minR; i++) {
  //   fill(i % 2 == 0 ? 255 : 0);
  //   hex.radius = r;
  //   hex.draw();

  //   r -= step;
  // }

  pop();
  hexSeq++;
}

function memoKey(center) {
  return `${center.x},${center.y}`;
}

function render(g) {
  blendMode(NORMAL);
  background(10);

  colIndex = 0;
  blendMode(ADD);

  const startHex = { center: vec2(0, 0), ring: 0 };
  const hexes = [];

  const memo = {};
  //   memo[startHex.center] = true;

  let lastHexes = [startHex];

  for (let i = 0; i < rings; i++) {
    const newHexes = [];
    while (lastHexes.length > 0) {
      const hex = lastHexes.pop();

      const ring = getHexRing(hex.center);
      for (let center of ring) {
        const key = memoKey(center);
        if (!memo[key]) {
          const h = { center: center, ring: i };
          hexes.push(h);
          newHexes.push(h);
          memo[key] = true;
        }
      }
    }

    lastHexes = newHexes;
  }

  for (const hex of hexes) {
    drawHex(hex.center, R, hex.ring);
  }
}

window.setup = function () {
  createCanvas(w, h);
  frameRate(60);
  blendMode(SCREEN);
  // noLoop();
};

window.draw = function () {
  translate(hw, hh);
  // background(0);

  const targetFrame = getUrlParam("frame");
  const singleFrame = targetFrame !== undefined && targetFrame !== null;

  if (singleFrame) {
    rec.currentFrame = targetFrame;
  }

  const isMisingFrame =
    getUrlParam("missing") &&
    frameCount > 0 &&
    frameCount < missingFrames.length;
  if (isMisingFrame) {
    rec.currentFrame = missingFrames[frameCount - 1];
  }

  hexSeq = 0;
  render();

  if (
    (getUrlParam("save") &&
      rec.currentFrame <= rec.recLoopCount * rec.loopTime * rec.fps) ||
    getUrlParam("frame") ||
    isMisingFrame
  ) {
    save("hex" + str(rec.currentFrame).padStart(4, 0) + ".png");
  }

  // To save battery
  if (mouseIsPressed) noLoop();

  if (singleFrame) {
    noLoop();
  }

  rec.currentFrame++;
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }

  if (key === "q") {
    insetStep += 1;
    render();
    console.log(insetStep);
  }

  if (key === "a") {
    insetStep -= 1;
    render();
    console.log(insetStep);
  }
};
