import { useCallback, useEffect, useRef } from 'react';
import PerfumeModel from '../components/PerfumeModel.jsx';
import { SERIES } from '../components/OddShowcase.jsx';
import '../styles/motion.css';

/*
 * Figma 1:258 "Frame 91" — scroll-driven 3D knot study (8030 tall: three 2560px frames).
 * Each frame pins a full-screen stage. While the frame scrolls past, its knot cap comes down the
 * screen from near the top to near the bottom along an even S — own side → opposite → own side —
 * slowly turning one full 360° on the way. The motion trails the scroll
 * slightly (damped follow) so it glides. Each knot starts and ends on its front view; in between the
 * camera looks from above, so the knots' cut undersides never face the viewer.
 *
 * The caps are the real 3D knots from the bottle models with everything but the cap and its neck
 * hidden (the neck fills the socket under the knot).
 */
// side: where the knot sits in Figma (1 = right, -1 = left)
const KNOTS = [
  { key: 'nerile', side: 1, target: '-0.005m 0.043m 0.0025m' },
  { key: 'aieule', side: -1, target: '-0.003m 0.0425m -0.001m' },
  { key: 'amant', side: 1, target: '-0.0035m 0.044m 0m' },
];
const SWINGS = 2; // half-periods per frame: own → opposite → own
const AMP = 520; // horizontal swing from the centre line (design px)
// transparent 1×1 stand-in until model-viewer loads (no photo poster for a lone cap)
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const BOX = 270; // model box (design px), centred on the path
const TOP = 0.2; // descent: from 20% of the screen height…
const BOTTOM = 0.8; // …to 80%
const DEPTH = 0.1; // slight scale swing: nearer (bigger) mid-swing
const FOLLOW = 4; // 1/s — how fast the motion catches up with the scroll

const capOf = (materials) =>
  Object.keys(materials).find((k) => !['Material.005', 'Material.006', 'Default'].includes(k));

function KnotFrame({ knot }) {
  const series = SERIES.find((s) => s.key === knot.key);
  const frameRef = useRef(null);
  const boxRef = useRef(null);
  const mvRef = useRef(null);
  const onViewer = useCallback((mv) => {
    mvRef.current = mv;
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    const box = boxRef.current;
    if (!frame || !box) return undefined;
    const { side } = knot;
    let p = 0;
    let prev = performance.now();
    let raf = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const r = frame.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -vh || r.top > vh * 2) return; // far off screen
      const target = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - vh)));
      p += (target - p) * (1 - Math.exp(-FOLLOW * dt));
      const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zoom')) || 1;
      const th = p * Math.PI * SWINGS;
      const x = 720 + side * AMP * Math.cos(th);
      const y = (vh * (TOP + (BOTTOM - TOP) * p)) / z;
      const s = 1 + DEPTH * Math.abs(Math.sin(th));
      box.style.transform = `translate3d(${(x - BOX / 2) * z}px, ${(y - BOX / 2) * z}px, 0) scale(${s.toFixed(4)})`;
      const mv = mvRef.current;
      if (mv) {
        // one slow turn over the whole frame, starting and ending on the front view (0°, eye
        // level); in between the camera rises to 64° from the top, never below the knot
        mv.cameraOrbit = `${(-side * p * 360).toFixed(2)}deg ${(90 - 26 * Math.sin(Math.PI * p)).toFixed(2)}deg 0.115m`;
        mv.jumpCameraToGoal();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [knot]);

  return (
    <section className="motion-frame" ref={frameRef}>
      <div className="motion-stage">
        <div className="motion-knot" ref={boxRef}>
          <PerfumeModel
            src={series.model}
            poster={BLANK}
            alt={`${series.name} 캡 오브제`}
            materials={series.materials}
            only={[capOf(series.materials), 'Default']}
            framing={{ target: knot.target, radius: '0.115m', fov: '30deg' }}
            still
            onViewer={onViewer}
            className="fill motion-model"
          />
        </div>
      </div>
    </section>
  );
}

export default function ObjectMotion() {
  return (
    <main className="page page-motion">
      {KNOTS.map((k) => (
        <KnotFrame key={k.key} knot={k} />
      ))}
    </main>
  );
}
