import { dist2d, getRandom, line2D, scale2d, sizes, vec2 } from "../lumic/common.js";
import { exportGroupsToSVG, exportSVG, intersectLineCircle } from "../lumic/geomerty.js";
import { cyberpunkTheme, getRandomColor, greenTheme } from "../lumic/palettes.js";
import { sdHeart } from "../lumic/sdf.js";

let circles = [];
let fillLines = [];
let linesGrouped = [];
const LINE_GROUP_COUNT = 10;
const maxIterations = 100000;
const MAX_RADIUS = 30;
const MIN_RADIUS = 5;
const SDF_THRESHOLD = 1000;
const MARGIN_BY_SDF = 0.04;
const PAGE_MARGIN = 20;
const LINE_SEPARATION = 8;
const debugMode = false;

function map(p) {
    const scale = 300;
    //p = p5.Vector.add(p, vec2(-width/2, -height/2));
    p = p5.Vector.mult(p, -1 / scale);
    p = p5.Vector.add(p, vec2(0, 0.6));
    return sdHeart(p) * scale;
}

function debugSdf() {
    const interval = 10;
    noFill();
    for (let x = -width / 2; x < width / 2; x += interval) {
        for (let y = -height / 2; y < height / 2; y += interval) {
            let d = map(vec2(x, y));
            fill(abs(d * 100));
            if (d > 0) {
                circle(x, y, interval / 2);
            }
        }
    }
}

function pack() {
    noStroke();

    // circles.push({ center: vec2(0, 0), radius: 100 })

    let i = 0;
    while (i < maxIterations) {
        let p = vec2(random(-0.5, 0.5) * width, random(-0.5, 0.5) * height);

        // Max possible circle size according to the SDF
        let maxD = map(p);
        const margin = maxD * MARGIN_BY_SDF;

        if (maxD > margin && maxD < SDF_THRESHOLD) {
            // Intersect withe existing circles
            for (const circ of circles) {
                const d = dist2d(p, circ.center) - circ.radius - margin;
                maxD = min(d, maxD);
            }

            if (maxD > MIN_RADIUS && maxD < MAX_RADIUS) {
                // Measure distance to margin
                const left = -width / 2 + PAGE_MARGIN;
                const right = width / 2 - PAGE_MARGIN;
                const top = -height / 2 + PAGE_MARGIN;
                const bottom = height / 2 - PAGE_MARGIN;

                // dist to margin
                const dLeft = p.x - left;
                const dRight = right - p.x;
                const dTop = p.y - top;
                const dBottom = bottom - p.y;

                // if any negative, it's outside
                if (dLeft < 0 || dRight < 0 || dTop < 0 || dBottom < 0) {
                    i++;
                    continue;
                }

                maxD = min([maxD, abs(dLeft), abs(dRight), abs(dTop), abs(dBottom)])

                if (maxD > MIN_RADIUS) {
                    circles.push({ center: p, radius: maxD });
                }
            }
        }

        i++;
    }

    // Generate fill lines
    circles.forEach((c) => {
        fillLines.push(...getCircleFillLines(c, LINE_SEPARATION, 0));
    });

    // randomly bucket into 3 groups
    linesGrouped = [[], [], []]
    fillLines.forEach((line) => {
        linesGrouped[Math.floor(random(0, linesGrouped.length))].push(line);
    });

    console.log(circles);

    //   drawCircles();

    stroke(255);
    drawFillLines();
}

function getCircleFillLines(circle, lineSeparation, angle) {
    // Global lines array
    let lines = [];
    let hatchPadding = 2;

    const dy = lineSeparation;
    for (let y = -height / 2; y < height / 2; y += dy) {
        if (Math.abs(circle.center.y - y) < circle.radius - hatchPadding) {
            const right = vec2(width / 2, y);
            const left = vec2(-width / 2, y);
            const p = intersectLineCircle(right, left, circle.center, circle.radius);

            if (p) {
                lines.push(p);
            }
        }
    }

    // Do the same but vertical lines
    const dx = lineSeparation;
    for (let x = -width / 2; x < width / 2; x += dx) {
        if (Math.abs(circle.center.x - x) < circle.radius - hatchPadding) {
            const top = vec2(x, height / 2);
            const bottom = vec2(x, -height / 2);
            const p = intersectLineCircle(top, bottom, circle.center, circle.radius);

            if (p) {
                lines.push(p);
            }
        }
    }

    return lines;
}

function drawFillLines() {
    // fillLines.forEach((line) => {
    //     line2D(line[0], line[1]);
    // });

    linesGrouped.forEach((group) => {
        stroke(getRandomColor(greenTheme));
        group.forEach((line) => {
            line2D(line[0], line[1]);
        });
    });
}

function drawCircles() {
    fill(color(50, 50, 50, 50));
    stroke(255);
    circles.forEach((c) => {
        fill(getRandomColor(cyberpunkTheme));
        circle(c.center.x, c.center.y, 2 * c.radius);
    });
}

window.setup = function () {
    const dims = sizes.nineTwelve;
    createCanvas(dims.w, dims.h);
    background(10);
    translate(width / 2, height / 2);
    pack();
};

window.draw = function () {
    if (debugMode) {
        background(0);
        translate(width / 2, height / 2);

        debugSdf();

        fill(color(50, 50, 50, 50));
        stroke(255);
        circles.forEach((c) => {
            circle(c.center.x, c.center.y, 2 * c.radius);
        });

        const mx = mouseX - width / 2;
        const my = mouseY - height / 2;
        let d = -map(vec2(mx, my));

        fill("white");
        text(`"D: ${d}M: ${mx},${my}"`, mx, my);
        noFill();
        stroke("red");
        circle(mx, my, 2 * d);
    }
};

window.keyTyped = function () {
    if (key === "s") {
        const timeStr = new Date().toISOString();
        const pngFilename = `heartcirc-${timeStr}.png`;
        const svgFilePrefix = `heartcirc-${timeStr}`;

        save(pngFilename);

        // linesGrouped.forEach((lines, i) => {
        //     const filename = `${svgFilePrefix}-${i}.svg`;
        //     exportSVG(lines, filename,
        //         `${width / 100}in`, `${height / 100}in`,
        //         vec2(4.5 * 72, 6 * 72), scale2d(vec2(1, 1), 72/100));
        // });

        exportGroupsToSVG(linesGrouped, `heartcirc-${timeStr}.svg`,
            `${width / 100}`, `${height / 100}`,
            vec2(4.5, 6), scale2d(vec2(1, 1), 1 / 100));
    }
};
