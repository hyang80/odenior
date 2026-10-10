// ODD SERIES product cards (Figma Frame 94 / 95 / 96) with their hover (Variant2) art
export const CARDS = [
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
