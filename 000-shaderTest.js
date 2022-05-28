import * as common from './lumic/common.js'
import * as debug from './lumic/debugutils.js'
import { mothCircles } from './data/mothcircles.js'

const w = 2000
const h = 2000

const screenW = 800
const screenH = 800

// the 'varying's are shared between both vertex & fragment shaders
let varying = 'precision highp float; varying vec2 vPos;'

// the vertex shader is called for each vertex
let vs =
  varying +
  `
  attribute vec3 aPosition;
  void main() { vPos = (gl_Position = vec4(aPosition,1.0)).xy; }
  `

let xMax = Number.NEGATIVE_INFINITY
let xMin = Number.POSITIVE_INFINITY
let yMax = Number.NEGATIVE_INFINITY
let yMin = Number.POSITIVE_INFINITY
let rMax = Number.NEGATIVE_INFINITY
let rMin = Number.POSITIVE_INFINITY

mothCircles.circles.forEach((c) => {
  if (c.x > xMax) {
    xMax = c.x
  }
  if (c.x < xMin) {
    xMin = c.x
  }

  if (c.y > yMax) {
    yMax = c.y
  }
  if (c.y < yMin) {
    yMin = c.y
  }

  if (c.r > rMax) {
    rMax = c.r
  }
  if (c.r < rMin) {
    rMin = c.r
  }
});

console.log(`x minmax: ${xMin}, ${xMax}`);
console.log(`y minmax: ${yMin}, ${yMax}`);
console.log(`r minmax: ${rMin}, ${rMax}`);

let circlesShaderPart = ''
const maxCircles = 200;
const zoomOut = 1000;
const rAdjustment = 0.02;

for (let i = 0; i < maxCircles; i++) {
  const c = mothCircles.circles[i];
  const x = c.x / zoomOut;
  const y =  - c.y / zoomOut;
  const r = c.r / zoomOut - rAdjustment;

  if (i == 0) {
    circlesShaderPart += `float d = M(p,V(${x.toFixed(2)},${y.toFixed(2)}), ${r.toFixed(2)});`
  } else {
    circlesShaderPart += `d = C(d,M(p,V(${x.toFixed(2)},${y.toFixed(2)}), ${r.toFixed(2)}));`
  }
}

console.log(circlesShaderPart)

// the fragment shader is called for each pixel
let fs =
  varying +
  `
  #define V vec2
  float C( float d1, float d2 ) { return min(d1,d2); }

  float sdArc(vec2 p, vec2 sc, float ra, float rb )
  {
      p.x = abs(p.x);
      return ((sc.y*p.x>sc.x*p.y) ? length(p-sc*ra) : 
                                    abs(length(p)-ra)) - rb;
  }

  float M(vec2 p, vec2 center, float radius) {
    vec2 sc = vec2(0.0,-1.0);
    return sdArc(p - center, sc, radius, 0.008);
  }

  void main() {
    vec2 p = vPos;

    ${circlesShaderPart}

    vec3 col = vec3(1.0) - sign(d)*vec3(0.1,0.4,0.7);
    col *= 1.0 - exp(-2.0*abs(d));
    col *= 0.8 + 0.2*cos(128.0*abs(d));
    col = mix( col, vec3(1.0), 1.0-smoothstep(0.0,0.015,abs(d)) );

    gl_FragColor =  vec4(col, 1.0);
  }
  `;

let testShader;

window.setup = function () {
  createCanvas(screenW, screenH, WEBGL)

  testShader = createShader(vs, fs)
  shader(testShader)

  background(255)
  quad(-1, -1, 1, -1, 1, 1, -1, 1)
}

window.draw = function () {}
