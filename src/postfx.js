import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uFear: { value: 0 },
    uDark: { value: 0 },
    uPulse: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uFear; uniform float uDark; uniform float uPulse; uniform vec2 uResolution;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      vec2 d = uv - 0.5;
      float r2 = dot(d, d);
      // subtle barrel-ish chromatic aberration, stronger with fear
      float ca = (0.0018 + uFear * 0.007) * r2 * 4.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + d * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - d * ca).b;
      // grade: lift shadows toward teal, keep warm highlights
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(lum), 0.12 + uFear * 0.25);
      col += vec3(-0.012, 0.004, 0.02) * (1.0 - lum);
      // film grain
      float g = hash(uv * uResolution * 0.5 + fract(uTime) * 61.0);
      col += (g - 0.5) * (0.045 + uFear * 0.06);
      // vignette (breathes with the heartbeat)
      float v = smoothstep(1.05, 0.2, r2 * (1.55 + uFear * 1.1 + uPulse * 0.5));
      col *= mix(0.25, 1.0, v);
      col *= 1.0 - uDark;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class PostFX {
  constructor(renderer, scene, camera, quality) {
    this.renderer = renderer;
    this.quality = quality;
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    const size = renderer.getSize(new THREE.Vector2());
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.5, 0.82);
    this.bloom.enabled = quality !== 'low';
    this.composer.addPass(this.bloom);
    this.output = new OutputPass();
    this.composer.addPass(this.output);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.fxaa = new FXAAPass();
    this.fxaa.enabled = quality !== 'low';
    this.composer.addPass(this.fxaa);
    this.setSize(size.x, size.y);
  }
  setSize(w, h) {
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    this.grade.uniforms.uResolution.value.set(w * pr, h * pr);
  }
  render(t, fear, dark, pulse) {
    const u = this.grade.uniforms;
    u.uTime.value = t; u.uFear.value = fear; u.uDark.value = dark; u.uPulse.value = pulse;
    this.composer.render();
  }
}
