import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { glideTo } from './SmoothScroll.jsx';

/*
 * A beige line along the bottom of the screen showing how far down the page you are. It shows
 * once the page is scrolled, firms up while scrolling and settles back when the scroll rests;
 * hidden on pages too short to scroll.
 *
 * Pages can mark their chapters with `data-progress-label="STEP 01"` on an element: each gets a
 * small ring + label above the line, placed where that element reaches the middle of the screen,
 * and the chapter you're in is highlighted. Clicking a mark glides to that chapter.
 */
const sameMarks = (a, b) =>
  a.length === b.length && a.every((m, i) => m.label === b[i].label && Math.abs(m.at - b[i].at) < 0.001);

export default function ScrollProgress() {
  const ref = useRef(null);
  const { pathname } = useLocation();
  const [marks, setMarks] = useState([]);
  const [current, setCurrent] = useState(-1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0;
    let idle = 0;
    let last = -1;
    let frame = 0;
    let found = [];
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const next = [...document.querySelectorAll('[data-progress-label]')]
        .filter((n) => n.getClientRects().length) // display: none (e.g. desktop-only marks on mobile)
        .map((n) => {
          const r = n.getBoundingClientRect();
          const at = (window.scrollY + r.top + r.height / 2 - window.innerHeight / 2) / Math.max(1, max);
          return { label: n.dataset.progressLabel, at: Math.min(1, Math.max(0, at)) };
        })
        .sort((a, b) => a.at - b.at);
      if (!sameMarks(next, found)) {
        found = next;
        setMarks(next);
      }
    };
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (frame++ % 30 === 0) measure(); // layout settles (fonts, models, zoom) after load
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 4 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (Math.abs(p - last) < 1e-4) return;
      last = p;
      el.style.setProperty('--progress', p.toFixed(4));
      el.dataset.visible = max > 4 && window.scrollY > 2 ? 'true' : 'false';
      el.dataset.active = 'true';
      let cur = -1;
      found.forEach((m, i) => {
        if (p >= m.at - 0.02) cur = i;
      });
      setCurrent(cur);
      clearTimeout(idle);
      idle = setTimeout(() => (el.dataset.active = 'false'), 900);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      setMarks([]);
    };
  }, [pathname]);

  return (
    <nav className="scroll-progress" ref={ref} aria-label="페이지 구간">
      <span className="scroll-progress-bar" />
      {marks.map((m, i) => (
        <button
          type="button"
          key={m.label}
          onClick={() => glideTo(m.at * (document.documentElement.scrollHeight - window.innerHeight))}
          className={`scroll-progress-mark${i === current ? ' is-current' : ''}${i < current ? ' is-past' : ''}${
            m.at < 0.05 ? ' is-start' : m.at > 0.95 ? ' is-end' : ''
          }`}
          style={{ left: `clamp(12px, ${(m.at * 100).toFixed(3)}%, calc(100% - 12px))` }}
        >
          <span className="spm-dot" />
          <span className="spm-label">{m.label}</span>
        </button>
      ))}
    </nav>
  );
}
