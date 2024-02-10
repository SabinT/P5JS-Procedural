import { TAU, polar2cart, line2D, vec2, add2d, scale2d, cart2Polar } from "./lumic/common.js";
import { easeOutElastic, easeOutQuad, smoothstep } from "./lumic/easing.js";

const w = 1000;
const hw = w / 2;
const h = 1000;
const hh = h / 2;

let g;

const debug = false;

const nRings = 15;
const nRingPtsPerUnitArea = 2;
const ringWidth = 0.8 * hw / nRings;
const nRifts = 55;
const pEdgeRift = 0.1; // prob that rift ends at the end of outermost ring
const pStopRift = 0.5; // prob that rift ends at a ring
const riftStartRange = [3, nRings * 0.5]; // unit = ring
const riftLenRange = [0.1, nRings]; // unit = ring
const nRiftPts = 30;
// const densityRamp = easeOutQuad;
const densityRamp = function (t) {
    return Math.pow(t, 2.5);
}

const riftRamp = function (t) {
    return smoothstep(1, 0, abs((t * 2 - 1)))
}

let rifts = [];

// input: polar, output: polar
function distortGlobal(v) {
    let cart = polar2cart(v);
    let p = scale2d(cart, 0.02);
    const noiseX = noise(p.x, p.y, 12358) - 0.5;
    const noiseY = noise(p.x, p.y, 12359) - 0.5;
    cart = add2d(cart, scale2d(vec2(noiseX, noiseY), 20));
    return cart2Polar(cart);
}

function createRifts() {
    for (let i = 0; i < nRifts; i++) {
        let riftStart, riftEnd, riftAngle;

        riftStart = Math.random() * (riftStartRange[1] - riftStartRange[0]) + riftStartRange[0]; // unit = ring
        riftEnd = riftStart + Math.random() * (riftLenRange[1] - riftLenRange[0]) + riftLenRange[0]; // radius, unit = ring
        riftAngle = Math.random() * TAU;

        if (riftStart > riftEnd) {
            [riftStart, riftEnd] = [riftEnd, riftStart];
        }

        if (pEdgeRift > Math.random()) {
            riftEnd = nRings;
        }

        if (pStopRift > Math.random()) {
            riftEnd = Math.round(riftEnd);
        }

        // Create a noisy "outline" for the rift as two wobbly lines
        const leftPts = [];
        const rightPts = [];

        // March from start to end and displace with two separate noise functions
        const maxAngleDisplace = 2 * TAU / 360;
        let cumulativeCenterDisplacement = 0;
        for (let j = 0; j < nRiftPts; j++) {
            const t = j / (nRiftPts - 1);
            const r = lerp(riftStart, riftEnd, t) * ringWidth;

            // 0 at start and end
            const riftWidthNorm = riftRamp(t);

            const center = vec2(r, riftAngle);

            const noiseA = noise(r, riftAngle, 0) * riftWidthNorm;
            const noiseB = noise(r, riftAngle, 10) * riftWidthNorm;
            const noiseAvg = (noiseA + noiseB) / 2;

            const left = add2d(center, vec2(0, -maxAngleDisplace * noiseA));
            const right = add2d(center, vec2(0, maxAngleDisplace * noiseB));

            cumulativeCenterDisplacement += noiseAvg;
            leftPts.push(left);
            rightPts.push(right);
        }


        rifts.push({ start: riftStart, end: riftEnd, angle: riftAngle, left: leftPts, right: rightPts });
    }
}

function drawRifts() {
    // Visualize rifts
    for (let i = 0; i < rifts.length; i++) {
        const rift = rifts[i];

        // Visualize the noisy outline
        noStroke();
        fill("black");
        beginShape();
        for (let j = 0; j < rift.left.length; j++) {
            let pt = rift.left[j];
            pt = distortGlobal(pt);
            pt = polar2cart(pt);
            vertex(pt.x, pt.y);
            // point(pt.x, pt.y);
        }
        for (let j = rift.right.length - 1; j >= 0; j--) {
            let pt = rift.right[j];
            pt = distortGlobal(pt);
            pt = polar2cart(pt);
            vertex(pt.x, pt.y);
            // point(pt.x, pt.y);
        }
        endShape(CLOSE);
    }
}

function drawRing(i) {
    const rStart = i * ringWidth;
    const rEnd = (i + 1) * ringWidth;

    stroke("white");

    // Calculate optimal number of points according to area of annular region
    const area = Math.PI * (rEnd * rEnd - rStart * rStart);
    const nPtsPerRing = Math.round(area * nRingPtsPerUnitArea);
    console.log(`nPtsPerRing: ${nPtsPerRing}`);

    // Plot points randomly within ring, density according to probability ramp
    for (let j = 0; j < nPtsPerRing; j++) {
        const angle = Math.random() * TAU;
        const r = Math.random() * (rEnd - rStart) + rStart;
        const t = map(r, rStart, rEnd, 0, 1);

        if (densityRamp(t) > Math.random()) {
            let pt = vec2(r, angle);
            pt = distortGlobal(pt);
            pt = polar2cart(pt);
            point(pt.x, pt.y);
        }
    }
}


function render(g) {
    push();
    translate(hw, hh);

    if (debug) {
        // Visualize rings
        stroke("white");
        noFill();
        for (let i = 0; i < nRings; i++) {
            // Draw circle point by point
            const rEnd = (i + 1) * ringWidth;
            const nPts = 100;
            beginShape();
            for (let j = 0; j < nPts; j++) {
                const t = j / nPts;
                const angle = t * TAU;
                let pt = vec2(rEnd, angle);
                pt = distortGlobal(pt);
                pt = polar2cart(pt);
                vertex(pt.x, pt.y);
            }
            endShape(CLOSE);
        }

        // Visualize rifts
        for (let i = 0; i < rifts.length; i++) {
            const rift = rifts[i];
            const start = rift.start * ringWidth;
            const end = rift.end * ringWidth;
            const angle = rift.angle;

            const a = polar2cart(vec2(start, angle));
            const b = polar2cart(vec2(end, angle));
            console.log(`a: ${a}, b: ${b}`);
            stroke("red");
            line2D(a, b);

            // Visualize the noisy outline
            stroke("yellow");
            fill("black");
            beginShape();
            for (let j = 0; j < rift.left.length; j++) {
                let pt = rift.left[j];
                pt = distortGlobal(pt);
                pt = polar2cart(pt);
                vertex(pt.x, pt.y);
                // point(pt.x, pt.y);
            }
            for (let j = rift.right.length - 1; j >= 0; j--) {
                let pt = rift.right[j];
                pt = distortGlobal(pt);
                pt = polar2cart(pt);
                vertex(pt.x, pt.y);
                // point(pt.x, pt.y);
            }
            endShape(CLOSE);
        }
    }

    // Draw the rings
    for (let i = 0; i < nRings; i++) {
        drawRing(i);
    }

    drawRifts();

    pop();
}

window.setup = function () {
    createCanvas(w, h);

    createRifts();

    console.log(rifts);
};

window.draw = function () {
    background(0);
    render(g);
    noLoop();
};

window.keyTyped = function () {
    if (key === "s") {
        const filename = debug ? "treerings_debug.png" : "treerings.png";
        save(filename);
    }
};
