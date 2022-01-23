import * as debug from "./lumic/debugutils.js";

const w = 2000;
const halfW = w / 2;
const h = 2000;
const halfH = h / 2;

const screenW = 800;
const screenH = 800;

let g;

const sky1 = "#140609";
const sky2 = "#3b1019";
const sky3 = "#b9132c";
const sky4 = "#fb6a54";
const sky5 = "#fdbf38";
const sky6 = "#513e3c";
const sky7 = "#fcfbf9";
const sky8 = "#2ce7f8";

const ground1 = "#251124";
const ground2 = "#055346";
const ground3 = "#4cdcbf";
const ground4 = "#f3fdef";

const nsx1 = 0.0005;
const nsy1 = 0.002;

function displaceY(x, y) {
  return noise(100 + x * nsx1, 100 + y * nsy1) - 0.5;
}

function drawBand(g, yStart, yEnd) {
  g.strokeWeight(1);
  const r1 = yEnd - yStart;
  const r2 = 4;

  for (var x = -halfW; x <= halfW; x++) {
    let x1 = x + random(-r1, r1);
    let y1 = yStart + random(-r2, r2);
    let x2 = x + random(-r1, r1);
    let y2 = yEnd + random(-r2, r2);

    y1 += displaceY(x1, y1) * 256;
    y2 += displaceY(x2, y2) * 256;

    g.line(x1, y1, x2, y2);
  }
}

const defaultSkySettings = {
  count: 8,
  step: -48,
  thicknessStep: 9,
  thicknessStart: 4,
};

const defaultGroundSettings = {
  count: 8,
  step: 48,
  thicknessStep: 9,
  thicknessStart: 4,
};

const bands = [
  {
    ...defaultSkySettings,
    color: sky2,
    startY: 0,
  },
  {
    ...defaultSkySettings,
    color: sky3,
    startY: -100,
  },
  {
    ...defaultSkySettings,
    color: sky4,
    startY: -200,
  },
  {
    ...defaultSkySettings,
    color: sky5,
    startY: -300,
  },
  {
    count: 1,
    step: -12,
    thicknessStep: 3,
    thicknessStart: 2,
    color: sky6,
    startY: -600,
  },
  {
    ...defaultSkySettings,
    color: sky7,
    startY: -600,
    count: 5,
  },
  {
    ...defaultSkySettings,
    color: sky8,
    startY: -750,
  },
  {
    ...defaultGroundSettings,
    color: ground1,
    startY: 0,
  },
  {
    ...defaultGroundSettings,
    color: ground2,
    startY: 200,
  },
  {
    ...defaultGroundSettings,
    color: ground3,
    startY: 300,
    count: 16,
  },
  {
    ...defaultGroundSettings,
    color: ground4,
    startY: 400,
    count: 8,
  },
];

function drawBandSet(g, bandSet) {
  let t = bandSet.thicknessStart;
  for (var i = 0; i < bandSet.count; i++) {
    const yCenter = bandSet.startY + bandSet.step * i;

    // half thickness
    const s = i < bandSet.count / 2 ? 1 : -1;
    t += s * bandSet.thicknessStep;

    const ht = 0.5 * t;

    let y1 = yCenter - ht;
    let y2 = yCenter + ht;

    if (i === bandSet.count - 1) {
      // fill the rest of the space in the direction of march
      if (bandSet.step < 0) {
        y1 = -halfH;
      }
    }

    g.fill(bandSet.color);
    g.stroke(bandSet.color);

    drawBand(g, y1, y2);
  }
}

window.setup = function () {
  g = createGraphics(w, h, WEBGL);
  createCanvas(screenW, screenH);

  g.background(sky1);

  bands.forEach((band) => {
    drawBandSet(g, band);
  });

  image(g, 0, 0, screenW, screenH);
};

window.draw = function () {
  background(0);
  image(g, 0, 0, screenW, screenH);

  if (mouseIsPressed) {
    // Draw a zoomed in view
    debug.drawFullZoomSection(g, 200);
  }
};

window.keyTyped = function () {
  if (key === "s") {
    save(g, "blanket.png");
  }
};
