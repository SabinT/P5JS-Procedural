import * as e from "./lumic/p5Extensions.js";
import { drawLeaf, drawLeafShape } from "./lumic/leaf.js";
import { scale2d } from "./lumic/common.js";

let debugDraw = false;

let options = {};
options.segments = 10;
options.r1 = 150; // Distance of 2nd control point from first
options.r2 = 150; // Distance of 3rd control point from 4th
options.maxAngle1 = 30; // The max angle from the centerline that the 1st control point makes relative to the 2nd
options.angleOffset1 = 0;
options.maxAngle2 = 75; // The max angle from the centerline that the 3rd control point makes relative to the 4th
options.angleOffset2 = 0;
options.crossSegments = 8;
options.leafLength = 685;

function buildControlGui() {
  e.createSlider(0, height / 2, options.leafLength, 0.01, "o.leafLength", (val) => {
    options.leafLength = val;
  });
  e.createSlider(0, 500, options.r1, 0.01, "o.r1", (val) => {
    options.r1 = val;
  });
  e.createSlider(0, 500, options.r2, 0.01, "o.r2", (val) => {
    options.r2 = val;
  });
  e.createSlider(0, 180, options.maxAngle1, 0.01, "o.maxAngle1", (val) => {
    options.maxAngle1 = val;
  });
  e.createSlider(0, 180, options.maxAngle2, 0.01, "o.maxAngle2", (val) => {
    options.maxAngle2 = val;
  });
  e.createSlider(-180, 180, options.angleOffset1, 0.01, "o.angleOffset1", (val) => {
    options.angleOffset1 = val;
  });
  e.createSlider(-180, 180, options.angleOffset2, 0.01, "o.angleOffset2", (val) => {
    options.angleOffset2 = val;
  });
  e.createSlider(1, 100, options.segments, 0.01, "o.segments", (val) => {
    options.segments = Math.floor(val);
  });
  e.createSlider(1, 100, options.crossSegments, 0.01, "o.crossSegments", (val) => {
    options.crossSegments = Math.floor(val);
  });

  //addToggle("debugDraw");
}

window.setup = function () {
  createCanvas(600, 600, SVG);
  background(40);
  buildControlGui();
};

const options2 = {...options, leafLength: 200, r1: 100, r2: 100};

window.draw = function () {
  background(40);
  translate(width / 2, height / 2);

  fill(0);
  drawLeafShape(options);
  fill(255);
  drawLeafShape(options2);

  push();
  scale(1, -1);
  drawLeaf(options);
  pop();
};


