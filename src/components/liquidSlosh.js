/*
 * Sloshing liquid for <model-viewer> bottles. The liquid mesh is cut by a plane at `fill` of its
 * height (shader discard); its inner faces seen through the cut are painted as a flat surface.
 * Dragging the camera kicks a damped spring that tilts the plane against the motion and adds a
 * small ripple, so the surface swings and settles like liquid in a moved bottle. Auto-rotate turns
 * the model itself (turntable), not the camera, so it never sloshes.
 *
 * model-viewer exposes no shader API, so the three.js scene is reached through its private
 * `scene` symbol (same as PerfumeModel's renderOrder). Uniforms are plain arrays (three accepts
 * them), so three.js itself isn't imported.
 */
const SPRING = 45; // stiffness
const DAMPING = 2.6;
const KICK = 2.6; // how strongly camera speed (rad/s) pushes the surface
const MAX_TILT = 0.35; // ~19°

export function attachLiquidSlosh(mv, { material, fill = 0.82, surface = [0.78, 0.74, 0.66] }) {
  const sceneKey = Object.getOwnPropertySymbols(mv).find((k) => k.description === 'scene');
  const scene = sceneKey && mv[sceneKey];
  let mesh = null;
  scene?.traverse((obj) => {
    if (obj.isMesh && obj.material?.name === material) mesh = obj;
  });
  if (!mesh) return () => {};

  mesh.geometry.computeBoundingBox();
  const { min, max } = mesh.geometry.boundingBox;
  const height = max.y - min.y;
  const mat = mesh.material;
  // three.js runs onBeforeCompile only when it builds a program; a re-attach (hot reload, remount)
  // reuses the cached program, so the uniform objects must stay the same ones it was built with
  const uniforms = mat.userData.liquidUniforms ?? {
    uLiqN: { value: [0, 1, 0] },
    uLiqD: { value: min.y + height * fill },
    uLiqRipple: { value: 0 },
    uLiqTime: { value: 0 },
    uLiqK: { value: (2 * Math.PI * 1.2) / (max.x - min.x) },
    uLiqSurface: { value: surface },
  };
  mat.userData.liquidUniforms = uniforms;
  uniforms.uLiqD.value = min.y + height * fill;
  uniforms.uLiqSurface.value = surface;

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `varying vec3 vLiqPos;\n${shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvLiqPos = position;',
    )}`;
    shader.fragmentShader = `varying vec3 vLiqPos;
uniform vec3 uLiqN; uniform float uLiqD; uniform float uLiqRipple; uniform float uLiqTime;
uniform float uLiqK; uniform vec3 uLiqSurface;
${shader.fragmentShader
  .replace(
    'void main() {',
    `void main() {
  float liqWave = sin(vLiqPos.x * uLiqK + uLiqTime * 5.0) + 0.6 * sin(vLiqPos.z * uLiqK * 1.3 - uLiqTime * 4.0);
  if (dot(vLiqPos, uLiqN) - uLiqD - liqWave * uLiqRipple > 0.0) discard;`,
  )
  .replace(
    '#include <dithering_fragment>',
    '#include <dithering_fragment>\n  if (!gl_FrontFacing) gl_FragColor = vec4(uLiqSurface, gl_FragColor.a);',
  )}`;
  };
  mat.customProgramCacheKey = () => 'odenior-liquid-slosh';
  mat.needsUpdate = true;

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = mv.getCameraOrbit();
  let prev = performance.now();
  let tx = 0;
  let vx = 0;
  let tz = 0;
  let vz = 0;
  let raf = 0;
  const clamp = (v) => Math.max(-MAX_TILT, Math.min(MAX_TILT, v));

  const tick = (now) => {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    const orbit = mv.getCameraOrbit();
    if (!still && dt > 0) {
      // the liquid lags behind the camera's swing, then springs back
      vx -= (orbit.theta - last.theta) * KICK;
      vz -= (orbit.phi - last.phi) * KICK;
      vx += (-SPRING * tx - DAMPING * vx) * dt;
      vz += (-SPRING * tz - DAMPING * vz) * dt;
      tx = clamp(tx + vx * dt);
      tz = clamp(tz + vz * dt);
    }
    last = orbit;

    // tilt sideways / towards the viewer, expressed in the model's (turntable-rotated) space
    const th = orbit.theta - mv.turntableRotation;
    const nx = Math.cos(th) * tx + Math.sin(th) * tz;
    const nz = -Math.sin(th) * tx + Math.cos(th) * tz;
    const len = Math.hypot(nx, 1, nz);
    uniforms.uLiqN.value = [nx / len, 1 / len, nz / len];
    uniforms.uLiqRipple.value = Math.min(1, Math.hypot(tx, tz) * 2) * height * 0.04;
    uniforms.uLiqTime.value = now / 1000;
    if (Math.abs(tx) + Math.abs(tz) + Math.abs(vx) + Math.abs(vz) > 1e-4) scene.queueRender?.();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(raf);
}
