import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';

/*
 * Inertial smooth scrolling (lenis) so wheel steps glide instead of jumping — this is what
 * makes the home curtain (sticky hero covered by .home-cover) feel continuous.
 * Paused while the opening screen or a header popup is up (html.is-opening / html.is-popup-open)
 * and off for reduced-motion users.
 */
// Always start at the top on reload instead of the browser restoring the old position
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

let instance = null;
/** Jump to the very top immediately (works while lenis is stopped, e.g. under the opening). */
export function scrollToTop() {
  instance?.scrollTo(0, { immediate: true, force: true });
  window.scrollTo(0, 0);
}

/** Glide back to the top (footer TOP link). */
export function glideToTop() {
  if (instance) instance.scrollTo(0, { duration: 1.2 });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Glide to `y`, taking longer for longer trips (scroll progress chapter marks). */
export function glideTo(y) {
  const d = Math.abs(y - window.scrollY) / Math.max(1, window.innerHeight);
  const duration = Math.min(2.2, Math.max(0.9, 0.7 + d * 0.35));
  if (instance) instance.scrollTo(y, { duration });
  else window.scrollTo({ top: y, behavior: 'smooth' });
}

/** Jump straight to `y` (no glide), e.g. to land on a section right after a route change. */
export function jumpTo(y) {
  instance?.scrollTo(y, { immediate: true, force: true });
  window.scrollTo(0, y);
}

// A page can claim wheel gestures (e.g. the home curtain snap). Return false to swallow the
// event; the guard is responsible for scrolling (it receives the lenis instance).
let wheelGuard = null;
export function setWheelGuard(fn) {
  wheelGuard = fn;
  return () => {
    if (wheelGuard === fn) wheelGuard = null;
  };
}

export default function SmoothScroll() {
  const lenisRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.9,
      smoothWheel: true,
      virtualScroll: (data) => {
        if (!wheelGuard || !data.event.type.includes('wheel')) return true;
        if (document.documentElement.classList.contains('is-opening')) return true; // lenis is stopped
        if (wheelGuard(data, lenis) !== false) return true;
        if (data.event.cancelable) data.event.preventDefault();
        return false;
      },
    });
    lenisRef.current = lenis;
    instance = lenis;
    const root = document.documentElement;
    let raf = 0;
    let stopped = false;
    const loop = (time) => {
      const opening = root.classList.contains('is-opening') || root.classList.contains('is-popup-open');
      if (opening && !stopped) {
        lenis.stop();
        stopped = true;
      } else if (!opening && stopped) {
        lenis.start();
        stopped = false;
      }
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
      if (instance === lenis) instance = null;
    };
  }, []);

  // Route changes start at the top without gliding there
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return null;
}
