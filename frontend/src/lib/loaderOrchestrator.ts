/* ═════════════════════════════════════════════════════════════════════
 * loaderOrchestrator — R323 §A2 (task 1-b) — the ONE loading surface.
 * ═════════════════════════════════════════════════════════════════════
 * Problem: several loading surfaces can coexist and overlap —
 * HydrationSplash (the copper star), the landing SheetLoader (the
 * «لوحة البدء» intro), route Suspense fallbacks, skeletons, the
 * consent banner, the onboarding veil, the menu drawer, toasts. The
 * owner's demand: exactly ONE full-screen layer at a time, never two
 * logos on screen, a single orchestrator state machine.
 *
 * This module is the framework-free singleton that owns that truth.
 * Components (Splash, RouteProgress, SlowServerCard — and the
 * foreman-integrated SheetLoader) render from its snapshot and render
 * NOTHING when their layer is inactive, so wiring is trivial.
 *
 * ── The state diagram ────────────────────────────────────────────────
 *
 *   PHASE (the app's boot maturity — one-way):
 *     boot ──markHydrating()──▶ hydrating ──markReady()──▶ ready
 *       └────────markReady() (defensive shortcut)───────────▲
 *     Demotion is refused: markHydrating() after ready is rejected.
 *
 *   SEAT (the ONE full-screen layer — exactly 0 or 1 active):
 *     splash ──splashExited()──▶ null ──activateSheetLoader()──▶ sheet-loader
 *        ▲                                                        │
 *        │                                    releaseSheetLoader()/skip()
 *        ▼                                                        ▼
 *      null ◀────────────────────────────────────────────────── null
 *     · The seat STARTS owned by splash (first paint).
 *     · markReady() does NOT free the seat — the splash owns its own
 *       ≤250 ms exit and calls splashExited() when truly gone; only
 *       then does the seat free (and a queued sheet request grant).
 *     · A sheet request arriving while ANY seat is held is QUEUED
 *       (pendingSheet) and auto-granted the moment the seat frees —
 *       the invariant «activeFullscreen is 0 or 1» holds by
 *       construction: the seat is a single variable.
 *     · setServerSlow(true) PREEMPTS the seat (remembered) and
 *       setServerSlow(false) restores it — except a splash restored
 *       after ready is voided (nothing re-mounts the boot splash).
 *
 *   SIDE STATES (independent booleans/numbers — never fullscreen):
 *     routeTransition + routeProgress  → the 2 px RouteProgress strip
 *     serverSlow                       → drives the slow-server seat
 *     reducedMotion                    → components render static
 *     skipRequested                    → a skip gesture arrived; the
 *       ACTIVE layer's component consumes it and completes its own
 *       exit (the orchestrator never unmounts anything mid-animation).
 *
 * ── First-visit contract ─────────────────────────────────────────────
 * shouldPlayIntro() is true ONLY when there is no
 * localStorage['madarek.intro.v1'] flag AND the visitor is not
 * authenticated (the persisted `mdrk-auth` zustand session — see
 * stores/auth.store.ts). Additional SUPPRESSORS (they can never cause
 * a play, only prevent a double intro): prefers-reduced-motion, the
 * hermetic e2e opt-out (`madarek-intro-skip`) and the R313 session
 * seen-flag (`madarek-intro-seen`) — both owned by lib/motion/introGate
 * (read-only import; that file is NOT modified).
 *
 * ── Reduced motion ───────────────────────────────────────────────────
 * reducedMotion() re-reads matchMedia on every call (no caching, so
 * tests can re-install the mock and live sessions re-resolve on every
 * snapshot build); the snapshot carries the value so components render
 * static. The global base.css 0.01 ms belt backstops everything.
 *
 * Pure module state — no React except the tiny useLoaderState hook
 * (useSyncExternalStore). SSR-safe: every window touch is guarded.
 * ═════════════════════════════════════════════════════════════════════ */
import { useSyncExternalStore } from 'react';

import { INTRO_SEEN_KEY, INTRO_SKIP_KEY } from './motion/introGate';

/* ── Public types ─────────────────────────────────────────────────── */

/** The app's boot maturity — one-way: boot → hydrating → ready. */
export type LoaderPhase = 'boot' | 'hydrating' | 'ready';

/**
 * The full-screen layers the orchestrator arbitrates. At most ONE is
 * active at any instant (the seat); `FullscreenSeat` adds null.
 */
export type FullscreenLayer = 'splash' | 'sheet-loader' | 'slow-server';
export type FullscreenSeat = FullscreenLayer | null;

/** Immutable snapshot for useSyncExternalStore consumers. */
export interface LoaderSnapshot {
  readonly phase: LoaderPhase;
  /** The ONE active full-screen layer — null when none. */
  readonly fullscreen: FullscreenSeat;
  /** Side state: a route transition is in flight (the 2 px strip). */
  readonly routeTransition: boolean;
  /** null = indeterminate; 0..1 = determinate strip fill. */
  readonly routeProgress: number | null;
  /** Side state: the cold-start card is warranted (Render free plan). */
  readonly serverSlow: boolean;
  /** A skip gesture (click/Escape/Enter/Space) arrived and is unconsumed. */
  readonly skipRequested: boolean;
  /** Live prefers-reduced-motion at the last snapshot build. */
  readonly reducedMotion: boolean;
}

/** Minimal storage shape accepted by the intro decision (injection seam
 *  for tests; the live default is window.localStorage/sessionStorage). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The R323 first-visit flag — the cross-session «has seen the intro»
 *  truth (the R313 sessionStorage seen-flag stays as a suppressor). */
export const INTRO_FLAG_KEY = 'madarek.intro.v1';

/** The persisted zustand auth session (stores/auth.store.ts `name`). */
export const AUTH_PERSISTENCE_KEY = 'mdrk-auth';

/* ── Machine state (module-private) ────────────────────────────────── */

interface MachineState {
  phase: LoaderPhase;
  seat: FullscreenSeat;
  routeTransition: boolean;
  routeProgress: number | null;
  serverSlow: boolean;
  skipRequested: boolean;
  /** A sheet-loader request queued while the seat was held. */
  pendingSheet: boolean;
  /** The seat held before a slow-server preemption (restore source). */
  preSlowSeat: FullscreenSeat;
}

function initialState(): MachineState {
  return {
    phase: 'boot',
    seat: 'splash', // the boot splash owns the first paint
    routeTransition: false,
    routeProgress: null,
    serverSlow: false,
    skipRequested: false,
    pendingSheet: false,
    preSlowSeat: null,
  };
}

let state: MachineState = initialState();

const listeners = new Set<(snapshot: LoaderSnapshot) => void>();

/* ── Reduced motion (re-read every time — no cached MQL) ───────────── */

/** Live prefers-reduced-motion (SSR / hardened engines → false). */
export function reducedMotion(): boolean {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/* ── Snapshot ──────────────────────────────────────────────────────── */

let snapshot: LoaderSnapshot = buildSnapshot();

function buildSnapshot(): LoaderSnapshot {
  return Object.freeze({
    phase: state.phase,
    fullscreen: state.seat,
    routeTransition: state.routeTransition,
    routeProgress: state.routeProgress,
    serverSlow: state.serverSlow,
    skipRequested: state.skipRequested,
    reducedMotion: reducedMotion(),
  });
}

function emit(): void {
  snapshot = buildSnapshot();
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      /* a broken listener must never break the machine or its peers */
    }
  });
}

/** Stable snapshot reference between changes (useSyncExternalStore). */
export function getSnapshot(): LoaderSnapshot {
  return snapshot;
}

/** Subscribe to snapshot changes → unsubscribe. */
export function subscribe(listener: (snapshot: LoaderSnapshot) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The invariant, as a number: 0 or 1 — NEVER 2. */
export function activeFullscreenCount(): 0 | 1 {
  return state.seat === null ? 0 : 1;
}

/* ── Phase events ──────────────────────────────────────────────────── */

/** boot → hydrating. Refused (false) once ready — no demotion. */
export function markHydrating(): boolean {
  if (state.phase === 'ready') return false;
  if (state.phase === 'hydrating') return true; // idempotent
  state.phase = 'hydrating';
  emit();
  return true;
}

/** boot|hydrating → ready. The splash keeps the seat until its own
 *  exit completes (splashExited()); a queued sheet request grants then. */
export function markReady(): boolean {
  if (state.phase === 'ready') return true; // idempotent
  state.phase = 'ready';
  emit();
  return true;
}

/* ── Route-transition side state (the 2 px strip — never fullscreen) ── */

/** Opens a route transition; returns its idempotent done-callback. */
export function requestRouteTransition(): () => void {
  state.routeTransition = true;
  state.routeProgress = null; // indeterminate start
  emit();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    endRouteTransition();
  };
}

/** Closes the route transition (the strip unmounts). */
export function endRouteTransition(): void {
  if (!state.routeTransition && state.routeProgress === null) return;
  state.routeTransition = false;
  state.routeProgress = null;
  emit();
}

/** Determinate strip progress (0..1, clamped) — ignored while no
 *  transition is open; null stays the indeterminate mode. */
export function reportRouteProgress(progress: number): void {
  if (!state.routeTransition) return;
  const next = Math.min(1, Math.max(0, progress));
  if (state.routeProgress === next) return;
  state.routeProgress = next;
  emit();
}

/* ── Slow-server side state (cold start — preempts the seat) ───────── */

/** True = show the cold-start card (takes the seat, remembering what
 *  it preempted). False = resolve and restore — except a splash
 *  restored after ready is voided (the boot splash never re-mounts). */
export function setServerSlow(slow: boolean): void {
  if (state.serverSlow === slow) return;
  state.serverSlow = slow;
  if (slow) {
    state.preSlowSeat = state.seat;
    state.seat = 'slow-server';
    state.skipRequested = false; // a stale gesture must not outlive its layer
  } else {
    const restore = state.preSlowSeat;
    state.preSlowSeat = null;
    state.seat = restore === 'splash' && state.phase === 'ready' ? null : restore;
    // a sheet request queued during the cold start grants if the seat freed
    if (state.seat === null && state.pendingSheet) {
      state.pendingSheet = false;
      state.seat = 'sheet-loader';
    }
  }
  emit();
}

/* ── Seat events (the ONE full-screen layer) ───────────────────────── */

/** The landing intro asks for the seat. true = granted now; false =
 *  queued (it renders only when the snapshot reports its grant — the
 *  foreman wiring treats `fullscreen === 'sheet-loader'` as its gate). */
export function activateSheetLoader(): boolean {
  if (state.seat === null) {
    state.seat = 'sheet-loader';
    emit();
    return true;
  }
  if (!state.pendingSheet) {
    state.pendingSheet = true;
    emit();
  }
  return false;
}

/** The intro finished (its own exit included) — frees the seat and
 *  promotes a queued request. No-op when the intro does not hold it. */
export function releaseSheetLoader(): void {
  state.skipRequested = false;
  if (state.seat !== 'sheet-loader') return;
  if (state.pendingSheet) {
    state.pendingSheet = false; // the seat passes to the queued request
  } else {
    state.seat = null;
  }
  emit();
}

/** The boot splash finished its ≤250 ms exit — frees the seat (and
 *  promotes a queued sheet request). No-op when splash does not hold it. */
export function splashExited(): void {
  if (state.seat !== 'splash') return;
  state.skipRequested = false;
  if (state.pendingSheet) {
    state.pendingSheet = false;
    state.seat = 'sheet-loader';
  } else {
    state.seat = null;
  }
  emit();
}

/** The skip gesture (click / Escape / Enter / Space on the sheet
 *  loader — or a fast-exit wish on the splash). The ACTIVE layer's
 *  component consumes `skipRequested` and runs its own exit, then
 *  calls releaseSheetLoader()/splashExited(). The slow-server card is
 *  informational and NOT dismissible → false. No active layer → false. */
export function skip(): boolean {
  if (state.seat === null || state.seat === 'slow-server') return false;
  if (state.skipRequested) return true; // already pending consumption
  state.skipRequested = true;
  emit();
  return true;
}

/* ── First-visit contract ──────────────────────────────────────────── */

function liveLocal(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    const store = window.localStorage;
    store.getItem('__mdk_probe__'); // hardened engines throw on access
    return store;
  } catch {
    return null;
  }
}

function liveSession(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    const store = window.sessionStorage;
    store.getItem('__mdk_probe__');
    return store;
  } catch {
    return null;
  }
}

function flagIsSet(store: StorageLike | null, key: string): boolean {
  if (!store) return false;
  try {
    return store.getItem(key) === '1';
  } catch {
    return false;
  }
}

/** Authentication as persisted by the zustand session store
 *  (stores/auth.store.ts — key `mdrk-auth`, shape
 *  `{ state: { user, accessToken, … }, version }`; v0 payloads carried
 *  the pair at the top level). Read-only; that file is NOT imported
 *  (the orchestrator stays framework-free and cycle-free). */
export function isPersistedAuthenticated(): boolean {
  const store = liveLocal();
  if (!store) return false;
  try {
    const raw = store.getItem(AUTH_PERSISTENCE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as {
      state?: { user?: unknown; accessToken?: unknown };
      user?: unknown;
      accessToken?: unknown;
    } | null;
    const inner = parsed?.state;
    return Boolean(
      inner?.accessToken || inner?.user || parsed?.accessToken || parsed?.user,
    );
  } catch {
    return false;
  }
}

export interface IntroDecisionContext {
  /** Defaults to the live localStorage. */
  storage?: StorageLike | null;
  /** Defaults to the live sessionStorage (legacy suppressors). */
  session?: StorageLike | null;
  /** Defaults to the persisted `mdrk-auth` session read. */
  authenticated?: boolean;
  /** Defaults to the live matchMedia. */
  reducedMotion?: boolean;
}

/** Should the R323 intro play for this visitor?
 *
 *  true ONLY when: no `madarek.intro.v1` localStorage flag AND not
 *  authenticated AND motion is allowed. The legacy introGate keys
 *  (`madarek-intro-skip` — the hermetic e2e opt-out — and
 *  `madarek-intro-seen`) are read as SUPPRESSORS so the orchestrator
 *  can never double-play behind the existing gate. Returning visits
 *  and authenticated routes never play. */
export function shouldPlayIntro(ctx: IntroDecisionContext = {}): boolean {
  if (ctx.reducedMotion ?? reducedMotion()) return false;
  if (ctx.authenticated ?? isPersistedAuthenticated()) return false;
  const local = ctx.storage === undefined ? liveLocal() : ctx.storage;
  if (flagIsSet(local, INTRO_FLAG_KEY)) return false;
  const session = ctx.session === undefined ? liveSession() : ctx.session;
  if (flagIsSet(session, INTRO_SKIP_KEY)) return false; // hermetic e2e opt-out
  if (flagIsSet(session, INTRO_SEEN_KEY)) return false; // R313 same-session truth
  return true;
}

/** Record that the intro played — writes localStorage['madarek.intro.v1'].
 *  Storage failures are soft (privacy modes): the in-memory session
 *  still behaves, nothing throws. */
export function markIntroPlayed(): void {
  const store = liveLocal();
  if (!store) return;
  try {
    store.setItem(INTRO_FLAG_KEY, '1');
  } catch {
    /* best effort only */
  }
}

/* ── The facade + the tiny hook ────────────────────────────────────── */

/** Namespaced facade for component call sites (same functions as the
 *  named exports — one object so wiring reads like a state machine). */
export const loaderOrchestrator = Object.freeze({
  markHydrating,
  markReady,
  requestRouteTransition,
  endRouteTransition,
  reportRouteProgress,
  setServerSlow,
  activateSheetLoader,
  releaseSheetLoader,
  splashExited,
  skip,
  getSnapshot,
  subscribe,
  activeFullscreenCount,
  reducedMotion,
  shouldPlayIntro,
  markIntroPlayed,
  isPersistedAuthenticated,
});

/** React binding — the only React import in this module. */
export function useLoaderState(): LoaderSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/* ── Test seam (mirrors introGate's reset*ForTests convention) ─────── */

/** Test-only: restore the pristine boot state between cases. */
export function resetLoaderOrchestratorForTests(): void {
  state = initialState();
  snapshot = buildSnapshot();
  emit();
}
