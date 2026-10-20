import { useCallback, useEffect, useMemo, useRef } from 'react';
import PerfumeModel from '../components/PerfumeModel.jsx';
import { FRAMING, SERIES } from '../components/OddShowcase.jsx';
import { SPRAY_MODELS, createSprayRig, sprayPhases } from '../components/sprayRig.js';
import '../styles/spray.css';

/*
 * Experiment (/spray-lab): the AMANT bottle on a pinned stage; scrolling lifts the knot cap off,
 * turns the bottle so the nozzle faces sideways, presses the actuator down and sprays a mist
 * (sprayRig.js — the same rig plays How to use STEP 02).
 */
export default function SprayLab() {
  const series = SERIES.find((s) => s.key === 'amant');
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const mvRef = useRef(null);
  const onViewer = useCallback((mv) => {
    mvRef.current = mv;
  }, []);
  const liquid = useMemo(() => ({ ...series.liquid, react: 0.3 }), [series]);

  useEffect(() => {
    const spray = createSprayRig({ names: SPRAY_MODELS.amant, framing: FRAMING, side: 1 });
    let raf = 0;
    let prev = performance.now();
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const section = sectionRef.current;
      const canvas = canvasRef.current;
      if (!section || !canvas) return;
      const r = section.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      const ph = sprayPhases(p);
      stageRef.current.dataset.phase =
        spray.spraying || ph.press > 0.92 ? 'spray' : ph.turn > 0.3 || ph.press > 0.05 ? 'press' : ph.open > 0.05 ? 'open' : '';
      if (mvRef.current) spray.update(mvRef.current, ph, 0);
      spray.draw(canvas, dt);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <main className="page page-spray">
      <section className="spray-section" ref={sectionRef}>
        <div className="spray-stage" ref={stageRef}>
          <div className="spray-bottle">
            <PerfumeModel
              src={`${series.model}?spray`}
              poster={series.img}
              alt={`${series.name} 3D`}
              materials={series.materials}
              liquid={liquid}
              framing={FRAMING}
              shadow={0.45}
              still
              onViewer={onViewer}
              className="fill series-model"
            />
          </div>
          <canvas className="spray-mist" ref={canvasRef} aria-hidden="true" />
          <ol className="spray-steps" aria-hidden="true">
            <li className="ss-open">OPEN</li>
            <li className="ss-press">PRESS</li>
            <li className="ss-spray">SPRAY</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
