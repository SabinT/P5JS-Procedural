import { add2d, line2D, mul2d, ray2D, rotateDeg2D, sub2d, transform, vec2, normalize2d } from "./lumic/common.js";
import { drawShape, getOuterTangents, outerTangentPath } from "./lumic/geomerty.js";

let origin, right;

let globalAngle = 0;

let c1 = {
    c: vec2(-100, -100),
    r: 100
}

let c2 = {
    c: vec2(100, 100),
    r: 50
}

window.setup = function () {
    origin = vec2(0, 0);
    right = vec2(1, 0);

    createCanvas(1000, 1000);
    background(0);
}

window.draw = function () {
    translate(width / 2, height / 2)
    background(0);

    // c2.c = vec2(mouseX - width / 2, mouseY - height / 2);

    const pts = outerTangentPath(c1.c, c2.c, c1.r, c2.r, 16, true)

    noStroke();
    fill("#3c7e9f2d")
    drawShape(pts);

    stroke("#3c7e9f");
    noFill()
    circle(c1.c.x, c1.c.y, c1.r * 2);
    circle(c2.c.x, c2.c.y, c2.r * 2);
}

// On right click, change origin
window.mousePressed = function () {
    if (mouseButton === LEFT) {
        c2.c = vec2(mouseX - width/2, mouseY - height/2);
    }
}

// On mouse wheel, change angle
window.mouseWheel = function (event) {
    c2.r += event.delta / 100;
}

