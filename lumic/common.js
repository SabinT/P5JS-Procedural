export const PI = 3.1415926535897932384626433832795;
export const TAU = 6.283185307179586476925286766559;

export const DEG2RAD = 0.01745329;
export const RAD2DEG = 57.29578;

const temp_t = (Math.sqrt(5) + 1) / 2;
export const GOLDEN_ANGLE_DEGREES = 360 / (temp_t * temp_t);
export const GOLDEN_ANGLE_RADIANS = GOLDEN_ANGLE_DEGREES * DEG2RAD;

let EPS = 1e-6;

export function mod(n, m) {
  return ((n % m) + m) % m;
}

export function vec2(a, b) {
  return new p5.Vector(a, b);
}

export function vec3(x,y,z) {
  return new p5.Vector(x,y,z);
}

export function vec4(x,y,z,w) {
  return {x: x, y: y, z: z, w: w};
}

export function distance2(a,b) {
  return dist(a.x, a.y, b.x, b.y);
}

export function avg(x, y) {
  return 0.5 * (x + y);
}

export function polar2cart(v) {
  return vec2(v.x * Math.cos(v.y), v.x * Math.sin(v.y));
}

export function vertexPolar(p) {
  const c = polar2cart(p);
  vertex(c.x, c.y);
}

export function bezier2D(a, b, c, d, vertexMode = false) {
  if (vertexMode) {
    vertex(a.x, a.y);
    bezierVertex(b.x, b.y, c.x, c.y, d.x, d.y);
  } else {
    bezier(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y);
  }
}

export function bezierQuadratic2DShape(a, b, c) {
  vertex(a.x, a.y);
  quadraticVertex(b.x, b.y, c.x, c.y);
}

export function line2D(a, b) {
  line(a.x, a.y, b.x, b.y);
}

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

export function lerp(from, to, t) {
  return (1 - t) * from + t * to;
}

export function inverseLerp(from, to, value) {
  return (value - from) / (to - from);
}

export function remap(origFrom, origTo, targetFrom, targetTo, value) {
  const rel = inverseLerp(origFrom, origTo, value);
  return lerp(targetFrom, targetTo, rel);
}

export function getRandom(a) {
  return a[Math.floor(random(a.length))];
}

const NOISE1 = 0xb5297a4d; // 0b0110'1000'1110'0011'0001'1101'1010'0100
const NOISE2 = 0x68e31da4; // 0b1011'0101'0010'1001'0111'1010'0100'1101
const NOISE3 = 0x1b56c4e9; // 0b0001'1011'0101'0110'1100'0100'1110'1001

// From https://stackoverflow.com/questions/34896909/is-it-correct-to-set-bit-31-in-javascript
// Refer to ECMA5 that the bitwise operators and shift operators operate on 32-bit ints,
// so in that case, the max safe integer is 2^31-1, or 2147483647.
// https://www.ecma-international.org/ecma-262/5.1/#sec-8.5
const MAX_SQUIRREL = (1 << 31) >>> 0; // 2147483648

/**
 * Credits: Squirrel Eiserloh's random number generator.
 * Very nice video about RNGs and noise. Goes into examples and various of qualities of RNGs.
 * https://www.youtube.com/watch?v=LWFzPP8ZbdU
 * @param {*} n
 * @param {*} seed
 * @returns An integer between 0 and 2147483647
 */
function squirrel3(n, seed = 0) {
  // This is how you multiply 32-bit numbers in JS with proper overflow.
  // Bitwise operators in JS work on 32-bit numbers.
  n = Math.imul(n, NOISE1);
  n += seed;
  n ^= n >> 8;
  n += NOISE2;
  n ^= n << 8;
  n = Math.imul(n, NOISE3);
  n ^= n >> 8;

  return n >>> 0; // convert to unsigned
}

export function sqRand(n, seed = 0) {
  return squirrel3(n, seed) / MAX_SQUIRREL;
}

const SQRAND_PRIME = 198491317;

export function sqRand2D(x, y, seed = 0) {
  return sqRand(x + Math.imul(SQRAND_PRIME, y), seed);
}

export const sizes = {
  letter: { w: 850, h: 1100 },
};