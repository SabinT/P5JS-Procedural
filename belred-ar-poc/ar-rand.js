const NOISE1 = 0xb5297a4d // 0b0110'1000'1110'0011'0001'1101'1010'0100
const NOISE2 = 0x68e31da4 // 0b1011'0101'0010'1001'0111'1010'0100'1101
const NOISE3 = 0x1b56c4e9 // 0b0001'1011'0101'0110'1100'0100'1110'1001

// From https://stackoverflow.com/questions/34896909/is-it-correct-to-set-bit-31-in-javascript
// Refer to ECMA5 that the bitwise operators and shift operators operate on 32-bit ints,
// so in that case, the max safe integer is 2^31-1, or 2147483647.
// https://www.ecma-international.org/ecma-262/5.1/#sec-8.5
const MAX_SQUIRREL = (1 << 31) >>> 0 // 2147483648

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
  n = Math.imul(n, NOISE1)
  n += seed
  n ^= n >> 8
  n += NOISE2
  n ^= n << 8
  n = Math.imul(n, NOISE3)
  n ^= n >> 8

  return n >>> 0 // convert to unsigned
}

export function sqRand(n, seed = 0) {
  return squirrel3(n, seed) / MAX_SQUIRREL
}

const SQRAND_PRIME = 198491317

export function sqRand2D(x, y, seed = 0) {
  return sqRand(x + Math.imul(SQRAND_PRIME, y), seed)
}
