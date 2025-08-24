import { BezierCubic } from "./lumic/bezier.js";
import { Debug } from "./lumic/debug.js";
import { vec2, lerp, normalize2d, add2d, line2D, mul2d, scale2d, lerp2d, sub2d, dist2d, sqRand } from "./lumic/common.js";
import { easeInOutElastic, easeInOutQuad, easeInOutQuart, easeInQuad, easeOutQuad, smoothstep } from "./lumic/easing.js";
import { CubicHermite2D } from "./lumic/hermite.js";
import { centerCanvas } from "./lumic/p5Extensions.js";
import { Frame2D } from "./lumic/frame.js";
import { getTangents } from "./lumic/geomerty.js";
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

Debug.enabled = true; // Enable debug drawing
const gui = new dat.GUI();

const params = {
  // cubic hermite spline
  spineCurve: CubicHermite2D.FromObject({"p0":{"x":297,"y":546},"m0":{"x":176,"y":-122},"p1":{"x":1343,"y":576},"m1":{"x":680,"y":-284}}),
  spineDivisions: 100,
  spineBaseWidth: 20,
  spineBaseColor: "#bfb09aff",
  spineWidthCurve: (t) => {
    // Example curve: easeInOutQuad
    return 1 - easeInQuad(t);
  },
  nBarbs: 40, // barbs start at the end of the calamus
  // Afterfeather is the plumaceous part of the feather (fluffy)
  afterFeatherStart: 0.2,
  afterFeatherEnd: 0.3,
  // Vane is the pennaceous part of the feather (flat, stiff)
  vaneStart: 0.3,
  vaneEnd: 0.8,
  vaneBaseWidth: 100,
  vaneWidthCurve: (t) => {
    // Example curve: easeInOutQuad
    return smoothstep(0, 0.04, t)
         * smoothstep(2, 0.1, t)
         * smoothstep(1.5, 0.6, t);
  },
  // Number of breaks in the vane (when the barbs are not connected, causing a gap)
  vaneBreaks: 10,
  vaneBreakSymmetry: 0.5, // 0 = left only, 1 = right only, 0.5 = even on both sides
};

// Reduced divisions for faster debugging
const debugParams = { ... params };
debugParams.spineDivisions = 20;
debugParams.nBarbs = 20;

class Feather {
  constructor(params) {
    this.params = params;
    this.build();
  }

  build() {
    this.buildSpine();
    this.buildBarbs();
  }

  buildBarbs() {
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

    if (Debug.enabled) {
      console.log(`Left vane breaks: ${leftVaneBreaks}, Right vane breaks: ${rightVaneBreaks}`);
      console.log("Left vane break stops:", leftVaneBreakStops);
      console.log("Right vane break stops:", rightVaneBreakStops);
    }

    const tBarbStart = params.afterFeatherEnd;

    // Get frames along the spine for the barbs
    this.leftBarbs = [];
    this.rightBarbs = [];
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
      };

      const leftBarb = {
        frame: leftFrame,
        clumpIndex: iClumpLeft,
        barbIndex: iBarb++,
        length: vaneWidth,
      };

      this.rightBarbs.push(rightBarb);
      this.leftBarbs.push(leftBarb);
    }
  }

  buildSpine() {
    const params = this.params;

    // Don't directly use the hermite's frame, build a smoother one from points
    var { points, tangents } = this.getPointsAndTangentsAlongSpine(0, 1, params.spineDivisions);

    this.spine = [];
    for (let i = 0; i < points.length; i++) {
      const tAlongSpine = i / (points.length - 1);
      const spineWidth = params.spineBaseWidth * params.spineWidthCurve(tAlongSpine);
      const spinePt = {
        frame: new Frame2D(points[i], tangents[i]),
        width: spineWidth,
      }

      this.spine.push(spinePt);
    }
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
    this.drawSpine();

    if (Debug.enabled) {
      this.debugDraw();
    }
  }

  drawSpine() {

    // Use a shader that draws a gradient based on uv.y



    // Construct a shape with UVs for the spine
    // The shape travels along the right side, then back along the left side to close the loop
    beginShape();
    // Right side, uv.y = 0.5
    for (let i = 0; i < this.spine.length; i++) {
      const u = i / (this.spine.length - 1);
      const p = this.spine[i];
      const edgePoint = add2d(p.frame.origin, scale2d(p.frame.right, p.width / 2));
      vertex(edgePoint.x, edgePoint.y, 0, u, 0.5);
    }

    // Left side, traveling back, uv.y = -0.5
    for (let i = this.spine.length - 1; i >= 0; i--) {
      const u = i / (this.spine.length - 1);
      const p = this.spine[i];
      const edgePoint = add2d(p.frame.origin, scale2d(p.frame.right, -p.width / 2));
      vertex(edgePoint.x, edgePoint.y, 0, u, -0.5);
    }
    endShape(CLOSE);
  }

  debugDraw() {
    push();

    Debug.drawHermite2D(this.params.spineCurve, /* steps: */ 100);

    noFill();
    this.spine.forEach(p => { Debug.drawPoint(p.frame.origin, p.width); });

    for (let i = 0; i < this.leftBarbs.length; i += 1) {
      const barb = this.leftBarbs[i];
      this.debugDrawBarb(barb);
    }

    for (let i = 0; i < this.rightBarbs.length; i += 1) {
      const barb = this.rightBarbs[i];
      this.debugDrawBarb(barb);
    }
    
    pop();
  }

  debugDrawBarb(barb) {
    Debug.drawFrame(barb.frame, /* lineLength: */ 20);

    // Visualize each clump with a different color
    const clumpColor = getRandomColor(barb.clumpIndex + 123749);
    fill(clumpColor);
    noStroke();
    Debug.drawCircle(barb.frame.origin, 5);

    // Visualize the barb length
    const barbTip = add2d(barb.frame.origin, scale2d(barb.frame.right, barb.length));
    stroke(clumpColor);
    Debug.drawLine2D(barb.frame.origin, barbTip);
  }
}

let feather;

window.setup = function () {
  canvas = createCanvas(w, h);
  centerCanvas(canvas);
  pixelDensity(1);
  createGui();

  feather = new Feather(Debug.enabled ? debugParams : params);
  feather.build();
};

window.draw = function () {
  centerCanvas(canvas);
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
  gui.add(Debug, 'enabled').name('Debug Draw').onChange(() => { redraw(); });

  gui.add(params, 'spineDivisions', 10, 300).step(1).onChange(() => { redraw(); });
  gui.add(params, 'nBarbs', 1, 100).step(1).onChange(() => { redraw(); });
  gui.add(params, 'afterFeatherStart', 0, 1).step(0.01).onChange(() => { redraw(); });
  gui.add(params, 'afterFeatherEnd', 0, 1).step(0.01).onChange(() => { redraw(); });
  gui.add(params, 'vaneStart', 0, 1).step(0.01).onChange(() => { redraw(); });
  gui.add(params, 'vaneEnd', 0, 1).step(0.01).onChange(() => { redraw(); });
  gui.add(params, 'vaneBreaks', 0, 20).step(1).onChange(() => { redraw(); });
  gui.add(params, 'vaneBreakSymmetry', 0, 1).step(0.01).onChange(() => { redraw(); });
}

function refresh() {
  setupDebugParams();
  feather = new Feather(Debug.enabled ? debugParams : params);
  feather.build();
  redraw();
}

function setupDebugParams() {
  // Copy params to debugParams except for the reduced divisions
  debugParams = structuredClone(params);
  debugParams.spineDivisions = 100;
  debugParams.nBarbs = 40;
}