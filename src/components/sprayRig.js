/*
 * Scroll-driven perfume spray for a <model-viewer> bottle that carries its spray pump under the cap
 * (used by /spray-lab and How to use STEP 02). Over a progress p (0…1): the cap lifts off and
 * drifts away, the camera turns the orifice sideways while closing in on the pump, the actuator is
 * pressed down and a fine mist bursts out, then it springs back.
 *
 * Cap and pump are moved through model-viewer's private `scene` symbol. The pump gets its own
 * chrome material: pressed in the vertex shader (vertices above the collar move down, so the collar
 * stays put), and drained of the warm studio tint with crisp studio reflections added in the
 * fragment shader. The mist is drawn in 2D on a canvas over the stage from the orifice projected to
 * the screen: a wide fan of very fine round droplets in a very pale ivory-beige with a faint haze.
 */
// three.js drops the dots from glTF node names
export const SPRAY_MODELS = {
  amant: { pump: 'bottle_size-checkver002', cap: 'Cylinder006' },
  aieule: { pump: 'pump', cap: 'knot+sculpture+3d+model002' }, // aieule-spray.glb (AMANT's pump added)
};
const ORIFICE = [-0.00445, 0.0335, 0.0074]; // model space, on the actuator's +z face
const PRESS_CUT = 0.03; // actuator vertices above this height (model units) move when pressed
const PRESS_DEPTH = 0.0026;
const CAP_LIFT = 0.05; // how far the cap rises before drifting away
const PHI = 78;
const BURST = 0.6; // s the spray lasts per press
// while turning, the camera closes in on the pump (radius in m, target y in m)
const NEAR = { radius: 0.16, targetY: 0.024 };
const TURN = 58; // deg the bottle turns to put the orifice side-on

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => t * t * (3 - 2 * t);
const span = (p, a, b) => ease(clamp01((p - a) / (b - a)));

/** Phases of the sequence over its progress p (0…1). */
export function sprayPhases(p) {
  const open = span(p, 0.08, 0.32); // cap lifts and drifts away
  const turn = span(p, 0.3, 0.5); // orifice turns side-on, camera closes in
  const press = span(p, 0.55, 0.66) * (1 - span(p, 0.8, 0.9)); // pressed, then released
  return { open, turn, press };
}

function chrome(material, uniforms) {
  const mat = material.clone();
  mat.color.setRGB(0.78, 0.8, 0.83);
  mat.metalness = 1;
  mat.roughness = 0.04;
  mat.envMapIntensity = 2.4;
  mat.emissive?.setRGB(0, 0, 0);
  if ('clearcoat' in mat) {
    mat.clearcoat = 1;
    mat.clearcoatRoughness = 0.02;
  }
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `uniform float uPress; uniform float uCut;\n${shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nif (position.y > uCut) transformed.y -= uPress;',
    )}`;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
  {
    vec3 cR = reflect(normalize(vViewPosition), normalize(normal));
    vec3 col = gl_FragColor.rgb;
    col = mix(col, vec3(dot(col, vec3(0.299, 0.587, 0.114))), 0.9); // neutral, no warm cast
    col *= vec3(0.98, 0.995, 1.02);
    float horizon = smoothstep(-0.12, 0.0, cR.y) * (1.0 - smoothstep(0.12, 0.3, cR.y));
    float top = smoothstep(0.5, 0.58, cR.y) * (1.0 - smoothstep(0.8, 0.9, cR.y));
    float side = smoothstep(0.78, 0.86, cR.x) * (1.0 - smoothstep(0.97, 1.0, cR.x));
    float rim = smoothstep(0.8, 0.9, -cR.x) * 0.5;
    col = mix(col, col * 0.35, horizon * 0.75);
    col += vec3(1.0) * (top * 0.9 + side * 0.8 + rim * 0.6);
    gl_FragColor.rgb = min(col, vec3(1.0));
  }`,
    );
  };
  mat.customProgramCacheKey = () => 'odenior-pump-chrome';
  return mat;
}

/**
 * A spray rig for one bottle. `names` from SPRAY_MODELS; `framing` is the PerfumeModel framing the
 * camera starts from; `side` 1 sprays to the screen's right, -1 to the left; `phi` the camera's
 * elevation (deg).
 * update(mv, phases, baseTheta) poses cap / pump / camera (baseTheta: the camera's turn before the
 * sequence takes over, deg); draw(canvas, dt) paints the mist (call every frame).
 */
export function createSprayRig({ names, framing, side = 1, phi = PHI }) {
  let rig = null;
  let theta = 0;
  let wasDown = false;
  let burst = 0;
  const parts = [];
  let glow = 0;
  let glowAt = null;

  const setup = (mv) => {
    if (!mv?.loaded) return null;
    const key = Object.getOwnPropertySymbols(mv).find((k) => k.description === 'scene');
    const scene = key && mv[key];
    const cap = scene?.getObjectByName(names.cap);
    const pump = scene?.getObjectByName(names.pump);
    if (!cap || !pump?.isMesh) return null;
    const uniforms = { uPress: { value: 0 }, uCut: { value: PRESS_CUT } };
    pump.material = chrome(pump.material, uniforms); // own copy: it may share the cap sleeve's
    return { mv, scene, cap, pump, uniforms, camera: scene.getCamera?.() ?? scene.camera, capY: cap.position.y, capX: cap.position.x };
  };

  const project = (local) => {
    const v = rig.camera.position.clone().set(...local);
    rig.pump.localToWorld(v);
    v.project(rig.camera);
    const rect = rig.mv.getBoundingClientRect();
    return [rect.left + (v.x * 0.5 + 0.5) * rect.width, rect.top + (-v.y * 0.5 + 0.5) * rect.height];
  };

  return {
    get ready() {
      return !!rig;
    },
    get spraying() {
      return burst > 0;
    },
    /** the camera's turn (deg) set by the last update */
    get theta() {
      return theta;
    },
    update(mv, { open, turn, press }, baseTheta = 0) {
      if (!rig || rig.mv !== mv) rig = setup(mv);
      if (!rig) return;
      rig.cap.position.y = rig.capY + CAP_LIFT * open;
      rig.cap.position.x = rig.capX + side * 0.03 * Math.max(0, open - 0.5) * 2;
      rig.cap.rotation.z = -side * 0.5 * Math.max(0, open - 0.4);
      rig.cap.visible = open < 0.999;
      rig.uniforms.uPress.value = PRESS_DEPTH * press;
      const r0 = parseFloat(framing.radius);
      const radius = `${(r0 + (NEAR.radius - r0) * turn).toFixed(4)}m`;
      const [tx, ty0, tz] = framing.target.split(' ').map(parseFloat);
      mv.minCameraOrbit = `auto 0deg ${radius}`;
      mv.maxCameraOrbit = `auto 180deg ${radius}`;
      mv.cameraTarget = `${tx}m ${(ty0 + (NEAR.targetY - ty0) * turn).toFixed(4)}m ${tz}m`;
      theta = baseTheta + (-side * TURN - baseTheta) * turn;
      mv.cameraOrbit = `${theta.toFixed(2)}deg ${phi}deg ${radius}`;
      mv.jumpCameraToGoal();
      rig.scene.queueRender?.();
      // a burst each time the actuator reaches the bottom
      const down = press > 0.92;
      if (down && !wasDown) burst = BURST;
      wasDown = down;
    },
    draw(canvas, dt) {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(rect.width * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      if (rig && burst > 0) {
        const [ox, oy] = project(ORIFICE).map((v, k) => v - (k ? rect.top : rect.left));
        const [tx, ty] = project([ORIFICE[0], ORIFICE[1], ORIFICE[2] + 0.02]).map((v, k) => v - (k ? rect.top : rect.left));
        const dl = Math.hypot(tx - ox, ty - oy) || 1;
        const dir = [(tx - ox) / dl, (ty - oy) / dl];
        const scale = rect.width / 1400;
        burst = Math.max(0, burst - dt);
        const n = Math.round(9000 * dt * (0.35 + 0.65 * Math.min(1, burst / (BURST * 0.6))));
        for (let i = 0; i < n; i++) {
          const a = (Math.random() + Math.random() + Math.random() - 1.5) * 0.72; // ≈ ±55°, packed in the middle
          const sp = (720 + Math.random() ** 0.8 * 2500) * scale;
          const c = Math.cos(a);
          const sn = Math.sin(a);
          const big = Math.random() < 0.08;
          parts.push({
            x: ox,
            y: oy,
            vx: (dir[0] * c - dir[1] * sn) * sp,
            vy: (dir[0] * sn + dir[1] * c) * sp,
            life: 0,
            max: 0.9 + Math.random() * 1.3,
            r: (big ? 1.1 + Math.random() * 0.9 : 0.4 + Math.random() * 0.6) * Math.max(1, scale),
            a: 0.45 + Math.random() * 0.45,
          });
        }
        glow = Math.min(1, glow + dt * 8);
        glowAt = { x: ox, y: oy, dir, scale };
      } else {
        glow = Math.max(0, glow - dt * 2.5);
      }
      if (glow > 0 && glowAt) {
        const { x, y, dir, scale } = glowAt;
        const cx = x + dir[0] * 150 * scale;
        const cy = y + dir[1] * 150 * scale;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 240 * scale);
        g.addColorStop(0, `rgba(244, 236, 214, ${0.2 * glow})`);
        g.addColorStop(1, 'rgba(244, 236, 214, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - 240 * scale, cy - 240 * scale, 480 * scale, 480 * scale);
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.life += dt;
        if (q.life > q.max) {
          parts.splice(i, 1);
          continue;
        }
        const drag = Math.exp(-6 * dt);
        q.vx *= drag;
        q.vy = q.vy * drag + 12 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        const t = q.life / q.max;
        const alpha = q.a * Math.min(1, q.life * 30) * (1 - t) ** 1.3;
        ctx.fillStyle = `rgba(228, 216, 182, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };
}
