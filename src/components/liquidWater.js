/*
 * Experimental "water" liquid for <model-viewer> bottles (compare with liquidSlosh.js on
 * /liquid-lab). The liquid mesh is cut at `fill` of its height and its inner faces seen through the
 * cut are painted as the surface, like liquidSlosh — but the surface moves like water in a vessel:
 *
 * - It reacts to how the bottle's motion changes (acceleration, plus a little drag while turning),
 *   so it surges against a start, swings back past level when you stop, and keeps sloshing. The
 *   drag input is smoothed and the amplitude limited softly, so the motion never jerks.
 * - The bulk swing: a main mode (water piling up against one wall — a curved surface) whose far
 *   side follows a beat later, a quicker centre-vs-walls mode and a small diagonal twist.
 * - On top of it, the surface breaks up while the water moves: ripples in three directions and
 *   small irregular bumps (stronger near the walls, where water slaps), fading as it settles.
 * - The surface is shaded from that height field: for each pixel the view ray is traced to the
 *   moving surface and lit from its slope, so ripples catch light across the whole surface, not
 *   only along the rim.
 * - Seen from the side, the band just under the waterline is the underside of the surface: lighter,
 *   with wavy streaks; no hard rim line.
 * - Body: a touch denser low down and clearer at grazing edges.
 *
 * model-viewer exposes no shader API, so the three.js scene is reached through its private `scene`
 * symbol. Uniforms are plain arrays (three accepts them), so three.js itself isn't imported.
 */
const MODE1 = { f: 1.6, zeta: 0.11 }; // main slosh: frequency (Hz), damping ratio
const MODE2 = { f: 2.9, zeta: 0.16 }; // centre vs. walls
const MODE3 = { f: 2.2, zeta: 0.14 }; // diagonal twist
const ACCEL = 0.07; // camera angular acceleration (rad/s²) → slosh force
const DRAG = 0.4; // camera angular speed (rad/s) → steady lean while turning
const MAX1 = 0.8; // soft amplitude limits (× wall rise)
const MAX2 = 0.35;
const MAX3 = 0.3;
const WALL = 0.16; // main-mode rise at the wall per unit amplitude (× liquid height)
const COUPLE = 0.25; // how much the main swing stirs the centre mode
const TWIST = 0.18; // …and the twist
const LAG = 0.12; // s — the far side of the surface follows the near side this much later
const SMOOTH = 0.09; // s — smoothing of the drag input, applied twice (mouse events arrive unevenly)
const TURN = 0.35; // s — how quickly the ripple / trailing direction follows a change of drag direction
const RIPPLE = 0.005; // ripple height at full agitation (× liquid height)
const CHOP = 0.007; // irregular bumps at full agitation (× liquid height)
const IDLE = 0.1; // the surface never goes fully glassy: share of the detail kept at rest
const SETTLE = 1.4; // s — how long the surface detail takes to calm down

const spring = ({ f, zeta }) => ({ w2: (2 * Math.PI * f) ** 2, c: 2 * zeta * 2 * Math.PI * f });
const soft = (v, lim) => lim * Math.tanh(v / lim);

// `getUp` (optional): returns the direction that should read as "up" (scene space) each frame, for bottles shown
// tilted (e.g. the canvas rotated with CSS) so the surface stays level on screen. `react` scales how
// much camera motion stirs the liquid (1 = dragging by hand).
export function attachLiquidWater(mv, { material, fill = 0.82, surface = [0.78, 0.74, 0.66], getUp, react = 1 }) {
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
  const rx = (max.x - min.x) / 2;
  const rz = (max.z - min.z) / 2;
  const mat = mesh.material;
  // onBeforeCompile runs only when three builds the program; keep the same uniform objects
  const uniforms = mat.userData.waterUniforms ?? {
    uLiqD: { value: 0 },
    uLiqC: { value: [0, 0] },
    uLiqR: { value: [1, 1] },
    uLiqM1: { value: [0, 0] }, // main mode: surface rise at the +x / +z wall (model units)
    uLiqM1Lag: { value: [0, 0] }, // main mode as it was LAG seconds ago (trailing side)
    uLiqM2: { value: [0, 0] }, // centre-vs-walls amplitude along x / z
    uLiqM3: { value: 0 }, // diagonal twist
    uLiqRip: { value: 0 },
    uLiqChop: { value: 0 },
    uLiqAgit: { value: 0 },
    uLiqDir: { value: [1, 0] },
    uLiqK: { value: 1 },
    uLiqTime: { value: 0 },
    uLiqEye: { value: [0, 1, 1] }, // camera position in the liquid's model space
    uLiqUp: { value: [0, 1, 0] }, // world up in model space (the surface is level to it)
    uLiqSurface: { value: surface },
    uLiqMinY: { value: 0 },
    uLiqH: { value: 1 },
  };
  mat.userData.waterUniforms = uniforms;
  uniforms.uLiqD.value = min.y + height * fill;
  uniforms.uLiqC.value = [(min.x + max.x) / 2, (min.z + max.z) / 2];
  uniforms.uLiqR.value = [rx, rz];
  uniforms.uLiqK.value = (2 * Math.PI * 2.5) / (2 * Math.max(rx, rz));
  uniforms.uLiqSurface.value = surface;
  uniforms.uLiqMinY.value = min.y;
  uniforms.uLiqH.value = height;

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `varying vec3 vLiqPos;\n${shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvLiqPos = position;',
    )}`;
    shader.fragmentShader = `varying vec3 vLiqPos;
uniform float uLiqD; uniform vec2 uLiqC; uniform vec2 uLiqR; uniform vec2 uLiqM1; uniform vec2 uLiqM1Lag;
uniform vec2 uLiqM2; uniform float uLiqM3; uniform float uLiqRip; uniform float uLiqChop; uniform float uLiqAgit;
uniform vec2 uLiqDir; uniform float uLiqK; uniform float uLiqTime; uniform vec3 uLiqEye; uniform vec3 uLiqUp;
uniform vec3 uLiqSurface; uniform float uLiqMinY; uniform float uLiqH;
float liqHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float liqNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(liqHash(i), liqHash(i + vec2(1.0, 0.0)), f.x),
             mix(liqHash(i + vec2(0.0, 1.0)), liqHash(i + vec2(1.0, 1.0)), f.x), f.y) - 0.5;
}
// surface height above the rest level at a point (model space xz)
float liqHeight(vec2 xz) {
  vec2 u = clamp((xz - uLiqC) / uLiqR, -1.0, 1.0);
  vec2 m1 = mix(uLiqM1, uLiqM1Lag, (0.5 - 0.5 * dot(u, uLiqDir)) * 0.85);
  float h = m1.x * sin(1.5708 * u.x) + m1.y * sin(1.5708 * u.y)
    + uLiqM2.x * cos(3.1416 * u.x) + uLiqM2.y * cos(3.1416 * u.y)
    + uLiqM3 * sin(1.5708 * u.x) * sin(1.5708 * u.y);
  vec2 p = xz * uLiqK;
  h += uLiqRip * (0.9 * sin(dot(p, vec2(0.6, 0.8)) * 0.45 + uLiqTime * 2.1)
    + sin(dot(p, uLiqDir) - uLiqTime * 7.0)
    + 0.6 * sin(dot(p, vec2(0.8, -0.6)) * 1.7 + uLiqTime * 5.3 + 1.1)
    + 0.45 * sin(dot(p, vec2(-0.3, 0.95)) * 2.3 - uLiqTime * 6.1 + 2.3));
  float edge = smoothstep(0.45, 1.0, max(abs(u.x), abs(u.y)));
  h += uLiqChop * (0.5 + edge) * (liqNoise(p * 0.8 + vec2(uLiqTime * 1.1, -uLiqTime * 0.8))
    + 0.5 * liqNoise(p * 1.9 - vec2(uLiqTime * 1.7, uLiqTime * 1.3)));
  return h;
}
${shader.fragmentShader
  .replace(
    'void main() {',
    `void main() {
  vec3 liqP0 = vec3(uLiqC.x, uLiqD, uLiqC.y);
  float liqAbove = dot(vLiqPos - liqP0, uLiqUp) - liqHeight(vLiqPos.xz);
  if (liqAbove > 0.0) discard;`,
  )
  .replace(
    '#include <dithering_fragment>',
    `#include <dithering_fragment>
  vec3 liqView = normalize(vViewPosition);
  float liqFres = pow(1.0 - clamp(abs(dot(normal, liqView)), 0.0, 1.0), 2.5);
  if (!gl_FrontFacing) {
    // trace the view ray to the moving surface, then light it from its slope
    vec3 liqRay = vLiqPos - uLiqEye;
    float liqDy = dot(liqRay, uLiqUp);
    liqDy = abs(liqDy) < 1e-5 ? 1e-5 : liqDy;
    float liqE0 = dot(uLiqEye - liqP0, uLiqUp);
    vec3 liqS3 = vLiqPos;
    float liqT = -liqE0 / liqDy;
    for (int i = 0; i < 3; i++) {
      liqS3 = uLiqEye + liqRay * liqT;
      liqT = (liqHeight(liqS3.xz) - liqE0) / liqDy;
    }
    liqS3 = uLiqEye + liqRay * liqT;
    vec2 liqS = liqS3.xz;
    float liqE = max(uLiqR.x, uLiqR.y) * 0.03;
    float liqH0 = liqHeight(liqS);
    vec2 liqG = vec2(liqHeight(liqS + vec2(liqE, 0.0)) - liqH0, liqHeight(liqS + vec2(0.0, liqE)) - liqH0) / liqE;
    vec3 liqN = normalize(uLiqUp + vec3(-liqG.x * 3.0, 0.0, -liqG.y * 3.0));
    vec3 liqV = normalize(uLiqEye - liqS3);
    vec3 liqL = normalize(vec3(0.35, 1.0, 0.45));
    float liqDiff = dot(liqN, liqL) - dot(uLiqUp, liqL);
    float liqSpec = pow(max(dot(reflect(-liqL, liqN), liqV), 0.0), 40.0);
    float liqLift = 0.18 + 0.5 * liqDiff + 0.22 * liqSpec;
    gl_FragColor = vec4(mix(uLiqSurface, vec3(1.0), clamp(liqLift, 0.06, 0.45)), gl_FragColor.a);
  } else {
    // underside of the surface seen through the wall: a soft lighter band of uneven depth with
    // wavy streaks
    vec2 liqCyl = vec2(atan(vLiqPos.z - uLiqC.y, vLiqPos.x - uLiqC.x) * max(uLiqR.x, uLiqR.y), vLiqPos.y) / uLiqH;
    float liqBelow = -liqAbove / uLiqH;
    float liqBandW = (0.03 + 0.035 * (liqNoise(vec2(liqCyl.x * 5.0 + uLiqTime * 0.4, uLiqTime * 0.3)) + 0.5)) * (0.6 + 0.6 * uLiqAgit);
    float liqBand = exp(-liqBelow / liqBandW) * (1.0 - exp(-liqBelow / 0.004));
    float liqStreak = 0.5 + 0.5 * sin(liqBelow * 140.0 + liqNoise(liqCyl * vec2(7.0, 25.0) + uLiqTime * vec2(0.5, 0.2)) * 7.0);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), liqBand * (0.14 + 0.12 * liqStreak) * (0.6 + 0.4 * uLiqAgit));
    float liqDepth = clamp((vLiqPos.y - uLiqMinY) / uLiqH, 0.0, 1.0);
    gl_FragColor.rgb *= mix(0.86, 1.05, liqDepth);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), 0.18 * liqFres);
  }`,
  )}`;
  };
  mat.customProgramCacheKey = () => 'odenior-liquid-water-10';
  mat.needsUpdate = true;

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const s1 = spring(MODE1);
  const s2 = spring(MODE2);
  const s3 = spring(MODE3);
  // model-space state per mode: position and velocity ([x, z], or [twist])
  const m1 = { p: [0, 0], v: [0, 0] };
  const m2 = { p: [0, 0], v: [0, 0] };
  const m3 = { p: [0], v: [0] };
  const hist = []; // recent main-mode positions, for the trailing side
  let agit = 0;
  let last = mv.getCameraOrbit();
  let w1 = [0, 0]; // angular velocity, smoothed once…
  let wf = [0, 0]; // …and twice (its rate of change is then smooth too)
  let dir = [1, 0];
  let prev = performance.now();
  let raf = 0;
  const wall = height * WALL;
  const cam = scene.getCamera?.() ?? scene.camera;
  const eye = cam?.position.clone();

  const step = (m, s, f, dt) => {
    for (let k = 0; k < m.p.length; k++) {
      m.v[k] += (f[k] - s.w2 * m.p[k] - s.c * m.v[k]) * dt;
      m.p[k] += m.v[k] * dt;
    }
  };
  // main mode as it was `ago` ms back, interpolated between frames
  const pastM1 = (now, ago) => {
    const t = now - ago;
    for (let i = hist.length - 1; i > 0; i--) {
      if (hist[i - 1][0] <= t) {
        const [t0, x0, z0] = hist[i - 1];
        const [t1, x1, z1] = hist[i];
        const k = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
        return [x0 + (x1 - x0) * k, z0 + (z1 - z0) * k];
      }
    }
    return hist.length ? [hist[0][1], hist[0][2]] : [0, 0];
  };

  const tick = (now) => {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    const orbit = mv.getCameraOrbit();
    if (!still && dt > 0) {
      // camera angular velocity → model space (the turntable turns the model, not the camera)
      const dTh = orbit.theta - last.theta;
      const wTh = Math.abs(dTh) < Math.PI ? dTh / dt : 0; // ignore wrap-around jumps
      const wPh = (orbit.phi - last.phi) / dt;
      const th = orbit.theta - mv.turntableRotation;
      const w = [Math.cos(th) * wTh + Math.sin(th) * wPh, -Math.sin(th) * wTh + Math.cos(th) * wPh];
      const k = 1 - Math.exp(-dt / SMOOTH);
      w1 = [w1[0] + (w[0] - w1[0]) * k, w1[1] + (w[1] - w1[1]) * k];
      const wNew = [wf[0] + (w1[0] - wf[0]) * k, wf[1] + (w1[1] - wf[1]) * k];
      const af = [(wNew[0] - wf[0]) / dt, (wNew[1] - wf[1]) / dt];
      wf = wNew;
      // water lags the vessel: pushed against the change in motion, plus a lean while turning
      const force = [0, 1].map((i) => -(ACCEL * af[i] + DRAG * wf[i]) * s1.w2 * 0.22 * react);
      const sub = 4;
      for (let i = 0; i < sub; i++) {
        step(m1, s1, force, dt / sub);
        step(m2, s2, [COUPLE * m1.v[0] * s2.c, COUPLE * m1.v[1] * s2.c], dt / sub);
        step(m3, s3, [TWIST * (m1.v[0] - m1.v[1]) * s3.c], dt / sub);
      }
      // surface detail follows how hard the water moves: rises quickly, calms over SETTLE
      const energy = Math.min(1, Math.hypot(m1.v[0], m1.v[1]) * 0.8 + Math.hypot(m2.v[0], m2.v[1]) * 0.15);
      agit += (energy - agit) * (1 - Math.exp(-dt / (energy > agit ? 0.15 : SETTLE)));
      const sp = Math.hypot(wf[0], wf[1]);
      if (sp > 0.05) {
        // turn gradually: a sudden flip would jump the ripples and the trailing side
        const kd = 1 - Math.exp(-dt / TURN);
        const d = [dir[0] + (wf[0] / sp - dir[0]) * kd, dir[1] + (wf[1] / sp - dir[1]) * kd];
        const dl = Math.hypot(d[0], d[1]);
        if (dl > 1e-3) dir = [d[0] / dl, d[1] / dl];
        uniforms.uLiqDir.value = dir;
      }
    }
    last = orbit;
    hist.push([now, m1.p[0], m1.p[1]]);
    while (hist.length > 2 && hist[1][0] < now - LAG * 1000) hist.shift();
    const lag = pastM1(now, LAG * 1000);
    uniforms.uLiqM1.value = [soft(m1.p[0], MAX1) * wall, soft(m1.p[1], MAX1) * wall];
    uniforms.uLiqM1Lag.value = [soft(lag[0], MAX1) * wall, soft(lag[1], MAX1) * wall];
    uniforms.uLiqM2.value = [soft(m2.p[0], MAX2) * wall * 0.5, soft(m2.p[1], MAX2) * wall * 0.5];
    uniforms.uLiqM3.value = soft(m3.p[0], MAX3) * wall * 0.5;
    const detail = IDLE + (1 - IDLE) * agit;
    uniforms.uLiqRip.value = detail * height * RIPPLE;
    uniforms.uLiqChop.value = detail * height * CHOP;
    uniforms.uLiqAgit.value = agit;
    uniforms.uLiqTime.value = now / 1000;
    if (cam && eye) {
      cam.getWorldPosition(eye);
      mesh.updateWorldMatrix(true, false);
      mesh.worldToLocal(eye);
      uniforms.uLiqEye.value = [eye.x, eye.y, eye.z];
    }
    const up = getUp?.();
    if (up && eye) {
      // world direction → the liquid mesh's own space
      const o = mesh.worldToLocal(eye.set(0, 0, 0)).toArray();
      const d = mesh.worldToLocal(eye.set(up[0], up[1], up[2])).toArray();
      const v = [d[0] - o[0], d[1] - o[1], d[2] - o[2]];
      const l = Math.hypot(v[0], v[1], v[2]) || 1;
      uniforms.uLiqUp.value = [v[0] / l, v[1] / l, v[2] / l];
    }
    // keep redrawing only while the bottle can be seen (stacked variants / stage bottles are
    // hidden with visibility or opacity 0 — drawing them anyway costs a full frame each)
    if (!mv.checkVisibility || mv.checkVisibility({ opacityProperty: true, visibilityProperty: true })) {
      scene.queueRender?.();
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
