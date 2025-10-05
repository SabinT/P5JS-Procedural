import { BezierCubic } from "./lumic/bezier.js";
import { Debug } from "./lumic/debug.js";
import { vec2, lerp, normalize2d, add2d, line2D, mul2d, scale2d, lerp2d, sub2d, dist2d, sqRand, rgba01FromHex, PI, dot2d, repeat, rot2d, mixSeed, remap } from "./lumic/common.js";
import { clamp01, easeInOutElastic, easeInOutQuad, easeInOutQuart, easeInQuad, easeOutQuad, smoothstep } from "./lumic/easing.js";
import { CubicHermite2D } from "./lumic/hermite.js";
import { centerCanvas, setCanvasZIndex } from "./lumic/p5Extensions.js";
import { Frame2D } from "./lumic/frame.js";
import { drawPath, drawPathWithGradient, getTangents, rotateAbout, rotateTowards } from "./lumic/geomerty.js";
import { spineVert, spineFrag } from "./049-feather3-shaders.js";
// import * as dat from 'libraries/dat.gui.min.js';

// Interesting links / related materials:
// https://eyosido.com/hairtg-feather

// Outline of the feather:
// Feather contains:
// - A spine (hermite spline - p0,m1,p1,m1)
// - Tendrils (on both sides)
//   - grouped into clumps
//   - some properties are randomized per clump (ic = clump index)
//   - some properties are graded per clump (tc = 0-1 along clump)
//   - some peroperties are graded per feather (tf = 0-1 along feather)

const w = 1920;
const hw = w / 2;
const h = 1080;
const hh = h / 2;

Debug.enabled = false; // Enable debug drawing

const debugDrawToggles = {
  spine: false,
  vane: false,
  barbs: false,
  barbTangents: false,
  barbMesh: false,
  afterFeather: true,
  spineShader: false,
  vanePattern: false,
  colorizeByClump: false,
}

// Temporary debug sliders for testing
const debugSliders = {
  a: 0.981499,
}

const gui = new dat.GUI();

const params = {
  randomSeed: 123456789,
  // cubic hermite spline
  spineCurve: CubicHermite2D.FromObject({ "p0": { "x": 297, "y": 546 }, "m0": { "x": 176, "y": -122 }, "p1": { "x": 1343, "y": 576 }, "m1": { "x": 680, "y": -284 } }),
  spineDivisions: 100,
  spineBaseWidth: 13,
  spineEnd: 0.95,
  spineWidthCurve: (t) => {
    return 1 - easeInQuad(t);
  },
  nBarbs: 240, // barbs start at the end of the calamus
  // Afterfeather is the plumaceous part of the feather (fluffy)
  afterFeatherStart: 0.19,
  afterFeatherEnd: 0.3,
  // Vane is the pennaceous part of the feather (flat, stiff), starts after the afterfeather
  vaneBreakEnd: 1,
  vaneBaseWidth: 100,
  vaneWidthCurve: (t) => {
    return smoothstep(-0.25, 0.04, t)
      * smoothstep(2, 0.1, t)
      * smoothstep(1.5, 0.6, t);
  },
  barbTiltStart: 0.41, // 0-1 = 0 to 90 degrees, 0 = perpendicular, 1 = along spine
  barbTiltCurve: (t) => {
    return smoothstep(0.8, 1, t);
  },
  // Number of breaks in the vane (when the barbs are not connected, causing a gap)
  vaneBreaks: 30,
  vaneBreakSymmetry: 0.74, // 0 = left only, 1 = right only, 0.5 = even on both sides
  vaneNoiseLevelExp: -1.07,
  vaneNoiseScaleExp: -2,
  clumpCohesionStart: 0.8,
  clumpCohesionEnd: 1.0,
  clumpNoiseLevel: 0.13,
  clumpNoiseScaleExp: 2.814,
  barbInnerNoiseLevel: 0.184,
  barbInnerNoiseScaleExp: 0.459,
  afterFeather : {
    nBarbs: 34,
    baseWidth: 37,
    widthCurve: (t) => {
      // t = 0-1 along afterfeather
      return smoothstep(-1, 0.9, t) * smoothstep(2, 0.5, t)
    },
    barbTiltCurve: (t) => {
      return (1 - smoothstep(0.1, 0.9, t)) * 0.25; // never fully tilted
      // return 0.1
    }
  },
  shaderParams: {
    baseColor: "#bfb09a",
    edgeColor: "#665954",
    edgeSoftness: 0.75,
    ridgeSoftness: 0.44,
    ridgeHighlight: 0.5,
    tipDarken: 0.35,
  }
};

// Reduced divisions for faster debugging
let debugParams = { ...params };
debugParams.spineDivisions = 20;
debugParams.nBarbs = 20;

class Feather {
  constructor(params) {
    this.params = params;
    this.build();
  }

  build() {
    this.buildSpine();
    this.buildVane(); // populates empty barbs with clumping along the vane

    // populates barbs with geometry
    this.initBarbs();
    for (let i = 0; i < this.vaneBarbs.length; i++) {
      this.buildBarb(this.vaneBarbs[i]);
    }

    // Adjust barbs to strengthen clump cohesion
    this.adjustClumpCohesion();

    this.buildAfterfeather();
    this.initAfterfeatherBarbs();

    for (let i = 0; i < this.afterFeatherBarbs.length; i++) {
      this.buildAfterfeatherBarb(this.afterFeatherBarbs[i]);
    }
  }

  adjustClumpCohesion() {
    for (let i = this.vaneBarbs.length - 1; i > 0; i--) {
      const barb = this.vaneBarbs[i];
      // Note: since left/right barbs are interleaved, get previous of same side by going back 2
      const previousBarb = (i > 1 ? this.vaneBarbs[i - 2] : null);
      if (previousBarb && previousBarb.clumpIndex === barb.clumpIndex) {
        // Move previous barb's tip towards this barb's tip slightly
        for (let j = 0; j < barb.pts.length; j++) {
          const p = barb.pts[j];
          const q = previousBarb.pts[j];
          const mTip = smoothstep(0.6, 1, j / (barb.pts.length - 1));
          previousBarb.pts[j] = lerp2d(q, p, mTip * 0.75);
        }
      }
    }
  }

  buildVane() {
    const params = this.params;
    const tBarbStart = params.afterFeatherEnd;
    const tBarbEnd = 1;
    const tVaneBreakEnd = params.vaneBreakEnd;

    // Split vaneBreaks into left/right with some randomness
    // Create stops for the vane breaks
    const nVaneBreaks = params.vaneBreaks;
    const nLeftVaneBreaks = Math.floor(nVaneBreaks * (1 - params.vaneBreakSymmetry));
    const nRightVaneBreaks = nVaneBreaks - nLeftVaneBreaks;
    const leftVaneBreakStops = [];
    const rightVaneBreakStops = [];

    const seedLeft  = mixSeed(params.randomSeed, 0xA5);
    const seedRight = mixSeed(params.randomSeed, 0xC3);
    const breakMaxStagger = 0.2;

    if (nLeftVaneBreaks > 0) {
      for (let i = 0; i < nLeftVaneBreaks; i++) {
        const tBreak = i / nLeftVaneBreaks;
        const t = lerp(tBarbStart, tVaneBreakEnd, tBreak + breakMaxStagger * sqRand(i, seedLeft));
        leftVaneBreakStops.push(t);
      }
    }
  
    if (nRightVaneBreaks > 0) {
      for (let i = 0; i < nRightVaneBreaks; i++) {
        const tBreak = i / nRightVaneBreaks;
        const t = lerp(tBarbStart, tVaneBreakEnd, tBreak + breakMaxStagger * sqRand(i, seedRight));
        rightVaneBreakStops.push(t);
      }
    }

    leftVaneBreakStops.sort((a, b) => a - b);
    rightVaneBreakStops.sort((a, b) => a - b);

    Debug.log(`Left vane breaks: ${nLeftVaneBreaks}, Right vane breaks: ${nRightVaneBreaks}`);
    Debug.log("Left vane break stops:", leftVaneBreakStops);
    Debug.log("Right vane break stops:", rightVaneBreakStops);


    // Get frames along the spine for the barbs
    this.vaneBarbs = [];
    this.spineFrames = [];
    const barbWidthNormalized = (1 - tBarbStart) / params.nBarbs;
    let iClumpLeft = 0; // Clump index (even)
    let iClumpRight = 0; // Clump index (odd)
    let lastVaneBreakStopIndexLeft = -1;
    let lastVaneBreakStopIndexRight = -1;
    let iBarb = 0;

    const { points, tangents } = this.getPointsAndTangentsAlongSpine(tBarbStart, 1, params.nBarbs);

    for (let i = 0; i < points.length; i++) {
      const tAlongSpine = tBarbStart + i * barbWidthNormalized;
      const tAlongVane = i / (points.length - 1);
      const spineWidth = params.spineBaseWidth * params.spineWidthCurve(tAlongSpine);

      const rightFrame = new Frame2D(points[i], tangents[i]);
      const leftFrame = new Frame2D(rightFrame.origin, rightFrame.forward, scale2d(rightFrame.right, -1));

      // Barbs are slightly offset from the spine
      rightFrame.translate(scale2d(rightFrame.right, spineWidth / 2));
      leftFrame.translate(scale2d(leftFrame.right, spineWidth / 2));

      // Assign a "clump index" to the barb
      // Every time there is a break in the vane, a new clump starts
      
      // --- LEFT: advance until we're in the correct clump ---
      while (
        lastVaneBreakStopIndexLeft + 1 < leftVaneBreakStops.length &&
        tAlongSpine >= leftVaneBreakStops[lastVaneBreakStopIndexLeft + 1]
      ) {
        lastVaneBreakStopIndexLeft++;
        iClumpLeft++;
        if (Debug.enabled) {
          console.log(`Left clump -> ${iClumpLeft} at t=${tAlongSpine.toFixed(3)}`);
        }
      }

      // --- RIGHT: advance until we're in the correct clump ---
      while (
        lastVaneBreakStopIndexRight + 1 < rightVaneBreakStops.length &&
        tAlongSpine >= rightVaneBreakStops[lastVaneBreakStopIndexRight + 1]
      ) {
        lastVaneBreakStopIndexRight++;
        iClumpRight++;
        if (Debug.enabled) {
          console.log(`Right clump -> ${iClumpRight} at t=${tAlongSpine.toFixed(3)}`);
        }
      }

      // Position within current clump (handle zero-length segments safely)
      const prevLeft = lastVaneBreakStopIndexLeft >= 0
        ? leftVaneBreakStops[lastVaneBreakStopIndexLeft] : tBarbStart;
      const nextLeft = lastVaneBreakStopIndexLeft + 1 < leftVaneBreakStops.length
        ? leftVaneBreakStops[lastVaneBreakStopIndexLeft + 1] : tBarbEnd;

      const prevRight = lastVaneBreakStopIndexRight >= 0
        ? rightVaneBreakStops[lastVaneBreakStopIndexRight] : tBarbStart;
      const nextRight = lastVaneBreakStopIndexRight + 1 < rightVaneBreakStops.length
        ? rightVaneBreakStops[lastVaneBreakStopIndexRight + 1] : tBarbEnd;

      const safeFrac = (t, a, b) => {
        const d = b - a;
        if (Math.abs(d) < 1e-6) { return t >= b ? 1 : 0; }
        const v = (t - a) / d;
        return v < 0 ? 0 : v > 1 ? 1 : v;
      };

      const tAlongClumpLeft  = safeFrac(tAlongSpine, prevLeft,  nextLeft);
      const tAlongClumpRight = safeFrac(tAlongSpine, prevRight, nextRight);

      const vaneWidth = params.vaneBaseWidth * params.vaneWidthCurve(tAlongVane);

      const rightBarb = {
        frame: rightFrame,
        clumpIndex: iClumpRight,
        tAlongClump: tAlongClumpRight,
        barbIndex: iBarb++,
        length: vaneWidth,
        tAlongSpine: tAlongSpine,
        tAlongVane: tAlongVane
      };

      const leftBarb = {
        frame: leftFrame,
        clumpIndex: iClumpLeft,
        tAlongClump: tAlongClumpLeft,
        barbIndex: iBarb++,
        length: vaneWidth,
        tAlongSpine: tAlongSpine,
        tAlongVane: tAlongVane
      };

      this.vaneBarbs.push(rightBarb);
      this.vaneBarbs.push(leftBarb);
    }
  }

  buildAfterfeather() {
    const params = this.params.afterFeather;
    const tSpineStart = this.params.afterFeatherStart;
    const tSpineEnd = this.params.afterFeatherEnd;

    this.afterFeatherBarbs = [];

    // Find root points
    let rootPoints = [];
    for (let i = 0; i < params.nBarbs; i++) {
      const t = i / (params.nBarbs - 1);
      const tAlongSpine = lerp(tSpineStart, tSpineEnd, t);
      // Sample the spine spline
      const rootPoint = this.params.spineCurve.GetPosition(tAlongSpine);
      rootPoints.push(rootPoint);
    }

    // Find tangents
    const tangents = getTangents(rootPoints);

    for (let i = 0; i < rootPoints.length; i++) {
      const t = i / (rootPoints.length - 1);
      const tAlongSpine = lerp(tSpineStart, tSpineEnd, t);

      // Find the frame
      const spineWidth = this.params.spineBaseWidth * this.params.spineWidthCurve(tAlongSpine);
      let frameRight = new Frame2D(rootPoints[i], tangents[i]);
      let frameLeft = new Frame2D(frameRight.origin, frameRight.forward, scale2d(frameRight.right, -1));
      frameRight.translate(scale2d(frameRight.right, spineWidth / 2));
      frameLeft.translate(scale2d(frameLeft.right, spineWidth / 2));

      const barbLength = params.baseWidth * params.widthCurve(t);

      this.afterFeatherBarbs.push({
         frame: frameRight,
          length: barbLength,
          tAlongAfterfeather: t
      });
      this.afterFeatherBarbs.push({ 
        frame: frameLeft,
        length: barbLength,
        tAlongAfterfeather: t
      });
    }
  }

  initBarbs() {
    const params = this.params;

    
    for (let i = 0; i < this.vaneBarbs.length; i++) {
      const barb = this.vaneBarbs[i];
      const rootTangentLength = 0.05 * this.spineLength * (1 - barb.tAlongVane); // TODO bad magic number
      const tipTangentLength = 0.15 * this.spineLength * (1 - barb.tAlongVane * 0.75);
      const barbRoot = barb.frame.origin;
      const rootTangent = scale2d(barb.frame.forward, rootTangentLength); // point back along the spine

      // const barbTipRaw = add2d(barbRoot, scale2d(barb.frame.right, barb.length));
      // const barbTip = add2d(barbTipRaw, scale2d(barb.frame.forward, dtAlongSpine * this.spineLength));
      // const tipTangent = scale2d(normalize2d(sub2d(barbTip, barbTipRaw)), tipTangentLength);

      const barbTilt = clamp01(params.barbTiltCurve(barb.tAlongVane) + params.barbTiltStart);
      const dirToTip = rotateTowards(barb.frame.right, barb.frame.forward, barbTilt);

      // Adjust barb length at extreme tilt
      const tBarbLengthMultiplier = 1 - smoothstep(0.995, 1, barbTilt);

      const barbTip = add2d(barbRoot, scale2d(dirToTip, barb.length * tBarbLengthMultiplier));
      let tipTangentDir = normalize2d(lerp2d(dirToTip, barb.frame.forward, 0.6));
      let tipTangent = scale2d(tipTangentDir, tipTangentLength);
      tipTangent = rotateTowards(tipTangent, barb.frame.forward, barb.tAlongVane);

      barb.spline = new CubicHermite2D(barbRoot, rootTangent, barbTip, tipTangent);
    };
  }

  initAfterfeatherBarbs() {
    // Create the splines for the afterfeather barbs
    for (let i = 0; i < this.afterFeatherBarbs.length; i++) {
      const barb = this.afterFeatherBarbs[i];
      const barbRoot = barb.frame.origin;
      const rootTangentLength = 0.05 * this.spineLength; // TODO bad magic number
      const rootTangent = scale2d(barb.frame.forward, rootTangentLength); // point back along the spine

      const barbTilt = clamp01(this.params.afterFeather.barbTiltCurve(barb.tAlongAfterfeather) + this.params.barbTiltStart);
      const dirToTip = rotateTowards(barb.frame.right, barb.frame.forward, barbTilt);
      const barbTip = add2d(barbRoot, scale2d(dirToTip, barb.length));
      const tipTangent = scale2d(dirToTip, 0.02 * this.spineLength);
      barb.spline = new CubicHermite2D(barbRoot, rootTangent, barbTip, tipTangent);
      barb.index = i;
    }
  }

  buildSpine() {
    const params = this.params;

    // Don't directly use the hermite's frame, build a smoother one from points
    var { points, tangents } = this.getPointsAndTangentsAlongSpine(0, params.spineEnd, params.spineDivisions);

    this.spine = [];
    let spineLength = 0;
    let prevPoint = null;
    for (let i = 0; i < points.length; i++) {
      const tAlongSpine = i / (points.length - 1);
      const spineWidth = params.spineBaseWidth * params.spineWidthCurve(tAlongSpine);
      const spinePt = {
        frame: new Frame2D(points[i], tangents[i]),
        width: spineWidth,
      }

      this.spine.push(spinePt);

      if (prevPoint) {
        spineLength += dist2d(points[i], prevPoint);
      }
      prevPoint = points[i];
    }

    this.spineLength = spineLength;

    Debug.log(`Spine length: ${spineLength}`);
  }

  buildBarb(barb) {
    const nPoints = 80;
    const origPts = barb.spline.GetPoints(nPoints);
    // const origDirections = getTangents(origPts);
    let origDirections = [];
    for (let j = 0; j < origPts.length - 1; j++) {
      const p = origPts[j];
      const q = origPts[j + 1];
      const dir = sub2d(q, p);
      origDirections.push(dir);
    }

    const clumpSeed = mixSeed(params.randomSeed, barb.clumpIndex);
    const clumpRandom = sqRand(clumpSeed);
    noiseSeed(clumpSeed);
    const nL = Math.pow(10, this.params.vaneNoiseLevelExp);
    const nS = Math.pow(10, this.params.vaneNoiseScaleExp);

    // Create accumulating noise along the barb
    const disturbAngle = [];
    for (let j = 1; j < origDirections.length; j++) {
      const t = j / (origDirections.length - 1);
      const angle = nL * (noise(-t * nS, clumpRandom * 100) - 0.5);
      disturbAngle.push(angle);
    }

    // Rotate directions cumulatively along the barb
    let cumulativeRotation = 0;
    for (let j = 0; j < origDirections.length; j++) {
      // Less disturbance at the root and tip
      const mRoot = smoothstep(0.2, 1, j / (origDirections.length - 1));
      const mTip = smoothstep(1, 0.8, j / (origDirections.length - 1));
      cumulativeRotation += disturbAngle[j]; // * mRoot * mTip;
      origDirections[j] = rot2d(origDirections[j], cumulativeRotation);
    }
    
    const x = barb.tAlongClump;
    // let tEasing = 1 - (1 - x)* (1-x);
    // tEasing = clamp01(tEasing * 1.5 + 0.2);
    // let tOriginal = smoothstep(-0, 0.8, x);
    let tOriginal = easeOutQuad(x);
    tOriginal = remap(0, 1, params.clumpCohesionStart, params.clumpCohesionEnd, tOriginal);

    // Convert tangents back to points based on the first point
    let currentPoint = origPts[0];

    let pts = [];
    pts.push(currentPoint);
    for (let j = 1; j < origDirections.length; j++) {
      const tangent = origDirections[j];
      // Apply noisy rotation
      let finalPt = add2d(currentPoint, tangent);
      pts.push(finalPt);
    }
    
    // Interpolate between original and disturbed points based on easing
    // Add some noise to the interpolation factor
    const clumpNoiseScale = Math.pow(10, this.params.clumpNoiseScaleExp);
    tOriginal += (noise(tOriginal * clumpNoiseScale) - 0.5) * params.clumpNoiseLevel;
    for (let j = 0; j < pts.length; j++) {
      const t = j / (origDirections.length - 1);
      // Additional noise within barb
      const tAdjusted = tOriginal + (noise(t * Math.pow(10, params.barbInnerNoiseScaleExp) + barb.tAlongClump * clumpNoiseScale) - 0.5) * params.barbInnerNoiseLevel;
      pts[j] = lerp2d(pts[j], origPts[j], tAdjusted);
    }

    barb.pts = pts;
    return pts;
  }

  buildAfterfeatherBarb(barb) {
    const nPoints = 30;
    
    const afSeed = mixSeed(params.randomSeed, 0xAF00 + barb.index);
    const barbRandom = sqRand(afSeed);
    noiseSeed(afSeed);
    const nL = Math.pow(10, this.params.vaneNoiseLevelExp);
    const nS = Math.pow(10, this.params.vaneNoiseScaleExp);

    const origPts = barb.spline.GetPoints(nPoints);
    let origDirections = [];
    for (let j = 0; j < origPts.length - 1; j++) {
      const p = origPts[j];
      const q = origPts[j + 1];
      const dir = sub2d(q, p);
      origDirections.push(dir);
    }

    // Create accumulating noise along the barb
    const disturbAngle = [];
    for (let j = 1; j < origDirections.length; j++) {
      const t = j / (origDirections.length - 1);
      const angle = nL * (noise(-t * nS, barbRandom * 100) - 0.5);
      disturbAngle.push(angle);
    }

    // Rotate directions cumulatively along the barb
    let cumulativeRotation = 0;
    for (let j = 0; j < origDirections.length; j++) {
      // No need to taper disturbance at the tip for afterfeather
      cumulativeRotation += disturbAngle[j];
      origDirections[j] = rot2d(origDirections[j], cumulativeRotation);
    }

    // Convert tangents back to points based on the first point
    let currentPoint = origPts[0];
    let pts = [];
    pts.push(currentPoint);
    for (let j = 1; j < origDirections.length; j++) {
      const tangent = origDirections[j];
      currentPoint = add2d(currentPoint, tangent);
      pts.push(currentPoint);
    }

    barb.pts = pts;
  }

  getPointsAndTangentsAlongSpine(tStart, tEnd, nPoints) {
    const params = this.params;
    let points = [];
    for (let t = tStart; t <= tEnd; t += (tEnd - tStart) / nPoints) {
      const point = params.spineCurve.GetPosition(t);
      points.push(point);
    }

    const tangents = getTangents(points);
    return { points, tangents };
  }

  draw() {
    this.drawBarbs();
    this.drawAfterfeather();
    this.drawSpine();

    if (Debug.enabled) {
      this.debugDraw();
    }
  }

  drawSpine() {
    push();

    noStroke();

    // Use a shader that draws a gradient based on uv.y
    shader(spineShader);
    const sParams = this.params.shaderParams;
    spineShader.setUniform('uBaseColor', rgba01FromHex(sParams.baseColor));
    spineShader.setUniform('uEdgeColor', rgba01FromHex(sParams.edgeColor));
    spineShader.setUniform('uEdgeSoftness', sParams.edgeSoftness);
    spineShader.setUniform('uTipDarken', sParams.tipDarken);
    spineShader.setUniform('uRidgeSoftness', sParams.ridgeSoftness);
    spineShader.setUniform('uRidgeHighlight', sParams.ridgeHighlight);
    spineShader.setUniform('uDebug', debugDrawToggles.spineShader ? 1 : 0);

    // Construct a shape with UVs for the spine
    // Squeeze the starting tip to a point over a very short distance
    beginShape(TRIANGLE_STRIP);
    for (let i = 0; i < this.spine.length; i++) {
      const t = i / (this.spine.length - 1);
      const u = t;
      const p = this.spine[i];

      const squeeze = smoothstep(0, 0.05, t);

      const d = p.width * 0.5 * squeeze;
      const r = add2d(p.frame.origin, scale2d(p.frame.right, d));
      const l = add2d(p.frame.origin, scale2d(p.frame.right, -d));
      vertex(r.x, r.y, 0, u, 0.5);
      vertex(l.x, l.y, 0, u, -0.5);
    }
    endShape();

    resetShader();

    pop();
  }

  drawBarbMesh(barb, index) {
    push();

    if (!barb || !barb.pts || barb.pts.length < 2) {
      pop();
      return;
    }

    const points = barb.pts;
    const clumpColor = getClumpColor(barb.clumpIndex);
    const barbMeshWidthBaseFactor = 0.75;
    const barbMeshWidthTipFactor = 0.1;

    // Estimate gap to neighbouring barb on the same side to derive mesh width
    let neighbour = null;
    if (index === undefined) {
      index = this.vaneBarbs.indexOf(barb);
    }
    if (index !== -1) {
      let neighbourIndex = index + 2;
      if (neighbourIndex >= this.vaneBarbs.length) {
        neighbourIndex = index - 2;
      }
      if (neighbourIndex >= 0 && neighbourIndex < this.vaneBarbs.length) {
        neighbour = this.vaneBarbs[neighbourIndex];
      }
    }

    let meshGap = neighbour ? dist2d(barb.frame.origin, neighbour.frame.origin) : barb.length * 0.2;
    if (!Number.isFinite(meshGap) || meshGap <= 0) {
      meshGap = barb.length * 0.2;
    }

    noStroke();
    fill(clumpColor);

    beginShape(TRIANGLE_STRIP);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const last = points.length - 1;

      let tangent;
      if (last === 0) {
        tangent = vec2(1, 0);
      } else if (i === 0) {
        tangent = sub2d(points[1], points[0]);
      } else if (i === last) {
        tangent = sub2d(points[last], points[last - 1]);
      } else {
        const forward = sub2d(points[i + 1], points[i]);
        const backward = sub2d(points[i], points[i - 1]);
        tangent = add2d(forward, backward);
      }

      if ((tangent.x === 0 && tangent.y === 0) && i > 0) {
        tangent = sub2d(points[i], points[i - 1]);
      }

      let dir = normalize2d(tangent);
      if (!Number.isFinite(dir.x) || !Number.isFinite(dir.y)) {
        dir = vec2(1, 0);
      }

      const normal = vec2(-dir.y, dir.x);
      const t = last > 0 ? i / last : 0;
      const widthFactor = lerp(barbMeshWidthBaseFactor, barbMeshWidthTipFactor, t);
      const halfWidth = 0.5 * meshGap * widthFactor;

      const offset = scale2d(normal, halfWidth);
      const left = add2d(p, offset);
      const right = add2d(p, scale2d(normal, -halfWidth));

      vertex(left.x, left.y);
      vertex(right.x, right.y);
    }
    endShape();

    pop();
  }

  drawBarbs() {
    push();

    for (let i = 0; i < this.vaneBarbs.length - 6; i++) {
      // if (i < 82) { continue; } // TEMPORARY
      
      const barb = this.vaneBarbs[i];
      // barb.spline.Draw();

      if (debugDrawToggles.barbMesh) {
        this.drawBarbMesh(barb, i);
        continue;
      }
      
      const pts = barb.pts;

      noFill();
      let barbColor;
      if (debugDrawToggles.colorizeByClump) {
        const clumpColor = getClumpColor(barb.clumpIndex);
        barbColor = lerpColor(clumpColor, color(255), barb.tAlongClump);
        let barbEndColor = lerpColor(barbColor, color(255), 1);
        drawPathWithGradient(pts, barbColor, barbEndColor);
      } else {
        barbColor = color(200);
        stroke(barbColor);
        drawPath(pts);
      }

      if (debugDrawToggles.vanePattern) {
        // Create an aliasing like effect by drawing dots at specific angles
        for (let j = 1; j < pts.length; j++) {
          const p = pts[j - 1];
          const q = pts[j];
          const dir = normalize2d(sub2d(q, p));
          const repeatInterval = 0.1;
          const tVaneRepeat = repeat(barb.tAlongVane, repeatInterval) * 100;
          const k = smoothstep(0, repeatInterval * 0.1, tVaneRepeat) * smoothstep(1, 1 - 0.1 * repeatInterval, tVaneRepeat);
          const d1 = abs(dot2d(dir, normalize2d(vec2(1, 1 - k))));
          const d2 = abs(dot2d(dir, normalize2d(vec2(1, 5 - k))));
          const d3 = abs(dot2d(dir, normalize2d(vec2(1, 7 - k))));
          const test = 0.99999;

          if (d1 > debugSliders.a) {
            stroke(255, 0, 0);
            circle(p.x, p.y, 0.5);
          }

          if (d2 > debugSliders.a) {
            stroke(0, 255, 0);
            circle(p.x, p.y, 0.5);
          }

          if (d3 > debugSliders.a) {
            stroke(0, 0, 255);
            circle(p.x, p.y, 0.5);
          }
        }
      }
    }

    pop();
  }

  drawAfterfeather() {
    push();

    for (let i = 0; i < this.afterFeatherBarbs.length; i++) {
      const barb = this.afterFeatherBarbs[i];
      const pts = barb.pts;

      noFill();
      stroke(200);
      drawPath(pts);
    }

    pop();
  }

  debugDraw() {
    push();

    if (debugDrawToggles.spine) {
      Debug.drawHermite2D(this.params.spineCurve, /* steps: */ 100);

      noFill();
      this.spine.forEach(p => { Debug.drawPoint(p.frame.origin, p.width); });
    }

    for (let i = 0; i < this.vaneBarbs.length; i += 1) {
      const barb = this.vaneBarbs[i];
      if (debugDrawToggles.vane) {
        this.debugDrawBarbRoot(barb);

        // Debug draw angle between spine and barb side
        const tiltFactor = clamp01(params.barbTiltCurve(barb.tAlongVane) + params.barbTiltStart);
        const midDir = rotateTowards(barb.frame.right, barb.frame.forward, tiltFactor);
        Debug.drawArrow(barb.frame.origin, add2d(barb.frame.origin, scale2d(midDir, 50)));
      }

      if (debugDrawToggles.barbs) {
        this.debugDrawBarb(barb);
      }
    }

    // Debug draw afterfeather barbs
    if (debugDrawToggles.afterFeather) {
      for (let i = 0; i < this.afterFeatherBarbs.length; i++) {
        const barb = this.afterFeatherBarbs[i];
        // Debug.drawFrame(barb.frame, /* lineLength: */ 10);

        // Visualize the barb length
        const barbTip = add2d(barb.frame.origin, scale2d(barb.frame.right, barb.length));
        stroke("cyan");
        // Debug.drawDashedLine2D(barb.frame.origin, barbTip);

        // Draw the barb spline
        stroke(200);
        Debug.drawHermite2D(barb.spline, /* steps: */ 10, /* showTangents: */ true);
      }
    }

    pop();
  }

  debugDrawBarbRoot(barb) {
    Debug.drawFrame(barb.frame, /* lineLength: */ 20);

    // Visualize each clump with a different color
    const clumpColor = getClumpColor(barb.clumpIndex);
    fill(clumpColor);
    noStroke();
    Debug.drawCircle(barb.frame.origin, 5);

    // Visualize the barb length
    const barbTip = add2d(barb.frame.origin, scale2d(barb.frame.right, barb.length));
    stroke(clumpColor);
    Debug.drawDashedLine2D(barb.frame.origin, barbTip);

    // Visualize clump index and tAlongClump
    noStroke();
    fill(255);
    // textAlign(CENTER, CENTER);
    const info = `c:${barb.clumpIndex}\nt:${barb.tAlongClump.toFixed(2)}`;
    const textPos = add2d(barb.frame.origin, scale2d(barb.frame.right, barb.length + 20));
    Debug.drawText(info, textPos);
    // text(info, textPos.x, textPos.y);
  }

  debugDrawBarb(barb) {
    const clumpColor = getClumpColor(barb.clumpIndex);

    stroke(clumpColor);

    Debug.drawHermite2D(barb.spline, /* steps: */ 20, /* showTangents: */ debugDrawToggles.barbTangents);
  }
}

let feather;
let spineShader;

let font;
window.preload = function () {
  font = loadFont("../assets/fonts/Anonymous_Pro/AnonymousPro-Regular.ttf");
  // font = loadFont("../assets/fonts/elegant_typewriter/ELEGANT TYPEWRITER Regular.ttf");
  // font = loadFont("../assets/fonts/elegant_typewriter/ELEGANT TYPEWRITER Bold.ttf");
};


window.setup = function () {
  canvas = createCanvas(w, h, WEBGL);
  centerCanvas(canvas);
  pixelDensity(2);
  createGui();
  textFont(font);

  setupDebugParams();

  feather = new Feather(Debug.enabled ? debugParams : params);
  feather.build();

  spineShader = createShader(spineVert, spineFrag);
};

window.draw = function () {
  centerCanvas(canvas);
  setCanvasZIndex(canvas, -1); // so gui is on top
  translate(-hw, -hh);
  background(15);
  noLoop();

  feather.draw();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};

function getClumpColor(i) {
  // Deterministic random color, random hue
  const rand = sqRand(i, params.randomSeed);
  colorMode(HSB);
  const c = color(rand * 360, 100, 100);
  colorMode(RGB);
  return c;
}

function createGui() {
  gui.add(Debug, 'enabled').name('Debug Draw').onChange(() => { refresh(); });
  gui.add(params, 'randomSeed', 0, 2147483647).step(1).name('Random Seed').onFinishChange(() => { refresh(); });
  const seedUi = {
    RerollSeed: () => {
      // change the seed once, everything else follows
      params.randomSeed = (Math.random() * 2147483647) | 0;
      refresh();
    }
  };
  gui.add(seedUi, 'RerollSeed').name('🎲 Reseed');

  const debugFolder = gui.addFolder('Debug');
  debugFolder.add(debugDrawToggles, 'spine').name('Draw Spine').onChange(() => { refresh(); });
  debugFolder.add(debugDrawToggles, 'vane').name('Draw Vane').onChange(() => { refresh(); });
  debugFolder.add(debugDrawToggles, 'barbs').name('Draw Barbs').onChange(() => { refresh(); });
  debugFolder.add(debugDrawToggles, 'barbTangents').name('Draw Barb Tangents').onChange(() => { refresh(); });
  debugFolder.add(debugDrawToggles, 'barbMesh').name('Draw Barb Mesh').onChange(() => { refresh(); });
  debugFolder.add(debugDrawToggles, 'spineShader').name('Spine Shader').onChange(() => { refresh(); });
  debugFolder.add(debugDrawToggles, 'vanePattern').name('Vane Pattern').onChange(() => { refresh(); });
  debugFolder.add(debugDrawToggles, 'colorizeByClump').name('Colorize By Clump').onChange(() => { refresh(); });
  debugFolder.add(debugSliders, 'a', 0.9, 0.999999).step(0.000001).name('Debug Slider A').onChange(() => { refresh(); });
  debugFolder.add(debugDrawToggles, 'afterFeather').name('Draw Afterfeather').onChange(() => { refresh(); });

  const paramsFolder = gui.addFolder('Feather Params');
  paramsFolder.add(params, 'spineDivisions', 10, 300).step(1).onChange(() => { refresh(); });
  paramsFolder.add(params, 'spineEnd', 0.5, 1).step(0.01).onChange(() => { refresh(); });
  paramsFolder.add(params, 'spineBaseWidth', 1, 100).step(1).onChange(() => { refresh(); });
  paramsFolder.add(params, 'afterFeatherStart', 0, 1).step(0.01).onChange(() => { refresh(); });
  paramsFolder.add(params, 'afterFeatherEnd', 0, 1).step(0.01).onChange(() => { refresh(); });

  const clumpingFolder = gui.addFolder('Clumping');
  clumpingFolder.add(params, 'vaneBaseWidth', 10, 300).step(1).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'vaneBreaks', 0, 100).step(1).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'vaneBreakSymmetry', 0, 1).step(0.01).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'vaneBreakEnd', 0, 1).step(0.01).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'vaneNoiseLevelExp', -2, 2).step(0.01).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'vaneNoiseScaleExp', -2, 4).step(0.001).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'clumpCohesionStart', -2, 2).step(0.01).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'clumpCohesionEnd', -2, 2).step(0.01).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'clumpNoiseLevel', 0, 2).step(0.001).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'clumpNoiseScaleExp', 2, 3).step(0.001).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'barbInnerNoiseLevel', 0, 1).step(0.001).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'barbInnerNoiseScaleExp', 0, 3).step(0.001).onChange(() => { refresh(); });

  const barbsFolder = gui.addFolder('Barbs');
  barbsFolder.add(params, 'nBarbs', 1, 500).step(1).onChange(() => { refresh(); });
  barbsFolder.add(params, 'barbTiltStart', 0, 1).step(0.01).onChange(() => { refresh(); });

  const afterFeatherFolder = gui.addFolder('Afterfeather');
  afterFeatherFolder.add(params.afterFeather, 'nBarbs', 1, 100).step(1).onChange(() => { refresh(); });
  afterFeatherFolder.add(params.afterFeather, 'baseWidth', 10, 200).step(1).onChange(() => { refresh(); });

  const shaderFolder = gui.addFolder('Shader');
  shaderFolder.addColor(params.shaderParams, 'baseColor').name('Base Color').onChange(() => { refresh(); });
  shaderFolder.addColor(params.shaderParams, 'edgeColor').name('Edge Color').onChange(() => { refresh(); });
  shaderFolder.add(params.shaderParams, 'edgeSoftness', 0, 1).step(0.01).name('Edge Softness').onChange(() => { refresh(); });
  shaderFolder.add(params.shaderParams, 'ridgeSoftness', 0, 1).step(0.01).name('Ridge Softness').onChange(() => { refresh(); });
  shaderFolder.add(params.shaderParams, 'ridgeHighlight', 0, 1).step(0.01).name('Ridge Highlight').onChange(() => { refresh(); });
  shaderFolder.add(params.shaderParams, 'tipDarken', 0, 1).step(0.01).name('Tip Darken').onChange(() => { refresh(); });
}

function refresh() {
  setupDebugParams();
  feather = new Feather(Debug.enabled ? debugParams : params);
  feather.build();
  redraw();
}

function setupDebugParams() {
  // Copy params to debugParams except for the reduced divisions
  debugParams = { ...params }
  debugParams.spineDivisions = 100;
  debugParams.nBarbs = 20;
  debugParams.afterFeather = { ...params.afterFeather };
  debugParams.afterFeather.nBarbs = 10;
}