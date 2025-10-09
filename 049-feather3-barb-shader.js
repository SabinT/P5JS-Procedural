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
#extension GL_OES_standard_derivatives : enable
precision highp float;

varying vec2 vUV;

uniform vec4 uColor;
uniform float uBarbSpineWidth;
uniform float uBarbSpineHardness;
uniform float uBarbuleWidthNorm;
uniform float uBarbuleHardness;
uniform float uBarbulePatternRepeat;
uniform float uBarbulePatternSeparation;
uniform float uBarbIndex;

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
    uv.y *= float(uBarbulePatternRepeat / 5.0);

    float tspine = smoothstep(-uBarbSpineWidth, -uBarbSpineWidth * uBarbSpineHardness, uv.x) *
                   smoothstep(uBarbSpineWidth,  uBarbSpineWidth * uBarbSpineHardness, uv.x);

    float gap = 0.2;
    float tilt = 0.2;
    float thickness = gap * uBarbuleWidthNorm;

    float tBarbule = barbuleIntensity(uv, gap, thickness, uBarbuleHardness, tilt);
    float t = max(tspine, tBarbule);

    float falloffStart = 0.30 * (1.0 - tCloseToTop);
    float falloffEnd   = 0.450 * (1.0 - tCloseToTop);
    float fade = smoothstep(falloffEnd, falloffStart, abs(uv.x));

    t *= fade;

    vec4 col = uColor * t;
    col.a = t;
    return col;
}

// =========================================================
// Noise shading using fixed pastel palette
// =========================================================
vec3 getPaletteColor(float n)
{
    // pick one of 5 colors based on noise value
    if (n < 0.2)  return vec3(0xF2,0xA0,0xD5)/255.0; // #F2A0D5
    else if (n < 0.4) return vec3(0xF2,0x79,0xDE)/255.0; // #F279DE
    else if (n < 0.6) return vec3(0x88,0x6F,0xBF)/255.0; // #886FBF
    else if (n < 0.8) return vec3(0x05,0xC7,0xF2)/255.0; // #05C7F2
    else              return vec3(0x05,0xDB,0xF2)/255.0; // #05DBF2
}

vec4 shadeNoise(vec2 uv)
{
    float tCloseToTop = smoothstep(0.5, 1.0, uv.y);
    uv.y *= (float(uBarbulePatternRepeat)) / 50.0;

    float gap = 0.2;
    float tilt = 0.2;
    float thickness = gap * 0.8;
    float tNoiseBase = barbuleIntensity(uv, gap, thickness, 0.5, tilt);

    float n = fract(sin(dot(uv * 43.17, vec2(12.9898,78.233))) * 43758.5453);
    vec3 chosenColor = getPaletteColor(n);

    float falloffStart = 0.35 * (1.0 - tCloseToTop);
    float falloffEnd   = 0.5  * (1.0 - tCloseToTop);
    float fade = smoothstep(falloffEnd, falloffStart, abs(uv.x));

    float t = tNoiseBase * fade * (1.0 - 0.3 * tCloseToTop);
    return vec4(chosenColor * t, t);
}


// =========================================================
// Supersampling with a fibonacci lattice
// =========================================================
void main()
{
    const int SAMPLES = 16;
    const float INV_SAMPLES = 1.0 / float(SAMPLES);
    const float PHI = 1.61803398875;
    const float GOLDEN_ANGLE = 2.0 * 3.14159265 / (PHI * PHI);

    vec4 accum = vec4(0.0);
    vec2 pixel = vec2(fwidth(vUV.x), fwidth(vUV.y));

    for (int i = 0; i < SAMPLES; ++i)
    {
        float fi = float(i) + 0.5;
        float r = sqrt(fi * INV_SAMPLES) - 0.5;
        float a = fi * GOLDEN_ANGLE;
        vec2 offset = r * vec2(cos(a), sin(a));
        vec2 sampleUV = vUV + offset * pixel * 1.5;
        accum += shadeBarbule(sampleUV);
    }

    vec4 finalColor = accum * INV_SAMPLES;

    // Add noise layer (single evaluation for speed)
    vec4 noiseColor = shadeNoise(vUV);
    finalColor = mix(finalColor, finalColor * noiseColor, 0.6);

    gl_FragColor = noiseColor;
    // gl_FragColor = finalColor;
}
`;

