/**
 * R327 A4 — the poisoned-API controls.
 *
 * setup.ts consults POISON.kind on every mocked fetch. Test suites flip it
 * per-case; the baseline render net leaves it at "ok".
 *
 * The kinds (each maps to a real failure the production API can produce):
 *   ok             — the honest empty envelope ({ data: null } / empty pages)
 *   null-data      — { data: null } even for lists
 *   missing-fields — { data: {} } — objects with NONE of the expected fields
 *   empty-list     — honest empty pages for everything (list endpoints and
 *                    detail endpoints alike)
 *   401            — expired session on EVERY call (including /auth/refresh)
 *   500            — server error on every call
 *   garbage        — HTTP 200 whose body is not JSON at all
 */
export type PoisonKind =
  | "ok"
  | "null-data"
  | "missing-fields"
  | "empty-list"
  | "401"
  | "500"
  | "garbage";

export const POISON: { kind: PoisonKind } = { kind: "ok" };

/** Reset between tests — suites call this in beforeEach. */
export function poison(kind: PoisonKind): void {
  POISON.kind = kind;
}
