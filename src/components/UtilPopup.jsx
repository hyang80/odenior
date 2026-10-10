import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/popup.css';

/*
 * Header utility popups (search / login) — no navigation, inputs are typeable but not wired up.
 * Rendered into <body> so the header's `zoom` doesn't scale them. While open, html.is-popup-open
 * pauses the smooth scroller (SmoothScroll.jsx) so the page underneath stays put.
 */
const FADE = 300; // matches .popup transition

const SUGGESTIONS = ['NeRilE', 'AiEULE', 'AMANT', 'How to use'];

function SearchPanel({ onClose }) {
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);
  return (
    <div className="popup-panel search-panel" role="dialog" aria-modal="true" aria-label="검색">
      <form className="search-form" onSubmit={(e) => e.preventDefault()}>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="찾으시는 향을 입력해주세요"
          aria-label="검색어"
        />
        <button type="submit" className="search-submit">
          search
        </button>
      </form>
      <div className="search-suggest">
        <span className="search-suggest-label">추천 검색어</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="search-chip"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = s;
              inputRef.current?.focus();
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <button type="button" className="popup-close" aria-label="닫기" onClick={onClose} />
    </div>
  );
}

function LoginPanel({ onClose }) {
  const idRef = useRef(null);
  useEffect(() => idRef.current?.focus(), []);
  return (
    <div className="popup-panel login-panel" role="dialog" aria-modal="true" aria-label="로그인">
      <img src="/assets/494cc.svg" alt="odenior" className="login-logo" width="110" height="30.46" />
      <form className="login-form" onSubmit={(e) => e.preventDefault()}>
        <label className="login-field">
          <span>아이디</span>
          <input ref={idRef} type="text" autoComplete="off" placeholder="아이디 또는 이메일" />
        </label>
        <label className="login-field">
          <span>비밀번호</span>
          <input type="password" autoComplete="off" placeholder="비밀번호" />
        </label>
        <button type="submit" className="login-submit">
          login
        </button>
      </form>
      <div className="login-links">
        <span>회원가입</span>
        <span className="login-bar">ㅣ</span>
        <span>아이디 · 비밀번호 찾기</span>
      </div>
      <button type="button" className="popup-close" aria-label="닫기" onClick={onClose} />
    </div>
  );
}

/** `type`: 'search' | 'login' | null. Keeps the last panel mounted while it fades out. */
export default function UtilPopup({ type, onClose }) {
  const [shown, setShown] = useState(type);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (type) {
      setShown(type);
      const raf = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(raf);
    }
    setOpen(false);
    const t = setTimeout(() => setShown(null), FADE);
    return () => clearTimeout(t);
  }, [type]);

  useEffect(() => {
    if (!type) return undefined;
    const root = document.documentElement;
    root.classList.add('is-popup-open');
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      root.classList.remove('is-popup-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [type, onClose]);

  if (!shown) return null;

  return createPortal(
    <div className={`popup popup-${shown}${open ? ' is-open' : ''}`}>
      <div className="popup-backdrop" onClick={onClose} />
      {shown === 'search' ? <SearchPanel onClose={onClose} /> : <LoginPanel onClose={onClose} />}
    </div>,
    document.body,
  );
}
