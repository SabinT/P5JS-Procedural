import { Frame2D } from "./frame.js";
import { add2d, subtract2d, vec2, TAU } from "./common.js";

export class Wheel {
    constructor(center, radius, speed) {
        this.center = center;
        this.r = radius;
        this.speed = speed;
    }

    getPosition(t) {
        const tt = t * TAU * this.speed;
        var c = cos(tt);
        var s = sin(tt);
        return vec2(this.r * c, this.r * s );
    }
}

export class Spiro2D {
    constructor(frame, wheels) {
        this.frame = frame;
        this.wheels = wheels;
    }

    getPosition(t) {
        let p = vec2(0,0);
        for (let i = 0; i < this.wheels.length; i++) {
            const w = this.wheels[i];
            let pp = w.getPosition(t);
            p = add2d(p, pp);
        }

        return this.frame.transform(p);
    }

    getStartTangent(eps = 0.001) {
        var a = this.getPosition(eps);
        var b = this.getPosition(-eps);
        var dir = subtract2d(a,b);
        dir.normalize();
        return dir;
    }
}