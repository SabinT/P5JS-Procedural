// Anim stuff
export const animSettings = {
  autoAnim: true,
  secsPerRing: 1,
  secsRingOffset: 0.2,
  randTurnMax: 3,
}

let animStartMillis = -1000000
let animNumRings = 0

let currentMillis = 0

export function setMillis(millis) {
  currentMillis = millis
}

export function animMillis() {
  // return frameCount * 1000 / 60;
  return currentMillis
}

export function animElapsed() {
  return (animMillis() - animStartMillis) / 1000
}

export function startAnim(numRings) {
  // Don't start new anim if enough time hasn't elapsed
  const fullAnimSecs =
    animSettings.secsPerRing * 1.5 + animSettings.secsRingOffset * numRings

  if (animElapsed() < fullAnimSecs) {
    return
  }

  animNumRings = numRings
  animStartMillis = animMillis()
}

const isAnimInProgress = {}
const animCompleteCount = {}

const animProgress = {}

function constrain(v, min, max) {
  return Math.min(Math.max(v, min), max)
}

/**
 * @returns {number} 0-1
 */
function stepAnimateRing(ring) {
  const millisPerRing = animSettings.secsPerRing * 1000
  const millisOffset = animSettings.secsRingOffset * 1000
  const adjStart = animStartMillis + millisOffset * ring
  const elapsed = animMillis() - adjStart
  const t = elapsed / millisPerRing

  // If in progress previous frame, and complete this frame,
  // increment the complete count
  if (isAnimInProgress[ring] && t >= 1) {
    animCompleteCount[ring] = animCompleteCount[ring] || 0
    animCompleteCount[ring]++
  }

  isAnimInProgress[ring] = t > 0 && t < 1

  if (isAnimInProgress[ring]) {
    animProgress[ring] = t
  } else {
    animProgress[ring] = 0
  }

  return constrain(t, 0, 1)
}

export function stepAnimate() {
  // console.log("numRings", animNumRings);

  if (animSettings.autoAnim) {
    startAnim(animNumRings)
  }

  for (let ring = 0; ring <= animNumRings; ring++) {
    stepAnimateRing(ring)
  }
}
export function getAnimCompleteCount(ring) {
  return animCompleteCount[ring] || 0
}

export function getAnimProgress(ring) {
  return animProgress[ring] || 0
}

export function isAnimActive(ring) {
  return isAnimInProgress[ring] || false
}
