const w = 800;
const hw = w / 2;
const h = 800;
const hh = h / 2;

let g;

function render(g) {
  circle(hw, hh, 600);
}

window.setup = function () {
  createCanvas(w, h);
};

window.draw = function () {
  background(10);
  render(g);
  noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }
};
