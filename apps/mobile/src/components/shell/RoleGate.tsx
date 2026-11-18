import { useEffect, type ReactNode } from "react";
import { router, usePathname } from "expo-router";
import { useSession, ROLE_HOME } from "@/auth/session";
import { toast } from "@/components/ui/toast";
import { LoadingScreen } from "@/components/ui/states";
import { LaunchSheet } from "@/components/ui/brand";
import type { AppRole } from "@/api/types";

/**
 * RoleGate — ProtectedRoute parity (AppShell.tsx):
 *  - unauthenticated → /auth (preserving intent via ?continue=)
 *  - authenticated without institution context (multi-membership) → picker
 *  - wrong role → toast «هذه الصفحة غير متاحة لدور حسابك» + role-home bounce.
 */
export function RoleGate({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const user = useSession((s) => s.user);
  const isHydrated = useSession((s) => s.isHydrated);
  const sessionEpoch = useSession((s) => s.sessionEpoch);
  /* R362 — the docblock always CLAIMED intent preservation but the bare
     replace dropped it: a guest tapping a madarek:// deep link was dumped
     on the welcome screen and the target was lost after login. The login
     flow already consumes `?continue=` (resolveEntryDestination), so the
     gate now hands it the requested path. Excluded: /auth itself and the
     root / (the boot screen owns that handoff). */
  const pathname = usePathname();

  useEffect(() => {
    if (!isHydrated || !user) return;
    if (!allow.includes(user.role)) {
      toast.error("غير متاحة لدورك — أُعيدك للوحتك.");
      router.replace((ROLE_HOME[user.role] ?? "/student/dashboard") as never);
      return;
    }
    if (!user.currentInstitution && user.role !== "OWNER") {
      const active = (user.memberships ?? []).filter((m) => m.isActive);
      if (active.length > 0) {
        router.replace("/select-institution");
      }
    }
  }, [isHydrated, user, allow, sessionEpoch]);

  if (!isHydrated) {
    return <LoadingScreen label="جارٍ تهيئة الجلسة…" />;
  }
  if (!user) {
    if (pathname && pathname !== "/" && !pathname.startsWith("/auth")) {
      router.replace({ pathname: "/auth", params: { continue: pathname } } as never);
    } else {
      router.replace("/auth" as never);
    }
    return <LaunchSheet label="مدارك" />;
  }
  if (!allow.includes(user.role)) {
    return <LaunchSheet label="مدارك" />;
  }
  return <>{children}</>;
}
