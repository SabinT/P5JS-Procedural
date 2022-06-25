import { distance2, getRandom, sizes, vec2 } from './lumic/common.js'
import { cyberpunkTheme, getRandomColor } from './lumic/palettes.js'
import { sdHeart } from './lumic/sdf.js'

let circles = []
const maxIterations = 100000
const MAX_RADIUS = 10
const MIN_RADIUS = 2
const SDF_THRESHOLD = 1000
const MARGIN_BY_SDF = 0.1
const debugMode = false

function map(p) {
  const scale = 400
  //p = p5.Vector.add(p, vec2(-width/2, -height/2));
  p = p5.Vector.mult(p, -1 / scale)
  p = p5.Vector.add(p, vec2(0, 0.6))
  return sdHeart(p) * scale
}

packingParams = {
  maxRadius: 10,
  minRadius: 2,
  maxCircles: 500,
  maxIterations: 100000,
  sdf: map,
  sdfThreshold: 1000,
  sdfMarginByDistance: 0.1
}

function debugSdf() {
  const interval = 10
  noFill()
  for (let x = -width / 2; x < width / 2; x += interval) {
    for (let y = -height / 2; y < height / 2; y += interval) {
      let d = map(vec2(x, y))
      fill(abs(d * 100))
      if (d > 0) {
        circle(x, y, interval / 2)
      }
    }
  }
}

function packCircles(startCircles) {
  let outCircles = []

}

function pack() {
  noStroke()

  // circles.push({ center: vec2(0, 0), radius: 100 })

  let i = 0
  while (i < maxIterations) {
    let p = vec2(random(-0.5, 0.5) * width, random(-0.5, 0.5) * height)

    let maxD = map(p)
    const margin = maxD * MARGIN_BY_SDF

    if (maxD > margin && maxD < SDF_THRESHOLD) {
      // Intersect withe existing circles
      for (const circ of circles) {
        const d = distance2(p, circ.center) - circ.radius - margin
        maxD = min(d, maxD)
      }

      if (maxD > MIN_RADIUS && maxD < MAX_RADIUS) {
        circles.push({ center: p, radius: maxD })
      }
    }

    i++
  }

  console.log('circles: ' + circles.length)

  drawCircles()
}

function drawCircles() {
  fill(color(50, 50, 50, 50))
  stroke(255)
  circles.forEach((c) => {
    fill(getRandomColor(cyberpunkTheme))
    circle(c.center.x, c.center.y, 2 * c.radius)
  })
}

window.setup = function () {
  createCanvas(sizes.letter.w, sizes.letter.h, SVG)
  background(10)
  translate(width / 2, height / 2)
  pack()
}

window.draw = function () {
  if (debugMode) {
    background(0)
    translate(width / 2, height / 2)

    debugSdf()

    fill(color(50, 50, 50, 50))
    stroke(255)
    circles.forEach((c) => {
      circle(c.center.x, c.center.y, 2 * c.radius)
    })

    const mx = mouseX - width / 2
    const my = mouseY - height / 2
    let d = -map(vec2(mx, my))

    fill('white')
    text(`"D: ${d}M: ${mx},${my}"`, mx, my)
    noFill()
    stroke('red')
    circle(mx, my, 2 * d)
  }
}

window.keyTyped = function () {
  if (key === 's') {
    save()
  }
}
