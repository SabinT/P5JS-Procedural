import { vec2, scale2d } from './common.js';

export class CubicHermite {
    constructor(p0,m0,p1,m1) {
        this.p0 = p0;
        this.m0 = m0;
        this.p1 = p1;
        this.m1 = m1;
    }

    GetPosition(t) {
        const t2 = t * t;
        const t3 = t2 * t;

        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;

        return vec2(
            h00 * this.p0.x + h10 * this.m0.x + h01 * this.p1.x + h11 * this.m1.x,
            h00 * this.p0.y + h10 * this.m0.y + h01 * this.p1.y + h11 * this.m1.y
        );
    }

    GetTangent(t) {
        const t2 = t * t;

        // First derivative
        const h00 = 6 * t2 - 6 * t;
        const h10 = 3 * t2 - 4 * t + 1;
        const h01 = -6 * t2 + 6 * t;
        const h11 = 3 * t2 - 2 * t;

        return vec2(
            h00 * this.p0.x + h10 * this.m0.x + h01 * this.p1.x + h11 * this.m1.x,
            h00 * this.p0.y + h10 * this.m0.y + h01 * this.p1.y + h11 * this.m1.y
        );
    }

    GetNormal(t) {
        // Second derivative
        const h00 = 12 * t - 6;
        const h10 = 6 * t - 4;
        const h01 = -12 * t + 6;
        const h11 = 6 * t - 2;

        return vec2(
            h00 * this.p0.x + h10 * this.m0.x + h01 * this.p1.x + h11 * this.m1.x,
            h00 * this.p0.y + h10 * this.m0.y + h01 * this.p1.y + h11 * this.m1.y
        );
    }

    GetBinormal(t) {
        // perpendicular to the tangent
        const tangent = this.GetTangent(t);
        return vec2(-tangent.y, tangent.x);
    }
}