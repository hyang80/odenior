// ODD SERIES product cards (Figma Frame 127 / 128 / 129) — hover (Variant2): a lifestyle photo
// under a 20% dim with the knot's line mark, and the name in the bottle's colour (nameHover).
// The AiEULE / AMANT photos are tone-matched to NeRilE's (Lab mean/contrast transfer).
export const CARDS = [
  {
    key: 'nerile',
    nameHover: '#ac9481',
    name: 'NeRilE',
    sub: 'The First Embrace',
    img: '/assets/f10b9.png',
    imgBox: { left: 83, width: 240 },
    logo: '/assets/38aa3.svg',
    logoHover: '/assets/57235.svg',
    hover: (
      <>
        <div className="pc-photo pc-photo-flip">
          <img src="/assets/card-nerile.jpg" alt="" className="fill cover" />
          <div className="fill pc-photo-dim" />
        </div>
        <img src="/assets/93add.svg" alt="" className="abs pc-mark" width="117.24" height="117.083" />
      </>
    ),
  },
  {
    key: 'aieule',
    nameHover: '#ab805e',
    name: 'AiEULE',
    sub: 'The Last Heart',
    img: '/assets/045b7.png',
    imgBox: { left: 89, width: 229 },
    logo: '/assets/31cf5.svg',
    logoHover: '/assets/da7b3.svg',
    hover: (
      <>
        <div className="pc-photo">
          <img src="/assets/card-aieule.jpg" alt="" className="fill cover" />
          <div className="fill pc-photo-dim" />
        </div>
        <img src="/assets/334a9.svg" alt="" className="abs pc-mark" width="125.734" height="120.424" />
      </>
    ),
  },
  {
    key: 'amant',
    nameHover: '#9c6060',
    name: 'AMANT',
    sub: 'The Other Half',
    img: '/assets/97f19.png',
    imgBox: { left: 88, width: 230 },
    logo: '/assets/31cf5.svg',
    logoHover: '/assets/da7b3.svg',
    hover: (
      <>
        <div className="pc-photo">
          <img src="/assets/card-amant.jpg" alt="" className="fill cover" />
          <div className="fill pc-photo-dim" />
        </div>
        <img src="/assets/9f7a9.svg" alt="" className="abs pc-mark" width="123.183" height="121.297" />
      </>
    ),
  },
];
