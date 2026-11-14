/**
 * R351 X3 — the remote app config: the apps never need a rebuild for a
 * hosting move again.
 *
 * A tiny JSON document (`/config/app.json`) is served statically by TWO
 * always-up origins — the Vercel deployment (frontend/public/config →
 * dist/config, CDN-served) and a GitHub Pages mirror (the
 * config-pages.yml workflow force-pushes it to the gh-pages branch) —
 * and carries one field the native client cares about today:
 *
 *   { "apiOrigins": ["https://…", "https://…"] }   // ordered failover
 *
 * Boot sequence (app/_layout.tsx): loadRemoteConfig() races nothing —
 * it tries each source in order (4 s timeout each), validates the
 * shape, and hands the origins to the API client (which keeps its
 * build-time default until then). The result is cached in
 * AsyncStorage so the NEXT boot starts with the last good list while
 * the refresh runs; a failed fetch is never fatal — the bundled
 * default (Render today, the cutover's Vercel origin after X4) plus
 * the failover in api/client.ts keep every installed build working.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface RemoteAppConfig {
  /** Ordered API origins (scheme + host). The client appends /api/v1. */
  apiOrigins: string[];
}

/** Where the config itself lives — static hosts, never the API. */
export const CONFIG_SOURCES = [
  "https://madarek-nine.vercel.app/config/app.json",
  "https://ahmadmedo1012.github.io/madarek/config/app.json",
] as const;

/**
 * The bundled fallback: both origins, Render first (the production API
 * until the R351 X4 cutover flips the order — the flip is exactly ONE
 * commit to this list + the config asset).
 */
export const FALLBACK_ORIGINS = [
  "https://madarek.onrender.com",
  "https://madarek-nine.vercel.app",
] as const;

const CACHE_KEY = "madarek.remote-config.v1";
const FETCH_TIMEOUT_MS = 4_000;

/** Parse + validate: only https origins, deduped, capped. */
export function parseRemoteConfig(value: unknown): RemoteAppConfig | null {
  if (value === null || typeof value !== "object") return null;
  const raw = (value as { apiOrigins?: unknown }).apiOrigins;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 5) return null;
  const seen = new Set<string>();
  const origins: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") return null;
    let url: URL;
    try {
      url = new URL(entry);
    } catch {
      return null;
    }
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) return null;
    const origin = url.origin;
    if (!seen.has(origin)) {
      seen.add(origin);
      origins.push(origin);
    }
  }
  if (origins.length === 0) return null;
  return { apiOrigins: origins };
}

/** The live origin list (starts bundled, updated by load/cached). */
let activeOrigins: string[] = [...FALLBACK_ORIGINS];
/** Origins that answered with a hard failure this session (failover marks). */
const failedOrigins = new Set<string>();

export function getApiOrigins(): string[] {
  return [...activeOrigins];
}

/** The first origin not marked failed — the client's active base. */
export function getActiveOrigin(): string {
  const next = activeOrigins.find((o) => !failedOrigins.has(o));
  return next ?? activeOrigins[0]!;
}

/**
 * Mark an origin failed (the client's failover path); returns the next
 * healthy origin, or null when everything is marked (the caller keeps
 * the last base and lets its own retry/wake logic own the rest).
 */
export function markOriginFailed(origin: string): string | null {
  failedOrigins.add(origin);
  const next = activeOrigins.find((o) => !failedOrigins.has(o));
  return next ?? null;
}

/** Test seam: reset the module state. */
export function __resetForTests(origins: string[] = [...FALLBACK_ORIGINS]): void {
  activeOrigins = [...origins];
  failedOrigins.clear();
}

async function fetchConfigFrom(source: string): Promise<RemoteAppConfig | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(source, { signal: controller.signal });
    if (!res.ok) return null;
    return parseRemoteConfig(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Boot-time load: cached list applies immediately (instant failover
 * state from the last session), then the freshest source wins, then
 * the cache is refreshed. Never throws — a fully-offline boot keeps
 * the bundled defaults.
 */
export async function loadRemoteConfig(): Promise<RemoteAppConfig> {
  // 1. Cached list first (last session's truth) — no await on the wire.
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = parseRemoteConfig(JSON.parse(cached));
      if (parsed) activeOrigins = parsed.apiOrigins;
    }
  } catch {
    /* cache is best-effort */
  }
  // 2. Freshest source wins.
  for (const source of CONFIG_SOURCES) {
    const parsed = await fetchConfigFrom(source);
    if (parsed) {
      activeOrigins = parsed.apiOrigins;
      failedOrigins.clear();
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
      } catch {
        /* best-effort */
      }
      return parsed;
    }
  }
  return { apiOrigins: [...activeOrigins] };
}
