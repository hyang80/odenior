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
 * curtain alike; colours ease over 300ms. Unmarked areas count as light. While page text runs
 * under the bar (data-overlap), a soft veil in the same tone (data-veil) fades in behind it so the
 * text never collides with the menu; with nothing to collide with, there is no veil.
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

// Is any page text under the bar? Checks the actual glyph boxes of the page's text (not sample
// points, which slip between short words and miss copy with pointer-events: none). Text counts
// when it is visible (opacity / visibility) and not covered by a marked section painted over it
// (e.g. copy under the Our Story curtain).
let textCache = { at: 0, nodes: [] };
function pageTextNodes() {
  const now = performance.now();
  if (now - textCache.at > 1000) {
    const nodes = [];
    const main = document.querySelector('main');
    if (main) {
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
    }
    textCache = { at: now, nodes };
  }
  return textCache.nodes;
}
const visible = (el) =>
  el.checkVisibility
    ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    : getComputedStyle(el).visibility !== 'hidden';
const covered = (el, x, y) =>
  [...document.querySelectorAll('[data-header-tone]')].some((area) => {
    if (area.contains(el) || !(area.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)) return false;
    const r = area.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  });
function textUnder(rect) {
  const top = rect.top + 6;
  const bottom = rect.bottom - 6;
  const range = document.createRange();
  for (const node of pageTextNodes()) {
    const el = node.parentElement;
    if (!el?.isConnected) continue;
    const box = el.getBoundingClientRect();
    if (box.bottom < top || box.top > bottom || box.right < 0 || box.left > window.innerWidth) continue;
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) {
      if (r.bottom < top || r.top > bottom || r.right < 0 || r.left > window.innerWidth || !r.width) continue;
      if (!visible(el)) break;
      const x = Math.min(window.innerWidth - 1, Math.max(1, (r.left + r.right) / 2));
      const y = Math.min(bottom, Math.max(top, (r.top + r.bottom) / 2));
      if (!covered(el, x, y)) return true;
    }
  }
  return false;
}

function useHeaderTone(rootRef, pathname) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      // the veil behind the whole bar follows the area under its centre
      const r0 = root.getBoundingClientRect();
      const veil = toneAt(window.innerWidth / 2, r0.top + r0.height / 2);
      if (root.dataset.veil !== veil) root.dataset.veil = veil;
      // …and only shows while page text actually runs under the bar
      const overlap = textUnder(r0) ? 'true' : 'false';
      if (root.dataset.overlap !== overlap) root.dataset.overlap = overlap;
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
