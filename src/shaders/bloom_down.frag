precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec2 resolution;
uniform sampler2D texture0;

void main(){
  vec2 inputTexelSize = 1.0 / resolution * 0.5;
  vec4 o = inputTexelSize.xyxy * vec4(-1.0, -1.0, 1.0, 1.0);
  fragColor = 0.25 * (
    texture(texture0, vUv + o.xy) +
    texture(texture0, vUv + o.zy) +
    texture(texture0, vUv + o.xw) +
    texture(texture0, vUv + o.zw)
  );
}

