import {
  vec2,
  PI,
  scale2d,
  add2d,
  normalize2d,
  sub2d,
  DEG2RAD,
  lerp2d,
  rot2d,
} from "./common.js";
import {
  Polygon,
  angleNormPi,
  angleNormTau,
  drawPath as drawPathBasic,
  drawOffsetPath,
  getArcPoints,
  signedAngle,
  getArcPoint,
  moveTowards,
} from "./geomerty.js";

export const STYLES = {
  LINES: 0,
  CIRCLES: 1,
  CIRCUITS: 2,
};

export const tileSettings = {
  preventOverlap: false,
  noSolos: false,
  circlePattern: false,
  angularJoins: false,
  drawPathFunc: drawPathBasic,
  drawEndCaps: true,
};

const root3 = Math.sqrt(3);

const templateHex = new Polygon(vec2(0, 0), 1, 6, PI / 2); // pointy top

// Axial coordinates
// See for lots more info: https://www.redblobgames.com/grids/hexagons/
export function hexToCartesianAxial(x, y, R) {
  // Basis vectors: horizontal = (sqrt(3), 0), slant = (sqrt(3)/2, 3/2)
  return vec2(R * x * root3 + (R * y * root3) / 2, R * y * 1.5);
}

/**
 * @param {vec2} hex x = col, y = row
 * @param {*} R Radius
 * @returns Converts (col, row) hex coordinates to cartesian coordinates
 */
export function hexToCartesianOddr(hex, R) {
  const x = R * sqrt(3) * (hex.x + 0.5 * (hex.y & 1));
  const y = ((R * 3) / 2) * hex.y;
  return vec2(x, y);
}

export function oddrToAxial(hex) {
    var q = hex.x - (hex.y - (hex.y&1)) / 2;
    var r = hex.y;
    return vec2(q, r);
}

export function axialDistance(a, b) {
    return (abs(a.x - b.x) 
          + abs(a.x + a.y - b.x - b.y)
          + abs(a.y - b.y)) / 2;
}

export function getCenterDistOddr(hex) {
  const ax = oddrToAxial(hex.center);
  const cax = oddrToAxial(vec2(0, 0));
  const d = axialDistance(ax, cax);
  return d;
}

/*
var axial_direction_vectors = [
    Hex(+1, 0), Hex(+1, -1), Hex(0, -1), 
    Hex(-1, 0), Hex(-1, +1), Hex(0, +1), 
]

function axial_direction(direction):
    return axial_direction_vectors[direction]

function axial_add(hex, vec):
    return Hex(hex.q + vec.q, hex.r + vec.r)

function axial_neighbor(hex, direction):
    return axial_add(hex, axial_direction(direction))
*/

export function getAdjacentOddr(hex) {
  return [
    vec2(hex.x + 1, hex.y + 0),
    vec2(hex.x + 1, hex.y - 1),
    vec2(hex.x + 0, hex.y - 1),
    vec2(hex.x - 1, hex.y + 0),
    vec2(hex.x - 1, hex.y + 1),
    vec2(hex.x + 0, hex.y + 1),
  ];
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
    vec2(p.x - 1, p.y + 1),
  ];
}

// Define constants for join types
const JOIN_TYPE_END = 1;
const JOIN_TYPE_NEXT = 2;
const JOIN_TYPE_SKIP = 4;
const JOIN_TYPE_OPPOSITE = 8;

// Function to create and initialize bitmask array
export function createJoinMaskArray() {
  return new Array(6).fill(0);
}

export function createOppositeJoins() {
  const bitmaskArray = createJoinMaskArray();
  for (let i = 0; i < 6; i++) {
    setJoinType(bitmaskArray, i, JOIN_TYPE_OPPOSITE);
  }

  return bitmaskArray;
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
    opposite: (bitmask & JOIN_TYPE_OPPOSITE) === JOIN_TYPE_OPPOSITE,
  };
}

// Example usage
// let bitmaskArray = createJoinMaskArray();
// setJoinType(bitmaskArray, 0, JOIN_TYPE_END | JOIN_TYPE_NEXT);
// console.log(parseBitmask(bitmaskArray[0]));

function getSolosAndPairs(bitmaskArray) {
  let solos = [];
  let pairs = new Set();
  let pairedPoints = new Set(); // Track paired points

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
  if (tileSettings.noSolos) {
    while (solos.length > 1) {
      const index1 = solos.pop();
      const index2 = solos.pop();
      addPair(index1, index2);
    }
  }

  const pairsParsed = Array.from(pairs).map((pair) =>
    pair.split(",").map(Number)
  );

  // If all opposite, make all next
  if (tileSettings.preventOverlap) {
    // See if there's any opposite join
    for (const pair of pairsParsed) {
      const i0 = pair[0];
      const i1 = pair[1];

      if (distWrap(i0, i1) === 3) {
        // Make all next except this pair
        pairs.clear();
        pairedPoints.clear();
        solos = [];

        pairs.add(`${i0},${i1}`);
        pairedPoints.add(i0);
        pairedPoints.add(i1);

        let ia = (i0 + 1) % 6;
        let ib = (ia + 1) % 6;
        pairs.add(`${ia},${ib}`);
        pairedPoints.add(ia);
        pairedPoints.add(ib);

        ia = (i1 + 1) % 6;
        ib = (ia + 1) % 6;
        pairs.add(`${ia},${ib}`);
        pairedPoints.add(ia);
        pairedPoints.add(ib);

        break;
      }
    }
  }

  function addPair(index1, index2) {
    // Check if either point is already in a pair
    if (!pairedPoints.has(index1) && !pairedPoints.has(index2)) {
      // Ensure pairs are stored in a consistent order
      const pairKey =
        index1 < index2 ? `${index1},${index2}` : `${index2},${index1}`;
      pairs.add(pairKey);
      // Mark these points as paired
      pairedPoints.add(index1);
      pairedPoints.add(index2);
    }
  }

  // Convert the set of string pairs back to array of pairs
  const pairsArray = Array.from(pairs).map((pair) =>
    pair.split(",").map(Number)
  );

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
    throw new Error("Probabilities array must have 4 elements.");
  }

  // Initialize bitmask
  let bitmask = 0;

  // Array of all join types
  const joinTypes = [
    JOIN_TYPE_END,
    JOIN_TYPE_NEXT,
    JOIN_TYPE_SKIP,
    JOIN_TYPE_OPPOSITE,
  ];

  // Randomly decide whether to include each join type based on provided probabilities
  let isOneFlagSet = false;
  joinTypes.forEach((joinType, index) => {
    if (singleFlag && isOneFlagSet) {
      return;
    }

    if (random() < probabilities[index]) {
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
  rotate((turns * PI) / 3);

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

    const m1 = mids[i0];
    const m2 = mids[i1];

    // Normals of midpoints become tangents for curves
    const t1 = midNormals[i0];
    const t2 = midNormals[i1];

    if (distWrap(i0, i1) === 1) {
      let ic = (i0 + 1) % 6;
      if (i0 == 0 && i1 == 5) {
        ic = 0;
      }

      drawNextJoin(m1, m2, /* arcCenter */ pts[ic], t1, t2, style);
    } else if (distWrap(i0, i1) === 2) {
      drawSkipJoin(m1, m2, /* hexCenter */ hex.center, t1, t2, style);
    } else if (distWrap(i0, i1) === 3) {
      drawOppositeJoin(m1, m2, style);
    } else {
      strokeWeight(1);
      stroke("red");
      line(m1.x, m1.y, m2.x, m2.y);
    }
  }

  // Draw the solos as studded lines
  stroke("cyan");
  strokeWeight(1);

  for (const solo of solos) {
    const p1 = mids[solo];
    drawSoloJoin(p1, midNormals[solo], style);
  }

  pop();
}

function distWrap(point1, point2) {
  const directDistance = Math.abs(point1 - point2);
  const wrapAroundDistance = 6 - directDistance;

  return Math.min(directDistance, wrapAroundDistance);
}

function drawCirclePattern(path, style) {
  const circleRadius = style.offset;

  const n = path.length;
  for (let i = 0; i < n; i++) {
    const p = path[i];
    circle(p.x, p.y, 2 * circleRadius);
  }
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

  const rArc = r + style.offset;

  let arcPts = getArcPoints(
    frame,
    /* fromAngle */ 0,
    /* toAngle */ angleDiff,
    rArc,
    /* segments */ 16
  );

  if (tileSettings.angularJoins) {
    // Arc points in various configurations
    const a0 = 0;
    const a1 = angleDiff / 4;
    const a2 = 0.75 * angleDiff;
    const a3 = angleDiff;
    const aMid = angleDiff / 2;

    const p0 = getArcPoint(frame, a0, rArc);
    const p1 = getArcPoint(frame, a1, rArc);
    const p2 = getArcPoint(frame, a2, rArc);
    const p3 = getArcPoint(frame, a3, rArc);
    const pMid = getArcPoint(frame, aMid, rArc);

    // Offset using tangents

    // arcPts = [p0, p1, p2, p3];
    arcPts = [p0, pMid, p3];
    tileSettings.drawPathFunc(arcPts);
    roundEnds(arcPts, style.weight * 0.5, style.color);
  } else {
    tileSettings.drawPathFunc(arcPts);
  }
}

function drawSkipJoin(p0, p1, hexCenter, t0, t1, style) {
  const pp0 = sub2d(p0, hexCenter);
  const pp1 = sub2d(p1, hexCenter);

  const dirCenter = normalize2d(add2d(pp0, pp1));
  const d = pp0.mag();
  const distCenter = d / sin(30 * DEG2RAD);

  const arcCenter = add2d(hexCenter, scale2d(dirCenter, distCenter));

  // Arbitrary frame with a fixed local orientation for every skip join
  const p0Arc = sub2d(p0, arcCenter);
  const p1Arc = sub2d(p1, arcCenter);
  const frame = { origin: arcCenter, right: normalize2d(p0Arc) };
  let angleDiff = angleNormPi(signedAngle(frame.right, p1Arc));

  const r = sub2d(arcCenter, p0).mag();

  const rArc = r + style.offset;

  // Draw the arc
  stroke(style.color);
  strokeWeight(style.weight);
  noFill();

  let arcPts = getArcPoints(
    frame,
    /* fromAngle */ 0,
    /* toAngle */ angleDiff,
    rArc,
    /* segments */ 16
  );

  if (tileSettings.angularJoins) {
    // start, offStart, offEnd, end
    // first and last segments are straight along tangents
    // middle segment is parallel to the skipped hex side

    // keep offset relative for resolution independence
    const offset = 0.25 * rArc;

    const dhc = sub2d(hexCenter, p0).mag();

    const pullCenter = 0.0;

    const start = arcPts[0];
    const end = arcPts[arcPts.length - 1];
    // const offStart = move(start, t0, -offset);
    // const offEnd = move(end, t1, -offset);
    const offStart = moveTowards(start, hexCenter, pullCenter * dhc);
    const offEnd = moveTowards(end, hexCenter, pullCenter * dhc);

    const path = [start, offStart, offEnd, end];
    tileSettings.drawPathFunc(path);

    // round the ends at start/end
    noStroke();
    fill(style.color);
    circle(start.x, start.y, style.weight);
    circle(end.x, end.y, style.weight);
  } else {
    tileSettings.drawPathFunc(arcPts);
  }
}

function drawOppositeJoin(p0, p1, style) {
  let { isCircuit, isLines, isCircles } = checkStyle(style);
  const isCenterLine = style.offset === 0;

  // TODO keep this resolution independent
  const unitsPerPoint = 1;
  const lineLength = sub2d(p0, p1).mag();

  let numPoints = Math.floor(lineLength / unitsPerPoint);

  if (isCircuit) {
    numPoints = 12;
  }

  const dir = normalize2d(sub2d(p0, p1));
  const sideDir = rot2d(dir, PI / 2);

  // Break the join into two lines to prevent
  // a certain six-pointed star pattern from forming
  // as three paths cross over each other
  const line1 = [];
  const line2 = [];

  const breakGap = tileSettings.angularJoins ? 0.35 : 0.15;
  const circuitThreshold = 0.25;

  //   isCircuit = false;
  //   isLines = true;

  for (let i = 0; i < numPoints; i++) {
    let t = i / (numPoints - 1);

    let p;
    if (i == 0) {
      p = p0;
    } else if (i == numPoints - 1) {
      p = p1;
    } else {
      p = lerp2d(p0, p1, t);
    }

    if (isCircuit) {
      const zagOffset = isCenterLine ? lineLength * 0.05 : 0;
      // Add a zigzag to middle points
      if (t >= circuitThreshold && t <= 1 - circuitThreshold) {
        const zagDir = i % 2 === 0 ? sideDir : scale2d(sideDir, -1);
        p = add2d(p, scale2d(zagDir, zagOffset));
      }

      line1.push(p);
    }

    if (isLines) {
      if (t < 0.5 - breakGap) {
        line1.push(p);
      } else if (t > 0.5 + breakGap) {
        line2.push(p);
      }
    }
  }

  stroke(style.color);
  strokeWeight(style.weight);

  //   drawOffsetPath(line1, options.offset, t0, tangEnd);
  //   tileSettings.drawPathFunc(line1);
  drawOffsetPath(line1, sideDir, style.offset, /* closed: */ false);
  if (isCircuit) {
    roundEnds(line1, style.weight * 0.65, style.color);
  }

  if (isLines) {
    // drawOffsetPath(line2, options.offset, t0, tangEnd);
    // tileSettings.drawPathFunc(line2);
    drawOffsetPath(line2, sideDir, style.offset, /* closed: */ false);
    // roundEnds(line2, style.weight * 0.65, style.color);

    // Circles at the end of line 1 and start of line 2
    // This ends up creating a mandala where the star would be
    const r = style.offset;
    const c1 = line1[line1.length - 1];
    const c2 = line2[0];

    if (tileSettings.angularJoins && tileSettings.drawEndCaps) {
      strokeEndHex.radius = r;

      strokeEndHex.center = c1;
      strokeEndHex.draw();

      strokeEndHex.center = c2;
      strokeEndHex.draw();
    } else {
      if (tileSettings.drawEndCaps) {
        circle(c1.x, c1.y, 2 * r);
        circle(c2.x, c2.y, 2 * r);
      }
    }
  }
}

function roundEnds(path, radius, color) {
  noStroke();
  fill(color);
  circle(path[0].x, path[0].y, 2 * radius);
  circle(path[path.length - 1].x, path[path.length - 1].y, 2 * radius);
}

const strokeEndHex = new Polygon(vec2(0, 0), 1, 6, PI / 2); // pointy top

function checkStyle(options) {
  const isCircuit = options.style === STYLES.CIRCUITS;
  const isLines = options.style === STYLES.LINES;
  const isCircles = options.style === STYLES.CIRCLES;
  return { isCircuit, isLines, isCircles };
}

function drawSoloJoin(p0, t0, style) {
  const p1 = add2d(p0, scale2d(t0, 10));

  stroke(style.color);
  strokeWeight(style.weight);
  // fill(style.color);
  noFill();

  // Draw semi-circle towards the tangent
  let frame = { origin: p0, right: t0 };
  let arcPts = getArcPoints(
    frame,
    /* fromAngle */ -PI / 2,
    /* toAngle */ PI / 2,
    /* radius */ style.offset,
    /* segments */ 16
  );
  tileSettings.drawPathFunc(arcPts);
}
