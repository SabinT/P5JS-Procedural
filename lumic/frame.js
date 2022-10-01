import { add2d, mul2d, scale2d, vec2, vec3 } from "./common.js";

export function perpendicular2d (p) {
    var res = p5.Vector.cross(vec3(0,0,1), vec3(p.x, p.y, 0));
    return vec2(res.x, res.y);
}

/**
 * Frame of reference
 */
export class Frame2D {
    constructor(origin, forward) {
        this.origin = origin;
        this.forward = forward;
        this.right = perpendicular2d(forward);
        this.forward.normalize();
        this.right.normalize();
    }

    transform(p) {
        var ox = scale2d(this.forward, p.y);
        var oy = scale2d(this.right, p.x);
        var o = add2d(ox, oy);
        return add2d(this.origin, o);
    }
}