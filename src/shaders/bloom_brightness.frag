precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D texture0;
uniform vec2 resolution;

const float brightPassThreshold = 1.0;
const vec3 luminanceVector = vec3(0.2125, 0.7154, 0.0721);

void main(){
  vec4 c = texture(texture0, vUv);
  float luminance = dot(luminanceVector, c.rgb);
  luminance = max(0.0, luminance - brightPassThreshold);
  c.rgb *= step(0.0, luminance);
  c.a = 1.0;
  fragColor = c;
}


