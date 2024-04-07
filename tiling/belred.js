import { STYLES } from "../lumic/hex.js";

export const fixedSeed = false;
export const seedCenter = 1701112842825;
export const seedRight = 1701113035742;
export const seedLeft = 1701113068397;

// Center space: 79.1 x 181.2 inches
const outerMargin = 1; // inches

// inches
export const centerWidth = 36;
export const muralHeight = 48;
export const sideWidth = 50;

const baseMargin = 1; // inches

export const pxDensity = 1;
const scaler = 5;

export const marginDefault = {
  top: getRes(baseMargin),
  left: getRes(baseMargin),
  bottom: getRes(baseMargin),
  right: getRes(baseMargin),
};

export const marginCenter = {
  ...marginDefault,
  // 16 inches extra margin for info and QR code
  // bottom: getRes(baseMargin + 16),
};

// 100 * scaler per foot
export function getRes(inches) {
  return (inches / 12) * 100 * scaler;
}

export function getResolutionCenter() {
  const w = getRes(centerWidth);
  const hw = w / 2;
  const h = getRes(muralHeight);
  const hh = h / 2;
  return { w, h, hw, hh };
}

export function getResolutionSide() {
  const w = getRes(sideWidth);
  const hw = w / 2;
  const h = getRes(muralHeight);
  const hh = h / 2;
  return { w, h, hw, hh };
}

export const paletteColorful = [
  "#F294C0",
  "#4E1773",
  "#04BF9D",
  "#F2C230",
  "#F25430"
]

export const paletteSide = [
  "#F7489D",
  "#000000",
  "#48eef7",
  "#F74E48",
  "##B648F7",
];

export const paletteCenter = [
  "#7078FF",
  "#FCFCFC",
  "#5218ED",
  "#01ab70",
  "#02c4dd",
];

// Center the p5 canvas in window
export function centerCanvas(canvas) {
  let container = document.getElementById('canvasContainer');
  
  // If the container doesn't exist, create it
  if (!container) {
    container = document.createElement('div');
    container.id = 'canvasContainer';
    document.body.appendChild(container);
  }

  const elt = canvas.elt;

  const x = (window.innerWidth - canvas.width) / 2;
  const y = (window.innerHeight - canvas.height) / 2;
  elt.style.position = 'absolute';
  elt.style.left = `${x}px`;
  elt.style.top = `${y}px`;

  // Append the canvas to the container
  container.appendChild(elt);
}


export function makeStyles(color, weight, offset, style = STYLES.LINES) {
  return [
    { color: color, weight: weight, offset: offset, style: style },
    { color: color, weight: weight, offset: -offset, style: style },
  ];
}

export function drawMargin(g, margin, thickness = 1, strokeColor = 255) {
  push();

  translate(-width / 2, -height / 2);

  // let margin = { top: 20, left: 15, bottom: 20, right: 15 };
  const w = width; // width of the main canvas
  const h = height; // height of the main canvas

  // Top Margin
  image(g, 0, 0, w, margin.top, 0, 0, w, margin.top);

  // Bottom Margin
  image(
    g,
    0,
    g.height - margin.bottom,
    w,
    margin.bottom,
    0,
    h - margin.bottom,
    w,
    margin.bottom
  );

  // Left Margin
  image(g, 0, 0, margin.left, g.height, 0, 0, margin.left, h);

  // Right Margin
  image(
    g,
    g.width - margin.right,
    0,
    margin.right,
    g.height,
    w - margin.right,
    0,
    margin.right,
    h
  );

  // Rectangle around the margin
  noFill();
  stroke(strokeColor);
  strokeWeight(getRes(thickness));

  rect(
    margin.left,
    margin.top,
    w - margin.left - margin.right,
    h - margin.top - margin.bottom
  );

  pop();
}

let seed;

export function setSeed(num) {
  // seed from time
  seed = Date.now();

  if (fixedSeed) {
    seed = num;
  }

  randomSeed(seed);
  console.log("seed: " + seed);
}

export function getSeed() {
  return seed;
}

// Anim stuff
export const animSettings = {
  autoAnim : true,
  secsPerRing: 1,
  secsRingOffset: 0.2,
  randTurnMax: 3,
  captureEnabled: false,
  captureCycles: 6,
};

let animStartMillis = -1000000;
let animNumRings = 0;

export function nonRealtimeMillis() {
  return frameCount * 1000 / 60;
}

export function startAnim(numRings) {
  // Don't start new anim if enough time hasn't elapsed
  const fullAnimSecs =
    animSettings.secsPerRing * 1.5 + animSettings.secsRingOffset * numRings;

  if (animElapsed() < fullAnimSecs) {
    console.log("Anim already in progress");
    return;
  }

  console.log("Starting anim");

  animNumRings = numRings;
  animStartMillis = nonRealtimeMillis();
}

export function animElapsed() {
  return (nonRealtimeMillis() - animStartMillis) / 1000;
}

const isAnimInProgress = {};
const animCompleteCount = {};

const animProgress = {};

/**
 * @returns {number} 0-1
 */
function stepAnimateRing(ring) {
  const millisPerRing = animSettings.secsPerRing * 1000;
  const millisOffset = animSettings.secsRingOffset * 1000;
  const adjStart = animStartMillis + millisOffset * ring;
  const elapsed = nonRealtimeMillis() - adjStart;
  const t = elapsed / millisPerRing;

  // If in progress previous frame, and complete this frame,
  // increment the complete count
  if (isAnimInProgress[ring] && t >= 1) {
    animCompleteCount[ring] = animCompleteCount[ring] || 0;
    animCompleteCount[ring]++;
  }

  isAnimInProgress[ring] = t > 0 && t < 1;

  if (isAnimInProgress[ring]) {
    animProgress[ring] = t;
  } else {
    animProgress[ring] = 0;
  }

  return constrain(t, 0, 1);
}

export function stepAnimate() {
  // console.log("numRings", animNumRings);

  if (animSettings.autoAnim) {
    startAnim(animNumRings);
  }

  for (let ring = 0; ring <= animNumRings; ring++) {
    stepAnimateRing(ring);
  }

  if (animSettings.captureEnabled && animNumRings > 0) {
    // Capture until all complete counts are >= captureCycles
    let allComplete = true;
    for (let ring = 0; ring <= animNumRings; ring++) {
      const compCount = animCompleteCount[ring] || 0;
      if (compCount < animSettings.captureCycles) {
        allComplete = false;
        break;
      }
    }

    if (allComplete) {
      console.log("All complete");
      animSettings.captureEnabled = false;
      noLoop();
    } else {
      // Save a frame
      console.log("Saving frame");
      // Pad frame count to 4 digits
      const frameCountStr = frameCount.toString().padStart(4, "0");
      save("frame_" + frameCountStr + ".jpg")
    }
  }
}
export function getAnimCompleteCount(ring) {
  return animCompleteCount[ring] || 0;
}

export function getAnimProgress(ring) {
  return animProgress[ring] || 0;
}

export function isAnimActive(ring) {
  return isAnimInProgress[ring] || false;
}
