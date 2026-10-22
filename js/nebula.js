(() => {
  "use strict";

  const body = document.body;
  const canvas = document.getElementById("gl");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  let gl = null;
  try {
    gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance"
    });
  } catch (err) {
    gl = null;
  }
  if (!gl) {
    body.classList.add("fallback", "ready");
    return;
  }
  let hdr = !!gl.getExtension("EXT_color_buffer_float");

  const VERT = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  const SIM_FRAG = `#version 300 es
precision highp float;

uniform sampler2D uPrev;
uniform vec2  uTexel;
uniform vec2  uAspect;
uniform float uTime;
uniform float uDt;
uniform float uInit;
uniform vec2  uSplatPos;
uniform float uSplat;
uniform vec3  uSplatColor;
out vec4 outColor;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = m * p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  float asp = uAspect.x;
  vec2 p = (uv - 0.5) * vec2(asp, 1.0);
  float t = uTime;

  if (uInit > 0.5) {
    vec2 q = p * 1.46;
    vec2 w = vec2(fbm(q * 1.20 + 2.1), fbm(q * 1.20 + 7.7)) - 0.5;
    float n1 = fbm(q * 1.10 + w * 1.70 + vec2(0.0, 3.4));
    float n2 = fbm(q * 1.35 - w * 1.40 + vec2(5.1, 1.2));
    float n3 = fbm(q * 0.95 + w * 1.20 + vec2(9.2, 6.7));
    float n4 = fbm(q * 1.80 + w * 2.20 + vec2(-4.0, 2.0));
    float mask = smoothstep(0.24, 0.78, n4) * smoothstep(1.05, 0.10, length(p * vec2(0.70, 1.10)));
    float sideR = smoothstep(0.35, -0.55, p.x);
    float sideB = smoothstep(-0.20, 0.65, p.x);
    float r = smoothstep(0.40, 0.80, n1) * mask * (0.78 + 0.42 * sideR);
    float g = smoothstep(0.39, 0.80, n2) * mask * 0.90;
    float b = smoothstep(0.37, 0.80, n3) * mask * (0.82 + 0.34 * sideB);
    float a = max(r, max(g, b));
    outColor = vec4(min(vec3(r, g, b), 1.0), min(a, 1.0));
    return;
  }

  vec2 flow = vec2(0.0);
  flow += vec2(
    sin(p.y * 4.6 + t * 0.55 + sin(p.x * 2.8 + t * 0.23)),
    cos(p.x * 4.1 - t * 0.48 + sin(p.y * 3.4 - t * 0.19))
  ) * 0.024;

  vec2 curl = vec2(
    noise(p * 2.25 + vec2(t * 0.11, t * 0.04)),
    noise(p * 2.25 + vec2(5.3, 1.7) - vec2(t * 0.09, t * 0.05))
  ) - 0.5;
  flow += vec2(curl.y, -curl.x) * 0.20;
  vec2 curl2 = vec2(
    noise(p * 5.4 + vec2(-t * 0.23, t * 0.19)),
    noise(p * 5.1 + vec2(7.7, -t * 0.21))
  ) - 0.5;
  flow += vec2(curl2.y, -curl2.x) * 0.040;

  vec2 c1 = vec2((0.35 + 0.075 * sin(t * 0.21)) * asp - asp * 0.5, 0.28 + 0.075 * cos(t * 0.27));
  vec2 c2 = vec2((0.67 + 0.06 * cos(t * 0.17)) * asp - asp * 0.5, 0.35 + 0.065 * sin(t * 0.23));
  vec2 d1 = p - c1;
  vec2 d2 = p - c2;
  d1.x *= 1.12;
  d2.x *= 1.12;
  flow += vec2(-d1.y, d1.x) * exp(-dot(d1, d1) * 20.0) * 0.32;
  flow += vec2(d2.y, -d2.x) * exp(-dot(d2, d2) * 16.0) * 0.25;

  flow.y += 0.064;
  flow.x += 0.016 * sin(p.y * 2.2 - t * 0.32);
  flow.x += 0.048 * sin(p.y * 8.0 - t * 0.72) * smoothstep(0.58, 0.0, uv.y);

  vec2 src = uv - flow * uDt;
  src += (vec2(noise(uv * 44.0 + t * 0.6), noise(uv * 41.0 - t * 0.5 + 3.0)) - 0.5) * 0.0011;
  src = clamp(src, vec2(0.0015), vec2(0.9985));
  vec4 s = texture(uPrev, src);
  vec4 blur = (
    texture(uPrev, src + vec2(uTexel.x, 0.0)) +
    texture(uPrev, src - vec2(uTexel.x, 0.0)) +
    texture(uPrev, src + vec2(0.0, uTexel.y)) +
    texture(uPrev, src - vec2(0.0, uTexel.y))
  ) * 0.25;
  s = mix(s, blur, 0.055);
  s *= exp(-uDt * 0.195);

  float edge = smoothstep(0.0, 0.028, uv.x) * smoothstep(1.0, 0.972, uv.x);
  edge *= smoothstep(0.0, 0.018, uv.y) * smoothstep(1.0, 0.965, uv.y);
  s *= edge;

  float portrait = smoothstep(1.05, 0.62, asp);
  vec2 e1 = vec2(0.295 + 0.065 * sin(t * 0.19), 0.020 + 0.010 * sin(t * 0.33 + 1.2));
  vec2 e2 = vec2(0.710 + 0.055 * cos(t * 0.16), 0.018 + 0.009 * cos(t * 0.29));
  vec2 e3 = vec2(0.065 + 0.015 * sin(t * 0.22 + 2.4), 0.43 + 0.075 * sin(t * 0.17 + 0.4));
  vec2 e4 = vec2(0.505 + 0.075 * sin(t * 0.13 + 0.7), 0.57 + 0.05 * cos(t * 0.19 + 1.9));
  vec2 e5 = vec2(0.50 + 0.055 * sin(t * 0.11 + 3.1), 0.012);
  vec2 turb = vec2(noise(uv * 17.0 + t * 0.21), noise(uv * 15.0 - t * 0.18 + 4.0)) - 0.5;
  vec2 wob = vec2(0.013 * sin(uv.y * 9.0 + t * 0.62), 0.0);
  vec2 q1 = (uv - e1 + turb * 0.040 + wob * 2.0) / vec2(0.078, 0.155);
  vec2 q2 = (uv - e2 - turb * 0.038 - wob) / vec2(0.074, 0.145);
  vec2 q3 = (uv - e3 + turb * 0.020) / vec2(0.050, 0.095);
  vec2 q4 = (uv - e4 - turb * 0.035) / vec2(0.040, 0.080);
  vec2 q5 = (uv - e5 + turb * 0.040) / vec2(0.095, 0.150);
  float puff1 = 0.36 + 0.64 * pow(0.5 + 0.5 * sin(t * 0.31 + 0.7), 2.0);
  float puff2 = 0.38 + 0.62 * pow(0.5 + 0.5 * sin(t * 0.27 + 3.2), 2.0);
  float m1 = exp(-dot(q1, q1) * 2.4) * (0.62 + 0.55 * noise(uv * 28.0 + t * 0.33)) * puff1;
  float m2 = exp(-dot(q2, q2) * 2.4) * (0.62 + 0.55 * noise(uv * 31.0 - t * 0.29 + 2.0)) * puff2;
  float m3 = exp(-dot(q3, q3) * 2.2);
  float m4 = exp(-dot(q4, q4) * 2.2);
  float m5 = exp(-dot(q5, q5) * 2.1) * portrait;
  vec2 e6 = vec2(0.50 + 0.16 * sin(t * 0.083 + 1.2), 0.40 + 0.11 * cos(t * 0.067));
  vec2 q6 = (uv - e6 + turb * 0.055) / vec2(0.34, 0.25);
  float m6 = exp(-dot(q6, q6) * 1.65);
  float fogPulse = 0.40 + 0.60 * (0.5 + 0.5 * sin(t * 0.19 + 2.0));
  float fogBoost = 1.0 + portrait * 0.75;

  float pulse1 = 0.70 + 0.30 * sin(t * 0.70);
  float pulse2 = 0.72 + 0.28 * sin(t * 0.53 + 2.1);
  float pulse3 = 0.55 + 0.45 * sin(t * 0.37 + 4.0);
  float pulse4 = pow(max(0.0, sin(t * 0.23 + 1.0)), 5.0);
  float j1 = smoothstep(0.16, 0.82, noise(vec2(uv.x * 25.0, uv.y * 6.5) + t * 0.26));
  float j2 = smoothstep(0.16, 0.82, noise(vec2(uv.x * 23.0, uv.y * 6.0) - t * 0.22 + 4.0));
  j1 *= 0.42 + 1.05 * noise(uv * 43.0 - t * 0.34);
  j2 *= 0.42 + 1.05 * noise(uv * 39.0 + t * 0.31 + 7.0);
  float haze = exp(-pow((uv.y + 0.01) / 0.16, 2.0)) * 0.10;

  vec3 add = vec3(0.0);
  float addA = 0.0;
  add += vec3(0.96, 0.085, 0.300) * m1 * pulse1 * j1 * 0.98;
  addA += 0.92 * m1 * pulse1;
  add += vec3(0.080, 0.220, 0.940) * m2 * pulse2 * j2;
  addA += 0.88 * m2 * pulse2;
  add += vec3(0.460, 0.125, 0.920) * m3 * pulse3 * 0.88;
  addA += 0.70 * m3 * pulse3;
  add += vec3(0.950, 0.100, 0.340) * m4 * pulse4 * 0.90;
  addA += 0.72 * m4 * pulse4;
  add += vec3(0.340, 0.130, 0.900) * m5 * (0.70 + 0.30 * sin(t * 0.43)) * 0.72;
  addA += 0.68 * m5;
  vec3 fogCol = mix(vec3(0.380, 0.120, 0.880), vec3(0.820, 0.085, 0.300), smoothstep(0.20, 0.86, uv.x));
  add += fogCol * m6 * fogPulse * 0.058 * fogBoost;
  addA += m6 * fogPulse * 0.062 * fogBoost;
  add += vec3(0.130, 0.035, 0.240) * haze;
  addA += 0.10 * haze;
  s += vec4(add, addA) * uDt * 3.05;

  vec2 sq = (uv - uSplatPos) * vec2(asp * 0.9, 1.0);
  float splatMask = exp(-dot(sq, sq) * 26.0) * uSplat;
  flow += vec2(-sq.y, sq.x) * splatMask * 0.30;
  s.rgb += uSplatColor * splatMask * 3.4 * uDt;
  s.a += splatMask * 2.6 * uDt;

  s += (vec4(hash12(uv * 913.0 + t * 7.0), hash12(uv * 921.0 - t * 5.0), hash12(uv * 937.0 + 3.0), hash12(uv * 941.0)) - 0.5) * 0.0009;
  s = clamp(s, 0.0, 2.0);
  outColor = s;
}`;

  const SCENE_FRAG = `#version 300 es
precision highp float;

uniform sampler2D uState;
uniform vec2 uRes;
uniform vec2 uStateRes;
uniform float uTime;
uniform vec2 uPointer;
uniform vec2 uPointerVel;
uniform vec2 uBurstPos;
uniform float uBurst;
uniform float uIntro;
out vec4 outColor;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = m * p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = m * p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}
float dustLayer(vec2 p, float scale, float time, float seed) {
  vec2 gp = p * scale + vec2(seed * 3.1, seed * 1.7);
  vec2 id = floor(gp);
  vec2 f = fract(gp) - 0.5;
  float rnd = hash12(id + seed);
  vec2 pos = vec2(hash12(id + seed + 11.3), hash12(id + seed + 27.7)) - 0.5;
  pos *= 0.62;
  float ang = hash12(id + seed + 5.0) * 6.28318;
  pos += 0.075 * vec2(cos(time * 0.24 + ang), sin(time * 0.20 + ang));
  float m = smoothstep(0.060, 0.0, length(f - pos));
  m *= smoothstep(0.84, 1.0, rnd);
  m *= 0.55 + 0.45 * sin(time * 1.05 + rnd * 41.0);
  return m;
}
vec3 palette(vec3 d) {
  float sum = d.r + d.g + d.b + 1e-4;
  vec3 w = d / sum;
  w = pow(w, vec3(1.90));
  w /= (w.r + w.g + w.b);
  float redDom = smoothstep(0.36, 0.72, w.r);
  w.b *= mix(1.0, 0.74, redDom);
  w.g *= mix(1.0, 0.66, redDom);
  w.r += redDom * 0.06;
  w /= (w.r + w.g + w.b);
  return w.r * vec3(0.790, 0.095, 0.300)
       + w.g * vec3(0.365, 0.115, 0.850)
       + w.b * vec3(0.075, 0.190, 0.860);
}

void main() {
  float asp = uRes.x / uRes.y;
  vec2 uv = gl_FragCoord.xy / uRes;
  float t = uTime;
  float intro = smoothstep(0.0, 1.0, uIntro);

  float zoom = mix(1.17, 1.0, intro);
  uv = (uv - 0.5) / zoom + 0.5;
  uv += vec2(sin(t * 0.067), cos(t * 0.051)) * 0.007;
  vec2 p = (uv - 0.5) * vec2(asp, 1.0);

  vec2 warp = vec2(
    fbm3(p * 1.55 + vec2(0.0, t * 0.052)),
    fbm3(p * 1.55 + vec2(4.7, -t * 0.043))
  ) - 0.5;

  vec2 bd = (uv - uBurstPos) * vec2(asp, 1.0);
  float bdLen = length(bd);
  float bloomPush = exp(-bdLen * bdLen * 7.0) * uBurst;
  float ripple = sin((bdLen - 0.10) * 26.0 - uBurst * 7.0) * exp(-bdLen * 2.8) * uBurst;
  vec2 rippleDir = bdLen > 1e-4 ? bd / bdLen : vec2(0.0);
  vec2 pd = (uv - uPointer) * vec2(asp, 1.0);
  float pointerSpeed = clamp(length(uPointerVel), 0.0, 2.0);
  float pointerRipple = sin(length(pd) * 46.0 - t * 5.0) * exp(-length(pd) * 9.0) * pointerSpeed;
  vec2 pointerDir = length(pd) > 1e-4 ? pd / length(pd) : vec2(0.0);

  vec2 uvw = uv + warp * 0.042 + bd * bloomPush * 0.055 + rippleDir * ripple * 0.010;
  uvw += pointerDir * pointerRipple * 0.0022;
  uvw = clamp(uvw, vec2(0.0015), vec2(0.9985));

  vec4 s = texture(uState, uvw);
  vec2 texel = 1.0 / uStateRes;
  float hx = texture(uState, uvw + vec2(texel.x, 0.0)).a - texture(uState, uvw - vec2(texel.x, 0.0)).a;
  float hy = texture(uState, uvw + vec2(0.0, texel.y)).a - texture(uState, uvw - vec2(0.0, texel.y)).a;
  float glen = length(vec2(hx, hy));
  vec2 grad = glen > 1e-5 ? vec2(hx, hy) / glen : vec2(0.0);
  vec4 sr = texture(uState, uvw - grad * 0.010);

  float body = max(s.a, sr.a * 0.84);
  float dens = smoothstep(0.012, 0.80, body);
  float thick = smoothstep(0.030, 0.92, body);

  vec2 fp = p * 2.85 + warp * 1.65;
  float n1 = fbm(fp + vec2(t * 0.042, -t * 0.031));
  float n2 = fbm(fp * 2.15 + vec2(-t * 0.027, t * 0.039) + 3.7);
  float ridged = pow(clamp(1.0 - abs(n1 * 2.0 - 1.0), 0.0, 1.0), 8.0);
  float fine = fbm3(p * 9.0 + n2 * 1.4 + vec2(t * 0.018, -t * 0.014));
  float micro = smoothstep(0.41, 0.68, fine);
  float filaments = ridged * (0.32 + 0.68 * micro);
  float caustic = pow(clamp(1.0 - abs(n2 * 2.0 - 1.0), 0.0, 1.0), 12.0);

  vec3 nrm = normalize(vec3(-hx * 28.0, -hy * 28.0, 0.55));
  vec3 lightDir = normalize(vec3(-0.50, 0.78, 0.50));
  float diff = clamp(dot(nrm, lightDir), 0.0, 1.0);
  float spec = pow(clamp(dot(nrm, normalize(lightDir + vec3(0.0, 0.0, 1.35))), 0.0, 1.0), 48.0);
  float fres = pow(1.0 - clamp(nrm.z, 0.0, 1.0), 3.0);

  vec2 lens = grad * dens * 0.055;
  vec2 pl = p - lens;
  float bgN = fbm3(pl * 0.80 + vec2(t * 0.011, -t * 0.009) + 2.5);
  float bgN2 = fbm3(pl * 1.80 - vec2(t * 0.007, t * 0.012) + 7.2);
  vec3 col = mix(vec3(0.0025, 0.0012, 0.0070), vec3(0.0200, 0.0026, 0.0260), smoothstep(0.25, 0.78, bgN));
  vec2 g1 = pl - vec2(-0.34, 0.19);
  vec2 g2 = pl - vec2(0.47, -0.30);
  g1.x *= 0.70;
  g2.x *= 0.90;
  col += vec3(0.070, 0.012, 0.170) * exp(-dot(g1, g1) * 2.10) * 0.28;
  col += vec3(0.170, 0.006, 0.030) * exp(-dot(g2, g2) * 2.70) * 0.24;
  float bcaust = pow(clamp(1.0 - abs(bgN2 * 2.0 - 1.0), 0.0, 1.0), 18.0);
  col += vec3(0.040, 0.060, 0.180) * bcaust * 0.055;

  vec3 dye = palette(s.rgb);
  float warm = smoothstep(0.64, 0.06, uv.x) * smoothstep(0.78, 0.02, uv.y);
  dye = mix(dye, vec3(0.920, 0.120, 0.360), warm * smoothstep(0.10, 0.85, dens) * 0.26);

  vec3 smoke = dye * (0.018 + 0.40 * dens);
  dye = mix(dye, dye * vec3(0.78, 0.68, 0.76), smoothstep(0.42, 0.98, body) * 0.42);

  float structure = smoothstep(0.28, 0.78, n1 * 0.68 + n2 * 0.32);
  smoke *= (0.58 + 0.80 * structure);
  float vein = smoothstep(0.40, 0.62, fbm3(p * 3.4 + warp * 2.2 + 1.8));
  smoke *= (0.54 + 0.72 * vein);
  smoke *= 0.62 + 0.72 * diff;
  smoke *= 1.0 - 0.30 * smoothstep(0.38, 0.92, body) * (1.0 - fres);

  smoke += dye * diff * thick * 0.32;
  float edge = fres * smoothstep(0.05, 0.55, glen * 7.0);
  vec3 nDetail = normalize(vec3(nrm.xy + vec2((n2 - 0.5) * 1.6, (n1 - 0.5) * 1.6), nrm.z));
  float sheen = pow(clamp(dot(nDetail, normalize(lightDir + vec3(0.0, 0.0, 1.5))), 0.0, 1.0), 30.0);
  smoke += mix(vec3(0.88, 0.92, 1.0), dye, 0.50) * (spec * 0.95 + sheen * 0.60) * thick * 1.10;
  smoke += mix(dye, vec3(0.55, 0.65, 1.0), 0.55) * edge * thick * 0.32;

  vec2 cp = p * 2.35 + warp * 1.25;
  float cs1 = sin(cp.x * 4.2 + sin(cp.y * 3.1 + t * 0.22) + t * 0.31);
  float cs2 = sin(cp.y * 5.0 - sin(cp.x * 2.4 - t * 0.17) + t * 0.23);
  float causticNet = pow(clamp(abs(cs1 * cs2), 0.0, 1.0), 10.0);
  float waterCaustic = max(caustic * 0.60, causticNet * 0.55);
  smoke += mix(vec3(0.16, 0.34, 1.0), dye, 0.30) * waterCaustic * thick * 0.52;

  float filMask = filaments * smoothstep(0.08, 0.85, dens) * (0.30 + 0.70 * fres);
  smoke += mix(dye, vec3(0.60, 0.72, 1.0), 0.36) * filMask * 0.88;
  smoke *= 1.0 - 0.16 * filaments * smoothstep(0.40, 0.90, dens);
  smoke += dye * pow(dens, 3.0) * 0.26;

  vec3 irid = mix(vec3(0.10, 0.30, 1.0), vec3(1.0, 0.03, 0.18), smoothstep(-0.30, 0.30, nrm.x + warp.x * 0.6));
  smoke += irid * fres * dens * 0.12;
  col += smoke;

  float ringR = mix(0.0, 0.52, 1.0 - uBurst);
  float ring = exp(-pow((bdLen - ringR) / 0.026, 2.0)) * uBurst;
  float ringWave = sin((bdLen - ringR) * 72.0) * exp(-abs(bdLen - ringR) * 24.0) * uBurst;
  col += vec3(0.74, 0.78, 0.92) * (ring * 0.09 + ringWave * 0.035);

  float dust = dustLayer(p, 34.0, t, 0.0) * 0.62 + dustLayer(p, 63.0, t, 19.0) * 0.38;
  col += mix(vec3(0.42, 0.52, 1.0), dye, 0.48) * dust * (0.08 + 0.62 * dens) * 0.34;

  col = max(col, 0.0);
  outColor = vec4(col, 1.0);
}`;

  const BRIGHT_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform vec2 uTexel;
uniform vec2 uRes;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 o = uTexel * 0.55;
  vec3 c = texture(uScene, uv + vec2(o.x, o.y)).rgb;
  c += texture(uScene, uv + vec2(-o.x, o.y)).rgb;
  c += texture(uScene, uv + vec2(o.x, -o.y)).rgb;
  c += texture(uScene, uv + vec2(-o.x, -o.y)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  c *= smoothstep(0.66, 1.45, l);
  outColor = vec4(c, 1.0);
}`;

  const BLUR_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uDir;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / vec2(textureSize(uTex, 0));
  vec3 c = texture(uTex, uv).rgb * 0.2270270;
  c += texture(uTex, uv + uDir * 1.3846154).rgb * 0.3162162;
  c += texture(uTex, uv - uDir * 1.3846154).rgb * 0.3162162;
  c += texture(uTex, uv + uDir * 3.2307692).rgb * 0.0702703;
  c += texture(uTex, uv - uDir * 3.2307692).rgb * 0.0702703;
  outColor = vec4(c, 1.0);
}`;

  const COMPOSITE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2 uRes;
uniform float uTime;
out vec4 outColor;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  float ca = 0.0012 + 0.0038 * r2;

  vec3 col;
  col.r = texture(uScene, uv + c * ca).r;
  col.g = texture(uScene, uv).g;
  col.b = texture(uScene, uv - c * ca).b;

  vec3 bloom = texture(uBloom, uv).rgb;
  col += bloom * vec3(0.95, 0.88, 1.0) * 0.37;

  col *= 0.92;
  col = 1.0 - exp(-col * 1.03);
  col = pow(max(col, 0.0), vec3(0.96));
  col *= vec3(1.012, 0.975, 1.012);

  float redDom = smoothstep(0.08, 0.52, col.r - max(col.g, col.b));
  col.b += redDom * (0.055 + 0.060 * col.r);
  col.g += redDom * 0.012;
  col.r *= 1.0 - 0.028 * redDom;

  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, 0.84);
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.18);
  col = mix(col, col * vec3(1.010, 0.970, 1.020), 0.25);

  float bottomFade = smoothstep(-0.02, 0.16, uv.y);
  col *= mix(0.30, 1.0, bottomFade);

  float vig = smoothstep(1.22, 0.19, length(c * vec2(1.06, 1.0)) * 1.20);
  col *= mix(0.50, 1.0, vig);

  float g = hash12(uv * uRes + vec2(fract(uTime) * 91.7, fract(uTime) * 37.3)) - 0.5;
  col += g * 0.019;
  col += (hash12(uv * uRes + 19.7) - 0.5) / 255.0;

  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(log || "shader compile failed");
    }
    return sh;
  }

  function makeProgram(fragSrc) {
    const p = gl.createProgram();
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p) || "program link failed");
    }
    const u = {};
    const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(p, i);
      u[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  }

  let P;
  try {
    P = {
      sim: makeProgram(SIM_FRAG),
      scene: makeProgram(SCENE_FRAG),
      bright: makeProgram(BRIGHT_FRAG),
      blur: makeProgram(BLUR_FRAG),
      composite: makeProgram(COMPOSITE_FRAG)
    };
  } catch (err) {
    console.error(err);
    body.classList.add("fallback", "ready");
    return;
  }

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  function rt(w, h) {
    const internal = hdr ? gl.RGBA16F : gl.RGBA8;
    const type = hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!complete) {
      gl.deleteTexture(tex);
      gl.deleteFramebuffer(fb);
      if (hdr) {
        hdr = false;
        return rt(w, h);
      }
      throw new Error("incomplete render target");
    }
    return { tex, fb, w, h };
  }

  function freeRT(t) {
    if (!t) return;
    gl.deleteTexture(t.tex);
    gl.deleteFramebuffer(t.fb);
  }

  const pointer = {
    x: 0.5, y: 0.44, tx: 0.5, ty: 0.44,
    vx: 0, vy: 0, active: false
  };
  const burst = {
    x: 0.5, y: 0.4, t: 10, life: 1.15, strength: 0
  };
  const splat = {
    x: 0.5, y: 0.4, t: 10, life: 1.2, strength: 0,
    r: 0.5, g: 0.1, b: 1.0
  };

  let simTime = 0;
  let introStart = performance.now();
  let renderW = 1, renderH = 1;
  let sim = null;
  let sceneRT = null, bloomA = null, bloomB = null;
  let nextAuto = performance.now() + 9200;
  let last = performance.now();
  let firstFrame = true;
  let running = true;
  let heroVisible = true;

  function burstColor(x) {
    const crimson = [0.92, 0.12, 0.34];
    const violet = [0.50, 0.17, 0.88];
    const azure = [0.10, 0.29, 0.90];
    let a, b, m;
    if (x < 0.34) {
      a = crimson; b = violet; m = Math.max(0, (x - 0.03) / 0.31);
    } else if (x > 0.66) {
      a = violet; b = azure; m = Math.min(1, (x - 0.66) / 0.31);
    } else {
      a = violet; b = violet; m = 0;
    }
    return [
      a[0] + (b[0] - a[0]) * m,
      a[1] + (b[1] - a[1]) * m,
      a[2] + (b[2] - a[2]) * m
    ];
  }

  function triggerBurst(x, y, strength) {
    burst.x = x;
    burst.y = y;
    burst.t = 0;
    burst.life = 1.0 + Math.random() * 0.35;
    burst.strength = strength == null ? 1 : strength;
  }
  function triggerSplat(x, y, strength) {
    const c = burstColor(x);
    splat.x = x;
    splat.y = y;
    splat.t = 0;
    splat.life = 1.0 + Math.random() * 0.7;
    splat.strength = strength == null ? 0.7 : strength;
    splat.r = c[0];
    splat.g = c[1];
    splat.b = c[2];
  }

  function pointerMove(e) {
    pointer.tx = Math.min(1, Math.max(0, e.clientX / window.innerWidth));
    pointer.ty = Math.min(1, Math.max(0, 1 - e.clientY / window.innerHeight));
    pointer.active = true;
  }
  window.addEventListener("pointermove", pointerMove, { passive: true });
  window.addEventListener("pointerdown", (e) => {
    if (!heroVisible) return;
    if (e.target && e.target.closest && e.target.closest("button,a")) return;
    pointerMove(e);
    pointer.x = pointer.tx;
    pointer.y = pointer.ty;
    triggerBurst(pointer.tx, pointer.ty, 1.0);
  }, { passive: true });

  window.addEventListener("keydown", (e) => {
    if (!heroVisible) return;
    if (document.querySelector("dialog[open]")) return;
    if (e.target && e.target.closest && e.target.closest("button,a")) return;
    if (e.key === " " && !e.repeat) {
      e.preventDefault();
      triggerBurst(0.2 + Math.random() * 0.6, 0.25 + Math.random() * 0.35, 0.85);
    }
  });

  function renderTo(target, program) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, target ? target.w : canvas.width, target ? target.h : canvas.height);
    gl.useProgram(program.p);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function stepSim(dt, init) {
    const src = sim.a;
    const dst = sim.b;
    gl.useProgram(P.sim.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(P.sim.u.uPrev, 0);
    gl.uniform2f(P.sim.u.uTexel, 1 / sim.w, 1 / sim.h);
    gl.uniform2f(P.sim.u.uAspect, sim.w / sim.h, 1);
    gl.uniform1f(P.sim.u.uTime, simTime);
    gl.uniform1f(P.sim.u.uDt, dt);
    gl.uniform1f(P.sim.u.uInit, init ? 1 : 0);
    const st = splat.strength * Math.max(0, 1 - splat.t / splat.life);
    gl.uniform2f(P.sim.u.uSplatPos, splat.x, splat.y);
    gl.uniform1f(P.sim.u.uSplat, st);
    gl.uniform3f(P.sim.u.uSplatColor, splat.r, splat.g, splat.b);
    renderTo(dst, P.sim);
    const tmp = sim.a;
    sim.a = sim.b;
    sim.b = tmp;
    // dst now holds the newest state in sim.a
  }

  function warmup(count) {
    gl.useProgram(P.sim.p);
    for (let i = 0; i < count; i++) {
      stepSim(1 / 60, i === 0);
      simTime += 1 / 60;
    }
  }

  function makeSim(w, h) {
    if (sim) {
      freeRT(sim.a);
      freeRT(sim.b);
    }
    sim = { w, h, a: rt(w, h), b: rt(w, h) };
  }

  function resize() {
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.2 : 1.4);
    const maxPixels = coarse ? 9.5e5 : 1.65e6;
    let scale = dpr;
    if (vw * vh * dpr * dpr > maxPixels) scale = Math.sqrt(maxPixels / (vw * vh));
    scale = Math.max(0.55, scale);
    const w = Math.max(320, Math.round(vw * scale));
    const h = Math.max(240, Math.round(vh * scale));
    if (w === renderW && h === renderH && sceneRT) return;

    renderW = w;
    renderH = h;
    canvas.width = w;
    canvas.height = h;

    freeRT(sceneRT);
    freeRT(bloomA);
    freeRT(bloomB);
    sceneRT = rt(w, h);
    const bw = Math.max(1, Math.round(w / 4));
    const bh = Math.max(1, Math.round(h / 4));
    bloomA = rt(bw, bh);
    bloomB = rt(bw, bh);

    const targetPixels = coarse ? 250000 : 380000;
    let simH = Math.sqrt(targetPixels * (h / w));
    simH = Math.round(Math.min(coarse ? 520 : 640, Math.max(260, simH)));
    let simW = Math.round(simH * (w / h));
    simW = Math.min(1100, Math.max(128, simW));
    makeSim(simW, simH);

    simTime = 0;
    pointer.x = pointer.tx;
    pointer.y = pointer.ty;
    burst.t = 10;
    burst.strength = 0;
    warmup(coarse ? 30 : 46);
    introStart = performance.now();
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 180);
  }, { passive: true });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    running = false;
  });
  canvas.addEventListener("webglcontextrestored", () => location.reload());

  resize();
  body.classList.add("ready");
  if (reduceMotion) document.documentElement.style.setProperty("--motion", "0");

  const masthead = document.querySelector(".masthead");
  if ("IntersectionObserver" in window && masthead) {
    new IntersectionObserver((entries) => {
      const entry = entries[0];
      heroVisible = !!entry.isIntersecting;
      if (heroVisible) last = performance.now();
    }, { threshold: 0.01 }).observe(masthead);
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!heroVisible) { last = now; return; }
    const dtRaw = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    const dt = reduceMotion ? dtRaw * 0.32 : dtRaw;
    simTime += dt;

    // smooth pointer and derive a stable velocity
    const prevX = pointer.x;
    const prevY = pointer.y;
    const ease = 1 - Math.pow(0.0025, Math.max(dt, 0.001));
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;
    if (dt > 0.0001) {
      pointer.vx = (pointer.x - prevX) / dt;
      pointer.vy = (pointer.y - prevY) / dt;
      const vmax = 2.2;
      const vm = Math.hypot(pointer.vx, pointer.vy);
      if (vm > vmax) {
        pointer.vx *= vmax / vm;
        pointer.vy *= vmax / vm;
      }
    }

    if (burst.t < 20) burst.t += dt;
    if (splat.t < 20) splat.t += dt;

    if (!reduceMotion && now > nextAuto) {
      triggerSplat(0.14 + Math.random() * 0.72, 0.16 + Math.random() * 0.48, 0.5 + Math.random() * 0.3);
      nextAuto = now + 4800 + Math.random() * 3400;
    }

    stepSim(dt, false);

    const intro = Math.min(1, Math.max(0, (now - introStart) / 3300));
    const introEase = intro * intro * (3 - 2 * intro);

    gl.useProgram(P.scene.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sim.a.tex);
    gl.uniform1i(P.scene.u.uState, 0);
    gl.uniform2f(P.scene.u.uRes, canvas.width, canvas.height);
    gl.uniform2f(P.scene.u.uStateRes, sim.w, sim.h);
    gl.uniform1f(P.scene.u.uTime, simTime);
    gl.uniform2f(P.scene.u.uPointer, pointer.x, pointer.y);
    gl.uniform2f(P.scene.u.uPointerVel, pointer.vx, pointer.vy);
    gl.uniform2f(P.scene.u.uBurstPos, burst.x, burst.y);
    gl.uniform1f(P.scene.u.uBurst, burst.strength * Math.pow(Math.max(0, 1 - burst.t / burst.life), 1.35));
    gl.uniform1f(P.scene.u.uIntro, introEase);
    renderTo(sceneRT, P.scene);

    gl.useProgram(P.bright.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneRT.tex);
    gl.uniform1i(P.bright.u.uScene, 0);
    gl.uniform2f(P.bright.u.uTexel, 1 / sceneRT.w, 1 / sceneRT.h);
    gl.uniform2f(P.bright.u.uRes, bloomA.w, bloomA.h);
    renderTo(bloomA, P.bright);

    gl.useProgram(P.blur.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bloomA.tex);
    gl.uniform1i(P.blur.u.uTex, 0);
    gl.uniform2f(P.blur.u.uDir, 1 / bloomA.w, 0);
    renderTo(bloomB, P.blur);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bloomB.tex);
    gl.uniform1i(P.blur.u.uTex, 0);
    gl.uniform2f(P.blur.u.uDir, 0, 1 / bloomB.h);
    renderTo(bloomA, P.blur);

    gl.useProgram(P.composite.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneRT.tex);
    gl.uniform1i(P.composite.u.uScene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bloomA.tex);
    gl.uniform1i(P.composite.u.uBloom, 1);
    gl.uniform2f(P.composite.u.uRes, canvas.width, canvas.height);
    gl.uniform1f(P.composite.u.uTime, simTime);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (firstFrame) {
      firstFrame = false;
      body.classList.add("ready");
    }
  }

  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });
})();
