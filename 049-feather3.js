import { BezierCubic } from "./lumic/bezier.js";
import { Debug } from "./lumic/debug.js";
import { vec2, lerp, normalize2d, add2d, line2D, mul2d, scale2d, lerp2d, sub2d, dist2d, sqRand, rgba01FromHex, PI } from "./lumic/common.js";
import { clamp01, easeInOutElastic, easeInOutQuad, easeInOutQuart, easeInQuad, easeOutQuad, smoothstep } from "./lumic/easing.js";
import { CubicHermite2D } from "./lumic/hermite.js";
import { centerCanvas, setCanvasZIndex } from "./lumic/p5Extensions.js";
import { Frame2D } from "./lumic/frame.js";
import { getTangents, rotateTowards } from "./lumic/geomerty.js";
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
  vane: true,
  barbs: true,
  barbTangents: false,
  spineShader: false
}

// Temporary debug sliders for testing
const debugSliders = {
  a: 0.5,
}

const gui = new dat.GUI();

const params = {
  // cubic hermite spline
  spineCurve: CubicHermite2D.FromObject({ "p0": { "x": 297, "y": 546 }, "m0": { "x": 176, "y": -122 }, "p1": { "x": 1343, "y": 576 }, "m1": { "x": 680, "y": -284 } }),
  spineDivisions: 100,
  spineBaseWidth: 20,
  spineEnd: 0.95,
  spineWidthCurve: (t) => {
    return 1 - easeInQuad(t);
  },
  nBarbs: 240, // barbs start at the end of the calamus
  // Afterfeather is the plumaceous part of the feather (fluffy)
  afterFeatherStart: 0.2,
  afterFeatherEnd: 0.3,
  // Vane is the pennaceous part of the feather (flat, stiff)
  vaneStart: 0.3,
  vaneEnd: 0.8,
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
  vaneBreaks: 10,
  vaneBreakSymmetry: 0.5, // 0 = left only, 1 = right only, 0.5 = even on both sides
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
    this.buildBarbs();
  }

  buildVane() {
    const params = this.params;

    // Split vaneBreaks into left/right with some randomness
    // Create stops for the vane breaks
    const nVaneBreaks = params.vaneBreaks;
    const leftVaneBreaks = Math.floor(nVaneBreaks * (1 - params.vaneBreakSymmetry));
    const rightVaneBreaks = nVaneBreaks - leftVaneBreaks;
    const leftVaneBreakStops = [];
    const rightVaneBreakStops = [];

    for (let i = 0; i < leftVaneBreaks; i++) {
      const t = lerp(params.vaneStart, params.vaneEnd, Math.random());
      leftVaneBreakStops.push(t);
    }
    for (let i = 0; i < rightVaneBreaks; i++) {
      const t = lerp(params.vaneStart, params.vaneEnd, Math.random());
      rightVaneBreakStops.push(t);
    }

    Debug.log(`Left vane breaks: ${leftVaneBreaks}, Right vane breaks: ${rightVaneBreaks}`);
    Debug.log("Left vane break stops:", leftVaneBreakStops);
    Debug.log("Right vane break stops:", rightVaneBreakStops);

    const tBarbStart = params.afterFeatherEnd;

    // Get frames along the spine for the barbs
    this.barbs = [];
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
      const nextVaneBreakStopIndexLeft = lastVaneBreakStopIndexLeft + 1;
      const nextVaneBreakStopIndexRight = lastVaneBreakStopIndexRight + 1;

      if (nextVaneBreakStopIndexLeft < leftVaneBreakStops.length && tAlongSpine > leftVaneBreakStops[nextVaneBreakStopIndexLeft]) {
        iClumpLeft++;
        lastVaneBreakStopIndexLeft = nextVaneBreakStopIndexLeft;

        if (Debug.enabled) {
          console.log(`New left clump at t=${tAlongSpine}`);
        }
      }

      if (nextVaneBreakStopIndexRight < rightVaneBreakStops.length && tAlongSpine > rightVaneBreakStops[nextVaneBreakStopIndexRight]) {
        iClumpRight++;
        lastVaneBreakStopIndexRight = nextVaneBreakStopIndexRight;

        if (Debug.enabled) {
          console.log(`New right clump at t=${tAlongSpine}`);
        }
      }

      const vaneWidth = params.vaneBaseWidth * params.vaneWidthCurve(tAlongVane);

      const rightBarb = {
        frame: rightFrame,
        clumpIndex: iClumpRight,
        barbIndex: iBarb++,
        length: vaneWidth,
        tAlongSpine: tAlongSpine,
        tAlongVane: tAlongVane
      };

      const leftBarb = {
        frame: leftFrame,
        clumpIndex: iClumpLeft,
        barbIndex: iBarb++,
        length: vaneWidth,
        tAlongSpine: tAlongSpine,
        tAlongVane: tAlongVane
      };

      this.barbs.push(rightBarb);
      this.barbs.push(leftBarb);
    }
  }

  buildBarbs() {
    const params = this.params;

    const dtAlongSpine = 0.1; // how much the barbs move along the vane from root to tip
    
    for (let i = 0; i < this.barbs.length; i++) {
      const barb = this.barbs[i];
      const rootTangentLength = 0.05 * this.spineLength * (1 - barb.tAlongVane);
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

  drawBarbs() {
    push();

    stroke(255);
    for (let i = 0; i < this.barbs.length - 6; i++) {
      // if (i < 82) { continue; } // TEMPORARY

      const barb = this.barbs[i];
      barb.spline.Draw();
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

    for (let i = 0; i < this.barbs.length; i += 1) {
      const barb = this.barbs[i];
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

    pop();
  }

  debugDrawBarbRoot(barb) {
    Debug.drawFrame(barb.frame, /* lineLength: */ 20);

    // Visualize each clump with a different color
    const clumpColor = getRandomColor(barb.clumpIndex);
    fill(clumpColor);
    noStroke();
    Debug.drawCircle(barb.frame.origin, 5);

    // Visualize the barb length
    const barbTip = add2d(barb.frame.origin, scale2d(barb.frame.right, barb.length));
    stroke(clumpColor);
    Debug.drawDashedLine2D(barb.frame.origin, barbTip);
  }

  debugDrawBarb(barb) {
    const clumpColor = getRandomColor(barb.clumpIndex);

    stroke(clumpColor);

    Debug.drawHermite2D(barb.spline, /* steps: */ 20, /* showTangents: */ debugDrawToggles.barbTangents);
  }
}

let feather;
let spineShader;

window.setup = function () {
  canvas = createCanvas(w, h, WEBGL);
  centerCanvas(canvas);
  pixelDensity(1);
  createGui();

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

function getRandomColor(i) {
  // Deterministic random color, random hue
  const rand = sqRand(i);
  colorMode(HSB);
  const c = color(rand * 360, 100, 100);
  colorMode(RGB);
  return c;
}

function createGui() {
  gui.add(Debug, 'enabled').name('Debug Draw').onChange(() => { refresh(); });

  const debugFolder = gui.addFolder('Debug');
  debugFolder.add(debugDrawToggles, 'spine').name('Draw Spine').onChange(() => { refresh(); });
  debugFolder.add(debugDrawToggles, 'vane').name('Draw Vane').onChange(() => { refresh(); });
  debugFolder.add(debugDrawToggles, 'barbs').name('Draw Barbs').onChange(() => { refresh(); });
  debugFolder.add(debugDrawToggles, 'barbTangents').name('Draw Barb Tangents').onChange(() => { refresh(); });
  debugFolder.add(debugDrawToggles, 'spineShader').name('Spine Shader').onChange(() => { refresh(); });
  debugFolder.add(debugSliders, 'a', 0, 1).step(0.01).name('Debug Slider A').onChange(() => { refresh(); });

  const paramsFolder = gui.addFolder('Feather Params');
  paramsFolder.add(params, 'spineDivisions', 10, 300).step(1).onChange(() => { refresh(); });
  paramsFolder.add(params, 'spineEnd', 0.5, 1).step(0.01).onChange(() => { refresh(); });
  paramsFolder.add(params, 'spineBaseWidth', 1, 100).step(1).onChange(() => { refresh(); });
  paramsFolder.add(params, 'afterFeatherStart', 0, 1).step(0.01).onChange(() => { refresh(); });
  paramsFolder.add(params, 'afterFeatherEnd', 0, 1).step(0.01).onChange(() => { refresh(); });
  paramsFolder.add(params, 'vaneStart', 0, 1).step(0.01).onChange(() => { refresh(); });
  paramsFolder.add(params, 'vaneEnd', 0, 1).step(0.01).onChange(() => { refresh(); });
  paramsFolder.add(params, 'vaneBreaks', 0, 20).step(1).onChange(() => { refresh(); });
  paramsFolder.add(params, 'vaneBreakSymmetry', 0, 1).step(0.01).onChange(() => { refresh(); });

  const barbsFolder = gui.addFolder('Barbs');
  barbsFolder.add(params, 'nBarbs', 1, 100).step(1).onChange(() => { refresh(); });
  barbsFolder.add(params, 'barbTiltStart', 0, 1).step(0.01).onChange(() => { refresh(); });

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
}