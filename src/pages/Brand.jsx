import { useEffect, useRef } from 'react';
import { useCurtainSnap } from '../hooks/useCurtainSnap.js';
import { useInViewOnce, usePageRevealed } from '../hooks/useReveal.js';
import '../styles/brand.css';

/*
 * Figma 1:247 "Frame 43" — BRAND / Our Story (1440×3570).
 * Figma gates every copy block behind hover (with 0.2–2s delays), which left the page looking
 * empty. Here the copy is always readable: each block reveals line by line (blur → sharp,
 * staggered via --i) as it scrolls into view and stays; the hero copy reveals on arrival.
 * The body slides over the pinned hero like home / object story, and the BEYOND PERFUME
 * video drifts slower than the page.
 */
function Reveal({ as: Tag = 'div', className = '', children }) {
  const ref = useRef(null);
  const seen = useInViewOnce(ref);
  return (
    <Tag ref={ref} className={`${className} rv-group${seen ? ' is-revealed' : ''}`}>
      {children}
    </Tag>
  );
}

const line = (i) => ({ '--i': i });

// BEYOND PERFUME video parallax: --par runs -1 → 1 while the section crosses the viewport
function useParallax(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const t = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      el.style.setProperty('--par', Math.max(-1, Math.min(1, t)).toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref]);
}

export default function Brand() {
  const heroRef = useRef(null);
  const beyondRef = useRef(null);
  const heroRevealed = usePageRevealed();
  useCurtainSnap(heroRef);
  useParallax(beyondRef);

  return (
    <main className="page page-brand">
      <section className="section brand-hero" ref={heroRef}>
        <div className="brand-hero-img">
          <img src="/assets/b39e3.png" alt="" className="fill cover" />
        </div>
        <div className="canvas brand-hero-canvas">
          <div className={`abs f78 rv-group${heroRevealed ? ' is-revealed' : ''}`}>
            <div className="abs f78-text">
              <p className="rv" style={line(0)}>그럼에도 불구하고, 여전히 우리 안에 존재합니다.</p>
              <p className="rv" style={line(1)}>함께하지 못하는 순간에도, 우리는 이어질 수 있습니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Curtain: body + BEYOND PERFUME slide up over the pinned hero */}
      <div className="brand-cover">
        <section className="section brand-body">
          <div className="canvas brand-body-canvas">
            <Reveal className="abs f79">
              <div className="abs f79-text">
                <p className="f79-lead pre rv" style={line(0)}>
                  <span className="fw-700">{'우리는 향이 아닌 존재를 전달합니다. '}</span>
                  <br />
                  <br />
                </p>
                <p className="f79-line fw-400 pre rv" style={line(1)}>
                  시간과 거리 너머에도 사라지지 않고 남아 있는 존재의 흔적
                </p>
                <p className="f79-gap pre">{'​'}</p>
                <p className="f79-line fw-400 pre rv" style={line(2)}>
                  ODENOIR은 그 흔적을 감각으로 복원하고,
                  <br />
                  부재를 하나의 향으로 기록합니다.
                </p>
              </div>
            </Reveal>

            <Reveal className="abs f100">
              <div className="brand-copy">
                <p className="fw-600 bc-title bc-accent pre rv" style={line(0)}>ABSENCE</p>
                <p className="fw-600 bc-title pre rv" style={line(1)}>흔적을 따라서</p>
                <p className="bc-gap pre">{'​'}</p>
                <p className="fw-400 bc-body pre rv" style={line(2)}>
                  우리는 함께할 수 없는 시간과 건널 수 없는 거리 속에 살아갑니다. 어떤 순간은 기록으로 남아도, 그때의 감정까지 온전히 보존되지는 않습니다.
                  <br />
                  사진은 얼굴을 기억하게 하고, 영상은 목소리를 남기지만, 그 순간의 공기와 온도, 그리고 곁에 있던 한 사람의 존재감까지 완벽하게 담아내지는 못합니다.
                </p>
                <p className="fw-400 bc-body pre rv" style={line(3)}>
                  {'공유되지 못한 순간과 비어 있는 공간 속에서도, 어떤 존재는 여전히 우리 안에 머뭅니다. '}
                  <br />
                  <br />
                  <span className="bc-accent-2">odenior은 그곳에 남겨진 존재의 흔적에서 시작합니다.</span>
                </p>
              </div>
            </Reveal>

            <Reveal className="abs f101">
              <div className="brand-copy f101-copy">
                <p className="fw-600 bc-title rv" style={line(0)}>
                  <span className="bc-accent">OLFACTION</span>
                  <br />
                  가장 가까이 기억을 깨우는 감각, <span className="f101-accent">후각</span>
                </p>
                <p className="bc-gap">{'​'}</p>
                <p className="bc-body rv" style={line(1)}>
                  후각은 다른 감각과 달리 감정과 기억에 관여하는 뇌의 영역과 직접적으로 연결되어 있어, 향을 맡는 것은 단순히 냄새를 인식하는 것에서 끝나지 않습니다.
                </p>
                <p className="bc-body rv" style={line(2)}>
                  향은 때때로 기억을 떠올리는 단서가 아니라, 기억을 다시 경험하게 하는 매개체가 됩니다.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section brand-beyond" ref={beyondRef}>
          <div className="brand-beyond-video">
            <video className="fill cover" src="/videos/finger.mp4" autoPlay muted loop playsInline />
          </div>
          <div className="brand-beyond-dim" />
          <div className="canvas brand-beyond-canvas">
            <Reveal className="abs f83">
              <div className="abs f83-text">
                <p className="f83-title rv" style={line(0)}>
                  BEYOND PERFUME
                  <br />
                  나를 위한 향에서, 존재를 기억하는 향으로
                </p>
                <p className="f83-gap">{'​'}</p>
                <p className="f83-body rv" style={line(1)}>
                  기존의 향수가 나를 표현하고 꾸미기 위한 향이었다면, ODENOIR가 제안하는 향은 누군가의 존재를 기억하기 위한 향입니다.
                </p>
                <p className="f83-body rv" style={line(2)}>
                  우리는 향을 통해 특정한 사람, 공간, 순간이 남긴 흔적을 수집합니다.
                </p>
                <p className="f83-gap">{'​'}</p>
                <p className="f83-body rv" style={line(3)}>
                  사진이나 영상으로는 남길 수 없는 체취와 기억의 단서를 향이라는 매체를 통해 복원하고,경험할 수 있는 형태로 보존합니다.
                </p>
                <p className="f83-body rv" style={line(4)}>
                  향을 입는 것이 아니라, 존재의 흔적을 경험하는 것. 이것이 odenior가 정의하는 새로운 향의 방식입니다.
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </div>
    </main>
  );
}
