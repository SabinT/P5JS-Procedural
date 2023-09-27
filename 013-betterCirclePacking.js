import {
  dist2d,
  getRandom,
  line2D,
  sizes,
  TAU,
  vec2,
} from "./lumic/common.js";
import { cyberpunkTheme, getRandomColor } from "./lumic/palettes.js";
import { sdCircle, sdHeart } from "./lumic/sdf.js";

const debugMode = false;

function map(p) {
  const scale = width * 0.45;

  // p = p5.Vector.mult(p, -1 / scale)
  // p = p5.Vector.add(p, vec2(0, 0.6))
  // return sdHeart(p) * scale

  const d = sdCircle(p, 50);

  return d;
}

function debugSdf() {
  const interval = 10;
  noFill();
  for (let x = -width / 2; x < width / 2; x += interval) {
    for (let y = -height / 2; y < height / 2; y += interval) {
      let d = map(vec2(x, y));
      const c = abs(d * 100);
      fill(color(c, c, c, 50));
      if (d > 0) {
        circle(x, y, interval / 2);
      }
    }
  }
}

function packCircles(params) {
  let circles = [];

  let i = 0;
  while (i < params.maxIterations) {
    let p = vec2(random(-0.5, 0.5) * width, random(-0.5, 0.5) * height);

    let dMultiplier = params?.invert ? -1 : 1;

    let maxD = dMultiplier * params.sdf(p);
    const margin = params.sdfMarginFunc(maxD);

    if (maxD > margin && maxD < params.sdfThreshold) {
      // Track closest circle
      let closestCircle;
      let dClosest = Infinity;

      for (const circ of params.startCircles) {
        let dMultiplier = circ?.invert ? -1 : 1;
        const d =
          dMultiplier * (dist2d(p, circ.center) - circ.radius) - margin;

        if (d > 0 && d < dClosest) {
          dClosest = d;
          closestCircle = circ;
        }

        maxD = min(d, maxD);

        if (maxD < 0) {
          break;
        }
      }

      // Intersect with the existing circles
      for (const circ of circles) {
        let dMultiplier = circ?.invert ? -1 : 1;
        const d =
          dMultiplier * (dist2d(p, circ.center) - circ.radius) - margin;

        if (d > 0 && d < dClosest) {
          dClosest = d;
          closestCircle = circ;
        }

        maxD = min(d, maxD);

        if (maxD < 0) {
          break;
        }
      }

      if (maxD > params.minRadius && maxD < params.maxRadius) {
        circles.push({
          center: p,
          radius: maxD,
          closestCircle: closestCircle,
        });
      }
    }

    i++;
  }

  return circles;
}

function pack() {
  const packingParams = {
    // startCircles: [{ center: vec2(0, 0), radius: 0.4 * height, invert: true }],
    startCircles: [],
    minRadius: 2,
    maxRadius: 20,
    maxCircles: 5000,
    maxIterations: 50000,
    sdf: map,
    sdfThreshold: 1000,
    // sdfMarginFunc: (d) => d * 0.05,
    sdfMarginFunc: (d) => (sin((TAU * (d + 50)) / 150) + 1) * 10,
    pageMargin: 10,
  };

  const circles = packCircles(packingParams);

  console.log("circles: " + circles.length);

  noFill();
  stroke(255, 0, 0);
  drawCircles(packingParams.startCircles);

  fill(color(50, 50, 50, 50));
  stroke(255);
  drawCircles(circles);
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
  createCanvas(sizes.letter.w, sizes.letter.h, SVG);
  background(10);
  translate(width / 2, height / 2);
  pack();
};

window.draw = function () {
  if (debugMode) {
    // background(0)
    translate(width / 2, height / 2);

    //debugSdf()

    const mx = mouseX - width / 2;
    const my = mouseY - height / 2;
    let d = -map(vec2(mx, my));

    fill("white");
    text(`"D: ${d}M: ${mx},${my}"`, mx, my);
    noFill();
    stroke("red");
    circle(mx, my, 2 * d);
  }
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
