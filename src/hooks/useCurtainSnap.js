import { useEffect } from 'react';
import { setWheelGuard } from '../components/SmoothScroll.jsx';

const easeInOutQuart = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);
export const CURTAIN_DURATION = 1.1; // s
const CURTAIN_COOLDOWN = 350; // ms — swallow trackpad momentum after a snap

/**
 * Curtain snap for a pinned (position: sticky) hero that the next layer slides over:
 * any wheel down inside the hero zone carries the cover all the way up in one glide, and
 * any wheel up into the zone opens it again. `heroRef` is the sticky hero at the page top;
 * the cover fully covers it once the scroll reaches the hero's height.
 */
export function useCurtainSnap(heroRef) {
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return undefined;
    let busy = false;
    let timer = 0;
    const snap = (lenis, target) => {
      busy = true;
      lenis.scrollTo(target, {
        duration: CURTAIN_DURATION,
        easing: easeInOutQuart,
        lock: true,
        force: true,
        onComplete: () => {
          timer = setTimeout(() => {
            busy = false;
          }, CURTAIN_COOLDOWN);
        },
      });
      return false;
    };
    const release = setWheelGuard(({ deltaY }, lenis) => {
      if (busy) return false;
      const end = el.offsetHeight; // scroll position where the cover fully covers the hero
      const y = lenis.targetScroll; // where the scroll is heading, not where it is mid-glide
      if (deltaY > 0 && y < end - 1) return snap(lenis, end);
      // Scrolling up into the hero zone (from covered or from further down) opens it in one go
      if (deltaY < 0 && y > 0 && y + deltaY < end) return snap(lenis, 0);
      return true;
    });
    return () => {
      release();
      clearTimeout(timer);
    };
  }, [heroRef]);
}
