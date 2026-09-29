import { useEffect, useRef } from 'react';
import { CountUp } from '../../../components/CountUp';

/**
 * Scene 6 — من المحاضرة إلى القرار: قصّة البيانات المؤسسية.
 *
 * A data story in four stations (محاضرة ← تقييم ← تحليل ← قرار جودة).
 * Stations ignite in sequence with the stage's scroll progress; light
 * particles stream along the pipeline (CSS animation, paused for
 * reduced-motion). Below it: three honest counts from the real
 * platform (25 كلّيّة · 5 أدوار · 11 مسار تدريب) — measured facts only.
 */

const STATIONS = [
  { t: 'المحاضرة', d: 'تفاعل الطالب ونقاط الفحص يُسجَّلان لحظةً بلحظة' },
  { t: 'التقييم', d: 'الاختبارات والدرجات تتجمّع في ملفٍّ واحد' },
  { t: 'التحليل', d: 'المؤشّرات تكشف أنماط الفهم والفجوات' },
  { t: 'قرار الجودة', d: 'لجان الجودة ترى الصورة كاملة وتتصرّف' },
];

export function SceneQuality() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const p = reduced ? 1 : parseFloat(getComputedStyle(el).getPropertyValue('--p') || '0');
      el.querySelectorAll<HTMLElement>('.sc-qs').forEach((s, i) => {
        s.classList.toggle('is-lit', p >= (i + 0.6) / (STATIONS.length + 0.8));
      });
      el.classList.toggle('is-flowing', p > 0.25);
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
    <div className="sc sc-quality" ref={ref}>
      <header className="sc-head">
        <p className="ln-eyebrow"><span className="ln-eyebrow-dot" aria-hidden="true" />05 · المعرفة المؤسسية</p>
        <h2 className="sc-title">من كلّ محاضرة… يُصنع قرار</h2>
        <p className="sc-sub">هكذا تتدفّق المعرفة في مدارك — من مقعد الطالب إلى قرار الجامعة.</p>
      </header>

      <ol className="sc-quality-pipe" aria-label="مسار البيانات المؤسسية">
        {STATIONS.map((s, i) => (
          <li key={s.t} className="sc-qs">
            <span className="sc-qs-node" aria-hidden="true">
              <span className="sc-qs-core" />
              {i < STATIONS.length - 1 && <span className="sc-qs-flow" aria-hidden="true"><i /><i /><i /></span>}
            </span>
            <div className="sc-qs-body">
              <h3 className="sc-qs-title">{s.t}</h3>
              <p className="sc-qs-desc">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <dl className="sc-quality-counts">
        <div><dt>كلّيّة</dt><dd><CountUp value="25" /></dd></div>
        <div><dt>أدوار</dt><dd><CountUp value="5" /></dd></div>
        <div><dt>مسارات تدريب</dt><dd><CountUp value="11" /></dd></div>
      </dl>
    </div>
  );
}
