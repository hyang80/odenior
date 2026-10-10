import { useEffect, useRef, useState } from 'react';

/*
 * Figma 51:2406 "Frame 117" — Frame 114 / 115 / 116 used as the mouse cursor: a knot image
 * (42×42 slot at 29,13), an outline circle (13px at 80,3) and the perfume name (16px at 98,0).
 * Each click swaps to a different frame at random; the choice persists until the next click.
 * The hotspot is the centre of the knot slot. CURSOR_SCALE scales the whole 151×84 frame.
 */
const CURSOR_SCALE = 1;
const HOTSPOT = { x: 50, y: 34 };
const FRAMES = [
  { name: 'NeRillE', src: '/assets/opening-a23ed.png', img: { left: 0, top: 0, w: 42, h: 42 } },
  { name: 'AiEULE', src: '/assets/opening-94769.png', img: { left: -1.77, top: 0, w: 46.14, h: 41.8 } },
  { name: 'AMANT', src: '/assets/opening-a74b3.png', img: { left: -5.32, top: -3.55, w: 49.1, h: 49.1 } },
];

const randomOther = (current) => {
  const next = Math.floor(Math.random() * (FRAMES.length - 1));
  return next >= current ? next + 1 : next;
};

const finePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export default function KnotCursor() {
  const [enabled] = useState(finePointer);
  const [index, setIndex] = useState(() => Math.floor(Math.random() * FRAMES.length));
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const root = document.documentElement;
    root.classList.add('has-knot-cursor');
    FRAMES.forEach(({ src }) => {
      new Image().src = src;
    });

    const move = (e) => {
      if (ref.current) ref.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      setVisible(true);
    };
    const down = (e) => {
      if (e.button === 0) setIndex(randomOther);
    };
    // Hide while the pointer is outside the window
    const out = (e) => {
      if (!e.relatedTarget) setVisible(false);
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down);
    document.addEventListener('mouseout', out);
    return () => {
      root.classList.remove('has-knot-cursor');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      document.removeEventListener('mouseout', out);
    };
  }, [enabled]);

  if (!enabled) return null;
  const frame = FRAMES[index];
  return (
    <div ref={ref} className={`knot-cursor${visible ? ' is-visible' : ''}`} aria-hidden="true">
      <div
        className="kc-frame"
        style={{
          transform: `translate(${-HOTSPOT.x}px, ${-HOTSPOT.y}px) scale(${CURSOR_SCALE})`,
          transformOrigin: `${HOTSPOT.x}px ${HOTSPOT.y}px`,
        }}
      >
        <div className="kc-knot">
          <img
            src={frame.src}
            alt=""
            style={{ left: frame.img.left, top: frame.img.top }}
            width={frame.img.w}
            height={frame.img.h}
          />
        </div>
        <img src="/assets/78d3c.svg" alt="" className="kc-dot" width="8.67" height="8.67" />
        <p className="kc-name">{frame.name}</p>
      </div>
    </div>
  );
}
