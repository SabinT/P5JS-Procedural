export const barbVert = `
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
    vUV = aTexCoord;
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
}
`;

export const barbFrag = `
#ifdef GL_ES
precision mediump float;
precision mediump int;
#endif

varying vec2 vUV;

uniform vec4 uColor;
uniform float uBarbSpineWidth;
uniform float uBarbSpineHardness;
uniform float uBarbuleWidthNorm;
uniform float uBarbuleHardness;

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

void main () {
    // X-Centered uv
    vec2 uv = vUV;

    // Repeat y in the 0-1 range
    uv.y = fract(uv.y);
    
    float tspine = smoothstep(-uBarbSpineWidth, -uBarbSpineWidth * uBarbSpineHardness, uv.x) * 
                   smoothstep(uBarbSpineWidth, uBarbSpineWidth * uBarbSpineHardness, uv.x);
    
    uv.x = abs(uv.x);
    
    float tBarbule = 1.0 - sdTriangle(uv, 
                                      vec2(0.0, 0.15 - uBarbuleWidthNorm * 0.5), 
                                      vec2(0.0, 0.15 + uBarbuleWidthNorm * 0.5), 
                                      vec2(0.4, 0.9));
    tBarbule = smoothstep(uBarbuleHardness, 1.0, tBarbule);

    float t = max(tspine, tBarbule);

    gl_FragColor = uColor * t;
}
`;