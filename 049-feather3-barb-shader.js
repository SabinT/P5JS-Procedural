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

void main () {
    gl_FragColor = uColor;
}
`;
