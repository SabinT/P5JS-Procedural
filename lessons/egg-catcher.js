const w = 800;
const hw = w / 2;
const h = 800;
const hh = h / 2;

let eggX = 0;
let eggY = 0;

let mouthX = hw;
let mouthY = h - 50;

let score = 0;
let lives = 3;

function drawEgg(x, y) {
  push();
  translate(x, y);
  fill("white");
  stroke("red");
  ellipse(0, 0, 40, 50);
  pop();
}

function drawMouth(x,y) {
  rectMode(CENTER);
  push();
  translate(x, y);
  
  stroke(255);
  strokeWeight(2);
  fill("yellow");
  
  // Draw a pacman mouth facing upwards
  arc(0, 0, 100, 100, -90 + 45, -90 - 45);

  pop();
}

window.setup = function () {
  createCanvas(w, h);

  eggX = random(50, w - 50);
  eggY = 0;

  angleMode(DEGREES);
};

// Reset the egg to a random position at the top of the screen
function resetEgg() {
  eggX = random(50, w - 50);
  eggY = 0;
}

// Check if the egg is caught by the basket
function checkEggCaught() {
  // Check if egg is within the basket
  if (eggX > mouthX - 50 && eggX < mouthX + 50 && eggY > mouthY - 25 && eggY < mouthY + 25) {
    // Egg caught
    score++;
    resetEgg();
  }
}

window.draw = function () {
  background(color(10, 10, 10, 100));

  // Move egg
  eggY += 5;

  // Move basket with left/right arrow keys
  if (keyIsDown(LEFT_ARROW)) {
    mouthX -= 5;
  }
  if (keyIsDown(RIGHT_ARROW)) {
    mouthX += 5;
  }

  // Check if egg is caught
  checkEggCaught();

  // If egg goes below screen, reset it
  if (eggY > h) {
    resetEgg();
    lives--;
  }

  if (lives === 0) {
    // Game over
    fill(255);
    textSize(32);
    text("Game Over", width/2, height/2);
    noLoop();   
  }

  drawEgg(eggX, eggY);

  // Draw basket
  drawMouth(mouthX, mouthY);

  // Draw score
  fill(255);
  textSize(32);
  text("Score: " + score, 10, 30);
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
