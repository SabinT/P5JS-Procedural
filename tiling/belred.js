import { STYLES } from "../lumic/hex.js";

export const fixedSeed = false;
export const seedCenter = 123;
export const seedRight = 123;
export const seedLeft = 123;

// inches
export const centerWidth = 7 * 12;
export const muralHeight = 16 * 12;
export const sideWidth = 50;

const baseMargin = 2; // inches

export const pxDensity = 1;
const scaler = 3;

export const marginDefault = {
  top: getRes(baseMargin),
  left: getRes(baseMargin),
  bottom: getRes(baseMargin),
  right: getRes(baseMargin),
};

export const marginCenter  = {
    ...marginDefault,
    // 16 inches extra margin for info and QR code
    bottom: getRes(baseMargin + 16),
}

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

export function makeStyles(color, weight, offset, style = STYLES.LINES) {
  return [
    { color: color, weight: weight, offset: offset, style: style },
    { color: color, weight: weight, offset: -offset, style: style },
  ];
}

export function drawMargin(g, margin, palette) {
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
  stroke(255);
  strokeWeight(getRes(0.25));

  rect(
    margin.left,
    margin.top,
    w - margin.left - margin.right,
    h - margin.top - margin.bottom
  );

  pop();
}

export function setSeed(num) {
    // seed from time
    let seed = Date.now();
  
    if (fixedSeed) {
      seed = num;
    }
  
    randomSeed(seed);
    console.log(seed);
  }