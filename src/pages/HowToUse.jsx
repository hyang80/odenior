import { useVariant } from '../hooks/useVariant.js';
import '../styles/howto.css';

/* Figma 1:375 "Frame 90" — HOW TO USE (1440×2217, white) */
export default function HowToUse() {
  // Frame 84/85: visible on load (Variant2 instance); leave +0.8s → Default (1000ms ease-out),
  // enter +0.1s → Variant2 (dissolve 500ms ease-out)
  const intro = useVariant({ initial: true, enterDelay: 100, leaveDelay: 800 });

  return (
    <main className="page page-howto">
      <section className="section howto-main">
        <div className="canvas howto-canvas">
          <div className={`abs howto-intro${intro.active ? ' is-active' : ''}`} {...intro.bind}>
            <img src="/assets/4114d.svg" alt="odenior" className="abs howto-logo" width="291.554" height="76.3692" />
            <div className="abs howto-heading">
              <p>기억을 향으로 마주하는 순간.</p>
              <p>odenior을 온전히 경험하는 방법을 소개합니다.</p>
            </div>
          </div>

          <div className="abs howto-step howto-step-1">
            <p className="pre">
              <span className="fw-600">STEP 01</span>
              <span className="lh54">
                <br />
                <br />
              </span>
            </p>
            <p className="lh41 pre">보틀 하단의 비정형 굴곡을 따라 손가락을 가볍게 얹어 쥐어주세요.</p>
            <p className="lh41 pre">손바닥의 온기와 자연스럽게 맞물리는 안정적인 그립감을 느껴보세요.</p>
          </div>

          <div className="abs howto-step howto-step-2">
            <p className="lh54 pre">
              STPE 02
              <br />
              <br />
            </p>
            <p className="lh54 pre">체온이 느껴지는 맥박 부위인 목선과 손목 안쪽, 또는 옷감에 분사해주세요.</p>
            <p className="lh54 pre">피부 또는 옷감에서 약 15–20cm 거리를 두고 적당량을 고르게 분사합니다.</p>
          </div>

          <div className="abs howto-step howto-step-3">
            <p className="lh54 pre">
              STEP 03
              <br />
              <br />
            </p>
            <p className="lh54 pre">향이 천천히 퍼지고 잔향이 머무는 동안, 상단 매듭 캡의 부드러운 질감을 손끝으로 느껴보세요.</p>
            <p className="lh54 pre">향과 촉각이 만들어내는 감각의 순간을 통해 기억 속 존재와의 연결을 천천히 마주합니다.</p>
          </div>
        </div>
      </section>

      <section className="section howto-caution">
        <div className="canvas howto-caution-canvas">
          <div className="abs caution-col caution-left">
            <p className="lh54">CAUTION</p>
            <p className="lh54">상처가 있는 부위나 습진, 피부염 등 피부에 이상이 있는 부위에는 사용을 피해 주세요.</p>
            <p className="lh28">사용 중 발진, 가려움 등의 증상이 나타날 경우 사용을 중지하고 전문의 등과 상담해 주세요.</p>
          </div>
          <div className="abs caution-col caution-right">
            <p className="lh54">보관 및 취급 주의사항</p>
            <p className="lh54">사용 후에는 반드시 캡을 닫아 보관해 주세요.</p>
            <p className="lh28">유·소아의 손이 닿지 않는 곳에 보관해 주세요.</p>
            <p className="lh28">직사광선과 고온·저온의 환경을 피해 서늘한 곳에 보관해 주세요.</p>
            <p className="lh28">비정형 유리 용기로 제작되어 낙하 시 파손될 수 있으니 취급에 주의해 주세요.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
