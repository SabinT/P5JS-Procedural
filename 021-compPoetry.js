import * as m from "./lumic/mandala.js";
import { getPixelBrightness, getBrightness } from "./lumic/image.js";
import * as pal from "./lumic/palettes.js";
import { Polygon } from "./lumic/geomerty.js";
import { getRandom, RAD2DEG, TAU, vec2 } from "./lumic/common.js";
import { setShadow } from "./lumic/context.js";

let font;
window.preload = function () {
  font = loadFont("assets/fonts/Anonymous_Pro/AnonymousPro-Regular.ttf");
}

const w = 8000;
const hw = w / 2;
const h = 8000;
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
  const settings = { count: 12, shape: true, angleShift: 0 };

  const rStep = width / 40;
  const r1 = width / 40;

  m.drawRing(r1, r1 + rStep, m.diamondSegment, settings);
  m.drawRing(r1 + rStep, r1 + 2 * rStep, m.diamondSegment, settings);
  m.cCircle(r1 * 0.75);
  pop();
}

function sampleAndDraw(poem, stepSize, drawFn, maxCount) {
  let charIndex = 0;
  loadPixels();
  const step = width / stepSize;
  let lastMatchStep = 0;
  let stepCount = 0;
  let totalMatch = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (totalMatch >= maxCount) {
        break;
      }

      const c = getBrightness(x, y);
      if (c > 200) {
        let char = poem[charIndex];
        if (char == "." && lastMatchStep + 1 < stepCount) {
          charIndex =(charIndex + 1) % poem.length;
          char = poem[charIndex];
        }
        drawFn(poem[charIndex], x, y, true);
        charIndex = (charIndex + 1) % poem.length;
        lastMatchStep = stepCount;
        totalMatch++;
      }
      else {
        if (random() < 0.5) {
          drawFn(".", x, y, false);
        }
      }
      stepCount++;
    }
  }
  console.log("totalMatch", totalMatch);
}

window.setup = function () {
  createCanvas(w, h);
  g = createGraphics(w, h);
  g.background(200);
  pixelDensity(1);

  renderMandala1();
  let circler = (p, m1, m2, a1, a2) => {
    if (random() < p) {
      sampleAndDraw(poem, 50, (c, x, y) => {
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
  g.blendMode(MULTIPLY);
  for (let i = 0; i < 1000; i++) {
    const x = Math.pow(random(), 1.5) * w - hw;
    const y = random() * h - hh;
    const r = 0.5 * random(width * 0.05);
    const a = random(5, 10);
    const shape = new Polygon(vec2(x, y), r, Math.floor(random(5, 9)));

    let col = color(pal.cyberpunkTheme.colors[2]);
    col.setAlpha(a);
    g.noStroke();
    g.fill(col);
    shape.draw(g);
    g.stroke(col);
    g.noFill();
    shape.draw(g);
  }
  g.pop();

  g.blendMode(MULTIPLY);
  g.background(255,255,255, 180);


  // circler(1, 1, 2, 10, 20);
  // circler(1, 32, 5, 100);

  let lineCount = 10;
  // Horizontal alternating rectangles
  g.blendMode(ADD);
  g.drawingContext.save();
  setShadow(g, 2, -2, 10, "#142108");
  g.drawingContext.restore();
  // g.fill(color(255,255,255,5));
  for (let i = 0; i < lineCount; i++) {
    if (i % 2 === 0) {
      const x1 = random() * hw;
      const x2 = x1 + random() * width * 0.2;
      //g.rect(i * (w / lineCount), 0, w / lineCount, height);
      let col = color(getRandom(pal.cyberpunkTheme.colors));
      col.setAlpha(1);
      g.fill(col);
      g.rect(x1, 0, x2, height);
    }
  }

  g.blendMode(BLEND);

  let liner = (d, col) => {
    sampleAndDraw(poem, 50, (c, x, y) => {
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

  // g.blendMode(MULTIPLY);
  // sampleAndDraw(poem, 50, (c, x, y, match) => {
  //   // Draw a rectangle at x,y
  //   if (!match) {
  //     const col = color(240);
  //     g.stroke(col);
  //     const d = width / 75;
  //     g.rect(x, y, d,d);
  //   }
  // });

  g.blendMode(MULTIPLY);
  sampleAndDraw(poem, 50, (c, x, y, match) => {
    const angle = Math.atan2(x - hw, y - hh);
    let i = Math.floor(angle / TAU * 12 + 0.5);
    i = (i + 12) % 12;
    const col = match ? pal.getColor(pal.cyberpunkTheme, i) : color(0,0,0,0);
    g.stroke(col);
    g.fill(col);
    // g.noStroke();
    g.strokeWeight(1);
    g.textFont(font);
    g.textSize(width / 50);
    g.textAlign(CENTER, CENTER);
    g.text(c, x, y);
  },
  598);

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
