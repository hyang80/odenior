import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/header.css';
import { OPENING_EVENT } from './Opening.jsx';
import UtilPopup from './UtilPopup.jsx';

// Figma: Frame 106 (header) → hover overlays Frame 66 (whole header), Frame 62/64/65 (menus).
const MENUS = [
  {
    key: 'brand',
    label: 'BRAND',
    to: '/brand',
    fade: 180,
    items: [
      { label: 'Our Story', to: '/brand', transition: 180, cls: 'dd-our-story' },
      { label: 'Object Story', to: '/object-story', transition: 120, cls: 'dd-object-story' },
    ],
  },
  {
    key: 'product',
    label: 'PRODUCT',
    to: '/product',
    fade: 180,
    items: [
      { label: 'Perfume', to: '/product', transition: 180, cls: 'dd-perfume' },
      { label: 'Kit', cls: 'dd-kit' },
    ],
  },
  {
    key: 'howto',
    label: 'HOW TO USE',
    to: '/how-to-use',
    fade: 300,
    items: [
      { label: 'How to use', to: '/how-to-use', transition: 180, cls: 'dd-how-to-use' },
      { label: 'How to make', cls: 'dd-how-to-make' },
    ],
  },
];

/*
 * Header tone: every page section marks the background it shows with data-header-tone="light" |
 * "dark" (sub-areas like one half of a split row can mark themselves too). Each header item —
 * menu labels, logo, utilities, dropdown items — looks up the topmost marked area under its own
 * centre and takes that tone (data-tone), so it stays legible on photos, white bands and the dark
 * curtain alike; colours ease over 300ms. Unmarked areas count as light.
 */
const PROBES = '.nav-label, .util, .header-logo, .dd-item';

function toneAt(x, y) {
  const areas = document.querySelectorAll('[data-header-tone]');
  let tone = 'light';
  // later in the DOM = painted on top (covers, curtains, nested halves)
  areas.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) tone = el.dataset.headerTone;
  });
  return tone;
}

function useHeaderTone(rootRef, pathname) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      root.querySelectorAll(PROBES).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const tone = toneAt(r.left + r.width / 2, r.top + r.height / 2);
        if (el.dataset.tone !== tone) el.dataset.tone = tone;
      });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    schedule();
    // pages fade in and lay out after the route change; pinned layers move without scrolling
    const timers = [120, 400, 900].map((t) => setTimeout(schedule, t));
    const tick = setInterval(schedule, 500);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      clearInterval(tick);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [rootRef, pathname]);
}

export default function Header({ variant }) {
  const rootRef = useRef(null);
  const [hover, setHover] = useState(false);
  const [menu, setMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [popup, setPopup] = useState(null); // 'search' | 'login' | null
  const closePopup = useCallback(() => setPopup(null), []);
  const location = useLocation();
  useHeaderTone(rootRef, location.pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenu(null);
    setHover(false);
    setMobileOpen(false);
    setPopup(null);
  }, [location.pathname]);

  const activeMenu = MENUS.find((m) => m.key === menu);
  const logo = hover || menu ? '/assets/fc4c9.svg' : variant === 'home' ? '/assets/ed00d.svg' : '/assets/3e560.svg';

  return (
    <header
      ref={rootRef}
      className={`site-header${hover ? ' is-hover' : ''}${menu ? ' is-menu' : ''}${mobileOpen ? ' is-mobile-open' : ''}${scrolled ? ' is-scrolled' : ''}`}
      style={{ '--menu-fade': `${activeMenu?.fade ?? 300}ms` }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setMenu(null);
      }}
    >
      <div className="header-canvas">
        <nav className="header-nav" aria-label="주 메뉴">
          {MENUS.map((m) => (
            <div
              key={m.key}
              className={`nav-zone nav-zone-${m.key}${menu === m.key ? ' is-open' : ''}`}
              onMouseEnter={() => setMenu(m.key)}
            >
              <Link to={m.to} className="nav-label">
                {m.label}
              </Link>
              <div className="nav-dropdown">
                {m.items.map((item) =>
                  item.to ? (
                    <Link
                      key={item.label}
                      to={item.to}
                      state={{ transition: item.transition }}
                      className={`dd-item ${item.cls}`}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span key={item.label} className={`dd-item ${item.cls}`}>
                      {item.label}
                    </span>
                  ),
                )}
              </div>
            </div>
          ))}
        </nav>

        <Link
          to="/"
          className="header-logo"
          aria-label="odenior 홈"
          onMouseEnter={() => setMenu(null)}
          onClick={(e) => {
            // Replay the opening; it navigates home (at the top) once the screen is covered
            e.preventDefault();
            window.dispatchEvent(new CustomEvent(OPENING_EVENT, { detail: { to: '/' } }));
          }}
        >
          <img src={logo} alt="odenior" width="129.214" height="33.8461" />
        </Link>

        <div className="header-utils" onMouseEnter={() => setMenu(null)}>
          <button type="button" className="util util-search" onClick={() => setPopup('search')}>
            search
          </button>
          <Link to="/bag" className="util util-bag">
            bag
          </Link>
          <button type="button" className="util util-login" onClick={() => setPopup('login')}>
            login
          </button>
        </div>

        <button
          type="button"
          className="mobile-toggle"
          aria-expanded={mobileOpen}
          aria-label="메뉴 열기"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </div>

      <div className="mobile-panel" aria-hidden={!mobileOpen}>
        {MENUS.map((m) => (
          <div key={m.key} className="mobile-group">
            <Link to={m.to} className="mobile-label">
              {m.label}
            </Link>
            {m.items.map((item) =>
              item.to ? (
                <Link key={item.label} to={item.to} state={{ transition: item.transition }} className="mobile-item">
                  {item.label}
                </Link>
              ) : (
                <span key={item.label} className="mobile-item">
                  {item.label}
                </span>
              ),
            )}
          </div>
        ))}
        <div className="mobile-utils">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              setPopup('search');
            }}
          >
            search
          </button>
          <Link to="/bag">bag</Link>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              setPopup('login');
            }}
          >
            login
          </button>
        </div>
      </div>
      <UtilPopup type={popup} onClose={closePopup} />
    </header>
  );
}
