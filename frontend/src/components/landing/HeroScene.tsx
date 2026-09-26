import { Link } from 'react-router-dom';
import { useEffect, useRef, type CSSProperties } from 'react';
import { ArrowLeft, Brain, Check, GraduationCap } from 'lucide-react';
import { Icon } from '../Icon';
import { RevealCssClass } from '../../hooks/useReveal';
import { ConstellationCanvas, MaskReveal } from '../motion';
import '../../styles/landing-hero.css';

/**
 * HeroScene — the landing's signature opening act, «مدارك تتوسّع».
 *
 * Wave-2 immersive rebuild of the wave-1.5 extraction:
 * · LIVE SCENE — ConstellationCanvas (copper knowledge nodes on three
 *   orbital rings around an off-center core) mounted as an absolute
 *   layer behind all text, over a calm --journey-glow wash and three
 *   faint static ring outlines that keep the "orbits" reading even if
 *   the canvas never paints. Pointer-transparent, aria-hidden, zero
 *   layout impact (hero is above the fold — no content-visibility).
 * · ASYMMETRIC RTL DIAGONAL — eyebrow+title cluster anchors
 *   inline-start in the upper third; subtitle+CTA block anchors
 *   inline-end a step lower (named grid areas, ≥921px only; below
 *   that the centered column from landing.css stands back up).
 * · TITLE — word-mask reveal (MaskReveal, never char-split), the
 *   exact same copy, «الذكيّ» carrying the <em> accent and a single
 *   copper period closing the sentence (reference principle #6).
 * · CTA CRAFT — the three CTAs keep their behaviors; the primary one
 *   rolls its label on hover/focus (principle #7, CSS-only).
 * · KEPT — the three hero-local effects (cursor spotlight, is-past
 *   ambient pause, mockup parallax), the #top anchor, the real
 *   dashboard mockup + Oasis badge + micro-tagline row.
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
    <section
      ref={heroRef}
      id="top"
      className="marketing-container landing-hero landing-hero-diagonal"
    >
      {/* ── Live scene — orbits, wash and static fallback rings.
          Decorative as a whole; behind every content act; never
          intercepts a pointer (see landing-hero.css §1). ─────────── */}
      <div className="hero-scene" aria-hidden="true">
        <div className="hero-scene-glow" />
        <div className="hero-orbits">
          <span className="hero-orbit hero-orbit-1" />
          <span className="hero-orbit hero-orbit-2" />
          <span className="hero-orbit hero-orbit-3" />
        </div>
        <ConstellationCanvas hostRef={heroRef} className="hero-constellation" />
      </div>

      {/* ── Upper act — eyebrow + title, anchored inline-start ───── */}
      <div className="hero-head">
        <RevealCssClass as="span" className="landing-hero-eyebrow">
          <strong>جديد</strong>
          المساعد الأكاديمي <bdi>«Oasis»</bdi> متاح الآن
          <Icon icon={ArrowLeft} size={12} />
        </RevealCssClass>

        {/* Word-mask title — Arabic words are masked whole (never
            split per character). Per-word MaskReveal instances carry
            the stagger explicitly so the <em> accent and the copper
            period can live inside the same masked flow. The period
            rides motion.css's documented mask contract (data-mask-word
            + --mask-delay custom property) so it rises WITH the last
            word instead of floating before it. */}
        <h1 className="landing-title landing-title-mask">
          <MaskReveal as="span" delay={0}>منصّة</MaskReveal>{' '}
          <MaskReveal as="span" delay={60}>التعليم</MaskReveal>{' '}
          <em>
            <MaskReveal as="span" delay={120}>الذكيّ</MaskReveal>
          </em>{' '}
          <br />
          <MaskReveal as="span" delay={180}>لجامعة</MaskReveal>{' '}
          <MaskReveal as="span" delay={240}>الزّاوية</MaskReveal>
          <span
            className="landing-title-period"
            aria-hidden="true"
            data-mask-word="true"
            style={
              { '--mask-delay': 'calc(5 * var(--motion-stagger-step))' } as CSSProperties
            }
          >
            <span data-mask-word-inner="true">.</span>
          </span>
        </h1>
      </div>

      {/* ── Lower act — subtitle + CTAs, anchored inline-end (the
          diagonal's second step). Collapses into the centered column
          at ≤920px. ─────────────────────────────────────────────── */}
      <div className="hero-lead">
        <RevealCssClass as="p" className="landing-subtitle" delay={2}>
          مساحة عمل أكاديمية واحدة تُمكّن الطالب والأستاذ والإدارة وضمان الجودة
          من إدارة المحاضرات، البحوث، الاختبارات والتقييم، بهدوء وسهولة.
        </RevealCssClass>
        <RevealCssClass as="div" className="landing-cta-row" delay={3}>
          {/* Primary CTA — label-roll micro-interaction: the visible
              label translates up while an aria-hidden duplicate rolls
              in from below (CSS-only, reduced-motion-safe). */}
          <Link to="/auth" className="btn primary xl" data-labelroll="true">
            <span className="labelroll">
              <span className="labelroll-text">أنشئ حسابك الجامعي</span>
              <span className="labelroll-text" aria-hidden="true">أنشئ حسابك الجامعي</span>
            </span>
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
      </div>

      {/* ── Bottom act — mockup + micro-taglines, full width ─────── */}
      <RevealCssClass as="div" className="hero-act" delay={5}>
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
