import { useEffect, useRef, useState } from 'react';
import { attachLiquidSlosh } from './liquidSlosh.js';

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
 * smooth: angle° } } (`smooth` re-shades a faceted part smoothly, see smoothNormals)
 * (`texture: null` drops an exported base-colour texture; parts exported without a material are
 * listed as "Default") — a faint emissive lifts a part's shadows
 * without relighting; renderOrder pins the draw order of see-through parts (three.js otherwise sorts
 * them by distance, so the liquid would jump in front of the glass when viewed from below).
 * `liquid` ({ material, fill, surface }) makes that material slosh when the bottle is dragged
 * (liquidSlosh.js).
 */
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

export default function PerfumeModel({ src, poster, alt, className, materials, liquid, framing }) {
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
      detach = attachLiquidSlosh(mv, liquid);
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
      camera-controls=""
      disable-zoom=""
      disable-pan=""
      touch-action="pan-y"
      orbit-sensitivity="2.1"
      interaction-prompt="none"
      auto-rotate=""
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
      shadow-intensity="0"
    />
  );
}
