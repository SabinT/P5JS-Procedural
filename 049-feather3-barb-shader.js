export const barbVert = `
precision mediump float;

attribute vec3 aPosition;
attribute vec2 aTexCoord;

uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewMatrix;

varying vec2 vUV;

void main () {
    vUV = aTexCoord;
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
}
`;

export const barbFrag = `
precision highp float;

#extension GL_OES_standard_derivatives : enable

varying vec2 vUV;

uniform vec4 uColor;
uniform float uBarbSpineWidth;
uniform float uBarbSpineHardness;
uniform float uBarbuleWidthNorm;
uniform float uBarbuleHardness;
uniform float uBarbuleCount;

// =========================================================
// Barbule intensity helper
// =========================================================
float barbuleIntensity(vec2 uv, float gap, float thickness, float hardness, float tilt)
{
    uv.x = abs(uv.x);
    uv.y -= pow(smoothstep(0.0, 0.5, uv.x), 0.75);

    if (uv.y < 0.0) { return 0.0; }

    float s = uv.y + tilt * uv.x;
    float cell = fract(s / gap);
    float dist = abs(cell - 0.5) * gap;
    float w = 0.5 * clamp(thickness, 0.0, gap);
    float feather = w * (1.0 - hardness);
    return 1.0 - smoothstep(w - feather, w, dist);
}

// =========================================================
// Core shading logic
// =========================================================
vec4 shadeBarbule(vec2 uv)
{
    float tCloseToTop = smoothstep(0.5, 1.0, uv.y);
    uv.y *= float(uBarbuleCount / 5.0);

    float tspine = smoothstep(-uBarbSpineWidth, -uBarbSpineWidth * uBarbSpineHardness, uv.x) *
                   smoothstep(uBarbSpineWidth,  uBarbSpineWidth * uBarbSpineHardness, uv.x);

    float gap = 0.2;
    float tilt = 0.2;
    float thickness = gap * uBarbuleWidthNorm;

    float tBarbule = barbuleIntensity(uv, gap, thickness, uBarbuleHardness, tilt);
    float tBarbuleNoise = barbuleIntensity(uv, gap * 0.01, thickness * 0.01, uBarbuleHardness, tilt);

    float t = max(tspine, tBarbule);
    t = max(t, tBarbuleNoise * 0.3);

    float falloffStart = 0.30 * (1.0 - tCloseToTop);
    float falloffEnd   = 0.450 * (1.0 - tCloseToTop);
    float fade = smoothstep(falloffEnd, falloffStart, abs(uv.x));

    t *= fade;

    vec4 col = uColor * t;
    col.a = t;
    return col;
}

// =========================================================
// Supersampling with a fibonacci lattice
// =========================================================
void main()
{
    const int SAMPLES = 16;
    const float INV_SAMPLES = 1.0 / float(SAMPLES);
    const float PHI = 1.61803398875;             // golden ratio
    const float GOLDEN_ANGLE = 2.0 * 3.14159265 / (PHI * PHI); // ~137.5°

    vec4 accum = vec4(0.0);
    vec2 pixel = vec2(fwidth(vUV.x), fwidth(vUV.y));

    for (int i = 0; i < SAMPLES; ++i)
    {
        float fi = float(i) + 0.5;
        float r = sqrt(fi * INV_SAMPLES) - 0.5;  // roughly -0.5..0.5 range
        float a = fi * GOLDEN_ANGLE;

        vec2 offset = r * vec2(cos(a), sin(a));
        vec2 sampleUV = vUV + offset * pixel * 1.5; // 1.5 scales sampling radius
        accum += shadeBarbule(sampleUV);
    }

    gl_FragColor = accum * INV_SAMPLES;
}

`;

