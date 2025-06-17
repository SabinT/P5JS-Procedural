import { centerCanvas } from "./lumic/p5Extensions.js";

let pMapper;
let quadMap;
let font;

const w = 1080;
const h = 1080;
const fontSize = 20;
const gridX = 32;
const gridY = 32;
let cellW = w / gridX;
let cellH = h / gridY;

let g;

let debug = true;

const randomSyllables = 
["क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ", "ट", "ठ", "ड", "ढ", "ण", "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म", "य", "र", "ल", "व", "श", "ष", "स", "ह", "क्ष", "त्र", "ज्ञ"];

const phrases = [
  ["म:", "म:", " ", "च", "ट्", "नी", " ", "ट", "मा", "ट", "र", " ",].reverse(),
  ["प्या", "ज", " ", "अ", "दु", "वा", " ", "ल", "सु", "न", " ", "जी", "रा", " ", "ध", "नि", "या"].reverse(), 
  [" ", "ब", "न्द", "गो", "बी", " ", "ह", "रि", "यो", " ", "प्या", "ज", " ", "टि", "मु", "र", " ", "खु", "र", "सा", "नी"].reverse()
];

const palette = ["#F2C9E4", "#AC80BF", "#5080BF", "#8FAFD9", "#FFFFFF", "#91E0F2"];

function randColor() {
  return palette[floor(random(palette.length))];
}

class Droplet {
  constructor(phrase, x, y, len, speed) {
    this.phrase = phrase;
    this.x = x;
    this.y = y;
    this.len = len;
    this.speed = speed;
    this.repeatCount = 0;
    this.color = randColor();
  }

  moveAndRenderTo(pg) {
    this.y += this.speed * deltaTime;
    if (this.y > gridY) {
      this.y -= gridY;
      this.repeatCount++;
      this.color = randColor();
    }

    const xx = floor(this.x);
    const yy = floor(this.y);
    const iRand = floor(millis() / 100);

    for (let i = 0; i < this.len; i++) {
      let t = map(1 - i / this.len, 0, 1, 0.75, 1);
      let iSyl, c;

      if (i !== this.len - 1) {
        iSyl = noise(iRand * 100 + i) * randomSyllables.length;
        c = randomSyllables[floor(iSyl) % randomSyllables.length];
      } else {
        iSyl = (yy + this.repeatCount * 3) % this.phrase.length;
        c = this.phrase[iSyl];
      }

      if (c === " ") {
        t *= 0.4;
        c = randomSyllables[floor(iSyl) % randomSyllables.length];
      }

      let cx = (xx + gridX) % gridX;
      let cy = (yy - i + gridY) % gridY;

      const { px, py } = gridToPixel(cx, cy);

      // draw the “cell” background
      pg.fill(0);
      pg.rectMode(CENTER);
      pg.rect(px, py, cellW, cellH);

      // tint the syllable
      let col = pg.color(this.color);
      col.setRed(pg.red(col) * t);
      col.setGreen(pg.green(col) * t);
      col.setBlue(pg.blue(col) * t);
      pg.fill(col);

      // draw the text centered in that cell
      pg.textSize(fontSize - 10 + t * 10);
      pg.textAlign(CENTER, CENTER);
      pg.text(c, px, py);

      // Debug text cx, cy
      // pg.text(cx + "," + cy, px, py)
      
    }
  }
}

function gridToPixel(x, y) {
  return {
    px: x * cellW + cellW * 0.5,
    py: y * cellH + cellH * 0.5
  };
}

let droplets = [];

window.setup = function () {
  const canvas = createCanvas(w, h);

  // font = loadFont("assets/AnonymousPro-Regular.ttf");

  createCanvas(windowWidth, windowHeight, WEBGL);
  background(0);
  pixelDensity(1);
  textSize(40);

  recalcGrid();

  // projection mapping setup
  pMapper = createProjectionMapper(this);
  quadMap = pMapper.createQuadMap(w, h);
  pMapper.load("maps/044-map.json");


  const lenMin = 1;
  const lenMax = 4;
  const speedMin = 0.001;
  const speedMax = 0.02;
  const nDroplets = 20;

  const filledXes = new Set();
  for (let i = 0; i < nDroplets; i++) {
    const phrase = random(phrases);
    const x = floor(random(gridX));
    const y = floor(random(gridY));
    const len = floor(random(lenMin, lenMax));
    const speed = random(speedMin, speedMax);
    droplets.push(new Droplet(phrase, x, y, len, speed));
    filledXes.add(x);
  }

  for (let x = 0; x < gridX; x++) {
    if (!filledXes.has(x)) {
      const phrase = random(phrases);
      const y = floor(random(gridY));
      const len = floor(random(2, 3));
      const speed = random(0.005, speedMax * 0.1);
      droplets.push(new Droplet(phrase, x, y, len, speed));
    }
  }
};

window.draw = function () {
  background(0);

  quadMap.displaySketch(pg => {
    pg.clear();
    pg.push();
    // pg.textFont(font);
    pg.textAlign(CENTER, CENTER);
    pg.background(0, 0, 0, 10);
    for (let droplet of droplets) {
      droplet.moveAndRenderTo(pg);
    }
    pg.pop();
  });

  fill(255);
};


// window.keyTyped = function () {
//   if (key === "s") {
//     save();
//   }
// };

window.keyPressed = function () {
  switch (key) {
    case 'c': toggleCalibration(); break;
    case 's': saveCalibration(); break;
    case 'l': loadCalibration(); break;
    case 'f': fullscreen(!fullscreen()); break;
  }
};


function toggleCalibration() {
  if (pMapper) {
    pMapper.toggleCalibration();
  }
}

function saveCalibration() {
  if (pMapper) {
    pMapper.save("map.json");
  }
}

function loadCalibration() {
  if (pMapper) {
    pMapper.load("maps/map.json");
  }
}

function recalcGrid() {
  cellW = w  / gridX;
  cellH = h / gridY;
}

function windowResized() {
  // 1) resize the main canvas
  resizeCanvas(windowWidth, windowHeight, WEBGL);
  recalcGrid();

  // 2) resize the quadMap’s offscreen graphics
  //    that you draw your cells/text into
  if (quadMap.pg) {
    quadMap.pg.resizeCanvas(width, height);
  } else {
    // fallback: rebuild the map
    quadMap = pMapper.createQuadMap(width, height);
    pMapper.load("maps/map.json");
  }
}