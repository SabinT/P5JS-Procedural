import { vec2 } from './common.js'

const root3 = Math.sqrt(3);

export function hexToCartesian(x,y,R) {
    // Basis vectors: horizontal = (sqrt(3), 0), slant = (sqrt(3)/2, 3/2)
    return vec2(
       R * x * root3 + R * y * root3 / 2,
       R * y * 1.5
    );
}

export function getHexRing(p) {
    return [
        vec2(p.x + 1, p.y + 0),
        vec2(p.x - 1, p.y + 0),

        vec2(p.x + 0, p.y + 1),
        vec2(p.x + 0, p.y - 1),

        vec2(p.x + 1, p.y - 1),
        vec2(p.x - 1, p.y + 1)
    ];
}