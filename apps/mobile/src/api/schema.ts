/**
 * R326 M0.4 — the OpenAPI-typed client surface (additive).
 *
 * schema.generated.ts is generated from docs/api/openapi.json — the
 * backend's REAL route table + zod DTOs, walked by
 * backend/scripts/generate-openapi.ts (`npm run api:openapi` at the
 * repo root). Regen the mobile half with `npm run api:types`; CI fails
 * on drift (mobile-gates regenerates and diffs).
 *
 * This module is TYPES ONLY (zero runtime cost). The transport stays
 * ./client — endpoints adopt the generated types incrementally:
 *
 *   import { ApiData } from "./schema";
 *   // the TYPE references the full registered path; the CALL stays
 *   // relative (client.ts prepends API_BASE):
 *   const me = await get<ApiData<"/api/v1/auth/me", "get">>("/auth/me");
 *
 * The `contract-check` gate (consumed paths vs registered routes) is
 * unaffected — it reads call sites, not types.
 */
import type { components, paths } from "./schema.generated";

export type { components, paths } from "./schema.generated";

/** Every registered endpoint path (full form: "/api/v1/…"). */
export type ApiPath = keyof paths & string;

type Methods = "get" | "post" | "patch" | "put" | "delete";

/** The methods a given path registers. */
export type ApiMethod<P extends ApiPath> = Extract<keyof paths[P], Methods>;

/** The declared 2xx JSON response body for a path+method. */
export type ApiOk<P extends ApiPath, M extends ApiMethod<P>> =
  paths[P][M] extends {
    responses: { 200: { content: { "application/json": infer R } } };
  }
    ? R
    : unknown;

/**
 * The response UNWRAPPED one envelope step when the handler declares
 * `{ data: T }` (the backend's dominant success envelope). Falls back
 * to the raw response type for the endpoints that return bare shapes.
 */
export type ApiData<P extends ApiPath, M extends ApiMethod<P>> =
  ApiOk<P, M> extends { data?: infer D } ? D : ApiOk<P, M>;

/** A named DTO from the spec (request/response zod schemas). */
export type ApiSchema<K extends keyof components["schemas"]> = components["schemas"][K];
