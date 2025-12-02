import { BezierCubic } from "./lumic/bezier.js";
import { Debug } from "./lumic/debug.js";
import { vec2, lerp, normalize2d, add2d, line2D, mul2d, scale2d, lerp2d, sub2d, dist2d, sqRand, rgba01FromHex, PI, dot2d, repeat, rot2d, mixSeed, remap, path2D } from "./lumic/common.js";
import { clamp01, easeInOutElastic, easeInOutQuad, easeInOutQuart, easeInQuad, easeOutQuad, smoothstep } from "./lumic/easing.js";
import { CubicHermite2D } from "./lumic/hermite.js";
import { centerCanvas, setCanvasZIndex } from "./lumic/p5Extensions.js";
import { Frame2D } from "./lumic/frame.js";
import { drawPath, drawPathWithGradient, getTangents, resamplePathUniform, rotateAbout, rotateTowards } from "./lumic/geomerty.js";
import { SVGDrawing } from "./lumic/svg.js";
import { inchesToMM } from "./lumic/units.js";

const dpi = 100;
const w = 600;
const hw = w / 2;
const h = 150;
const hh = h / 2;

Debug.enabled = false; // Enable debug drawing

const debugDrawToggles = {
  spine: false,
  vane: false,
  barbs: false,
  barbTangents: false,
  barbMesh: true,
  afterFeather: false,
  spineShaderSolid: false,
  vanePattern: false,
  colorizeByClump: false,
}

// Temporary debug sliders for testing
const debugSliders = {
  a: 0.981499,
}

const gui = new dat.GUI();

// Seed object for the base spine curve (unbent/unfitted)
const baseSpineCurveObj = { "p0": { "x": 297, "y": 546 }, "m0": { "x": 176, "y": -122 }, "p1": { "x": 1343, "y": 546 }, "m1": { "x": 680, "y": -284 } };

// Start from base (final bending/fitting will be applied per params later)
const spineCurve =  CubicHermite2D.FromObject(baseSpineCurveObj);

// const spineCurve = CubicHermite2D.FromObject( {"p0":{"x":397,"y":582},"m0":{"x":332,"y":-569},"p1":{"x":1237,"y":593},"m1":{"x":458,"y":-611}}); 
// spineCurve.Scale(0.25);
spineCurve
  .Straighten()
  .BendStartTangentDegrees(15)
  .BendEndTangentDegrees(-15)
  .FitTo(0, w, 0, h, 20, 20);

const params = {
  randomSeed: Math.random() * 0xFFFFFFFF,
  svgWidthMM: inchesToMM(w / dpi),
  svgHeightMM: inchesToMM(h / dpi),
  spineCurve: spineCurve,
  // Bend controls (degrees)
  spineStartBendDeg: 15,
  spineEndBendDeg: -15,
  spineDivisions: 200,
  spineBaseWidth: 4,
  spineEnd: 0.95,
  spineWidthCurve: (t) => {
    return 1 - easeInQuad(t);
  },
  nBarbs: 116, // barbs start at the end of the calamus
  // Afterfeather is the plumaceous part of the feather (fluffy)
  afterFeatherStart: 0.16,
  afterFeatherEnd: 0.27,
  // Vane is the pennaceous part of the feather (flat, stiff), starts after the afterfeather
  vaneBreakEnd: 1,
  vaneBaseWidth: 53,
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
  vaneBreaks: 31,
  vaneBreakSymmetry: 0.74, // 0 = left only, 1 = right only, 0.5 = even on both sides
  vaneNoiseLevelExp: -2,
  vaneNoiseScaleExp: -2,
  clumpCohesionStart: 0.93,
  clumpCohesionEnd: 1.0,
  clumpNoiseLevel: 0.13,
  clumpNoiseScaleExp: 2.814,
  barbInnerNoiseLevel: 0.184,
  barbInnerNoiseScaleExp: 0.459,
  afterFeather: {
    enabled: true,
    nBarbs: 15,
    // Normalized (0-1) base width relative to vaneBaseWidth
    baseWidthNorm: 36 / 53, // approx previous absolute 36 when vaneBaseWidth=53
    noiseLevelExp: -0.22,
    noiseScaleExp: 1.071,
    widthCurve: (t) => {
      return smoothstep(-1, 0.9, t) * smoothstep(2, 0.5, t)
    },
    barbTiltCurve: (t, i) => {
      let tilt = (1 - smoothstep(0.1, 0.9, t)) * 0.25; // never fully tilted
      tilt += (sqRand(i) - 0.5) * 0.1 ;
      return tilt;
    }
  },
  barbuleParams: {
    nBarbDivisions: 160,
    barbColor: "#cacaca",
    barbMeshBaseWidth: 2,
    barbMeshTipWidth: 0.95,
    barbulePatternRepeat: 1, // 27, 10, 1
    barbulePatternTilt: 0.2,

    barbulePatternSeparation: 0.2, // 1 = one repitition per barbule width
    barbSpineWidth: 0.1,
    barbSpineHardness: 0.35,
    barbuleWidthNorm: 0.57,
    barbuleHardness: 0.4,
    paletteScale: 1.0,
    renderType: 0,
  },
  // Remove spineSolidPass/spinePatternPass1/barbPatternPass1/barbPatternPass2/afterFeatherPatternPass1 blocks
};

// Reduced divisions for faster debugging
let debugParams = { ...params };
debugParams.spineDivisions = 20;
debugParams.nBarbs = 20;

function setBarbPositionInShader(shader, barb) {
  shader.setUniform('uBarbPosition', barb.tAlongSpine || 0);
  shader.setUniform('uClumpPosition', barb.tAlongClump || 0 );
}

function setBarbPatternShader(shader, params) {
  const colorVec = rgba01FromHex(params.barbColor);
  shader.setUniform('uColor', colorVec);
  shader.setUniform('uBarbSpineWidth', params.barbSpineWidth);
  shader.setUniform('uBarbSpineHardness', params.barbSpineHardness);
  shader.setUniform('uBarbuleWidthNorm', params.barbuleWidthNorm);
  shader.setUniform('uBarbuleHardness', params.barbuleHardness);
  shader.setUniform('uBarbulePatternRepeat', params.barbulePatternRepeat);
  shader.setUniform('uPatternTilt', params.barbulePatternTilt);
  shader.setUniform('uBarbulePatternSeparation', params.barbulePatternSeparation);
  shader.setUniform('uPaletteScale', params.paletteScale);
  shader.setUniform('uRenderType', params.renderType);
}

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
    const tBarbEnd = 1.01;
    const tVaneBreakEnd = params.vaneBreakEnd;

    // Store spacing info for later gap estimation
    this._tBarbStart = tBarbStart;
    this._barbWidthNormalized = (1 - tBarbStart) / params.nBarbs;

    // Split vaneBreaks into left/right with some randomness
    // Create stops for the vane breaks
    const nVaneBreaks = params.vaneBreaks;
    const nLeftVaneBreaks = Math.floor(nVaneBreaks * (1 - params.vaneBreakSymmetry));
    const nRightVaneBreaks = nVaneBreaks - nLeftVaneBreaks;
    const leftVaneBreakStops = [];
    const rightVaneBreakStops = [];

    const seedLeft = mixSeed(params.randomSeed, 0xA5);
    const seedRight = mixSeed(params.randomSeed, 0xC3);
    const breakMaxStagger = 0.2;

    if (nLeftVaneBreaks > 0) {
      for (let i = 0; i < nLeftVaneBreaks; i++) {
        const tBreak = i / nLeftVaneBreaks;
        // Clamp the randomized stop so it never exceeds the end
        const t01 = clamp01(tBreak + breakMaxStagger * sqRand(i, seedLeft));
        const t = lerp(tBarbStart, tVaneBreakEnd, t01);
        leftVaneBreakStops.push(t);
      }
    }

    if (nRightVaneBreaks > 0) {
      for (let i = 0; i < nRightVaneBreaks; i++) {
        const tBreak = i / nRightVaneBreaks;
        const t01 = clamp01(tBreak + breakMaxStagger * sqRand(i, seedRight));
        const t = lerp(tBarbStart, tVaneBreakEnd, t01);
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

    let { points, tangents } = this.getPointsAndTangentsAlongSpine(tBarbStart, 1, params.nBarbs);
    // points = resamplePathUniform(points);
    // tangents = getTangents(points);

    const skipAfterSpinePosition = 0.943;

    for (let i = 0; i < points.length; i++) {
      const tAlongSpine = tBarbStart + i * barbWidthNormalized;
      const tAlongVane = i / (points.length - 1);

      if (tAlongSpine > skipAfterSpinePosition) {
        continue;
      }

      const spineWidth = params.spineBaseWidth * params.spineWidthCurve(tAlongSpine);

      const rightFrame = new Frame2D(points[i], tangents[i]);
      const leftFrame = new Frame2D(rightFrame.origin, rightFrame.forward, scale2d(rightFrame.right, -1));

      // Barbs are slightly offset from the spine
      // const digIntoSpine = 0.4 + tAlongVane * 0.6;
      const digIntoSpine = 0;
      const spineHalfWidth = spineWidth / 2;
      rightFrame.translate(scale2d(rightFrame.right, spineHalfWidth * (1 - digIntoSpine)));
      leftFrame.translate(scale2d(leftFrame.right, spineHalfWidth * (1 - digIntoSpine)));
      // rightFrame.translate(scale2d(rightFrame.right, spineWidth / 2));
      // leftFrame.translate(scale2d(leftFrame.right, spineWidth / 2));

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

      const tAlongClumpLeft = safeFrac(tAlongSpine, prevLeft, nextLeft);
      const tAlongClumpRight = safeFrac(tAlongSpine, prevRight, nextRight);

      let tVaneWidth = clamp01(params.vaneWidthCurve(tAlongVane));
      tVaneWidth = remap(0, 1, 0.1, 1, tVaneWidth);
      const vaneWidth = params.vaneBaseWidth * tVaneWidth;

      const barbTilt = clamp01(params.barbTiltCurve(tAlongVane) + params.barbTiltStart);

      // if (barbTilt >= 0.999995) {
      //   continue; 
      // }

      const rightBarb = {
        frame: rightFrame,
        clumpIndex: iClumpRight,
        tAlongClump: tAlongClumpRight,
        barbIndex: iBarb++,
        length: vaneWidth,
        tAlongSpine: tAlongSpine,
        tAlongVane: tAlongVane,
        barbTilt: barbTilt,
      };

      const leftBarb = {
        frame: leftFrame,
        clumpIndex: iClumpLeft,
        tAlongClump: tAlongClumpLeft,
        barbIndex: iBarb++,
        length: vaneWidth,
        tAlongSpine: tAlongSpine,
        tAlongVane: tAlongVane,
        barbTilt: barbTilt,
      };

      this.vaneBarbs.push(rightBarb);
      this.vaneBarbs.push(leftBarb);
    }
  }

  // Estimate the expected same-side root gap based on full render params,
  // not the potentially sparse debug sampling. Uses current spine curve but
  // spacing (dt) from the top-level render params.
  getExpectedBarbSameSideRootGap(barb) {
    try {
      const renderParams = params; // use full render settings
      const tStart = renderParams.afterFeatherEnd;
      const dt = (1 - tStart) / Math.max(1, renderParams.nBarbs);
      const t = barb.tAlongSpine;
      const t2 = Math.min(1, t + dt);
      const a = this.params.spineCurve.GetPosition(t);
      const b = this.params.spineCurve.GetPosition(t2);
      const gap = dist2d(a, b);
      if (Number.isFinite(gap) && gap > 0) {
          return gap;
      }
    } catch (_) { /* ignore and fall back */ }
    // Fallback: proportional to barb length (TODO bad magic numbers)
    return Math.max(barb.length * 0.2, 0.001);
  }

  // Estimate same-side spacing for afterfeather barbs using instance params
  getExpectedAfterfeatherSameSideRootGap(barb) {
    try {
      const renderParams = params; // always use full render-time params
      const tStart = renderParams.afterFeatherStart;
      const tEnd   = renderParams.afterFeatherEnd;
      const n = Math.max(2, renderParams.afterFeather.nBarbs);
      const dt = (tEnd - tStart) / (n - 1); // root-to-root spacing used at build time

      // Map barb's local 0..1 position in afterfeather to spine t in [tStart, tEnd]
      const tAF = barb.tAlongAfterfeather ?? 0;
      const t = tStart + tAF * (tEnd - tStart);

      // Choose the true neighbor like at build time: next unless we're at the end
      const t2 = (t + dt <= tEnd + 1e-9) ? (t + dt) : (t - dt);

      const a = this.params.spineCurve.GetPosition(t);
      const b = this.params.spineCurve.GetPosition(t2);
      const gap = dist2d(a, b);
      if (Number.isFinite(gap) && gap > 0) return gap;
    } catch (_) {
      // ignore and fall back
    }
    // Fallback proportional to barb length
    return Math.max(barb.length * 0.2, 0.001);
  }

  buildAfterfeather() {
    const afParams = this.params.afterFeather;
    const tSpineStart = this.params.afterFeatherStart;
    const tSpineEnd = this.params.afterFeatherEnd;
    this.afterFeatherBarbs = [];
    let rootPoints = [];
    for (let i = 0; i < afParams.nBarbs; i++) {
      const t = i / (afParams.nBarbs - 1);
      const tAlongSpine = lerp(tSpineStart, tSpineEnd, t);
      // Sample the spine spline
      const rootPoint = this.params.spineCurve.GetPosition(tAlongSpine);
      rootPoints.push(rootPoint);
    }
    const tangents = getTangents(rootPoints);
    for (let i = 0; i < rootPoints.length; i++) {
      const t = i / (rootPoints.length - 1);
      const tAlongSpine = lerp(tSpineStart, tSpineEnd, t);

      // Find the frame
      const spineWidth = this.params.spineBaseWidth * this.params.spineWidthCurve(tAlongSpine);
      const spineHalfWidth = spineWidth / 2;
      // const digIntoSpine = lerp(0.7, 0.5, t);
      const digIntoSpine = 0;
      const spineAdjustedWidth = spineHalfWidth * (1 - digIntoSpine);
      let frameRight = new Frame2D(rootPoints[i], tangents[i]);
      let frameLeft = new Frame2D(frameRight.origin, frameRight.forward, scale2d(frameRight.right, -1));
      frameRight.translate(scale2d(frameRight.right, spineAdjustedWidth));
      frameLeft.translate(scale2d(frameLeft.right, spineAdjustedWidth));

      // Compute actual base width from normalized ratio
      const baseWidthActual = this.params.vaneBaseWidth * afParams.baseWidthNorm;
      const barbLength = baseWidthActual * afParams.widthCurve(t);

      this.afterFeatherBarbs.push({ frame: frameRight, length: barbLength, tAlongAfterfeather: t });
      this.afterFeatherBarbs.push({ frame: frameLeft, length: barbLength, tAlongAfterfeather: t });
    }
  }

  initBarbs() {
    const params = this.params;


    for (let i = 0; i < this.vaneBarbs.length; i++) {
      const barb = this.vaneBarbs[i];
      const barbRoot = barb.frame.origin;
      
      // Adjust barb length at extreme tilt
      const barbTilt = barb.barbTilt;
      const tBarbLengthMultiplier = 1 - smoothstep(0.9, 1.25, barbTilt);
      const MIN_BARB_LEN = 0.002 * this.spineLength;
      const effectiveLen = Math.max(MIN_BARB_LEN, barb.length * tBarbLengthMultiplier);
      
      const dirToTip = rotateTowards(barb.frame.right, barb.frame.forward, barbTilt);
      const barbTip = add2d(barbRoot, scale2d(dirToTip, effectiveLen));

      let rootTangentLength = 0.05 * this.spineLength * (1 - barb.tAlongVane); // TODO bad magic number
      let tipTangentLength = 0.15 * this.spineLength * (1 - barb.tAlongVane * 0.75);

      // Ensure tangent lengths are never more than half of root to tip
      // const distRootToTip = dist2d(barbRoot, barbTip);
      // if (rootTangentLength > distRootToTip * 0.2) {
      //   rootTangentLength = distRootToTip * 0.2;
      // }

      // if (tipTangentLength > distRootToTip * 0.2) {
      //   tipTangentLength = distRootToTip * 0.2;
      // }

      const rootTangent = scale2d(barb.frame.forward, rootTangentLength * tBarbLengthMultiplier);

      let tipTangentDir = normalize2d(lerp2d(dirToTip, barb.frame.forward, 0.6));
      let tipTangent = scale2d(tipTangentDir, tipTangentLength * tBarbLengthMultiplier);
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

      const barbTilt = clamp01(this.params.afterFeather.barbTiltCurve(barb.tAlongAfterfeather, i) + this.params.barbTiltStart);
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
    // points = resamplePathUniform(points);

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
    const nPoints = params.barbuleParams.nBarbDivisions;
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
    const nL = Math.pow(10, this.params.afterFeather.noiseLevelExp);
    const nS = Math.pow(10, this.params.afterFeather.noiseScaleExp);

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

  getPointsAndTangentsAlongSpineUniform(tStart, tEnd, nPoints) {
    const params = this.params;
    // Oversample in parameter space, then resample to uniform arc-length
    const oversample = Math.max(16, nPoints * 4);
    const hi = [];
    for (let t = tStart; t <= tEnd; t += (tEnd - tStart) / oversample) {
      hi.push(params.spineCurve.GetPosition(t));
    }
    const points = resamplePathUniform(hi, nPoints + 1);
    const tangents = getTangents(points);
    return { points, tangents };
  }

  draw() {
    this.svgDrawing = new SVGDrawing(this.params.svgWidthMM, this.params.svgHeightMM);
    this.drawSpine();

    this.drawBarbs();
    if ( this.params.afterFeather.enabled ) {
      this.drawAfterfeather();
    }

    if (Debug.enabled) {
      this.debugDraw();
    }

    this.svgDrawing.scaleContentsToFit(/* margin (mm): */ 3);
    this.svgDrawing.addOutline();
  }

  drawSpine() {
    push();
    noFill();
    stroke(255);
    strokeWeight(1);

    // Build spine outline once and draw it
    const outlinePoints = [];
    // Right edge
    for (let i = 0; i < this.spine.length; i++) {
      const t = i / (this.spine.length - 1);
      const p = this.spine[i];
      const squeeze = smoothstep(0, 0.05, t);
      let d = p.width * 0.5 * squeeze;
      d = remap(0, 1, 0.05, 1.1, d);
      const r = add2d(p.frame.origin, scale2d(p.frame.right, d));
      outlinePoints.push(r);
    }
    // Left edge (backwards)
    for (let i = this.spine.length - 1; i >= 0; i--) {
      const t = i / (this.spine.length - 1);
      const p = this.spine[i];
      const squeeze = smoothstep(0, 0.05, t);
      let d = p.width * 0.5 * squeeze;
      d = remap(0, 1, 0.05, 1.1, d);
      const l = add2d(p.frame.origin, scale2d(p.frame.right, -d));
      outlinePoints.push(l);
    }
    if (outlinePoints.length > 0) {
      outlinePoints.push(outlinePoints[0]);
    }

    drawPath(outlinePoints);
    this.svgDrawing.addPath(outlinePoints, vec2(width, height));
    pop();
  }

  drawBarbMesh(barb, index) {
    // Mesh/shader rendering removed for this simplified sketch
  }

  // Simplified barbs: white polylines only
  drawBarbs() {
    push();
    noFill();
    stroke(255);
    strokeWeight(1);

    for (let i = 0; i < this.vaneBarbs.length; i++) {
      const barb = this.vaneBarbs[i];
      if (!barb || !barb.pts) continue;
      drawPath(barb.pts);
      this.svgDrawing.addPath(barb.pts, vec2(width, height));
    }

    pop();
  }

  // Simplified afterfeather: white polylines only
  drawAfterfeather() {
    push();
    noFill();
    stroke(255);
    strokeWeight(1);

    for (let i = 0; i < this.afterFeatherBarbs.length; i++) {
      const barb = this.afterFeatherBarbs[i];
      if (!barb || !barb.pts) continue;
      drawPath(barb.pts);
      this.svgDrawing.addPath(barb.pts, vec2(width, height));
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
    // noStroke();
    // fill(255);
    // const info = `c:${barb.clumpIndex}\nt:${barb.tAlongClump.toFixed(2)}`;
    // const textPos = add2d(barb.frame.origin, scale2d(barb.frame.right, barb.length + 20));
    // Debug.drawText(info, textPos);
    // text(info, textPos.x, textPos.y);
  }

  debugDrawBarb(barb) {
    const clumpColor = getClumpColor(barb.clumpIndex);

    stroke(clumpColor);

    Debug.drawHermite2D(barb.spline, /* steps: */ 20, /* showTangents: */ debugDrawToggles.barbTangents);
  }
}

let feather;

let font;
window.preload = function () {
  font = loadFont("../assets/fonts/Anonymous_Pro/AnonymousPro-Regular.ttf");
  // font = loadFont("../assets/fonts/elegant_typewriter/ELEGANT TYPEWRITER Regular.ttf");
  // font = loadFont("../assets/fonts/elegant_typewriter/ELEGANT TYPEWRITER Bold.ttf");
};


window.setup = function () {
  canvas = createCanvas(w, h, WEBGL);
  centerCanvas(canvas);
  pixelDensity(8);

  // Canvas-only zoom/pan
  window.addEventListener('wheel', onWheelCanvasZoom, { passive: false });
  canvas.elt.addEventListener('pointerdown', onPointerDownPan, { passive: false });
  window.addEventListener('pointerup', onPointerUpPan, { passive: false });
  window.addEventListener('pointermove', onPointerMovePan, { passive: false });
  window.addEventListener('keydown', onKeyDownPan, { passive: false });
  window.addEventListener('keyup', onKeyUpPan, { passive: false });
  canvas.elt.addEventListener('dblclick', () => resetPanZoom());
  applyCanvasZoom();
  requestAnimationFrame(centerPanToViewport);

  createGui();
  textFont(font);

  setupDebugParams();

  feather = new Feather(Debug.enabled ? debugParams : params);
  feather.build();
};

window.draw = function () {
  centerCanvas(canvas);
  setCanvasZIndex(canvas, -1); // so gui is on top
  translate(-hw, -hh);
  background(0);
  noLoop();

  feather.draw();
};

window.keyTyped = function () {
  if (key === "s") {
    // save(`feather_${params.randomSeed}.png`);
    feather.svgDrawing.save(`feather_${params.randomSeed}.svg`);
  }

  if (key === "r") {
    randomizeParams();
    refresh();
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

// Centralized ranges for GUI controls
const paramRanges = {
  spineDivisions: { min: 10, max: 300, step: 1 },
  spineEnd: { min: 0.9, max: 0.96, step: 0.01 },
  spineBaseWidth: { min: 2, max: 8, step: 1 },
  afterFeatherStart: { min: 0.15, max: 0.21, step: 0.01 },
  afterFeatherEnd: { min: 0.24, max: 0.27, step: 0.01 },
  spineStartBendDeg: { min: -40, max: 40, step: 0.1 },
  spineEndBendDeg: { min: -40, max: 40, step: 0.1 },

  vaneBaseWidth: { min: 30, max: 59, step: 1 },
  vaneBreaks: { min: 0, max: 100, step: 1 },
  vaneBreakSymmetry: { min: 0, max: 1, step: 0.01 },
  vaneBreakEnd: { min: 0.82, max: 1, step: 0.01 },
  vaneNoiseLevelExp: { min: -2, max: 2, step: 0.01 },
  vaneNoiseScaleExp: { min: -2, max: 4, step: 0.001 },
  clumpCohesionStart: { min: 0.7, max: 1.33, step: 0.01 },
  clumpCohesionEnd: { min: 0.58, max: 1.33, step: 0.01 },
  clumpNoiseLevel: { min: 0, max: 2, step: 0.001 },
  clumpNoiseScaleExp: { min: 2, max: 3, step: 0.001 },
  barbInnerNoiseLevel: { min: 0, max: 0.578, step: 0.001 },
  barbInnerNoiseScaleExp: { min: 0, max: 1.37, step: 0.001 },

  nBarbs: { min: 60, max: 150, step: 1 },
  barbTiltStart: { min: 0, max: 0.6, step: 0.01 },

  afterFeather_enabled: { /* boolean toggle */ },
  afterFeather_nBarbs: { min: 5, max: 20, step: 1 },
  afterFeather_baseWidthNorm: { min: 0, max: 0.8, step: 0.01 },
  afterFeather_noiseLevelExp: { min: -2, max: 0.14, step: 0.01 },
  afterFeather_noiseScaleExp: { min: -2, max: 0.8, step: 0.001 },
};

// Randomize all params within their ranges using current seed
function randomizeParams() {
  const baseSeed = (params.randomSeed | 0) >>> 0;
  let i = 0;
  const rand01 = (label) => sqRand(i++, baseSeed);

  const applyRange = (obj, key, range) => {
    if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') return;
    const step = typeof range.step === 'number' && range.step > 0 ? range.step : 0;
    let v = range.min + rand01(key) * (range.max - range.min);
    if (step > 0) {
      v = Math.round(v / step) * step;
      v = Math.min(range.max, Math.max(range.min, v));
    }
    obj[key] = v;
  };

  // Walk ranges; handle nested afterFeather_* specially
  for (const [key, range] of Object.entries(paramRanges)) {
    if (key.startsWith('afterFeather_')) {
      const sub = key.substring('afterFeather_'.length);
      if (sub === 'enabled') {
        params.afterFeather.enabled = rand01(key) > 0.5;
      } else if (params.afterFeather && sub in params.afterFeather) {
        applyRange(params.afterFeather, sub, range);
      }
    } else if (key in params) {
      applyRange(params, key, range);
    }
  }

  // Assign a new deterministic seed derived from the current one
  const newSeed = Math.floor(sqRand(0xDEADBEEF, baseSeed) * 2147483647) >>> 0;
  params.randomSeed = newSeed;
}

function createGui() {
  gui.add(Debug, 'enabled').name('Debug Draw').onChange(() => { refresh(); });
  gui.add(params, 'randomSeed', 0, 2147483647).step(1).name('Random Seed').onFinishChange(() => { refresh(); });
  const seedUi = {
    RerollSeed: () => {
      // change the seed once, everything else follows
      const newSeed = Math.floor(Math.random() * 2147483647);
      console.log(`New seed: ${newSeed}`);
      params.randomSeed = newSeed;
      refresh();
    }
  };
  gui.add(seedUi, 'RerollSeed').name('🎲 Reseed');

  const randomizeUi = { Randomize: () => { randomizeParams(); refresh(); } };
  gui.add(randomizeUi, 'Randomize').name('🔀 Randomize');

  const paramsFolder = gui.addFolder('Feather Params');
  paramsFolder.add(params, 'spineDivisions', paramRanges.spineDivisions.min, paramRanges.spineDivisions.max).step(paramRanges.spineDivisions.step).onChange(() => { refresh(); });
  paramsFolder.add(params, 'spineEnd', paramRanges.spineEnd.min, paramRanges.spineEnd.max).step(paramRanges.spineEnd.step).onChange(() => { refresh(); });
  paramsFolder.add(params, 'spineBaseWidth', paramRanges.spineBaseWidth.min, paramRanges.spineBaseWidth.max).step(paramRanges.spineBaseWidth.step).onChange(() => { refresh(); });
  paramsFolder.add(params, 'afterFeatherStart', paramRanges.afterFeatherStart.min, paramRanges.afterFeatherStart.max).step(paramRanges.afterFeatherStart.step).onChange(() => { refresh(); });
  paramsFolder.add(params, 'afterFeatherEnd', paramRanges.afterFeatherEnd.min, paramRanges.afterFeatherEnd.max).step(paramRanges.afterFeatherEnd.step).onChange(() => { refresh(); });
  paramsFolder.add(params, 'spineStartBendDeg', paramRanges.spineStartBendDeg.min, paramRanges.spineStartBendDeg.max).step(paramRanges.spineStartBendDeg.step).name('Start Bend (deg)').onChange(() => { refresh(); });
  paramsFolder.add(params, 'spineEndBendDeg', paramRanges.spineEndBendDeg.min, paramRanges.spineEndBendDeg.max).step(paramRanges.spineEndBendDeg.step).name('End Bend (deg)').onChange(() => { refresh(); });

  const clumpingFolder = gui.addFolder('Clumping');
  clumpingFolder.add(params, 'vaneBaseWidth', paramRanges.vaneBaseWidth.min, paramRanges.vaneBaseWidth.max).step(paramRanges.vaneBaseWidth.step).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'vaneBreaks', paramRanges.vaneBreaks.min, paramRanges.vaneBreaks.max).step(paramRanges.vaneBreaks.step).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'vaneBreakSymmetry', paramRanges.vaneBreakSymmetry.min, paramRanges.vaneBreakSymmetry.max).step(paramRanges.vaneBreakSymmetry.step).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'vaneBreakEnd', paramRanges.vaneBreakEnd.min, paramRanges.vaneBreakEnd.max).step(paramRanges.vaneBreakEnd.step).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'vaneNoiseLevelExp', paramRanges.vaneNoiseLevelExp.min, paramRanges.vaneNoiseLevelExp.max).step(paramRanges.vaneNoiseLevelExp.step).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'vaneNoiseScaleExp', paramRanges.vaneNoiseScaleExp.min, paramRanges.vaneNoiseScaleExp.max).step(paramRanges.vaneNoiseScaleExp.step).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'clumpCohesionStart', paramRanges.clumpCohesionStart.min, paramRanges.clumpCohesionStart.max).step(paramRanges.clumpCohesionStart.step).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'clumpCohesionEnd', paramRanges.clumpCohesionEnd.min, paramRanges.clumpCohesionEnd.max).step(paramRanges.clumpCohesionEnd.step).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'clumpNoiseLevel', paramRanges.clumpNoiseLevel.min, paramRanges.clumpNoiseLevel.max).step(paramRanges.clumpNoiseLevel.step).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'clumpNoiseScaleExp', paramRanges.clumpNoiseScaleExp.min, paramRanges.clumpNoiseScaleExp.max).step(paramRanges.clumpNoiseScaleExp.step).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'barbInnerNoiseLevel', paramRanges.barbInnerNoiseLevel.min, paramRanges.barbInnerNoiseLevel.max).step(paramRanges.barbInnerNoiseLevel.step).onChange(() => { refresh(); });
  clumpingFolder.add(params, 'barbInnerNoiseScaleExp', paramRanges.barbInnerNoiseScaleExp.min, paramRanges.barbInnerNoiseScaleExp.max).step(paramRanges.barbInnerNoiseScaleExp.step).onChange(() => { refresh(); });

  const barbsFolder = gui.addFolder('Barbs');
  barbsFolder.add(params, 'nBarbs', paramRanges.nBarbs.min, paramRanges.nBarbs.max).step(paramRanges.nBarbs.step).onChange(() => { refresh(); });
  barbsFolder.add(params, 'barbTiltStart', paramRanges.barbTiltStart.min, paramRanges.barbTiltStart.max).step(paramRanges.barbTiltStart.step).onChange(() => { refresh(); });

  const afterFeatherFolder = gui.addFolder('Afterfeather');
  afterFeatherFolder.add(params.afterFeather, 'enabled').name('Enabled').onChange(() => { refresh(); });
  afterFeatherFolder.add(params.afterFeather, 'nBarbs', paramRanges.afterFeather_nBarbs.min, paramRanges.afterFeather_nBarbs.max).step(paramRanges.afterFeather_nBarbs.step).onChange(() => { refresh(); });
  afterFeatherFolder.add(params.afterFeather, 'baseWidthNorm', paramRanges.afterFeather_baseWidthNorm.min, paramRanges.afterFeather_baseWidthNorm.max).step(paramRanges.afterFeather_baseWidthNorm.step).name('Base Width (norm)').onChange(() => { refresh(); });
  afterFeatherFolder.add(params.afterFeather, 'noiseLevelExp', paramRanges.afterFeather_noiseLevelExp.min, paramRanges.afterFeather_noiseLevelExp.max).step(paramRanges.afterFeather_noiseLevelExp.step).onChange(() => { refresh(); });
  afterFeatherFolder.add(params.afterFeather, 'noiseScaleExp', paramRanges.afterFeather_noiseScaleExp.min, paramRanges.afterFeather_noiseScaleExp.max).step(paramRanges.afterFeather_noiseScaleExp.step).onChange(() => { refresh(); });
}

function refresh() {
  setupDebugParams();
  feather = new Feather(Debug.enabled ? debugParams : params);
  feather.build();
  redraw();
}

// Helper to rebuild spine curve from seed + params
function buildCurveFromParams(p) {
  const c = CubicHermite2D.FromObject(baseSpineCurveObj);
  c.Straighten()
   .BendStartTangentDegrees(p.spineStartBendDeg || 0)
   .BendEndTangentDegrees(p.spineEndBendDeg || 0)
   .FitTo(0, w, 0, h, 20, 20);
  return c;
}

function setupDebugParams() {
  // Copy params to debugParams except for the reduced divisions
  debugParams = { ...params }
  debugParams.spineDivisions = 100;
  debugParams.nBarbs = 40;
  debugParams.afterFeather = { ...params.afterFeather };
  debugParams.afterFeather.nBarbs = 10;
  debugParams.barbuleParams = { ...params.barbuleParams };
  debugParams.barbPatternPass1 = { ...params.barbPatternPass1 };
  debugParams.barbPatternPass2 = { ...params.barbPatternPass2 };
  debugParams.spinePatternPass1 = { ...params.spinePatternPass1 };
  debugParams.afterFeatherPatternPass1 = { ...params.afterFeatherPatternPass1 };
  if (params.spineSolidPass) debugParams.spineSolidPass = { ...params.spineSolidPass };

  // Rebuild spine curves from the base seed and current bend params
  params.spineCurve = buildCurveFromParams(params);
  debugParams.spineCurve = buildCurveFromParams(debugParams);
}

// ----------------- CANVAS ZOOM + PAN (CSS, no redraw) -----------------
let canvasZoom = 1;                 // zoom factor
const CANVAS_ZOOM_MIN = 0.25;
const CANVAS_ZOOM_MAX = 4;

let panX = 0;                       // px offset from centered position
let panY = 0;
let isPanning = false;
let spaceDown = false;

function applyCanvasZoom() {
  if (!canvas || !canvas.elt) return;
  // Keep centered, add pan offsets, then scale (no redraw)
  canvas.elt.style.transformOrigin = '50% 50%';
  canvas.elt.style.transform =
    `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${canvasZoom})`;
}

// Compute pan so the canvas' visual center aligns with the viewport center.
function centerPanToViewport() {
  if (!canvas || !canvas.elt) return;
  // Ensure our transform is applied first (so getBoundingClientRect reads the correct geometry)
  applyCanvasZoom();

  const rect = canvas.elt.getBoundingClientRect();
  const viewCX = window.innerWidth * 0.5;
  const viewCY = window.innerHeight * 0.5;
  const canvasCX = rect.left + rect.width * 0.5;
  const canvasCY = rect.top + rect.height * 0.5;

  // Adjust pan by the delta
  panX += (viewCX - canvasCX);
  panY += (viewCY - canvasCY);
  applyCanvasZoom();
}

function onWheelCanvasZoom(e) {
  // Ctrl on Windows/Linux, Cmd on macOS. Prevent page zoom.
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  e.stopPropagation();

  const factor = Math.pow(1.0015, e.deltaY); // smooth
  canvasZoom = Math.min(CANVAS_ZOOM_MAX, Math.max(CANVAS_ZOOM_MIN, canvasZoom / factor));
  applyCanvasZoom(); // CSS-only, no redraw
}

// Drag-to-pan (middle mouse, or Space + left mouse)
function onPointerDownPan(e) {
  if (e.button === 1 || (spaceDown && e.button === 0)) {
    isPanning = true;
    try { canvas.elt.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  }
}
function onPointerUpPan(e) {
  if (isPanning) {
    isPanning = false;
    try { canvas.elt.releasePointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  }
}
function onPointerMovePan(e) {
  if (!isPanning) return;
  panX += e.movementX;
  panY += e.movementY;
  applyCanvasZoom();
  e.preventDefault();
}

function onKeyDownPan(e) {
  if (e.code === 'Space') { spaceDown = true; e.preventDefault(); }
}
function onKeyUpPan(e) {
  if (e.code === 'Space') { spaceDown = false; e.preventDefault(); }
}

function resetPanZoom() {
  canvasZoom = 1;
  panX = 0;
  panY = 0;
  applyCanvasZoom();
}
// ----------------- END: CANVAS ZOOM + PAN -----------------