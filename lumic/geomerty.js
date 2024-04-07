import { sub2d, add2d, scale2d, cart2Polar, len2d, vec2, TAU, lerp, dist2d, rot2d as rot2d, normalize2d, ray2D, PI, RAD2DEG, DEG2RAD, mul2d, dot2d } from './common.js';
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
 * Returns intersection points of a line and a circle [point 1, point 2], or null
 * @param {vec2} a
 * @param {vec2} b
 * @param {vec2} center
 * @param {Number} r
 * Reference: https://www.bluebill.net/circle_ray_intersection.html
 */
export function intersectLineCircle(a, b, center, r) {
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

// Returns the "smaller" angle (in magnitude) between two angles
export function angleDiff(a, b) {
  return angleNormPi(a - b);
}

// Distance to line (cartesian)
export function distToLine(p, l1, l2) {
  const numerator = Math.abs((l2.y - l1.y) * p.x - (l2.x - l1.x) * p.y + l2.x * l1.y - l2.y * l1.x);
  const denominator = Math.sqrt(Math.pow(l2.y - l1.y, 2) + Math.pow(l2.x - l1.x, 2));
  return numerator / denominator;
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

export function move(point, dir, dist) {
  return add2d(point, scale2d(dir, dist));
}

export function moveTowards(p0, p1, dist) {
  const dir = normalize2d(sub2d(p1, p0));
  return add2d(p0, scale2d(dir, dist));
}

export function drawPath(path, closed = false) {
  beginShape();
  for (let pt of path) {
    vertex(pt.x, pt.y);
  }

  if (closed) {
    endShape(CLOSE);
  } else {
    endShape();
  }
}

export function drawOffsetPath(path, offsetDir, offsetAmount, closed = false) {
  // Shift the points by the offset
  const offset = scale2d(normalize2d(offsetDir), offsetAmount);

  beginShape();
  for (let pt of path) {
    vertex(pt.x + offset.x, pt.y + offset.y);
  }

  if (closed) {
    endShape(CLOSE);
  } else {
    endShape();
  }
}

export function getTangents(path) {
  if (path.length < 2) {
    return [vec2(0, 0)];
  }

  const tangents = [];

  const t0 = normalize2d(sub2d(path[1], path[0]));
  tangents.push(t0);

  // Except first and last
  for (let i = 1; i < path.length - 1; i++) {
    const a = path[i - 1];
    const b = path[i];
    const c = path[i + 1];

    // Compute vectors a->b and b->c, then normalize their sum
    const ab = normalize2d(sub2d(b, a));
    const bc = normalize2d(sub2d(c, b));
    const t = normalize2d(add2d(ab, bc));

    tangents.push(t);
  }

  const tn = normalize2d(sub2d(path[path.length - 1], path[path.length - 2]));
  tangents.push(tn);

  return tangents;
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

export function getArcPoints(frame, fromAngle, toAngle, r, segments) {
  let pts = [];

  const angleStep = (toAngle - fromAngle) / segments;
  for (let i = 0; i <= segments; i++) {
    const angle = fromAngle + i * angleStep;
    const p = add2d(mul2d(rot2d(frame.right, angle), vec2(r, r)), frame.origin);
    pts.push(p);
  }

  return pts;
}

export function getArcPoint(frame, angle, r) {
  return add2d(mul2d(rot2d(frame.right, angle), vec2(r, r)), frame.origin);
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
    const angleStep = TAU / this.sides;
    const offset = ((this.sides % 2 === 0) ? 0 : -angleStep / 4) + this.rotation;
    return { angleStep, offset };
  }

  getPoint(i) {
    const { angleStep, offset } = this.getAngleStepOffset();
    const angle = i * angleStep + offset;
    const a = add2d(this.center, scale2d(vec2(Math.cos(angle), Math.sin(angle)), this.radius));
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

  draw(g, close = true) {
    if (!g) { g = window; }

    g.beginShape();
    for (let i = 0; i < this.sides; i++) {
      const a = this.getPoint(i);
      const b = this.getPoint((i + 1) % this.sides);
      g.vertex(a.x, a.y);
    }
    g.endShape(close ? CLOSE : undefined);
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

// Example usage
// const paths = [
//   [{x: 10, y: 10}, {x: 100, y: 10}, {x: 100, y: 100}, {x: 10, y: 100}], // Square
//   [{x: 120, y: 10}, {x: 210, y: 10}, {x: 210, y: 100}, {x: 120, y: 100}]  // Another square
// ];
// exportSVG(paths, 'example.svg', 300, 200);
export function exportSVG(paths, filename, width, height, offset, scale) {
  // Start the SVG element
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;

  // Iterate over each path
  paths.forEach(path => {
      // Start the path element
      let pathData = ' ';

      // Add each vec2 to the path with scale applied first, then translation
      let isFirst = true;
      path.forEach(vec => {
          // Apply scale first
          let scaledX = vec.x * scale.x;
          let scaledY = vec.y * scale.y;

          // Then apply translation
          let transformedX = scaledX + offset.x;
          let transformedY = scaledY + offset.y;

          const command = isFirst ? 'M' : 'L';
          if (isFirst) {
              isFirst = false;
          }

          // Format float to 5 digits
          // pathData += `${transformedX} ${transformedY} `;
          pathData += `${command} ${transformedX.toFixed(5)} ${transformedY.toFixed(5)} `;
      });

      // Close the path
      pathData += 'Z';

      // Add the path element to the SVG content
      svgContent += `<path d="${pathData}" fill="none" stroke="red" stroke-width="0.05"/>`;
  });

  // Close the SVG element
  svgContent += `</svg>`;

  // Create a Blob with the SVG content
  const blob = new Blob([svgContent], {type: 'image/svg+xml'});

  // Create an URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a temporary link to trigger the download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link); // Append to the document

  // Trigger the download
  link.click();

  // Clean up by removing the temporary link and revoking the blob URL
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportGroupsToSVG(groups, filename, width, height, offset, scale) {
  // Start the SVG element
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}in" height="${height}in" viewBox="0 0 ${width} ${height}">`;

  // Iterate over each group
  groups.forEach(group => {
    // Start the group element
    svgContent += '<g>';

    // Iterate over each path within the group
    group.forEach(path => {
      // Start the path element
      let pathData = ' ';

      // Add each vec2 to the path with scale applied first, then translation
      let isFirst = true;
      path.forEach(vec => {
        // Apply scale first
        let scaledX = vec.x * scale.x;
        let scaledY = vec.y * scale.y;

        // Then apply translation
        let transformedX = scaledX + offset.x;
        let transformedY = scaledY + offset.y;

        const command = isFirst ? 'M' : 'L';
        if (isFirst) {
          isFirst = false;
        }

        // Format float to 5 digits
        pathData += `${command} ${transformedX.toFixed(5)} ${transformedY.toFixed(5)} `;
      });

      // Close the path
      pathData += 'Z';

      // Add the path element to the group
      svgContent += `<path d="${pathData}" fill="none" stroke="black" stroke-width="0.02"/>`;
    });

    // Close the group
    svgContent += '</g>';
  });

  // Close the SVG element
  svgContent += '</svg>';

  // Create a Blob with the SVG content
  const blob = new Blob([svgContent], {type: 'image/svg+xml'});

  // Create an URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a temporary link to trigger the download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link); // Append to the document

  // Trigger the download
  link.click();

  // Clean up by removing the temporary link and revoking the blob URL
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


// Example usage with scale applied first, then translation
const paths = [
  [{x: 10, y: 10}, {x: 100, y: 10}, {x: 100, y: 100}, {x: 10, y: 100}], // Square
  [{x: 120, y: 10}, {x: 210, y: 10}, {x: 210, y: 100}, {x: 120, y: 100}]  // Another square
];
