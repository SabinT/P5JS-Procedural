import { sub2d, add2d, scale2d, cart2Polar, len2d, vec2, TAU, lerp, dist2d, rot2d as rot2d, normalize2d as norm2d, ray2D, PI, RAD2DEG, DEG2RAD, mul2d } from './common.js';
import { polarLine } from './mandala.js';

const clipShapes = [];

export function addClipShape(shape, inside) {
  clipShapes.push({ shape: shape, inside: inside });
}

export function clearClipShapes() {
  clipShapes.length = 0;
}

// TODO BUGBUG something wrong when clipping many lines with many circles
export function clipLine(line) {
  let lines = [line];
  clipShapes.forEach
    (clipShape => {
      let newLines = [];
      lines.forEach(line => {
        const result = clipShape.shape.clipLine(line, clipShape.inside);
        if (result && result.length > 0) {
          newLines = newLines.concat(result);
        }
      });

      // Update line list before clipping with next shape
      lines = newLines;
    });

  return lines;
}

export function clipLines(lines) {
  const newLines = [];
  lines.forEach(line => {
    const result = clipLine(line);
    if (result && result.length > 0) {
      newLines.push(...result);
    }
  });

  return newLines;
}

/**
 * Assumes you have already established that the points are colinear
 */
function liesBetween(a, b, c) {
  const d = (c.x - a.x) * (b.x - a.x) + (c.y - a.y) * (b.y - a.y);
  if (d < 0) {
    return false;
  }

  const l2 = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
  if (d > l2) {
    return false;
  }

  return true;
}

/**
 * Returns intersection points of a line and a circle
 * @param {vec2} a
 * @param {vec2} b
 * @param {vec2} center
 * @param {Number} r
 * Reference: https://www.bluebill.net/circle_ray_intersection.html
 */
function intersectLineCircle(a, b, center, r) {
  const dir = sub2d(b, a);
  dir.normalize();

  const U = sub2d(center, a);
  const proj = U.dot(dir);
  const U1 = scale2d(dir, proj);
  const U2 = sub2d(U, U1);
  const d = len2d(U2);

  if (d < r) {
    // Possible intersections
    const m = Math.sqrt(r * r - d * d);
    const C = add2d(add2d(a, U1), scale2d(dir, -m));
    const D = add2d(add2d(a, U1), scale2d(dir, m));

    return [C, D];
  }

  return null;
}

export function smoothPath(pts, iterations) {
  for (let i = 0; i < iterations; i++) {
    let smoothed = [];
    smoothed.push(pts[0]);
    for (let j = 1; j < pts.length - 1; j++) {
      let avgX = (pts[j - 1].x + pts[j].x + pts[j + 1].x) / 3;
      let avgY = (pts[j - 1].y + pts[j].y + pts[j + 1].y) / 3;
      smoothed.push(createVector(avgX, avgY));
    }
    smoothed.push(pts[pts.length - 1]);
    pts = smoothed;
  }
  return pts;
}

export function totalPathLength(path) {
  let totalLength = 0;
  for (let i = 1; i < path.length; i++) {
    totalLength += dist2d(path[i - 1], path[i]);
  }
  return totalLength;
}

export function resample2(path, desiredDistanceRange) {
  let resampled = [];
  if (path.length === 0) return { path: [], length: 0 };

  resampled.push(path[0]);

  let currentSegmentIndex = 0;
  let positionInCurrentSegment = 0;

  let totalLength = totalPathLength(path);
  let accumDist = 0;

  let currentDesiredDistance = desiredDistanceRange.y; // Start with the max
  let remainingDistance = currentDesiredDistance;

  while (currentSegmentIndex < path.length - 1) {
    let startPoint = path[currentSegmentIndex];
    let endPoint = path[currentSegmentIndex + 1];

    let segmentLength = dist2d(startPoint, endPoint);

    if (positionInCurrentSegment + remainingDistance < segmentLength) {
      let ratio = (positionInCurrentSegment + remainingDistance) / segmentLength;
      let resampledX = lerp(startPoint.x, endPoint.x, ratio);
      let resampledY = lerp(startPoint.y, endPoint.y, ratio);

      resampled.push(vec2(resampledX, resampledY));
      positionInCurrentSegment += remainingDistance;
      accumDist += remainingDistance;

      // Adjust the desired distance for next iteration, moving towards the min value
      // let adjustmentFactor = (desiredDistanceRange.y - desiredDistanceRange.x) / path.length;
      // currentDesiredDistance = Math.min(currentDesiredDistance - adjustmentFactor, desiredDistanceRange.x);

      currentDesiredDistance = lerp(desiredDistanceRange.y, desiredDistanceRange.x, accumDist / totalLength);
      console.log(currentDesiredDistance, desiredDistanceRange.x, desiredDistanceRange.y, accumDist, totalLength);

      remainingDistance = currentDesiredDistance;
    } else {
      accumDist += (segmentLength - positionInCurrentSegment);
      // remainingDistance -= (segmentLength - positionInCurrentSegment);
      remainingDistance -= segmentLength;
      currentSegmentIndex++;
      positionInCurrentSegment = 0;
    }
  }

  return resampled;
}

export function resample(path, desiredDistanceMinMax) {
  let resampled = [];
  if (path.length === 0) return { path: [], length: 0 };

  // We always start with the first point
  resampled.push(path[0]);

  let currentSegmentIndex = 0;
  let positionInCurrentSegment = 0; // This represents how far into the segment we've "traveled"

  let desiredDistance = desiredDistanceMinMax.y; // start with max, decreases as we add points

  let remainingDistance = desiredDistance; // This will represent the distance left to "travel" to reach the desired distance

  while (currentSegmentIndex < path.length - 1) {
    let startPoint = path[currentSegmentIndex];
    let endPoint = path[currentSegmentIndex + 1];

    let segmentLength = dist(startPoint.x, startPoint.y, endPoint.x, endPoint.y);

    // If we have enough distance left in the current segment
    if (positionInCurrentSegment + remainingDistance < segmentLength) {
      let ratio = (positionInCurrentSegment + remainingDistance) / segmentLength;
      let resampledX = lerp(startPoint.x, endPoint.x, ratio);
      let resampledY = lerp(startPoint.y, endPoint.y, ratio);

      resampled.push(createVector(resampledX, resampledY));

      // Update our position within the current segment
      positionInCurrentSegment += remainingDistance;
      // Reset our remaining distance
      remainingDistance = desiredDistance;
    } else {
      // If not, then "use up" the rest of this segment and continue onto the next segment
      remainingDistance -= (segmentLength - positionInCurrentSegment);

      // Move to the next segment
      currentSegmentIndex++;
      positionInCurrentSegment = 0;
    }
  }

  return resampled;
}

export function angleNorm180(angle) {
  if (angle > 180) {
    return angle - 360;
  }
  else if (angle < -180) {
    return angle + 360;
  }

  return angle;
}

export function angleNorm360(angle) {
  if (angle > 360) {
    return angle - 360;
  }
  else if (angle < 0) {
    return angle + 360;
  }

  return angle;
}

export function angleNormPi(angle) {
  if (angle > PI) {
    return angle - TAU;
  }
  else if (angle < -PI) {
    return angle + TAU;
  }

  return angle;
}

export function angleNormTau(angle) {
  if (angle > TAU) {
    return angle - TAU;
  }
  else if (angle < 0) {
    return angle + TAU;
  }

  return angle;
}

export function signedAngle(from, to) {
  return Math.atan2(to.y, to.x) - Math.atan2(from.y, from.x);
}

export function drawPath(path) {
  beginShape();
  for (let pt of path) {
      vertex(pt.x, pt.y);
  }
  endShape();
}

export function drawFrame(origin, right, len) {
  stroke(255, 0, 0);
  ray2D(origin, right, len);
  stroke(0, 255, 0);
  ray2D(origin, rot2d(right, PI * 0.5), len);
}

export function drawShape(pts) {
  beginShape();
  for (let i = 0; i < pts.length; i++) {
    vertex(pts[i].x, pts[i].y);
  }
  endShape(CLOSE);
}

export function outerTangentPath(c1, c2, r1, r2, segments = 8, debugDraw = false) {
  const { a, b, c, d } = getOuterTangents(c1, c2, r1, r2, debugDraw);

  // Frames at centers of circles
  const c1c2 = sub2d(c2, c1);
  const f1 = { origin: c1, right: norm2d(c1c2) };
  const f2 = { origin: c2, right: f1.right };

  const aLocal = sub2d(a, c1);
  const bLocal = sub2d(b, c2);
  const cLocal = sub2d(c, c1);
  const dLocal = sub2d(d, c2);

  // Increasing angle from A to C, doesn't cross zero
  const angleA = angleNormTau(signedAngle(f1.right, aLocal));
  const angleC = angleNormTau(signedAngle(f1.right, cLocal));

  // Increasing angle from D to B, note: crosses zero
  const angleB = angleNormPi(signedAngle(f2.right, bLocal));
  const angleD = angleNormPi(signedAngle(f2.right, dLocal));

  if (debugDraw) {
    fill("#d1effe");
    stroke("#000000");
    text(`θ1: ${(angleA * RAD2DEG).toFixed(2)}`, a.x, a.y + 20);
    text(`θ2: ${(angleC * RAD2DEG).toFixed(2)}`, c.x, c.y - 30);
    text(`Φ1: ${(angleB * RAD2DEG).toFixed(2)}`, b.x, b.y + 20);
    text(`Φ2: ${(angleD * RAD2DEG).toFixed(2)}`, d.x, d.y - 30);

    fill("#3c7e9f");

    // Testing signed angle
    const mp = vec2(mouseX - width / 2, mouseY - height / 2);
    const mv = sub2d(mp, f1.origin);
    let ma = signedAngle(f1.right, mv) * RAD2DEG;
    ma = angleNorm360(ma);
    text(`Signed angle: ${ma.toFixed(2)}`, mp.x, mp.y - 20);

    drawFrame(f1.origin, f1.right, 20);
    drawFrame(f2.origin, f2.right, 20);
  }

  const pts = [];

  // Calculate arc from A to C, increasing angle
  const angleStep = (angleC - angleA) / segments;
  for (let i = 0; i <= segments; i++) {
    const angle = angleA + i * angleStep;
    const p = add2d(mul2d(rot2d(f1.right, angle), vec2(r1, r1)), c1);
    pts.push(p);
  }

  // Calculate arc from D to B, increasing angle
  const angleStep2 = (angleB - angleD) / segments;
  for (let i = 0; i <= segments; i++) {
    const angle = angleD + i * angleStep2;
    const p = add2d(mul2d(rot2d(f2.right, angle), vec2(r2, r2)), c2);
    pts.push(p);
  }

  if (debugDraw) {
    fill(255)
    noStroke();

    for (let i = 0; i < pts.length; i++) {
      circle(pts[i].x, pts[i].y, 3);
      // text(i, pts[i].x, pts[i].y - 10)
    }
  }

  return pts;
}

export function getOuterTangents(c1, c2, r1, r2, debugDraw = false) {
  const dir = vec2(c2.x - c1.x, c2.y - c1.y);
  const dist = mag(dir.x, dir.y);

  // Unit vector pointing from center of c1 towards center of c2
  const ndir = p5.Vector.normalize(dir);

  // (90 degrees minus angle between tangent and centerline)
  const alpha = Math.acos((r1 - r2) / (dist));

  // Radial lines pointing from center of circle towards tangent points
  const n1 = rot2d(ndir, alpha);
  const n2 = rot2d(ndir, -alpha);

  const a = vec2(c1.x + n1.x * r1, c1.y + n1.y * r1);
  const b = vec2(c2.x + n1.x * r2, c2.y + n1.y * r2);

  const c = vec2(c1.x + n2.x * r1, c1.y + n2.y * r1);
  const d = vec2(c2.x + n2.x * r2, c2.y + n2.y * r2);

  if (debugDraw) {
    stroke("#3c7e9f")
    line(a.x, a.y, b.x, b.y);
    line(d.x, d.y, c.x, c.y);

    fill("#3c7e9f");
    noStroke();
    text("A", a.x, a.y - 10);
    text("B", b.x, b.y - 10);
    text("C", c.x, c.y - 10);
    text("D", d.x, d.y - 10);
  }

  return { a: a, b: b, c: c, d: d };
}

export class Line {
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }

  draw(polar = false, polarBlend = 1, divisions = 8) {
    if (polar) {
      const p1 = cart2Polar(this.a);
      const p2 = cart2Polar(this.b);
      if (p2.y < p1.y) { p2.y += TAU; }
      polarLine(p1.x, p1.y, p2.x, p2.y, divisions, false, polarBlend);
    } else {
      line(this.a.x, this.a.y, this.b.x, this.b.y);
    }
  }
}

export class Lines {
  constructor(lines) {
    this.lines = lines || [];
  }

  add(line) {
    this.lines.push(line);
  }

  draw() {
    this.lines.forEach(line => {
      line.draw();
    });
  }
}

export class Circle {
  constructor(center, r, inverted = false) {
    this.center = center;
    this.r = r;
    this.inverted = inverted;
  }

  draw() {
    circle(this.center.x, this.center.y, 2 * this.r);
  }

  containsPoint(p) {
    const inside = dist2d(this.center, p) <= this.r;
    return inverted ? !inside : inside;
  }

  clipLine(line, inside) {
    const [a, b] = [line.a, line.b];
    const lines = [];
    const result = intersectLineCircle(a, b, this.center, this.r);

    if (!result) {
      if (!inside) {
        lines.push(new Line(a, b));
      }

      return lines;
    }

    let [C, D] = result;
    const hasC = liesBetween(a, b, C);
    const hasD = liesBetween(a, b, D);

    if (!inside) {
      if (hasC) {
        lines.push(new Line(a, C));
      }

      if (hasD) {
        lines.push(new Line(D, b));
      }
    }
    else {
      const start = hasC ? C : a;
      const end = hasD ? D : b;
      lines.push(new Line(start, end));
    }

    return lines;
  }
}

export class Polygon {
  constructor(center, radius, sides, rotation = 0) {
    this.center = center;
    this.radius = radius;
    this.sides = sides;
    this.rotation = rotation;
  }

  getAngleStepOffset() {
    const angleStep = TWO_PI / this.sides;
    const offset = ((this.sides % 2 === 0) ? 0 : -angleStep / 4) + this.rotation;
    return { angleStep, offset };
  }

  getPoint(i) {
    const { angleStep, offset } = this.getAngleStepOffset();
    const angle = i * angleStep + offset;
    const a = add2d(this.center, scale2d(vec2(cos(angle), sin(angle)), this.radius));
    return a;
  }

  getPoints() {
    const points = [];
    for (let i = 0; i < this.sides; i++) {
      points.push(this.getPoint(i));
    }
    return points;
  }

  getLines() {
    const lines = [];
    const { angleStep, offset } = this.getAngleStepOffset();

    for (let i = 0; i < this.sides; i++) {
      const a1 = i * angleStep + offset;
      const a2 = (i + 1) * angleStep + offset;
      const a = add2d(this.center, scale2d(vec2(cos(a1), sin(a1)), this.radius));
      const b = add2d(this.center, scale2d(vec2(cos(a2), sin(a2)), this.radius));
      lines.push(new Line(a, b));
    }

    return lines;
  }

  drawLines(polar, polarBlend, divisions) {
    // this.draw();return;

    this.getLines().forEach(
      // Clip the lines and draw them
      line => {
        const result = clipLine(line);
        result.forEach(
          line => line.draw(polar, polarBlend, divisions)
        );
      }
    );
  }

  draw(g) {
    if (!g) { g = window; }

    g.beginShape();
    for (let i = 0; i < this.sides; i++) {
      const a = this.getPoint(i);
      const b = this.getPoint((i + 1) % this.sides);
      g.vertex(a.x, a.y);
    }
    g.endShape(CLOSE);
  }

  drawChiseled(g, inwardOffset, lengthOffset) {
    if (!g) { g = window; }

    for (let i = 0; i < this.sides; i++) {
      const start = this.getPoint(i);
      const end = this.getPoint((i + 1) % this.sides);

      // Move a and b towwards each other
      const dir = sub2d(end, start);
      const offset = lengthOffset * len2d(dir);
      dir.normalize();
      const a = add2d(start, scale2d(dir, offset));
      const b = add2d(end, scale2d(dir, -offset));

      // Move c and d inwards
      let cc = scale2d(start, 1 - inwardOffset);
      let dd = scale2d(end, 1 - inwardOffset);

      let c = add2d(cc, scale2d(dir, offset));
      let d = add2d(dd, scale2d(dir, -offset));

      g.beginShape();
      g.vertex(a.x, a.y);
      g.vertex(b.x, b.y);
      g.vertex(d.x, d.y);
      g.vertex(c.x, c.y);
      g.endShape(CLOSE);
    }
  }

  getInscribedRadius() {
    return this.radius * cos(PI / this.sides);
  }

  drawInscribedCircle() {
    const a = TAU / this.sides;
    const r = this.radius * cos(a / 2);
    circle(this.center.x, this.center.y, 2 * r);
  }
}