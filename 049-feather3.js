import { BezierCubic } from "./lumic/bezier.js";
import { Debug } from "./lumic/debug.js";
import { vec2, lerp, normalize2d, add2d, line2D, mul2d, scale2d, lerp2d, sub2d, dist2d } from "./lumic/common.js";
import { easeInOutElastic, easeInOutQuad, easeInOutQuart, easeInQuad, easeOutQuad } from "./lumic/easing.js";
import { CubicHermite2D } from "./lumic/hermite.js";
import { centerCanvas } from "./lumic/p5Extensions.js";
import * as dat from 'libraries/dat.gui.js';

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
  spine: {"p0":{"x":138,"y":578},"m0":{"x":449,"y":-225},"p1":{"x":1492,"y":595},"m1":{"x":666,"y":-373}},
  spineBaseWidth: 20,
  spineWidthCurve: (t) => {
    // Example curve: easeInOutQuad
    return easeInOutQuad(t);
  },
  nBarbs: 40, // barbs start at the end of the calamus
  // Afterfeather is the plumaceous part of the feather (fluffy)
  afterFeatherStart: 0.2,
  afterFeatherEnd: 0.3,
  // Vane is the pennaceous part of the feather (flat, stiff)
  vaneStart: 0.3,
  vaneEnd: 0.8,
  // Number of breaks in the vane (when the barbs are not connected, causing a gap)
  vaneBreaks: 10,
  vaneBreakSymmetry: 0.5, // 0 = left only, 1 = right only, 0.5 = even on both sides
};

class Feather {
  constructor(params) {
    this.params = params;
    build();
    createGui();
  }

  build() {
    this.spine = CubicHermite2D.FromObject(params.spine);

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

    // Get frames along the spine for the barbs
    this.leftBarbs = [];
    this.rightBarbs = [];
    const barbWidthNormalized = (1 - params.calamusLengthNormalized) / params.nBarbs;
    let iClumpLeft = 0; // Clump index (even)
    let iClumpRight = 0; // Clump index (odd)
    for (let i = params.calamusLengthNormalized; i <= 1; i += barbWidthNormalized) {

      
      const rightFrame = this.spine.GetFrame(i);
      const leftFrame = new Frame2D(rightFrame.origin, scale2d(rightFrame.right, -1));
      
      // Assign a "clump index" to the barb
      // Every time there is a break in the vane, a new clump starts

      
    }
  }

  createGui() {
    // All params except spine
    gui.add(this.params, 'nBarbs', 1, 100).step(1).onChange(() => this.build());
    gui.add(this.params, 'afterFeather', 0, 1).step(0.01).onChange(() => this.build());
  }

  debugDraw() {
    Debug.drawHermite2D(this.spine, 100);
    this.barbFrames.forEach((frame, i) => { Debug.drawFrame(frame); });
  }
}

let feather;

window.setup = function () {
  canvas = createCanvas(w, h);
  centerCanvas(canvas);
  pixelDensity(1);

  feather = new Feather(params);
};

window.draw = function () {
  background(75);
  noLoop();

  stroke(255);
  feather.debugDraw();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};