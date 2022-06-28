import {
  distance2,
  getRandom,
  line2D,
  sizes,
  TAU,
  vec2,
  vec4,
  avg,
} from "./lumic/common.js";
import {
  cloverTheme,
  cyberpunkTheme,
  getColor,
  getRandomColor,
  greenTheme,
} from "./lumic/palettes.js";
import { sdCircle, sdHeart } from "./lumic/sdf.js";
import { QuadTree } from "./lumic/quadtree.js";

const colorTheme = cloverTheme;

const debugMode = false;

function sdfBase(p) {
  // const scale = width * 0.45;
  // p = p5.Vector.mult(p, -1 / scale);
  // p = p5.Vector.add(p, vec2(0, 0.6));
  // return sdHeart(p) * scale;

  const d = sdCircle(p5.Vector.mult(p, 2), 50);
  return d;
}

function sdfTop(p) {
  // const scale = width * 0.45;
  // p = p5.Vector.mult(p, -1 / scale);
  // p = p5.Vector.add(p, vec2(0, 0.6));
  // return sdHeart(p) * scale;

  const d = sdCircle(p, 50);
  return d;
}

function packCircles(params) {
  let circles = [];

  const quadTree = new QuadTree(
    7,
    vec4(-width / 2, -height / 2, width / 2, height / 2),
    debugMode
  );

  loadPixels();

  let i = 0;
  while (i < params.maxIterations && circles.length <= params.maxCircles) {
    let p = vec2(
      random(-0.5, 0.5) * (width - 2 * params.pageMargin),
      random(-0.5, 0.5) * (height - 2 * params.pageMargin)
    );

    const sampleCol = color(getRandomColor(colorTheme));
    sampleCol.setAlpha(150)
    set(p.x + width/2, p.y + height/2, sampleCol);

    // TODO enforce page margin

    let dMultiplier = params?.invert ? -1 : 1;

    let maxDist = dMultiplier * params.sdf(p);
    const margin = params.sdfMarginFunc(maxDist);

    if (maxDist > margin && maxDist < params.sdfThreshold) {
      // Track closest circle
      let closestCircle;
      let dClosest = Infinity;

      // Check against starting circles
      for (const circ of params.startCircles) {
        let dMultiplier = circ?.invert ? -1 : 1;
        const d =
          dMultiplier * (distance2(p, circ.center) - circ.radius) - margin;

        maxDist = min(d, maxDist);

        if (maxDist < 0) {
          break;
        }
      }

      // Intersect with the existing circles
      const overlapping = quadTree.GetOverlappingObjects(
        vec4(p.x - maxDist, p.y - maxDist, p.x + maxDist, p.y + maxDist)
      );

      // for (const circ of circles) {
      for (const circ of overlapping) {
        let dMultiplier = circ?.invert ? -1 : 1;
        const d =
          dMultiplier * (distance2(p, circ.center) - circ.radius) - margin;

        if (abs(d) < dClosest) {
          dClosest = abs(d);
          closestCircle = circ;
        }

        maxDist = min(d, maxDist);

        if (maxDist < 0) {
          break;
        }
      }

      // reject samples that are too close or too far away (instead of clamping)
      if (maxDist >= params.minRadius && maxDist <= params.maxRadius) {
        const circ = {
          center: p,
          radius: maxDist,
          closestCircle: closestCircle,
          colIndex: (closestCircle?.colIndex ?? 0) + 1,
        };
        circles.push(circ);
        quadTree.Insert(
          circ,
          vec4(p.x - maxDist, p.y - maxDist, p.x + maxDist, p.y + maxDist)
        );
      }
    }

    i++;
  }

  updatePixels();
  
  return circles;
}

let qt;
let packingParams;
let circles;

function drawCirclesPassMain(circles) {
  circles.forEach((circ) => {
    stroke(255);
    fill(getColor(colorTheme, circ.colIndex));
    circle(circ.center.x, circ.center.y, 2 * circ.radius);

    const r2 = max(0, circ.radius - 5);
    fill(getColor(colorTheme, circ.colIndex - 1));
    circle(circ.center.x, circ.center.y, 2 * r2);
  });
}

function drawCirclesPassShadow(circles) {
  circles.forEach((circ) => {
    const col = color(getRandom(colorTheme.bgcolors));
    col.setAlpha(10);
    fill(col);
    noStroke();
    circle(circ.center.x, circ.center.y, 15 * circ.radius);
  });
}

function drawCircleConnectors1(circles) {
  circles.forEach((circ) => {
    const col = getRandomColor(greenTheme);

    const margin = 1;
    const other = circ.closestCircle;
    if (other) {
      const dir = p5.Vector.normalize(
        vec2(other.center.x - circ.center.x, other.center.y - circ.center.y)
      );

      const a = p5.Vector.add(
        circ.center,
        p5.Vector.mult(dir, circ.radius - margin)
      );
      const b = p5.Vector.add(circ.center, p5.Vector.mult(dir, margin));

      const c = p5.Vector.add(
        other.center,
        p5.Vector.mult(dir, -other.radius + margin)
      );
      const d = p5.Vector.add(other.center, p5.Vector.mult(dir, -margin));

      line2D(a, b);
      circle(circ.center.x, circ.center.y, margin);

      line2D(c, d);
      circle(other.center.x, other.center.y, margin);
    }
  });
}

function drawCircleConnectors2(circles) {
  circles.forEach((circ) => {
    // const col = color(0,0,0,100)
    const col = getRandom(colorTheme.colors);

    const other = circ.closestCircle;
    if (other) {
      stroke(col);
      strokeWeight(avg(circ.radius, other.radius) * 0.1);
      line2D(circ.center, other.center);
    }
  });
}

window.setup = function () {
  createCanvas(sizes.letter.w, sizes.letter.h);

  drawingContext.shadowOffsetX = 2;
  drawingContext.shadowOffsetY = -2;
  drawingContext.shadowBlur = 10;
  drawingContext.shadowColor = colorTheme.bgcolors[0];

  translate(width / 2, height / 2);
  background(0);

  //Bottom layer
  {
    packingParams = {
      // startCircles: [{ center: vec2(0, 0), radius: 0.4 * height, invert: true }],
      startCircles: [],
      minRadius: 2,
      maxRadius: 50,
      maxCircles: 5000,
      maxIterations: 50000,
      sdf: sdfTop,
      sdfThreshold: 1000,
      // sdfMarginFunc: (d) => d * 0.05,
      sdfMarginFunc: (d) => 0,
      pageMargin: 10,
    };

    circles = packCircles(packingParams);

    //drawCirclesPassShadow(circles);
    //drawCircleConnectors2(circles);
    drawCirclesPassMain(circles);
  }

  // Top layer
  {
    packingParams = {
      // startCircles: [{ center: vec2(0, 0), radius: 0.4 * height, invert: true }],
      startCircles: [],
      minRadius: 2,
      maxRadius: 15,
      maxCircles: 2000,
      maxIterations: 50000,
      sdf: sdfTop,
      sdfThreshold: 1000,
      // sdfMarginFunc: (d) => d * 0.05,
      sdfMarginFunc: (d) => (sin((TAU * (d + 300)) / 300) + 1) * 8,
      pageMargin: 10,
    };

    circles = packCircles(packingParams);

    drawCirclesPassShadow(circles);
    drawCircleConnectors2(circles);
    drawCirclesPassMain(circles);
  }

  if (!debugMode) {
    noLoop();
  }
};

window.draw = function () {};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
