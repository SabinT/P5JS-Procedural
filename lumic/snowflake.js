
import { add2d, getRandom, lerp, lerp2d, line2D, normalize2d, polar2cart, rot2d, scale2d, sizes, vec2 } from "./common.js";
import { smoothstep } from "./easing.js";
import { cCircle } from "./mandala.js";


export function fernlikeStellarDendrites(col = 255) {
  const params = {
    spineLengthMinMax: [90, 120],
    dendriteThicknessMinMax: [2, 6],
    dendriteCountMinMax: [5, 7],
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

  stroke(col);

  // 6-fold symmetry
  for (let i = 0; i < 6; i++) {
    let spineEnd = polar2cart(vec2(spineLength, i * Math.PI / 3));
    let forward = normalize2d(spineEnd);

    // Draw spine
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

      strokeWeight(dendriteThickness);
      line2D(p, leftEnd);
      line2D(p, rightEnd);
      
      fill(col);
      circle(p.x, p.y, dendriteThickness * 1.25);
    }
  }

  if (col === 255) {
    // hole at the center
    fill("black");
    noStroke();
    cCircle(dendriteThickness * 2)
  }
}

export function radiatingDendrites(col = 255) {
  const params = {
    radiateCountMinMax: [4, 15],
    angleDivergenceMinMax: [0.1, 0.5],
    spineLengthMinMax: [75, 150],
    dendriteThicknessMinMax: [2, 4],
    dendriteCountMinMax: [5, 8],
    dendriteLengthMinMax: [10, 50],
    modulationCenterRange: [0.3, 0.6]
  };

  const origin = vec2(0, 0);

  const modulationCenter = lerp(params.modulationCenterRange[0], params.modulationCenterRange[1], Math.random());

  let radiateCount = Math.floor(lerp(params.radiateCountMinMax[0], params.radiateCountMinMax[1], Math.random()));
  let angleDivergence = lerp(params.angleDivergenceMinMax[0], params.angleDivergenceMinMax[1], Math.random());
  let spineLength = lerp(params.spineLengthMinMax[0], params.spineLengthMinMax[1], Math.random());
  let maxDendriteLength = lerp(params.dendriteLengthMinMax[0], params.dendriteLengthMinMax[1], Math.random());
  let dendriteThickness = lerp(params.dendriteThicknessMinMax[0], params.dendriteThicknessMinMax[1], Math.random());
  let dendriteCount = Math.floor(lerp(params.dendriteCountMinMax[0], params.dendriteCountMinMax[1], Math.random()));
  console.log(spineLength, maxDendriteLength, dendriteThickness, dendriteCount);

  stroke(col);

  // 6-fold symmetry
  for (let i = 0; i < radiateCount; i++) {
    let angle = i * Math.PI * 2 / radiateCount;
    angle += (Math.random() - 0.5) * angleDivergence * Math.PI * 2;
    let spineEnd = polar2cart(vec2(spineLength, angle));
    let forward = normalize2d(spineEnd);

    // Draw spine
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

      strokeWeight(dendriteThickness);
      line2D(p, leftEnd);
      line2D(p, rightEnd);
      
      fill(col);
      circle(p.x, p.y, dendriteThickness * 2);
    }
  }

  if (col === 255) {
    // hole at the center
    fill("black");
    noStroke();
    cCircle(dendriteThickness * 2)
  }
}