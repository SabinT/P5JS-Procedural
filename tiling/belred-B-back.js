import { PI, normalize2d, sub2d, vec2 } from "../lumic/common.js";
import { Polygon, move, drawPath } from "../lumic/geomerty.js";
import {
  drawHexTile,
  defaultJoinMask,
  generateRandomJoinArray,
  STYLES,
  tileSettings,
  exportHexJsonOddr,
  hexToCartesianOddr,
} from "../lumic/hex.js";
import { easeInOutQuad } from "../lumic/easing.js";
import {
  muralHeight,
  makeStyles,
  setSeed,
  getSeed,
  centerWidth,
  getRes,
  pxDensity,
  marginCenter,
  centerCanvas,
  drawMargin,
} from "./belred.js";

const w = getRes(centerWidth);
const hw = w / 2;
const h = getRes(muralHeight);
const hh = h / 2;

let bg;


const hexesPerRow = 16;
const R = 0.5 * (w - marginCenter.left - marginCenter.right) / (hexesPerRow * Math.cos(PI / 6));


const strokeBaseWidth = R / 15;
// const strokeBaseWidth = R / 20;
const baseOffset = strokeBaseWidth * 0.25;


const palette = [
  "#F294C0",
  "#4E1773",
  "#04BF9D",
  "#F2C230",
  "#F25430"
]

const s = {
  gridHW: hexesPerRow / 2 + 1,
  gridHH: 14,
  debugTile: false,
  radius: R,
  bgColor: "#000000",
  bgPatternColor: "#ffffff",
  bgDodgeColor: "#777777",
  bgMultilpyColor: "#46464661",
  bgPatternScale: 1.9,
  bgPatternProb: 0.95,
  bgNoiseAlpha: 125,
  marginThickness: 0.25,
  marginColor: "#ffffff",
};

// makestyles(color, weight, offset, style)
const styleCircuits = [
  // ...makeStyles(palette[0], strokeBaseWidth * 1.75, 6 * baseOffset, STYLES.CIRCUITS),
  // ...makeStyles(palette[0], strokeBaseWidth, 16 * baseOffset, STYLES.CIRCUITS),
  { color: "#ffffff", weight: strokeBaseWidth * 2, offset: 0 },
  // ...makeStyles("#ffffff", strokeBaseWidth * 0.2, baseOffset * 4),
  // ...makeStyles("#000000", strokeBaseWidth * 0.4, baseOffset * 6),
  // ...makeStyles("#000000", strokeBaseWidth * 0.4, baseOffset * 8),
  // ...makeStyles("#F25430", strokeBaseWidth, baseOffset * 14),
  // ...makeStyles("#4E1773", strokeBaseWidth, baseOffset * 18.5),
  // ...makeStyles("#000000", strokeBaseWidth * 0.2, baseOffset * 21),
  // {
  //   color: palette[cci],
  //   weight: strokeBaseWidth * 2,
  //   offset: 0,
  //   style: STYLES.LINES,
  // },
  // ...makeStyles(palette[1], strokeBaseWidth, baseOffset * 12),
];

const stylesFinal = [
  // ...makeStyles(palette[4], strokeBaseWidth, baseOffset * 14, STYLES.CIRCUITS),
];

const styles = styleCircuits;

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

let debug = false;
let canvas;

window.windowResized = function () {
  centerCanvas(canvas);
}

window.setup = function () {
  // setSeed(seedLeft);
  setSeed(1712622784340);
  noiseSeed(60189692);

  tileSettings.preventOverlap = false;
  tileSettings.angularJoins = false;
  tileSettings.drawEndCaps = false;
  
  tileSettings.noSolos = true;
  tileSettings.noOpposites = true;
  tileSettings.skipOpposites = true;
  tileSettings.skipSolos = true;
  tileSettings.multiPair = false;
  // tileSettings.circlePattern = true;
  // tileSettings.drawPathFunc = drawPathRandomized;

  strokeJoin(ROUND);

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

      /*
      const JOIN_TYPE_END = 1;
      const JOIN_TYPE_NEXT = 2;
      const JOIN_TYPE_SKIP = 4;
      const JOIN_TYPE_OPPOSITE = 8;
      */
      let probabilities = [0.1, 0.7, 0.5, 0]; // Custom probabilities for each join type
      let mask = generateRandomJoinArray(null, /* singleFlag */ false);
      // maskList.push(mask);
      maskList2D[y][x] = mask;

      // Random integer between [0,5]
      let turns = Math.floor(random() * 6);
      // turnList.push(turns);
      turnList2D[y][x] = turns;
      turnList2DAdjusted[y][x] = turns;
    }
  }

  // Symmetry in join types
  // for (let y = -s.gridHH; y <= s.gridHH; y++) {
  //   for (let x = -s.gridHW; x <= s.gridHW; x++) {
  //     maskList2D[y][x] = maskList2D[y][-x];
  //     turnList2D[y][x] = turnList2D[y][-x] + 3;
  //   }
  // }

  // // Center row of hexagons all have same pattern
  // for (let x = -s.gridHW; x <= s.gridHW; x++) {
  //   maskList2D[0][x] = defaultJoinMask;
  // }

  pixelDensity(pxDensity);

  canvas = createCanvas(w, h);
  centerCanvas(canvas);

  background(s.bgColor);

  bg = createGraphics(w, h);

  renderBg();
};

function drawMural(saveImages = false) {
    // Save the whole thing (should already have been rendered once)
    if (saveImages) {
        save("mural_" + getSeed() + ".png");
    }

    // Start with BG only
    image(bg, -hw, -hh);

    if (saveImages) {
        save("bg_" + getSeed() + ".png");

        // Clear bg so the pattern can be saved separately
        background(s.bgColor);
    }

    // Good stuff
    render();
    
    if (saveImages) {
        save("pattern_" + getSeed() + ".png");

        // Clear bg for margin only render
        // background(0);
        clear();
    }

    // Margin
    drawMargin(bg, marginCenter, s.marginThickness, s.marginColor);

    if (saveImages) {
        // Make transparent at the center

        save("margin_" + getSeed() + ".png");

        exportHexJsonOddr(hexListForExport, width, height, "hex_" + getSeed() + ".json");
    }
}

window.draw = function () {
  translate(hw, hh);
  drawMural();
  noLoop();
};

function renderBg() {
  bg.background(s.bgColor);

  return;

  bg.push();
  bg.translate(hw, hh);
  
  const rPoly = 1 * s.radius / 2;
  
  // draw hexes at half size
  for (let y = -s.gridHH + 9; y <= s.gridHH - 9 ; y++) {
    for (let x = -s.gridHW + 2; x <= s.gridHW - 2; x++) {
      if (((abs(y) % 2)== 1) && (x  > s.gridHW - 3)) {
        console.log("skip", x, y)
          continue;
      }

      const poly6 = new Polygon(vec2(0, 0), rPoly, 6, PI / 2);
      const q = hexToCartesianOddr(vec2(x, y), R);
      
      // Add extra alpha to hexes inside a circle
      const dR = q.mag() < R * 4;
      const isSpecial = dR > 0;
      
      if (random() > s.bgPatternProb && !isSpecial) {
        continue;
      }
      
      bg.push();
      bg.translate(q.x, q.y);
      bg.scale(s.bgPatternScale);
      
      bg.blendMode(BLEND);

      // bg.stroke(255);
      bg.noStroke();
      const patternFill = color(s.bgPatternColor);
      let alpha = random() * patternFill.levels[3] * 0.5;
      alpha = 0;
      let n = noise(q.x * 0.001, q.y * 0.001);
      n = n * n * n;
      alpha += n * s.bgNoiseAlpha;
      // alpha += isSpecial * 100 * dR / R;
      patternFill.setAlpha(alpha);
      bg.fill(patternFill);
      poly6.draw(bg);

      // bg.blendMode(MULTIPLY);

      alpha *= 0.5;
      // const mulColor = color(s.bgMultilpyColor);
      patternFill.setAlpha(alpha);
      bg.fill(patternFill);
      poly6.radius -= rPoly * 0.25;
      poly6.draw(bg);

      alpha *= 0.5;
      bg.fill(patternFill);
      poly6.radius -= rPoly * 0.25;
      poly6.draw(bg);

      bg.pop();
    }
  }

  // Draw some stupid rectangles to help AR detection
  bg.rotate(PI / 3);
  bg.blendMode(DODGE);
  const panelWidth = s.radius / 2 * 10 + getRes(0.5);
  bg.fill(s.bgDodgeColor);
  bg.noStroke();
  // bg.rect(-panelWidth / 2, -h, panelWidth, h * 2);

  bg.pop();
}


let waitCount = 0;

const hexListForExport = [];

function render(g) {
  const nf = 30;

  // Figure out which row to animate
  const t = (frameCount % nf) / nf;
  const d = 1 / nf;
  const n =
    (Math.floor(frameCount / nf - waitCount) % (s.gridHH * 2 + 1)) - s.gridHH;

  for (let y = -s.gridHH; y <= s.gridHH; y++) {
    for (let x = -s.gridHW; x <= s.gridHW; x++) {
      hexListForExport.push(hexList2D[y][x]);

      let addedTurns = 0;
      if (y == n) {
        turnList2DAdjusted[y][x] = easeInOutQuad(t + d) * 1 + turnList2D[y][x];
      } else {
        turnList2D[y][x] = Math.round(turnList2DAdjusted[y][x]);
      }

      const hex = hexList2D[y][x];
      const mask = maskList2D[y][x];

      let turns = turnList2DAdjusted[y][x];

      turns += addedTurns;

      stroke(255);
      strokeWeight(1);
      noFill();

      tileSettings.drawPathFunc = drawPath;

      // for (let style of styles) {
        drawHexTile(
          hex.center,
          hex.radius,
          /* tilemask */ mask,
          turns,
          styles,
          /* debugDraw */ debug
        );
      // }
    }

    // previousN = n;
  }

  // Draw final pass
  for (let y = -s.gridHH; y <= s.gridHH; y++) {
    for (let x = -s.gridHW; x <= s.gridHW; x++) {
      let addedTurns = 0;
      if (y == n) {
        turnList2DAdjusted[y][x] = easeInOutQuad(t + d) * 1 + turnList2D[y][x];
      } else {
        turnList2D[y][x] = Math.round(turnList2DAdjusted[y][x]);
      }

      const hex = hexList2D[y][x];
      const mask = maskList2D[y][x];

      let turns = turnList2DAdjusted[y][x];

      tileSettings.drawPathFunc = drawPath;

      for (let style of stylesFinal) {
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
  }

  if (s.debugTile) {
    const hex = { center: vec2(0, 0), radius: s.radius };

    // Clear out a circle in the center
    fill(10);
    stroke(255);
    strokeWeight(1);

    circle(0, 0, s.radius * 1.25);

    fill("green");

    drawHexTile(
      hex.center,
      hex.radius,
      /* tilemask */ defaultJoinMask,
      /* turns */ 0,
      styles[0],
      /* debugDraw */ true
    );
  }
}

export function drawPathRandomized(path, closed = false) {
  for (let i = 0; i < path.length - 1; i++) {
    let p0 = path[i];
    let p1 = path[i + 1];

    let off = random(-R, R) * 0.5;

    const dir = normalize2d(sub2d(p1, p0));
    const perp = vec2(dir.y, -dir.x);

    p0 = move(p0, dir, random(-R, R));
    p1 = move(p1, dir, random(-R, R));

    p0 = move(p0, perp, off);
    p1 = move(p1, perp, off);

    line(p0.x, p0.y, p1.x, p1.y);
  }
}

window.keyTyped = function () {
  if (key == "1") {
    s.debugTile = !s.debugTile;
  }

  if (key === "s") {
    // save("left_" + getSeed() + ".png");
    drawMural(true);
  }
};
