export const fragmentShader = `
uniform vec2 u_resolution;
uniform sampler2D u_diffuse0;
uniform vec2 u_samplerResolution0;
uniform float u_time;
uniform vec4 u_color;
uniform float u_downSampleFidelity;

varying vec2 vUv;

const float SCALE = 5.;
const float SPEED = .00025;
const float MAX_SHIFT_AMT = .005;
const float GRADIENT_STEPS = 15.;

vec4 colorShift(sampler2D sampler, float shift, vec2 st, float backgroundLuminance) {
  vec4 unshifted = texture2D(sampler, st);

  if (backgroundLuminance > .5) {
    float ra = texture2D(sampler, st - vec2(shift, 0.)).a;
    float ba = texture2D(sampler, st + vec2(shift, 0.)).a;
    float a = max(max(ra, ba), unshifted.a);
    vec3 left = vec3(ra - unshifted.a, 0, unshifted.b);
    vec3 right = vec3(unshifted.r, 0, ba - unshifted.a);
    return vec4(left + right, a);
  }

  float r = texture2D(sampler, st - vec2(shift, 0.)).r;
  float b = texture2D(sampler, st + vec2(shift, 0.)).b;
  return vec4(r, unshifted.g, b, unshifted.a);
}

float luminance(vec4 color, vec3 background) {
  vec3 rgb = mix(background, color.rgb, color.a);
  return .2126 * rgb.r + .7152 * rgb.g + .0722 * rgb.b;
}

vec3 rgbTohsl(vec3 c) {
  float h = 0.;
  float s = 0.;
  float l = 0.;
  float r = c.r;
  float g = c.g;
  float b = c.b;
  float cMin = min(r, min(g, b));
  float cMax = max(r, max(g, b));

  l = (cMax + cMin) / 2.;
  if (cMax > cMin){
    float cDelta = cMax-cMin;

    s = l < .0 ? cDelta / (cMax + cMin) : cDelta / (2. - (cMax + cMin));

    if (r == cMax) {
      h = (g - b) / cDelta;
    } else if (g == cMax) {
      h = 2. + (b - r) / cDelta;
    } else {
      h = 4. + (r - g) / cDelta;
    }

    if (h < 0.){
      h += 6.;
    }
    h = h / 6.;
  }
  return vec3(h, s, l);
}

vec3 hslTorgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.);

  return c.z + c.y * (rgb - .5) * (1. - abs(2. * c.z - 1.));
}

vec2 downsample(vec2 st, float fidelity) {
  return floor(st * fidelity) / fidelity;
}

/*
nikat
3d simplex noise
https://www.shadertoy.com/view/XsX3zB
*/

vec4 permute(vec4 x) {
    return mod(((x * 34.) + 1.) * x, 289.);
}
vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - .85373472095314 * r;
}

float simplexNoise3d(vec3 v) {
    const vec2 C=vec2(1. / 6., 1. / 3.);
    const vec4 D=vec4(0., .5, 1., 2.);

    // First corner
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1. - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + 1. * C.xxx;
    vec3 x2 = x0 - i2 + 2. * C.xxx;
    vec3 x3 = x0 - 1. + 3. * C.xxx;

    // Permutations
    i = mod(i, 289.);
    vec4 p = permute(permute(permute(i.z + vec4(0., i1.z, i2.z, 1.)) + i.y +
    vec4(0., i1.y, i2.y, 1.)) +
    i.x + vec4(0., i1.x, i2.x, 1.));

    // Gradients
    // ( N*N points uniformly over a square,  mapped onto an octahedron.)
    float n_ = 1. / 7.; // N = 7
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49. * floor(p * ns.z * ns.z);//  mod(p, N * N)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7. * x_);// mod(j, N)

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1. - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2. + 1.;
    vec4 s1 = floor(b1) * 2. + 1.;
    vec4 sh =- step(h, vec4(0.));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    // Normalize gradients
    vec4 norm =
    taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m =
    max(.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.);
    m = m * m;

    return 42. *
    dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fractalNoise(vec2 st, float time, int fractal, float scale, int octaves) {
  st *= scale;

  if (fractal == 0) {
    return.5 + .25 * simplexNoise3d(vec3(st, time));
  }

  float fractNoise = 0.;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);// Shift scale and position eact iteration
  const int maxOctaves = 10;
  float octaveScale = 1.;

  for(int i = 0; i<maxOctaves; i++) {
    if (i <= octaves){
      octaveScale *= .5;
      fractNoise += octaveScale * simplexNoise3d(vec3(st, time));
      st = m * st;
    }
  }

  return.5 + .5 * fractNoise;
}

void main() {
  vec2 st = vUv;
  st = downsample(st, u_downSampleFidelity * 100.);
  float noise = fractalNoise(st, u_time * SPEED, 1, SCALE, 4);

  vec2 imageSt = st;
  imageSt = downsample(imageSt, u_downSampleFidelity * 500.);
  imageSt = mix(imageSt, imageSt * noise + .2, .05);

  float backgroundLuminance = luminance(u_color, vec3(1.));
  float shift = MAX_SHIFT_AMT * noise;
  vec4 image = colorShift(u_diffuse0, shift, imageSt, backgroundLuminance);

  vec2 gradientSt = mix(st, st * noise, .1);
  vec3 HSLColor = rgbTohsl(u_color.rgb);
  vec3 darkHSL = vec3(1. - HSLColor.x, HSLColor.y, min(HSLColor.z, .25));
  vec3 lightHSL = vec3(HSLColor.x, HSLColor.y, max(HSLColor.z, .75));
  vec4 colorGradient = vec4(
    mix(hslTorgb(darkHSL), hslTorgb(lightHSL), floor(gradientSt.y * GRADIENT_STEPS) * (1. / GRADIENT_STEPS)),
    u_color.a
  );

  vec4 color;
  if (backgroundLuminance > .5) {
    color = mix(colorGradient, vec4(image.rgb, 1.), image.a);
  } else {
    color = mix(colorGradient, vec4(image.rgb, image.a), image.a); // Adjust blending to avoid white background
  }

  gl_FragColor = color;
}
`;