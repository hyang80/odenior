import { useVariant } from '../hooks/useVariant.js';
import { useNav } from '../hooks/useNav.js';
import ProductCard from '../components/ProductCard.jsx';
import { CARDS } from '../components/productCards.jsx';
import '../styles/home.css'; // ODD SERIES card styles (shared with the footer)
import '../styles/product.css';

/* Figma 92:3063 "Frame 118" — PRODUCT / Perfume: hero, ODD SERIES cards, ODD OBJECT row */

export default function Product() {
  const nav = useNav();
  // Frame 99: hover → Variant2 (dissolve 200ms), click → Object Story (dissolve 220ms ease-out)
  const cta = useVariant();

  return (
    <main className="page page-product">
      <section className="section product-hero">
        <div className="product-hero-img">
          <img src="/assets/10b6f.png" alt="" />
        </div>
        <div className="product-hero-gradient" />
        {/* only the top of the hero is dark (under the gradient); the photo below it is light */}
        <div className="product-hero-tone" data-header-tone="dark" aria-hidden="true" />
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

      {/* ODD SERIES cards (1:55) — 1440×1007 at y 889 in Frame 118, the band runs to the object row */}
      <section className="section product-odd">
        <div className="canvas product-odd-canvas">
          <h2 className="abs odd-title fw-500">ODD SERIES</h2>
          <p className="abs odd-sub fw-500">EXPLORE OUR ICONIC PERFUMES</p>
          <div className="odd-cards">
            {CARDS.map((c) => (
              <ProductCard key={c.key} data={c} />
            ))}
          </div>
        </div>
      </section>

      <section className="section product-object" data-header-tone="dark">
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
