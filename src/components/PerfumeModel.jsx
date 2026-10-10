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
 * metallic, emissive: [r, g, b], alphaMode, renderOrder, clearcoat, clearcoatRoughness } } — a faint emissive lifts a part's shadows
 * without relighting; renderOrder pins the draw order of see-through parts (three.js otherwise sorts
 * them by distance, so the liquid would jump in front of the glass when viewed from below).
 * `liquid` ({ material, fill, surface }) makes that material slosh when the bottle is dragged
 * (liquidSlosh.js).
 */
export default function PerfumeModel({ src, poster, alt, className, materials, liquid }) {
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
      });
      // model-viewer has no public draw-order API; reach the three.js scene through its symbol
      const sceneKey = Object.getOwnPropertySymbols(mv).find((k) => k.description === 'scene');
      const scene = sceneKey && mv[sceneKey];
      scene?.traverse((obj) => {
        const o = obj.isMesh && materials[obj.material?.name];
        if (!o) return;
        if (o.renderOrder != null) obj.renderOrder = o.renderOrder;
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

  if (!ready) return <img src={poster} alt={alt} className={className} />;

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
      camera-orbit="0deg 80deg 120%"
      min-camera-orbit="auto 0deg 120%"
      max-camera-orbit="auto 180deg 120%"
      environment-image="/models/studio-env-v2.hdr"
      tone-mapping="neutral"
      exposure="1.3"
      shadow-intensity="0"
    />
  );
}
