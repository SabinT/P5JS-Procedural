import { add2d, lerp, lerp2d, line2D, normalize2d, polar2cart, rot2d, scale2d, sizes, vec2 } from "./lumic/common.js";
import { smoothstep } from "./lumic/easing.js";
import { renderGrid } from "./lumic/grids.js";
import { cCircle } from "./lumic/mandala.js";

const gridOptions = {
  rows: 8,
  cols: 8,
  margin: 10,
  debug: false,
  renderCell: null,
  scale: 1,
};

function renderCell(i, j, w, h, gridOptions) {
  fill("white");

  fernlikeStellarDendrites();
}

function render() {
  clear();
  renderGrid({
    rows: 8,
    cols: 8,
    debug: false,
    margin: 20,
    scale: 0.8,
    renderCell: renderCell,
  });
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

function fernlikeStellarDendrites() {
  const params = {
    spineLengthMinMax: [75, 150],
    dendriteThicknessMinMax: [2, 10],
    dendriteCountMinMax: [5, 10],
    dendriteLengthMinMax: [10, 100],
    modulationCenterRange: [0.3, 0.6]
  };

  const origin = vec2(0, 0);

  const modulationCenter = lerp(params.modulationCenterRange[0], params.modulationCenterRange[1], Math.random());

  let spineLength = lerp(params.spineLengthMinMax[0], params.spineLengthMinMax[1], Math.random());
  let maxDendriteLength = lerp(params.dendriteLengthMinMax[0], params.dendriteLengthMinMax[1], Math.random());
  let dendriteThickness = lerp(params.dendriteThicknessMinMax[0], params.dendriteThicknessMinMax[1], Math.random());
  let dendriteCount = Math.floor(lerp(params.dendriteCountMinMax[0], params.dendriteCountMinMax[1], Math.random()));
  console.log(spineLength, maxDendriteLength, dendriteThickness, dendriteCount);

  // 6-fold symmetry
  for (let i = 0; i < 6; i++) {
    let spineEnd = polar2cart(vec2(spineLength, i * Math.PI / 3));
    let forward = normalize2d(spineEnd);

    // Draw spine
    stroke(255);
    strokeWeight(params.dendriteThickness);
    noFill();
    line2D(origin, spineEnd);

    // Sample points along the spine
    for (let j = 0; j < dendriteCount; j++) {
      let t = j / dendriteCount;
      let p = lerp2d(origin, spineEnd, t);

      // Draw lines at 60 degrees to left and right
      let left = rot2d(forward, Math.PI / 3);
      let right = rot2d(forward, -Math.PI / 3);

      // vary length of dendrites
      let mStart = smoothstep(0, modulationCenter, t);
      let mEnd = smoothstep(1, modulationCenter, t);

      let denLen = (mStart * mEnd) * maxDendriteLength;


      let leftEnd = add2d(p, scale2d(left, denLen));
      let rightEnd = add2d(p, scale2d(right, denLen));

      stroke(255);
      strokeWeight(dendriteThickness);
      line2D(p, leftEnd);
      line2D(p, rightEnd);
      
      fill("white");
      circle(p.x, p.y, dendriteThickness * 2);
    }
  }

  // hole at the center
  fill("black");
  noStroke();
  cCircle(dendriteThickness * 2)
}