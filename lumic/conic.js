import { distPolar, polar2cart, TAU, vec2 } from "./common.js";
import { angleDiff, angleNormPi, angleNormTau, distToLine } from "./geomerty.js";
import { polarLine, polarLine2d } from "./mandala.js";

/**
 * Creates an unfolding of a conic section into an annular sector.
 * @param {*} R1 Bottom radius of the conical frustum
 * @param {*} R2 Top radius of the conical frustum
 * @param {*} s Slant height (along the side) of the conical frustum
 * @returns {r1, r2, theta} A 2D unwrapping of the conical frustum in a polar coordinate system
 *   r1: radius of the outer circle (corresponding to R1)
 *   r2: radius of the inner circle (corresponding to R2)
 *   theta: angle in radians of the annular sector.
 */
export function conicToPolar2d(R1, R2, s) {
    const r1 = R2 * s / (R1 - R2);
    const r2 = r1 + s;
    const theta = TAU * R2 / r2;
    return { r1, r2, theta }
}

/**
 * TODO: not accurate but works well enough inside.
 * Shortest (curved) distance from a point vPolar (in polar coords) to an annular sector
 * defined by an inner and outer radius and an angle.
 * Only correct from within the sector.
 */
export function distToAnnularSector(vPolar, r1, r2, theta, debug) {
    const rOuter = Math.max(r1, r2);
    const rInner = Math.min(r1, r2);
    const vCart = polar2cart(vPolar);

    const isInsideRadial = vPolar.x >= rInner && vPolar.x <= rOuter;
    const isInsideAngular = angleNormTau(vPolar.y) <= theta;

    // Four corner points (polar coordinates)
    const A = vec2(rOuter, 0);
    const B = vec2(rOuter, theta);
    const C = vec2(rInner, 0);
    const D = vec2(rInner, theta);
  
    const vr = vPolar.x;
    theta = angleNormTau(theta);
    
    let d = Infinity;
    
    // Check distance with inside/outside rings
    if (isInsideAngular) {
        d = Math.min(d, Math.abs(vr - r1));
        d = Math.min(d, Math.abs(vr - r2));
    }
    
    // Calculate arc distance from the sides
    if (isInsideRadial) {
    // if (vPolar.x >= rInner) {
        const vTheta = angleNormPi(vPolar.y);

        // find the closer edge with anglediff
        const daStart = abs(angleDiff(vTheta, 0));
        const daEnd = abs(angleDiff(vTheta, theta));

        const isStartCloser = daStart < daEnd;

        let dStartEdge = Infinity;
        let dEndEdge = Infinity;

        if (isStartCloser) {
            dStartEdge = distToLine(vCart, polar2cart(A), polar2cart(C));
        } else {
            dEndEdge = distToLine(vCart, polar2cart(B), polar2cart(D));
        }
        // dStartEdge = distToLine(vCart, polar2cart(A), polar2cart(C));
        // dEndEdge = distToLine(vCart, polar2cart(B), polar2cart(D));
        d = Math.min(d, dStartEdge);
        d = Math.min(d, dEndEdge);

        if (debug) {
            textAlign(CENTER, TOP);
            textSize(32);
            text(`{${dStartEdge.toFixed(2)}, ${dEndEdge.toFixed(2)}}`, vCart.x, vCart.y + 30)
        }

        // d = Math.min(d, abs(vTheta) * vr); // dist to starting edge
        // d = Math.min(d, abs(angleDiff(vTheta, theta)) * vr); // dist to ending edge
    }

    // Check distance with corner points
    d = Math.min(d, distPolar(vPolar, A));
    d = Math.min(d, distPolar(vPolar, B));
    d = Math.min(d, distPolar(vPolar, C));
    d = Math.min(d, distPolar(vPolar, D));

    if (debug) {
        // Draw polar lines to both arcs and sector lines
        stroke(0, 255, 0);
        polarLine2d(vPolar, vec2(vPolar.x, 0), 32);
        stroke(255, 0, 0);
        polarLine2d(vPolar, vec2(vPolar.x, theta), 32);
    }
  
    return d;
  }