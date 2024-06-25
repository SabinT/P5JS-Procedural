import { centerCanvas } from "./lumic/p5Extensions.js";

const w = 1080;
const hw = w / 2;
const h = 1920;
const hh = h / 2;

const gridX = 18;
const gridY = 32;
const cellW = w / gridX;
const cellH = h / gridY;

let g;

let debug = true;

// ka-kha-ga-gha-nga etc
const randomSyllables = 
["क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ", "ट", "ठ", "ड", "ढ", "ण", "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म", "य", "र", "ल", "व", "श", "ष", "स", "ह", "क्ष", "त्र", "ज्ञ"];

const phrases = [
  ["म:", "म:", " ", "च", "ट्", "नी", " ", "ट", "मा", "ट", "र", " ",].reverse(),
  [ "प्या", "ज", " ", "अ", "दु", "वा", " ", "ल", "सु", "न", " ", "जी", "रा", " ", "ध", "नि", "या"].reverse(), 
  [" ", "ब", "न्द", "गो", "बी", " ", "ह", "रि", "यो", " ", "प्या", "ज", " ", "टि", "मु", "र", " ", "खु", "र", "सा", "नी"].reverse()
]

let palette = [
  "#F2C9E4",
  "#AC80BF",
  "#5080BF",
  "#8FAFD9",
  "#FFFFFF",
  "#91E0F2"
]

function randColor() {
  const i = Math.floor(Math.random() * palette.length);
  return palette[i];
}

function wrapPos(x,y) {
  return [(x + gridX) % gridX, (y + gridY) % gridY];
}

class Droplet {
  constructor(phrase, x, y, len, speed) {
    this.phrase = phrase;
    this.x = x;
    this.y = y;
    this.len = len;
    this.speed = speed;
    this.repeatCount = 0;
    this.color = randColor()
  }

  moveAndRender() {
    this.y += this.speed * deltaTime;
    // this.x += 0.0005* deltaTime;

    if (this.y > gridY) {
      this.y -= gridY;
      this.repeatCount++;
      this.color = randColor();
    }

    const xx = floor(this.x);
    const yy = floor(this.y);

    if (debug) {
      // stroke(255);
    }


    const randIntervalMillis = 1000 * 0.1;
    const iRand = Math.floor(millis() / randIntervalMillis);

    // Draw from head to tail
    for (let i = 0; i < this.len; i++) {
      let t = 1 - i / this.len;
      t = map(t, 0, 1, 0.75, 1);
      
      let iSyl;
      let c;

      // random char for all except last
      if (i !== this.len - 1) {
        iSyl = noise(iRand * 100 + i) * randomSyllables.length;
        c = randomSyllables[floor(iSyl) % randomSyllables.length];
        // iSyl = (iSyl + iRand) % this.phrase.length;
      } else {
        iSyl = (yy + this.repeatCount * 3) % this.phrase.length;
        c = this.phrase[iSyl];
      }

      if (c === " ") {
        t *= 0.4; // make darker
        c = randomSyllables[floor(iSyl) % randomSyllables.length];
      }


      let [cx, cy] = wrapPos(xx, yy - i);
      cx += 0.5;
      cy += 0.5;

      fill(0);
      rectMode(CENTER);
      rect(cx * cellW, cy * cellH, cellW, cellH);

      let col = color(this.color);
      const r = col._getRed()
      const g = col._getGreen()
      const b = col._getBlue()

      col = color(r * t, g * t, b * t)


      // fill(175 * t, 255 * t, 80 * t);
      fill(col)
      push();
      translate(cx * cellW, cy * cellH);
      rotate(-PI / 2);
      // text(c, cx * cellW, cy * cellH);
      text(c, 0,0);
      pop();
    }
  }
}

function render(g) {
  background(0,0,0,6);

  for (let droplet of droplets) {
    droplet.moveAndRender();
  }
}

let droplets = [];
window.setup = function () {
  // createCanvas(w, h);
  // for landscape
  const canvas = createCanvas(h, w);
  centerCanvas(canvas);

  pixelDensity(1);
  background(0);

  const lenMin = 1;
  const lenMax = 6;
  const speedMin = 0.001;
  const speedMax = 0.02;
  const nDroplets = 20;

  const filledXes = new Set();
  for (let i = 0; i < nDroplets; i++) {
    // random phrase
    const phrase = phrases[floor(random(phrases.length))];

    const x = random(gridX);
    const y = random(gridY);
    const len = floor(random(lenMin, lenMax));
    const speed = random(speedMin, speedMax);
    droplets.push(new Droplet(phrase, x, y, len, speed));

    filledXes.add(floor(x));
  }

  // Create droplets for any missing x
  // Make it short and slow
  for (let x = 0; x < gridX - 1; x++) {
    if (!filledXes.has(x)) {
      const phrase = phrases[floor(random(phrases.length))];
      const y = random(gridY);
      const len = floor(random(lenMin + 1, lenMin + 2));
      const speed = random(0.005, speedMax * 0.1);
      droplets.push(new Droplet(phrase, x, y, len, speed));
    }
  }
};

window.draw = function () {
  // background(10);
  push();

  // For landscape
  translate(h, 0);
  rotate(Math.PI / 2);

  textSize(40);
  textAlign(CENTER, CENTER);
  render(g);

  pop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
