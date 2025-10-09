export const spineVert = `
#ifdef GL_ES
precision mediump float;
precision mediump int;
#endif

attribute vec3 aPosition;
attribute vec2 aTexCoord;

uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewMatrix;

varying vec2 vUV;

void main () {
    vUV = aTexCoord;  // vUV.x = along spine [0..1], vUV.y = -0.5..0.5 across width
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
}
`;

export const spineFragSolid = `
#ifdef GL_ES
precision mediump float;
precision mediump int;
#endif

varying vec2 vUV;

uniform vec4 uBaseColor;          // RGBA 0..1
uniform vec3 uEdgeColor;          // RGB 0..1
uniform float uEdgeSoftness;      // 0..1
uniform float uRidgeSoftness;     // 0..1
uniform float uRidgeHighlight;    // 0..1
uniform float uTipDarken;         // 0..1

uniform int uDebug; // 0 or 1

// pastel palette
vec3 getPaletteColor(float n)
{
    if (n < 0.2)  return vec3(0xF2,0xA0,0xD5)/255.0; // #F2A0D5
    else if (n < 0.4) return vec3(0xF2,0x79,0xDE)/255.0; // #F279DE
    else if (n < 0.6) return vec3(0x88,0x6F,0xBF)/255.0; // #886FBF
    else if (n < 0.8) return vec3(0x05,0xC7,0xF2)/255.0; // #05C7F2
    else              return vec3(0x05,0xDB,0xF2)/255.0; // #05DBF2
}

float remap(float x, float a, float b, float c, float d){
    return clamp((x - a) / max(1e-5, (b - a)), 0.0, 1.0) * (d - c) + c;
}

void main () {
    if (uDebug == 1) {
        gl_FragColor = vec4(
            clamp(1.0 - vUV.x, 0.0, 1.0),
            clamp(vUV.y + 0.5, 0.0, 1.0),
            0.0, 1.0
        );
        return;
    }

    // distance to center line across width: 0 at center, 1 at edges
    float d = abs(vUV.y) / 0.5;
    d = clamp(d, 0.0, 1.0);

    // soften edge blend
    float edge = smoothstep(0.95 - uEdgeSoftness, 0.95, d);

    // subtle center highlight (ridge)
    float dRidge = abs(vUV.y - 0.1 /* ridgeOffset */) / 0.5;
    float ridge  = 1.0 - smoothstep(0.0, max(1e-5, uRidgeSoftness), dRidge);

    // darken toward shaft ends (tips)
    float tip = max(remap(vUV.x, 0.0, 0.15, 1.0, 0.0),
                    remap(vUV.x, 0.85, 1.0, 0.0, 1.0));
    float tipShade = mix(1.0, 1.0 - uTipDarken, tip);

    // ----------- Base gradients -----------
    vec3 col = uBaseColor.rgb;
    col += ridge * uRidgeHighlight;     // highlight center
    col = mix(col, uEdgeColor.rgb, edge); // edge fade
    col *= tipShade;                      // tip darken

    // // ----------- Add pastel noise -----------
    // base hash noise (different scale along spine)
    // float n = fract(sin(dot(vUV * vec2(47.13, 119.83), vec2(12.9898, 78.233))) * 43758.5453);
    // vec3 noiseColor = getPaletteColor(n);

    // // fade noise toward edges and tips
    // float noiseStrength = 0.5;
    // float noiseFade = (1.0 - edge) * (1.0 - tip) * (0.5 + 0.5 * ridge);
    // col = mix(col, noiseColor, noiseFade * noiseStrength);

    // alpha
    float alpha = 1.0 - edge;
    alpha = smoothstep(0.0, 0.2, alpha);

    gl_FragColor = vec4(col, alpha);
}
`;