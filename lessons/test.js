// For circles
let xList = [];
let yList = [];
let sizeList = [];
let count = 10;

let colors = ["red", "pink", "orange", "yellow", "green", "blue", "purple"]

window.setup = function () {
  createCanvas(800, 800);
  angleMode(DEGREES);

  // Random circles
  for (let i = 0; i < count; i++) {
    xList.push(random(width));
    yList.push(random(height));
    sizeList.push(random(10, 100));
  }
};

window.draw = function () {
  background(0);

  // Draw red circle if mouse is over it, otherwise draw white circle
  for (let i = 0; i < count; i++) {
    let x = xList[i];
    let y = yList[i];
    let size = sizeList[i];

    if (dist(mouseX, mouseY, x, y) < size / 2) {
      fill(255, 0, 0);
    } else {

      let colIndex = floor(random(0, colors.length))
      fill(colors[colIndex])
    }

    circle(x, y, size)
  }
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
