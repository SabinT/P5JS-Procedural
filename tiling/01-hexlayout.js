import { getUrlParam, PI, TAU, vec2 } from "../lumic/common.js";
import { Polygon } from "../lumic/geomerty.js";
import { getHexRing, hexToCartesianAxial, hexToCartesianOddr, drawHexOddR, drawHexTile, defaultJoinMask, generateRandomJoinArray } from "../lumic/hex.js";
import { getColor, vibrantTheme } from "../lumic/palettes.js";

const s = {
    gridHW: 4,
    gridHH: 8,
    debugTile: true,
    radius: 40
}

const scaler = 0.8;
const w = 700 * scaler;
const hw = w / 2;
const h = 1600 * scaler;
const hh = h / 2;

let g;

window.setup = function () {
    createCanvas(w, h);
    frameRate(60);
};

window.draw = function () {
    translate(hw, hh);
    render();
    noLoop();
};

function render(g) {
    background(10);

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

        drawHexTile(hex.center, hex.radius, /* tilemask */ mask, turns, /* debugDraw */ true);
    }

    if (s.debugTile) {
        const hex = { center: vec2(0, 0), radius: s.radius}

        // Clear out a circle in the center
        fill(10);
        stroke(255);
        strokeWeight(1);

        circle(0, 0, s.radius * 1.25);


        fill("green");

        drawHexTile(hex.center, hex.radius, /* tilemask */ defaultJoinMask, /* turns */ 0, /* debugDraw */ true);
    }
}

window.keyTyped = function () {
    if (key == "1") {
        s.debugTile = !s.debugTile;
    }

    if (key === "s") {
        save();
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
