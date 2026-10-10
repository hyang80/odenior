import { useCallback, useEffect, useRef, useState } from 'react';
import { useScrollHover } from './useScrollHover.js';

const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
const noop = () => {};

/**
 * Mirrors a Figma interactive component: MOUSE_ENTER / MOUSE_LEAVE (with optional delays)
 * switch between "Default" and "Variant2". On touch devices (no hover) components that
 * reveal content switch to Variant2 when they scroll into view instead.
 *
 * Spread `bind` on the hover target: besides the mouse handlers it carries a ref, so the
 * target is also hit-tested while the page scrolls (browsers only update hover once
 * scrolling stops) and reacts the moment it reaches a stationary cursor.
 * `enterOnScroll: false` keeps the scroll hit-test for leaving only, so the target activates
 * just when the cursor itself moves onto it (not when the page sweeps it past the cursor).
 */
export function useVariant({
  initial = false,
  enterDelay = 0,
  leaveDelay = 0,
  revealOnView = false,
  enterOnScroll = true,
} = {}) {
  const [active, setActive] = useState(initial);
  const timer = useRef();
  const ref = useRef(null);
  const hoverEl = useRef(null);

  const schedule = useCallback((value, delay) => {
    clearTimeout(timer.current);
    if (delay > 0) timer.current = setTimeout(() => setActive(value), delay);
    else setActive(value);
  }, []);

  const onMouseEnter = useCallback(() => {
    if (canHover()) schedule(true, enterDelay);
  }, [enterDelay, schedule]);
  const onMouseLeave = useCallback(() => {
    if (canHover()) schedule(false, leaveDelay);
  }, [leaveDelay, schedule]);

  // Hover target via `bind`; it also stands in for `ref` when no other element claims it
  // (an explicit ref={v.ref} on a parent is assigned after this child ref and wins)
  const setHoverEl = useCallback((el) => {
    hoverEl.current = el;
    if (el && (!ref.current || !ref.current.isConnected)) ref.current = el;
  }, []);

  useScrollHover(hoverEl, enterOnScroll ? onMouseEnter : noop, onMouseLeave);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!revealOnView || canHover() || !ref.current) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setActive(true);
      },
      { threshold: 0.3 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [revealOnView]);

  return { active, ref, bind: { onMouseEnter, onMouseLeave, ref: setHoverEl } };
}
