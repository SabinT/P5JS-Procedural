import {
  distance2d,
  getRandom,
  line2D,
  sizes,
  TAU,
  vec2,
  vec4,
} from "./lumic/common.js";
import { cyberpunkTheme, getRandomColor } from "./lumic/palettes.js";
import { sdCircle, sdHeart } from "./lumic/sdf.js";
import { QuadTree } from "./lumic/quadtree.js";

const debugMode = true;

function map(p) {
  const d = sdCircle(p, 50);
  return d;
}

function packCircles(params) {
  let circles = [];

  const quadTree = new QuadTree(
    7,
    vec4(-width / 2, -height / 2, width / 2, height / 2),
    true
  );

  let i = 0;
  while (i < params.maxIterations && circles.length <= params.maxCircles) {
    let p = vec2(
      random(-0.5, 0.5) * (width - 2 * params.pageMargin),
      random(-0.5, 0.5) * (height - 2 * params.pageMargin)
    );

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
          dMultiplier * (distance2d(p, circ.center) - circ.radius) - margin;

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
          dMultiplier * (distance2d(p, circ.center) - circ.radius) - margin;

        if (abs(d) < dClosest) {
          dClosest = abs(d);
          closestCircle = circ;
        }

        maxDist = min(d, maxDist);

        if (maxDist < 0) {
          break;
        }
      }

      const pageMargin = params.pageMargin;
      // Check page margin
      if (
        p.x - maxDist < -width / 2 + pageMargin ||
        p.x + maxDist > width / 2 - pageMargin ||
        p.y - maxDist < -height / 2 + pageMargin ||
        p.y + maxDist > height / 2 - pageMargin
      ) {
        continue;
      }

      // reject samples that are too close or too far away (instead of clamping)
      if (maxDist >= params.minRadius && maxDist <= params.maxRadius) {
        const circ = {
          center: p,
          radius: maxDist,
          closestCircle: closestCircle,
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

  return circles;
}

let qt;
let packingParams;
let circles;

function pack() {
  packingParams = {
    // startCircles: [{ center: vec2(0, 0), radius: 0.4 * height, invert: true }],
    startCircles: [],
    minRadius: 5,
    maxRadius: 20,
    maxCircles: 500,
    maxIterations: 10000,
    sdf: map,
    sdfThreshold: 1000,
    // sdfMarginFunc: (d) => d * 0.05,
    sdfMarginFunc: (d) => (sin((TAU * (d + 50)) / 150) + 1) * 10,
    pageMargin: 10,
  };

  circles = packCircles(packingParams);

  // add to quadtree
  qt = new QuadTree(
    4,
    vec4(-width / 2, -height / 2, width / 2, height / 2),
    debugMode
  );
  for (const c of circles) {
    qt.Insert(
      c,
      vec4(
        c.center.x - c.radius,
        c.center.y - c.radius,
        c.center.x + c.radius,
        c.center.y + c.radius
      )
    );
  }

  console.log("circles: " + circles.length);
}

function drawCircles(circles) {
  circles.forEach((circ) => {
    // fill(getRandomColor(cyberpunkTheme))
    circle(circ.center.x, circ.center.y, 2 * circ.radius);

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

window.setup = function () {
  createCanvas(sizes.letter.w, sizes.letter.h);
  // translate(width / 2, height / 2)
  pack();
};

window.draw = function () {
  translate(width / 2, height / 2);
  background(10);
  noFill();
  stroke(255, 0, 0);
  drawCircles(packingParams.startCircles);

  fill(color(50, 50, 50, 50));
  stroke(255);
  drawCircles(circles);

  // noLoop();

  if (debugMode) {
    const mx = mouseX - width / 2;
    const my = mouseY - height / 2;
    //let d = -map(vec2(mx, my))

    // background(0)
    //debugSdf()
    qt.Draw();

    // Check collision
    const r = 20;
    const tx = 50;
    const ty = -50;
    const overlap = qt.GetOverlappingObjects(
      vec4(mx - r, my - r, mx + r, my + r)
    );
    // const overlap = qt.GetOverlappingObjects(vec4(tx - r, ty - r, tx + r, ty + r));

    stroke("red");
    fill(color(255, 255, 255, 150));
    drawCircles(overlap);

    fill(color(255, 255, 255, 50));
    stroke("red");
    circle(mx, my, 2 * r);
  }
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
