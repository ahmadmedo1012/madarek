import { useEffect, useRef, useState } from 'react';

/**
 * Scene 4 — Oasis: واحةٌ تهدأ فيها الأسئلة.
 *
 * A quiet scene, deliberately slower than the rest of the film: a soft
 * breathing light, a realistic chat exchange (played once when the
 * scene becomes active — typed bubbles, then left composed), and four
 * capability sparks that light in sequence. The copy promises only
 * what the real assistant does — contextual help, simplification,
 * summarised checkpoints, generated quizzes — no sci-fi claims.
 */

const CHAT: { from: 'student' | 'oasis'; text: string }[] = [
  { from: 'student', text: 'لم أفهم نقاط الفحص الأخيرة من محاضرة «مقدمة في الخوارزميات». تلخّصها لي؟' },
  { from: 'oasis', text: 'ركّز على ثلاثة مفاهيم: التعقيد الزمني، الحلقات المتداخلة، وأنماط البحث. أخبرك بأهمّها بالترتيب…' },
  { from: 'student', text: 'فهمت! اختبرني فيهم' },
  { from: 'oasis', text: 'جهّزت لك اختبارًا قصيرًا من 5 أسئلة من نقاط الفحص نفسها. بالتوفيق 🌴' },
];

const CAPABILITIES = ['يلخّص المحاضرات', 'يبسّط المفاهيم', 'يولّد اختبارات', 'يوجّه حسب أدائك'];

export function SceneOasis() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(0); // 0 hidden → 1..4 bubbles → 5 sparks

  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let timers: number[] = [];
    const play = () => {
      timers.forEach(clearTimeout);
      timers = [];
      setStep(0);
      if (reduced) { setStep(5); return; }
      CHAT.forEach((_, i) => {
        timers.push(window.setTimeout(() => setStep(i + 1), 350 + i * 1400));
      });
      timers.push(window.setTimeout(() => setStep(5), 350 + CHAT.length * 1400 + 300));
    };

    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && entries[0].intersectionRatio > 0.35) {
        play();
      }
    }, { threshold: [0.35] });
    io.observe(el);
    return () => { io.disconnect(); timers.forEach(clearTimeout); };
  }, []);

  return (
    <div className="sc sc-oasis" ref={sceneRef}>
      <div className="sc-oasis-breath" aria-hidden="true" />

      <header className="sc-head">
        <p className="ln-eyebrow"><span className="ln-eyebrow-dot" aria-hidden="true" />03 · المساعد الأكاديمي</p>
        <h2 className="sc-title">واحةٌ تهدأ فيها الأسئلة</h2>
        <p className="sc-sub">مساعدٌ يعمل ضمن صلاحياتك ومقرّراتك — مساعدة أكاديمية حقيقية، لا وعود خارقة.</p>
      </header>

      <div className="sc-oasis-panel">
        <div className="sc-oasis-panel-head">
          <span className="sc-oasis-avatar" aria-hidden="true">🌴</span>
          <div>
            <p className="sc-oasis-name">واحة · Oasis</p>
            <p className="sc-oasis-status">يفهم سياق مقرّرك</p>
          </div>
        </div>

        <div className="sc-oasis-chat" role="log" aria-label="مثال محادثة مع المساعد الأكاديمي">
          {CHAT.map((m, i) => (
            <div
              key={i}
              className={`sc-bubble sc-bubble-${m.from} ${step > i ? 'is-in' : ''}`}
              aria-hidden={step > i ? undefined : 'true'}
            >
              {m.text}
            </div>
          ))}
          {step > 0 && step <= CHAT.length && step % 2 === 1 && (
            <div className="sc-bubble sc-bubble-oasis sc-typing" aria-hidden="true">
              <span /><span /><span />
            </div>
          )}
        </div>

        <ul className="sc-oasis-sparks" aria-label="قدرات المساعد">
          {CAPABILITIES.map((c, i) => (
            <li key={c} className={`sc-spark ${step >= 5 ? 'is-lit' : ''}`} style={{ transitionDelay: `${i * 160}ms` }}>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
