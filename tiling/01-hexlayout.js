import { getUrlParam, PI, TAU, vec2 } from "../lumic/common.js";
import { Polygon } from "../lumic/geomerty.js";
import { getHexRing, hexToCartesianAxial, hexToCartesianOddr, drawHexOddR, drawHexTile, defaultJoinMask, generateRandomJoinArray } from "../lumic/hex.js";
import { getColor, vibrantTheme } from "../lumic/palettes.js";

const scaler = 0.75;
const w = 700 * scaler;
const hw = w / 2;
const h = 1600 * scaler;
const hh = h / 2;


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
    "#FFFFFF",
    "#3fa1fe",
    "#0170e2",
    "#c9ade1",
    "#e41ee0",
];

const palette = palette2;

const R = 80;

const s = {
    gridHW: 3,
    gridHH: 8,
    debugTile: false,
    radius: R * scaler,
    bgColor: palette[1],
}

const styles = [
    { color: palette[2], weight: R / 10 * scaler, offset: 0 },
    ...makeStyles(palette[2], R / 20 * scaler, 8 * scaler),
    ...makeStyles(palette[0], R / 20 * scaler, 16 * scaler),
    ...makeStyles(palette[1], R / 20 * scaler, 12 * scaler),
    // ...makeStyles(palette[3], 4, 8),
]

let g;
let seed;

window.setup = function () {
    // seed from time
    seed = Date.now();
    console.log(seed);

    createCanvas(w, h);
};

window.draw = function () {
    translate(hw, hh);
    render();
    noLoop();
};

function render(g) {
    background(s.bgColor);

    const hexes = [];

    // A grid of hexagons in the odd-r coordinate system
    for (let x = -s.gridHW; x <= s.gridHW; x++) {
        for (let y = -s.gridHH; y <= s.gridHH; y++) {
            hexes.push({ center: vec2(x, y), radius: s.radius });
        }
    }

    for (const hex of hexes) {
        stroke(255);
        strokeWeight(1);
        noFill();

        // drawHexOddR(hex.center, hex.radius);

        let probabilities = [0.2, 0.7, 0.5, 0.5]; // Custom probabilities for each join type
        let mask = generateRandomJoinArray(null, /* singleFlag */ false);
        // mask = defaultJoinMask;

        // Random integer between [0,5]
        let turns = Math.floor(Math.random() * 6);

        for (let style of styles) {
            drawHexTile(hex.center, hex.radius, /* tilemask */ mask, turns, style, /* debugDraw */ false);
        }
    }

    if (s.debugTile) {
        const hex = { center: vec2(0, 0), radius: s.radius}

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
