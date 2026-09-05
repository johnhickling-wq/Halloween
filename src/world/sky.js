import * as THREE from 'three';

export class Sky {
  constructor(moonDir) {
    this.uniforms = {
      uTime: { value: 0 },
      uMoonDir: { value: moonDir.clone().normalize() },
      uDawn: { value: 0 },
      uHorizon: { value: new THREE.Color(0x182030) },
      uZenith: { value: new THREE.Color(0x03040a) },
      uCloud: { value: new THREE.Color(0x0e1119) },
      uDawnCol: { value: new THREE.Color(0xd77a3a) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 uMoonDir; uniform float uDawn;
        uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uCloud; uniform vec3 uDawnCol;
        varying vec3 vDir;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
        }
        float fbm(vec2 p) {
          float s = 0.0, a = 0.5;
          for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
          return s;
        }
        void main() {
          vec3 d = normalize(vDir);
          float y = max(d.y, 0.0);
          vec3 horizon = mix(uHorizon, uHorizon * 4.0 + vec3(0.25, 0.22, 0.2), uDawn);
          vec3 zenith = mix(uZenith, vec3(0.08, 0.12, 0.2), uDawn);
          vec3 col = mix(horizon, zenith, pow(y, 0.55));
          // dawn glow to the east (+x)
          float east = max(dot(normalize(vec3(d.x, 0.0, d.z)), vec3(1.0, 0.0, 0.0)), 0.0);
          col += uDawnCol * uDawn * pow(east, 3.0) * exp(-y * 6.0) * 1.2;
          // stars
          float starMask = smoothstep(0.03, 0.3, d.y) * (1.0 - uDawn);
          vec2 sp = d.xz / (d.y + 0.2) * 34.0;
          vec2 cell = floor(sp); vec2 f = fract(sp);
          float h = hash(cell);
          float star = 0.0;
          if (h > 0.975) {
            vec2 c = vec2(hash(cell + 1.3), hash(cell + 7.1)) * 0.6 + 0.2;
            float dd = length(f - c);
            float tw = 0.65 + 0.35 * sin(uTime * (1.5 + h * 3.0) + h * 100.0);
            star = smoothstep(0.09, 0.0, dd) * tw * (h - 0.975) / 0.025;
          }
          col += star * starMask * 1.2;
          // moon
          float md = dot(d, uMoonDir);
          float disc = smoothstep(0.99855, 0.99900, md);
          float halo = pow(max(md, 0.0), 400.0) * 0.6 + pow(max(md, 0.0), 30.0) * 0.10 + pow(max(md, 0.0), 6.0) * 0.03;
          vec3 t = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));
          vec3 b = cross(uMoonDir, t);
          vec2 muv = vec2(dot(d, t), dot(d, b)) / 0.055;
          float maria = fbm(muv * 2.5 + 3.0);
          vec3 moonCol = vec3(1.0, 0.92, 0.74) * (0.7 + 0.55 * maria);
          // clouds
          vec2 cuv = d.xz / (d.y + 0.25) * 1.3 + uTime * vec2(0.012, 0.005);
          float cl = fbm(cuv);
          cl = smoothstep(0.5, 0.8, cl);
          cl *= 1.0 - 0.85 * pow(max(md, 0.0), 40.0);
          cl *= smoothstep(0.0, 0.18, d.y);
          vec3 cloudCol = mix(uCloud, vec3(0.5, 0.45, 0.42), uDawn * 0.6);
          col = mix(col, cloudCol, cl * 0.9);
          col += cl * pow(max(md, 0.0), 12.0) * vec3(0.55, 0.5, 0.42) * 0.35;
          float moonVis = (1.0 - cl * 0.95) * (1.0 - uDawn * 0.85);
          col += (disc * moonCol * 2.3 + halo * vec3(0.8, 0.8, 0.7) * 0.8) * moonVis;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 40, 20), mat);
    this.mesh.renderOrder = -10;
    this.mesh.frustumCulled = false;
    this.mesh.name = 'sky';
  }
  update(t) { this.uniforms.uTime.value = t; }
  setDawn(v) { this.uniforms.uDawn.value = v; }
}
