// import { Polygon } from "../../lumic/geomerty.js";
import { data as hexData } from "./data/hex_1701113068397.js";
import { getDistOddr, hexToCartesianOddr, Polygon, vec2, PI, rotateAround } from "./ar-common.js";
import { sqRand } from "./ar-rand.js";
import { easeInOutQuad } from "./ar-easing.js";
import { getAnimCompleteCount, getAnimProgress, isAnimActive, setMillis, startAnim, stepAnimate } from "./ar-anim.js";

const VERTEX_SHADER = `
varying vec3 vLocalPosition;
varying vec2 vUv;

void main() {
    vUv = uv;
    vLocalPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform float xMin, xMax, yMin, yMax;
uniform sampler2D texture;
varying vec3 vLocalPosition;
varying vec2 vUv;

void main() {
    if (vLocalPosition.x < xMin || vLocalPosition.x > xMax || vLocalPosition.y < yMin || vLocalPosition.y > yMax) {
        discard;
    } else {
        vec4 texColor = texture2D(texture, vUv);
        gl_FragColor = texColor;
    }
}
`;

AFRAME.registerComponent("hexgrid", {
  schema: {
    texture: { default: "" },
  },

  init: function () {
    const d = this.data;
    const tex1 = document.getElementById(d.src1).src;

    const hexes = hexData.hexes;
    const w = hexData.w;
    const h = hexData.h;

    console.log(w, h);

    this.shapes = hexes
      // .filter(function (hex) {
      //   const col = hex.c[0];
      //   const row = hex.c[1];
      //   return isAnimableTile(col, row);
      // })
      .map(function (hex) {
        const col = hex.c[0];
        const row = hex.c[1];
        return parseHexData(hex.c, hex.cax, hex.r, w, h);
      });

    console.log("Total hexes: " + this.shapes.length);

    // Initialize buffers with correct size
    // 7 verts/uvs per hex, 6 tris (18 indices) per hex
    this.vertices = new Float32Array(7 * this.shapes.length * 3);
    this.indices = [];
    this.uvs = new Float32Array(7 * this.shapes.length * 2);

    // Create empty geometry, is modified every frame later
    var geometry = new THREE.BufferGeometry();

    // Initialize the material, it will be set when texture loads
    var material = new THREE.RawShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
            texture: { value: null },
            xMin: { value: -w / 2 },
            xMax: { value: w / 2 },
            yMin: { value: -h / 2 },
            yMax: { value: h / 2 },
        }
    });

    // Create the mesh and set it to the entity
    this.mesh = new THREE.Mesh(geometry, material);
    this.el.setObject3D("mesh", this.mesh);

    // Texture loader with callbacks
    var textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      tex1,
      // onLoad callback
      function (texture) {
        // Apply the texture to the material
        // material.map = texture;
        material.uniforms.texture.value = texture;

        material.needsUpdate = true;
        material.blending = THREE.AdditiveBlending;
        material.transparent = true;
      },
      // onProgress callback currently not supported
      undefined,
      // onError callback
      function (err) {
        console.error("An error happened during texture loading.", err);
      }
    );

    // Start animating
    startAnim(9);
  },

  updateHexyMesh: function () {
    stepAnimate();

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];

      // const offset = vertices.length;
      const indexOffset = i * 7; // current vertex count

      // Animation
      let animCx, animCy;
      let randN = getAnimCompleteCount(8);
      animCx = Math.round(sqRand(randN) * 3 - 1);
      animCy = Math.round(sqRand(randN + 1) * 2 - 1);
  
      const dist = getDistOddr(shape.cOddr, vec2(animCx, animCy));
      const animActive = isAnimActive(dist);
      const animProgress = getAnimProgress(dist);
      const animCompleteCount = getAnimCompleteCount(dist);
      let animTurns = animCompleteCount + easeInOutQuad(animProgress);

      if (!isAnimableTile(shape.cOddr.x, shape.cOddr.y)) {
        animTurns = 0;
      }

      // Push verts as separate numbers in a single array
      for (let j = 0; j < shape.verts.length; j++) {
        let v = shape.verts[j];

        v = rotateAround(v, shape.pivot, animTurns * PI / 3);

        const vOffset = (i * 7 + j) * 3;
        this.vertices[vOffset] = v.x;
        this.vertices[vOffset + 1] = v.y;
        this.vertices[vOffset + 2] = 0;

        const uvOffset = (i * 7 + j) * 2;
        this.uvs[uvOffset] = shape.uvs[j].x;
        this.uvs[uvOffset + 1] = shape.uvs[j].y;
      }

      for (let j = 0; j < shape.tris.length; j++) {
        this.indices[i * 18 + j] = shape.tris[j] + indexOffset;
      }
    }
  },

  tick: function (time, timeDelta) {
    setMillis(time);

    this.updateHexyMesh();

    // Update the geometry
    this.mesh.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.vertices, 3)
    );

    this.mesh.geometry.setIndex(this.indices);
    this.mesh.geometry.setAttribute(
      "uv",
      new THREE.BufferAttribute(this.uvs, 2)
    );

    // Update the geometry to reflect the changes
    this.mesh.geometry.computeVertexNormals();
    this.mesh.geometry.computeBoundingBox();
    this.mesh.geometry.computeBoundingSphere();
  },
});

function isAnimableTile(col, row) {
  if (col < -2 || col > 2 || row < -6 || row > 7) {
    return false;
  } else {
    return true;
  }
}

function parseHexData(centerOddrArr, centerAxArr, radius, texWidth, texHeight) {
  // Something that can be turned into a mesh with all necessary attributes
  const centerOddrVec = vec2(centerOddrArr[0], centerOddrArr[1]);
  const centerAxVec = vec2(centerAxArr[0], centerAxArr[1]);

  const shape = {
    cOddr: centerOddrVec,
    cAx: centerAxVec,
    verts: [],
    uvs: [],
    tris: [],
    pivot: vec2(0, 0), // cartesian
  };

  const centerCart = hexToCartesianOddr(centerOddrVec, radius);

  const poly = new Polygon(centerCart, radius, 6, Math.PI / 2); // pointy side up
  const pts = poly.getPoints();

  shape.pivot = centerCart;

  shape.verts.push(...pts); // ring
  shape.verts.push(centerCart); // center
  const iCenter = pts.length;

  // Normalize uvs, assume the texture is the full range from
  // -h/2 to h/2 and -w/2 to w/2
  const uvs = pts.map((p) => cartToUv(p, texWidth, texHeight));
  shape.uvs.push(...uvs);
  shape.uvs.push(cartToUv(centerCart, texWidth, texHeight));

  // Triangulate
  for (let i = 0; i < pts.length; i++) {
    const iNext = (i + 1) % pts.length;

    // can't remember if this is CW or CCW, flip if needed
    shape.tris.push(i, iNext, iCenter);
  }

  return shape;
}

function cartToUv(p, texWidth, texHeight) {
  return vec2(p.x / texWidth + 0.5, p.y / texHeight + 0.5);
}
