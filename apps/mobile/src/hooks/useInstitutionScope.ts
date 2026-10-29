import { useSession } from "@/auth/session";

/**
 * Institution scope — every institution-dependent query key ends with the
 * active institution id so switching membership re-keys the whole cache
 * (web parity: withInstitutionScope).
 */
export function useInstitutionScope(): string | null {
  const user = useSession((s) => s.user);
  return user?.currentInstitution?.id ?? null;
}

/** withScope(['me','dashboard'], inst) → ['me','dashboard','<instId>'] */
export function withScope<T extends unknown[]>(key: [...T], scope: string | null): [...T, string | null] {
  return [...key, scope];
}
