import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useVariant } from '../hooks/useVariant.js';
import { useInViewOnce } from '../hooks/useReveal.js';
import PerfumeModel from '../components/PerfumeModel.jsx';
import { FRAMING, SERIES } from '../components/OddShowcase.jsx';
import { SPRAY_MODELS, createSprayRig, sprayPhases } from '../components/sprayRig.js';
import '../styles/howto.css';

/*
 * Figma 1:375 "Frame 90" — HOW TO USE (1440×4543). The three bottle photos are replaced by the
 * 3D bottles: one pinned stage follows the scroll down the steps. The bottle on it leans 20°
 * and turns on its own axis with the scroll; between steps it hands over to the next bottle —
 * the old one drifts up and fades out, then the new one rises in from below — while the lean
 * swings through upright to the next step's side. Each step's copy rides on the stage with its
 * bottle and hands over the same way. Each bottle faces front when it sits where Figma places it.
 *
 * STEP 02 holds the stage for HOLD px (added to the Figma layout; everything below moves down by
 * it) and plays the spray on AiEULE while you scroll through it (sprayRig.js, as on /spray-lab):
 * the bottle straightens, the knot cap lifts off, the camera closes in on the chrome pump turned
 * side-on, it is pressed and a mist bursts out to the left (away from the copy), then the camera
 * eases back out before the hand-over to STEP 03.
 */
const HOLD = 1400;

// per step: the bottle (SERIES key), its centre on the 1440 canvas (Figma image 511/514/515,
// nudged away from the copy so the leaning bottle clears it), its lean (CSS deg, + = clockwise)
// and the copy beside it (Figma 1:379–1:381; x = its left edge)
const STEPS = [
  {
    key: 'nerile',
    x: 730,
    y: 1202,
    tilt: -20,
    copy: {
      x: 98,
      label: 'STEP 01',
      lines: ['보틀 하단의 비정형 굴곡을 따라', '손가락을 가볍게 얹어 쥐어주세요.', '', '손바닥의 온기와 자연스럽게 맞물리는', '안정적인 그립감을 느껴보세요.'],
    },
  },
  {
    key: 'aieule',
    x: 690,
    y: 2252,
    tilt: 20,
    hold: HOLD,
    model: '/models/aieule-spray.glb', // AiEULE with AMANT's spray pump under the knot
    spray: SPRAY_MODELS.aieule,
    copy: {
      x: 986,
      label: 'STEP 02',
      lines: ['체온이 느껴지는 맥박 부위인 목선과', '손목 안쪽, 또는 옷감에 분사해주세요.', '', '피부 또는 옷감에서 약 15–20cm 거리를 두고', '적당량을 고르게 분사합니다.'],
    },
  },
  {
    key: 'amant',
    x: 730,
    y: 3420 + HOLD,
    tilt: -20,
    copy: {
      x: 86,
      label: 'STEP 03',
      lines: ['향이 천천히 퍼지고 잔향이 머무는 동안,', '상단 캡의 형태를 손끝으로 느껴보세요.', '', '향과 촉각이 만들어내는 감각의 순간을 통해', '상대와의 연결을 천천히 마주합니다.'],
    },
  },
];
const EXIT = 300; // design px after the last step over which the last bottle leaves
const BOX = { width: 411, height: 697 }; // bottle slot, as on the home showcase
const SPIN = 0.3; // deg of turn per design px scrolled
const BAND = 420; // design px over which one bottle hands over to the next
const DRIFT = 140; // design px the bottles travel up while handing over (out above, in from below)
const COPY_DRIFT = 70; // …and the copy, a little less (it trails the bottle slightly)
const PHI = 80; // camera elevation (deg from the top), as on the home showcase

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const startOf = (s) => s.y;
const endOf = (s) => s.y + (s.hold ?? 0);
const lerp = (a, b, t) => a + (b - a) * t;

/** Scene-space direction that reads as "up" on screen, for a canvas leaning `tilt` deg. */
function upFor(theta, phi, tilt) {
  const [th, ph, a] = [theta, phi, tilt].map((d) => (d * Math.PI) / 180);
  const right = [Math.cos(th), 0, -Math.sin(th)];
  const camUp = [-Math.cos(ph) * Math.sin(th), Math.sin(ph), -Math.cos(ph) * Math.cos(th)];
  return [0, 1, 2].map((i) => -Math.sin(a) * right[i] + Math.cos(a) * camUp[i]);
}

function StageBottle({ series, state, index, model }) {
  const onViewer = useCallback(
    (mv) => {
      state.current[index].mv = mv;
    },
    [state, index],
  );
  // the liquid stays level while the canvas leans; turning on its axis barely stirs it
  const liquid = useMemo(
    () => ({
      ...series.liquid,
      react: 0.15,
      getUp: () => {
        const s = state.current[index];
        return upFor(s.theta, PHI, s.tilt);
      },
    }),
    [series, state, index],
  );
  return (
    <PerfumeModel
      src={model ?? series.model}
      poster={series.img}
      alt={`${series.name} 3D`}
      materials={series.materials}
      liquid={liquid}
      framing={FRAMING}
      still
      onViewer={onViewer}
      className="fill series-model"
    />
  );
}

export default function HowToUse() {
  // Frame 84/85: visible on load (Variant2 instance); leave +0.8s → Default (1000ms ease-out),
  // enter +0.1s → Variant2 (dissolve 500ms ease-out)
  const intro = useVariant({ initial: true, enterDelay: 100, leaveDelay: 800 });
  const canvasRef = useRef(null);
  const boxRefs = useRef([]);
  const copyRefs = useRef([]);
  const mistRef = useRef(null);
  const cautionRef = useRef(null);
  const cautionSeen = useInViewOnce(cautionRef, { threshold: 0.35, rootMargin: '0px' });
  const state = useRef(STEPS.map((s) => ({ mv: null, theta: 0, tilt: s.tilt })));
  const series = STEPS.map((s) => SERIES.find((x) => x.key === s.key));

  useEffect(() => {
    let raf = 0;
    let lastY = null;
    let prev = performance.now();
    const sprays = STEPS.map((s) => s.spray && createSprayRig({ names: s.spray, framing: FRAMING, side: -1, phi: PHI }));
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      // the mist keeps moving after the scroll stops
      sprays.forEach((r) => r && mistRef.current && r.draw(mistRef.current, dt));
      const canvas = canvasRef.current;
      if (!canvas) return;
      const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zoom')) || 1;
      // design y at the middle of the screen
      const y = (window.innerHeight / 2 - canvas.getBoundingClientRect().top) / z;
      if (y === lastY) return;
      lastY = y;
      // spray steps: progress through their hold, and the sequence's phases
      const seq = STEPS.map((s) => {
        if (!s.spray) return null;
        const p = clamp01((y - startOf(s)) / s.hold);
        const ph = sprayPhases(p);
        ph.turn *= 1 - smooth(clamp01((p - 0.9) / 0.1)); // ease back out before the hand-over
        return ph;
      });
      // a spray step stands upright while it plays
      const tiltOf = (i) => STEPS[i].tilt * (seq[i] ? 1 - seq[i].open : 1);
      // which hand-over we're in: k = step before, t = 0…1 towards step k + 1
      let k = 0;
      let t = 0;
      for (let i = 0; i < STEPS.length - 1; i++) {
        const start = (endOf(STEPS[i]) + startOf(STEPS[i + 1])) / 2 - BAND / 2;
        if (y >= start) {
          k = i;
          t = smooth(Math.min(1, (y - start) / BAND));
        }
      }
      const a = STEPS[k];
      const b = STEPS[k + 1] ?? a;
      const x = lerp(a.x, b.x, t);
      const tilt = lerp(tiltOf(k), tiltOf(Math.min(k + 1, STEPS.length - 1)), t);
      const last = STEPS.length - 1;
      // after the last step, the last bottle and its copy leave the same way
      const exit = Math.min(1, Math.max(0, (y - endOf(STEPS[last])) / EXIT));
      // out over the first 60% of the hand-over, in over the last 60%: they barely overlap
      const out = Math.min(1, t / 0.6);
      const inn = Math.max(0, (t - 0.4) / 0.6);
      STEPS.forEach((s, i) => {
        const box = boxRefs.current[i];
        const copy = copyRefs.current[i];
        if (!box || !copy) return;
        let show = 0;
        let move = 0; // -1 … 0 … 1: gone above / in place / still below
        if (i === k) {
          show = 1 - out;
          move = -smooth(out);
        } else if (i === k + 1) {
          show = inn;
          move = 1 - smooth(inn);
        }
        if (i === last && show > 0 && exit > 0) {
          show *= 1 - exit;
          move = -smooth(exit);
        }
        const scale = 0.94 + 0.06 * show;
        const op = smooth(show).toFixed(3);
        const vis = show > 0.001 ? 'visible' : 'hidden';
        box.style.opacity = op;
        box.style.visibility = vis;
        box.style.transform = `translate(${((x - BOX.width / 2) * z).toFixed(2)}px, calc(-50% + ${(move * DRIFT * z).toFixed(2)}px)) rotate(${tilt.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
        copy.style.opacity = op;
        copy.style.visibility = vis;
        copy.style.transform = `translateY(calc(-50% + ${(move * COPY_DRIFT).toFixed(2)}px))`;
        const st = state.current[i];
        // turning with the scroll before and after the step (a spray step holds still meanwhile)
        const spin = (y < startOf(s) ? y - startOf(s) : y > endOf(s) ? y - endOf(s) : 0) * SPIN;
        st.tilt = tilt;
        if (!st.mv || show <= 0.001) return;
        if (sprays[i]) {
          sprays[i].update(st.mv, seq[i], spin);
          st.theta = sprays[i].theta;
        } else {
          st.theta = spin;
          st.mv.cameraOrbit = `${st.theta.toFixed(2)}deg ${PHI}deg ${FRAMING.radius}`;
          st.mv.jumpCameraToGoal();
        }
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <main className="page page-howto">
      <section className="section howto-main">
        <div className="canvas howto-canvas" ref={canvasRef}>
          {/* chapter marks for the scroll progress line (ScrollProgress.jsx) */}
          {STEPS.map((s) => (
            <span key={s.key} className="abs howto-anchor" style={{ top: s.y }} data-progress-label={s.copy.label} />
          ))}
          {/* Figma 170:1093–1095: oversized words behind each step */}
          <p className="abs howto-word howto-word-1">
            EMBRACE
            <br />
            THE FORM
          </p>
          <p className="abs howto-word howto-word-2">
            AWAKEN
            <br />
            THE SENSE
          </p>
          <p className="abs howto-word howto-word-3">
            FOLLOW
            <br />
            THE SCENT
          </p>

          <div className={`abs howto-intro${intro.active ? ' is-active' : ''}`} {...intro.bind}>
            <img src="/assets/4114d.svg" alt="odenior" className="abs howto-logo" width="291.554" height="76.3692" />
            <div className="abs howto-heading">
              <p>기억을 향으로 마주하는 순간.</p>
              <p>odenior을 온전히 경험하는 방법을 소개합니다.</p>
            </div>
          </div>
        </div>

        {/* the pinned stage: from the first bottle's place to the last one's */}
        <div className="howto-track">
          <div className="howto-stage">
            {STEPS.map((s, i) => (
              <div key={s.key} className="howto-bottle" ref={(el) => (boxRefs.current[i] = el)}>
                <StageBottle series={series[i]} state={state} index={i} model={s.model} />
              </div>
            ))}
            <canvas className="howto-mist" ref={mistRef} aria-hidden="true" />
            <div className="howto-stage-canvas">
              {STEPS.map((s, i) => (
                <div
                  key={s.key}
                  className={`howto-step howto-step-${i + 1}`}
                  style={{ left: s.copy.x }}
                  ref={(el) => (copyRefs.current[i] = el)}
                >
                  <img src={series[i].img} alt={series[i].name} className="hs-mobile-img" />
                  <p className="hs-label">{s.copy.label}</p>
                  {s.copy.lines.map((line, n) => (line ? <p key={n}>{line}</p> : <p key={n} className="hs-gap" />))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className={`section howto-caution${cautionSeen ? ' is-seen' : ''}`}
        ref={cautionRef}
        data-progress-label="CAUTION"
      >
        <div className="canvas howto-caution-canvas">
          <div className="abs caution-col caution-left">
            <p className="lh54">CAUTION</p>
            <p className="lh54">상처가 있는 부위나 습진, 피부염 등 피부에 이상이 있는 부위에는 사용을 피해 주세요.</p>
            <p className="lh28">사용 중 발진, 가려움 등의 증상이 나타날 경우 사용을 중지하고 전문의 등과 상담해 주세요.</p>
          </div>
          <div className="abs caution-col caution-right">
            <p className="lh54">보관 및 취급 주의사항</p>
            <p className="lh54">사용 후에는 반드시 캡을 닫아 보관해 주세요.</p>
            <p className="lh28">유·소아의 손이 닿지 않는 곳에 보관해 주세요.</p>
            <p className="lh28">직사광선과 고온·저온의 환경을 피해 서늘한 곳에 보관해 주세요.</p>
            <p className="lh28">비정형 유리 용기로 제작되어 낙하 시 파손될 수 있으니 취급에 주의해 주세요.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
