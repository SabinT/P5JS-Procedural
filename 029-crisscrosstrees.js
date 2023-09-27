import { vec2, dist2d, line2D } from "./lumic/common.js";
import { getOuterTangents, smoothPath, totalPathLength } from "./lumic/geomerty.js";

let currentPoints = [];
let paths = [];

const settings = {
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

window.setup = function () {
    createCanvas(1000, 1000);
    background(0);
}

function drawPath(path) {
    beginShape();
    for (let pt of path) {
        vertex(pt.x, pt.y);
    }
    endShape();
}

function drawPathPoints(path, radius = 5) {
    strokeWeight(1);
    for (let pt of path) {
        circle(pt.x, pt.y, 5);
    }
}

window.draw = function () {
    background(0);
    noFill();

    // Draw the temporary points during dragging
    stroke(255, 0, 0);
    strokeWeight(1);
    beginShape();
    for (let pt of currentPoints) {
        vertex(pt.x, pt.y);
    }
    endShape();

    // Draw smoothed paths
    for (let path of paths) {
        stroke(255);
        beginShape();
        for (let pt of path) {
            vertex(pt.x, pt.y);
        }
        endShape();

        drawPathPoints(path);

        const ladder = ladderize(path, settings);
        renderLadder(ladder);
    }
}

window.mousePressed = function () {
    currentPoints = [];
}

window.mouseDragged = function () {
    currentPoints.push(createVector(mouseX, mouseY));
}

window.mouseReleased = function () {
    if (currentPoints.length > 0) {
        let smoothed = smoothPath(currentPoints, settings.smoothBefore);

        let len = totalPathLength(smoothed);

        // Choose resample separation range based on length

        smoothed = resampleShrinking(smoothed, settings.resampleDistByLengthRemaining);
        smoothed = smoothPath(smoothed, settings.smoothAfter);
        paths.push(smoothed);
        currentPoints = [];
    }
}

window.keyTyped = function () {
    if (key === "s") {
        // save();

        const allOdd = [];
        const allEven = [];

        for (let path of paths) {
            const ladder = ladderize(path);
            const {odd, even} = renderLadder(ladder);
            allOdd.push(...odd);
            allEven.push(...even);
        }

        const evenSvg = generateSVG(allEven);
        const oddSvg = generateSVG(allOdd);

        downloadSVG(evenSvg, "even.svg");
        downloadSVG(oddSvg, "odd.svg");
    }

    if (key === "r" || key === "R") {
        render();
    }

    if (key === "z" || key === "Z") {
        paths.pop();
    }
};

function ladderize(path, settings) {
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

        // Draw the tangent and normal
        stroke(10, 0, 0);
        strokeWeight(1);
        line(p0.x, p0.y, p0.x + tangent.x * 20, p0.y + tangent.y * 20);
        stroke(0, 10, 0);
        line(p0.x, p0.y, p0.x + normal.x * 20, p0.y + normal.y * 20);

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

    // Draw ladder
    stroke("#ff00ff");
    // drawPathPoints(ladder);

    // stroke(255, 0, 0);
    drawPath(ladderPath);

    return ladder;
}

function renderLadder(ladder) {
    // Each segment is between two circles
    // Even segments in bottom layer, odd segments in top layer
    let evenSegments = [];
    let oddSegments = [];

    // Even
    for (let i = 0; i < ladder.length - 1; i += 2) {
        const s = createLadderSegment(ladder, i);
        evenSegments.push(s);
    }

    // Odd
    for (let i = 1; i < ladder.length - 1; i += 2) {
        const s = createLadderSegment(ladder, i);
        oddSegments.push(s);
    }

    return { odd: oddSegments, even: evenSegments };
}

function createLadderSegment(ladder, i) {
    const p0 = ladder[i].p;
    const p1 = ladder[i + 1].p;

    // Draw circles
    stroke(255);
    const r1 = ladder[i].r;
    const r2 = ladder[i + 1].r;
    circle(p0.x, p0.y, r1 * 2);
    circle(p1.x, p1.y, r2 * 2);
    const tangents = getOuterTangents(p0, p1, r1, r2);

    return {
        c1: { center: p0, radius: r1 },
        c2: { center: p1, radius: r2 },
        tangents: tangents
    }
}

function generateSVG(segments) {
    // Define SVG header with a specific width and height. Adjust as necessary.
    let svgContent = '<svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">\n';
    
    for (const segment of segments) {
        // Draw circles
        svgContent += `<circle cx="${segment.c1.center.x}" cy="${segment.c1.center.y}" r="${segment.c1.radius}" fill="none" stroke="black" />\n`;
        svgContent += `<circle cx="${segment.c2.center.x}" cy="${segment.c2.center.y}" r="${segment.c2.radius}" fill="none" stroke="black" />\n`;

        // Draw tangents as a closed path
        svgContent += `<path d="M ${segment.tangents.a.x} ${segment.tangents.a.y} `;
        svgContent += `L ${segment.tangents.b.x} ${segment.tangents.b.y} `;
        svgContent += `L ${segment.tangents.d.x} ${segment.tangents.d.y} `;
        svgContent += `L ${segment.tangents.c.x} ${segment.tangents.c.y} Z" fill="none" stroke="black" />\n`;
    }

    svgContent += '</svg>';

    return svgContent;
}

function downloadSVG(svgContent, filename) {
    // Convert SVG string to blob
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    
    // Create a blob URL
    const url = URL.createObjectURL(blob);
    
    // Create a download link and set its attributes
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download.svg';
    
    // Append the link to the body, trigger a click to start download, then remove the link
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Optional: release the blob URL (not strictly necessary but good for cleanup)
    URL.revokeObjectURL(url);
}

function resampleShrinking(path, rangeByLengthRemaining) {
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