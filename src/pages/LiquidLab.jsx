import PerfumeModel from '../components/PerfumeModel.jsx';
import { SERIES } from '../components/OddShowcase.jsx';
import '../styles/lab.css';

/*
 * Liquid study: the same AiEULE bottle twice — the site's current liquid (liquidSlosh.js) and the
 * experimental water liquid (liquidWater.js) — to compare. Drag either bottle. Not linked from the
 * menu.
 */
const aieule = SERIES.find((s) => s.key === 'aieule');

export default function LiquidLab() {
  return (
    <main className="page page-lab">
      <section className="lab-row">
        {[
          { label: '이전 액체', src: aieule.model, liquid: { ...aieule.liquid, style: 'slosh' } },
          // own URL so the two viewers never share the liquid material
          { label: '현재 (물)', src: `${aieule.model}?water`, liquid: aieule.liquid },
        ].map((b) => (
          <figure key={b.label} className="lab-cell">
            <div className="lab-slot">
              <PerfumeModel
                src={b.src}
                poster={aieule.img}
                alt={`AiEULE — ${b.label}`}
                materials={aieule.materials}
                liquid={b.liquid}
                className="fill series-model"
              />
            </div>
            <figcaption>{b.label}</figcaption>
          </figure>
        ))}
      </section>
    </main>
  );
}
