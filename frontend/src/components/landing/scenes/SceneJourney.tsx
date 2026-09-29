import { useEffect, useRef } from 'react';
import { JourneyThreadArt } from '../../../lib/illustrations/landing-film';

/**
 * Scene 3 — رحلة الطالب: من أول محاضرة إلى سدِّ الفجوة.
 *
 * A connected journey rail, NOT a grid: eight milestones along one
 * drawn path (SVG stroke, scroll-scrubbed by the stage's --p var).
 * Milestones light up sequentially as the line passes them. On mobile
 * the rail becomes a vertical thread. Every step names a REAL product
 * capability (dashboard → courses → lecture checkpoints → Oasis help
 * → exam → progress → gap discovery → remedial path).
 */

const MILESTONES = [
  { t: 'يدخل مدارك', d: 'لوحة تحكم ترحّب به وتعرض مقرّراته الحقيقية', icon: 'Compass' },
  { t: 'يفتح مقرّره', d: 'المحاضرات ونقاط الفحص ومراجع المقرّر في مكانٍ واحد', icon: 'BookOpen' },
  { t: 'يشاهد المحاضرة', d: 'الفيديو يتوقّف عند نقاط فحصٍ تتحقّق من فهمه', icon: 'PlayCircle' },
  { t: 'يطلب المساعدة', d: 'واحة تشرح المفهوم من سياق المحاضرة نفسها', icon: 'Sparkles' },
  { t: 'يؤدّي الاختبار', d: 'أسئلة تُصحَّح فوريًا بتغذيةٍ راجعة واضحة', icon: 'ClipboardCheck' },
  { t: 'يرى تقدّمه', d: 'نسبة الإنجاز والمهارات تتراكم أمامه', icon: 'Activity' },
  { t: 'تظهر الفجوة', d: 'التحليلات تكشف المفهوم الذي يحتاج تعزيزًا', icon: 'Search' },
  { t: 'يسدُّ الفجوة', d: 'مسار علاجي بالمصادر والمحاضرات المناسبة', icon: 'Route' },
];

export function SceneJourney() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  // scroll-scrub: the path draws with the stage's own --p (written by
  // useStageScroll on the ancestor .ln-stage). Milestones light when
  // the drawn fraction passes them.
  useEffect(() => {
    const stage = stageRef.current;
    const path = pathRef.current;
    if (!stage || !path) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const p = reduced ? 1 : parseFloat(getComputedStyle(stage).getPropertyValue('--p') || '0');
      const draw = Math.max(0, Math.min(1, p * 1.18));
      path.style.strokeDashoffset = String(1 - draw);
      const nodes = stage.querySelectorAll<HTMLElement>('.sc-jm');
      nodes.forEach((el, i) => {
        const passed = draw >= (i + 0.35) / MILESTONES.length;
        el.classList.toggle('is-lit', passed);
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };

    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="sc sc-journey" ref={stageRef}>
      <header className="sc-head">
        <p className="ln-eyebrow"><span className="ln-eyebrow-dot" aria-hidden="true" />02 · تجربة الطالب</p>
        <h2 className="sc-title">رحلةٌ واحدة… من أوّل محاضرة إلى الإتقان</h2>
        <p className="sc-sub">هكذا يعيش الطالب أسبوعه داخل مدارك — خطوةً بخطوة.</p>
      </header>

      <ol className="sc-journey-rail" aria-label="رحلة الطالب في مدارك">
        {MILESTONES.map((m, i) => (
          <li key={m.t} className={`sc-jm ${i === 3 ? 'sc-jm-oasis' : ''} ${i === 7 ? 'sc-jm-goal' : ''}`}>
            <span className="sc-jm-index" aria-hidden="true">{i + 1}</span>
            <div className="sc-jm-body">
              <h3 className="sc-jm-title">{m.t}</h3>
              <p className="sc-jm-desc">{m.d}</p>
            </div>
          </li>
        ))}
        <JourneyThreadArt pathRef={pathRef} />
      </ol>
    </div>
  );
}
