const w = 800;
const hw = w / 2;
const h = 800;
const hh = h / 2;

let g;
let gui;

let params = {
  SpiralScale: 1.0,
  SpiralParams: { alpha: 1.504, beta: Math.PI },
  EllipseRotation: { mu: 0.2, Omega: -0.147, Phi: 0.129 },
  EllipseRadii: { a: 0.46, b: 0.78 },
  BumpCount: 1,
  BumpRotation: 0.0,
  BumpHeight: 0.15,
  BumpWidthTransverse: 0.8,
  BumpWidthLongitudinal: 0.6
};

const divisionsS = 32;
const divisionsTheta = 32;
const PI = Math.PI;
const TWOPI = 2 * PI;
const thetaMax = 10 * PI; // spiral extent
const scaleFactor = 38; // visual scaling

function cot(x) { return 1 / Math.tan(x); }
function sqr(x) { return x * x; }

function getPosition(p, s, theta) {
  const A = p.SpiralScale;
  const alpha = p.SpiralParams.alpha;
  const beta = p.SpiralParams.beta;

  const a = p.EllipseRadii.a;
  const b = p.EllipseRadii.b;

  const mu = p.EllipseRotation.mu;
  const Omega = p.EllipseRotation.Omega;
  const Phi = p.EllipseRotation.Phi;

  const L = p.BumpHeight;
  const P = p.BumpRotation;
  const W1 = p.BumpWidthTransverse;
  const W2 = p.BumpWidthLongitudinal;
  const N = p.BumpCount;

  const expθcotα = Math.exp(theta * cot(alpha));
  const Lθ = TWOPI / N * (N * theta / TWOPI - Math.floor(N * theta / TWOPI));

  const h = Math.pow(sqr(Math.cos(s) / a) + sqr(Math.sin(s) / b), -0.5)
    + L * Math.exp(-sqr(2 * (s - P) / W1) - sqr(2 * Lθ / W2));

  const x = expθcotα * (A * Math.sin(beta) * Math.cos(theta) +
    h * (Math.cos(s + Phi) * Math.cos(Omega + theta) - Math.sin(s + Phi) * Math.sin(mu) * Math.sin(theta + Omega)));

  const y = expθcotα * (-A * Math.sin(beta) * Math.sin(theta) -
    h * (Math.cos(s + Phi) * Math.sin(Omega + theta) + Math.sin(s + Phi) * Math.sin(mu) * Math.cos(theta + Omega)));

  const z = expθcotα * (-A * Math.cos(beta) + h * Math.sin(s + Phi) * Math.cos(mu));
  return { x, y, z };
}

function render() {
  stroke(230);
  strokeWeight(1);
  noFill();
  // Removed translate(hw, hh) in WEBGL
  // Lines varying s, fixed theta
  for (let ti = 0; ti <= divisionsTheta; ti++) {
    const theta = thetaMax * ti / divisionsTheta;
    beginShape();
    for (let si = 0; si <= divisionsS; si++) {
      const s = TWOPI * si / divisionsS;
      const p = getPosition(params, s, theta);
      vertex(p.x * scaleFactor, p.y * scaleFactor, p.z * scaleFactor);
    }
    endShape();
  }
  // Lines varying theta, fixed s
  stroke(120, 180, 255);
  for (let si = 0; si < divisionsS; si++) {
    const s = TWOPI * si / divisionsS;
    beginShape();
    for (let ti = 0; ti <= divisionsTheta; ti++) {
      const theta = thetaMax * ti / divisionsTheta;
      const p = getPosition(params, s, theta);
      vertex(p.x * scaleFactor, p.y * scaleFactor, p.z * scaleFactor);
    }
    endShape();
  }
}

function createGui() {
  gui = new dat.GUI();
  gui.add(params, 'SpiralScale', 0.1, 5).step(0.01);

  const spiralFolder = gui.addFolder('SpiralParams');
  spiralFolder.add(params.SpiralParams, 'alpha', 0.01, 2).step(0.001);
  spiralFolder.add(params.SpiralParams, 'beta', 0, Math.PI).step(0.001);

  const ellipseRotFolder = gui.addFolder('EllipseRotation');
  ellipseRotFolder.add(params.EllipseRotation, 'mu', -Math.PI, Math.PI).step(0.001);
  ellipseRotFolder.add(params.EllipseRotation, 'Omega', -Math.PI, Math.PI).step(0.001);
  ellipseRotFolder.add(params.EllipseRotation, 'Phi', -Math.PI, Math.PI).step(0.001);

  const ellipseRadiiFolder = gui.addFolder('EllipseRadii');
  ellipseRadiiFolder.add(params.EllipseRadii, 'a', 0.1, 3).step(0.01);
  ellipseRadiiFolder.add(params.EllipseRadii, 'b', 0.1, 3).step(0.01);

  const bumpFolder = gui.addFolder('Bumps');
  bumpFolder.add(params, 'BumpCount', 1, 64).step(1);
  bumpFolder.add(params, 'BumpRotation', -Math.PI, Math.PI).step(0.001);
  bumpFolder.add(params, 'BumpHeight', 0, 1).step(0.001);
  bumpFolder.add(params, 'BumpWidthTransverse', 0.1, 3).step(0.01);
  bumpFolder.add(params, 'BumpWidthLongitudinal', 0.1, 3).step(0.01);

  const actions = {
    ApplyPreset: () => {
      params.SpiralScale = 1.0;
      params.SpiralParams.alpha = 1.504;
      params.SpiralParams.beta = Math.PI;
      params.EllipseRotation.mu = 0.2;
      params.EllipseRotation.Omega = -0.147;
      params.EllipseRotation.Phi = 0.129;
      params.EllipseRadii.a = 0.46;
      params.EllipseRadii.b = 0.78;
      params.BumpCount = 1;
      params.BumpRotation = 0.0;
      params.BumpHeight = 0.15;
      params.BumpWidthTransverse = 0.8;
      params.BumpWidthLongitudinal = 0.6;
    }
  };
  gui.add(actions, 'ApplyPreset').name('Apply Preset');
}

window.setup = function () {
  createCanvas(w, h, WEBGL);
  createGui();
};

window.draw = function () {
  background(10);
  orbitControl(); // added orbit controls
  render();
  // noLoop(); // removed to allow interaction
};

window.keyTyped = function () {
  if (key === "s") {
    save("shell-lines-3d.png");
  }
};
