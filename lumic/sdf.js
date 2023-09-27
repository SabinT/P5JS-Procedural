import { vec2, len2d } from "./common.js";

export function dot2(p) {
  return p.dot(p);
}

/**
 * Credits: Inigo Quilez
 * https://iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm
 */
export function sdCircle(p, r) {
  return len2d(p) - r;
}

/**
 * Credits: Inigo Quilez
 * https://iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm
 */
export function sdHeart(p) {
  p.x = Math.abs(p.x);

  if (p.y + p.x > 1.0) {
    return sqrt(dot2(vec2(p.x - 0.25, p.y - 0.75))) - sqrt(2.0) / 4.0;
  }

  let q = vec2(p.x, p.y - 1.0);
  let m = 0.5 * max(p.x + p.y, 0.0);

  return (
    sqrt(min(dot2(q), dot2(vec2(p.x - m, p.y - m) ))) *
    Math.sign(p.x - p.y)
  );
}
