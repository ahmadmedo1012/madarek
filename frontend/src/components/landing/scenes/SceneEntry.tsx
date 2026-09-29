import { useMagnetic } from '../../../hooks/useMagnetic';
import { KineticType } from '../KineticType';

/**
 * Scene 1 — الدخول إلى مدارك.
 *
 * The opening composition: kinetic Arabic display type anchored to the
 * RTL reading column (right), the living knowledge field breathing on
 * the left behind it, and a single magnetic golden CTA. Trust line is
 * strictly factual (platform identity — no invented metrics).
 */
export function SceneEntry({ onExplore }: { onExplore?: () => void }) {
  const ctaRef = useMagnetic<HTMLAnchorElement>(7);

  return (
    <div className="sc sc-entry">
      <div className="sc-entry-grid">
        <div className="sc-entry-copy">
          <p className="ln-eyebrow">
            <span className="ln-eyebrow-dot" aria-hidden="true" />
            منصّة جامعة الزاوية للتعليم الذكي
          </p>

          <KineticType
            as="h1"
            className="sc-entry-title"
            text="الجامعةُ نظامُ معرفةٍ حيّ"
          />

          <p className="sc-entry-sub">
            مدارك تربط المحاضرة والحضور والتقييم والبحث في منظومةٍ واحدة
            تعمل لكلّ طالبٍ وأستاذٍ ومؤسسة — من جامعة الزاوية إلى ليبيا.
          </p>

          <div className="sc-entry-cta">
            <a ref={ctaRef} href="/auth/register" className="ln-btn ln-btn-gold">
              ابدأ مجانًا الآن
              <span className="ln-btn-arrow" aria-hidden="true" />
            </a>
            <button type="button" className="ln-btn ln-btn-ghost" onClick={onExplore}>
              شاهد كيف تعمل
            </button>
          </div>

          <ul className="sc-entry-trust" aria-label="حقائق عن المنصة">
            <li>جامعة الزاوية</li>
            <li aria-hidden="true">·</li>
            <li>25 كلّيّة</li>
            <li aria-hidden="true">·</li>
            <li>واجهة عربية أصيلة</li>
          </ul>
        </div>
      </div>

      <div className="sc-entry-scrollhint" aria-hidden="true">
        <span className="sc-entry-scroll-label">تابع النزول</span>
        <span className="sc-entry-scroll-line" />
      </div>
    </div>
  );
}
