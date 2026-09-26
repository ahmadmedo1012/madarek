import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { ArrowLeft, Brain, Check, GraduationCap } from 'lucide-react';
import { Icon } from '../Icon';
import { RevealCssClass } from '../../hooks/useReveal';

/**
 * HeroScene — the landing's opening act.
 *
 * Wave-1.5 extraction: a pure move of the hero markup + its three
 * hero-local effects (spotlight, is-past pause, mockup parallax) out
 * of LandingPage — behavior-identical. The immersive redesign
 * (wave 2) rebuilds the composition here — asymmetric RTL diagonal,
 * MaskReveal title, ConstellationCanvas ambient — while keeping the
 * #top anchor, the CTA/colleges-trigger behaviors, and the real
 * dashboard mockup (2× capture of the seeded student dashboard).
 */
export function HeroScene(props: {
  collegesCount: number;
  onOpenColleges: () => void;
  collegesOpen: boolean;
}): JSX.Element {
  const heroRef = useRef<HTMLElement>(null);

  // Hero spotlight — radial glow follows the cursor across the entire
  // hero section. Disabled on touch devices and reduced-motion users.
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none)').matches;
    if (reduced || isTouch) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        el.style.setProperty('--hero-mx', `${x}%`);
        el.style.setProperty('--hero-my', `${y}%`);
      });
    };
    el.addEventListener('mousemove', onMove);
    return () => {
      el.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Hero ambient motion pause — once the hero scrolls fully out of
  // view we tag it with .is-past so the CSS track can pause its
  // ambient animations (spotlight drift, float loops).
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        el.classList.toggle('is-past', !entry.isIntersecting);
      }
    }, { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Mockup parallax — exposes a scroll progress var on the mockup
  // itself, ranging roughly -1 (well below viewport) … +1 (above).
  // CSS multiplies it for a gentle rise + scale-out on scroll.
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const mockup = document.querySelector<HTMLElement>('.landing-mockup');
    if (!mockup) return;

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = mockup.getBoundingClientRect();
        const vh = window.innerHeight;
        const offset = Math.max(-1, Math.min(1, (r.top - vh / 2) / vh));
        mockup.style.setProperty('--parallax', String(offset));
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={heroRef} id="top" className="marketing-container landing-hero">
      <div className="landing-hero-scene" aria-hidden="true">
        {/* Illustration slot — wave 2 replaces with ConstellationCanvas. */}
      </div>
      <RevealCssClass as="span" className="landing-hero-eyebrow">
        <strong>جديد</strong>
        المساعد الأكاديمي <bdi>«Oasis»</bdi> متاح الآن
        <Icon icon={ArrowLeft} size={12} />
      </RevealCssClass>
      <RevealCssClass as="h1" className="landing-title" delay={1}>
        <span className="word">منصّة</span>{' '}
        <span className="word"><em>التعليم</em></span>{' '}
        <span className="word">الذكيّ</span>
        <br />
        <span className="word">لجامعة</span>{' '}
        <span className="word landing-title-highlight">الزّاوية</span>
      </RevealCssClass>
      <RevealCssClass as="p" className="landing-subtitle" delay={2}>
        مساحة عمل أكاديمية واحدة تُمكّن الطالب والأستاذ والإدارة وضمان الجودة
        من إدارة المحاضرات، البحوث، الاختبارات والتقييم، بهدوء وسهولة.
      </RevealCssClass>
      <RevealCssClass as="div" className="landing-cta-row" delay={3}>
        <Link to="/auth" className="btn primary xl">
          أنشئ حسابك الجامعي
          <Icon icon={ArrowLeft} size={16} />
        </Link>
        <a href="#features" className="btn outline xl">شاهد كيف تعمل</a>
        <button
          type="button"
          className="btn ghost xl landing-colleges-trigger"
          onClick={props.onOpenColleges}
          aria-haspopup="dialog"
          aria-expanded={props.collegesOpen}
        >
          <Icon icon={GraduationCap} size={16} />
          <span>تصفّح الكلّيّات</span>
          <span className="landing-colleges-trigger-badge">{props.collegesCount}</span>
        </button>
      </RevealCssClass>

      <RevealCssClass as="div" delay={5}>
        <div className="landing-mockup">
          <div className="landing-mockup-frame">
            <div className="landing-mockup-chrome">
              <span className="landing-mockup-dot" />
              <span className="landing-mockup-dot" />
              <span className="landing-mockup-dot" />
            </div>
            <img
              src="/landing-dashboard.webp"
              alt="لوحة تحكّم الطالب في مدارك: المقرّرات النشطة، نسبة الحضور، تقدّم الفصل، والمعدّل التراكمي"
              className="landing-mockup-shot"
              width={1760}
              height={1100}
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="landing-mockup-badge landing-mockup-badge-2">
            <span className="sticker sm lavender"><Icon icon={Brain} size={18} /></span>
            <span className="landing-mockup-badge-text">
              <span className="landing-mockup-badge-title">Oasis</span>
              <span className="landing-mockup-badge-sub">يحضِّر ملخَّص الفصل…</span>
            </span>
          </div>
        </div>

        <div className="landing-cta-meta">
          <span className="landing-inline-cluster">
            <Icon icon={Check} size={14} /> بإيميلك الجامعي
          </span>
          <span className="landing-cta-meta-dot" />
          <span className="landing-inline-cluster">
            <Icon icon={Check} size={14} /> دعم RTL كامل
          </span>
          <span className="landing-cta-meta-dot" />
          <span className="landing-inline-cluster">
            <Icon icon={Check} size={14} /> اعتماد رسميّ
          </span>
        </div>
      </RevealCssClass>
    </section>
  );
}
