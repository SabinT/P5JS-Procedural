import { add2d, getRandom, lerp, lerp2d, line2D, normalize2d, polar2cart, rot2d, scale2d, sizes, vec2 } from "./lumic/common.js";
import { smoothstep } from "./lumic/easing.js";
import { renderGrid } from "./lumic/grids.js";
import { cCircle } from "./lumic/mandala.js";
import { radiatingDendrites, fernlikeStellarDendrites } from "./lumic/snowflake.js";

function render() {
  clear();

  const patterns = [fernlikeStellarDendrites, radiatingDendrites];
  
  const bgGroup = {
    numParticles: 1000,
    scaleMinMax: [.05, .25],
    colMinMax: [5, 50],
  }

  for (let i = 0; i < bgGroup.numParticles; i++) {
    let s = lerp(bgGroup.scaleMinMax[0], bgGroup.scaleMinMax[1], Math.random());
    let col = lerp(bgGroup.colMinMax[0], bgGroup.colMinMax[1], Math.random());
    
    push();

    // random position
    translate(random(width), random() * random() * height);
    scale(s);

    // draw random pattern
    let pattern = getRandom(patterns);
    pattern(col);

    circle(0,0,10)

    pop();
  }

}

window.setup = function () {
  createCanvas(2160, 2160);
  render();
};

window.draw = function () {};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }

  if (key === "r" || key === "R") {
    render();
  }
};

