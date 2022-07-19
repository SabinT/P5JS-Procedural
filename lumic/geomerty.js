import { subtract2d, add2d, scale2d, length } from './common.js';

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

  draw() {
    line(this.a.x, this.a.y, this.b.x, this.b.y);
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
