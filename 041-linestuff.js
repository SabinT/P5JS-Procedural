import { polar2cart, lerp, vec2, sub2d, normalize2d, add2d, scale2d, rot2d, dot2d, lerp2d, line2D }from "./lumic/common.js";

const w = 900;
const hw = w / 2;
const h = 960;
const hh = h / 2;

let col = "#cc9a54";
let bgCol = "#cecece";

function envelope(x) {
  return 1;
}

function drawWavyLines() {
  background(bgCol);
  
  let params = {
    nMinMax: [5, 10],
    ampMinMax: [400, 600],
    freqMinMax: [0.01, 0.02],
    noiseAmpMinMax: [200, 600],
    envelopeFunc: envelope,
  }

  let n = Math.floor(lerp(params.nMinMax[0], params.nMinMax[1], Math.random()));
  let segments = 1000;


  stroke("black");
  strokeWeight(2);

  let milliseconds = millis();

  for (let i = 0; i < n; i++) {
    let amp = lerp(params.ampMinMax[0], params.ampMinMax[1], Math.random());
    let freq = lerp(params.freqMinMax[0], params.freqMinMax[1], Math.random());
    let noiseAmp = lerp(params.noiseAmpMinMax[0], params.noiseAmpMinMax[1], Math.random())

    // Points along each line
    let pos, posPrev;
    for (let j = 0; j < segments; j++) {
      let t = j / (segments - 1);
      t = t * t;
      let x = lerp(0, w, t);

      let ampAdjusted = amp * (noise(x * 0.001) - 0.5);
      let y = hh + ampAdjusted * Math.sin(freq * x);

      y += (noise(x * 0.002) - 0.5) * noiseAmp;

      posPrev = pos;
      pos = vec2(x, y);

      if (j > 0) {
        line2D(posPrev, pos);
      }
    }
    
  }


}

window.setup = function () {
  createCanvas(900, 960);

  drawWavyLines();
  noLoop();
};

window.keyTyped = function () {
  if (key === "s") {
    save();
  }

  if (key === "r" || key === "R") {
    drawWavyLines();
  }
};
