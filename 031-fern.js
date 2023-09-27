import { add2d, line2D, mul2d, ray2D, rot2dDeg, sub2d, transform, vec2, normalize2d, rot2d, scale2d, cloneVec2, DEG2RAD, PI } from "./lumic/common.js";
import { angleNormPi, drawShape, getOuterTangents, outerTangentPath, signedAngle, smoothPath } from "./lumic/geomerty.js";
import { ladderize, defaultLadderSettings, drawLadder, resampleShrinking } from "./lumic/ladder.js";

let origin;
let forward;
let debugDraw = true;
let maxLevels = 2;

function init() {
    origin = vec2(0, 400);
    forward = vec2(0, -1);
}

const baseOptions = {
    fBend: 5,
    bendByStep: 0,
    stepDist: 120,
    scalePerStep: 0.9,
    attenuateSegments: 0.6,
    maxDist: 1000,
    segments: 8,
    level: 0,
    emitInterval: 1,
    emitAngleStepDegrees: 9,
}

const L0 = {
    ...baseOptions,
    segments: 6,
    emitAngleStepDegrees: 13,
}

const L1 = {
    ...baseOptions,
    bendByStep: 0,
    segments: 13,
    scalePerStep: 0.875,
    stepDist: 50,
    maxDist: 500,
    level: 1,
    emitAngleStepDegrees: 5,
    emitProb: (x,y) => {
        return map(y, height / 2, -height / 2, 1 , 0.75);
    }
}

const L2 = {
    ...baseOptions,
    segments: 3,
    bendByStep: 0,
    scalePerStep: 0.9,
    stepDist: 30,
    maxDist: 500,
    level: 2
}

const L3 = {
    ...L2,
    segments: 2,
}

const allOptions = [
    L0,
    L1,
    L2,
    L3
]

function nextLevelOptions(options) {
    if (options.level < allOptions.length - 1) {
        return {...allOptions[options.level + 1]};
    }

    return {...options};
}

const ladder0 = {
    smoothBefore: 5,
    smoothAfter: 1,
    resampleDistByLengthRemaining: d => {
        return 5 + d / 5;
    },
    distToLadderWidth: d => {
        return pow(d, 0.9) * 0.2;
    },
    distToLadderCircleRadius: d => {
        return pow(d, 0.91) * 0.2;
    }
}

const ladder1 = {
    smoothBefore: 5,
    smoothAfter: 1,
    resampleDistByLengthRemaining: d => {
        return 5 + d / 10;
    },
    distToLadderWidth: d => {
        return d * 0.4;
    },
    distToLadderCircleRadius: d => {
        return d * 0.2;
    }
}

const ladder2 = {
    smoothBefore: 5,
    smoothAfter: 1,
    resampleDistByLengthRemaining: d => {
        return 5 + d / 2;
    },
    distToLadderWidth: d => {
        return d * 0.2;
    },
    distToLadderCircleRadius: d => {
        return d * 0.25;
    }
}

const ladder3 = {...ladder2}

const allLadders = [
    ladder0,
    ladder1,
    ladder2,
    ladder3
];

class Frame2D {
    constructor(origin, forward, debugDraw = false) {
        this.origin = cloneVec2(origin);
        this.forward = normalize2d(forward);
        this.normal = vec2(-forward.y, forward.x);

        this.debugDraw = debugDraw;
    }

    rotate(angleRad) {
        this.forward = rot2d(this.forward, angleRad);
        this.normal.x = -this.forward.y;
        this.normal.y = this.forward.x;
    }

    move(dist) {
        const newOrigin = add2d(this.origin, scale2d(this.forward, dist));

        if (this.debugDraw) {
            stroke("#534e4e")
            line2D(this.origin, newOrigin);

            stroke("#0000aa")
            fill("#534e4e")
            circle(this.origin.x, this.origin.y, 5)
        }

        this.origin = newOrigin;
    }

    rotateTowards(target, maxAngleRad) {
        let angle = signedAngle(this.forward, target);
        angle = angleNormPi(angle);
        const sign = Math.sign(angle);
        const angleAbs = Math.abs(angle);
        const angleClamped = Math.min(angleAbs, maxAngleRad);
        const angleClampedSigned = sign * angleClamped;

        this.rotate(angleClampedSigned);
    }
}

class FernCursor {
    constructor(fern, parent, options, frame, debugDraw = false) {
        this.fern = fern;
        this.forward = cloneVec2(frame.forward);
        this.options = options;

        this.frame = frame;

        this.path = [cloneVec2(frame.origin)];

        this.step = 0;

        this.generator = this.stepSimulateGen();

        this.totalDist = 0;
        this.totalSegments = 0;
        this.debugDraw = debugDraw;

        this.emitSide = 1;
        this.currentScale = 1;

        if (parent) {
            this.parent = parent;
            this.currentScale = this.parent.currentScale
            if (isNaN(this.currentScale)) {
                debugger;
            }
        }
    }

    getLastTangent() {
        if (this.path.length < 2) {
            return this.forward;
        }

        const last = this.path[this.path.length - 1];
        const secondLast = this.path[this.path.length - 2];
        return normalize2d(sub2d(last, secondLast));
    }

    stepSimulate() {
        //this.generator.next();
        const { done } = this.generator.next();

        return !done;
    }

    *stepSimulateGen() {
        while (this.totalDist < this.options.maxDist && this.step < this.options.segments) {
            // Rotate, execute tropisms
            if (this.parent != null) {
                this.frame.rotateTowards(this.parent.getLastTangent(), this.options.fBend * DEG2RAD)
            }

            if (this.options.bendByStep) {
                this.frame.rotate(this.options.bendByStep * DEG2RAD);
            }

            this.currentScale *= this.options.scalePerStep;
            if (isNaN(this.currentScale)) {
                debugger;
            }

            // const moveDist = Math.pow(this.options.attenuateStep, this.step) * this.options.stepDist;
            const moveDist = this.options.stepDist * this.currentScale;

            this.frame.move(moveDist);
            this.path.push(cloneVec2(this.frame.origin));

            this.totalDist += moveDist;
            this.step++;

            if (this.step % this.options.emitInterval == 0 && this.options.level < maxLevels) {
                if (this.options.emitProb) {
                    const prob = this.options.emitProb(this.frame.origin.x, this.frame.origin.y);
                    if (Math.random() > prob) {
                        continue;
                    }
                }

                let emitAngleOffset = this.step * this.options.emitAngleStepDegrees * DEG2RAD;
                emitAngleOffset = Math.min(emitAngleOffset, PI / 2)

                const opt = nextLevelOptions(this.options);
                // opt.segments = this.options.segments * this.options.attenuateSegments;
                const f = new Frame2D(this.frame.origin, rot2d(this.frame.forward, this.emitSide * (PI / 2 - emitAngleOffset)), this.debugDraw);
                const newCur = new FernCursor(this.fern, this.parent, opt , f, this.debugDraw);
                newCur.parent = this;
                this.fern.addCursor(newCur);
                
                if (this.options.level == 0) {
                    // emit on both sides
                    const opt2 = nextLevelOptions(this.options);
                    // opt2.segments = this.options.segments * this.options.attenuateSegments;
    
                    const f2 = new Frame2D(this.frame.origin, rot2d(this.frame.forward, -this.emitSide * (PI / 2 - emitAngleOffset)), this.debugDraw);
                    const newCur2 = new FernCursor(this.fern, this.parent, opt2 , f2, this.debugDraw);
                    newCur2.parent = this;
                    this.fern.addCursor(newCur2);
                }

                this.emitSide *= -1;
            }

            yield null;
        }
    }
}

class Fern {
    constructor(origin, forward, debugDraw = false) {
        this.origin = origin;
        this.forward = forward;
        this.curs = []

        this.curs.push(new FernCursor(this, null, L0, new Frame2D(origin, forward, debugDraw), debugDraw));

        this.cursToAdd = [];

        this.generator = this.stepSimulateGen();
    }

    stepSimulate() {
        const { done } = this.generator.next();

        return !done;
    }

    addCursor(cursor) {
        if (cursor == null) {
            // breakpoint
            debugger;
        }

        this.cursToAdd.push(cursor);
    }

    // Generator function for step simulation
    *stepSimulateGen() {
        while (1) {
            let allDone = true;
            for (let cur of this.curs) {
                const done = cur.stepSimulate();
                allDone = allDone && !done;
            }

            if (allDone && this.cursToAdd.length == 0) {
                break;
            }

            yield null;

            this.curs.push(...this.cursToAdd);
            this.cursToAdd = [];
        }
    }

    drawDebugInfo() {
        const rectx = -300;
        const recty = 0;
        // Count of cursors
        stroke(255)
        fill(0)
        // rect(-100, 0, 50, 20);
        rect(rectx, recty, 50, 20);
        fill(255);
        noStroke();
        text(this.curs.length.toString(), rectx + 15, recty + 15);
        // text(this.curs.length.toString(), -80, 15);
    }
}

let fern;

window.setup = function () {
    init()

    fern = new Fern(origin, forward, debugDraw);

    createCanvas(1000, 1000);
    background(0);

    noLoop()
}

const fillColors = ["#ff4ded84", "#ffbf006d", "#00b7ff6c"]
const strokeColors = ["#ffffff", "#ffffff", "#ffffff"]


window.draw = function () {
    translate(width / 2, height / 2)
    // background(0);

    const remaining = fern.stepSimulate();

    fern.drawDebugInfo();

    if (remaining) {
        setTimeout(redraw, 10)
    } else {
        // make ladder
        for (let cur of fern.curs) {
            const level = cur.options.level
            const ladderSettings = allLadders[level];

            let smoothed = smoothPath(cur.path, ladderSettings.smoothBefore);
            smoothed = resampleShrinking(smoothed, ladderSettings.resampleDistByLengthRemaining);
            smoothed = smoothPath(smoothed, ladderSettings.smoothAfter);

            const pts = smoothed;

            // If level 1+, skip first point
            if (level > 0) {
                pts.shift();
            }

            stroke(strokeColors[level]);
            fill(fillColors[level]);

            const ladder = ladderize(pts, ladderSettings, false);
            drawLadder(ladder);
        }
    }
}

// On right click, change origin
window.mousePressed = function () {
    if (mouseButton === LEFT) {
    }
}

// On mouse wheel, change angle
window.mouseWheel = function (event) {
}

