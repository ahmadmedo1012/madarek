/**
 * SheetNav — R331 (A-Web-Nav) — the landing masthead, rebuilt to the
 * Heron header's MEASURED mechanics (docs/redesign/r331/heron-program.md
 * §6 + heron-program.json `header`, evidence /home/z/heron-lab/data/
 * nav-1440.json / nav-390.json):
 *
 *  · fixed 56px bar at the sheet frame's 7px inset, TRANSPARENT paper in
 *    every state — no blur, no shadow, no on-scroll background wash
 *    (computed-verified on the reference at scrollY 0…900; the only
 *    chrome is the cell grammar's 1px #B3B3AF separators + bottom rule);
 *  · state machine, exactly the reference's class vocabulary:
 *      top        → `fo-header`
 *      > 1×bar    → `+ on-scroll`        (state marker — no paint)
 *      > 5×bar scrolling DOWN → `+ on-hide` → `.fo-header-inner`
 *        translateY(-101%) on transform .4s ease; scrolling UP (any
 *        amount) drops it again; guarded by pointer-over + an open menu
 *        and debounced 100ms before it latches;
 *  · the bar itself is pointer-transparent (the reference's
 *    pointer-events:none seat) — clicks pass through the empty paper to
 *    the sheet beneath; only the real cells take the pointer;
 *  · ≤991 the bar collapses to [logo | «القائمة» + the 3-line burger]
 *    and the menu panel below it opens on the reference's clip-path
 *    wipe — inset(0 0 100%) → inset(0), 0.4s ease, hairline L/R rules —
 *    with the row labels mask-revealing at delay 0.25 (CTA row 0.2) on
 *    the mask-line register (0.8s easeOutCubic), and the page scroll
 *    locked while open (the app's ref-counted body lock — Madarek's
 *    lenis.stop() twin: the reference freezes its smooth scroller, we
 *    freeze the window scroller);
 *  · the burger is the reference's own instrument: three 1.5rem hair
 *    lines, the outer pair scaling to 0 on active (transform .4s ease).
 *
 * Honest seats (R331): the bar's links are the site's REAL routes —
 * الرئيسية (/) · المقررات (#chapters — the learning-journey band is the
 * only courses surface a guest can read; the router has no public
 * /courses) · الكليات (/colleges) · الحرم الجامعي (/campus) · المسابقات
 * (/competitions — an auth-gated route: guests meet the login wall, the
 * honest current behaviour) · التطبيق (/app). The current page carries
 * the reference's 0.6rem signal square after its label.
 *
 * Carried forward verbatim from the r309/r313 contracts (pinned by
 * tests/e2e/r309-recovery.e2e.ts + guest-landing.e2e.ts): the menu's
 * ref-counted scroll lock, Escape-closes-and-refocuses, the outside-tap
 * fence, the Tab focus trap, the #chapters row, and the unmount-on-close
 * DOM contract (the exit clip plays on a lingering mount, then the panel
 * leaves the DOM).
 */
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Icon } from '../../Icon';
import { Logo } from '../../../brand';
import { ThemeToggle } from '../../layout/ThemeToggle';
import { acquireScrollLock, releaseScrollLock } from '../../../lib/scrollLock';
/* r335 (W-chrome) — the conformance hooks: nav.bar / nav.link.N /
 * nav.cta stamp the measured chrome seats for scripts/conformance
 * (mapping/_chrome.json). */
/* r331/nav.css — this component's whole stylesheet: the header state
 * machine, the cell grammar, the menu choreography. Imported here so
 * the block ships with the component that owns it (the R331
 * file-ownership contract — landing.css keeps nothing header-shaped). */
import '../../../styles/landing/nav.css';
import { BRAND_LABEL, LOGIN, START_NOW, WORKS_TODAY } from '../copy';

/* ── r309 (§3): the mobile menu's scroll-lock holder key — the open menu
 * owns the viewport via the ref-counted body lock (lib/scrollLock). */
const MENU_SCROLL_LOCK_KEY = 'landing-mobile-menu';

/* ── R331 — the seat register: the site's real public routes in the
 * reference's own order (home first, the deep surfaces after). `anchor`
 * seats stay in-page (the landing's own bands); every other seat is a
 * router route so the guest exit-sweep (GuestReveal) owns the
 * navigation. المسابقات is auth-gated — the link rides the same cell
 * grammar and the ProtectedRoute gives the guest the honest login wall
 * (documented in docs/redesign/r331/web-nav.md). */
type NavSeat = { label: string; href: string; anchor?: boolean };

const NAV_SEATS: readonly NavSeat[] = [
  { label: 'الرئيسية', href: '/' },
  { label: 'المقررات', href: '#chapters', anchor: true },
  { label: 'الكليات', href: '/colleges' },
  { label: 'الحرم الجامعي', href: '/campus' },
  { label: 'المسابقات', href: '/competitions' },
  { label: 'التطبيق', href: '/app' },
] as const;

/* r170d — «ما يعمل اليوم» stays reachable from the MOBILE menu (the
 * honesty-ledger pin) after the desktop dropdown grammar retired with
 * the flat R331 seat register. */
const MOBILE_LEDGER_ROW = { label: WORKS_TODAY, href: '/capabilities' } as const;

/* ── The dual-label roll (the reference's .btn-fill-label top/bot pair —
 * label swap 0.48s cubic-bezier(.625,.05,0,1), measured): the live row
 * in flow + an aria-hidden duplicate parked one row below; the track's
 * -100% slide travels exactly one row. The dup is out of flow, so
 * wrapping never desynchronises the two rows. */
function RollLabel({ text }: { text: string }) {
  return (
    <span className="fo-roll">
      <span className="fo-roll-track">
        <span className="fo-roll-txt">{text}</span>
        <span className="fo-roll-txt fo-roll-dup" aria-hidden="true">{text}</span>
      </span>
    </span>
  );
}

/* The desktop nav — the seat register over the bar's ruled cells. The
 * current page (the landing itself) carries the reference's 0.6rem
 * signal square + the primary ink (w--current), and — exactly like the
 * reference — drops out of pointer reach (a link to where you are). */
function HeaderNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fo-nav" aria-label="التنقل الرئيسي" data-spec="nav.row">
      {NAV_SEATS.map((seat, i) => {
        const current = !seat.anchor && seat.href === pathname;
        /* r339 (T-10) — her seat register alternates button/a cells
         * (seats 0+2 are her <button> mega-menu triggers, 1+3 her <a>
         * links — the frozen chrome spec); the button-class seats carry
         * the 1.35 button-register row (nav.css .is-btn-seat). */
        const cls = [
          'fo-nav-link',
          i % 2 === 0 ? 'is-btn-seat' : '',
          current ? 'is-current' : '',
        ].filter(Boolean).join(' ');
        return seat.anchor ? (
          <a key={seat.href} href={seat.href} className={cls} data-spec={`nav.link.${i}`}>
            <RollLabel text={seat.label} />
          </a>
        ) : (
          <Link
            key={seat.href}
            to={seat.href}
            className={cls}
            data-spec={`nav.link.${i}`}
            aria-current={current ? 'page' : undefined}
          >
            <RollLabel text={seat.label} />
          </Link>
        );
      })}
    </nav>
  );
}

export function SheetNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  /* the DOM lifecycle: the panel mounts on open and LINGERS through the
   * 0.4s exit clip before unmounting (the r309 toHaveCount(0) pin reads
   * the unmount; the clip plays on the way out). */
  const [menuMounted, setMenuMounted] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  /* the scroll driver's live view of the menu state (no re-render per
   * scroll event — the r172 pattern, kept). */
  const menuOpenRef = useRef(false);
  menuOpenRef.current = menuOpen;

  /* ── the menu lifecycle: mount on open, hold the DOM 420ms on close
   * (the clip-path reverse resolves in 400ms), then unmount. A re-open
   * inside the window cancels the unmount and the panel simply plays
   * the open clip again. */
  useEffect(() => {
    if (menuOpen) {
      setMenuMounted(true);
      return undefined;
    }
    if (!menuMounted) return undefined;
    const t = window.setTimeout(() => setMenuMounted(false), 420);
    return () => window.clearTimeout(t);
    // menuMounted is deliberately read, not tracked: the timer arms only
    // on the open→close edge, never on a mount-state settle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen]);

  /* ── the open/close class flip: the panel must PAINT its closed state
   * before the wipe starts, so .is-open lands two frames after the
   * mount (the reference's clip engages at ~17ms — the same first-paint
   * cadence). Closing removes the class in the same frame the state
   * flips, so the reverse clip plays while the DOM lingers. */
  useEffect(() => {
    if (!menuMounted) return undefined;
    const nav = menuRef.current;
    if (!nav) return undefined;
    if (menuOpen) {
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => nav.classList.add('is-open'));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    nav.classList.remove('is-open');
    return undefined;
  }, [menuMounted, menuOpen]);

  /* ── r309 (§3): the open menu OWNS the viewport — the ref-counted body
   * scroll lock stops the background document from scrolling behind the
   * fixed panel (the reference's lenis.stop()/start() pair). Released at
   * close START (the reference starts its engine the moment close
   * begins; the lingering exit clip is paint, not interaction). */
  useEffect(() => {
    if (!menuOpen) return undefined;
    acquireScrollLock(MENU_SCROLL_LOCK_KEY);
    return () => releaseScrollLock(MENU_SCROLL_LOCK_KEY);
  }, [menuOpen]);

  /* ── r309 (§3.3): Escape closes the open menu FROM ANYWHERE and
   * refocuses the trigger on close (the F2-5 contract). */
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      burgerRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  /* ── r307 (1-C M-5): the mobile menu closes on an outside tap — touch
   * taps on the page behind the panel never blur it. The burger's own
   * tap is left to the burger (the toggle re-open race, failure 4). */
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      const menu = menuRef.current;
      const t = e.target as Node | null;
      if (!t) return;
      if (menu?.contains(t)) return;
      if (burgerRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  /* ═══ R331 — the header state machine (the reference's updateOnScroll,
   * decoded in heron-program.md §6):
   *     on-scroll  ⇔ y > 1 × bar height
   *     on-hide    ⇔ scrolling DOWN past 5 × bar height, debounced
   *                  100ms, suppressed while the pointer is over the
   *                  bar or the menu is open
   *     show       ⇔ any upward scroll (immediate)
   * The paint is pure CSS (nav.css): on-hide translates the INNER bar
   * -101% on transform .4s ease and kills the bar's pointer reach; this
   * driver only writes class names — zero setState per scroll event,
   * coalesced to one rAF per frame, with the scroll read on the EVENT
   * (passive, fires before rAF callbacks — the R318 C2 layout rule).
   * Reconciled on load / resize / fonts-ready (r307 1-C H-2: late media
   * must not strand a stale class while the visitor sits still).
   * Reduced motion: the classes still flip (state, not motion) — nav.css
   * collapses the transforms and keeps the bar pinned. */
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;

    let lastY = window.scrollY;
    let pendingY = lastY;
    let overBar = false;
    let hideTimer = 0;
    let raf = 0;

    const onEnter = () => { overBar = true; };
    const onLeave = () => { overBar = false; };

    /* R332 W9 — the bar height is CACHED (one offsetHeight read at
     * effect-mount + the explicit re-measure seats), not read per
     * scroll frame: the CDP profile put the per-frame forced layout at
     * 11.1% of the 4×-throttled scroll window (SheetNav.tsx:261). The
     * bar is a fixed-height chrome seat — resize/load/fonts-ready are
     * the re-measure triggers (the r307 1-C H-2 reconciliation list). */
    let barH = header.offsetHeight || 56;

    const apply = () => {
      raf = 0;
      const y = pendingY;
      const h = barH;
      header.classList.toggle('on-scroll', y > h);
      const prev = lastY;
      lastY = y;
      if (y > prev) {
        /* scrolling DOWN: past 5× the bar, un-hovered, menu shut — arm
         * the 100ms debounce, then re-check every guard at fire time
         * (the direction re-check uses the LIVE scrollY, so a flicker
         * of upward motion inside the window cancels the latch). */
        if (y > h * 5 && !overBar && !menuOpenRef.current) {
          window.clearTimeout(hideTimer);
          hideTimer = window.setTimeout(() => {
            hideTimer = 0;
            if (overBar || menuOpenRef.current) return;
            const now = window.scrollY;
            if (now > h * 5 && now >= lastY) header.classList.add('on-hide');
          }, 100);
        }
      } else if (y < prev) {
        /* scrolling UP: the bar returns immediately (the debounce is
         * the hide branch's alone — measured on the reference). */
        window.clearTimeout(hideTimer);
        hideTimer = 0;
        header.classList.remove('on-hide');
      }
    };

    const onScroll = () => {
      pendingY = window.scrollY;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const onRemeasure = () => {
      barH = header.offsetHeight || barH;
      onScroll();
    };

    apply();
    header.addEventListener('pointerenter', onEnter);
    header.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onRemeasure, { passive: true });
    window.addEventListener('load', onRemeasure);
    document.fonts?.ready?.then?.(onRemeasure).catch(() => undefined);
    return () => {
      header.removeEventListener('pointerenter', onEnter);
      header.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onRemeasure);
      window.removeEventListener('load', onRemeasure);
      document.fonts?.ready?.then?.(onRemeasure).catch?.(() => undefined);
      window.clearTimeout(hideTimer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  /* the reveal ladder's per-row index (the reference's SplitText mask
   * stagger retold as a CSS transition-delay rung). */
  const rowStyle = (i: number): CSSProperties => ({ '--i': i } as CSSProperties);

  return (
    <header className="fo-header" ref={headerRef} data-spec="nav.bar">
      {/* r339 (T-10) — the chrome grammar mirrors the frozen Heron spec
          tree (docs/redesign/r335/heron-spec/chrome.<bp>.json): the
          transform SEAT (.fo-header-inner ≡ her container div[1] — the
          on-hide -101% lift + transform .4s ease live here, exactly the
          reference's own seat) wraps the BAR ROW (.fo-header-bar ≡ her
          inner div[2]) which carries the measured 1px bottom rule as a
          REAL element (.fo-header-rule ≡ her rule div[1] — the border on
          .fo-header stays: the r306 sheet contract pins it; the rule div
          rides the same pixel, same ink). */}
      <div className="fo-header-inner">
        <div className="fo-header-bar">
          <div className="fo-header-rule" data-spec="nav.rule" aria-hidden="true" />

          {/* the brand zone — her left cluster (the flex-grow logo seat):
              mark + «مدارك» wordmark (the guest-landing e2e reads the
              wordmark; the display voice seats it). The mark span carries
              the measured 32×36 logo seat; our 26px mark centers in it. */}
          <div className="fo-brand-zone" data-spec="nav.zone.brand">
            <Link to="/" className="fo-brand" aria-label={BRAND_LABEL} data-spec="nav.brand">
              <span className="fo-brand-mark" data-spec="nav.brand.mark">
                <Logo variant="mark" size={26} />
              </span>
              <span className="fo-brand-name" data-spec="nav.brand.name">مدارك</span>
            </Link>
          </div>

          <div className="fo-nav-wrap" data-spec="nav.zone.menu">
            <HeaderNav />
          </div>

          <div className="fo-header-actions" data-spec="nav.zone.actions">
            <ThemeToggle />
            <Link to="/auth" className="fo-actions-login">{LOGIN}</Link>
            {/* the CTA cell — her anatomy: the 1px boundary rule + the
                content wrap, both real elements for the measured seats. */}
            <Link to="/auth/register" className="fo-actions-cta" data-spec="nav.cta">
              <span className="fo-cta-rule" aria-hidden="true" data-spec="nav.cta.rule" />
              <span className="fo-cta-main" data-spec="nav.cta.main">
                <RollLabel text={START_NOW} />
                <Icon icon={ArrowLeft} size={14} className="fo-actions-cta-arrow" aria-hidden />
              </span>
            </Link>
          </div>

          {/* ≤991 — [«القائمة» + the reference's three-line instrument].
              The visible label rides the BUTTON (the reference's own
              anatomy: text + the 3-line icon at the inline-end); the outer
              pair of lines collapses to scale(0) on active (nav.css) —
              the single centre hair is the reference's close affordance. */}
          <button
            type="button"
            className="fo-burger"
            ref={burgerRef}
            data-spec="nav.menu.btn"
            aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={menuOpen}
            aria-controls="fo-mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="fo-burger-txt" data-spec="nav.menu.label">القائمة</span>
            <span className="fo-burger-ic" aria-hidden="true" data-spec="nav.menu.icon">
              <i className="fo-burger-line" data-spec="nav.menu.line.0" />
              <i className="fo-burger-line" data-spec="nav.menu.line.1" />
              <i className="fo-burger-line" data-spec="nav.menu.line.2" />
            </span>
          </button>
        </div>
      </div>

      {menuMounted && (
        <nav
          id="fo-mobile-menu"
          className="fo-mobile-menu"
          /* while any smooth engine is live on '/', a wheel/touch inside
             this panel must scroll the PANEL (its own overflow-y), never
             the page behind it — the engine's own vocabulary. */
          data-lenis-prevent=""
          ref={menuRef}
          aria-label="قائمة الجوال"
          onClick={(e) => {
            // Link taps close the menu; taps on non-link chrome must
            // not (the theme row stops propagation for its toggle).
            if ((e.target as HTMLElement).closest('a')) closeMenu();
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              closeMenu();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              closeMenu();
              burgerRef.current?.focus();
              return;
            }
            /* the open overlay is a focus trap: Tab cycles inside it
               (the burger re-takes focus itself on close). */
            if (e.key === 'Tab') {
              const items = menuRef.current?.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled])',
              );
              if (!items || items.length === 0) return;
              const first: HTMLElement | undefined = items[0];
              const last: HTMLElement | undefined = items[items.length - 1];
              if (!first || !last) return;
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }
          }}
        >
          {/* the seat register as ruled rows — each label mask-reveals
              (the reference's SplitText grammar retold in CSS: the row
              is the mask, the .fo-mb-txt span the line; delay 0.25 +
              i×0.02 on the open clip, 0.8s easeOutCubic). */}
          {NAV_SEATS.map((seat, i) => (
            seat.anchor ? (
              <a key={seat.href} href={seat.href} className="fo-mb-row" style={rowStyle(i)}>
                <span className="fo-mb-txt">{seat.label}</span>
              </a>
            ) : (
              <Link key={seat.href} to={seat.href} className="fo-mb-row" style={rowStyle(i)}>
                <span className="fo-mb-txt">{seat.label}</span>
              </Link>
            )
          ))}
          <div className="fo-mb-sub" aria-label="أقسام الصفحة">
            <Link
              to={MOBILE_LEDGER_ROW.href}
              className="fo-mb-row fo-mb-sub-row"
              style={rowStyle(NAV_SEATS.length)}
            >
              <span className="fo-mb-txt">{MOBILE_LEDGER_ROW.label}</span>
            </Link>
          </div>
          <div
            className="fo-mobile-theme"
            onClick={(e) => e.stopPropagation()}
            style={rowStyle(NAV_SEATS.length + 1)}
          >
            <span className="fo-mobile-theme-label">المظهر</span>
            <ThemeToggle />
          </div>
          <Link
            to="/auth"
            className="btn ghost fo-mb-login"
            style={rowStyle(NAV_SEATS.length + 2)}
          >
            <span className="fo-mb-txt">{LOGIN}</span>
          </Link>
          {/* the CTA row — the reference's own early seat: delay 0.2,
              BEFORE the link rows (measured), the 51px register row. */}
          <Link to="/auth/register" className="btn primary fo-mb-cta">
            <span className="fo-mb-txt">
              {START_NOW}
              <Icon icon={ArrowLeft} size={14} className="fo-mb-cta-arrow" aria-hidden />
            </span>
          </Link>
        </nav>
      )}
    </header>
  );
}
