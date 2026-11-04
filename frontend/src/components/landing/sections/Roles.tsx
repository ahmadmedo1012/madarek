/* P2-0 (r335 split) — [7] الأدوار — R323 (A3 · defect 7): the card grid
 * became a hairline LEDGER — eight rows (the five verified platform
 * roles + the three honest personas), each: mono index, the
 * clean role name (IBM Plex 600), a one-line honest
 * descriptor, and a status tag in the chip grammar. Hairline
 * row rules, no cards; every line still says the truth.
 *
 * Fully self-contained: the ledger data rides the ROLE_SHOWCASES
 * registry — no composer refs. */
import { ROLE_SHOWCASES } from '../../../data/university-media';
import { RevealCssClass } from '../../../hooks/useReveal';

/* ── R323 (A3 · defect 7) — the roles LEDGER: the card grid becomes a
 * hairline ledger of the platform's eight rows — the five verified
 * roles + the three honest personas — one row each: mono index, the
 * clean role name (IBM Plex 600), a one-line honest descriptor, and a
 * status tag in the chip grammar. The descriptors are the SAME honest
 * lines the cards carried (ROLE_SHOWCASES.lineAr / the persona lines —
 * the r168b pins ride them verbatim); the names unwrap the old leading
 * «لل» prefix properly (للطالب → طالب — the old single-lam strip left
 * «لطالب» behind). Status tags name the ACTUAL state: متاح (live),
 * قريبًا (in development), غير متاح (honest absence). */
const LEDGER_ROWS = [
  ...ROLE_SHOWCASES.map((r) => ({
    name: r.roleAr.replace(/^لل/, ''),
    line: r.lineAr,
    state: 'متاح' as const,
    live: true,
  })),
  {
    name: 'الباحث',
    line: 'طالب أو أستاذ يكتب بحثه: رفع PDF، وفحص نزاهة معلَن، وملاحظات معلَّمة من الأستاذ.',
    state: 'متاح' as const,
    live: true,
  },
  {
    name: 'مشرف المعمل',
    line: 'المعامل الافتراضية قيد التطوير — فهرس للاستعراض دون تشغيل بعد.',
    state: 'قريبًا' as const,
    live: false,
  },
  {
    name: 'وليّ الأمر',
    line: 'لا حساب منفصل لوليّ الأمر اليوم — المتابعة تمرّ عبر تقرير الطالب نفسه.',
    state: 'غير متاح' as const,
    live: false,
  },
] as const;

export function Roles() {
  return (
    <section id="roles" className="rl-section" aria-labelledby="rl-title">
      <div className="rl-head">
        <span className="fo-label"><span className="fo-mono" dir="ltr">[07]</span> الأدوار</span>
        <RevealCssClass as="h2" className="rl-title" delay={1} id="rl-title">
          منصّة واحدة، <em>خمسة أدوار وثلاث شرائح</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="rl-lede" delay={2}>
          خمسة أدوار مثبَّتة داخل المنصّة، وثلاث شرائح يخدمها المنتج اليوم أو يبني لها —
          كل صف يقول الحقيقة كما هي.
        </RevealCssClass>
      </div>

      <ul className="rl-ledger">
        {LEDGER_ROWS.map((r, i) => (
          <li key={r.name} className="rl-row" data-mdrk-reveal="item">
            <span className="rl-row-num fo-mono" dir="ltr">[{String(i + 1).padStart(2, '0')}]</span>
            <h3 className="rl-row-name">{r.name}</h3>
            <p className="rl-row-line">{r.line}</p>
            <span className={`rl-row-tag${r.live ? ' is-live' : ''}`}>{r.state}</span>
          </li>
        ))}
      </ul>

      <RevealCssClass as="p" className="rl-more" delay={3}>
        بيانات كل مؤسّسة معزولة تمامًا — والصلاحيات منفصلة دورًا بدور.
      </RevealCssClass>
    </section>
  );
}
