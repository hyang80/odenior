import { useEffect } from 'react';

// Last known pointer position, shared by every caller (browsers only re-run hover
// hit-testing once scrolling settles, which lags far behind smooth scrolling)
const pointer = { x: -1, y: -1 };
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    },
    { passive: true },
  );
}

/**
 * Hit-tests the stationary pointer against `ref` on every scroll frame and calls
 * onEnter / onLeave the moment the element slides under / out from the cursor, instead of
 * waiting for the browser's post-scroll mouseenter / mouseleave.
 */
export function useScrollHover(ref, onEnter, onLeave) {
  useEffect(() => {
    let raf = 0;
    let inside = false;
    const check = () => {
      raf = 0;
      const el = ref.current;
      if (!el || pointer.x < 0) return;
      const r = el.getBoundingClientRect();
      const now = pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
      if (now === inside) return;
      inside = now;
      if (now) onEnter();
      else onLeave();
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [ref, onEnter, onLeave]);
}
