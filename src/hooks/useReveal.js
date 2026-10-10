import { useEffect, useState } from 'react';
import { OPENING_DONE_EVENT, isOpeningActive } from '../components/Opening.jsx';

/** True once the page is actually visible: right away on navigation, or when the opening lifts. */
export function usePageRevealed() {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!isOpeningActive()) {
      const raf = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(raf);
    }
    const show = () => setRevealed(true);
    window.addEventListener(OPENING_DONE_EVENT, show);
    return () => window.removeEventListener(OPENING_DONE_EVENT, show);
  }, []);
  return revealed;
}

/**
 * True once `ref` has scrolled into view (and stays true). Waits for the opening screen so
 * nothing reveals underneath it.
 */
export function useInViewOnce(ref, { threshold = 0.2, rootMargin = '0px 0px -12% 0px' } = {}) {
  const pageRevealed = usePageRevealed();
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!pageRevealed || seen || !el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSeen(true);
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, pageRevealed, seen, threshold, rootMargin]);
  return seen;
}

/**
 * True while `ref` is inside the viewport band (both ways: it turns false again once the element
 * scrolls out past the top or the bottom). Waits for the opening screen like useInViewOnce.
 */
export function useInView(ref, { threshold = 0, rootMargin = '-10% 0px -10% 0px' } = {}) {
  const pageRevealed = usePageRevealed();
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!pageRevealed || !el) return undefined;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold,
      rootMargin,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, pageRevealed, threshold, rootMargin]);
  return inView;
}
