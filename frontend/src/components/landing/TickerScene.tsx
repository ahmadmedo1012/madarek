import '../../styles/landing-ticker.css';

/**
 * The university's real facts — verbatim strings already on the page
 * (the logos strip, the facts row, the campus caption). Nothing
 * invented, no statistics that are not the university's own.
 */
const FACTS = [
  'جامعة الزاوية',
  'وزارة التعليم العالي والبحث العلمي',
  '٢٥ كلّيّة أكاديميّة',
  '٤ مدن وفروع',
  'منذ 1988',
  'قطاع ضمان الجودة',
  'مكتب البحوث',
  'عمادة الطلاب',
] as const;

/**
 * TickerScene — the Arabic facts marquee («الشريط», immersive plan §6
 * scene 2). Replaces the static logos strip with one calm, full-bleed
 * horizontal loop: real facts only, copper diamond separators,
 * hairline banding, no fill.
 *
 * Motion lives entirely in landing-ticker.css — ONE continuous
 * translate over a duplicated track (the duplicate is aria-hidden;
 * under prefers-reduced-motion the CSS hides it and wraps the primary
 * list instead). The root is a plain <section> so the page's
 * offscreen observer picks it up ([data-offscreen] pauses the loop);
 * no IntersectionObserver of its own.
 */
export function TickerScene(): JSX.Element {
  return (
    <section className="ticker-scene" aria-label="حقائق الجامعة">
      <div className="ticker-clip">
        <div className="ticker-track">
          <ul className="ticker-list">
            {FACTS.map((fact) => (
              <li className="ticker-item" key={fact}>{fact}</li>
            ))}
          </ul>
          {/* the seamless-loop duplicate: identical ink, removed from
              the accessibility tree (and dropped entirely under
              reduced motion — see landing-ticker.css) */}
          <ul className="ticker-list" aria-hidden="true">
            {FACTS.map((fact) => (
              <li className="ticker-item" key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
