import { getUrlParam, PI, TAU, vec2 } from "../lumic/common.js";
import { Polygon } from "../lumic/geomerty.js";
import { getHexRing, hexToCartesianAxial, hexToCartesianOddr, drawHexOddR, drawHexTile, defaultJoinMask, generateRandomJoinArray } from "../lumic/hex.js";
import { getColor, vibrantTheme } from "../lumic/palettes.js";
import { easeInOutQuad, easeOutElastic } from "../lumic/easing.js";

const scaler = 0.75;
const w = 700 * scaler;
const hw = w / 2;
const h = 1600 * scaler;
const hh = h / 2;

let bg;

function makeStyles(color, weight, offset) {
    return [
        { color: color, weight: weight, offset: offset },
        { color: color, weight: weight, offset: -offset },
    ];
}

const palette1 = [
    "#FFFFFF",
    "#ff00d0",
    "#14D9D9",
    "#1573bf",
    "#F27EDF",
];

const palette2 = [
    "#3fa1fe",
    "#FFFFFF",
    "#0170e2",
    "#e5c7ff",
    "#e41ee0",
];

const palette3 = [
    "#7078FF",
    "#FCFCFC",
    "#5218ED",
    "#C670FF",
    "#DD0275",
];

const palette4 = [
    "#7078FF",
    "#FCFCFC",
    "#5218ED",
    "#01ab70",
    "#02c4dd",
];

const palette = palette4;

const R = w / 8;

const s = {
    gridHW: 4,
    gridHH: 8,
    debugTile: false,
    radius: R * scaler,
    bgColor: palette[1],
    bgPatternColor: palette[3],
}

const strokeBaseWidth = R / 20 * scaler;

const styles = [
    { color: palette[2], weight: strokeBaseWidth * 2, offset: 0 },
    ...makeStyles(palette[0], strokeBaseWidth * 1.75, 6 * scaler),
    // ...makeStyles(palette[1], strokeBaseWidth, 12 * scaler),
    ...makeStyles(palette[2], strokeBaseWidth, 16 * scaler),
    ...makeStyles(palette[4], strokeBaseWidth, 14 * scaler),
]

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
            let turns = Math.floor(Math.random() * 6);
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

    // seed from time
    seed = Date.now();
    console.log(seed);

    createCanvas(w, h);

    bg = createGraphics(w, h);

    renderBg();
};

window.draw = function () {
    translate(hw, hh);
    randomSeed(seed);
    render();
    // noLoop();
};

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
                    if (r <= 0) { break; }

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
    // draw bg onto canvas
    image(bg, -hw, -hh);

    // framerate(30);

    const nf = 15;

    // Figure out which row to animate
    const t = (frameCount % nf) / nf;
    const d = 1 / nf;
    const n = Math.floor(frameCount / nf - waitCount) % (s.gridHH * 2 + 1) - s.gridHH;

    if (previousN != n) {
        cycleWaitTime = 0;
        cycleWaitActive = true;
    }

    if (cycleWaitActive) {
        cycleWaitTime += deltaTime / 1000;
        if (cycleWaitTime > 0.5) {
            cycleWaitActive = false;
            waitCount += 1;
        }
        return;
    }

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

            for (let style of styles) {
                drawHexTile(hex.center, hex.radius, /* tilemask */ mask, turns, style, /* debugDraw */ false);
            }
        }

        previousN = n;
    }

    if (s.debugTile) {
        const hex = { center: vec2(0, 0), radius: s.radius }

        // Clear out a circle in the center
        fill(10);
        stroke(255);
        strokeWeight(1);

        circle(0, 0, s.radius * 1.25);


        fill("green");

        drawHexTile(hex.center, hex.radius, /* tilemask */ defaultJoinMask, /* turns */ 0, styles[0], /* debugDraw */ true);
    }
}

window.keyTyped = function () {
    if (key == "1") {
        s.debugTile = !s.debugTile;
    }

    if (key === "s") {
        save("hex_" + seed + ".png");
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
