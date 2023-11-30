import { DEG2RAD, PI, vec2 } from "../lumic/common.js";
import { Polygon } from "../lumic/geomerty.js";
import {
  hexToCartesianOddr,
  drawHexTile,
  defaultJoinMask,
  generateRandomJoinArray,
  STYLES,
  tileSettings,
  getAdjacentOddr,
  createOppositeJoins,
  oddrToAxial,
  axialDistance,
  getCenterDistOddr,
} from "../lumic/hex.js";
import { easeInOutElastic, easeInOutQuad, easeOutElastic } from "../lumic/easing.js";
import {
  drawMargin,
  paletteSide,
  pxDensity,
  getResolutionCenter,
  marginDefault,
  marginCenter,
  fixedSeed,
  seedCenter,
  setSeed,
  getSeed,
  startAnim,
  stepAnimate,
  getAnimProgress,
  getAnimCompleteCount,
  isAnimActive,
} from "./belred.js";

const { w, h, hw, hh } = getResolutionCenter();

let bg;

const palette = paletteSide;

const R = (0.65 * w) / 8;

const s = {
  gridHW: 4,
  gridHH: 14,
  debugTile: false,
  radius: R,
  bgColor: palette[1],
  bgPatternColor: palette[3],
};

const strokeBaseWidth = R / 20;
const baseOffset = strokeBaseWidth * 0.25;

const cci = 2;
const bci = 1;
const bli = 4;

function makeStyles(color, weight, offset, style = STYLES.LINES) {
  return [
    { color: color, weight: weight, offset: offset, style: style },
    { color: color, weight: weight, offset: -offset, style: style },
  ];
}

const styleLines = [
  {
    color: palette[cci],
    weight: strokeBaseWidth * 2,
    offset: 0,
    style: STYLES.LINES,
  },
  ...makeStyles(
    palette[0],
    strokeBaseWidth * 1.25,
    baseOffset * 6,
    STYLES.LINES
  ),
  // ...makeStyles(palette[1], strokeBaseWidth, 12 * scaler, STYLES.LINES),
  ...makeStyles(palette[2], strokeBaseWidth, 16 * baseOffset, STYLES.LINES),
  ...makeStyles(palette[4], strokeBaseWidth, 14 * baseOffset, STYLES.LINES),
];

const styles = styleLines;

let seed;

const hexList2D = [];
// const hexList = [];
// const maskList = [];
const maskList2D = [];
// const turnList = [];
const turnList2D = [];
const turnList2DAdjusted = [];

const templateHex = new Polygon(vec2(0, 0), s.radius, 6, PI / 2);
const hexPts = templateHex.getPoints();

function setLineDash(g, list) {
  g.drawingContext.setLineDash(list);
}

function resetLineDash(g) {
  g.drawingContext.setLineDash([]);
}

window.setup = function () {
  setSeed(seedCenter);
  pixelDensity(pxDensity);

  tileSettings.noSolos = true;

  for (let y = -s.gridHH; y <= s.gridHH; y++) {
    hexList2D[y] = [];
    maskList2D[y] = [];
    turnList2D[y] = [];
    turnList2DAdjusted[y] = [];
  }

  // A grid of hexagons in the odd-r coordinate system
  for (let y = -s.gridHH; y <= s.gridHH; y++) {
    for (let x = -s.gridHW; x <= s.gridHW; x++) {
      const hex = { center: vec2(x, y), radius: s.radius };
      // hexList.push(hex);
      hexList2D[y][x] = hex;

      let probabilities = [0.2, 0.7, 0.5, 0.5]; // Custom probabilities for each join type
      let mask = generateRandomJoinArray(null, /* singleFlag */ false);
      // maskList.push(mask);
      maskList2D[y][x] = mask;

      if (random() > 0.9) {
        maskList2D[y][x] = createOppositeJoins();
      }

      // Random integer between [0,5]
      let turns = Math.floor(random() * 6);
      // turnList.push(turns);
      turnList2D[y][x] = turns;
      turnList2DAdjusted[y][x] = turns;
    }
  }

  // Symmetry in join types
  for (let y = -s.gridHH; y <= s.gridHH; y++) {
    for (let x = -s.gridHW; x <= s.gridHW; x++) {
      maskList2D[y][x] = maskList2D[y][-x];
      turnList2D[y][x] = turnList2D[y][-x] + 3;
    }
  }

  // Center row of hexagons all have same pattern
  //   for (let x = -s.gridHW; x <= s.gridHW; x++) {
  //     if (random() > 0.25) {
  //       maskList2D[0][x] = createOppositeJoins();
  //     }
  //   }

  createCanvas(w, h);

  bg = createGraphics(w, h);

  renderBgSine();
};

window.draw = function () {
  translate(hw, hh);
  render();
  // noLoop();
};

function renderBgSine() {
  bg.background(palette[bci]);

  bg.translate(hw, hh);

  const halfLines = 150;
  const xSegments = 256;
  const lineSeparation = s.radius * 0.4;

  const col = color(palette[bli]);
  col.setAlpha(255 * 0.5);
  bg.strokeWeight(strokeBaseWidth * 0.5);
  bg.fill(s.bgColor);

  const sineFunc = (x) => sin(x * PI * 2 * 2.5) * 0.5;

  const dx = hw / xSegments;
  const dy = hh / halfLines + 1;

  // Sine-wave like lines
  for (let i = -halfLines; i <= halfLines; i++) {
    const baseY = dy * i;
    for (let j = -xSegments; j <= xSegments; j++) {
      if (random() > 0.5) continue;

      const x1 = dx * j;
      const x2 = dx * (j + 1);

      const y1 = baseY + sineFunc(j / xSegments) * lineSeparation;
      const y2 = baseY + sineFunc((j + 1) / xSegments) * lineSeparation;

      bg.stroke(col);
      bg.line(x1, y1, x2, y2);
    }
  }
}

function renderBg() {
  bg.background(s.bgColor);

  bg.translate(hw, hh);

  const halfLines = 12;
  const lineSeparation = s.radius * 0.8;

  const col = color(s.bgPatternColor);
  bg.strokeWeight(strokeBaseWidth * 0.5);
  bg.fill(s.bgColor);

  const circStartR = R * 1.3;
  const cirsStepR = R / 10;
  const circMaxCount = 16;

  for (let y = -s.gridHH; y <= s.gridHH; y++) {
    for (let x = -s.gridHW; x <= s.gridHW; x++) {
      const hex = hexList2D[y][x];

      bg.push();

      // hex center
      var c = hexToCartesianOddr(hex.center, hex.radius);
      bg.translate(c.x, c.y);

      // const circCount = (Math.cos(hex.center.y) + 1) * 0.5 * circMaxCount;
      const circCount = circMaxCount;

      col.setAlpha(100);
      bg.stroke(col);

      // hex points
      for (let j = 0; j < hexPts.length; j++) {
        var p = hexPts[j];

        for (let c = 0; c < circCount; c++) {
          const r = (circCount - c) * cirsStepR;
          if (r <= 0) {
            break;
          }

          const d = (Math.cos(hex.center.y + c) * 0.5 + 0.5) * 0.5 + 1;
          const dash = [d * 5, d * 5];
          setLineDash(bg, dash);

          bg.circle(p.x, p.y, r);
        }
      }

      resetLineDash(bg);
      bg.pop();
    }
  }
}

let cycleWaitTime = 0;
let cycleWaitActive = false;
let previousN = 0;
let waitCount = 0;
function render(g) {
  stepAnimate(0, 8);

  // draw bg onto canvas
  if (!s.debugTile) {
    image(bg, -hw, -hh);
  } else {
    background(s.bgColor);
  }

  // framerate(30);

  const nf = 30;

  // Figure out which row to animate
  const t = (frameCount % nf) / nf;
  const d = 1 / nf;
  const n =
    (Math.floor(frameCount / nf - waitCount) % (s.gridHH * 2 + 1)) - s.gridHH;

  // if (previousN != n) {
  //     cycleWaitTime = 0;
  //     cycleWaitActive = true;
  // }

  // if (cycleWaitActive) {
  //     cycleWaitTime += deltaTime / 1000;
  //     if (cycleWaitTime > 0.5) {
  //         cycleWaitActive = false;
  //         waitCount += 1;
  //     }
  //     return;
  // }

  for (let y = -s.gridHH; y <= s.gridHH; y++) {
    for (let x = -s.gridHW; x <= s.gridHW; x++) {
      let addedTurns = 0;
      // if (y == n) {
      //   turnList2DAdjusted[y][x] = easeInOutQuad(t + d) * 1 + turnList2D[y][x];
      // } else {
      //   turnList2D[y][x] = Math.round(turnList2DAdjusted[y][x]);
      // }

      const hex = hexList2D[y][x];
      const mask = maskList2D[y][x];

      // Anim stuff
      const dist = getCenterDistOddr(hex);
      const animActive = isAnimActive(dist);
      const animProgress = getAnimProgress(dist);
      const animCompleteCount = getAnimCompleteCount(dist);
      const animTurns = animCompleteCount + easeInOutQuad(animProgress);    

      // let turns = turnList2DAdjusted[y][x] + animTurns;
      let turns = turnList2D[y][x] + animTurns;

      turns += addedTurns;

      stroke(255);
      strokeWeight(1);
      noFill();

      // drawHexOddR(hex.center, hex.radius);

      // let probabilities = [0.2, 0.7, 0.5, 0.5]; // Custom probabilities for each join type
      // let mask = generateRandomJoinArray(null, /* singleFlag */ false);

      // mask = defaultJoinMask;

      // Random integer between [0,5]
      // let turns = Math.floor(Math.random() * 6);

      if (!s.debugTile) {
        for (let style of styles) {
          drawHexTile(
            hex.center,
            hex.radius,
            /* tilemask */ mask,
            turns,
            style,
            /* debugDraw */ false
          );
        }
      }

      if (s.debugTile) {
        push();
        const cart = hexToCartesianOddr(hex.center, hex.radius);
        translate(cart.x, cart.y);

        stroke(0);
        strokeWeight(strokeBaseWidth);
        textAlign(CENTER, CENTER);
        
        // Print anim progress
        textSize(R * 0.3);
        
        fill(0, 255, 0);
        text(`${animCompleteCount}`, -R * 0.25, R * 0.5);
        fill(animActive ? 255 : 150);
        text(`${animProgress.toFixed(2)}`, R * 0.25, R * 0.5);

        const animTurn = animTurns * 60 * DEG2RAD;
        rotate(animTurn);

        // Print distance from center
        fill(255, d * 40, animActive ? 255 : 150);
        textSize(R * 0.75);
        text(`${dist}`, 0, 0);


        pop();
      }
    }

    previousN = n;
  }

  drawMargin(bg, marginCenter, palette);
}

window.keyTyped = function () {
  if (key == "1") {
    s.debugTile = !s.debugTile;
  }

  if (key === "s") {
    save("center_" + getSeed() + ".png");
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

window.mouseClicked = function () {
  startAnim();
};
