import { drawPath, getOuterTangents, outerTangentPath, totalPathLength } from './geomerty.js'
import { dist2d, add2d, line2D, mul2d, ray2D, rot2dDeg, sub2d, transform, vec2, normalize2d } from "./common.js";


export const defaultLadderSettings = {
    smoothBefore: 5,
    smoothAfter: 1,
    resampleDistByLengthRemaining: d => {
        return 5 + d / 10;
    },
    distToLadderWidth: d => {
        return d * 0.9;
    },
    distToLadderCircleRadius: d => {
        return d * 0.2;
    }
}

function createLadderSegment(ladder, i, debugDraw = false) {
    const p0 = ladder[i].p;
    const p1 = ladder[i + 1].p;

    const r1 = ladder[i].r;
    const r2 = ladder[i + 1].r;

    if (debugDraw) {
        // Draw circles
        stroke(255);
        circle(p0.x, p0.y, r1 * 2);
        circle(p1.x, p1.y, r2 * 2);
    }
    const tangents = getOuterTangents(p0, p1, r1, r2, debugDraw);

    return {
        c1: { center: p0, radius: r1 },
        c2: { center: p1, radius: r2 },
        tangents: tangents
    }
}

function renderLadder(ladder, debugDraw = false) {
    // Each segment is between two circles
    // Even segments in bottom layer, odd segments in top layer
    let evenSegments = [];
    let oddSegments = [];

    // Even
    for (let i = 0; i < ladder.length - 1; i += 2) {
        const s = createLadderSegment(ladder, i, debugDraw);
        evenSegments.push(s);
    }

    // Odd
    for (let i = 1; i < ladder.length - 1; i += 2) {
        const s = createLadderSegment(ladder, i, debugDraw);
        oddSegments.push(s);
    }

    return { odd: oddSegments, even: evenSegments };
}

export function ladderize(path, settings, debugDraw = false) {
    let ladder = [];
    let ladderPath = [];

    ladder.push({ p: path[0], r: settings.distToLadderCircleRadius(dist2d(path[0], path[1])) });
    ladderPath.push(path[0]);

    // for each segment, calculate tangent and normal
    for (let i = 1; i < path.length - 1; i++) {
        let p0 = path[i];
        let p1 = path[i + 1];
        let tangent = p5.Vector.sub(p1, p0).normalize();
        let normal = createVector(-tangent.y, tangent.x);
        const d = dist2d(p0, p1);

        if (debugDraw) {
            // Draw the tangent and normal
            // stroke(10, 0, 0);
            // strokeWeight(1);
            // line(p0.x, p0.y, p0.x + tangent.x * 20, p0.y + tangent.y * 20);
            // stroke(0, 10, 0);
            // line(p0.x, p0.y, p0.x + normal.x * 20, p0.y + normal.y * 20);
        }

        // zigzag along the normal, right on odd, left on even
        const sideDir = i % 2 === 0 ? normal : p5.Vector.mult(normal, -1);
        const ladderWidth = settings.distToLadderWidth(d);
        const circlePos = p5.Vector.add(p0, p5.Vector.mult(sideDir, ladderWidth));
        const circleRadius = settings.distToLadderCircleRadius(d);
        ladder.push({ p: circlePos, r: circleRadius });
        ladderPath.push(circlePos);
    }

    ladder.push({ p: path[path.length - 1], r: settings.distToLadderCircleRadius(dist2d(path[path.length - 2], path[path.length - 1])) });
    ladderPath.push(path[path.length - 1]);

    if (debugDraw) {
        // Draw ladder
        stroke("#ff00ff");
        // drawPathPoints(ladder);

        // stroke(255, 0, 0);
        drawPath(ladderPath);
    }

    return renderLadder(ladder, debugDraw);
}

export function drawLadder(ladder) {
    // Draw even segments
    const odd = ladder.odd;
    for (let i = 0; i < odd.length; i++) {
        const c1 = odd[i].c1;
        const c2 = odd[i].c2;
        const path = outerTangentPath(c1.center, c2.center, c1.radius, c2.radius, 8);
        drawPath(path);
    }

    const even = ladder.even;
    for (let i = 0; i < even.length; i++) {
        const c1 = even[i].c1;
        const c2 = even[i].c2;
        const path = outerTangentPath(c1.center, c2.center, c1.radius, c2.radius, 8);
        drawPath(path);
    }
}

export function resampleShrinking(path, rangeByLengthRemaining) {
    let resampled = [];
    if (path.length === 0) return { path: [], length: 0 };

    resampled.push(path[0]);

    let currentSegmentIndex = 0;
    let positionInCurrentSegment = 0;

    let totalLength = totalPathLength(path);
    let accumDist = 0;

    let currentDesiredDistance = rangeByLengthRemaining(totalLength);
    let remainingDistance = currentDesiredDistance;

    while (currentSegmentIndex < path.length - 1) {
        let startPoint = path[currentSegmentIndex];
        let endPoint = path[currentSegmentIndex + 1];

        let segmentLength = dist2d(startPoint, endPoint);

        if (positionInCurrentSegment + remainingDistance < segmentLength) {
            let ratio = (positionInCurrentSegment + remainingDistance) / segmentLength;
            let resampledX = lerp(startPoint.x, endPoint.x, ratio);
            let resampledY = lerp(startPoint.y, endPoint.y, ratio);

            resampled.push(vec2(resampledX, resampledY));
            positionInCurrentSegment += remainingDistance;
            accumDist += remainingDistance;

            // Adjust the desired distance for next iteration, moving towards the min value
            // let adjustmentFactor = (desiredDistanceRange.y - desiredDistanceRange.x) / path.length;
            // currentDesiredDistance = Math.min(currentDesiredDistance - adjustmentFactor, desiredDistanceRange.x);

            currentDesiredDistance = rangeByLengthRemaining(totalLength - accumDist);

            remainingDistance = currentDesiredDistance;
        } else {
            accumDist += (segmentLength - positionInCurrentSegment);
            // remainingDistance -= (segmentLength - positionInCurrentSegment);
            remainingDistance -= segmentLength;
            currentSegmentIndex++;
            positionInCurrentSegment = 0;
        }
    }

    return resampled;
}