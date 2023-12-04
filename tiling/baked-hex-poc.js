// Recreating hexes with baked in centers etc (realtime-friendly)
// Minimizing dependencies for portability

// Read from json file
import { data } from "../data/hexlist.js";
import { PI, add2d, rot2d, sqRand, sub2d, vec2 } from "../lumic/common.js";
import { easeInOutQuad } from "../lumic/easing.js";
import { Polygon } from "../lumic/geomerty.js";
import { getDistOddr, hexToCartesianOddr } from "../lumic/hex.js";
import { getAnimCompleteCount, getAnimProgress, isAnimActive, startAnim, stepAnimate } from "./belred.js";


let shapes;
let hextex;

let g;

// window.setup = function () {
//     const hexes = data.hexes;
//     const w = data.w;
//     const h = data.h;
//     console.log(w, h);

//     const screenW = w;
//     const screenH = h;

//     g = createGraphics(w, h, WEBGL);
//     createCanvas(screenW, screenH);
  
//     g.background(255);
  
//     circle(w / 2, h / 2, 0.8 * min(w, h));
  
//     image(g, 0, 0, screenW, screenH);
//   };
  
//   window.draw = function () {
//     background(0);
//     image(g, 0, 0, screenW, screenH);
  
//     if (mouseIsPressed) {
//       // Draw a zoomed in view
//       debug.drawFullZoomSection(g, 200);
//     }
//   };

window.preload = function () {
    hextex = loadImage('../belred-ar-poc/hextex.png');
}

window.setup = function () {
    // Read from json file
    const hexes = data.hexes;
    const w = data.w;
    const h = data.h;

    console.log(w, h);

    createCanvas(w, h, WEBGL);

    shapes = hexes.map(hex => createHexShape(hex.c, hex.cax, hex.r, w, h));

    // hextex = loadImage('../belred-ar-poc/hextex.png');

    // ambientLight(255);
    background(0,0,255);
    // noLoop();

    startAnim(9);
};

window.draw = function () {
    // return;

    stepAnimate();

    background(0);

    // translate(-width / 2, -height / 2);

    // stroke(255);
    // strokeWeight(1);
    // fill(255,0,0);
    for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        push();
        // translate(shape.verts[shape.verts.length - 1].x, shape.verts[shape.verts.length - 1].y);
        renderShapeMesh(shape);
        pop();
    }
}

function createHexShape(centerOddrArr, centerAxArr, radius, texWidth, texHeight) {
    // Something that can be turned into a mesh with all necessary attributes
    const centerOddrVec = vec2(centerOddrArr[0], centerOddrArr[1]);
    const centerAxVec = vec2(centerAxArr[0], centerAxArr[1]);

    const shape = {
        cOddr: centerOddrVec,
        cAx: centerAxVec,
        verts: [],
        uvs: [],
        tris: [],
        turns: 0, // not used yet
        pivot: vec2(0, 0), // cartesian
    }

    const centerCart = hexToCartesianOddr(centerOddrVec, radius);
    console.log(centerCart);
    const poly = new Polygon(centerCart, radius, 6, PI / 2); // pointy side up
    const pts = poly.getPoints();

    shape.pivot = centerCart;

    shape.verts.push(...pts); // ring
    shape.verts.push(centerCart); // center
    const iCenter = pts.length;

    // Normalize uvs, assume the texture is the full range from 
    // -h/2 to h/2 and -w/2 to w/2
    const uvs = pts.map(p => cartToUv(p, texWidth, texHeight));
    shape.uvs.push(...uvs);
    shape.uvs.push(cartToUv(centerCart, texWidth, texHeight));

    circle(centerCart.x, centerCart.y, 10);

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

function renderShapeMesh(shape) {
    // Render a shape with a mesh
    beginShape(TRIANGLES);
    texture(hextex);
    textureMode(NORMAL);

    // Animation
    let animCx, animCy;
    let randN = getAnimCompleteCount(8);
    animCx = round(sqRand(randN) * 3 - 1);
    animCy = round(sqRand(randN + 1) * 2 - 1);

    const dist = getDistOddr(shape.cOddr, vec2(animCx, animCy));
    const animActive = isAnimActive(dist);
    const animProgress = getAnimProgress(dist);
    const animCompleteCount = getAnimCompleteCount(dist);
    const animTurns = animCompleteCount + easeInOutQuad(animProgress);

    for (let i = 0; i < shape.tris.length; i++) {
        const iVert = shape.tris[i];
        const vert = shape.verts[iVert];
        const uv = shape.uvs[iVert];

        // Rotate around pivot
        // let turns = frameCount;
        // turns = Math.floor(turns);

        let turns = animTurns;
        
        if (shape.cOddr.x < -3 || shape.cOddr.x > 2 || shape.cOddr.y < -8 || shape.cOddr.y > 7) {
            turns = 0;
        }
        
        // turns = 0;

        const rotated = rotateAround(vert, shape.pivot, turns * PI / 3);

        // vertex(vert.x, vert.y, uv.x, uv.y);
        vertex(rotated.x, rotated.y, uv.x, uv.y);
        // vertex(vert.x, vert.y);
    }
    endShape();
}

function rotateAround(p, pivot, angle) {
    const dir = sub2d(p, pivot);
    const rotated = rot2d(dir, angle);
    return add2d(pivot, rotated);
}
