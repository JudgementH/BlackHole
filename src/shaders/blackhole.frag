#ifndef STEP_SIZE
#define STEP_SIZE 0.1
#endif
#ifndef N_STEP
#define N_STEP 300
#endif

const float PI = 3.14159265359;

uniform float time;
uniform vec2 resolution;

uniform samplerCube galaxy;
uniform sampler2D colorMap;

uniform vec3 cam_dir;
uniform float fovScale;

uniform float gravatationalLensing;

uniform float accretionDisk;
uniform float accretionDiskParticle;
uniform float accretionDiskInnerRadius;
uniform float accretionDiskOuterRadius;
uniform float accretionDiskHeight;
uniform float accretionDiskDensityV;
uniform float accretionDiskDensityH;
uniform float accretionDiskLit;
uniform float accretionDiskNoiseScale;
uniform float accretionDiskNoiseLOD;
uniform float accretionDiskSpeed;


vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m*m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

mat3 lookAt(vec3 origin, vec3 target, float roll) {
  vec3 rr = vec3(sin(roll), cos(roll), 0.0);
  vec3 ww = normalize(target - origin);
  vec3 uu = normalize(cross(ww, rr));
  vec3 vv = normalize(cross(uu, ww));
  return mat3(uu, vv, ww);
}

vec4 quadFromAxisAngle(vec3 axis, float angleDeg) {
  float half_angle = (angleDeg * 0.5) * PI / 180.0;
  return vec4(axis * sin(half_angle), cos(half_angle));
}
vec4 quadConj(vec4 q){ return vec4(-q.xyz, q.w); }
vec4 quat_mult(vec4 q1, vec4 q2){
  return vec4(
    (q1.w*q2.x) + (q1.x*q2.w) + (q1.y*q2.z) - (q1.z*q2.y),
    (q1.w*q2.y) - (q1.x*q2.z) + (q1.y*q2.w) + (q1.z*q2.x),
    (q1.w*q2.z) + (q1.x*q2.y) - (q1.y*q2.x) + (q1.z*q2.w),
    (q1.w*q2.w) - (q1.x*q2.x) - (q1.y*q2.y) - (q1.z*q2.z)
  );
}
vec3 rotateVector(vec3 p, vec3 axis, float angleDeg){
  vec4 qr = quadFromAxisAngle(axis, angleDeg);
  vec4 qr_conj = quadConj(qr);
  vec4 qpos = vec4(p, 0.0);
  vec4 tmp = quat_mult(qr, qpos);
  vec4 res = quat_mult(tmp, qr_conj);
  return res.xyz;
}

vec3 toSpherical(vec3 p) {
  float rho = length(p);
  float theta = atan(p.z, p.x);
  float phi = asin(p.y / max(rho, 1e-6));
  return vec3(rho, theta, phi);
}

void accretionDiskColor(vec3 pos, inout vec3 color, inout float alpha) {
  float innerRadius = accretionDiskInnerRadius;
  float outerRadius = accretionDiskOuterRadius;
  float density =
      max(0.0, 1.0 - length(pos / vec3(outerRadius, 0.2, outerRadius)));
  if (density < 0.001) {
    return;
  }
  density *= pow(1.0 - abs(pos.y) / accretionDiskHeight, accretionDiskDensityV);
  density *= smoothstep(innerRadius, innerRadius * 1.1, length(pos));
  if (density < 0.001) {
    return;
  }
  vec3 sphericalCoord = toSpherical(pos);
  sphericalCoord.y *= 2.0;
  sphericalCoord.z *= 4.0;
  density *= 1.0 / pow(sphericalCoord.x, accretionDiskDensityH);
  density *= 16000.0;

  if (accretionDiskParticle < 0.5) {
    color += vec3(0.0, 1.0, 0.0) * density * 0.02;
    return;
  }

  float noise = 1.0;
  for (int i = 0; i < int(accretionDiskNoiseLOD); i++) {
    noise *= 0.5 * snoise(sphericalCoord * pow(float(i), 2.0) * accretionDiskNoiseScale) + 0.5;
    if ((i % 2) == 0){
      sphericalCoord.y += time * accretionDiskSpeed;
    }
    else{
      sphericalCoord.y -= time * accretionDiskSpeed;
    }
  }
  vec3 dustColor = texture(colorMap, vec2(sphericalCoord.x / outerRadius, 0.5)).rgb;
  color += density * accretionDiskLit * dustColor * alpha * abs(noise);
}

vec3 traceColor(vec3 pos, vec3 dir) {
  float alpha = 1.0;

  dir *= STEP_SIZE;
  vec3 color = vec3(0.0);
  vec3 h = cross(pos, dir);
  float h2 = dot(h, h);
  for (int i = 0; i < N_STEP; i++) {
    // Gravitational lensing
    if (gravatationalLensing > 0.5) {
      float r2 = dot(pos, pos);
      float r5 = pow(r2, 2.5);
      vec3 acc = -1.5 * h2 * pos / r5 * 1.0;
      dir += acc;
    }

    // Black hole
    if (dot(pos, pos) < 1.0) {
      return color;
    }
    // Accretion disk
    if (accretionDisk > 0.5) {
      accretionDiskColor(pos, color, alpha);
    }
    pos += dir;
  }
  dir = rotateVector(dir, vec3(0.0, 1.0, 0.0), time);
  color += texture(galaxy, dir).rgb * alpha;
  return color;
}

void main() {

  vec3 cam_pos = vec3(-cos(time * 0.1) * 15.0, sin(time * 0.1) * 5.0,
                      sin(time * 0.1) * 15.0);
  // vec3 cam_pos = vec3(10.0, 1.0, 10.0);

  mat3 view = lookAt(cam_pos, vec3(0.0), 0.0);

  vec2 uv = gl_FragCoord.xy / resolution.xy - vec2(0.5);
  uv.x *= resolution.x / resolution.y;
  vec3 dir = normalize(vec3(-uv.x * fovScale, uv.y * fovScale, 1.0));
  dir = view * dir;
  gl_FragColor = vec4(traceColor(cam_pos, dir), 1.0);
  // gl_FragColor  = vec4(0, 0, 0, 1.0);
}
