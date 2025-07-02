import { getRandom, sqRand } from "./lumic/common.js";
import { smoothstep } from "./lumic/easing.js";
import { centerCanvas } from "./lumic/p5Extensions.js";
import { cloverTheme, cyberpunkTheme, getRandomColor, greenTheme } from "./lumic/palettes.js";

const w = 1080;
const hw = w / 2;
const h = 1080;
const hh = h / 2;

let g;
let font;
// Top is semi-circle, integer multiple width of "tailRadius"
// Tail is a number of circular trails, each with a radius of "tailRadius"
// The circles closest to the head are larger, and the circles get smaller as they go down the tail.
class Jellyfish {
  constructor(x, y, tailRadius, nTails, nCirclesPerTail, speed, color) {
    this.x = x;
    this.y = y;
    this.headRadius = tailRadius * nTails;
    this.tailRadius = tailRadius;
    this.nTails = nTails;
    this.nCirclesPerTail = nCirclesPerTail;
    this.speed = speed;
    this.color = color;
    this.id = floor(random(1000000));
  }

  update() {
    this.y -= this.speed;
    if (this.y + this.tailRadius * this.nCirclesPerTail < 0) {
      this.y = h + this.tailRadius;
    }
  }

  draw() {
    fill(this.color);
    noStroke();
    const headMult = 1.25;
    arc(this.x, this.y, this.headRadius * 2 * headMult, this.headRadius * 2 * headMult, PI, 0);

    // triangle(
    //   this.x - this.headRadius, this.y,
    //   this.x + this.headRadius, this.y,
    //   this.x, this.y - this.headRadius
    // );

    const quantizeRatio = 3;
    const quantizeStep = this.tailRadius * quantizeRatio;
    const quantizedY = Math.floor(this.y / quantizeStep) * quantizeStep;
    const fracY = (this.y - quantizedY) / quantizeStep;

    // fill("blue");
    // textAlign(CENTER, CENTER);
    // text(`${nf(fracY, 1, 2)}`, this.x, quantizedY);

    // The tail is drawn as a trail in a screen space grid below the head
    for (let i = 0; i < this.nTails; i++) {
      // Tail x should span across the width of the head, centered
      const tailX = this.x + (i - this.nTails / 2) * this.tailRadius * 2 + this.tailRadius;

      
      // Tail y is quantized to a grid on the screen
      const tailY = quantizedY + quantizeStep;
      const tailLengthRandomizer = 1 + sqRand(i, this.id * 13) * .5;
      const maxYDiff = this.tailRadius * this.nCirclesPerTail * tailLengthRandomizer;

      for (let j = 0; j < this.nCirclesPerTail; j++) {
        const elemY = tailY + j * quantizeStep;
        
        // t = 1 to 0
        let t = 1 - (elemY - this.y) / maxYDiff;

        // Ease in from 0 to 1 / nCirclesPerTail
        const easet = smoothstep(1, 1 - 1 / this.nCirclesPerTail, t);
        t = t * easet;

        t = constrain(t, 0, 1);

        const elemRadius = this.tailRadius * t * 0.75;

        // fill(t * 255); // Fade out the circles
        noStroke();
        // Squares
        rectMode(CENTER);
        rect(tailX, elemY, elemRadius * 2, elemRadius * 2);

        // Circles
        // ellipse(tailX, elemY, elemRadius * 2, elemRadius * 2);
        // fill("green");
        // const tStr = `${nf(t, 1, 2)}`;
        // text(`${tStr}`, tailX, elemY + 5);
      }
    }
  }
}

const jellyfishCount = 25;
let jellyfish = []

window.setup = function () {
  canvas = createCanvas(w, h);
  centerCanvas(canvas);
  font = loadFont("assets/fonts/elegant_typewriter/ELEGANT TYPEWRITER Regular.ttf");
  textFont(font);

  // Create jellyfish instances
  let spawnX = 0;
  for (let i = 0; i < jellyfishCount; i++) {
    const multiplier = 1;
    const tailRadius = getRandom([10, 5, 15]) * multiplier;
    const numTails = (tailRadius > 7) ? floor(random(1, 3)) : floor(random(2, 4));

    const speed = 0.5 * random(8, 9) / tailRadius;

    spawnX += numTails * tailRadius * 2 + floor(random(1, 20)) * 15 * multiplier;
    if (spawnX > w) {
      spawnX -= w;
    }

    const color = getRandom(cyberpunkTheme.colors);

    const spawnY = random(0, h);
    const numCircles = floor(random(numTails * 4, numTails * 8))
    jellyfish.push(new Jellyfish(spawnX, spawnY, tailRadius, numTails, numCircles, speed, color));
  }

  // Sort by tail radius, smallest first
  jellyfish.sort((a, b) => a.tailRadius - b.tailRadius);
};

function render(g) {
    blendMode(BLEND);
    background(0);
    // additive blend
    // blendMode(ADD);

  
  for (let i = 0; i < jellyfish.length; i++) {
    const j = jellyfish[i];
    j.update();
    j.draw();

    // At the middle of the loop, draw text
    if (i === floor(jellyfish.length / 2)) {
      push();
      translate(hw, hh);
      scale(1.25);

      let textY = - 300;
      fill(255);
      textAlign(CENTER, CENTER);

      textSize(60);
      text(`Monthly`, 0, textY);
      textY += 100;

      textSize(80);
      text(`Art + Code`, 0, textY);
      textY += 200;

      textSize(40);
      text(`Procedural Art Meetup`, 0, textY);
      textY += 100;

      textSize(40);
      text(`Every 1st Wednesday`, 0, textY);
      textY += 50;
      text(`6 - 9 PM`, 0, textY);
      textY += 100;
      
      textSize(40);
      text(`Seattle Interactive Media Lab`, 0, textY);
      textY += 50;
      text(`3131 Western Ave #421`, 0, textY);

      pop();
    }
  }
}

window.draw = function () {
  render(g);
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
