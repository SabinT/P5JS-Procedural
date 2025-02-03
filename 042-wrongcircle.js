import { polar2cart, lerp, vec2, sub2d, normalize2d, add2d, scale2d, rot2d, dot2d, lerp2d, line2D }from "./lumic/common.js";

const w = 900;
const hw = w / 2;
const h = 960;
const hh = h / 2;

let col = "#cc9a54";
let bgCol = "#cecece";

function envelope(x) {
  return 1;
}

function drawWeirdCircle() {
  background(bgCol);
  push();

  let center = vec2(hw, hh);
  translate(hw, hh)

  let segments = 1000;
  let radius = 300;

  noStroke();
  fill(col);

  beginShape();

  // Affect circumference with looping noise
  let noiseAmp = 50;
  let noiseScale = 0.005;

  for (let i = 0; i < segments; i++) {
    let t = i / (segments - 1);

    // Regular circle point
    let p = polar2cart(vec2(radius, t * Math.PI));

    let pNoise = scale2d(p, noiseScale);
    let n = noise(pNoise.x, pNoise.y) * noiseAmp;

    p = polar2cart(vec2(radius + n, t * Math.PI * 2));

    vertex(p.x, p.y)

  }

  endShape(CLOSE);

  pop();
}

window.setup = function () {
  createCanvas(900, 960);

  drawWeirdCircle();
  noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }

  if (key === "r" || key === "R") {
    noiseSeed(millis())
    drawWeirdCircle();
  }
};
