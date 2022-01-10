export const PI = 3.1415926535897932384626433832795;
export const TAU = 6.283185307179586476925286766559;

let EPS = 1e-6;

export function almostEquals(a, b) {
  return Math.abs(a - b) < EPS;
}

export function arcSweepCircle(g, center, r, ang1, ang2, steps, thickness) {
  let angStep = (ang2 - ang1) / steps;
  let ang = ang1;

  while (ang < ang2 || almostEquals(ang)) {
    let x = center.x + r * Math.cos(ang);
    let y = center.y + r * Math.sin(ang);

    g.circle(x, y, thickness * 2);

    ang += angStep;
  }
}
