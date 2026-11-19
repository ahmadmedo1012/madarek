/* r362 (Agent 3) — [05·ب] حقل المفاهيم — the concepts band.
 *
 * The band between the product proof and the why strip, where the
 * drawing language the whole sheet speaks is made EXPLICIT: the
 * net that constructs under scroll (ConceptField), then the gated
 * route whose stages this section's copy drives (RouteSurvey).
 *
 * Self-contained like Chapters/Why: the driver lives HERE, not in
 * the composer — one useSheetScroll subscription on the section
 * root, imperative idempotent writes, zero renders per tick. The
 * mapping: the field draws across the first third of the band's
 * traversal (--cf-p), the route across the last (--cr-p); both vars
 * default to 1 in concepts.css, so reduced-motion (the driver bails
 * below) and JS-off both ship the COMPLETE drawings — the reveal
 * family's never-hide law, inherited.
 *
 * The route's gate state lives HERE (not inside RouteSurvey) so the
 * Arabic stage ledger can drive the same highlight: the rows are
 * the 44px touch seats where the SVG station bodies are small —
 * the drawing answers the list, the list answers the drawing.
 * No auth links here (the funnel contract counts exactly five
 * register / five login seats across the guest surface).
 */
import { useRef, useState } from 'react';
import { useSheetScroll } from '../../../lib/motion/useSheetScroll';
import { clamp } from '../../../lib/motion/sheetConductor';
import { PREFERS_REDUCED_MOTION } from '../../../lib/motion-media';
import { RevealCssClass } from '../../../hooks/useReveal';
import { ConceptField } from '../../illustrations/interactive/ConceptField';
import { RouteSurvey } from '../../illustrations/interactive/RouteSurvey';
import type { RouteWayId } from '../../illustrations/interactive/RouteSurvey';
import '../../../styles/landing/concepts.css';

/* the survey's reading key — each row names the layer it annotates
 * (the drawing's own annotations carry the Latin codes; the Arabic
 * key rides the DOM ledger, the family's chrome/content split). */
const ANNOTATIONS = [
  {
    code: 'DATUM',
    title: 'الأُسّ المرجعي',
    text: 'النقطة التي تُقاس منها المفاهيم.',
  },
  {
    code: 'CLOSURE',
    title: 'إقفال المثلث',
    text: 'كل خط جديد يُقفل مثلثًا فيثبت المفهوم.',
  },
  {
    code: 'MEASURE',
    title: 'القياس الحي',
    text: 'مرّر المؤشر على أي محطة: يُرسم خطّ القياس وبُعدها.',
  },
  {
    code: 'GAP',
    title: 'الفجوة المعلَّمة',
    text: 'المفهوم غير المرتبط يبقى معلّمًا — أول ما يعالجه المساعد.',
  },
] as const;

/* the route's stage ledger — the honest training-track stages (the
 * same concepts the product surfaces expose), one row per gate. */
const STAGES: Array<{ id: RouteWayId; code: string; name: string; note: string }> = [
  { id: 'G1', code: 'S1', name: 'قراءة موجّهة', note: 'مادة محدّدة قبل الجلسة.' },
  { id: 'G2', code: 'S2', name: 'نقطة فحص', note: 'سؤال يثبّت الفهم.' },
  { id: 'G3', code: 'S3', name: 'تمرين مقيس', note: 'تدريب يُصحَّح فورًا ويُحتسب في المصفوفة.' },
  { id: 'G4', code: 'S4', name: 'مشروع تطبيقي', note: 'عمل يُسلَّم ويُفهرس في المكتبة.' },
  { id: 'T', code: 'END', name: 'الإتقان', note: 'المحطة التي تُغلق المسار.' },
];

const prefersReduced = () => {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(PREFERS_REDUCED_MOTION).matches
    );
  } catch {
    return false;
  }
};

export function Concepts() {
  const rootRef = useRef<HTMLElement>(null);
  const lastRef = useRef({ f: '', r: '' });
  /* the route's two activation channels (the r331 model): the stage
 * rows and the drawing's gates report through the same callbacks;
 * the effective highlight is tap ?? hover, aria-pressed = tap only. */
  const [routeHover, setRouteHover] = useState<RouteWayId | null>(null);
  const [routeGate, setRouteGate] = useState<RouteWayId | null>(null);
  const routeActive = routeGate ?? routeHover;
  const toggleGate = (id: RouteWayId) =>
    setRouteGate((cur) => (cur === id ? null : id));

  /* ── the construction driver: ONE subscription, imperative
   * idempotent writes. The field draws across the band's first
   * third of traversal; the route across the last third — a reading
   * pause owns the middle. Reduced motion: the driver bails entirely
   * and the CSS defaults (complete drawings) stand. */
  useSheetScroll(rootRef, ({ traversal }) => {
    const el = rootRef.current;
    if (!el || prefersReduced()) return;
    const f = clamp(traversal / 0.34, 0, 1).toFixed(4);
    const r = clamp((traversal - 0.44) / 0.34, 0, 1).toFixed(4);
    if (f !== lastRef.current.f) {
      el.style.setProperty('--cf-p', f);
      lastRef.current.f = f;
    }
    if (r !== lastRef.current.r) {
      el.style.setProperty('--cr-p', r);
      lastRef.current.r = r;
    }
  });

  return (
    <section id="concepts" ref={rootRef} className="cf-section" aria-labelledby="cf-title" data-spec="concepts.wrap">
      <div className="cf-outer">
        <div className="cf-toprule" aria-hidden="true" />

        <div className="cf-frame">
          <div className="cf-inner">
            {/* ── the editorial head ─────────────────────────────── */}
            <header className="cf-head">
              <div className="cf-titleblock">
                <RevealCssClass as="div" className="cf-kicker" delay={1}>
                  <div className="cf-kicker-text fo-mono" dir="ltr">
                    PLATE K-102 · CONCEPT FIELD
                  </div>
                </RevealCssClass>
                <RevealCssClass as="h2" className="cf-title" delay={2} id="cf-title">
                  حقل المفاهيم يُرسم بالقياس
                </RevealCssClass>
              </div>
              <div className="cf-side">
                <div className="cf-side-rule" aria-hidden="true" />
                <RevealCssClass as="p" className="cf-lede" delay={3}>
                  نرسم التعلّم كما يرسم المسّاح الأرض: كل مفهوم محطّة، وكل ربط مقيس، وكل فجوة
                  معلَّمة — ثم نسير المسار بوابات إلى الإتقان.
                </RevealCssClass>
              </div>
            </header>

            {/* ── the band: two acts around the centre rule ──────── */}
            <div className="cf-band">
              <RevealCssClass as="div" className="cf-act" delay={1}>
                <div className="cf-act-copy">
                  <div className="cf-act-label fo-mono" dir="ltr">
                    ACT 01 · SURVEY
                  </div>
                  <h3 className="cf-act-title">شبكة القياس تُبنى أمامك</h3>
                  {/* r368 T8 (C2): the prose restatement of the ANNOTATIONS list
                      below is retired — every claim survives in the list itself. */}
                  <ol className="cf-annotlist" aria-label="مفتاح قراءة الشبكة">
                    {ANNOTATIONS.map((a) => (
                      <li key={a.code} className="cf-annot">
                        <div className="cf-annot-code" dir="ltr">{a.code}</div>
                        <p className="cf-annot-body">
                          <strong>{a.title}</strong> — {a.text}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="cf-act-art">
                  <ConceptField />
                </div>
              </RevealCssClass>

              <div className="cf-bandrule" aria-hidden="true" />

              <RevealCssClass as="div" className="cf-act cf-act--route" delay={1}>
                <div className="cf-act-art">
                  <RouteSurvey
                    active={routeActive}
                    pressed={routeGate}
                    onHover={(id) => setRouteHover(id)}
                    onToggle={toggleGate}
                    onDismiss={() => setRouteGate(null)}
                  />
                </div>
                <div className="cf-act-copy">
                  <div className="cf-act-label fo-mono" dir="ltr">
                    ACT 02 · ROUTE
                  </div>
                  <h3 className="cf-act-title">المسار يمرّ من أربع بوابات</h3>
                  <p className="cf-act-text">
                    مسّ بوابة في الرسم أو صفًّا في القائمة — يُبرز مقطعها على
                    المسار.
                  </p>
                  <div className="cf-stagelist" role="list" aria-label="بوابات المسار">
                    {STAGES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="cf-stage"
                        role="listitem"
                        aria-pressed={routeGate === s.id}
                        aria-label={`${s.name} — إبراز بوابة الرسم`}
                        onPointerEnter={() => setRouteHover(s.id)}
                        onPointerLeave={() =>
                          setRouteHover((cur) => (cur === s.id ? null : cur))
                        }
                        onClick={() => toggleGate(s.id)}
                      >
                        <span className="cf-stage-code" dir="ltr">{s.code}</span>
                        <span className="cf-stage-body">
                          <span className="cf-stage-name">{s.name}</span>
                          <span className="cf-stage-note">{s.note}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </RevealCssClass>
            </div>

            {/* ── the honest disclosure ─────────────────────────── */}
            <p className="cf-disclose">
              رسم توضيحي على بيانات مثال — لا يمثل تقدّمًا أكاديميًا حقيقيًا.
            </p>
          </div>
        </div>

        <div className="cf-bottomrule" aria-hidden="true" />
      </div>
    </section>
  );
}
