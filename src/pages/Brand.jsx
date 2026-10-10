import { useEffect, useMemo, useRef } from 'react';
import { setWheelGuard } from '../components/SmoothScroll.jsx';
import { useInView } from '../hooks/useReveal.js';
import '../styles/brand.css';

/*
 * Figma 115:2068 "Frame 126" — BRAND / Our Story (1440×4405).
 * One long photo (bed sheets with the three knot bottles) runs behind the copy. Frame 127 — the
 * fade to black, the atomizer video and BEYOND PERFUME — is a curtain: the photo part pins once
 * its bottom is in view and Frame 127 slides up over it.
 * Copy: each block's lines reveal (blur → sharp, staggered via --i) while it is in view and
 * blur away again once it scrolls out past the top or bottom — both scroll directions.
 * One wheel down at the start of the curtain glides the cover up until BEYOND PERFUME is in
 * place; one wheel up from there glides it back down.
 * The BEYOND PERFUME video drifts slower than the page.
 */
const groupClass = (revealed) => `rv-group${revealed ? ' is-revealed' : ''}`;

function Reveal({ as: Tag = 'div', className = '', children }) {
  const ref = useRef(null);
  // Watch the copy itself, not the (taller) Figma frame around it, so lines leave with the text
  const textRef = useMemo(
    () => ({
      get current() {
        const el = ref.current;
        return el?.classList.contains('brand-hero-copy') ? el : el?.firstElementChild ?? el;
      },
    }),
    [],
  );
  const seen = useInView(textRef);
  return (
    <Tag ref={ref} className={`${className} ${groupClass(seen)}`}>
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

/*
 * Curtain feel for Frame 127: the cover trails the scroll a little and catches up (a damped
 * follow, so it rises with some give instead of moving rigidly), and the pinned photo under it
 * darkens and drifts up as it gets covered (--cover-p 0 → 1 on .brand-top).
 */
const COVER_FOLLOW = 7; // 1/s — how fast the cover catches up with the scroll
const COVER_MAX_LAG = 160; // px

function useCurtainCover(topRef, coverRef) {
  useEffect(() => {
    const top = topRef.current;
    const cover = coverRef.current;
    if (!top || !cover) return undefined;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const desktop = window.matchMedia('(min-width: 900px)');
    let smooth = window.scrollY;
    let prev = performance.now();
    let raf = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const y = window.scrollY;
      smooth += (y - smooth) * (1 - Math.exp(-COVER_FOLLOW * dt));
      const lag = still || !desktop.matches ? 0 : Math.max(-COVER_MAX_LAG, Math.min(COVER_MAX_LAG, y - smooth));
      cover.style.transform = Math.abs(lag) < 0.1 ? '' : `translate3d(0, ${lag.toFixed(1)}px, 0)`;
      // coverage: 0 while the cover's top is below the viewport, 1 once it reaches the top
      const vh = window.innerHeight;
      const t = Math.max(0, Math.min(1, 1 - cover.getBoundingClientRect().top / vh));
      top.style.setProperty('--cover-p', (t * t * (3 - 2 * t)).toFixed(4));
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      cover.style.transform = '';
    };
  }, [topRef, coverRef]);
}

/*
 * Curtain glide: from the moment the cover's fade enters the screen until BEYOND PERFUME sits a
 * quarter down the screen, a wheel down carries the whole way in one eased glide (a wheel up
 * carries back to the start). The cover's trailing follow (useCurtainCover) adds give on top.
 */
const easeInOutQuart = (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);
const GLIDE_DURATION = 1.3; // s
const GLIDE_COOLDOWN = 350; // ms — swallow trackpad momentum after a glide

function useCoverGlide(coverRef, textRef) {
  useEffect(() => {
    const cover = coverRef.current;
    const text = textRef.current;
    if (!cover || !text) return undefined;
    let busy = false;
    let timer = 0;
    const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;
    const release = setWheelGuard(({ deltaY }, lenis) => {
      if (busy) return false;
      if (window.innerWidth < 900) return true;
      const vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;
      // measured without the trailing transform so the targets don't move with the lag
      const lag = new DOMMatrixReadOnly(getComputedStyle(cover).transform).m42 || 0;
      const start = docTop(cover) - lag - vh; // cover's fade top at the screen bottom
      const end = Math.min(max, docTop(text) - lag - vh * 0.25);
      const y = lenis.targetScroll;
      let target = null;
      if (deltaY > 0 && y >= start - 1 && y < end - 1) target = end;
      else if (deltaY < 0 && y > start + 1 && y <= end + 1) target = start;
      if (target === null) return true;
      busy = true;
      lenis.scrollTo(target, {
        duration: GLIDE_DURATION,
        easing: easeInOutQuart,
        lock: true,
        force: true,
        onComplete: () => {
          timer = setTimeout(() => {
            busy = false;
          }, GLIDE_COOLDOWN);
        },
      });
      return false;
    });
    return () => {
      release();
      clearTimeout(timer);
    };
  }, [coverRef, textRef]);
}

export default function Brand() {
  const topRef = useRef(null);
  const coverRef = useRef(null);
  const beyondRef = useRef(null);
  const beyondTextRef = useRef(null);
  useParallax(beyondRef);
  useCurtainCover(topRef, coverRef);
  useCoverGlide(coverRef, beyondTextRef);

  return (
    <main className="page page-brand">
      <section className="section brand-top" ref={topRef}>
        <div className="canvas brand-top-canvas">
          {/* image 691 (1440×4187 @ 0,-89) */}
          <img src="/assets/ourstory-bg.jpg" alt="" className="abs brand-bg" />

          {/* Hero copy (116:2659 + 116:2657) */}
          <Reveal className="abs brand-hero-copy">
            <h1 className="brand-hero-title">
              <span className="rv" style={line(0)}>Even we’re not apart,</span>
              <span className="rv" style={line(1)}>we can still connect</span>
            </h1>
            <div className="brand-hero-sub">
              <p className="rv" style={line(3)}>그럼에도 불구하고, 여전히 우리 안에 존재합니다.</p>
              <p className="rv" style={line(4)}>함께하지 못하는 순간에도, 우리는 이어질 수 있습니다.</p>
            </div>
          </Reveal>

          {/* Frame 79 (1440×712 @ 6,815) */}
          <Reveal className="abs f79">
            <div className="abs f79-text">
              <p className="f79-lead pre rv" style={line(0)}>
                {'우리는 향이 아닌 존재를 전달합니다. '}
                <span className="f79-break">
                  <br />
                  <br />
                </span>
              </p>
              <p className="f79-line pre rv" style={line(1)}>
                시간과 거리 너머에도 사라지지 않고 남아 있는 존재의 흔적
              </p>
              <p className="f79-gap pre">{'​'}</p>
              <p className="f79-line pre rv" style={line(2)}>
                ODENOIR은 그 흔적을 감각으로 복원하고,
                <br />
                부재를 하나의 향으로 기록합니다.
              </p>
            </div>
          </Reveal>

          {/* Frame 100 (1251×319 @ 95,1972) */}
          <Reveal className="abs f100">
            <div className="brand-copy">
              <p className="bc-title bc-accent pre rv" style={line(0)}>ABSENCE</p>
              <p className="bc-title pre rv" style={line(1)}>흔적을 따라서</p>
              <p className="bc-gap pre">{'​'}</p>
              <p className="bc-body pre rv" style={line(2)}>
                우리는 함께할 수 없는 시간과 건널 수 없는 거리 속에 살아갑니다. 어떤 순간은 기록으로 남아도, 그때의 감정까지 온전히 보존되지는 않습니다.
                <br />
                사진은 얼굴을 기억하게 하고, 영상은 목소리를 남기지만, 그 순간의 공기와 온도, 그리고 곁에 있던 한 사람의 존재감까지 완벽하게 담아내지는 못합니다.
              </p>
              <p className="bc-body pre rv" style={line(3)}>
                {'공유되지 못한 순간과 비어 있는 공간 속에서도, 어떤 존재는 여전히 우리 안에 머뭅니다. '}
                <span className="bc-break">
                  <br />
                  <br />
                </span>
                <span className="bc-accent bc-strong">odenior은 그곳에 남겨진 존재의 흔적에서 시작합니다.</span>
              </p>
            </div>
          </Reveal>

          {/* Frame 101 (1262×199 @ 95,2356) */}
          <Reveal className="abs f101">
            <div className="brand-copy f101-copy">
              <p className="bc-title rv" style={line(0)}>
                <span className="bc-accent">OLFACTION</span>
                <br />
                기억을 깨우는 감각, <span className="f101-accent">후각</span>
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

      {/* Frame 127 (@ -36,2777 incl. its fade): slides up over the pinned photo — fade to black, atomizer
          video, BEYOND PERFUME */}
      <section className="section brand-cover" ref={coverRef}>
        <div className="brand-fade" />
        <div className="canvas brand-cover-canvas">
          <div className="abs brand-beyond" ref={beyondRef}>
            <div className="brand-beyond-video">
              <video className="fill cover" src="/videos/finger.mp4" autoPlay muted loop playsInline />
            </div>
          </div>
          <div className="abs brand-band brand-band-top" />
          <div className="abs brand-band brand-band-bottom" />

          {/* Frame 83 (1439×950 @ 7,3268) */}
          <Reveal className="abs f83">
            <div className="abs f83-text" ref={beyondTextRef}>
              <p className="f83-title rv" style={line(0)}>
                <span className="f83-accent">BEYOND PERFUME</span>
                <br />
                나를 위한 향에서, <span className="f83-accent">존재를 기억하는 향</span>으로
              </p>
              <p className="f83-gap">{'​'}</p>
              <p className="f83-body rv" style={line(1)}>
                기존의 향수가 나를 표현하고 꾸미기 위한 향이었다면, ODENOIR가 제안하는 향은 누군가의 존재를 기억하기 위한 향입니다.
              </p>
              <p className="f83-body rv" style={line(2)}>
                우리는 향을 통해 특정한 사람, 공간, 순간이 남긴 흔적을 수집합니다.
              </p>
              <p className="f83-spacer" aria-hidden="true" />
              <p className="f83-body f83-regular rv" style={line(3)}>
                사진이나 영상으로는 남길 수 없는 체취와 기억의 단서를 향이라는 매체를 통해 복원하고,경험할 수 있는 형태로 보존합니다.
              </p>
              <p className="f83-body f83-regular rv" style={line(4)}>
                향을 입는 것이 아니라, 존재의 흔적을 경험하는 것. 이것이 odenior가 정의하는 새로운 향의 방식입니다.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
