/**
 * Scene 5 — الأدوار: أربعةُ مقاعد… منظومةٌ واحدة.
 *
 * Not tabs. A role dial: four seats around one center. Choosing a seat
 * (or letting the scroll scrub through them) retunes the whole scene —
 * headline, three real capabilities, CTA, accent tint, and the WebGL
 * field's role-node glow. aria-live announces the change; keyboard
 * arrow keys move between seats (radio semantics).
 */

export type RoleKey = 'student' | 'teacher' | 'admin' | 'quality';

export const ROLES: {
  key: RoleKey;
  label: string;
  headline: string;
  points: string[];
  cta: string;
  href: string;
}[] = [
  {
    key: 'student', label: 'الطالب',
    headline: 'رحلتي واضحة من اليوم الأول',
    points: [
      'مقرّراتي ومحاضراتي ونقاط الفحص في مكانٍ واحد',
      'اختبارات إلكترونية بتغذيةٍ راجعة فورية',
      'تقدّمي وشاراتي يتجمّعان في ملفّي',
    ],
    cta: 'ابدأ كطالب', href: '/auth/register',
  },
  {
    key: 'teacher', label: 'الأستاذ',
    headline: 'أُدر فصلي بثقةٍ وهدوء',
    points: [
      'رفع المواد وترتيب المحاضرات ونقاط الفحص',
      'رصد الحضور والدرجات من شاشةٍ واحدة',
      'تحليلات تكشف أداء طلابي مبكّرًا',
    ],
    cta: 'انضم كهيئة تدريس', href: '/auth/register',
  },
  {
    key: 'admin', label: 'الإدارة',
    headline: 'الجامعة كلّها بين يدي',
    points: [
      'إدارة الكليات والمقرّرات والفصول الدراسية',
      'متابعة الأداء المؤسسي عبر لوحاتٍ واضحة',
      'أدوارٌ وصلاحيات مضبوطة لكلّ مستخدم',
    ],
    cta: 'بوابة الإدارة', href: '/auth',
  },
  {
    key: 'quality', label: 'ضمان الجودة',
    headline: 'قياسٌ يسبق القرار',
    points: [
      'مؤشرات جودة محدّثة من بيانات المنصّة',
      'تتبّع الاختبارات والتقييمات والبحوث',
      'تقارير تدعم قرارات الاعتماد',
    ],
    cta: 'لوحة الجودة', href: '/auth',
  },
];

export function SceneRoles({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  const role = ROLES[activeIndex] ?? ROLES[0];
  if (!role) return null;

  return (
    <div className="sc sc-roles" data-role={role.key}>
      <header className="sc-head">
        <p className="ln-eyebrow"><span className="ln-eyebrow-dot" aria-hidden="true" />04 · منظومة الأدوار</p>
        <h2 className="sc-title">أربعةُ مقاعد… منظومةٌ واحدة</h2>
      </header>

      <div className="sc-roles-stage">
        <div className="sc-roles-wash" aria-hidden="true" />
        <span className="sc-roles-mark" aria-hidden="true">{role.label}</span>
        <div
          className="sc-roles-dial"
          role="radiogroup"
          aria-label="اختر دورك في المنظومة"
          onKeyDown={(e) => {
            const dir = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; // RTL: left = next
            if (dir !== 0) {
              e.preventDefault();
              onSelect((activeIndex + dir + ROLES.length) % ROLES.length);
            }
          }}
        >
          {ROLES.map((r, i) => (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={i === activeIndex}
              className={`sc-seat ${i === activeIndex ? 'is-on' : ''}`}
              onClick={() => onSelect(i)}
            >
              <span className="sc-seat-dot" aria-hidden="true" />
              {r.label}
            </button>
          ))}
          <span className="sc-roles-ring" aria-hidden="true" style={{ ['--seat' as string]: String(activeIndex) }} />
        </div>

        <div className="sc-roles-copy" aria-live="polite">
          <h3 className="sc-roles-headline" key={`${role.key}-h`}>{role.headline}</h3>
          <ul className="sc-roles-points">
            {role.points.map((p) => (
              <li key={p} className="sc-role-point">
                <span className="sc-role-check" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
          <a className="ln-btn ln-btn-gold sc-roles-cta" href={role.href} key={`${role.key}-cta`}>
            {role.cta}
          </a>
        </div>
      </div>
    </div>
  );
}
