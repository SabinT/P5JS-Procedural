import { vec2, polar2cart } from "./common.js";

/**
 * Centered arc
 * @param {*} radius
 * @param {*} angle1
 * @param {*} angle2
 */
export function cArc(radius, angle1, angle2) {
  const diameter = 2 * radius;
  arc(0, 0, diameter, diameter, angle1, angle2);
}

/**
 * Centered circle
 * @param {*} radius
 */
export function cCircle(radius) {
  circle(0, 0, 2 * radius);
}

export function polarLine(
  r1,
  theta1,
  r2,
  theta2,
  divisions = 1,
  vertexMode = false
) {
  let start = vec2(r1, theta1);
  let end = vec2(r2, theta2);
  for (let i = 0; i < divisions; i++) {
    const t1 = i / divisions;
    const t2 = (i + 1) / divisions;
    const p1 = p5.Vector.lerp(start, end, t1);
    const p2 = p5.Vector.lerp(start, end, t2);
    const a = polar2cart(p1);
    const b = polar2cart(p2);

    if (vertexMode) {
      vertex(a.x, a.y);
      if (i == divisions - 1) {
        vertex(b.x, b.y);
      }
    } else {
      line(a.x, a.y, b.x, b.y);
    }
  }
}

export function polarBox(r3, a3, r4, a4, divisions = 1) {
  // beginShape();
  // TODO turn this to begin shape and end shape, add fill
  polarLine(r3, a3, r4, a3, divisions);
  polarLine(r3, a4, r4, a4, divisions);
  polarLine(r3, a3, r3, a4, divisions);
  polarLine(r4, a3, r4, a4, divisions);
  // endShape(CLOSE);
}

/**
 * Draws a radially repeated ring of custom shape and repeat count.
 * @param {*} r1 Start radius of ring
 * @param {*} r2 End radius of ring
 * @param {integer} segments Repititions
 * @param {function} drawRingSegmentFunc A function that takes (r1, a1, r2, a2, i, options)
 * @param {object} options Arbitrary data for custom ring functions
 */
export function drawRing(r1, r2, segments, drawRingSegmentFunc, options) {
  const anglePerSegment = TAU / segments;
  const offset = 0.5 * anglePerSegment;

  for (let i = 0; i < segments; i++) {
    const angle1 = -offset + i * anglePerSegment;
    const angle2 = angle1 + anglePerSegment;

    if (options?.shape) {
      beginShape();
    }

    drawRingSegmentFunc(r1, angle1, r2, angle2, i, options);

    if (options?.shape) {
      endShape();
    }
  }
}
