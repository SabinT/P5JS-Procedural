import {
  avg,
  vec2,
  polar2cart,
  lerp,
  bezier2D,
  bezierQuadratic2DShape,
  TAU,
  getRandom,
} from "./common.js";

let polarSubdivisionCount = 8;
export function setPolarSubdivisionCount(n) {
  polarSubdivisionCount = n;
}

export function segmentCenter(s) {
  return vec2(avg(s.r1, s.r2), avg(s.a1, s.a2));
}

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
  divisions = null,
  vertexMode = false
) {
  divisions = divisions || polarSubdivisionCount;
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

export function polarBox(r1, a1, r2, a2, divisions = 8, vertexMode = false) {
  // A----B    A = (r2, a1),   B = (r2, a2)
  // |    |    C = (r1, a2),   D = (r1, a1)
  // D----C
  polarLine(r2, a1, r2, a2, divisions, vertexMode);
  polarLine(r2, a2, r1, a2, divisions, vertexMode);
  polarLine(r1, a2, r1, a1, divisions, vertexMode);
  polarLine(r1, a1, r2, a1, divisions, vertexMode);
}

let globalOverrides = {};

export function setOverrides(options) {
  globalOverrides = options;
}

export function resetOverrides() {
  globalOverrides = undefined;
}

/**
 * Draws a radially repeated ring with a custom drawing function.
 * @param {number} rStart Start radius of ring
 * @param {number} rEnd End radius of ring
 * @param {function} segmentFunc A function that takes (segment, i, options)
 *        segment must have properties r1, r2, a1, a2 (angles in radians)
 *        i is the index of the current segment being drawn
 * @param {object} options Arbitrary data for custom ring functions, and some standard customizations
 *        options.count: number of things to draw (default 8)
 *        options.skip: skip every "n"th segment
 *        options.invertSkip: invert the skip pattern
 *        options.shape: Call `beginShape()` and `endShape()` before and after drawing segment
 *        options.combineShape: Call `beginShape()` and `endShape()` before and after the entire set of repititions
 *        options.onBeforeSegment: custom code to execute before drawing segment
 *        options.filter(i, options): Decide whether to drop segments based on index (return false to drop)
 *        options.onAfterSegment: custome code to execute after drawing segment
 *        options.angleShiftFactor: shift the start angle (0-1) of one segment angle
 *        options.angleRange: Default 2 * PI if unspecified
 *        options.angleStart: Specify to start angle at something other than zero
 *        options.hidePerimeter: Asks the drawing function to not draw radial perimeters (at r1 and r2)
 *          This does not take effect when an inset is applied
 *        options.lineDivisions: controls the resolution of curved lines
 *        options.inverted: swap r2 and r1 (i.e., draw the mandala inwards)
 *        options.inset: inset the ring by this amount
 *        options.insetA: inset the ring angle by this amount
 *        options.insetR: inset the ring radius by this amount
 *        options.mask: Use a text mask to disable certain segments. "-" means don't draw, "x" means draw.
 */
export function drawRing(rStart, rEnd, segmentFunc, options) {
  if (globalOverrides) {
    options = { ...options, ...globalOverrides };
  }

  if (options.inverted) {
    const tmp = rEnd;
    rEnd = rStart;
    rStart = tmp;
  }

  options.lineDivisions ||= 8;

  const count = options?.count || 8;

  const angleRange = options?.angleRange || TAU;

  const anglePerSegment = angleRange / count;
  const offset = 0.5 * anglePerSegment;

  const createInnerShape =
    options?.shape &&
    !options?.combineShape &&
    supportsVertexMode.has(segmentFunc);
  options.vertexMode = createInnerShape || options?.combineShape;

  if (options?.combineShape) {
    beginShape();
  }

  const hasMask = options?.mask && options?.mask.length > 0;

  for (let i = 0; i < count; i++) {
    const maskChar = hasMask ? options.mask[i % options.mask.length] : null;
    if (hasMask) {
      if (maskChar === "-") {
        continue;
      }
    }

    if (options.skip && !noSkip.has(segmentFunc)) {
      let shouldSkip = i % (options.skip + 1) === 0;
      if (options.invertSkip) {
        shouldSkip = !shouldSkip;
      }

      if (shouldSkip) {
        continue;
      }
    }

    if (options?.filter) {
      if (filter(i, options) === false) {
        continue;
      }
    }

    const angleShiftFactor = options?.angleShiftFactor || 0;

    const angleStart =
      angleShiftFactor * anglePerSegment -
      offset +
      i * anglePerSegment +
      (options?.angleStart || 0);

    const angleEnd = angleStart + anglePerSegment;

    let segment = {};

    const inset = options?.inset || 0;
    if (inset || options?.insetR || options?.insetA) {
      options.hidePerimeter = false;

      let insetA, insetR;

      if (options?.autoFixInset) {
        insetA = constrain(inset, 0, 0.5);

        // Find the change in average arc length due to angle inset
        const circumference =
          (2 * PI * avg(rEnd, rStart)) / (angleEnd - angleStart);
        const arcChange = circumference * insetA;
        const dr = rEnd - rStart;
        //const ar = dr / circumference;

        insetR = constrain((2 * (rEnd - rStart)) / arcChange, 0, 0.5);
      } else {
        insetA = options?.insetA || inset;
        insetR = options?.insetR || inset;
      }

      segment.r1 = lerp(rStart, rEnd, insetR);
      segment.r2 = lerp(rEnd, rStart, insetR);
      segment.a1 = lerp(angleStart, angleEnd, insetA);
      segment.a2 = lerp(angleEnd, angleStart, insetA);
    } else {
      segment = { r1: rStart, r2: rEnd, a1: angleStart, a2: angleEnd };
    }

    if (options?.onBeforeSegment) {
      // To modify color, stroke, draw custom stuff, or modify the segment altogether
      options.onBeforeSegment(segment);
    }

    if (createInnerShape) {
      beginShape();
    }

    segmentFunc(segment, i, options);

    if (createInnerShape) {
      endShape();
    }

    if (options?.onAfterSegment) {
      options.onAfterSegment(segment);
    }
  }

  if (options?.combineShape) {
    endShape();
  }
}

let rCurrent = 10;

export function resetMandalaContext() {
  rCurrent = 0;
  resetOverrides();
}

export function getCurrentRadius() {
  return rCurrent;
}

export function addRing(ringFunc, rStep, options) {
  if (options.autoInset) {
    if (supportsInset.has(ringFunc) && random(1) < 0.5) {
      drawRing(rCurrent, rCurrent + rStep, ringFunc, {
        ...options,
        inset: 0.2,
      });
    }
  }

  if (options.autoRepeat) {
    if (ringFunc === bezierSegment) {
      // Also repeat laterally
      drawRing(rCurrent, rCurrent + rStep, ringFunc, {
        ...options,
        angleShiftFactor: 0.2,
      });
      drawRing(rCurrent, rCurrent + rStep, ringFunc, {
        ...options,
        angleShiftFactor: -0.2,
      });
    }
  }

  drawRing(rCurrent, rCurrent + rStep, ringFunc, options);

  rCurrent += rStep;
}

export function addSpacer(rStep, start, end) {
  if (start) {
    cCircle(rCurrent);
  }

  rCurrent += rStep;

  if (end) {
    cCircle(rCurrent);
  }
}

export function addCircle() {
  cCircle(rCurrent);
}

export function emptySegment(s, i, options) {
  // Wow so empty
  // But you can still use this segment, if you just want to execute custom callbacks
}

export function diamondSegment(s, i, options) {
  //  *----B----*   A = (rm, a2)
  //  *         *   B = (r2, am)
  //  A         C   C = (rm, a1)
  //  *         *   D = (r1, am)
  //  *----D----*

  const rm = avg(s.r1, s.r2);
  const am = avg(s.a1, s.a2);

  const divisions = options?.divisions || 8;

  const vertexMode = options?.vertexMode;

  polarLine(rm, s.a2, s.r2, am, divisions, vertexMode);
  polarLine(s.r2, am, rm, s.a1, divisions, vertexMode);
  polarLine(rm, s.a1, s.r1, am, divisions, vertexMode);
  polarLine(s.r1, am, rm, s.a2, divisions, vertexMode);
}

export function crossSegment(s, i, options) {
  //  A---------B   A = (r2, a2)
  //  *         *   B = (r2, a1)
  //  *         *   C = (r1, a2)
  //  *         *   D = (r1, a1)
  //  C---------D

  const divisions = options?.divisions || 8;
  const vertexMode = options?.vertexMode;

  if (options?.perimiter) {
    polarLine(s.r2, s.a2, s.r2, s.a1, divisions, vertexMode);
  }
  polarLine(s.r2, s.a1, s.r1, s.a2, divisions, vertexMode);
  if (options?.perimiter) {
    polarLine(s.r1, s.a2, s.r1, s.a1, divisions, vertexMode);
  }
  polarLine(s.r1, s.a1, s.r2, s.a2, divisions, vertexMode);
}

export function triangleSegment(s, i, options) {
  //  *----A----*   A = (r2, am)
  //  *         *   B = (r1, a2)
  //  *         *   C = (r1, a1)
  //  *         *
  //  B---------C

  const divisions = options?.divisions || 8;

  const am = avg(s.a1, s.a2);

  const vertexMode = options?.vertexMode;

  polarLine(s.r2, am, s.r1, s.a2, divisions, vertexMode);

  if (!options?.hidePerimeter) {
    polarLine(s.r1, s.a2, s.r1, s.a1, divisions, vertexMode);
  }

  polarLine(s.r1, s.a1, s.r2, am, divisions, vertexMode);
}

// Assuming angle1 < angle2
export function squareWaveSegment(s, i) {
  noFill();
  const midAngle = constrain(avg(s.a1, s.a2), s.a1, s.a2);
  cArc(s.r1, s.a1, midAngle);
  cArc(s.r2, midAngle, s.a2);
  polarLine(s.r1, s.a1, s.r2, s.a1);
  polarLine(s.r1, midAngle, s.r2, midAngle);
}

/**
 * @deprecated Use boxSegment instead
 * @param {} s
 * @param {*} i
 * @param {*} options
 */
export function cellSegment(s, i, options) {
  // leading line, closing line will be provided by next segment
  polarLine(s.r1, s.a1, s.r2, s.a1);

  if (!options?.hidePerimeter) {
    polarLine(s.r1, s.a1, s.r1, s.a2);
    polarLine(s.r2, s.a1, s.r2, s.a2);
  }
}

export function bezierSegment(s, i) {
  noFill();
  let a, b, c, d;

  a = polar2cart(vec2(s.r1, s.a1));
  d = polar2cart(vec2(s.r2, s.a2));
  b = polar2cart(vec2(s.r2, s.a1));
  c = polar2cart(vec2(s.r1, s.a2));
  bezier2D(a, b, c, d);
}

export function leafSegment(s, i, options) {
  const sc = segmentCenter(s);

  {
    let a = polar2cart(vec2(s.r2, sc.y));
    let b = polar2cart(vec2(s.r1, sc.y));
    let c = polar2cart(vec2(s.r2, s.a2));
    let d = polar2cart(vec2(s.r1, s.a2));

    b = p5.Vector.lerp(a, b, 0.5);
    c = p5.Vector.lerp(c, d, 0.5);

    bezier2D(d, c, b, a, options?.shape);
  }

  {
    let a = polar2cart(vec2(s.r1, s.a1));
    let d = polar2cart(vec2(s.r2, sc.y));
    let b = polar2cart(vec2(s.r2, s.a1));
    let c = polar2cart(vec2(s.r1, sc.y));

    b = p5.Vector.lerp(a, b, 0.5);
    c = p5.Vector.lerp(c, d, 0.5);

    bezier2D(d, c, b, a, options.shape);
  }

  if (!options?.hidePerimeter) {
    polarLine(s.r1, s.a1, s.r1, s.a2, 8, options?.shape);
  }
}

export function boxSegment(s, i, options) {
  if (options?.hidePerimeter) {
    // A----B    A = (r2, a1),   B = (r2, a2)
    // |    |    C = (r1, a2),   D = (r1, a1)
    // D----C
    polarLine(
      s.r2,
      s.a2,
      s.r1,
      s.a2,
      options?.lineDivisions || 8,
      options.vertexMode
    );

    // Draw leading line only, trailing line provided by next segment, unless there's skip
    if (options?.skip > 0) {
      polarLine(
        s.r1,
        s.a1,
        s.r2,
        s.a1,
        options?.lineDivisions,
        options.vertexMode
      );
    }
  } else {
    polarBox(s.r1, s.a1, s.r2, s.a2, 8, options?.shape);
  }
}

export function crissCrossPetalSegment(s, i, options) {
  noFill();
  var a = polar2cart(vec2(s.r1, s.a1)); // bottom left
  var b = polar2cart(vec2(s.r2, s.a1)); // top left
  var c = polar2cart(vec2(s.r2, s.a2)); // top right
  var d = polar2cart(vec2(s.r1, s.a2)); // bottom right

  var phi = s.a2 - s.a1; // angle subtended by arc
  var r3 = s.r2 / Math.cos(0.5 * phi);
  r3 *= options.scaler || 0.97;
  var e = polar2cart(vec2(r3, avg(s.a1, s.a2)));

  bezier2D(a, b, e, c);
  bezier2D(b, e, c, d);
}

export function leafTiltedSegment(s, i, options) {
  const da = Math.abs(s.a2 - s.a1);
  s.a1 -= 0.5 * da;
  s.a2 -= 0.5 * da;

  var a = polar2cart(vec2(s.r1, s.a1)); // bottom left
  var b = polar2cart(vec2(s.r2, s.a1)); // top left
  var c = polar2cart(vec2(s.r2, s.a2)); // top right
  var d = polar2cart(vec2(s.r1, s.a2)); // bottom right

  const shouldSkip = "skipFactor" in options;
  const skipFactor = options?.skipFactor || 1;
  const j = Math.floor((i + 1) / skipFactor);

  if (shouldSkip && j % 2 == 1) {
    return;
  }

  const m = options?.flip || false ? 0 : 1;

  beginShape();
  if (i % 2 == m) {
    bezierQuadratic2DShape(a, b, c);
    bezierQuadratic2DShape(c, d, a);
  } else {
    bezierQuadratic2DShape(d, c, b);
    bezierQuadratic2DShape(b, a, d);
  }
  endShape();
}

export function circleSegment(s, i, options) {
  var a = polar2cart(segmentCenter(s)); // bottom left

  const diameter = options?.diameter || (s.r2 - s.r1);
  circle(a.x, a.y, diameter);
}

export function textSegment(s, i, options) {
  const fontSize = options.fontSize || (s.r2 - s.r1) * 0.5;
  const font = options.font || "Arial";
  const char = options.text[i % options.text.length];
  
  push();
  const c = polar2cart(segmentCenter(s));
  translate(c.x, c.y);
  rotate(avg(s.a1, s.a2) + Math.PI / 2 + (options.rotation || 0));
  textFont(font, fontSize);
  text(char, 0, 0);
  pop();
}

export const supportsVertexMode = new Set();
supportsVertexMode.add(diamondSegment);
supportsVertexMode.add(crossSegment);
supportsVertexMode.add(triangleSegment);
supportsVertexMode.add(boxSegment);
supportsVertexMode.add(leafSegment);
supportsVertexMode.add(leafTiltedSegment);
supportsVertexMode.add(circleSegment);

export const supportsInset = new Set();
supportsInset.add(diamondSegment);
supportsInset.add(crossSegment);
supportsInset.add(boxSegment);
supportsInset.add(circleSegment);

export const supportsRepeat = new Set();
supportsRepeat.add(bezierSegment);
supportsRepeat.add(diamondSegment);
supportsRepeat.add(crossSegment);
supportsRepeat.add(squareWaveSegment);

export const hasPerimeter = new Set();
hasPerimeter.add(boxSegment);
hasPerimeter.add(squareWaveSegment);
hasPerimeter.add(leafSegment);

export const noSkip = new Set();
noSkip.add(squareWaveSegment);
noSkip.add(crissCrossPetalSegment);
noSkip.add(crossSegment);

export const allSegments = [
  emptySegment,
  diamondSegment,
  crossSegment,
  triangleSegment,
  squareWaveSegment,
  bezierSegment,
  leafSegment,
  boxSegment,
  crissCrossPetalSegment,
  // leafTiltedSegment,
  circleSegment,
];

export function getRandomSegment() {
  const pick = allSegments[Math.floor(random(allSegments.length))];

  console.log(pick.name);

  return pick;
}

export function getSegment(i) {
  return allSegments[i % allSegments.length];
}

export function drawRandomMandala(
  segmentTypes,
  rMin,
  rMax,
  rStep,
  countSeq,
  overrides,
  colorTheme
) {
  resetMandalaContext();

  // Start from edge and work backwards
  addSpacer(rMax);
  setOverrides({ hidePerimeter: true, inverted: true, ...overrides });

  if (colorTheme) {
    stroke(getRandom(colorTheme.colors));
  }

  addCircle();

  const counts = countSeq ?? [8, 8, 6, 6, 3, 3];
  let ringNum = 0;
  while (getCurrentRadius() > rMin) {
    let seg = getRandom(segmentTypes);
    if (seg === bezierSegment) {
      seg = diamondSegment;
    }

    // seg = getRandom([crissCrossPetalSegment, leafSegment, crossSegment]);

    let step = -rStep;

    if (
      seg === crissCrossPetalSegment ||
      seg === crossSegment ||
      seg === leafSegment
    ) {
      step = -rStep * 1.5;
    }

    if (getCurrentRadius() + step < rMin) {
      break;
    }

    const count = counts[min(ringNum++, counts.length - 1)];

    const newOptions = {
      count: count,
    };

    if (colorTheme) {
      fill(getRandom(colorTheme.bgcolors));
    }

    addRing(seg, step, newOptions);

    if (random(1) < 0.25 && supportsRepeat.has(seg)) {
      // Small repeat chance
      addRing(seg, step, newOptions);
    }

    noFill();
    if (random() < 0.75) {
      // adding perimeter doesn't make sense for squareWaveSegment
      if (random(1) < 1 && seg !== squareWaveSegment) {
        addSpacer(-5, true, true);
      } else {
        addSpacer(-5, false, false);
      }
    }
  }
}
