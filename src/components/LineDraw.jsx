import { useEffect, useRef } from 'react';

/*
 * Figma "Vector 2" (1:833) path trim. The SVG asset is loaded untouched via <object>; the
 * keyframes and stroke width are applied to its path from the outside.
 * Figma's trim (2s, hidden for the first 6%, then ease-in) felt laggy on hover, so the draw
 * now starts on the first frame and runs 4.5s on an expo-out curve (fast start, soft finish).
 * mode: 'full' (drawn, no animation) | 'draw' (restart the trim animation) | 'idle' (hidden)
 */
const KEYFRAMES = `
@keyframes kf_path_trim {
  from { stroke-dasharray: 0 1; }
  to { stroke-dasharray: 1 1; }
}
path.draw { stroke-dashoffset: 0; animation: kf_path_trim 4.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
path.idle { stroke-dasharray: 0 1; }
path.full { stroke-dasharray: 1 1; }
`;

export default function LineDraw({ src, mode, strokeWidth, className, width, height }) {
  const objRef = useRef(null);
  const pathRef = useRef(null);

  const apply = () => {
    const path = pathRef.current;
    if (!path) return;
    path.classList.remove('draw', 'idle', 'full');
    // restart animation
    void path.getBoundingClientRect();
    path.classList.add(mode);
  };

  const onLoad = () => {
    const doc = objRef.current?.contentDocument;
    if (!doc) return;
    const style = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = KEYFRAMES + (strokeWidth ? `path { stroke-width: ${strokeWidth}px; }` : '');
    doc.documentElement.appendChild(style);
    pathRef.current = doc.querySelector('path');
    apply();
  };

  useEffect(apply, [mode]);

  return (
    <object
      ref={objRef}
      data={src}
      type="image/svg+xml"
      className={className}
      width={width}
      height={height}
      onLoad={onLoad}
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
