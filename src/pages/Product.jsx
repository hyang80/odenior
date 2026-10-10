import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { jumpTo } from '../components/SmoothScroll.jsx';
import { useVariant } from '../hooks/useVariant.js';
import { useNav } from '../hooks/useNav.js';
import PerfumeModel from '../components/PerfumeModel.jsx';
import '../styles/product.css';

/* Figma 1:330 "Frame 92" — PRODUCT / Perfume; the ODD SERIES block follows Frame 118 (92:3063) */

// Figma 92:3258 "Frame 121" — one 1440×810 showcase with three variants (DF-N / VA-Ai / VA-Am),
// switched by the knot buttons (93:3438). Each variant ships its own button icon set.
/*
 * The approved 3D bottle finish (first tuned on AiEULE), shared by every bottle model: frosted
 * neutral-grey glass, the model's own liquid, a lightly glossy ivory knot a shade darker than the
 * page background (faint emissive softens its shadows). Only the knot cap's material name differs
 * per export.
 */
const CAP = { color: [0.68, 0.66, 0.61, 1], roughness: 0.25, metallic: 0, emissive: [0.04, 0.039, 0.036] };
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
// The liquid fills 82% of the bottle and sloshes when the bottle is dragged
const LIQUID = { material: 'Material.006', fill: 0.82 };

const SERIES = [
  {
    key: 'nerile',
    variant: 'DF-N',
    name: 'NeRilE',
    sub: 'The First Embrace',
    img: '/assets/f10b9.png',
    imgBox: { left: 561, top: 103, width: 411, height: 666 },
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
    imgBox: { left: 561, top: 72, width: 411, height: 697 },
    tags: [
      { label: 'ODD 2', left: 500, top: 421 },
      { label: 'GRANDMOTHER', left: 929, top: 588 },
      { label: 'AiEULE', left: 916, top: 164 },
    ],
    color: '#996646',
    icons: ['/assets/046cc.svg', '/assets/d48cb.svg', '/assets/ccbb1.svg'],
    model: '/models/aieule-2.glb',
    materials: bottleMaterials('tripo_mat_d38952c2.002'),
    liquid: LIQUID,
  },
  {
    key: 'amant',
    variant: 'VA-Am',
    name: 'AMANT',
    sub: 'The Other Half',
    img: '/assets/97f19.png',
    imgBox: { left: 570, top: 103, width: 393, height: 666 },
    tags: [
      { label: 'ODD 3', left: 485, top: 379 },
      { label: 'LOVER', left: 957, top: 623 },
      { label: 'AMANT', left: 923, top: 158 },
    ],
    color: '#9b6777',
    icons: ['/assets/9853d.svg', '/assets/ed0a9.svg', '/assets/d2889.svg'],
    model: '/models/amant.glb',
    // the export's swirl texture on the knot is dropped so it gets the plain ivory finish
    materials: bottleMaterials('tripo_material_24568c86_f249_46d2_bb69_c06d44d2d25c.001', { texture: null }),
    liquid: LIQUID,
  },
];
const BUTTON_LEFT = [0, 92, 184]; // bt1 / bt2 / bt3 inside the 244×60 button group

export default function Product() {
  const nav = useNav();
  // Frame 99: hover → Variant2 (dissolve 200ms), click → Object Story (dissolve 220ms ease-out)
  const cta = useVariant();
  // Opened from a home ODD SERIES card: start on that bottle and land on the series section
  const location = useLocation();
  const opened = location.state?.series ?? location.hash.slice(1);
  const [active, setActive] = useState(() => Math.max(0, SERIES.findIndex((s) => s.key === opened)));
  const seriesRef = useRef(null);
  useEffect(() => {
    if (!SERIES.some((s) => s.key === opened)) return undefined;
    // after the route change's own scroll-to-top has run
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const el = seriesRef.current;
        if (el) jumpTo(el.getBoundingClientRect().top + window.scrollY);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [opened]);
  const current = SERIES[active];

  return (
    <main className="page page-product">
      <section className="section product-hero">
        <div className="product-hero-img">
          <img src="/assets/10b6f.png" alt="" />
        </div>
        <div className="product-hero-gradient" />
        <div className="canvas product-hero-canvas">
          <div className="abs product-system">
            <p className="ps-title fw-600">FRAGRANCE SYSTEM</p>
            <p className="ps-l51">ODENOIR의 프래그런스 시스템은 고정된 조합이나 정형화된 향을 제공하지 않습니다.</p>
            <p className="ps-l38">개인의 고유한 체취 데이터와 사적인 기억을 측정하고, 이를 오직 한 사람만을 위한 감각의 실체로 재구성합니다.</p>
          </div>
          <div className="abs product-record">
            <p className="pre">{'그 사람에게서 느꼈던 체취와 기억의 흔적을 '}</p>
            <p className="pre">ODENOIR만의 기법을 통해 향으로 기록해보세요.</p>
          </div>
        </div>
      </section>

      <section className="section product-series" ref={seriesRef}>
        <div className="canvas product-series-canvas">
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
      </section>

      <section className="section product-object">
        <div className="canvas product-object-canvas">
          <div className="abs po-left-bg">
            <img src="/assets/8528e.png" alt="" className="fill cover" />
          </div>
          <div className="abs po-panel">
            <div className="po-panel-bg">
              <img src="/assets/226eb.png" alt="" className="fill" />
              <div className="fill po-panel-tint" />
            </div>
            <div className="abs po-copy">
              <p className="po-title fw-600 pre">
                ODD OBJECT SERIES
                <br />
                <br />
              </p>
              <p className="po-body pre">
                서로 다른 존재가 만나고 이어지는 과정에서 탄생한
                <br />
                조형적 형상과 그래픽에는 각자의 이야기가 담겨 있습니다.
                <br />
                <br />
                두개의 형태가 만나 하나의 시리즈로 이어져
                <br />
                ODD만의 이야기를 완성합니다.
              </p>
            </div>
            <a
              href="/object-story"
              className={`abs po-cta${cta.active ? ' is-active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                nav('/object-story', 220);
              }}
              {...cta.bind}
            >
              <span className="po-cta-pill" />
              <span className="po-cta-label fw-500">ODD CAP STORY →</span>
            </a>
          </div>
          <div className="abs po-left-photo">
            <img src="/assets/e9143.png" alt="" className="fill cover" />
          </div>
        </div>
      </section>
      <div className="product-tail" />
    </main>
  );
}
