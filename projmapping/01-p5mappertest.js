const w = 1920;
const hw = w / 2;
const h = 1080;
const hh = h / 2;

let g;

const mapFilename = "projmapping/01-map.json";

let pMapper;
let surfaces = [];

let leftSurf, rightSurf;

let o = {
  w1: 500,
  w2: 480,
  h1: 560,
  h2: 560
};

function render(g) {
  circle(0, 0, 100);
}

window.setup = function () {
  createCanvas(w, h, WEBGL);

  // initialize map surfaces
  pMapper = createProjectionMapper(this);

  pMapper.load(mapFilename);

  leftSurf = pMapper.createQuadMap(o.w1, o.h1);
  rightSurf = pMapper.createQuadMap(o.w2, o.h2);
  surfaces.push(leftSurf);
  surfaces.push(rightSurf);
};

window.draw = function () {
  background(0);

  let index = 0;
  // for (const surface of surfaces) {
  //   surface.displaySketch(drawStuff);
  // }

  leftSurf.displaySketch(drawLeft);
  rightSurf.displaySketch(drawRight);

  // noLoop();
};

function drawLeft(pg) {
  const hw = o.w1 / 2;
  const hh = o.h1 / 2;

  pg.clear();
  pg.push();
  pg.background(0);
  pg.fill(255);

  // pg.translate(pg.width/2, pg.height/2)
  
  // pg.circle(hw, hh,20)
  drawLines(pg, o.w2, o.h2, 1)



  pg.pop();
}

function drawRight(pg) {
  const hw = o.w2 / 2;
  const hh = o.h2 / 2;

  pg.clear();
  pg.push();
  pg.background(0);
  pg.fill(255);

  // pg.translate(pg.width/2, pg.height/2)
  
  drawLines(pg, o.w2, o.h2)


  pg.pop();
}

function drawLines(g, w, h, offset) {
  offset |= 0; // 1 = left
  const n = (sin(frameCount / 10000) + 1) * 30;
  // const n = 20;
  const timeScale = 0.05;

  const dy = h / n;

  console.log(dy)

  rectMode(CORNERS)

  // g.stroke(255);
  // g.fill("blue")

  

  for (let i = 0; i < n; i++) {
    const even = ((i + offset) % 2) == 0;
    g.fill(even ? 0 : 255);

    let y1 = i * dy;
    let y2 = y1 + dy;

    y1 += (noise(234234234234 + y1 + timeScale * frameCount / 30) -  0.5) * 100

    y2 += (noise(1000 + y2 + timeScale * frameCount / 30) -  0.5) * 100

    g.rect(0, y1, w, y2 - y1);
    // console.log(i * dy)
  }
}

window.keyTyped = function () {
  switch (key) {
    case "c":
      pMapper.toggleCalibration();
      break;
    case "f":
      let fs = fullscreen();
      fullscreen(!fs);
      break;
    case "l":
      pMapper.load(mapFilename);
      break;

    case "s":
      pMapper.save("01-map.json");
      break;
  }
};

window.windowResized = function () {
  resizeCanvas(windowWidth, windowHeight);
};
