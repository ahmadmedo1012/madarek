import { useState } from 'react';

/**
 * Scene 2 — المنظومة: تسع قوى في نظامٍ واحد.
 *
 * NOT a card grid. An asymmetric orbital composition: nine function
 * nodes placed around the hub at art-directed positions and sizes
 * (weight = pedagogical importance), linked by SVG hairlines. Hovering
 * or focusing a node lights it and speaks one honest line about the
 * REAL product function it names.
 *
 * Coordinates are physical (left/top %) so the SVG links meet node
 * centers exactly; the composition itself is authored for RTL reading
 * (heaviest nodes enter from the right).
 */

type FnNode = {
  id: string;
  label: string;
  line: string;
  /** node center, % of the stage box */
  x: number; y: number;
  size: 'xl' | 'lg' | 'md';
};

const FN_NODES: FnNode[] = [
  { id: 'lectures', label: 'المحاضرات', size: 'xl', x: 70, y: 16,
    line: 'فيديو مرتّب بنقاط فحص تتحقّق من فهمك لحظةً بلحظة' },
  { id: 'research', label: 'البحوث', size: 'md', x: 45, y: 10,
    line: 'رفع البحوث ومراجعتها ضمن دورةٍ أكاديمية واضحة' },
  { id: 'analytics', label: 'التحليلات', size: 'lg', x: 89, y: 46,
    line: 'لوحات تحليل أكاديمي تكشف الفهم والفجوات' },
  { id: 'exams', label: 'الاختبارات', size: 'lg', x: 62, y: 84,
    line: 'اختبارات إلكترونية تُصحَّح فوريًا وتُراجَع بشفافية' },
  { id: 'library', label: 'المكتبة', size: 'md', x: 86, y: 78,
    line: 'مكتبة إلكترونية بمراجع وملفات المقرّرات' },
  { id: 'attendance', label: 'الحضور', size: 'md', x: 33, y: 18,
    line: 'تسجيل حضورٍ موثوق يربط الطالب بمحاضرته' },
  { id: 'oasis', label: 'المساعد الأكاديمي', size: 'lg', x: 13, y: 50,
    line: 'واحة تُبسّط المفهوم وتُولّد اختبارات من سياق مقرّرك' },
  { id: 'grades', label: 'الدرجات', size: 'md', x: 30, y: 82,
    line: 'درجات موحّدة يراها الطالب والأستاذ من مصدرٍ واحد' },
  { id: 'quality', label: 'ضمان الجودة', size: 'md', x: 8, y: 26,
    line: 'مؤشرات جودة مؤسسية تدعم قرار الجامعة' },
];

const HUB = { x: 50, y: 47 };

export function SceneSystem() {
  const [active, setActive] = useState<string | null>(null);
  const activeNode = FN_NODES.find((n) => n.id === active) ?? null;

  return (
    <div className="sc sc-system">
      <header className="sc-head">
        <p className="ln-eyebrow"><span className="ln-eyebrow-dot" aria-hidden="true" />01 · المنظومة</p>
        <h2 className="sc-title">كلُّ ما تحتاجه الجامعة… متّصل</h2>
        <p className="sc-sub">تسع وظائف حقيقية تعمل كنظامٍ واحد — لا قائمة خدمات متفرقة.</p>
      </header>

      <div className="sc-system-stage">
        <svg className="sc-system-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {FN_NODES.map((n) => (
            <line
              key={n.id}
              className={`sc-system-link ${active === n.id ? 'is-lit' : ''}`}
              x1={HUB.x} y1={HUB.y} x2={n.x} y2={n.y}
            />
          ))}
        </svg>

        <div className="sc-system-hub" style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }}>
          <span className="sc-system-hub-core" aria-hidden="true" />
          <span className="sc-system-hub-label">مدارك</span>
        </div>

        <div className="sc-system-nodes">
          {FN_NODES.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`sc-node sc-node-${n.size} ${active === n.id ? 'is-active' : ''}`}
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
              onMouseEnter={() => setActive(n.id)}
              onFocus={() => setActive(n.id)}
              onMouseLeave={() => setActive((cur) => (cur === n.id ? null : cur))}
              onBlur={() => setActive((cur) => (cur === n.id ? null : cur))}
              aria-label={`${n.label} — ${n.line}`}
            >
              <span className="sc-node-dot" aria-hidden="true" />
              <span className="sc-node-label">{n.label}</span>
            </button>
          ))}
        </div>

        <p className={`sc-system-caption ${activeNode ? 'is-on' : ''}`} aria-live="polite">
          {activeNode ? activeNode.line : 'المس أيّ عقدة لترى دورها في المنظومة'}
        </p>
      </div>
    </div>
  );
}
