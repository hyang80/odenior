import { useEffect, useRef, useState } from 'react';
import { useVariant } from '../hooks/useVariant.js';
import { useNav } from '../hooks/useNav.js';
import LineDraw from '../components/LineDraw.jsx';
import ProductCard from '../components/ProductCard.jsx';
import Footer from '../components/Footer.jsx';
import { OPENING_DONE_EVENT } from '../components/Opening.jsx';
import { useCurtainSnap } from '../hooks/useCurtainSnap.js';
import { usePageRevealed } from '../hooks/useReveal.js';
import '../styles/home.css';

const CARDS = [
  {
    key: 'nerile',
    name: 'NeRilE',
    sub: 'The First Embrace',
    img: '/assets/f10b9.png',
    imgBox: { left: 83, width: 240 },
    logo: '/assets/38aa3.svg',
    logoHover: '/assets/57235.svg',
    hover: (
      <>
        <div className="pc-rect pc-rect-nerile">
          <img src="/assets/a1e42.png" alt="" className="fill" />
        </div>
        <img src="/assets/38784.svg" alt="" className="abs pc-symbol pc-symbol-nerile" width="135" height="136.607" />
      </>
    ),
  },
  {
    key: 'aieule',
    name: 'AiEULE',
    sub: 'The Last Heart',
    img: '/assets/045b7.png',
    imgBox: { left: 89, width: 229 },
    logo: '/assets/31cf5.svg',
    logoHover: '/assets/da7b3.svg',
    hover: (
      <>
        <div className="pc-rect pc-rect-aieule">
          <img src="/assets/a1e42.png" alt="" className="fill" />
          <img src="/assets/c5e2d.png" alt="" className="fill pc-rect-grain" />
        </div>
        <div className="abs pc-symbol-aieule">
          <img src="/assets/f7e72.svg" alt="" width="140" height="132.797" />
        </div>
      </>
    ),
  },
  {
    key: 'amant',
    name: 'AMANT',
    sub: 'The Other Half',
    img: '/assets/97f19.png',
    imgBox: { left: 88, width: 230 },
    logo: '/assets/31cf5.svg',
    logoHover: '/assets/da7b3.svg',
    hover: (
      <>
        <div className="pc-rect pc-rect-amant">
          <img src="/assets/7caa3.png" alt="" className="fill" />
        </div>
        <img src="/assets/951da.svg" alt="" className="abs pc-symbol-amant" width="137" height="135" />
      </>
    ),
  },
];

function Hero() {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  // Title lines rise in once the opening screen lifts
  const revealed = usePageRevealed();

  // Curtain snap: one wheel gesture covers / uncovers the hero in a single glide
  useCurtainSnap(sectionRef);

  // Curtain depth: --cover goes 0 → 1 as .home-cover slides over the pinned hero
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;
    let raf = 0;
    let last = -1;
    const update = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / el.offsetHeight));
      if (Math.abs(p - last) < 0.001) return;
      last = p;
      el.style.setProperty('--cover', p.toFixed(4));
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
  }, []);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    // React sets `muted` only as a property; Safari needs the attribute to allow autoplay
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    const tryPlay = () => {
      if (v.paused) v.play().catch(() => {});
    };
    // Start from the first frame when the opening screen lifts
    const restart = () => {
      v.currentTime = 0;
      tryPlay();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') tryPlay();
    };
    const onPlaying = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    // If the browser blocked autoplay (e.g. Safari low power mode), retry on the first interaction
    const gestures = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'];

    tryPlay();
    v.addEventListener('canplay', tryPlay);
    v.addEventListener('playing', onPlaying);
    v.addEventListener('pause', onPause);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(OPENING_DONE_EVENT, restart);
    gestures.forEach((g) => window.addEventListener(g, tryPlay, { passive: true }));
    return () => {
      v.removeEventListener('canplay', tryPlay);
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('pause', onPause);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(OPENING_DONE_EVENT, restart);
      gestures.forEach((g) => window.removeEventListener(g, tryPlay));
    };
  }, []);
  return (
    <section className="section hero noise" ref={sectionRef}>
      <div className="hero-media hero-image">
        <img src="/assets/537a1.png" alt="" className="fill cover" />
      </div>
      <div className={`hero-media hero-video${playing ? ' is-playing' : ''}`}>
        <video
          ref={videoRef}
          className="fill cover"
          src="/videos/hero.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
        />
      </div>
      <div className="hero-gradient" />
      <div className="canvas hero-canvas">
        <h1 className={`abs hero-title fw-600${revealed ? ' is-revealed' : ''}`}>
          <p className="hero-title-line" style={{ '--i': 0 }}>
            <span>향이 아닌</span>
          </p>
          <p className="hero-title-line" style={{ '--i': 1 }}>
            <span>존재를 전달합니다</span>
          </p>
        </h1>
        <div className="abs hero-body fw-500">
          <p className="pre">
            <span className="fw-600">{'거리를 향으로 잇다, '}</span>
            <img src="/assets/494cc.svg" alt="odenior" className="hero-inline-logo" width="82" height="22.7086" />
            <span className="hero-br-20">
              <br />
            </span>
            <br />
            기술이 고도화될수록 우리의 삶은 더 많은 데이터로 기록됩니다.
          </p>
          <p className="pre">
            {'그러나 역설적으로, 우리는 사랑하는 이와의 물리적 고립과 '}
            <br />
            정서적 단절을 경험하고 있습니다.
            <br />
            <br />
          </p>
          <p className="pre">
            오드누아(odenior)는 시각과 청각만으로는 결코 채울 수 없는
            <br />
            {"'부재하는 존재의 실재감'을 복원하기 위해 탄생하였습니다."}
          </p>
        </div>
      </div>
    </section>
  );
}

function Intro() {
  const sectionRef = useRef(null);
  // Figma 1:235: instance starts on Variant2 — the line draws as the intro arrives (once it is
  // 95% in view, i.e. as the curtain lands, so the draw is seen from its start);
  // leave → fade out; enter → redraw immediately (Figma's +80ms enter delay dropped on request)
  const line = useVariant({ initial: true });
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setArrived(true), { threshold: 0.95 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const lineMode = line.active && arrived ? 'draw' : 'idle';

  return (
    <section className="section intro" ref={sectionRef}>
      <div className="canvas intro-canvas">
        <div className="abs intro-text">
          <p className="intro-lead pre">
            <span className="fw-700">{'우리는 향이 아닌 존재를 전달합니다. '}</span>
            <br />
            <br />
          </p>
          <p className="intro-l50 pre">시간과 거리 너머에도 사라지지 않고 남아 있는 존재의 흔적</p>
          <p className="intro-l60 pre">{'​'}</p>
          <p className="intro-l50 pre">
            ODENOIR은 그 흔적을 감각으로 복원하고,
            <br />
            부재를 하나의 향으로 기록합니다.
          </p>
        </div>
        <div className={`abs intro-line${line.active ? ' is-active' : ''}`} {...line.bind}>
          <LineDraw
            src="/assets/73116.svg"
            mode={lineMode}
            strokeWidth={2}
            className="intro-line-svg"
            width="1652.58"
            height="783.227"
          />
        </div>
      </div>
    </section>
  );
}

// Our story (1:236) photos — JPEG (opaque photos; the PNGs were 1.7 / 2.2 MB). Fetched and
// decoded while the opening is up so the section paints instantly when it scrolls in.
const OUR_STORY_IMAGES = ['/assets/ourstory-default.jpg', '/assets/8a034.jpg', '/assets/a969e.svg'];

function OurStory() {
  useEffect(() => {
    OUR_STORY_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.decode?.().catch(() => {});
    });
  }, []);
  const nav = useNav();
  const { active, ref, bind } = useVariant({ revealOnView: true });
  return (
    <section className="section our-story" ref={ref}>
      <a
        href="/brand"
        className={`our-story-link${active ? ' is-active' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          nav('/brand', active ? 300 : 0);
        }}
        {...bind}
      >
        <div className="os-default">
          <img src={OUR_STORY_IMAGES[0]} alt="" className="fill cover" />
        </div>
        <div className="os-hover">
          <div className="os-hover-img">
            <img src={OUR_STORY_IMAGES[1]} alt="" />
          </div>
          <div className="fill os-hover-dim" />
        </div>
        <div className="canvas os-canvas">
          <img src={OUR_STORY_IMAGES[2]} alt="" className="abs os-copy" width="1329" height="53" />
          <p className="abs os-title fw-500">odenior story</p>
          <p className="abs os-more fw-500">자세히 보기</p>
        </div>
      </a>
    </section>
  );
}

function OddSeries() {
  const nav = useNav();
  const viewAll = useVariant();
  return (
    <section className="section odd-series">
      <div className="canvas odd-canvas">
        <h2 className="abs odd-title fw-500">ODD SERIES</h2>
        <p className="abs odd-sub fw-500">EXPLORE OUR ICONIC PERFUMES</p>
        <div className="odd-cards">
          {CARDS.map((c) => (
            <ProductCard key={c.key} data={c} />
          ))}
        </div>
        <a
          href="/product"
          className={`abs view-all${viewAll.active ? ' is-active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            nav('/product', 200);
          }}
          {...viewAll.bind}
        >
          <span className="fw-500">{'VIEW ALL  -->'}</span>
        </a>
      </div>
    </section>
  );
}

function Split() {
  const left = useVariant({ revealOnView: true });
  const right = useVariant({ revealOnView: true });
  const videoRef = useRef(null);
  // Video plays only while hovered (or once revealed on touch devices)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (right.active) v.play().catch(() => {});
    else v.pause();
  }, [right.active]);
  return (
    <section className="section split">
      <div className="canvas split-canvas">
        <div className={`abs split-left${left.active ? ' is-active' : ''}`} {...left.bind}>
          <img src="/assets/b839f.png" alt="" className="fill" />
          <div className="abs split-badge split-badge-blur">
            <img src="/assets/b3bbd.png" alt="" className="fill cover" />
          </div>
          <div className="abs split-badge">
            <img src="/assets/575d5.png" alt="" className="fill cover" />
          </div>
          <div className="split-left-hover">
            <div className="fill split-left-dim" />
            <p className="abs split-left-title fw-500">체취를 향으로 담는 과정</p>
            <p className="abs split-left-more fw-500">자세히 보기</p>
          </div>
        </div>
        <div className={`abs split-right${right.active ? ' is-active' : ''}`} {...right.bind}>
          <video ref={videoRef} className="fill" src="/videos/mov.mp4" muted loop playsInline preload="auto" />
          <div className="split-right-hover">
            <div className="fill split-right-dim" />
            <p className="abs split-right-title fw-500">HOLD THE MEMORY CLOSER</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="page page-home">
      <Hero />
      {/* Curtain: everything from the intro (1:235) down slides up over the pinned hero */}
      <div className="home-cover">
        <Intro />
        <OurStory />
        <OddSeries />
        <Split />
        <Footer />
      </div>
    </main>
  );
}
