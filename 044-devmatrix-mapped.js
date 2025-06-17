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
  constructor(phrase, x, y, speed) {
    this.phrase       = phrase;
    this.x            = x;
    this.y            = y;
    this.speed        = speed;
    this.tail         = [];           // locked letters
    this.phraseIndex  = 0;            // next letter to pull from phrase
    this.lastHeadRow  = floor(this.y);
    this.maxLen       = gridY;        // you can tune this if you want shorter
    this.color = randColor()
  }

  moveAndRenderTo(pg) {
    // 1) advance in grid‐space
    this.y += this.speed * deltaTime;
    if (this.y >= gridY) {
      this.y -= gridY;
    }
    const xx = floor(this.x);
    const yy = floor(this.y);

    // 2) on each new row entered, grow/shift the tail
    if (yy !== this.lastHeadRow) {
      // grab next letter from phrase
      let c = this.phrase[this.phraseIndex];
      this.phraseIndex = (this.phraseIndex - 1 + this.phrase.length) % this.phrase.length;
      // lock it in at front of tail
      this.tail.unshift(c);
      // cap tail length
      if (this.tail.length > this.maxLen) {
        this.tail.pop();
      }
      this.lastHeadRow = yy;
    }

    // 3) draw into pg
    const headColor = pg.color(this.color);
    for (let i = 0; i < this.tail.length; i++) {
      const c = this.tail[i];
      // compute grid cell for this segment
      const [gx, gy] = wrapPos(xx, yy - i);
      const { px, py } = gridToPixel(gx, gy);

      // head clears its cell (optional—if you want a black box under it)
      pg.fill(0);
      pg.rectMode(CENTER);
      pg.rect(px, py, cellW, cellH);

      // alpha ramp: 255→0 from head→tail end
      const alpha = this.tail.length > 1
        ? map(i, 0, this.tail.length - 1, 255, 0)
        : 255;

      let col = pg.color(this.color);
      col.setAlpha(alpha);
      pg.fill(col);

      pg.textAlign(CENTER, CENTER);
      pg.textSize(fontSize);
      pg.text(c, px, py);
    }
  }
}

function gridToPixel(x, y) {
  return {
    px: x * cellW + cellW * 0.5,
    py: y * cellH + cellH * 0.5
  };
}

function wrapPos(x,y) {
  return [(x + gridX) % gridX, (y + gridY) % gridY];
}

let droplets = [];

window.setup = function () {
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


  const lenMin = 4;
  const lenMax = 8;
  const speedMin = 0.001;
  const speedMax = 0.05;
  const nDroplets = 20;

  const filledXes = new Set();
  for (let i = 0; i < nDroplets; i++) {
    const phrase = random(phrases);
    const x = floor(random(gridX));
    const y = floor(random(gridY));
    const len = floor(random(lenMin, lenMax));
    const speed = random(speedMin, speedMax);
    droplets.push(new Droplet(phrase, x, y, speed));
    filledXes.add(x);
  }

  for (let x = 0; x < gridX; x++) {
    if (!filledXes.has(x)) {
      const phrase = random(phrases);
      const y = floor(random(gridY));
      const len = floor(random(2, 3));
      const speed = random(0.005, speedMax * 0.1);
      droplets.push(new Droplet(phrase, x, y, speed));
    }
  }
};

const FADE_ALPHA = 1;  // tweak between 0–255 for faster/slower fade

window.draw = function () {
  background(0);

  quadMap.displaySketch(pg => {
    pg.push();
    pg.noStroke();
    pg.fill(0, FADE_ALPHA);
    pg.rectMode(CORNER);
    pg.rect(0, 0, pg.width, pg.height);

    pg.textAlign(CENTER, CENTER);
    // pg.background(0, 0, 0, 10);
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
  cellW = w / gridX;
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