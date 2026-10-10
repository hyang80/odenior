import { useEffect, useRef } from 'react';

/*
 * Home: hero → intro as a fog crossfade, scrubbed by the scroll through the pinned stage
 * (.home-stage, HeroIntro in Home.jsx). Fog in pale, low-chroma beige rolls in until it covers
 * the screen while the hero fades out beneath it; the intro fades in under it, then the fog thins
 * out — the even haze goes first and the cloud wisps linger and dissolve last — and the intro's
 * line starts drawing as it clears.
 * The clouds are light and shaded layers of a soft fractal-noise texture (generated once) that
 * rise with the scroll at different depths and drift slowly on their own, so the fog reads as
 * volume rather than a flat tint.
 */
const HAZE = [224, 217, 208]; // even haze underneath
const LIGHT = [250, 248, 244]; // lit cloud tops
const SHADE = [178, 169, 158]; // shaded cloud undersides
const TEX_W = 384;
const TEX_H = 192;
const RES = 0.34; // canvas pixels per CSS pixel

// Tileable (both ways) fractal value noise → RGBA cloud texture in one colour
function makeFogTexture(seed, color, contrast) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const octave = (cells) => {
    const gw = cells;
    const gh = Math.max(2, Math.round(cells / 2));
    const grid = Array.from({ length: gh * gw }, rnd);
    const at = (x, y) => grid[(y % gh) * gw + (x % gw)];
    return (u, v) => {
      const x = u * gw;
      const y = v * gh;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = x - x0;
      const fy = y - y0;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
      const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
      return a + (b - a) * sy;
    };
  };
  const layers = [octave(3), octave(6), octave(12), octave(24)];
  const weights = [0.5, 0.27, 0.15, 0.08];
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(TEX_W, TEX_H);
  for (let y = 0; y < TEX_H; y++) {
    for (let x = 0; x < TEX_W; x++) {
      const u = x / TEX_W;
      const v = y / TEX_H;
      let n = 0;
      for (let i = 0; i < layers.length; i++) n += layers[i](u, v) * weights[i];
      const a = Math.min(1, Math.max(0, (n - contrast[0]) / contrast[1]));
      const o = (y * TEX_W + x) * 4;
      img.data[o] = color[0];
      img.data[o + 1] = color[1];
      img.data[o + 2] = color[2];
      img.data[o + 3] = Math.round(a * a * (3 - 2 * a) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Runway progress (0 → 1) at which the fog has fully cleared. */
export const FOG_CLEAR = 0.82;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function CurtainMist() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const light = [makeFogTexture(1234567, LIGHT, [0.38, 0.4]), makeFogTexture(2468013, LIGHT, [0.42, 0.36])];
    const shade = [makeFogTexture(7654321, SHADE, [0.4, 0.42]), makeFogTexture(1357924, SHADE, [0.46, 0.34])];
    let raf = 0;
    let drawn = false;

    const resize = () => {
      // Fog is all soft gradients: draw it at a third of the CSS size and let the browser scale the
      // canvas up — ~10× fewer pixels per frame than at Retina resolution, so scrolling stays smooth
      const k = RES;
      canvas.width = Math.ceil(window.innerWidth * k);
      canvas.height = Math.ceil(window.innerHeight * k);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.imageSmoothingQuality = 'low';
      drawn = true; // force a clear on the next frame
    };

    // One cloud layer, tiled horizontally to cover the viewport and wrapped vertically as it rises
    const layer = (tex, alpha, scale, dx, dy) => {
      if (alpha <= 0.002) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const tw = w * scale;
      const th = h * scale;
      const ox = -(((dx % tw) + tw) % tw);
      const oy = -(((-dy % th) + th) % th) - (th - h) / 2;
      ctx.globalAlpha = alpha;
      for (let y = oy; y < h; y += th) for (let x = ox; x < w; x += tw) ctx.drawImage(tex, x, y, tw, th);
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const stage = document.querySelector('.home-stage');
      const inner = stage?.firstElementChild;
      if (!inner) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const runway = stage.offsetHeight - inner.offsetHeight; // 0 on mobile: no stage, no fog
      const xf = runway > 0 ? (window.scrollY - stage.offsetTop) / runway : -1;
      // rolls in early, stays dense through the long middle (the hero → intro swap happens in
      // there), then the haze leaves first and the cloud wisps last — gone by FOG_CLEAR, leaving
      // the rest of the runway clear for the intro line to draw (HeroIntro)
      const dense = smooth(0.0, 0.22, xf) * (1 - smooth(0.5, 0.74, xf));
      const haze = smooth(0.02, 0.2, xf) * (1 - smooth(0.46, 0.7, xf));
      const wisps = smooth(0.0, 0.18, xf) * (1 - smooth(0.58, FOG_CLEAR, xf));
      if (dense + wisps < 0.003) {
        if (drawn) ctx.clearRect(0, 0, w, h);
        drawn = false;
        return;
      }
      drawn = true;
      const t = still ? 0 : now / 1000;
      const y = window.scrollY; // clouds rise with the page, nearer layers faster
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = haze * 0.9;
      ctx.fillStyle = `rgb(${HAZE.join(',')})`;
      ctx.fillRect(0, 0, w, h);
      layer(shade[0], dense * 0.8, 1.5, t * 18, -y * 0.35);
      layer(light[0], wisps * 0.9, 1.7, -t * 12 + 300, -y * 0.5 + 120);
      layer(shade[1], dense * 0.55, 2.3, -t * 8 + 700, -y * 0.7 - 80);
      layer(light[1], wisps * 0.8, 2.6, t * 22 + 1100, -y * 0.9 + 40);
      ctx.globalAlpha = 1;
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="curtain-mist" aria-hidden="true" />;
}
