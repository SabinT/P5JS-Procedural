export const PI = Math.PI;
export const HALF_PI = Math.PI / 2;
export const TAU = 2 * Math.PI;

export function vec2(x, y) {
  return { x: x, y: y };
}

export function add2d(a, b) {
  return vec2(a.x + b.x, a.y + b.y);
}

export function sub2d(a, b) {
  return vec2(a.x - b.x, a.y - b.y);
}

export function scale2d(a, s) {
  return vec2(a.x * s, a.y * s);
}

export function mul2d(a, b) {
  return vec2(a.x * b.x, a.y * b.y);
}

export function rotateAround(p, pivot, angle) {
  const dir = sub2d(p, pivot);
  const rotated = rot2d(dir, angle);
  return add2d(pivot, rotated);
}

export function rot2d(v, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

const root3 = Math.sqrt(3);

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
  const x = R * Math.sqrt(3) * (hex.x + 0.5 * (hex.y & 1));
  const y = ((R * 3) / 2) * hex.y;
  return vec2(x, y);
}

export function oddrToAxial(hex) {
  var q = hex.x - (hex.y - (hex.y & 1)) / 2;
  var r = hex.y;
  return vec2(q, r);
}

export function axialDistance(a, b) {
  return (
    (Math.abs(a.x - b.x) +
      Math.abs(a.x + a.y - b.x - b.y) +
      Math.abs(a.y - b.y)) /
    2
  );
}

export function getCenterDistOddr(hex) {
  return getDistOddr(hex, vec2(0, 0));
}

export function getDistOddr(hex1, hex2) {
  const ax = oddrToAxial(hex1);
  const cax = oddrToAxial(hex2);
  const d = axialDistance(ax, cax);
  return d;
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
    const offset = (this.sides % 2 === 0 ? 0 : -angleStep / 4) + this.rotation;
    return { angleStep, offset };
  }

  getPoint(i) {
    const { angleStep, offset } = this.getAngleStepOffset();
    const angle = i * angleStep + offset;
    const a = add2d(
      this.center,
      scale2d(vec2(Math.cos(angle), Math.sin(angle)), this.radius)
    );
    return a;
  }

  getPoints() {
    const points = [];
    for (let i = 0; i < this.sides; i++) {
      points.push(this.getPoint(i));
    }
    return points;
  }
}
