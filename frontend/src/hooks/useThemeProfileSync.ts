/**
 * useThemeProfileSync — reconcile the local theme store with the
 * authenticated user's `themePreference` (R-002 of
 * specs/012-design-graphics-uplift/research.md).
 *
 * Wave 23-a (A5 P2-5) rewrote the push/pull contract:
 *
 *   PUSH (local → server) happens ONLY for an explicit user choice
 *   made in THIS session (setMode/cycle — the sidebar/topbar toggle).
 *   A value that arrived from localStorage (persist rehydration, a
 *   restored backup, clock skew, an injected probe) is NEVER pushed:
 *   the old last-write-wins write-through silently flipped the
 *   account preference whenever a fresh `modeUpdatedAt` landed in
 *   storage — exactly the incident the audit triggered with a
 *   dark-mode probe script.
 *
 *   PULL (server → local) still adopts the profile when the local
 *   side is defaulting (`system` with no in-session choice) or when
 *   the profile is strictly newer. The pulled tuple is remembered so
 *   the hook can tell its own hydrate apart from a user toggle.
 *
 *   PRE-PAINT: every observed profile is cached in localStorage
 *   (`mdrk-theme-profile`) for the index.html bootstrap, which
 *   applies the same rules before the first paint — the theme no
 *   longer resolves light and flip to dark a second or two after
 *   load once `me` arrives.
 *
 * The hook tolerates unauthenticated contexts (no `me` yet) — it
 * simply waits for the next render.
 */
import { useEffect, useRef } from 'react';
import { useMe } from './useAuth';
import { useThemeStore, type ThemeMode } from '../stores/theme.store';
import { api } from '../lib/api';

type ServerPreference = 'LIGHT' | 'DARK' | 'SYSTEM';

const toServer = (m: ThemeMode): ServerPreference => m.toUpperCase() as ServerPreference;
const toLocal  = (s: ServerPreference): ThemeMode  => s.toLowerCase() as ThemeMode;

/** localStorage mirror of the last observed profile preference — the
 *  key the index.html bootstrap reads to resolve the theme BEFORE the
 *  first paint. Storage failures (Safari private mode, embedded
 *  browsers) are non-fatal: the bootstrap falls back to the local
 *  store's mode. */
const PROFILE_CACHE_KEY = 'mdrk-theme-profile';

function cacheProfilePref(pref: ServerPreference, tsMs: number): void {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ pref, ts: tsMs }));
  } catch {
    // storage unavailable — pre-paint falls back to the local mode
  }
}

/** A theme choice's identity: value + the timestamp that produced it. */
interface Choice {
  mode: ThemeMode;
  ts: number;
}

const sameChoice = (a: Choice | null, b: Choice | null): boolean =>
  a !== null && b !== null && a.mode === b.mode && a.ts === b.ts;

export function useThemeProfileSync(): void {
  const { data: me } = useMe();
  const localMode = useThemeStore((s) => s.mode);
  const localTs   = useThemeStore((s) => s.modeUpdatedAt);
  const hydrate   = useThemeStore((s) => s._hydrateFromProfile);

  // The choice present at FIRST render is whatever persist rehydrated
  // from localStorage — a user cannot toggle before the first render.
  // Any later change is either an in-session user action
  // (setMode/cycle stamp Date.now()) or one of our own pulls (tracked
  // in pulledChoice). That distinction is the entire write-through
  // guard: storage-sourced values sync DOWNWARD only.
  const initialChoice = useRef<Choice | null>(null);
  if (initialChoice.current === null) {
    initialChoice.current = { mode: localMode, ts: localTs };
  }
  const pulledChoice = useRef<Choice | null>(null);
  const lastSyncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!me?.id || !me.themePreference) return;

    const profileMode = toLocal(me.themePreference);
    const profileTsMs = me.themePreferenceUpdatedAt
      ? new Date(me.themePreferenceUpdatedAt).getTime()
      : 0;

    // Pre-paint cache for the bootstrap (idempotent, cheap).
    cacheProfilePref(me.themePreference, profileTsMs);

    // Re-run sync once per (user, profile-update, local-choice) tuple,
    // not on every render. The local side MUST stay part of the
    // fingerprint (audit P1-3): an in-session theme toggle re-runs
    // this effect and must reach the push path without waiting for
    // the next sign-in. No put-loop results: after a successful push
    // the next `me` observation agrees (Case 1 no-op).
    const fingerprint = `${me.id}:${me.themePreferenceUpdatedAt ?? ''}:${localMode}:${localTs}`;
    if (lastSyncedFor.current === fingerprint) return;
    lastSyncedFor.current = fingerprint;

    const current: Choice = { mode: localMode, ts: localTs };
    const isUserChoice =
      !sameChoice(current, initialChoice.current) && !sameChoice(current, pulledChoice.current);

    // Case 1 — same value already: nothing to reconcile.
    if (localMode === profileMode) return;

    // Case 2 — an explicit in-session choice: the user just spoke, so
    // it is authoritative and is adopted into the profile. This is
    // the ONLY push path (A5 P2-5: explicit action, not any storage
    // write).
    if (isUserChoice) {
      void api.put('/me/theme', { themePreference: toServer(localMode) }).catch(() => {});
      return;
    }

    // The local choice came from storage (or our own earlier pull):
    // never push. Reconcile downward only.

    // Case 3 — the profile has no explicit choice (SYSTEM): keep the
    // stored local choice; the bootstrap already paints it pre-paint.
    if (me.themePreference === 'SYSTEM') return;

    // Case 4 — local is the default: adopt the explicit profile.
    if (localMode === 'system') {
      hydrate(profileMode, profileTsMs);
      pulledChoice.current = { mode: profileMode, ts: profileTsMs };
      return;
    }

    // Case 5 — both explicit, local storage-sourced: strictly newer
    // wins, display-only. A newer LOCAL value is kept locally and the
    // server keeps its own until the user toggles again — no
    // write-through.
    if (profileTsMs > localTs) {
      hydrate(profileMode, profileTsMs);
      pulledChoice.current = { mode: profileMode, ts: profileTsMs };
    }
  }, [
    me?.id,
    me?.themePreference,
    me?.themePreferenceUpdatedAt,
    localMode,
    localTs,
    hydrate,
  ]);
}
