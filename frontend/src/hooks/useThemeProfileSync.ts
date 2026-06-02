/**
 * useThemeProfileSync — reconcile the local theme store with the
 * authenticated user's `themePreference` (R-002 of
 * specs/012-design-graphics-uplift/research.md).
 *
 * Sync algorithm — runs every time `me` resolves (sign-in, refetch):
 *
 *   - profile === SYSTEM AND local !== 'system'
 *     → push local to profile (server adopts our explicit choice).
 *   - local === 'system' AND profile !== SYSTEM
 *     → pull profile to local (we adopt the server's explicit choice).
 *   - local lowercase === profile lowercase
 *     → no-op (already in sync).
 *   - both explicit and they differ
 *     → last-write-wins: compare local `modeUpdatedAt` (Unix ms) vs
 *       the server `themePreferenceUpdatedAt` ISO timestamp.
 *
 * The hook tolerates being called in unauthenticated contexts (no
 * `me` yet) — it simply waits for the next render.
 */
import { useEffect, useRef } from 'react';
import { useMe } from './useAuth';
import { useThemeStore, type ThemeMode } from '../stores/theme.store';
import { api } from '../lib/api';

type ServerPreference = 'LIGHT' | 'DARK' | 'SYSTEM';

const toServer = (m: ThemeMode): ServerPreference => m.toUpperCase() as ServerPreference;
const toLocal  = (s: ServerPreference): ThemeMode  => s.toLowerCase() as ThemeMode;

export function useThemeProfileSync(): void {
  const { data: me } = useMe();
  const localMode      = useThemeStore((s) => s.mode);
  const localTs        = useThemeStore((s) => s.modeUpdatedAt);
  const hydrate        = useThemeStore((s) => s._hydrateFromProfile);
  const lastSyncedFor  = useRef<string | null>(null);

  useEffect(() => {
    if (!me?.id || !me.themePreference) return;
    // Re-run sync once per (user, profile-update) pair, not on every
    // render. This avoids a put-loop when the server echoes our value
    // back through useMe's refetch.
    const fingerprint = `${me.id}:${me.themePreferenceUpdatedAt ?? ''}`;
    if (lastSyncedFor.current === fingerprint) return;
    lastSyncedFor.current = fingerprint;

    const profileMode  = toLocal(me.themePreference);
    const profileTsMs  = me.themePreferenceUpdatedAt
      ? new Date(me.themePreferenceUpdatedAt).getTime()
      : 0;

    // Case 1 — profile is the default and local is explicit: push.
    if (me.themePreference === 'SYSTEM' && localMode !== 'system') {
      void api.put('/me/theme', { themePreference: toServer(localMode) }).catch(() => {});
      return;
    }

    // Case 2 — local is the default and profile is explicit: pull.
    if (localMode === 'system' && me.themePreference !== 'SYSTEM') {
      hydrate(profileMode, profileTsMs);
      return;
    }

    // Case 3 — same value already.
    if (localMode === profileMode) return;

    // Case 4 — conflict: last-write-wins by timestamp.
    if (localTs > profileTsMs) {
      void api.put('/me/theme', { themePreference: toServer(localMode) }).catch(() => {});
    } else {
      hydrate(profileMode, profileTsMs);
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
