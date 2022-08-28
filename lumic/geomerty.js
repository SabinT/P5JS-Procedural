import { subtract2d, add2d, scale2d, cart2Polar, length, vec2, TAU, vlerp } from './common.js';
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
  const dir = subtract2d(b, a);
  dir.normalize();

  const U = subtract2d(center, a);
  const proj = U.dot(dir);
  const U1 = scale2d(dir, proj);
  const U2 = subtract2d(U, U1);
  const d = length(U2);

  if (d < r) {
    // Possible intersections
    const m = Math.sqrt(r * r - d * d);
    const C = add2d(add2d(a, U1), scale2d(dir, -m));
    const D = add2d(add2d(a, U1), scale2d(dir, m));

    return [C, D];
  }

  return null;
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
    const inside = distance2d(this.center, p) <= this.r;
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
          lines.push(new Line(a,C));
        }

        if (hasD) {
          lines.push(new Line(D,b));
        }
      }
      else {
        const start = hasC ? C : a;
        const end = hasD ? D : b;
        lines.push(new Line(start,end));
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
      const dir = subtract2d(end, start);
      const offset = lengthOffset * length(dir);
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