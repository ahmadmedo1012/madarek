/**
 * TrustMarquee — شريط الاعتماد والشراكات (chapters v4).
 *
 * Replaces the static trust row with a seamless ticker that keeps the page
 * alive between heavy chapters (reference principle 13). The animation axis
 * is PHYSICAL: the track container is `direction: ltr` + flex, and the mover
 * translates 0 → -50%, so fresh items always enter from the RIGHT edge —
 * the RTL reading start. Inside, every item is its own isolated RTL run
 * (`unicode-bidi: isolate`), so the Arabic copy — including the mixed
 * «25 كلية · 4 مدن» — renders exactly as it does on the page.
 *
 * · Two identical tracks side by side; the second is aria-hidden. The mover
 *   is `width: max-content`, so -50% = exactly one track → a perfect loop.
 * · Each track carries `min-inline-size: 100vw` + `space-around`, so the
 *   loop stays seamless even on ultra-wide screens where the six items
 *   alone would be narrower than the viewport.
 * · Separators are 6px gold diamonds built from a rotated CSS square —
 *   no emoji, no icon font.
 * · Pause on hover / focus-within; reduced-motion: animation off, the
 *   clone hidden, and the single track wraps into a readable row.
 */

/** Exact institutional copy — accreditation & partnerships. */
const ITEMS: readonly string[] = [
  'جامعة الزاوية',
  'وزارة التعليم العالي والبحث العلمي',
  'مجلس الاعتماد الأكاديمي',
  'الاتحاد الدولي للجامعات',
  'رابطة الجامعات العربية',
  '25 كلية · 4 مدن',
];

export default function TrustMarquee() {
  return (
    <section id="trust" className="ln-marquee" aria-label="الاعتماد والشراكات">
      <div className="ln-marquee-viewport">
        <div className="ln-marquee-mover">
          {/* [main, clone] — the clone exists only for the seamless loop */}
          {[false, true].map((isClone) => (
            <ul
              className="ln-marquee-track"
              aria-hidden={isClone || undefined}
              key={isClone ? 'clone' : 'main'}
            >
              {ITEMS.map((item) => (
                <li className="ln-marquee-item" key={item}>
                  <span className="ln-marquee-text">{item}</span>
                  <span className="ln-marquee-diamond" aria-hidden="true" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
