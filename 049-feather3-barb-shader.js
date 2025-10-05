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
precision mediump float;

varying vec2 vUV;

uniform vec4 uColor;
uniform float uBarbSpineWidth;
uniform float uBarbSpineHardness;
uniform float uBarbuleWidthNorm;
uniform float uBarbuleHardness;
uniform float uBarbuleCount;

// https://iquilezles.org/articles/distfunctions2d/
float sdTriangle( in vec2 p, in vec2 p0, in vec2 p1, in vec2 p2 )
{
    vec2 e0 = p1-p0, e1 = p2-p1, e2 = p0-p2;
    vec2 v0 = p -p0, v1 = p -p1, v2 = p -p2;
    vec2 pq0 = v0 - e0*clamp( dot(v0,e0)/dot(e0,e0), 0.0, 1.0 );
    vec2 pq1 = v1 - e1*clamp( dot(v1,e1)/dot(e1,e1), 0.0, 1.0 );
    vec2 pq2 = v2 - e2*clamp( dot(v2,e2)/dot(e2,e2), 0.0, 1.0 );
    float s = sign( e0.x*e2.y - e0.y*e2.x );
    vec2 d = min(min(vec2(dot(pq0,pq0), s*(v0.x*e0.y-v0.y*e0.x)),
                     vec2(dot(pq1,pq1), s*(v1.x*e1.y-v1.y*e1.x))),
                     vec2(dot(pq2,pq2), s*(v2.x*e2.y-v2.y*e2.x)));
    return -sqrt(d.x)*sign(d.y);
}

float barbuleIntensity(vec2 uv, float gap, float thickness, float hardness, float tilt)
{
    // Symmetry + gentle bend
    uv.x = abs(uv.x);
    // uv.y += pow(uv.x, 1.5);
    uv.y -= pow(smoothstep(0.0, 0.5, uv.x), 0.75);

    // Diagonal coordinate in uv units; period = gap along uv.y
    float s = uv.y + tilt * uv.x;

    // Local position inside the stripe cell [0,1)
    float cell = fract(s / gap);

    // Distance from the centerline in uv units
    float dist = abs(cell - 0.5) * gap;

    // Half-width in uv units; clamp so it can't exceed the cell
    float w = 0.5 * clamp(thickness, 0.0, gap);

    float feather = w * (1.0 - hardness);
    float intensity = 1.0 - smoothstep(w - feather, w, dist);
    
    return intensity;
}

void main () {
    // X-Centered uv
    vec2 uv = vUV;

    float tCloseToTop = smoothstep(0.5, 1.0, uv.y);

    // Repeat uv.y based on barbule count
    uv.y *= float(uBarbuleCount / 5.0); // divide by 5 because gap is 0.2

    float tspine = smoothstep(-uBarbSpineWidth, -uBarbSpineWidth * uBarbSpineHardness, uv.x) * 
                smoothstep(uBarbSpineWidth, uBarbSpineWidth * uBarbSpineHardness, uv.x);

    // ---- Params (uv.y-based for spacing/width) ----
    float gap          = 0.2;
    float tilt         = 0.4;  // dimensionless, just to add some tilt to the barbules

    float thickness = gap * uBarbuleWidthNorm;
    float tBarbule = barbuleIntensity(uv, gap, thickness, uBarbuleHardness, tilt);

    float tBarbuleNoise = barbuleIntensity(uv, gap , thickness * 0.1, uBarbuleHardness, tilt);

    float t = max(tspine, tBarbule);
    t = max(t, tBarbuleNoise * 0.5);


    // Fade towards the sides
    float falloffStart = 0.30 * (1.0 - tCloseToTop);
    float falloffEnd   = 0.450 * (1.0 - tCloseToTop);
    float fade = smoothstep(falloffEnd, falloffStart, abs(uv.x));

    t *= fade;

    // Set final color, alpha based on t
    vec4 finalColor = uColor * t;
    finalColor.a = t;

    gl_FragColor = finalColor;
}
`;