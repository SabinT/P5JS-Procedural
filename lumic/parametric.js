import { E } from './common.js';

export function hypotrochoid(R, r, d, t) {
  const x = (R - r) * Math.cos(t) + d * Math.cos((( R - r) / r) * t);
  const y = (R - r) * Math.sin(t) - d * Math.sin((( R - r) / r) * t);

  return { x : x, y: y };
}

export function butterfly(t) {
  const x =
    Math.sin(t) *
    (Math.pow(E, Math.cos(t)) -
      2 * Math.cos(4 * t) -
      Math.pow(Math.sin(t / 12), 5))

  const y =
    Math.cos(t) *
    (Math.pow(E, Math.cos(t)) -
      2 * Math.cos(4 * t) -
      Math.pow(Math.sin(t / 12), 5))

  return { x: x, y: y }
}
