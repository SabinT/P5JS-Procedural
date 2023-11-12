import { vec2, PI, scale2d, add2d, normalize2d, sub2d, DEG2RAD, lerp2d } from './common.js'
import { Polygon, angleNormPi, angleNormTau, drawPath, drawOffsetPath, getArcPoints, signedAngle } from "./geomerty.js";

const root3 = Math.sqrt(3);

const templateHex = new Polygon(vec2(0, 0), 1, 6, PI / 2); // pointy top

// Axial coordinates
// See for lots more info: https://www.redblobgames.com/grids/hexagons/
export function hexToCartesianAxial(x, y, R) {
    // Basis vectors: horizontal = (sqrt(3), 0), slant = (sqrt(3)/2, 3/2)
    return vec2(
        R * x * root3 + R * y * root3 / 2,
        R * y * 1.5
    );
}

/**
 * @param {vec2} hex x = col, y = row
 * @param {*} R Radius
 * @returns Converts (col, row) hex coordinates to cartesian coordinates
 */
export function hexToCartesianOddr(hex, R) {
    const x = R * sqrt(3) * (hex.x + 0.5 * (hex.y & 1))
    const y = R * 3 / 2 * hex.y
    return vec2(x, y)
}

export function drawHexOddR(p, R) {
    push();
    const q = hexToCartesianOddr(p, R);
    translate(q.x, q.y);

    templateHex.radius = R;
    templateHex.draw();

    pop();
}

export function getHexRing(p) {
    return [
        vec2(p.x + 1, p.y + 0),
        vec2(p.x - 1, p.y + 0),

        vec2(p.x + 0, p.y + 1),
        vec2(p.x + 0, p.y - 1),

        vec2(p.x + 1, p.y - 1),
        vec2(p.x - 1, p.y + 1)
    ];
}

// Define constants for join types
const JOIN_TYPE_END = 1;
const JOIN_TYPE_NEXT = 2;
const JOIN_TYPE_SKIP = 4;
const JOIN_TYPE_OPPOSITE = 8;

// Function to create and initialize bitmask array
function createJoinMaskArray() {
    return new Array(6).fill(0);
}

// Function to set a join type for a given midpoint
function setJoinType(bitmaskArray, midpoint, joinType) {
    bitmaskArray[midpoint] |= joinType;
}

// Function to parse a bitmask into an object with four booleans
function parseBitmask(bitmask) {
    return {
        end: (bitmask & JOIN_TYPE_END) === JOIN_TYPE_END,
        next: (bitmask & JOIN_TYPE_NEXT) === JOIN_TYPE_NEXT,
        skip: (bitmask & JOIN_TYPE_SKIP) === JOIN_TYPE_SKIP,
        opposite: (bitmask & JOIN_TYPE_OPPOSITE) === JOIN_TYPE_OPPOSITE
    };
}

// Example usage
// let bitmaskArray = createJoinMaskArray();
// setJoinType(bitmaskArray, 0, JOIN_TYPE_END | JOIN_TYPE_NEXT);
// console.log(parseBitmask(bitmaskArray[0]));

function getSolosAndPairs(bitmaskArray) {
    let solos = [];
    let pairs = new Set();
    let pairedPoints = new Set();  // Track paired points

    // Find pairs first
    for (let i = 0; i < bitmaskArray.length; i++) {
        const bitmask = bitmaskArray[i];
        if (!pairedPoints.has(i)) {
            if (bitmask & JOIN_TYPE_NEXT) {
                addPair(i, (i + 1) % 6);
            }
            if (bitmask & JOIN_TYPE_SKIP) {
                addPair(i, (i + 2) % 6);
            }
            if (bitmask & JOIN_TYPE_OPPOSITE) {
                addPair(i, (i + 3) % 6);
            }
        }
    }

    // Find solos (anything not paired)
    for (let i = 0; i < bitmaskArray.length; i++) {
        if (!pairedPoints.has(i)) {
            solos.push(i);
        }
    }

    // If more than two solos, pair them up
    while (solos.length > 1) {
        const index1 = solos.pop();
        const index2 = solos.pop();
        addPair(index1, index2);
    }

    const pairsParsed = Array.from(pairs).map(pair => pair.split(',').map(Number));

    // If all opposite, make all next
    if (pairs.size === 3) {
        let allOpposite = true;
        for (let i = 0; i < pairsParsed.length; i++) {
            const pair = pairsParsed[i];
            const index1 = pair[0];
            const index2 = pair[1];

            if (distWrap(index1, index2) != 3) {
                allOpposite = false;
                break;
            }
        }

        if (allOpposite) {
            pairs.clear();
            pairedPoints.clear();
            for (let i = 0; i < bitmaskArray.length; i += 2) {
                addPair(i, (i + 1) % 6);
            }
        }
    }

    function addPair(index1, index2) {
        // Check if either point is already in a pair
        if (!pairedPoints.has(index1) && !pairedPoints.has(index2)) {
            // Ensure pairs are stored in a consistent order
            const pairKey = index1 < index2 ? `${index1},${index2}` : `${index2},${index1}`;
            pairs.add(pairKey);
            // Mark these points as paired
            pairedPoints.add(index1);
            pairedPoints.add(index2);
        }
    }

    // Convert the set of string pairs back to array of pairs
    const pairsArray = Array.from(pairs).map(pair => pair.split(',').map(Number));

    return { solos, pairs: pairsArray };
}


// Example usage
// let bitmaskArray = createJoinMaskArray();
// setJoinType(bitmaskArray, 0, JOIN_TYPE_END);
// setJoinType(bitmaskArray, 1, JOIN_TYPE_NEXT);
// setJoinType(bitmaskArray, 2, JOIN_TYPE_SKIP);
// setJoinType(bitmaskArray, 5, JOIN_TYPE_OPPOSITE);
// console.log(getSolosAndPairs(bitmaskArray));

export const defaultJoinMask = createJoinMaskArray();
setJoinType(defaultJoinMask, 0, JOIN_TYPE_NEXT);
setJoinType(defaultJoinMask, 2, JOIN_TYPE_NEXT);
setJoinType(defaultJoinMask, 4, JOIN_TYPE_NEXT);


function generateRandomJoinMask(probabilities, singleFlag) {
    // Default probabilities to 50% if not provided
    if (!probabilities) {
        probabilities = [0.5, 0.5, 0.5, 0.5];
    }

    // Ensure probabilities array is correct length
    if (probabilities.length !== 4) {
        throw new Error('Probabilities array must have 4 elements.');
    }

    // Initialize bitmask
    let bitmask = 0;

    // Array of all join types
    const joinTypes = [JOIN_TYPE_END, JOIN_TYPE_NEXT, JOIN_TYPE_SKIP, JOIN_TYPE_OPPOSITE];

    // Randomly decide whether to include each join type based on provided probabilities
    let isOneFlagSet = false;
    joinTypes.forEach((joinType, index) => {
        if (singleFlag && isOneFlagSet) {
            return;
        }

        if (Math.random() < probabilities[index]) {
            bitmask |= joinType;
            isOneFlagSet = true;
        }
    });

    return bitmask;
}

// Example usage
// let probabilities = [0.2, 0.7, 0.5, 0.3]; // Custom probabilities for each join type
// let randomJoinArray = generateRandomJoinArray(probabilities);
// console.log(randomJoinArray);
export function generateRandomJoinArray(probabilities) {
    const randomJoinArray = [];
    for (let i = 0; i < 6; i++) {
        randomJoinArray.push(generateRandomJoinMask(probabilities));
    }

    return randomJoinArray;
}

/**
 * 
 * @param {*} p Center in odd-r coordinates (vec2)
 * @param {*} R Radius of hexagon
 * @param {*} tileMask An array of 6 integers, each representing the type of join for every midpoint
 * @param {*} turns Integer representing the number of 60 degree turns to rotate the tile
 */
export function drawHexTile(p, R, tileMask, turns, style, debugDraw = false) {
    if (tileMask === undefined) {
        tileMask = defaultJoinMask;
    }

    push();
    const q = hexToCartesianOddr(p, R);
    translate(q.x, q.y);
    rotate(turns * PI / 3);

    const hex = templateHex;

    hex.radius = R;
    const pts = hex.getPoints();

    if (debugDraw) {

        fill(50);
        hex.draw();

        // Label the corners
        fill("white");
        stroke("black");
        strokeWeight(1);
        textSize(10);
        textAlign(CENTER, CENTER);

        for (let i = 0; i < pts.length; i++) {
            const pt = pts[i];
            let pp = scale2d(pt, 0.8);
            text(i, pp.x, pp.y);
        }
    }

    // Get all midpoints
    let mids = [];
    let midNormals = [];
    for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        const nextPt = pts[(i + 1) % pts.length];

        const m = scale2d(add2d(pt, nextPt), 0.5);
        mids.push(m);
        midNormals.push(normalize2d(m));

        // Draw mid normal
        if (debugDraw) {
            stroke("lime");
            strokeWeight(1);
            line(m.x, m.y, m.x + midNormals[i].x * 10, m.y + midNormals[i].y * 10);
        }
    }

    // Get joins and solos from tile mask
    const { solos, pairs } = getSolosAndPairs(tileMask);

    // Draw the joins
    for (const pair of pairs) {
        const i0 = pair[0];
        const i1 = pair[1];

        const p1 = mids[i0];
        const p2 = mids[i1];

        // Normals of midpoints become tangents for curves
        const t1 = midNormals[i0];
        const t2 = midNormals[i1];

        if (distWrap(i0, i1) === 1) {
            let ic = (i0 + 1) % 6;
            if (i0 == 0 && i1 == 5) {
                ic = 0;
            }

            drawNextJoin(p1, p2, /* arcCenter */ pts[ic], t1, t2, style);
        }
        else if (distWrap(i0, i1) === 2) {
            drawSkipJoin(p1, p2, /* hexCenter */ hex.center, style);
        }
        else if (distWrap(i0, i1) === 3) {
            drawOppositeJoin(p1, p2, style);
        }
        else {
            strokeWeight(1);
            stroke("red");
            line(p1.x, p1.y, p2.x, p2.y);
        }
    }

    // Draw the solos as studded lines
    stroke("cyan");
    strokeWeight(1);

    for (const solo of solos) {
        const p1 = mids[solo];
        const p2 = sub2d(p1, scale2d(midNormals[solo], 20));
        line(p1.x, p1.y, p2.x, p2.y);
    }

    pop();
}

function distWrap(point1, point2) {
    const directDistance = Math.abs(point1 - point2);
    const wrapAroundDistance = 6 - directDistance;

    return Math.min(directDistance, wrapAroundDistance);
}

function drawNextJoin(p0, p1, c, t0, t1, style) {
    const pp0 = sub2d(p0, c);
    const pp1 = sub2d(p1, c);
    const frame = { origin: c, right: normalize2d(pp0) };

    let angleDiff = angleNormPi(signedAngle(frame.right, pp1));

    const r = sub2d(p0, c).mag();

    stroke(style.color);
    strokeWeight(style.weight);
    noFill();

    let arcPts = getArcPoints(frame, /* fromAngle */ 0, /* toAngle */ angleDiff, r + style.offset, /* segments */ 16);
    drawPath(arcPts);

    // drawOffsetPath(arcPts, style.offset, t0, t1);
}

function drawSkipJoin(p0, p1, hexCenter, style) {
    const pp0 = sub2d(p0, hexCenter);
    const pp1 = sub2d(p1, hexCenter);

    const dirCenter = normalize2d(add2d(pp0, pp1));
    const d =pp0.mag();
    const distCenter = d / sin (30 * DEG2RAD);

    const arcCenter = add2d(hexCenter, scale2d(dirCenter, distCenter));

    // Arbitrary frame with a fixed local orientation for every skip join
    const p0Arc = sub2d(p0, arcCenter);
    const p1Arc = sub2d(p1, arcCenter);
    const frame = { origin: arcCenter, right: normalize2d(p0Arc) };
    let angleDiff = angleNormPi(signedAngle(frame.right, p1Arc));

    const r = sub2d(arcCenter, p0).mag();

    let arcPts = getArcPoints(frame, /* fromAngle */ 0, /* toAngle */ angleDiff, r + style.offset, /* segments */ 16);

    // Draw the arc
    stroke(style.color);
    strokeWeight(style.weight);

    drawPath(arcPts);
}

function drawOppositeJoin(p0, p1, style) {
    // TODO keep this resolution independent
    const unitsPerPoint = 1;
    const lineLength = sub2d(p0, p1).mag();

    const numPoints = Math.floor(lineLength / unitsPerPoint);

    const dir = normalize2d(sub2d(p0, p1));

    const pts = [];

    for (let i = 0; i < numPoints; i++) {
        let t = i / (numPoints - 1);
        const p = lerp2d(p0, p1, t);
        pts.push(p);
    }

    stroke(style.color);
    strokeWeight(style.weight);

    drawOffsetPath(pts, style.offset);
}