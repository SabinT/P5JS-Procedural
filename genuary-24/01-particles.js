import { add2d, len2d, normalize2d, scale2d, vec2 } from "../lumic/common.js";
import { hypotrochoid } from "../lumic/parametric.js";
import * as e from "../lumic/p5Extensions.js";

const w = 1080;
const h = 1080;
const hw = w / 2;
const hh = h / 2;

let seed;

let o = {
    R_A: 10,
    R_B: 20,
    R_C: 9,
    R_D: 0,

    r_A: 11,
    r_B: 1,
    r_C: 13,
    r_D: 0,
    
    d_A: 12,
    d_B: 13,
    d_C: 14,
    d_D: 0,
}

let modifyVal = (val) => Math.floor(val);

function buildControls() {
    e.createSlider(1, 30, o.R_A, 0.01, "R_A", (val) => { o.R_A = modifyVal(val); });
    e.createSlider(-3, 3, o.R_B, 0.01, "R_B", (val) => { o.R_B = modifyVal(val); });
    e.createSlider(1, 30, o.R_C, 0.01, "R_C", (val) => { o.R_C = modifyVal(val); });
    e.createSlider(-2, 2, o.R_D, 0.01, "R_D", (val) => { o.R_D = modifyVal(val); });

    e.createSlider(1, 30, o.r_A, 0.01, "r_A", (val) => { o.r_A = modifyVal(val); });
    e.createSlider(-3, 3, o.r_B, 0.01, "r_B", (val) => { o.r_B = modifyVal(val); });
    e.createSlider(1, 30, o.r_C, 0.01, "r_C", (val) => { o.r_C = modifyVal(val); });
    e.createSlider(-2, 2, o.r_D, 0.01, "r_D", (val) => { o.r_D = modifyVal(val); });

    e.createSlider(1, 30, o.d_A, 0.01, "d_A", (val) => { o.d_A = modifyVal(val); });
    e.createSlider(-2, 2, o.d_B, 0.01, "d_B", (val) => { o.d_B = modifyVal(val); });
    e.createSlider(1, 30, o.d_C, 0.01, "d_C", (val) => { o.d_C = modifyVal(val); });
    e.createSlider(-2, 2, o.d_D, 0.01, "d_D", (val) => { o.d_D = modifyVal(val); });

    e.createButton("Clear", () => { blendMode(NORMAL); background(10); });

    e.createButton("Save PNG", () => {
        save(seed + ".png");
    });
}

window.setup = function () {
    pixelDensity(1);
    createCanvas(w, h);
    buildControls();

  seed = Date.now();
  console.log(seed);
  randomSeed(seed);


  background(10);
  blendMode(ADD);
  stroke(color(255, 255, 255, 10));
  strokeWeight(1);
};

const tStep = 0.01;
let nStep = 0;
let t = 0;


window.draw = function () {
  translate(hw, hh);

  blendMode(ADD);

  for (let i = 0; i < 100; i++) {
    simulate();
  }
};

window.keyTyped = function () {
  if (key === "s") {
    save(seed + ".png");
  }
};

function simulate() {
    const tStart = rand(0, TWO_PI);
    for (let i = 0; i < 100; i++) {
        const posOnRandCurve = randomHypotrochoid(tStart + t + i * 0.01);
        const pos = scale2d(posOnRandCurve, 100);
        point(pos.x, pos.y);
    }

    nStep++;
    t += tStep;
}

function rand(x, y) {
  return Math.random() * (y - x) + x;
}   


function randomHypotrochoid(t) {
    const R = Math.floor(rand(o.R_A, o.R_A + o.R_B)) / rand(o.R_C, o.R_C + o.R_D);
    const r = Math.floor(rand(o.r_A, o.r_A + o.r_B)) / rand(o.r_C, o.r_C + o.r_D);
    const d = Math.floor(rand(o.d_A, o.d_A + o.d_B)) / rand(o.d_C, o.d_C + o.d_D);

    return hypotrochoid(R, r, d, t);
}