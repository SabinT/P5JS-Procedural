// Segments jump between sections of the butterfly

import { TAU, cart2Polar, getRandom, lerp, scale2d, sizes, vec2, vlerp } from "../lumic/common.js";
import { Polygon, drawPath, exportSVG } from "../lumic/geomerty.js";
import { renderGrid } from "../lumic/grids.js";
import { butterfly, hypotrochoid } from "../lumic/parametric.js";
import * as pal from "../lumic/palettes.js";
import { drawPageBorder } from "../lumic/borders.js";
import { polarBox, polarLine } from "../lumic/mandala.js";

let palette = pal.galaxyTheme;

let pts = [];
let lines = [];

function render() {
    // clear();
    background("#181818");

    translate(width / 2, height / 2);

    scale(100);

    const f = butterfly;

    //   const tStepMin = -0.5;
    //   const tStepMax = 0.5;



    
    noFill();
    stroke(255);

    strokeWeight(0.01);
    scale(1, -1);
    
    // beginShape(LINES);
    
    
    const shiftMin = 1
    const shiftMax = 15
    
    const onCurveStepMin = 20;
    const onCurveStepMax = 100;
    
    const n = 4000;
    let steps = 0;
    const tStep = 0.075;

    let tOffset = Math.floor(random(shiftMin, shiftMax)) * TAU;
    let breakTime = Math.floor(random(onCurveStepMin, onCurveStepMax));

    const rMin = 0.1;
    const rMax = 0.5;

    let tPrev = 0;
    let currentPts = [];
    for (let i = 1; i <= n; i++) {
        let t = TAU * i * tStep;

        if (steps >= breakTime) {
            const p = f(tPrev);
            const q = f(t + tOffset);

            const w = Math.abs(p.x - q.x);
            const h = Math.abs(p.y - q.y);
            const ar = w / h;

            let tooClose = false;

            // if (ar > 0.7 && ar < 1.5) {
            if (!tooClose) {
                const center = lerp(p, q, 0.5);
                const dia = Math.min(w, h);

                stroke(255);
                circle(center.x, center.y, dia);

                if (random() > 0.5) {
                    // circle(p.x, p.y, 0.05);
                }
                
                tOffset = Math.floor(random(shiftMin, shiftMax)) * TAU;
                breakTime = Math.floor(random(onCurveStepMin, onCurveStepMax));
                steps = 0;

                if (currentPts.length > 1) {
                    lines.push(currentPts);
                    currentPts = [currentPts[currentPts.length - 1]];
                }
                // stroke(random(palette.colors))
            }
        }

        const p = f(t + tOffset + Math.floor((noise(t * 2)) * 15) * TAU);
        
        // vertex(p.x, p.y);
        pts.push(p);
        currentPts.push(p);
        
        tPrev = t;
        t += tStep;
        steps++;
    }

    if (currentPts.length > 1) {
        lines.push(currentPts);
    }

    noFill();
    drawPath(pts, false);

    // endShape();

    //   circle(450, 600, 100);
}

window.setup = function () {
    // createCanvas(900, 1200, SVG);
    createCanvas(900, 1200);
    // pixelDensity(1);
    render();
    // clear();
};

window.draw = function () { 
    const f = frameCount - 30;

    if (f == 0) {
        clear();
    }

    if (f < 1) {
        return;
    }

    if (f >= pts.length - 1) {
        noLoop();
        return;
    }

    const pointsPerFrame = 100


    // clear();

    translate(width / 2, height / 2);
    scale(100, -100);

    stroke(255);
    strokeWeight(0.01);


    // const p = pts[f];
    // const q = pts[f + 1];

    // line(p.x, p.y, q.x, q.y);

    

    for (let i = 0; i < pointsPerFrame; i++) {
        const p = pts[f * pointsPerFrame + i];
        const q = pts[f * pointsPerFrame + i + 1];

        line(p.x, p.y, q.x, q.y);
        // line(p.x, p.y, q.x, q.y);
        // vertex(p.x, p.y);
    }


};

window.keyTyped = function () {
    if (key === "s") {
        const dateStr = new Date().toISOString();
        const filename = `butt-${dateStr}.svg`;
        const pngFilename = `butt-${dateStr}.png`;
        save(pngFilename);

        // Use date/time for unique filenames

        const paths = [pts];

        exportSVG(lines, filename, `${width / 100}`, `${height / 100}`,
            vec2(4.5, 6), scale2d(vec2(1,-1), 80));
    }

    if (key === "r" || key === "R") {
        render();
    }
};
