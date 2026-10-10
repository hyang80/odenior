import { useEffect, useRef } from 'react';

/*
 * "향의 잔상" — the pointer leaves a soft, pale-beige mist that diffuses and fades over LIFE ms,
 * on every page. Pointer samples are interpolated every STEP px so the trail reads as one
 * continuous ribbon, and points are kept in page coordinates so the mist stays on the content
 * while scrolling.
 */
const LIFE = 1800;
const STEP = 3;
const MAX_POINTS = 600;
const COLOR = '232, 218, 198'; // pale beige
const ALPHA = 0.048;
const RADIUS = 22;
const SPREAD = 26;

const enabled = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function ScentTrail() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!enabled()) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const points = [];
    let raf = 0;
    let last = null;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      while (points.length && now - points[0].t > LIFE) points.shift();
      const sx = window.scrollX;
      const sy = window.scrollY;
      for (const p of points) {
        const age = (now - p.t) / LIFE;
        const fade = 1 - age;
        const alpha = ALPHA * fade * fade * fade;
        const radius = RADIUS + age * SPREAD;
        const x = p.x - sx;
        const y = p.y - sy;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `rgba(${COLOR}, ${alpha})`);
        grad.addColorStop(0.45, `rgba(${COLOR}, ${alpha * 0.55})`);
        grad.addColorStop(1, `rgba(${COLOR}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      raf = points.length ? requestAnimationFrame(draw) : 0;
    };

    const move = (e) => {
      const x = e.clientX + window.scrollX;
      const y = e.clientY + window.scrollY;
      const t = performance.now();
      if (!last) {
        last = { x, y, t };
        points.push({ x, y, t });
      } else {
        // Fill the gap between pointer samples so the ribbon has no holes
        const dist = Math.hypot(x - last.x, y - last.y);
        const steps = Math.floor(dist / STEP);
        for (let i = 1; i <= steps; i++) {
          const k = i / steps;
          points.push({ x: last.x + (x - last.x) * k, y: last.y + (y - last.y) * k, t: last.t + (t - last.t) * k });
        }
        if (steps) last = { x, y, t };
      }
      if (points.length > MAX_POINTS) points.splice(0, points.length - MAX_POINTS);
      if (!raf) raf = requestAnimationFrame(draw);
    };
    // Don't connect the trail across a jump (pointer left the window)
    const out = (e) => {
      if (!e.relatedTarget) last = null;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('mouseout', out);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('mouseout', out);
    };
  }, []);

  return <canvas ref={canvasRef} className="scent-trail" aria-hidden="true" />;
}
