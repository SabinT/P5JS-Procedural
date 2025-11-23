import { SVGDrawing } from "./lumic/svg.js";

const w = 800;
const hw = w / 2;
const h = 800;
const hh = h / 2;

let g;
let gui;
let canvas; // added

let params = {
  SpiralScale: 1.0,
  SpiralParams: { alpha: 1.504, beta: Math.PI },
  EllipseRotation: { mu: 0.2, Omega: -0.147, Phi: 0.129 },
  EllipseRadii: { a: 0.46, b: 0.78 },
  BumpCount: 1,
  BumpRotation: 0.0,
  BumpHeight: 0.15,
  BumpWidthTransverse: 0.8,
  BumpWidthLongitudinal: 0.6,
  Grid: {
    divisionsS: 32,
    divisionsTheta: 32,
    showTheta: true,   // constant theta (vary s)
    showS: true,       // constant s (vary theta)
    colorTheta: "#e6e6e6",
    colorS: "#78b4ff"
  },
  View: {
    distance: 900,
    azimuth: 0.7,
    elevation: 0.5,
    fovDeg: 55,
    near: 0.1,
    far: 5000
  }
};

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
  const grid = params.Grid;
  strokeWeight(1);
  noFill();

  if (grid.showTheta) {
    stroke(grid.colorTheta);
    for (let ti = 0; ti <= grid.divisionsTheta; ti++) {
      const theta = thetaMax * ti / grid.divisionsTheta;
      beginShape();
      for (let si = 0; si <= grid.divisionsS; si++) {
        const s = TWOPI * si / grid.divisionsS;
        const p = getPosition(params, s, theta);
        vertex(p.x * scaleFactor, p.y * scaleFactor, p.z * scaleFactor);
      }
      endShape();
    }
  }

  if (grid.showS) {
    stroke(grid.colorS);
    for (let si = 0; si < grid.divisionsS; si++) {
      const s = TWOPI * si / grid.divisionsS;
      beginShape();
      for (let ti = 0; ti <= grid.divisionsTheta; ti++) {
        const theta = thetaMax * ti / grid.divisionsTheta;
        const p = getPosition(params, s, theta);
        vertex(p.x * scaleFactor, p.y * scaleFactor, p.z * scaleFactor);
      }
      endShape();
    }
  }
}

// ---- VIEW / CAMERA MATRIX HELPERS ----
const viewState = { viewMatrix: null, projectionMatrix: null };

function vec3(x,y,z){ return {x,y,z}; }
function sub3(a,b){ return vec3(a.x-b.x,a.y-b.y,a.z-b.z); }
function add3(a,b){ return vec3(a.x+b.x,a.y+b.y,a.z+b.z); }
function mul3(a,s){ return vec3(a.x*s,a.y*s,a.z*s); }
function dot3(a,b){ return a.x*b.x + a.y*b.y + a.z*b.z; }
function cross3(a,b){
  return vec3(
    a.y*b.z - a.z*b.y,
    a.z*b.x - a.x*b.z,
    a.x*b.y - a.y*b.x
  );
}
function norm3(v){
  const d = Math.hypot(v.x,v.y,v.z) || 1e-9;
  return vec3(v.x/d,v.y/d,v.z/d);
}

function mat4LookAt(eye, target, up) {
  const f = norm3(sub3(target, eye));      // forward (camera looks toward target)
  const r = norm3(cross3(f, up));          // right
  const u = cross3(r, f);                  // corrected up
  // Right-handed lookAt with forward pointing TO target => view forward is -f
  return [
    r.x,  u.x, -f.x, 0,
    r.y,  u.y, -f.y, 0,
    r.z,  u.z, -f.z, 0,
    -dot3(r, eye), -dot3(u, eye), dot3(f, eye), 1
  ];
}

function mat4Perspective(fovYRad, aspect, near, far) {
  const f = 1 / Math.tan(fovYRad / 2);
  return [
    f/aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far+near)/(near - far), -1,
    0, 0, (2*far*near)/(near - far), 0
  ];
}

function multMat4Vec4(m, v) {
  return [
    m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12]*v[3],
    m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13]*v[3],
    m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]*v[3],
    m[3]*v[0]+m[7]*v[1]+m[11]*v[2]+m[15]*v[3]
  ];
}

function updateViewMatrices() {
  const vp = params.View;
  const dist = vp.distance;
  const az = vp.azimuth;
  const el = vp.elevation;
  const eye = vec3(
    dist * Math.cos(el) * Math.cos(az),
    dist * Math.sin(el),
    dist * Math.cos(el) * Math.sin(az)
  );
  const target = vec3(0,0,0);
  const up = vec3(0,1,0);
  viewState.viewMatrix = mat4LookAt(eye, target, up);
  viewState.projectionMatrix = mat4Perspective(vp.fovDeg * PI/180, width/height, vp.near, vp.far);

  // Apply to p5 so rendered geometry matches export
  perspective(vp.fovDeg * PI/180, width/height, vp.near, vp.far);
  camera(eye.x, eye.y, eye.z, target.x, target.y, target.z, up.x, up.y, up.z);
}

function screenPt(x, y, z) {
  // world -> view
  const v = multMat4Vec4(viewState.viewMatrix, [x, y, z, 1]);
  // view -> clip
  const c = multMat4Vec4(viewState.projectionMatrix, v);
  const wClip = c[3] === 0 ? 1e-9 : c[3];
  const ndcX = c[0] / wClip;
  const ndcY = c[1] / wClip;
  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (ndcY * 0.5 + 0.5) * height // removed inversion
  };
}
// ---- END VIEW ----

// ---- SIMPLE INPUT FOR VIEW (drag rotate, wheel zoom) ----
let draggingView = false;
let lastMX = 0, lastMY = 0;
function attachViewInput() {
  if (!canvas || !canvas.elt) return;
  canvas.elt.addEventListener('mousedown', e => {
    if (e.button === 0) { draggingView = true; lastMX = e.clientX; lastMY = e.clientY; }
  });
  window.addEventListener('mouseup', () => { draggingView = false; });
  window.addEventListener('mousemove', e => {
    if (!draggingView) return;
    const dx = e.clientX - lastMX;
    const dy = e.clientY - lastMY;
    lastMX = e.clientX; lastMY = e.clientY;
    params.View.azimuth += dx * 0.005;
    params.View.elevation = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, params.View.elevation + dy * 0.005));
    markDirty();
  });
  canvas.elt.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) return;
    params.View.distance *= Math.pow(1.0015, e.deltaY);
    params.View.distance = Math.max(10, Math.min(8000, params.View.distance));
    markDirty();
  }, { passive: true });
}
// ---- END INPUT ----

const PARAMS_STORAGE_KEY = 'shellLinesParamsV1';
let paramsDirty = false;
let saveTimeout = null;

function markDirty() {
  paramsDirty = true;
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    if (paramsDirty) {
      saveParamsToStorage();
      paramsDirty = false;
    }
    saveTimeout = null;
  }, 300);
}

function applyStoredParams(stored, target) {
  if (!stored || typeof stored !== 'object') return;
  for (const k in stored) {
    if (!(k in target)) continue;
    const sv = stored[k];
    const tv = target[k];
    if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
      applyStoredParams(sv, tv);
    } else if (typeof sv !== 'function') {
      target[k] = sv;
    }
  }
}

function loadParamsFromStorage() {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(PARAMS_STORAGE_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw);
    applyStoredParams(stored, params);
  } catch (e) {
    console.warn('Failed to load stored params:', e);
  }
}

function saveParamsToStorage() {
  if (typeof localStorage === 'undefined') return;
  try {
    const serialized = JSON.stringify(params);
    localStorage.setItem(PARAMS_STORAGE_KEY, serialized);
  } catch (e) {
    console.warn('Failed to save params:', e);
  }
}

function createGui() {
  gui = new dat.GUI();
  const controllers = [];
  controllers.push(gui.add(params, 'SpiralScale', 0.1, 5).step(0.01));

  const spiralFolder = gui.addFolder('SpiralParams');
  controllers.push(spiralFolder.add(params.SpiralParams, 'alpha', 0.01, 2).step(0.001));
  controllers.push(spiralFolder.add(params.SpiralParams, 'beta', 0, Math.PI).step(0.001));

  const ellipseRotFolder = gui.addFolder('EllipseRotation');
  controllers.push(ellipseRotFolder.add(params.EllipseRotation, 'mu', -Math.PI, Math.PI).step(0.001));
  controllers.push(ellipseRotFolder.add(params.EllipseRotation, 'Omega', -Math.PI, Math.PI).step(0.001));
  controllers.push(ellipseRotFolder.add(params.EllipseRotation, 'Phi', -Math.PI, Math.PI).step(0.001));

  const ellipseRadiiFolder = gui.addFolder('EllipseRadii');
  controllers.push(ellipseRadiiFolder.add(params.EllipseRadii, 'a', 0.1, 3).step(0.01));
  controllers.push(ellipseRadiiFolder.add(params.EllipseRadii, 'b', 0.1, 3).step(0.01));

  const bumpFolder = gui.addFolder('Bumps');
  controllers.push(bumpFolder.add(params, 'BumpCount', 1, 64).step(1));
  controllers.push(bumpFolder.add(params, 'BumpRotation', -Math.PI, Math.PI).step(0.001));
  controllers.push(bumpFolder.add(params, 'BumpHeight', 0, 1).step(0.001));
  controllers.push(bumpFolder.add(params, 'BumpWidthTransverse', 0.1, 3).step(0.01));
  controllers.push(bumpFolder.add(params, 'BumpWidthLongitudinal', 0.1, 3).step(0.01));

  const gridFolder = gui.addFolder('Grid');
  controllers.push(gridFolder.add(params.Grid, 'divisionsS', 2, 256).step(1).name('Divisions S'));
  controllers.push(gridFolder.add(params.Grid, 'divisionsTheta', 2, 256).step(1).name('Divisions Theta'));
  controllers.push(gridFolder.add(params.Grid, 'showTheta').name('Show Theta Lines'));
  controllers.push(gridFolder.add(params.Grid, 'showS').name('Show S Lines'));
  controllers.push(gridFolder.addColor(params.Grid, 'colorTheta').name('Theta Color'));
  controllers.push(gridFolder.addColor(params.Grid, 'colorS').name('S Color'));

  const viewFolder = gui.addFolder('View');
  controllers.push(viewFolder.add(params.View, 'distance', 50, 4000).step(1).name('Distance'));
  controllers.push(viewFolder.add(params.View, 'azimuth', -Math.PI, Math.PI).step(0.001).name('Azimuth'));
  controllers.push(viewFolder.add(params.View, 'elevation', -Math.PI/2+0.01, Math.PI/2-0.01).step(0.001).name('Elevation'));
  controllers.push(viewFolder.add(params.View, 'fovDeg', 20, 120).step(1).name('FOV (deg)'));
  controllers.push(viewFolder.add(params.View, 'near', 0.01, 10).step(0.01).name('Near'));
  controllers.push(viewFolder.add(params.View, 'far', 100, 20000).step(10).name('Far'));
  viewFolder.add({ ResetView: () => {
    Object.assign(params.View, { distance: 900, azimuth: 0.7, elevation: 0.5, fovDeg: 55, near:0.1, far:5000 });
    markDirty();
  }}, 'ResetView').name('Reset View');

  const actions = {
    Defaults: () => {
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
      markDirty();
    },
    Export: () => exportAll(),
    Import: () => importFileInput && importFileInput.click()
  };
  gui.add(actions, 'Defaults');
  gui.add(actions, 'Export');
  gui.add(actions, 'Import');

  controllers.forEach(c => c.onChange(markDirty));
}

// Liang-Barsky segment clip to rect (0,0)-(w,h)
function clipSegment(p0, p1) {
  const x0 = p0.x, y0 = p0.y, x1 = p1.x, y1 = p1.y;
  const dx = x1 - x0;
  const dy = y1 - y0;
  let p = [-dx, dx, -dy, dy];
  let q = [x0 - 0, w - x0, y0 - 0, h - y0];
  let u1 = 0, u2 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > u2) return null;
        if (t > u1) u1 = t;
      } else {
        if (t < u1) return null;
        if (t < u2) u2 = t;
      }
    }
  }
  return [
    { x: x0 + u1 * dx, y: y0 + u1 * dy },
    { x: x0 + u2 * dx, y: y0 + u2 * dy }
  ];
}
function clipPolyline(points) {
  const paths = [];
  let current = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const clipped = clipSegment(a, b);
    if (clipped) {
      const [c0, c1] = clipped;
      if (!current.length) current.push(c0);
      // Avoid duplicate consecutive points
      if (current.length === 0 || (current[current.length - 1].x !== c0.x || current[current.length - 1].y !== c0.y)) {
        current.push(c0);
      }
      current.push(c1);
    } else {
      if (current.length > 1) paths.push(current);
      current = [];
    }
  }
  if (current.length > 1) paths.push(current);
  return paths;
}
function collectShellLines() {
  const grid = params.Grid;
  const thetaPaths = [];
  const sPaths = [];
  if (grid.showTheta) {
    for (let ti = 0; ti <= grid.divisionsTheta; ti++) {
      const theta = thetaMax * ti / grid.divisionsTheta;
      const linePts = [];
      for (let si = 0; si <= grid.divisionsS; si++) {
        const s = TWOPI * si / grid.divisionsS;
        const p = getPosition(params, s, theta);
        const sp = screenPt(p.x * scaleFactor, p.y * scaleFactor, p.z * scaleFactor);
        linePts.push(sp);
      }
      clipPolyline(linePts).forEach(seg => thetaPaths.push(seg));
    }
  }
  if (grid.showS) {
    for (let si = 0; si < grid.divisionsS; si++) {
      const s = TWOPI * si / grid.divisionsS;
      const linePts = [];
      for (let ti = 0; ti <= grid.divisionsTheta; ti++) {
        const theta = thetaMax * ti / grid.divisionsTheta;
        const p = getPosition(params, s, theta);
        const sp = screenPt(p.x * scaleFactor, p.y * scaleFactor, p.z * scaleFactor);
        linePts.push(sp);
      }
      clipPolyline(linePts).forEach(seg => sPaths.push(seg));
    }
  }
  return { thetaPaths, sPaths };
}

window.setup = function () {
  loadParamsFromStorage();
  canvas = createCanvas(w, h, WEBGL);
  createGui();
  setupImportInput();
  attachViewInput();
  window.addEventListener('beforeunload', saveParamsToStorage);
};

window.draw = function () {
  background(10);
  updateViewMatrices(); // apply custom view (replaces orbitControl)
  render();
  // noLoop(); // removed to allow interaction
};

function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportAll() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `shell-lines-${ts}`;
  // SVGs
  const { thetaPaths, sPaths } = collectShellLines();
  const svgTheta = new SVGDrawing(w, h);
  thetaPaths.forEach(path => svgTheta.addPath(path));
  svgTheta.save(`${base}-theta.svg`);
  const svgS = new SVGDrawing(w, h);
  sPaths.forEach(path => svgS.addPath(path));
  svgS.save(`${base}-s.svg`);
  // PNG
  saveCanvas(base, 'png');
  // JSON (params)
  const json = {
    SpiralScale: params.SpiralScale,
    SpiralParams: params.SpiralParams,
    EllipseRotation: params.EllipseRotation,
    EllipseRadii: params.EllipseRadii,
    BumpCount: params.BumpCount,
    BumpRotation: params.BumpRotation,
    BumpHeight: params.BumpHeight,
    BumpWidthTransverse: params.BumpWidthTransverse,
    BumpWidthLongitudinal: params.BumpWidthLongitudinal,
    Grid: params.Grid,
    View: params.View
  };
  downloadJSON(`${base}.json`, json);
}

function importParams(obj) {
  if (!obj || typeof obj !== 'object') return;
  applyStoredParams(obj, params);
  markDirty();
}

let importFileInput;
function setupImportInput() {
  importFileInput = document.createElement('input');
  importFileInput.type = 'file';
  importFileInput.accept = '.json,application/json';
  importFileInput.style.display = 'none';
  importFileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        importParams(data);
      } catch (err) {
        console.warn('Import failed:', err);
      }
    };
    reader.readAsText(file);
    importFileInput.value = '';
  });
  document.body.appendChild(importFileInput);
}

window.keyTyped = function () {
  if (key === "s") {
    exportAll();
  } else if (key === "p") {
    save("shell-lines-3d.png");
  }
};
