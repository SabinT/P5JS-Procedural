import * as m from "./lumic/mandala.js";
import { getPixelBrightness, getBrightness } from "./lumic/image.js";
import * as p from "./lumic/palettes.js";
import { Polygon } from "./lumic/geomerty.js";
import { vec2 } from "./lumic/common.js";
import { setShadow } from "./lumic/context.js";

const w = 1600;
const hw = w / 2;
const h = 1600;
const hh = h / 2;

let g;

const poem = "the.world.is.a.beautiful.place.to.be.lost.in.";

function renderMandala1() {
  background(0);

  push();
  translate(hw, hh);
  scale(5);
  fill("white");
  stroke("white");
  const settings = { count: 8, shape: true };

  const rStep = width / 40;
  const r1 = width / 40;

  m.drawRing(r1, r1 + rStep, m.diamondSegment, settings);
  m.drawRing(r1 + rStep, r1 + 2 * rStep, m.diamondSegment, settings);
  pop();
}

function renderMandala2() {
  push();
  translate(hw, hh);
  scale(5);
  noFill();
  stroke("black");
  const settings = { count: 8, angleShift: 0.5, inset: 0.1 };

  const rStep = width / 40;
  const r1 = width / 40;

  // m.drawRing(0, r1 + rStep * 0.5, m.leafSegment, {...settings, inset: undefined});
  stroke(p.cyberpunkTheme.colors[0]);
  m.drawRing(r1 + rStep * 0.5, r1 + rStep * 1.5, m.diamondSegment, settings);
  stroke(p.cyberpunkTheme.colors[1]);
  m.drawRing(r1 + rStep * 1.5, r1 + rStep * 2.5, m.diamondSegment, settings);
  pop();
}

function textify(g, poem, stepSize, drawFn) {
  let charIndex = 0;
  loadPixels();
  const step = width / stepSize;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const c = getBrightness(x, y);
      if (c > 200) {
        drawFn(poem[charIndex], x, y);
        charIndex = (charIndex + 1) % poem.length;
      }
    }
  }
}

window.setup = function () {
  createCanvas(w, h);
  g = createGraphics(w, h);
  g.background(200);
  pixelDensity(1);

  renderMandala1();
  let circler = (p, m1, m2, a1, a2) => {
    if (random() < p) {
      textify(g, poem, 50, (c, x, y) => {
        if (random() > 0.75) {
          g.noStroke();
          let b = 255;
          let col = color(b, b, b, random(a1, a2));
          g.fill(col);
          // g.strokeWeight(1);
          const m = Math.floor(sqrt(random(m1, m2)));
          const d = width * 0.25 * m;
          // g.circle(x, y, width * 0.025 * m);
          new Polygon(vec2(x, y), d * 0.5, Math.floor(random(3, 5))).draw(g);
        }
      });
    }
  };

  // Draw 1000 random transparent circles, darker towards the edge and lighter towards the center
  g.push();
  g.translate(hw, hh);
  g.scale(1, 20);
  for (let i = 0; i < 5000; i++) {
    const x = Math.pow(random(), 1.5) * w - hw;
    const y = random() * h - hh;
    const r = 0.5 * random(width * 0.1);
    const a = random(20, 30);
    g.noStroke();
    g.fill(255, 255, 255, a);
    new Polygon(vec2(x, y), r, Math.floor(random(5, 9))).draw(g);
  }
  g.pop();

  // circler(1, 1, 2, 10, 20);
  // circler(1, 32, 5, 100);

  let lineCount = 20;
  // Horizontal alternating rectangles
  g.blendMode(ADD);
  g.drawingContext.save();
  setShadow(g, 2, -2, 10, "#142108");
  g.drawingContext.restore();
  g.fill(color(255,255,255,5));
  for (let i = 0; i < lineCount; i++) {
    if (i % 2 === 0) {
      const x1 = random() * hw;
      const x2 = x1 + random() * width * 0.1;
      //g.rect(i * (w / lineCount), 0, w / lineCount, height);
      g.rect(x1, 0, x2, height);
    }
  }

  g.blendMode(BLEND);

  let liner = (d, col) => {
    textify(g, poem, 50, (c, x, y) => {
      g.noFill();
      g.stroke(col);
      g.strokeWeight(1);

      // long 45 degree line through x,y
      g.line(x - d, y - d, x + d, y + d);
      g.line(x + d, y - d, x - d, y + d);
    });
  };

  //   liner(width / 10, 250);
  //   liner(width / 20, 251);
  //   liner(width / 30, 252);

  textify(g, poem, 50, (c, x, y) => {
    const col = p.getRandomColor(p.cyberpunkTheme);
    g.stroke(col);
    g.fill(col);
    g.strokeWeight(1);
    g.textSize(width / 70);
    g.textAlign(CENTER, CENTER);
    g.text(c, x, y);
  });

  image(g, 0, 0);

  strokeWeight(0.25);
  // renderMandala2();

  noLoop();
};

window.draw = function () {};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
