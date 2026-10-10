import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scrollToTop } from './SmoothScroll.jsx';

/*
 * Figma 47:2321 "p3" — opening screen, shown on a full page load and when the header logo is
 * clicked (OPENING_EVENT with { detail: { to } }). Frame 110 → 111 → 112 take turns in the
 * same slot every KNOT_INTERVAL ms, the copy types itself out one character at a time while the
 * whole block fades in from a blur to sharp, and the screen fades out after DURATION ms. A logo replay first fades in over the
 * current page and only then navigates to `to` at the top, so the page swap is never seen.
 */
export const OPENING_EVENT = 'odenior:opening';
export const OPENING_DONE_EVENT = 'odenior:opening-done';

// Synchronous "is the opening covering the page?" — true from the very first render, so pages
// can wait for OPENING_DONE_EVENT before revealing (the html.is-opening class lands a tick later)
let covering = true;
export const isOpeningActive = () => covering;

const DURATION = 2500;
const FADE_OUT = 500;
const REPLAY_FADE_IN = 400; // matches .opening.is-replay
const KNOT_INTERVAL = 800;

const TYPE_START = 250; // ms before the first character
const TYPE_SPEED = 27; // ms per character

const COPY = ['Even when we’re apart,', 'we can still connect'];
const TOTAL_CHARS = COPY.reduce((n, line) => n + line.length, 0);

// Offsets from the frame's centre (x 719, y 453) in the 1438×906 frame
const KNOTS = [
  { name: 'Frame 110', src: '/assets/opening-a23ed.png', left: -25, top: -115, w: 49, h: 49 },
  { name: 'Frame 111', src: '/assets/opening-94769.png', left: -27.24, top: -110.48, w: 54, h: 49 },
  { name: 'Frame 112', src: '/assets/opening-a74b3.png', left: -28.24, top: -113.48, w: 56, h: 56 },
];

export default function Opening() {
  // react-router's navigate changes identity on every route change; keep it in a ref so the
  // opening only (re)starts on load and on an explicit replay
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [run, setRun] = useState({ n: 1, to: null }); // n > 1 = replay from the logo
  const [phase, setPhase] = useState('in'); // in → out → done
  const [knot, setKnot] = useState(0);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    const replay = (e) => setRun((r) => ({ n: r.n + 1, to: e.detail?.to ?? null }));
    window.addEventListener(OPENING_EVENT, replay);
    return () => window.removeEventListener(OPENING_EVENT, replay);
  }, []);

  useEffect(() => {
    covering = true;
    setPhase('in');
    setKnot(0);
    setTyped(0);
    // Replay: once fully covered, go to the target route at the very top
    const go =
      run.n > 1
        ? setTimeout(() => {
            if (run.to) navigateRef.current(run.to);
            scrollToTop();
          }, REPLAY_FADE_IN)
        : 0;
    const tick = setInterval(() => setKnot((k) => (k + 1) % KNOTS.length), KNOT_INTERVAL);
    let typer = 0;
    const typeStart = setTimeout(() => {
      typer = setInterval(() => {
        setTyped((n) => {
          if (n + 1 >= TOTAL_CHARS) clearInterval(typer);
          return Math.min(n + 1, TOTAL_CHARS);
        });
      }, TYPE_SPEED);
    }, TYPE_START);
    const out = setTimeout(() => setPhase('out'), DURATION);
    // Fired as the fade-out starts, so the page underneath (e.g. hero video) can begin fresh
    const reveal = setTimeout(() => {
      covering = false;
      window.dispatchEvent(new Event(OPENING_DONE_EVENT));
    }, DURATION);
    const done = setTimeout(() => {
      setPhase('done');
      clearInterval(tick);
    }, DURATION + FADE_OUT);
    return () => {
      clearTimeout(go);
      clearInterval(tick);
      clearTimeout(typeStart);
      clearInterval(typer);
      clearTimeout(out);
      clearTimeout(reveal);
      clearTimeout(done);
    };
  }, [run]);

  useEffect(() => {
    if (phase === 'done') return undefined;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = 'hidden';
    root.classList.add('is-opening'); // hides the knot cursor (global.css)
    return () => {
      root.style.overflow = prev;
      root.classList.remove('is-opening');
    };
  }, [phase]);

  if (phase === 'done') return null;

  // Every character is laid out from the start (hidden until typed) so the centred lines never
  // shift as they fill in.
  let index = 0;
  return (
    <div
      key={run.n}
      className={`opening${run.n > 1 ? ' is-replay' : ''}${phase === 'out' ? ' is-out' : ''}`}
      aria-hidden="true"
    >
      <div className="opening-stage">
        {KNOTS.map((k, i) => (
          <img
            key={k.name}
            src={k.src}
            alt=""
            className={`opening-knot${i === knot ? ' is-current' : ''}`}
            style={{ left: k.left, top: k.top }}
            width={k.w}
            height={k.h}
          />
        ))}
        <p className="opening-copy">
          {COPY.map((line, li) => (
            <span key={line}>
              {[...line].map((ch) => {
                index += 1;
                return (
                  <span key={index} className={`opening-char${index <= typed ? ' is-shown' : ''}`}>
                    {ch}
                  </span>
                );
              })}
              {li < COPY.length - 1 && <br />}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
