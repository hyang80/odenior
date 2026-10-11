import { useState } from 'react';
import PerfumeModel from './PerfumeModel.jsx';
import '../styles/showcase.css';

// Figma 92:3258 "Frame 121" — the ODD SERIES showcase: one 1440×810 frame with three variants
// (DF-N / VA-Ai / VA-Am) switched by the knot buttons (93:3438), each with its own icon set and
// a draggable 3D bottle in the photo slot. Placed on home (136:3252); the parent positions it.

/*
 * The approved 3D bottle finish (first tuned on AiEULE), shared by every bottle model: frosted
 * neutral-grey glass, the model's own liquid, a lightly glossy ivory knot a shade darker than the
 * page background (faint emissive softens its shadows). Only the knot cap's material name differs
 * per export.
 */
// ivory knot, 40% less saturated than first tuned ([0.68, 0.66, 0.61]) — it read too yellow
const CAP = { color: [0.668, 0.656, 0.626, 1], roughness: 0.25, metallic: 0, emissive: [0.039, 0.0385, 0.0373] };
const bottleMaterials = (cap, capExtra = {}) => ({
  // Frosted glass at 70% over the liquid, always drawn after it (renderOrder) so the liquid shows
  // faintly and the same from every angle
  // A clear top coat adds the soft sheen of the photographed frosted glass without changing its colour
  'Material.005': {
    color: [0.695, 0.682, 0.669, 0.7],
    roughness: 0.65,
    metallic: 0,
    renderOrder: 1,
    clearcoat: 0.7,
    clearcoatRoughness: 0.15,
  }, // bottle
  'Material.006': { renderOrder: 0 }, // liquid
  [cap]: { ...CAP, ...capExtra }, // knot cap
  // neck pieces exported without a material (glTF default: white, fully metallic) → cap ivory,
  // shaded smooth (they were exported flat, so the neck showed vertical facets under the knot)
  Default: { ...CAP, smooth: 60 },
});
// All three bottles share AiEULE's slot (image 514, 411×697 @ 561,72) and one fixed camera, taken
// from AiEULE's auto-framing: model-viewer otherwise frames each model to its own bounding box, so
// the differently sized knots made the (identical) glass bottles render at different sizes and
// heights. Same slot + same camera → same glass size and height in every variant.
const SLOT = { left: 561, top: 72, width: 411, height: 697 };
const FRAMING = { target: '-0.0006m 0.011m 0m', radius: '0.2722m', fov: '36.81deg' }; // AiEULE's auto values
// The liquid fills 82% of the bottle and sloshes when the bottle is dragged
const LIQUID = { material: 'Material.006', fill: 0.82 };

export const SERIES = [
  {
    key: 'nerile',
    variant: 'DF-N',
    name: 'NeRilE',
    sub: 'The First Embrace',
    img: '/assets/f10b9.png',
    imgBox: SLOT,
    tags: [
      { label: 'ODD 1', left: 485, top: 379 },
      { label: 'MOTHER', left: 1021, top: 626 },
      { label: 'NeRillE', left: 939, top: 121 },
    ],
    color: '#ac9383',
    icons: ['/assets/58c79.svg', '/assets/ed0a9.svg', '/assets/ccbb1.svg'],
    // The photo slot is replaced by the draggable 3D bottle
    model: '/models/nerile.glb',
    materials: bottleMaterials('tripo_mat_a2b903dc.002'),
    liquid: LIQUID,
  },
  {
    key: 'aieule',
    variant: 'VA-Ai',
    name: 'AiEULE',
    sub: 'The Last Heart',
    img: '/assets/045b7.png',
    imgBox: SLOT,
    tags: [
      { label: 'ODD 2', left: 500, top: 421 },
      { label: 'GRANDMOTHER', left: 929, top: 588 },
      { label: 'AiEULE', left: 916, top: 164 },
    ],
    color: '#996646',
    icons: ['/assets/046cc.svg', '/assets/d48cb.svg', '/assets/ccbb1.svg'],
    model: '/models/aieule-2.glb',
    // this export has no neck piece: a smooth neck like the other two fills the knot's rough socket
    materials: bottleMaterials('tripo_mat_d38952c2.002', { plug: { radius: 0.0105, height: 0.0195 } }),
    liquid: LIQUID,
  },
  {
    key: 'amant',
    variant: 'VA-Am',
    name: 'AMANT',
    sub: 'The Other Half',
    img: '/assets/97f19.png',
    imgBox: SLOT,
    tags: [
      { label: 'ODD 3', left: 485, top: 379 },
      { label: 'LOVER', left: 957, top: 623 },
      { label: 'AMANT', left: 923, top: 158 },
    ],
    color: '#9b6777',
    icons: ['/assets/9853d.svg', '/assets/ed0a9.svg', '/assets/d2889.svg'],
    model: '/models/amant.glb',
    // the export's swirl texture on the knot is dropped so it gets the plain ivory finish
    materials: bottleMaterials('tripo_material_24568c86_f249_46d2_bb69_c06d44d2d25c.001', {
      texture: null,
      closeHoles: true, // the knot export is open underneath
    }),
    liquid: LIQUID,
  },
];
const BUTTON_LEFT = [0, 92, 184]; // bt1 / bt2 / bt3 inside the 244×60 button group

export default function OddShowcase({ className = '' }) {
  const [active, setActive] = useState(0);
  const current = SERIES[active];
  return (
    <div className={`odd-showcase ${className}`}>
    <div className="abs series-title">
      <p>ODD</p>
      <p>SERIES</p>
    </div>
    <div className="abs series-desc">
      <p>
        오드누아가 제안하는
        <br />세 가지 시리즈를
      </p>
      <p>만나보세요</p>
    </div>

    {SERIES.map((s, i) => (
      <div
        key={s.key}
        className={`series-variant series-${s.key}${i === active ? ' is-active' : ''}`}
        aria-hidden={i !== active}
      >
        <div
          className="abs series-img"
          style={{ left: s.imgBox.left, top: s.imgBox.top, width: s.imgBox.width, height: s.imgBox.height }}
        >
          {s.model ? (
            <PerfumeModel
              src={s.model}
              poster={s.img}
              alt={`${s.name} 3D`}
              materials={s.materials}
              liquid={s.liquid}
              framing={FRAMING}
              className="fill series-model"
            />
          ) : (
            <img src={s.img} alt={s.name} className="fill cover" />
          )}
        </div>
        {s.tags.map((t) => (
          <p key={t.label} className="abs series-tag" style={{ left: t.left, top: t.top }}>
            <img src="/assets/3b965.svg" alt="" width="7" height="7" />
            {t.label}
          </p>
        ))}
        <div className="abs series-label">
          <p className="sl-name pre" style={{ color: s.color }}>
            {s.name}
          </p>
          <p className="sl-sub pre">
            <span>{s.sub}</span>
            <span className="sl-gap">
              <br />
              <br />
            </span>
          </p>
          <p className="sl-size pre">3.4 FL. OZ. 50ml</p>
        </div>
      </div>
    ))}

    <p className="abs series-hint">click the odd object</p>
    <div className="abs series-buttons" role="tablist" aria-label="ODD 시리즈 선택">
      {SERIES.map((s, i) => (
        <button
          key={s.key}
          type="button"
          role="tab"
          aria-selected={i === active}
          aria-label={s.name}
          className="series-btn"
          style={{ left: BUTTON_LEFT[i] }}
          onClick={() => setActive(i)}
        >
          <img src={current.icons[i]} alt="" width="60" height="60" />
        </button>
      ))}
    </div>
    </div>
  );
}
