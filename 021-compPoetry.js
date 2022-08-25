import * as m from "./lumic/mandala.js";
import { getPixelBrightness, getBrightness } from "./lumic/image.js"

const w = 1600;
const hw = w / 2;
const h = 1600;
const hh = h / 2;

let g;

const poem = "the.world.is.a.beautiful.place.to.be.lost.in.";

function renderMandala() {
  background(10);

  push();
  translate(hw, hh);
  scale(4);
  fill("white");
  stroke("white");
  const settings = { count: 8, shape: true };

  const rStep = width / 40;
  const r1 = width / 40;

  m.drawRing(r1, r1 + rStep, m.diamondSegment, settings);
  m.drawRing(r1 + rStep, r1 + 2 * rStep, m.diamondSegment, settings);
  pop();
}

function textify() {    
    let charIndex = 0;
    loadPixels();
    const step = width / 100;
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const c = getBrightness(x, y);
            if (c > 200) {
                g.fill("white");
                g.textSize(width/100);
                g.text(poem[charIndex], x, y);
                charIndex = (charIndex + 1) % poem.length;
            }
        }
    }
}

window.setup = function () {
  createCanvas(w, h);
  g = createGraphics(w, h);
  g.background(0);
  pixelDensity(1);

  renderMandala();
  textify();
  noLoop();

  image(g, 0, 0);
};

window.draw = function () {};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
