export function dot2(p) {
  return p.dot(p);
}

/**
 * Credits: Inigo Quilez
 * https://iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm
 */
export function sdCircle(p, r) {
  return length(p) - r;
}

/**
 * Credits: Inigo Quilez
 * https://iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm
 */
export function sdHeart(p) {
  p.x = Math.abs(p.x);

  if (p.y + p.x > 1.0) {
    return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  }

  return (
    sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) *
    sign(p.x - p.y)
  );
}
