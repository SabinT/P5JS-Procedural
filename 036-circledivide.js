import { add2d, dist2d, lerp2d, vec2 } from "./lumic/common.js";
import { easeInOutElastic, easeInOutQuad, easeInQuad, easeOutQuad } from "./lumic/easing.js";

const w = 2000;
const hw = w / 2;
const h = 2000;
const hh = h / 2;

let g;

let palette = [
  "#F2C9E4",
  "#AC80BF",
  "#5080BF",
  "#8FAFD9",
  "#FFFFFF",
]

function doubleArcs(R, divs) {
  // Containing circle
  noFill();
  translate(hw, hh)

  strokeWeight(8);

  const dR = R / (divs - 1);
  let i = 0;
  for (let cx = -R; cx <= 0.01; cx += dR) {
  // for (let cx = 0; cx >= -R + dR; cx -= dR) {
    push();

    const invert = i > divs / 2 - 1;

    // Quantize for palette
    let ti = Math.floor(Math.abs(cx) / dR);
    ti = ti % palette.length;

    let tti = Math.floor(Math.abs(R - cx - dR) / dR);
    tti = tti % palette.length;
    
    const C1 = vec2(cx, 0);
    const R1 = R - abs(cx);

    const R2 = (R - R1);
    const cx2 = cx + R1 + R2;
    const C2 = vec2(cx2, 0);

    // stroke(invert ? "red" : "white")

    const ri = Math.floor(random(0, palette.length));
    stroke(palette[ri]);
    // stroke("red")
    arc(C1.x, C1.y, R1 * 2, R1 * 2, PI, 0);

    // rotate(PI);

    // stroke(invert ? "white" : "red");
    // stroke(palette[tti]);

    // arc(C1.x, C1.y, R1 * 2, R1 * 2, PI, 0);

    // stroke("blue");
    arc(C2.x, C2.y, R2 * 2, R2 * 2, 0, PI);

    pop();

    i++;
  }

  stroke("white");
  strokeWeight(5);
  circle(0, 0, R * 2)
}

function render(g) {
  background("#91E0F2");
  doubleArcs(700, 200);
}

window.setup = function () {
  createCanvas(w, h);
  pixelDensity(1.5);
};

window.draw = function () {
  background(10);
  render(g);
  noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
