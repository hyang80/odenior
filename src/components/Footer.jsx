import { Link } from 'react-router-dom';

/* Figma 1:203 — footer (1512×483, #f5f4f3) */
export default function Footer() {
  return (
    <footer className="section site-footer">
      <div className="canvas footer-canvas">
        <img src="/assets/63de0.svg" alt="odenior" className="abs footer-logo" width="353" height="97.7577" />
        <nav className="footer-links">
          <Link to="/" className="abs fl-home">홈</Link>
          <span className="abs fl-bar fl-bar-1">ㅣ</span>
          <a href="#terms" className="abs fl-terms">이용약관</a>
          <span className="abs fl-bar fl-bar-2">ㅣ</span>
          <a href="#privacy" className="abs fl-privacy">개인정보처리방침</a>
          <span className="abs fl-bar fl-bar-3">ㅣ</span>
          <a href="#guide" className="abs fl-guide">이용안내</a>
        </nav>
        <div className="abs footer-info">
          <p>주식회사 오드누아</p>
          <p>대표자 : MAN HO KIM (김만호)</p>
          <p>주소 : 서울 강남구 영동대로82길 11 선린빌딩 3층</p>
          <p>사업자등록번호 : 117-17-021107</p>
          <p>통신판매업신고번호 : 제2025-서울강남-00017호</p>
          <p>TEL : 010-8337-4645</p>
          <p>E-MAIL : teamodnior@perfume.kr</p>
        </div>
        <a href="#talk" className="abs footer-talk">
          <span className="footer-talk-pill" />
          <span className="footer-talk-label">1:1 TALK</span>
        </a>
        <div className="abs footer-cs">
          <p>Customer Center</p>
          <p>070-8337-4645</p>
          <p>
            AM 10:00 - PM 4:00
            <br />
            (Lunch 12:00 - PM 13:00) 주말 및 공휴일 휴무
          </p>
        </div>
      </div>
    </footer>
  );
}
