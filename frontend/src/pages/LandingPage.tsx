import { Navigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { useAuthStore } from '../stores/auth.store';
import { KnowledgeField, type KnowledgeFieldHandle } from '../components/landing/KnowledgeField';
import { useStageScroll } from '../hooks/useStageScroll';
import { SceneEntry } from '../components/landing/scenes/SceneEntry';
import { SceneSystem } from '../components/landing/scenes/SceneSystem';
import { SceneJourney } from '../components/landing/scenes/SceneJourney';
import { SceneOasis } from '../components/landing/scenes/SceneOasis';
import { SceneRoles, ROLES, type RoleKey } from '../components/landing/scenes/SceneRoles';
import { SceneQuality } from '../components/landing/scenes/SceneQuality';
import { SceneJoin, LandingFooter } from '../components/landing/scenes/SceneJoin';
import '../styles/landing.css';

/**
 * Landing — «منظومة المعرفة الحيّة» (v3).
 *
 * A seven-scene film over ONE persistent WebGL knowledge field that
 * morphs with the scroll (docs/execution-gap.md → rebuild order):
 *
 *   0 الدخول      — kinetic type + the university hub & 25 faculties
 *   1 المنظومة    — nine real functions close into orbital shells
 *   2 رحلة الطالب — the learning path draws itself
 *   3 واحة Oasis  — a calm, honest assistant exchange
 *   4 الأدوار     — four seats retune the whole scene
 *   5 الجودة      — lecture → assessment → analytics → decision
 *   6 الانضمام    — the field converges; three real entry paths
 *
 * Engineering contract:
 *   · native scrolling only (sticky stages — never hijacked)
 *   · one rAF-coalesced scroll engine writes CSS vars, zero React
 *     re-renders per frame (React state changes only on stage/role)
 *   · the WebGL field pauses offscreen/hidden, honors reduced-motion,
 *     and degrades to the CSS sky if WebGL is unavailable
 *   · authenticated users are redirected to their role home
 */

const STAGE_IDS = [
  'ln-stage-entry',
  'ln-stage-system',
  'ln-stage-journey',
  'ln-stage-oasis',
  'ln-stage-roles',
  'ln-stage-quality',
  'ln-stage-join',
];

export default function LandingPage() {
  useThemeSync();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  // Authenticated visitors never see the landing (defense-in-depth —
  // App.tsx's HomeRedirect already gates `/` for signed-in users).
  const redirectHome =
    isHydrated && user
      ? user.role === 'TEACHER' ? '/teacher/dashboard'
        : user.role === 'ADMIN' ? '/admin/dashboard'
          : user.role === 'QUALITY' ? '/quality/dashboard'
            : user.role === 'OWNER' ? '/owner/dashboard'
              : '/student/dashboard'
      : null;

  const fieldRef = useRef<KnowledgeFieldHandle | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [roleIndex, setRoleIndex] = useState(0);
  const roleLockUntil = useRef(0);

  /* one engine: stage progress → CSS vars + WebGL morph */
  useStageScroll(mainRef, useCallback((state: { stageProgress: number; active: number }) => {
    fieldRef.current?.setStageProgress(state.stageProgress);

    // roles scene (stage 4): scrub through the four seats; explicit
    // clicks lock the seat for 6s so the scrub doesn't fight the user.
    if (state.active === 4) {
      const now = performance.now();
      if (now > roleLockUntil.current) {
        const seg = Math.min(ROLES.length - 1, Math.floor((state.stageProgress - 4) * ROLES.length * 1.15));
        setRoleIndex(Math.max(0, seg));
      }
    }
  }, []));

  const selectRole = useCallback((i: number) => {
    roleLockUntil.current = performance.now() + 6000;
    setRoleIndex(i);
    fieldRef.current?.setRoleTint(i);
  }, []);

  useEffect(() => {
    fieldRef.current?.setRoleTint(null);
  }, [roleIndex]);

  /* nav gains its glass after the fold */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (redirectHome) return <Navigate to={redirectHome} replace />;

  const scrollToStage = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeRoleKey: RoleKey = (ROLES[roleIndex] ?? ROLES[0])?.key ?? 'student';

  return (
    <div className="landing" data-role={activeRoleKey}>
      {/* the living world — one persistent WebGL field behind the film */}
      <KnowledgeField className="ln-field" handleRef={fieldRef} />
      <div className="ln-sky" aria-hidden="true" />

      <header className={`ln-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <a className="ln-nav-brand" href="/">
          <span className="ln-nav-mark" aria-hidden="true">مدارك</span>
          <span className="ln-nav-sub">جامعة الزاوية</span>
        </a>
        <nav className="ln-nav-links" aria-label="أقسام الصفحة">
          <button type="button" onClick={() => scrollToStage(STAGE_IDS[1] ?? '')}>المنظومة</button>
          <button type="button" onClick={() => scrollToStage(STAGE_IDS[2] ?? '')}>الرحلة</button>
          <button type="button" onClick={() => scrollToStage(STAGE_IDS[3] ?? '')}>واحة</button>
          <button type="button" onClick={() => scrollToStage(STAGE_IDS[4] ?? '')}>الأدوار</button>
        </nav>
        <div className="ln-nav-cta">
          <a className="ln-nav-login" href="/auth">دخول</a>
          <a className="ln-nav-start" href="/auth/register">ابدأ الآن</a>
        </div>
      </header>

      <main ref={mainRef}>
        <section className="ln-stage ln-stage-entry" id={STAGE_IDS[0]} style={{ ['--h' as string]: '190vh' }}>
          <div className="ln-sticky">
            <SceneEntry onExplore={() => scrollToStage(STAGE_IDS[1] ?? '')} />
          </div>
        </section>

        <section className="ln-stage ln-stage-system" id={STAGE_IDS[1]} style={{ ['--h' as string]: '220vh' }}>
          <div className="ln-sticky">
            <SceneSystem />
          </div>
        </section>

        <section className="ln-stage ln-stage-journey" id={STAGE_IDS[2]} style={{ ['--h' as string]: '250vh' }}>
          <div className="ln-sticky">
            <SceneJourney />
          </div>
        </section>

        <section className="ln-stage ln-stage-oasis" id={STAGE_IDS[3]} style={{ ['--h' as string]: '230vh' }}>
          <div className="ln-sticky">
            <SceneOasis />
          </div>
        </section>

        <section className="ln-stage ln-stage-roles" id={STAGE_IDS[4]} style={{ ['--h' as string]: '260vh' }}>
          <div className="ln-sticky">
            <SceneRoles activeIndex={roleIndex} onSelect={selectRole} />
          </div>
        </section>

        <section className="ln-stage ln-stage-quality" id={STAGE_IDS[5]} style={{ ['--h' as string]: '220vh' }}>
          <div className="ln-sticky">
            <SceneQuality />
          </div>
        </section>

        <section className="ln-stage ln-stage-join" id={STAGE_IDS[6]} style={{ ['--h' as string]: '160vh' }}>
          <div className="ln-sticky">
            <SceneJoin />
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
