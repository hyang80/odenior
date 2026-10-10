import { useEffect } from 'react';

// The Figma frames are designed on a 1440px canvas. Above the tablet breakpoint the canvas
// is scaled to the viewport width (up or down) so every position/size keeps its ratio.
export const DESIGN_WIDTH = 1440;
export const MOBILE_BREAKPOINT = 900;

export function useCanvasZoom() {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const w = root.clientWidth;
      const zoom = w < MOBILE_BREAKPOINT ? 1 : w / DESIGN_WIDTH;
      root.style.setProperty('--zoom', String(zoom));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
}
