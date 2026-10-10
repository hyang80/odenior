import { useVariant } from '../hooks/useVariant.js';

/* Figma Frame 94 / 95 / 96 — product card with hover (Variant2) state, dissolve 220ms */
export default function ProductCard({ data }) {
  const { active, bind } = useVariant();
  return (
    <div className={`product-card${active ? ' is-active' : ''}`} {...bind}>
      <div className="pc-bg" />
      <div
        className="pc-img"
        style={{
          left: data.imgBox.left,
          width: data.imgBox.width,
          '--l': `${(data.imgBox.left / 406) * 100}%`,
          '--w': `${(data.imgBox.width / 406) * 100}%`,
        }}
      >
        <img src={data.img} alt={data.name} className="fill cover" />
      </div>
      <div className="pc-logo">
        <img src={data.logo} alt="" className="fill pc-logo-default" width="91.5561" height="25.3551" />
        <img src={data.logoHover} alt="" className="fill pc-logo-hover" width="91.5561" height="25.3551" />
      </div>
      <div className="pc-hover">{data.hover}</div>
      <p className="pc-name">{data.name}</p>
      <p className="pc-sub">{data.sub}</p>
      <div className="pc-desc">
        <p>오드누아 오비 퍼퓸</p>
        <p>3.4 FL. OZ.</p>
        <p>50ml / 100ml</p>
      </div>
    </div>
  );
}
