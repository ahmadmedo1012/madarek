import { useEffect, useRef } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSession, ROLE_HOME } from "@/auth/session";
import { get } from "@/api/client";
import type { AuthUser } from "@/api/types";
import { AppStatusBar } from "@/design/statusbar";
import { Boot, resolveEntryDestination } from "@/components/ui/boot";
import { takePendingDeepLink } from "@/lib/push";

/**
 * / — the Boot screen. The native splash (icon 120 · centred · paper
 * ground) cross-fades into this screen at the SAME geometry: the brand
 * mark IS the loader (converging squares), ONE logo and at most ONE
 * loader at a time — no second mark, no generic spinner.
 *
 * The handoff is deterministic (resolveEntryDestination — pinned by
 * boot.test.ts):
 *   · session still hydrating → honest cold-wait copy «نستعد لتحميل
 *     مدارك…» (the 6s slow label «الخادم يستيقظ…» + retry lives in Boot);
 *   · a cached session → its role home (the /auth/me refresh rides the
 *     background — the cached user routes immediately, no dead wait on a
 *     cold Render);
 *   · a guest → /auth (the Welcome — the signature moment).
 *
 * Update/min-version states are owned by the root layout: below the
 * server floor `BlockingUpdateGate` replaces the navigator entirely, so
 * this screen never renders there (renders its states correctly by
 * construction).
 */
export default function BootScreen() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const isHydrated = useSession((s) => s.isHydrated);
  const params = useLocalSearchParams<{ continue?: string }>();
  // R353 — the push deep link that launched the app (if any) is consumed
  // ONCE and STICKS for this screen's lifetime: the /auth/me refresh
  // re-runs the effect below and must keep landing on the same link,
  // not replace it away with the role home.
  const deepLinkRef = useRef<string | null>(null);

  // Background refresh of /auth/me (60s stale window). The cached user
  // routes the handoff immediately; when me resolves fresher the effect
  // re-runs and lands the same/updated destination — belt and braces.
  const meQuery = useQuery({
    queryKey: ["session", "me"],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: () => get<AuthUser>("/auth/me"),
  });

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      // Guest → the Welcome. ?continue= rides along for post-auth return;
      // a parked push deep link stays parked for the login success path.
      router.replace(
        params.continue
          ? ({ pathname: "/auth", params: { continue: params.continue } } as never)
          : "/auth",
      );
      return;
    }
    let cancelled = false;
    void (async () => {
      // The cached-session cold start: the launch notification's link
      // rides the SAME guard rule as ?continue= (institution-gated) —
      // takePendingDeepLink awaits the launch read, so this decision is
      // never raced by a late cold-start response.
      deepLinkRef.current ??= await takePendingDeepLink();
      if (cancelled) return;
      const fresh = meQuery.data ? (meQuery.data as AuthUser) : user;
      router.replace(
        resolveEntryDestination(fresh, deepLinkRef.current ?? params.continue, ROLE_HOME) as never,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [isHydrated, user, meQuery.data, params.continue, router]);

  return (
    <>
      <AppStatusBar />
      {user ? (
        <Boot label="جارٍ الدخول…" />
      ) : (
        <Boot label="نستعد لتحميل مدارك…" />
      )}
    </>
  );
}
