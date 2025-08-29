import { getRandom, sqRand } from "./lumic/common.js";
import { smoothstep } from "./lumic/easing.js";
import { centerCanvas } from "./lumic/p5Extensions.js";
import { cyberpunkTheme } from "./lumic/palettes.js";

const w = 1080;
const hw = w / 2;
const h = 1080;
const hh = h / 2;

let font;
let jellyfish = [];
let textElements = [];

class Jellyfish {
  constructor(x, y, tailRadius, nTails, nCirclesPerTail, speed, color)
  {
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

  update()
  {
    this.y -= this.speed;
    if (this.y + this.tailRadius * this.nCirclesPerTail < 0)
    {
      this.y = h + this.tailRadius;
    }
  }

  draw()
  {
    fill(this.color);
    noStroke();
    const headMult = 1.25;
    arc(
      this.x,
      this.y,
      this.headRadius * 2 * headMult,
      this.headRadius * 2 * headMult,
      PI,
      0
    );

    const quantizeRatio = 3;
    const quantizeStep = this.tailRadius * quantizeRatio;
    const quantizedY = Math.floor(this.y / quantizeStep) * quantizeStep;

    for (let i = 0; i < this.nTails; i++)
    {
      const tailX =
        this.x +
        (i - this.nTails / 2) * this.tailRadius * 2 +
        this.tailRadius;
      const tailY = quantizedY + quantizeStep;
      const tailLengthRandomizer = 1 + sqRand(i, this.id * 13) * 0.5;
      const maxYDiff =
        this.tailRadius * this.nCirclesPerTail * tailLengthRandomizer;

      for (let j = 0; j < this.nCirclesPerTail; j++)
      {
        const elemY = tailY + j * quantizeStep;
        let t = 1 - (elemY - this.y) / maxYDiff;
        const easet = smoothstep(1, 1 - 1 / this.nCirclesPerTail, t);
        t = t * easet;
        t = constrain(t, 0, 1);
        const elemRadius = this.tailRadius * t * 0.75;

        noStroke();
        rectMode(CENTER);
        rect(tailX, elemY, elemRadius * 2, elemRadius * 2);
      }
    }
  }
}

window.setup = function()
{
  const canvas = createCanvas(w, h);
  centerCanvas(canvas);
  font = loadFont(
    "../assets/fonts/elegant_typewriter/ELEGANT TYPEWRITER Regular.ttf"
  );
  textFont(font);

  pixelDensity(1);

  let spawnX = 0;
  const jellyfishCount = 25;
  for (let i = 0; i < jellyfishCount; i++)
  {
    const multiplier = 1;
    const tailRadius = getRandom([10, 5, 15]) * multiplier;
    const numTails =
      tailRadius > 7
        ? floor(random(1, 3))
        : floor(random(2, 4));
    const speed = 0.5 * random(8, 9) / tailRadius;

    spawnX += numTails * tailRadius * 2 + floor(random(1, 20)) * 15 * multiplier;
    if (spawnX > w)
    {
      spawnX -= w;
    }

    const color = getRandom(cyberpunkTheme.colors);
    const spawnY = random(0, h);
    const numCircles = floor(random(numTails * 4, numTails * 8));
    jellyfish.push(
      new Jellyfish(
        spawnX,
        spawnY,
        tailRadius,
        numTails,
        numCircles,
        speed,
        color
      )
    );
  }

  jellyfish.sort((a, b) => a.tailRadius - b.tailRadius);

  const lines = [
    { txt: "Monthly", size: 60, y: -300 },
    { txt: "Art + Code", size: 80, y: -200 },
    { txt: "Procedural Art Meetup", size: 40, y:    0 },
    { txt: "Every 1st Wednesday", size: 40, y: 100 },
    { txt: "6 - 9 PM", size: 40, y: 150 },
    { txt: "Seattle Interactive Media Lab", size: 40, y: 250 },
    { txt: "3131 Western Ave #421", size: 40, y: 300 },
  ];

  textElements = lines.map((ln, i) => ({
    ...ln,
    layer: floor((i + 1) * jellyfishCount / (lines.length + 1))
  }));
};

function render()
{
  blendMode(BLEND);
  background(0);

  for (let i = 0; i < jellyfish.length; i++)
  {
    const j = jellyfish[i];
    j.update();
    j.draw();

    textElements.forEach(t =>
    {
      if (i === t.layer)
      {
        push();
        translate(hw, hh);
        scale(1.25);
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(t.size);
        text(t.txt, 0, t.y);
        pop();
      }
    });
  }
}

window.draw = function()
{
  render();
};

window.keyTyped = function()
{
  if (key === "s")
  {
    save();
  }
};
