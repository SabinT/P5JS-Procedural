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
  // saaga ra sisno in devnagari, tokenized by syllable
  // ["सा", "ग", " ", "र", " ", "सि", "स्नो", " ",],
  // khaa-ae-ko be-sa
  // ["सा", "ग", " ", "र", " ", "सि", "स्नो", " ","खा", "ए", "को", " ", "बे", "स", " ","आ", "नन्", "दि", " ", "म", "न", "ले", " ",],
  // aa-nann-di ma-na-le
  // ["आ", "नन्", "दि", " ", "म", "न", "ले", " ",],
  // se-to akshyar bhai-si ba-raa-bar
  // सेतो अक्षर भैँसी बराबर , tokenized by syllable
  // ["से", "तो", " ", "अ", "क्ष", "र", " ", "भैँ", "सी", " ", "ब", "रा", "बर", " ",],
  ["ह", "रि", "यो ", "अ", "क्ष", "र", " ", "भैँ", "सी", " ", "ब", "रा", "बर", " ",],
]


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
  }

  moveAndRender() {
    this.y += this.speed * deltaTime;
    // this.x += 0.0005* deltaTime;

    if (this.y > gridY) {
      this.y -= gridY;
      this.repeatCount++;
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

      fill(175 * t, 255 * t, 80 * t);
      text(c, cx * cellW, cy * cellH);
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

  textSize(42);
  textAlign(CENTER, CENTER);
  render(g);

  pop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
