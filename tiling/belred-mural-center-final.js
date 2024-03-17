import { PI, normalize2d, sub2d, vec2 } from "../lumic/common.js";
import { Polygon, moveTowards, move, drawPath } from "../lumic/geomerty.js";
import {
  hexToCartesianOddr,
  drawHexTile,
  defaultJoinMask,
  generateRandomJoinArray,
  STYLES,
  tileSettings,
  exportHexJsonOddr,
} from "../lumic/hex.js";
import { easeInOutQuad } from "../lumic/easing.js";
import {
  sideWidth,
  muralHeight,
  paletteSide,
  makeStyles,
  drawMargin,
  marginDefault,
  fixedSeed,
  seedLeft,
  setSeed,
  getSeed,
  centerWidth,
  getRes,
  pxDensity,
  marginCenter,
} from "./belred.js";

const w = getRes(centerWidth);
const hw = w / 2;
const h = getRes(muralHeight);
const hh = h / 2;

let bg;

const palette = paletteSide;

const R = (0.75 * w) / 8;

const s = {
  gridHW: 3,
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

const styleCircuits = [
  // ...makeStyles(palette[0], strokeBaseWidth * 1.75, 6 * baseOffset, STYLES.CIRCUITS),
  // ...makeStyles(palette[0], strokeBaseWidth, 16 * baseOffset, STYLES.CIRCUITS),
  {
    color: palette[cci],
    weight: strokeBaseWidth * 3,
    offset: 0,
    style: STYLES.LINES,
  },
  {
    color: palette[cci],
    weight: strokeBaseWidth * 1.5,
    offset: 0,
    style: STYLES.CIRCUITS,
  },
  ...makeStyles(palette[1], strokeBaseWidth, baseOffset * 12),
];

const stylesFinal = [
  ...makeStyles(palette[4], strokeBaseWidth, baseOffset * 14, STYLES.LINES),
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

window.setup = function () {
  setSeed(seedLeft);

  tileSettings.noSolos = false;
  tileSettings.preventOverlap = true;
  // tileSettings.circlePattern = true;
  tileSettings.angularJoins = false;
  tileSettings.drawPathFunc = drawPathRandomized;
  tileSettings.drawEndCaps = false;

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

      let probabilities = [0.2, 0.7, 0.5, 0.5]; // Custom probabilities for each join type
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
  for (let y = -s.gridHH; y <= s.gridHH; y++) {
    for (let x = -s.gridHW; x <= s.gridHW; x++) {
      maskList2D[y][x] = maskList2D[y][-x];
      turnList2D[y][x] = turnList2D[y][-x] + 3;
    }
  }

  // Center row of hexagons all have same pattern
  for (let x = -s.gridHW; x <= s.gridHW; x++) {
    maskList2D[0][x] = defaultJoinMask;
  }

  pixelDensity(pxDensity);

  createCanvas(w, h);

  bg = createGraphics(w, h);

  renderBgSine();
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
        background(palette[bci]);
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
    drawMargin(bg, marginCenter, palette);

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
