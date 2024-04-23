import {
  getDistOddr,
  hexToCartesianOddr,
  Polygon,
  vec2,
  PI,
  rotateAround,
} from "./ar-common.js"
import { sqRand } from "./ar-rand.js"
import { easeInOutQuad } from "./ar-easing.js"
import {
  getAnimCompleteCount,
  getAnimProgress,
  isAnimActive,
  setMillis,
  startAnim,
  stepAnimate,
} from "./ar-anim.js"

import { config } from "./ar-config.js"

const VERTEX_SHADER = `
varying vec3 vLocalPosition;
varying vec2 vUv;
varying float vTurns;

// time (aframe builtin, ms)
uniform float time;

attribute vec2 pivot;
attribute float turns;

#define PI 3.14159265359

mat2 rotate2d(float a){
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

void main() {
    vUv = uv;
    vLocalPosition = position;
    
    // Rotate around pivot
    vec2 p = position.xy - pivot;
    p = rotate2d(turns * PI / 3.0) * p;
    p += pivot;

    vLocalPosition.xy = p;

    vTurns = turns;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(vLocalPosition, 1.0);
}
`

const FRAGMENT_SHADER = `
uniform float xMin, xMax, yMin, yMax;
uniform sampler2D tex;
uniform float grayToAlpha;

varying vec3 vLocalPosition;
varying vec2 vUv;
varying float vTurns;

void main() {
    if (vLocalPosition.x < xMin || vLocalPosition.x > xMax || vLocalPosition.y < yMin || vLocalPosition.y > yMax) {
        discard;
    } else {
        vec4 texColor = texture2D(tex, vUv);

        // Different color when turns has a fractional value close to 0.5
        float fracTurns = abs(fract(vTurns) - 0.5) * 2.0;
        float cWidth = 0.5;
        float dcol = 1.0 - smoothstep(0.5 - cWidth, 0.5 + cWidth, fracTurns);
        float gray = (texColor.r + texColor.g + texColor.b) / 3.0;
        dcol *= gray;

        texColor.rgb = mix(texColor.rgb, vec3(0.34, 0.97, 1), dcol);

        texColor.a = mix(texColor.a, gray, grayToAlpha);

        gl_FragColor = texColor;
    }
}
`

AFRAME.registerComponent("size-inches", {
  schema: {
    width: { type: "number", default: 36 },
    height: { type: "number", default: 48 },
    grayToAlpha: { type: "boolean", default: false },
  },

  init: function () {
    const widthScale = this.data.width * 0.0254 // Convert width from inches to meters
    const heightScale = this.data.height * 0.0254 // Convert height from inches to meters
    this.el.object3D.scale.set(widthScale, heightScale, 1)
  },
})

AFRAME.registerComponent("hexgrid", {
  schema: {
    id: { default: "" },
    xlim: { default: 3 },
    ylim: { default: 3 },
    widthInches: { default: 36 },
  },

  init: function () {
    const d = this.data
    const id = d.id || this.el.id

    const patternId = config[id].patternId
    const tex1 = document.getElementById(patternId).src

    const hexData = config[id].data
    const hexes = hexData.hexes

    // Scale this object so that the width is exactly 36 inches
    // 1 inch = 0.0254 meters
    // Assume object scale is in meters
    const pxWidth = hexData.w
    const scale = (d.widthInches * 0.0254) / pxWidth
    this.el.object3D.scale.set(scale, scale, scale)

    const w = hexData.w
    const h = hexData.h

    // console.log(w, h);

    this.shapes = hexes
      // .filter(function (hex) {
      //   const col = hex.c[0];
      //   const row = hex.c[1];
      //   return isAnimableTile(col, row);
      // })
      .map(function (hex) {
        const col = hex.c[0]
        const row = hex.c[1]
        return parseHexData(hex.c, hex.cax, hex.r, w, h)
      })

    this.attribInit = false
    this.initHexyMesh()

    console.log("Total hexes: " + this.shapes.length)

    // Create empty geometry, is modified every frame later
    var geometry = new THREE.BufferGeometry()

    // Initialize the material, it will be set when texture loads
    var material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        tex: { value: null },
        xMin: { value: -w / 2 },
        xMax: { value: w / 2 },
        yMin: { value: -h / 2 },
        yMax: { value: h / 2 },
        time: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })

    // Create the mesh and set it to the entity
    this.mesh = new THREE.Mesh(geometry, material)
    this.el.setObject3D("mesh", this.mesh)

    // Texture loader with callbacks
    var textureLoader = new THREE.TextureLoader()
    textureLoader.load(
      tex1,
      // onLoad callback
      function (texture) {
        // Apply the texture to the material
        // material.map = texture;
        material.uniforms.tex.value = texture
        material.uniforms.grayToAlpha = { value: 0.0 }
        material.needsUpdate = true
        // material.blending = THREE.AdditiveBlending;
        // material.blending = THREE.NORMALBLENDING;
        // material.transparent = true;
      },
      // onProgress callback currently not supported
      undefined,
      // onError callback
      function (err) {
        console.error("An error happened during texture loading.", err)
      }
    )

    // Start animating
    startAnim(9)
  },

  initHexyMesh: function () {
    // Initialize buffers with correct size
    // 7 verts/uvs per hex, 6 tris (18 indices) per hex
    this.vertices = new Float32Array(7 * this.shapes.length * 3)
    this.pivots = new Float32Array(7 * this.shapes.length * 2)
    this.uvs = new Float32Array(7 * this.shapes.length * 2)
    this.turns = new Float32Array(7 * this.shapes.length)

    this.indices = []

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i]
      const indexOffset = i * 7 // current vertex count

      // Push verts as separate numbers in a single array
      for (let j = 0; j < shape.verts.length; j++) {
        let v = shape.verts[j]
        const vOffset = (i * 7 + j) * 3
        this.vertices[vOffset] = v.x
        this.vertices[vOffset + 1] = v.y
        this.vertices[vOffset + 2] = 0

        const pivotOffset = (i * 7 + j) * 2
        this.pivots[pivotOffset] = shape.pivot.x
        this.pivots[pivotOffset + 1] = shape.pivot.y

        const uvOffset = (i * 7 + j) * 2
        this.uvs[uvOffset] = shape.uvs[j].x
        this.uvs[uvOffset + 1] = shape.uvs[j].y

        const turnOffset = i * 7 + j
        this.turns[turnOffset] = 0
      }

      for (let j = 0; j < shape.tris.length; j++) {
        this.indices[i * 18 + j] = shape.tris[j] + indexOffset
      }
    }
  },

  updateHexyMesh: function () {
    stepAnimate()

    const turnsAttrib = this.mesh.geometry.attributes.turns
    if (!turnsAttrib) {
      return
    }

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i]

      // const offset = vertices.length;
      const indexOffset = i * 7 // current vertex count

      // Animation
      let animCx, animCy
      let randN = getAnimCompleteCount(8)
      animCx = Math.round(sqRand(randN) * 3 - 1)
      animCy = Math.round(sqRand(randN + 1) * 2 - 1)

      const dist = getDistOddr(shape.cOddr, vec2(animCx, animCy))
      const animActive = isAnimActive(dist)
      const animProgress = getAnimProgress(dist)
      const animCompleteCount = getAnimCompleteCount(dist)
      let animTurns = animCompleteCount + easeInOutQuad(animProgress)

      if (
        !isAnimableTile(
          shape.cOddr.x,
          shape.cOddr.y,
          this.data.xlim,
          this.data.ylim
        )
      ) {
        animTurns = 0
      }

      const turnOffsetPerShape = i * 7
      // Push verts as separate numbers in a single array
      for (let j = 0; j < shape.verts.length; j++) {
        // let v = shape.verts[j];
        // v = rotateAround(v, shape.pivot, animTurns * PI / 3);
        // const vOffset = (i * 7 + j) * 3;
        // this.vertices[vOffset] = v.x;
        // this.vertices[vOffset + 1] = v.y;
        // this.vertices[vOffset + 2] = 0;

        // this.turns[turnOffsetPerShape + j] = animTurns;
        turnsAttrib.array[turnOffsetPerShape + j] = animTurns
      }

      turnsAttrib.needsUpdate = true
    }

    // TODO use a dirty flag to only update when needed
  },

  tick: function (time, timeDelta) {
    setMillis(time)

    // set time attribute

    this.updateHexyMesh()

    if (!this.attribInit) {
      this.mesh.geometry.setIndex(this.indices)
      this.mesh.geometry.setAttribute(
        "uv",
        new THREE.BufferAttribute(this.uvs, 2)
      )
      this.mesh.geometry.setAttribute(
        "pivot",
        new THREE.BufferAttribute(this.pivots, 2)
      )
      this.mesh.geometry.setAttribute(
        "turns",
        new THREE.BufferAttribute(this.turns, 1)
      )
      this.mesh.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(this.vertices, 3)
      )
      this.attribInit = true
    } else {
      const uniforms = this.mesh.material.uniforms
      uniforms.time.value = time
      uniforms.grayToAlpha.value = this.data.grayToAlpha ? 1.0 : 0.0

      // Update the attributes without creating new BufferAttributes
      // this.mesh.geometry.attributes.position.set(this.vertices);
      // this.mesh.geometry.attributes.position.needsUpdate = true;
      // this.mesh.geometry.attributes.uv.set(this.uvs);
      // this.mesh.geometry.attributes.uv.needsUpdate = true;
      // this.mesh.geometry.attributes.pivot.set(this.pivots);
      // this.mesh.geometry.attributes.pivot.needsUpdate = true;

      // this.mesh.geometry.attributes.turns.set(this.turns);
      // this.mesh.geometry.attributes.turns.needsUpdate = true;

      // Mark the attributes as needing an update
    }

    // Update the geometry to reflect the changes
    this.mesh.geometry.computeVertexNormals()
    this.mesh.geometry.computeBoundingBox()
    this.mesh.geometry.computeBoundingSphere()
  },
})

function isAnimableTile(col, row, xlim, ylim) {
  const isEvenRow = row % 2 === 0
  const xMin = isEvenRow ? -xlim : -xlim - 1
  const xMax = xlim
  const yMin = -ylim
  const yMax = ylim
  if (col < xMin || col > xMax || row < yMin || row > yMax) {
    return false
  } else {
    return true
  }
}

function parseHexData(centerOddrArr, centerAxArr, radius, texWidth, texHeight) {
  // Something that can be turned into a mesh with all necessary attributes
  const centerOddrVec = vec2(centerOddrArr[0], centerOddrArr[1])
  const centerAxVec = vec2(centerAxArr[0], centerAxArr[1])

  const shape = {
    cOddr: centerOddrVec,
    cAx: centerAxVec,
    verts: [],
    uvs: [],
    tris: [],
    pivot: vec2(0, 0), // cartesian
  }

  const centerCart = hexToCartesianOddr(centerOddrVec, radius)

  const poly = new Polygon(centerCart, radius, 6, Math.PI / 2) // pointy side up
  const pts = poly.getPoints()

  shape.pivot = centerCart

  shape.verts.push(...pts) // ring
  shape.verts.push(centerCart) // center
  const iCenter = pts.length

  // Normalize uvs, assume the texture is the full range from
  // -h/2 to h/2 and -w/2 to w/2
  const uvs = pts.map((p) => cartToUv(p, texWidth, texHeight))
  shape.uvs.push(...uvs)
  shape.uvs.push(cartToUv(centerCart, texWidth, texHeight))

  // Triangulate
  for (let i = 0; i < pts.length; i++) {
    const iNext = (i + 1) % pts.length

    // can't remember if this is CW or CCW, flip if needed
    shape.tris.push(i, iNext, iCenter)
  }

  return shape
}

function cartToUv(p, texWidth, texHeight) {
  return vec2(p.x / texWidth + 0.5, p.y / texHeight + 0.5)
}
