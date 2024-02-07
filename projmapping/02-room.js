import {
  greenTheme,
  cyberpunkTheme,
  getRandomColor,
} from "../lumic/palettes.js";

import { polar2cart, sqRand } from "../lumic/common.js";

const screenW = 1920;
const screenH = 1080;

let g, g2, g3;

let pal = cyberpunkTheme;

const mapFilename = "projmapping/02-map.json";

let pMapper;
let surfaces = [];

let leftSurf, rightSurf, midSurf;

let o = {
  w1: 512,
  w2: 512,
  w3: 512,
  h1: 512,
  h2: 512,
  h3: 512,
  seed1: 123,
  seed2: 2342423,
  seed3: 99790798,
};

let seed = o.seed1;

function polarLine(g, r1, a1, r2, a2, divisions = 16) {
  const da = (a2 - a1) / divisions;
  const dr = (r2 - r1) / divisions;

  g.beginShape();
  for (let i = 0; i <= divisions; i++) {
    const t = i / divisions;
    const r = lerp(r1, r2, t);
    const a = lerp(a1, a2, t);

    const x = r * Math.cos(a);
    const y = r * Math.sin(a);

    g.vertex(x, y);
  }
  g.endShape();
}

window.setup = function () {
  createCanvas(screenW, screenH, WEBGL);
  pixelDensity(2);

  g = createGraphics(512, 512, WEBGL);
    g2 = createGraphics(512, 512, WEBGL);
    g3 = createGraphics(512, 512, WEBGL);

  // initialize map surfaces
  pMapper = createProjectionMapper(this);

  pMapper.load(mapFilename);

  leftSurf = pMapper.createQuadMap(o.w1, o.h1);
  rightSurf = pMapper.createQuadMap(o.w2, o.h2);
  midSurf = pMapper.createQuadMap(o.w3, o.h3);

  surfaces.push(leftSurf);
  surfaces.push(rightSurf);
  surfaces.push(midSurf);

  seed = o.seed1;
  drawPolarLines(g);

  seed = o.seed2;
    drawPolarLines(g2);

    seed = o.seed3;
    drawPolarLines(g3);

  image(g, 0, 0);

  background(255);

  // Draw g to screen
  //   image(g, 0, 0);

  //   noLoop();
};

window.draw = function () {
  background(0);

//   randomSeed(o.seed1);
//   seed = o.seed1;
//   drawPolarLines(g);
//   image(g, -256, -256);

  leftSurf.displaySketch(drawLeft);
  rightSurf.displaySketch(drawRight);
  midSurf.displaySketch(drawMiddle);

  // noLoop();
};

function drawPolarLines(g) {
  g.background(0);

  g.push();

  g.translate(-256, -256);
  const n = 30;

  const rMin = 50;
  const rMax = 512;

  const offA = millis() / 1000;
  const aMin = (-15 * PI) / 180 + offA;
  const aMax = (90 * PI) / 180 + offA;
  const aDiffMin = (30 * PI) / 180;
  const aDiffMax = (60 * PI) / 180;

  g.noFill();

  g.stroke(255);
  g.strokeWeight(10);

  // Radial polar lines
  for (let i = 0; i < n; i++) {
    const r = rMin + sqRand(i, seed) * (rMax - rMin);
    // const r = random(rMin, rMax);

    let a = aMin + sqRand(i + 30, seed) * (aMax - aMin);
    let a2 = aMin + sqRand(i + 60, seed) * (aMax - aMin);

    if (a2 < a) {
        // swap
        const tmp = a;
        a = a2;
        a2 = tmp;
    }
    // const a = random(aMin, aMax);
    // let a2 = random(aMin, aMax);

    if (a2 < a + aDiffMin) {
      a2 = a + aDiffMin;
    }

    if (a2 > a + aDiffMax) {
      a2 = a + aDiffMax;
    }

    const tCol = noise(i);
    const col = pal.colors[floor(tCol * pal.colors.length)];

    // g.stroke(col);


    g.strokeWeight(random(1, 7))

    polarLine(g, r, a, r, a2, 8);
  }

  g.noFill();
  g.stroke(255);
  g.strokeWeight(5);

  polarLine(g, 400, 0, 400, PI / 2, 32);
//   g.line(0, 0, 0, 512);
//   g.line(0, 0, 512, 0);

  g.pop();
}

function drawLeft(pg) {
    pg.clear();
    pg.push();
    // pg.translate(-512, -512);
    // pg.scale(1, -1)
    // pg.rotate(PI / 2)
    pg.image(g, 0, 0);
    pg.pop();

}

function drawRight(pg) {
    pg.clear();
    pg.image(g2, 0, 0);
}

function drawMiddle(pg) {
    pg.clear();
    pg.image(g3, 0, 0);
}

window.keyTyped = function () {
  switch (key) {
    case "c":
      pMapper.toggleCalibration();
      break;
    case "f":
      let fs = fullscreen();
      fullscreen(!fs);
      break;
    case "l":
      pMapper.load(mapFilename);
      break;

    case "s":
      pMapper.save("02-map.json");
      break;
  }
};

window.windowResized = function () {
  resizeCanvas(windowWidth, windowHeight);
};
