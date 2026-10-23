import { useEffect, useRef, useState } from 'react';
import { attachLiquidSlosh } from './liquidSlosh.js';
import { attachLiquidWater } from './liquidWater.js';

/*
 * Draggable 3D perfume bottle (Blender export → public/models/*.glb) rendered with
 * <model-viewer>. The library is loaded on demand so it never weighs on the first paint;
 * until the model is ready the product photo (`poster`) shows in its place.
 * Drag (or swipe) in any direction to rotate — sideways spins it a full 360° per drag across the
 * slot (orbit-sensitivity), up/down tilts it from the top view to the bottom view; when left alone it slowly turns on its own.
 *
 * To sit next to the product photos it is lit by a studio backdrop (studio-env-v2.hdr: bright top,
 * warm-grey floor, two key lights facing the front and back and dimmed patches facing the
 * sides), so front and back read the same tone and shading only falls on the sides; `materials` can
 * override colours per glTF material: { [name]: { color: [r, g, b, a] (linear), roughness,
 * metallic, emissive: [r, g, b], alphaMode, texture: null, renderOrder, clearcoat, clearcoatRoughness,
 * smooth: angle°, closeHoles: true, plug: { radius, height }, grain: { size, strength } } } (`smooth`
 * re-shades a faceted part smoothly, see smoothNormals; `closeHoles` seals an open mesh, see
 * closeHoles; `plug` adds a neck, see addNeckPlug; `grain` gives the surface a fine pebbled
 * texture, see addGrain)
 * (`texture: null` drops an exported base-colour texture; parts exported without a material are
 * listed as "Default") — a faint emissive lifts a part's shadows
 * without relighting; renderOrder pins the draw order of see-through parts (three.js otherwise sorts
 * them by distance, so the liquid would jump in front of the glass when viewed from below).
 * `shadow` (0…1) adds a soft contact shadow on the ground under the bottle.
 * `liquid` ({ material, fill, surface, style }) makes that material slosh when the bottle is dragged
 * (liquidSlosh.js; style: 'water' → the experimental liquidWater.js).
 */
/*
 * Pebbled surface (like textured frosted glass), drawn in the shader — no texture file: the
 * shading normal is tilted by the slope of a field of small rounded bumps (3D value noise with an
 * analytic slope — one cheap pass — in the part's own space, so the texture sits on the object
 * and turns with it). `size` is the
 * bump spacing in model units (m), `strength` how far the normal leans (0…1). The glossy clear
 * coat keeps the smooth geometric normal, so the sheen stays clean over the textured body —
 * as on real textured glass.
 */
function addGrain(material, { size = 0.0009, strength = 0.3 }) {
  if (material.userData.grain) return;
  material.userData.grain = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.(shader, renderer);
    shader.uniforms.uGrainScale = { value: 1 / size };
    shader.uniforms.uGrainStrength = { value: strength };
    shader.vertexShader = `varying vec3 vGrainPos; varying vec3 vGrainX; varying vec3 vGrainY; varying vec3 vGrainZ;
uniform float uGrainScale;
${shader.vertexShader.replace(
  '#include <begin_vertex>',
  `#include <begin_vertex>
  vGrainPos = position * uGrainScale;
  vGrainX = normalMatrix * vec3(1.0, 0.0, 0.0);
  vGrainY = normalMatrix * vec3(0.0, 1.0, 0.0);
  vGrainZ = normalMatrix * vec3(0.0, 0.0, 1.0);`,
)}`;
    shader.fragmentShader = `varying vec3 vGrainPos; varying vec3 vGrainX; varying vec3 vGrainY; varying vec3 vGrainZ;
uniform float uGrainStrength;
float grainHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
// slope of smooth value noise (analytic derivative, quintic fade): soft rounded bumps, one pass,
// 8 cheap hashes — no sin()
vec3 grainSlope(vec3 x) {
  vec3 i = floor(x);
  vec3 w = fract(x);
  vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
  vec3 du = 30.0 * w * w * (w * (w - 2.0) + 1.0);
  float a = grainHash(i);
  float b = grainHash(i + vec3(1.0, 0.0, 0.0));
  float c = grainHash(i + vec3(0.0, 1.0, 0.0));
  float d = grainHash(i + vec3(1.0, 1.0, 0.0));
  float e = grainHash(i + vec3(0.0, 0.0, 1.0));
  float f = grainHash(i + vec3(1.0, 0.0, 1.0));
  float g = grainHash(i + vec3(0.0, 1.0, 1.0));
  float h = grainHash(i + vec3(1.0, 1.0, 1.0));
  float k1 = b - a;
  float k2 = c - a;
  float k3 = e - a;
  float k4 = a - b - c + d;
  float k5 = a - c - e + g;
  float k6 = a - b - e + f;
  float k7 = -a + b + c - d + e - f - g + h;
  return 2.0 * du * vec3(k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z,
                         k2 + k5 * u.z + k4 * u.x + k7 * u.z * u.x,
                         k3 + k6 * u.x + k5 * u.y + k7 * u.x * u.y);
}
${shader.fragmentShader.replace(
  '#include <normal_fragment_maps>',
  `#include <normal_fragment_maps>
  {
    vec3 gG = grainSlope(vGrainPos);
    vec3 gV = gG.x * vGrainX + gG.y * vGrainY + gG.z * vGrainZ;
    normal = normalize(normal - uGrainStrength * 0.15 * (gV - dot(gV, normal) * normal));
  }`,
)}`;
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `${key ? key() : ''}|grain4:${size}:${strength}`;
  material.needsUpdate = true;
}

/*
 * Smooth shading for a faceted part: vertices that share a position (split per face by the export)
 * get the average of their normals, but only across faces within `angle`° of each other, so
 * hard rims (a cylinder's cap edge) stay crisp — like Blender's auto smooth. Shape untouched.
 */
function smoothNormals(geometry, angle) {
  if (geometry.userData.smoothed) return;
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  if (!pos || !nor) return;
  const cos = Math.cos((angle * Math.PI) / 180);
  const groups = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
    const g = groups.get(key);
    if (g) g.push(i);
    else groups.set(key, [i]);
  }
  const src = Float32Array.from(nor.array);
  const at = (i) => [src[i * 3], src[i * 3 + 1], src[i * 3 + 2]];
  groups.forEach((g) => {
    if (g.length < 2) return;
    g.forEach((i) => {
      const ni = at(i);
      let x = 0;
      let y = 0;
      let z = 0;
      g.forEach((j) => {
        const nj = at(j);
        if (ni[0] * nj[0] + ni[1] * nj[1] + ni[2] * nj[2] < cos) return;
        x += nj[0];
        y += nj[1];
        z += nj[2];
      });
      const len = Math.hypot(x, y, z) || 1;
      nor.setXYZ(i, x / len, y / len, z / len);
    });
  });
  nor.needsUpdate = true;
  geometry.userData.smoothed = true;
}

/*
 * Seal open holes in a mesh (the AMANT knot export is open where it was cut from its neck): edges
 * used by a single triangle are chained into loops and each loop is closed with a fan around its
 * centroid, wound like the surrounding faces. Adds geometry only; existing faces are untouched.
 */
function closeHoles(geometry) {
  if (geometry.userData.holesClosed) return;
  geometry.userData.holesClosed = true;
  const pos = geometry.attributes.position;
  const index = geometry.index;
  if (!pos || !index) return;
  const key = (i) => `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
  const canonOf = new Map();
  const canon = new Int32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    if (!canonOf.has(k)) canonOf.set(k, i);
    canon[i] = canonOf.get(k);
  }
  // directed edges as they appear in triangles; an edge is open when its reverse never appears
  const directed = new Map();
  const tri = index.array;
  for (let t = 0; t < tri.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = canon[tri[t + e]];
      const b = canon[tri[t + ((e + 1) % 3)]];
      directed.set(`${a}_${b}`, [a, b]);
    }
  }
  // open edges a→b, walked into closed loops (a vertex can start several open edges where two
  // holes touch, so each step takes any unused edge leaving the current vertex)
  const open = [];
  directed.forEach(([a, b]) => {
    if (!directed.has(`${b}_${a}`)) open.push([a, b]);
  });
  if (!open.length) return;
  const out = new Map();
  open.forEach((e, i) => {
    if (!out.has(e[0])) out.set(e[0], []);
    out.get(e[0]).push(i);
  });
  const used = new Uint8Array(open.length);
  const loops = [];
  for (let i = 0; i < open.length; i++) {
    if (used[i]) continue;
    const start = open[i][0];
    const loop = [];
    let e = i;
    while (e !== undefined && !used[e]) {
      used[e] = 1;
      loop.push(open[e][0]);
      const v = open[e][1];
      if (v === start) break;
      e = (out.get(v) || []).find((j) => !used[j]);
    }
    if (loop.length >= 3 && open[e]?.[1] === start) loops.push(loop);
  }
  if (!loops.length) return;

  const names = Object.keys(geometry.attributes);
  const extra = loops.length;
  const grown = {};
  names.forEach((n) => {
    const attr = geometry.attributes[n];
    const arr = new attr.array.constructor((pos.count + extra) * attr.itemSize);
    arr.set(attr.array);
    grown[n] = arr;
  });
  const newIndex = Array.from(tri);
  loops.forEach((loop, li) => {
    const c = pos.count + li;
    names.forEach((n) => {
      const attr = geometry.attributes[n];
      for (let k = 0; k < attr.itemSize; k++) {
        let sum = 0;
        loop.forEach((v) => {
          sum += attr.array[v * attr.itemSize + k];
        });
        grown[n][c * attr.itemSize + k] = sum / loop.length;
      }
    });
    // boundary edge a→b belongs to a face wound a→b, so the patch is wound b→a→centre
    let nx = 0;
    let ny = 0;
    let nz = 0;
    loop.forEach((a, i) => {
      const b = loop[(i + 1) % loop.length];
      newIndex.push(b, a, c);
      // Newell's method on the reversed loop → the patch's outward normal
      const ax = pos.getX(a);
      const ay = pos.getY(a);
      const az = pos.getZ(a);
      const bx = pos.getX(b);
      const by = pos.getY(b);
      const bz = pos.getZ(b);
      nx += (by - ay) * (bz + az);
      ny += (bz - az) * (bx + ax);
      nz += (bx - ax) * (by + ay);
    });
    if (grown.normal) {
      const len = Math.hypot(nx, ny, nz) || 1;
      grown.normal.set([-nx / len, -ny / len, -nz / len], c * 3);
    }
  });
  names.forEach((n) => {
    const attr = geometry.attributes[n];
    geometry.setAttribute(n, new attr.constructor(grown[n], attr.itemSize, attr.normalized));
  });
  geometry.setIndex(newIndex);
  geometry.computeBoundingSphere();
}

/*
 * A smooth neck plug under a knot whose export has no neck piece (AiEULE): the knot's underside
 * has a rough socket where the neck was cut out. A closed cylinder (radius, height in model
 * units) is added in the knot's own material, centred under the knot's lowest band and standing
 * on its lowest point — the same neck the other bottles ship with — so the socket is filled.
 */
function addNeckPlug(mesh, { radius, height, segments = 48 }) {
  if (mesh.userData.plugged) return;
  mesh.userData.plugged = true;
  const pos = mesh.geometry.attributes.position;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    minY = Math.min(minY, pos.getY(i));
    maxY = Math.max(maxY, pos.getY(i));
  }
  let cx = 0;
  let cz = 0;
  let n = 0;
  const band = minY + 0.03 * (maxY - minY);
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > band) continue;
    cx += pos.getX(i);
    cz += pos.getZ(i);
    n++;
  }
  cx /= n || 1;
  cz /= n || 1;
  const y0 = minY;
  const y1 = minY + height;
  const P = [];
  const N = [];
  const I = [];
  // side: a ring at the bottom and one at the top, outward normals
  for (let s = 0; s <= segments; s++) {
    const a = (s / segments) * Math.PI * 2;
    const x = Math.cos(a);
    const z = Math.sin(a);
    P.push(cx + radius * x, y0, cz + radius * z, cx + radius * x, y1, cz + radius * z);
    N.push(x, 0, z, x, 0, z);
  }
  for (let s = 0; s < segments; s++) {
    const a = s * 2;
    I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  // flat caps
  [
    [y0, -1],
    [y1, 1],
  ].forEach(([y, ny]) => {
    const c = P.length / 3;
    P.push(cx, y, cz);
    N.push(0, ny, 0);
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      P.push(cx + radius * Math.cos(a), y, cz + radius * Math.sin(a));
      N.push(0, ny, 0);
    }
    for (let s = 0; s < segments; s++) {
      if (ny < 0) I.push(c, c + 1 + s, c + 2 + s);
      else I.push(c, c + 2 + s, c + 1 + s);
    }
  });
  const Attr = pos.constructor;
  const geometry = new mesh.geometry.constructor();
  geometry.setAttribute('position', new Attr(new Float32Array(P), 3));
  geometry.setAttribute('normal', new Attr(new Float32Array(N), 3));
  geometry.setIndex(I);
  const plug = new mesh.constructor(geometry, mesh.material);
  plug.userData.plugged = true; // it shares the knot's material: never plug the plug
  plug.renderOrder = mesh.renderOrder;
  mesh.add(plug);
}

// model-viewer renders at the full device pixel ratio (4× the pixels on a Retina screen), which
// Safari's WebGL can't keep up with for these glass/liquid shaders. Cap what scripts see: the
// bottles render at 1.5× — still crisp — and nothing else on the page reads it for layout.
const MAX_DPR = 1.5;
if (typeof window !== 'undefined' && window.devicePixelRatio > MAX_DPR) {
  const real = Object.getOwnPropertyDescriptor(Window.prototype, 'devicePixelRatio')
    ?? Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
  try {
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      get: () => Math.min(MAX_DPR, real?.get ? real.get.call(window) : 1),
    });
  } catch {
    /* read-only in this browser: keep the native ratio */
  }
}

export default function PerfumeModel({
  src,
  poster,
  alt,
  className,
  materials,
  liquid,
  framing,
  only,
  still = false,
  shadow = 0,
  onViewer,
}) {
  const viewerRef = useRef(null);
  const [ready, setReady] = useState(() => typeof customElements !== 'undefined' && !!customElements.get('model-viewer'));

  useEffect(() => {
    if (ready) return undefined;
    let cancelled = false;
    import('@google/model-viewer').then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    const mv = viewerRef.current;
    if (!ready || !mv || !materials) return undefined;
    const apply = () => {
      mv.model?.materials.forEach((m) => {
        const o = materials[m.name];
        if (!o) return;
        const pbr = m.pbrMetallicRoughness;
        if (o.color) pbr.setBaseColorFactor(o.color);
        if (o.roughness != null) pbr.setRoughnessFactor(o.roughness);
        if (o.metallic != null) pbr.setMetallicFactor(o.metallic);
        if (o.emissive) m.setEmissiveFactor(o.emissive);
        if (o.alphaMode) m.setAlphaMode(o.alphaMode);
        if (o.texture === null) pbr.baseColorTexture?.setTexture(null);
      });
      // model-viewer has no public draw-order API; reach the three.js scene through its symbol
      const sceneKey = Object.getOwnPropertySymbols(mv).find((k) => k.description === 'scene');
      const scene = sceneKey && mv[sceneKey];
      scene?.traverse((obj) => {
        const o = obj.isMesh && materials[obj.material?.name];
        if (!o) return;
        if (o.renderOrder != null) obj.renderOrder = o.renderOrder;
        if (o.smooth) smoothNormals(obj.geometry, o.smooth);
        if (o.closeHoles) closeHoles(obj.geometry);
        if (o.plug) addNeckPlug(obj, o.plug);
        if (o.grain) addGrain(obj.material, o.grain);
        // glossy top coat over a matte base (three.js MeshPhysicalMaterial), colour untouched
        if (o.clearcoat != null && 'clearcoat' in obj.material) {
          obj.material.clearcoat = o.clearcoat;
          obj.material.clearcoatRoughness = o.clearcoatRoughness ?? 0.15;
        }
      });
      scene?.queueRender?.();
    };
    if (mv.loaded) apply();
    mv.addEventListener('load', apply);
    return () => mv.removeEventListener('load', apply);
  }, [ready, materials]);

  useEffect(() => {
    const mv = viewerRef.current;
    if (!ready || !mv || !liquid) return undefined;
    let detach = () => {};
    const attach = () => {
      detach();
      detach = (liquid.style === 'water' ? attachLiquidWater : attachLiquidSlosh)(mv, liquid);
    };
    if (mv.loaded) attach();
    mv.addEventListener('load', attach);
    return () => {
      mv.removeEventListener('load', attach);
      detach();
    };
  }, [ready, liquid]);

  // model-viewer turns the requested field of view into the camera's by a factor that depends on
  // each model's own bounds (and with zoom disabled it pins it to its auto value unless min = max
  // are set), so one `field-of-view` still renders differently sized knots at slightly different
  // scales. Once the model is in, pin min = max = request and nudge it until the camera's
  // effective FOV is exactly framing.fov.
  const fovTarget = framing ? parseFloat(framing.fov) : null;
  useEffect(() => {
    const mv = viewerRef.current;
    if (!ready || !mv || !fovTarget) return undefined;
    let raf = 0;
    let tries = 0;
    let requested = fovTarget;
    const calibrate = () => {
      const got = mv.getFieldOfView();
      if (Math.abs(got - fovTarget) < 0.005 || tries++ > 6) return;
      requested *= fovTarget / got;
      mv.minFieldOfView = `${requested}deg`;
      mv.maxFieldOfView = `${requested}deg`;
      mv.fieldOfView = `${requested}deg`;
      mv.jumpCameraToGoal();
      raf = requestAnimationFrame(() => requestAnimationFrame(calibrate));
    };
    const start = () => {
      tries = 0;
      raf = requestAnimationFrame(calibrate);
    };
    if (mv.loaded) start();
    mv.addEventListener('load', start);
    return () => {
      cancelAnimationFrame(raf);
      mv.removeEventListener('load', start);
    };
  }, [ready, fovTarget]);

  // `only`: material names to keep — every other part is hidden (e.g. just the knot cap)
  const onlyKey = only?.join('|');
  useEffect(() => {
    const mv = viewerRef.current;
    if (!ready || !mv || !onlyKey) return undefined;
    const keep = onlyKey.split('|');
    const apply = () => {
      const sceneKey = Object.getOwnPropertySymbols(mv).find((k) => k.description === 'scene');
      const scene = sceneKey && mv[sceneKey];
      scene?.traverse((obj) => {
        if (obj.isMesh) obj.visible = keep.includes(obj.material?.name);
      });
      scene?.queueRender?.();
    };
    if (mv.loaded) apply();
    mv.addEventListener('load', apply);
    return () => mv.removeEventListener('load', apply);
  }, [ready, onlyKey]);

  useEffect(() => {
    if (ready && viewerRef.current) onViewer?.(viewerRef.current);
  }, [ready, onViewer]);

  if (!ready) return <img src={poster} alt={alt} className={className} />;
  // `framing` ({ target, radius, fov: the camera's effective vertical FOV }) pins the camera so
  // several models render at one scale;
  // without it the camera auto-frames each model to its own bounds
  const radius = framing?.radius ?? '120%';

  return (
    <model-viewer
      ref={viewerRef}
      class={className}
      src={src}
      poster={poster}
      alt={alt}
      loading="eager"
      camera-controls={still ? undefined : ''}
      disable-zoom=""
      disable-pan=""
      touch-action="pan-y"
      orbit-sensitivity="2.1"
      interaction-prompt="none"
      auto-rotate={still ? undefined : ''}
      auto-rotate-delay="1500"
      rotation-per-second="18deg"
      camera-orbit={`0deg 80deg ${radius}`}
      min-camera-orbit={`auto 0deg ${radius}`}
      max-camera-orbit={`auto 180deg ${radius}`}
      camera-target={framing?.target}
      field-of-view={framing?.fov}
      environment-image="/models/studio-env-v2.hdr"
      tone-mapping="neutral"
      exposure="1.3"
      shadow-intensity={shadow}
      shadow-softness="1"
    />
  );
}
