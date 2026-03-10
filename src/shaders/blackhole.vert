// Black hole vertex shader
out vec2 vUv;
out vec3 vPosition;
out vec3 vNormal;

void main() {
    // vUv = uv;
    // vPosition = position;
    // vNormal = normal;
    
    // gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = (position.xy + 1.0) / 2.0;

    gl_Position = vec4(position, 1.0);
}
