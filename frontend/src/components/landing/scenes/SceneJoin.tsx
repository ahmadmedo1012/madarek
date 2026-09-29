/**
 * Scene 7 — نقطة البداية: انضمام.
 *
 * The convergence. The whole field gathers into one point of light as
 * this scene arrives (engine stage 6), the film ends on three real
 * entry paths (student / faculty / institution) under one closing
 * statement — then a calm, minimal footer. No invented endorsements,
 * no fake counters; the ending is confident because it is honest.
 */
export function SceneJoin() {
  return (
    <div className="sc sc-join">
      <div className="sc-join-core">
        <p className="ln-eyebrow"><span className="ln-eyebrow-dot" aria-hidden="true" />06 · نقطة البداية</p>
        <h2 className="sc-join-title">نقطتُك في المنظومة تبدأ الآن</h2>
        <p className="sc-join-sub">
          كلُّ قاعدة معرفةٍ عظيمة بدأت بنقطةٍ واحدة — نقطة ضوءٍ قرّرت أن تتّسع.
        </p>

        <div className="sc-join-paths">
          <a className="sc-path" href="/auth/register">
            <span className="sc-path-role">للطالب</span>
            <span className="sc-path-cta">ابدأ رحلتك مجانًا</span>
          </a>
          <a className="sc-path" href="/auth/register">
            <span className="sc-path-role">لعضو هيئة التدريس</span>
            <span className="sc-path-cta">انضم إلى منظومة التدريس</span>
          </a>
          <a className="sc-path" href="/auth">
            <span className="sc-path-role">للمؤسسة</span>
            <span className="sc-path-cta">بوّابة جامعة الزاوية</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer className="ln-footer">
      <div className="ln-footer-brand">
        <span className="ln-footer-mark" aria-hidden="true">مدارك</span>
        <p className="ln-footer-line">منصّة جامعة الزاوية للتعليم الذكي</p>
      </div>
      <nav className="ln-footer-nav" aria-label="روابط سريعة">
        <a href="#ln-stage-system">المنظومة</a>
        <a href="#ln-stage-journey">رحلة الطالب</a>
        <a href="#ln-stage-oasis">واحة</a>
        <a href="/auth">دخول</a>
      </nav>
      <p className="ln-footer-note">صُنعت بعناية في ليبيا — جامعة الزاوية</p>
    </footer>
  );
}
