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

const w = 1080;
const hw = w / 2;
const h = 1080;
const hh = h / 2;

let g;

let scaler = vec2(0.5, 0.5);

let globalOffset = -2.5;
let offset0 = globalOffset;
let offset1 = globalOffset + 4;
let offset2 = globalOffset + 7.5;

var hexList = [
  { center: vec2(offset0 + 0, -2), ring: 0 },
  { center: vec2(offset0 + -1, -2), ring: 0 },
  { center: vec2(offset0 + -2, -1), ring: 0 },
  { center: vec2(offset0 + -2, 0), ring: 0 },
  { center: vec2(offset0 + -1, 0), ring: 0 },
  { center: vec2(offset0 + -1, 1), ring: 0 },
  { center: vec2(offset0 + -2, 2), ring: 0 },
  { center: vec2(offset0 + -3, 2), ring: 0 },

  { center: vec2(offset1 + 0, -2), ring: 0 },
  { center: vec2(offset1 + -1, -2), ring: 0 },
  { center: vec2(offset1 + -2, -1), ring: 0 },
  { center: vec2(offset1 + -3, 0), ring: 0 },
  { center: vec2(offset1 + -3, 1), ring: 0 },
  { center: vec2(offset1 + -3, 2), ring: 0 },
  { center: vec2(offset1 + -2, 2), ring: 0 },

  { center: vec2(offset2 + 0, -2), ring: 0 },
  { center: vec2(offset2 + -1, -2), ring: 0 },
  { center: vec2(offset2 + -2, -1), ring: 0 },
  { center: vec2(offset2 + -3, 0), ring: 0 },
  { center: vec2(offset2 + -3, 1), ring: 0 },
  { center: vec2(offset2 + -3, 2), ring: 0 },
  { center: vec2(offset2 + -2, 2), ring: 0 },
];

const theme = pal.vibrantTheme;

const rec = {
  fps: 60,
  loopTime: 8,
  recLoopCount: 2,
  currentFrame: 1,
};

const R = 80;
const minR = 0;
let insetStep = 4;
let insetRange = 80;
const rings = 3;

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

  const t = (TAU * rec.currentFrame) / (rec.fps * rec.loopTime) + hexSeq;
  let step = insetStep + map(sin(t), -1, 1, 0, insetRange);
  let r = R - ring * step;
  for (let i = 0; i <= rings - ring && r > minR; i++) {
    const mult = i % 2 == 0 ? 1 : 0;
    let col = color(theme.colors[(i + 6) % theme.colors.length]);
    if (mult == 0) {
      col = color(0);
    }

    fill(col);
    // stroke(255);
    noStroke();
    hex.radius = r;
    hex.draw();

    r -= step;
  }

  pop();
  hexSeq++;
}

let font;
let font1;
window.preload = function () {
  font = loadFont("assets/fonts/joystix/joystix monospace.otf");
  font1 = loadFont("assets/fonts/Anonymous_Pro/AnonymousPro-Bold.ttf");
};

function render(g) {
  blendMode(NORMAL);

  colIndex = 0;
  // blendMode(ADD);

  for (const hex of hexList) {
    drawHex(hex.center, R, hex.ring);
  }
}

// Function to sinusoidally displace y, according to y
function disp(y) {
  let frameInterval = rec.fps * rec.loopTime;
  let t = 5 * (TAU * rec.currentFrame) / frameInterval;
  let amp = 5;

  return y + sin(y * 20 + t) * amp;
}

function renderInfo() {
  noStroke();
  fill(255);
  // mono font
  textFont(font);
  textAlign(CENTER, CENTER);

  textSize(46);
  fill(theme.colors[1]);
  text(`Seattle Creative Coders`, hw, disp(60));;

  let blink = frameCount % (rec.loopTime * rec.fps * 0.1) < 30;

  textFont(font);

  if (1) {
    fill(theme.colors[3]);
    textSize(40);
    text("Meetup and pop-up art show!", hw, disp(110) );
  }

  fill(200);
  textSize(40);
  text("Saturday, Mar 25, 7 - 10 pm", hw, (210));

  fill(theme.colors[2]);
  textSize(40);
  text("Studio at 2+U", hw, (300));
  text("1201 2nd Ave, Seattle", hw, (350));

  if (blink) {
    fill(theme.colors[1]);
    textSize(40);
    text("RSVP", hw, h - disp(220));
  }

  fill(theme.colors[3]);
  text("bit.ly/scc-mar25", hw, h - disp(160))

  textSize(30);
  fill(220)
  text("seattlecreativecode.com", hw, h - disp(60));
}

window.setup = function () {
  // add 32px padding to the canvas HTML element
  let canvas = createCanvas(w, h);
  canvas.style("padding", "32px");
  
  frameRate(60);
  // blendMode(SCREEN);
  // noLoop();
};

window.draw = function () {
  background(10);

  push();
  translate(hw, hh + 75);
  scale(scaler.x, scaler.y);
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

  pop();

  renderInfo();

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
