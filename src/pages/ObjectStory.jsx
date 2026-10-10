import { useRef } from 'react';
import { useVariant } from '../hooks/useVariant.js';
import { useCurtainSnap } from '../hooks/useCurtainSnap.js';
import { usePageRevealed } from '../hooks/useReveal.js';
import '../styles/object.css';

/* Figma 1:273 "Frame 105" — BRAND / Object Story (1440×2996) */
function KnotZone({ className, img, alt }) {
  // N_obj / i_obj / A_obj: enter → smart animate 800ms ease-out; leave +0.75s → dissolve.
  // The hover target is the obj frame itself (Figma size). It activates only on real pointer
  // movement: scrolling the frame under a resting cursor (or the browser's synthetic
  // mouseenter once the scroll settles) never raises the object. Touch devices reveal when the
  // zone scrolls into view.
  const v = useVariant({ leaveDelay: 750, revealOnView: true, enterOnScroll: false });

  return (
    <div
      className={`abs knot-zone ${className}${v.active ? ' is-active' : ''}`}
      {...v.bind}
      onMouseEnter={undefined}
      onPointerMove={(e) => {
        if (e.movementX || e.movementY) v.bind.onMouseEnter();
      }}
    >
      <div className="abs knot-img">
        <img src={img} alt={alt} className="fill cover" />
      </div>
    </div>
  );
}

export default function ObjectStory() {
  const revealed = usePageRevealed();
  const heroRef = useRef(null);
  // Frame 118 slides up over the pinned Frame 106 hero, one wheel gesture at a time (as on home)
  useCurtainSnap(heroRef);
  return (
    <main className="page page-object">
      <section className="section object-hero" ref={heroRef}>
        <div className="object-hero-img">
          <img src="/assets/7e9ca.png" alt="" />
        </div>
        <div className={`canvas object-hero-canvas${revealed ? ' is-revealed' : ''}`}>
          <p className="abs object-hero-copy object-hero-copy-top">
            Even
            <br />
            When we’re
            <br />
            not apart,
          </p>
          <p className="abs object-hero-copy object-hero-copy-bottom">
            We can
            <br />
            Connected
          </p>
        </div>
      </section>

      {/* Frame 118 (59:2483): the cover layer */}
      <section className="section object-body">
        <div className="canvas object-body-canvas">
          <p className="abs object-lead fw-600">
            서로 다른 두 사람,
            <br />
            떨어져 있어도 이어진 하나의 관계
          </p>
          <div className="abs object-intro">
            <p>
              사람과 사람 사이의 관계는 서로 다른 시간과 기억, 감정이 얽히고 겹쳐지며 만들어집니다.
              <br />
              <br />
            </p>
            <p>
              세 개의 캡은 이러한 관계를 끊어지지 않고 이어지는 하나의 선으로 표현합니다. 서로 다른 조각이 하나의 형태로 연결되듯, 한 사람이 떠난 뒤에도 남아 있는 관계의 흔적과 기억을 담았습니다.
              <br />
              <br />
            </p>
            <p className="fw-600">
              서로 다른 존재가 만나 하나의 기억이 되고, 그 기억이 오래도록 이어지는 것.
              <br />
              ODENOIR는 그 관계의 흔적을 향수의 가장 위에 하나의 조형으로 기록합니다.
            </p>
          </div>

          <KnotZone className="knot-nerile" img="/assets/8bdf2.png" alt="NeRilE 캡 오브제" />
          <KnotZone className="knot-aieule" img="/assets/3d13c.png" alt="AiEULE 캡 오브제" />
          <KnotZone className="knot-amant" img="/assets/cf372.png" alt="AMANT 캡 오브제" />

          <div className="abs object-item object-item-1">
            <p className="oi-title pre">
              {'01. MOTHER '}
              <span className="oi-accent">(NeRilE)</span>
            </p>
            <p className="oi-sub fw-400 pre">서로 다른 두 존재가 만나 하나가 되는 형태</p>
            <p className="oi-gap20 pre">{'​'}</p>
            <p className="oi-body20 fw-400 pre">
              두 개의 긴 형태가 서로 교차하며 하나의 구조를 이루는 모습은
              <br />
              엄마와 나, 두 존재가 오랜 시간 맞물려 하나의 관계를 표현합니다.
            </p>
            <p className="oi-gap20 pre">{'​'}</p>
            <p className="oi-body20 fw-400 pre">
              서로 다른 방향으로 뻗어 있던 두 선이 중앙에서 만나 이어지는
              <br />
              각자의 삶을 살아가면서도 서로의 일부로 남은 관계를 상징합니다.
            </p>
          </div>

          <div className="abs object-item object-item-2">
            <p className="oi-title pre">
              {'02. GRANDMOTHER '}
              <span className="oi-accent">(AiEULE)</span>
            </p>
            <p className="oi-sub pre">시간을 겹쳐 쌓아온 관계의 형태</p>
            <p className="oi-gap22 pre">{'​'}</p>
            <p className="oi-body22 fw-400 pre">
              AiUELE은 하나의 선이 여러 번 서로를 감싸며 이어지는 구조입니다.
              <br />
              <br />
              시작과 끝을 구분하기 어려운 선의 형태는
            </p>
            <p className="oi-body22 fw-400 pre">{'시간이 흘러도 사라지지 않고 이어져  축적되는 기억을 상징합니다.'}</p>
          </div>

          <div className="abs object-item object-item-3">
            <p className="oi-title pre">
              03. LOVER
              <span className="oi-accent">{' (AMANT)'}</span>
            </p>
            <p className="oi-sub pre">서로 다른 두 존재가 서로를 향해 얽히는 관계</p>
            <p className="oi-gap22 pre">{'​'}</p>
            <p className="oi-body22 fw-400 pre">AMANT의 형태는 서로 다른 방향에서 시작된 두 개의 흐름이 서로를 향해</p>
            <p className="oi-body22 fw-400 pre">
              움직이며 감싸는 구조입니다.
              <br />
              <br />
              각자의 형태를 유지한 채 서로를 감싸고 이어져 서로의 일부가 되어가는
            </p>
            <p className="oi-body22 fw-400 pre">관계를 상징합니다.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
