/**
 * OpenAPI 3.1 generator — `npm run api:openapi` (repo root).
 *
 * Emits docs/api/openapi.json from the REAL route table + the REAL zod
 * DTOs. Runs fully OFFLINE: the Express app is built in-process
 * (createApp() performs no DB I/O — the prisma connect lives in
 * index.ts main()), and every external dependency is read from the
 * repo itself. No DB, no network.
 *
 * Why hand-rolled (no @fastify/swagger / zod-to-json-schema in the
 * tree, and adding dependencies is out of scope for this worktree):
 *   1. ROUTES — walked from the live Express router stack (app._router),
 *      so the doc can never drift from the registered table: every
 *      mount prefix is recovered from the layer regexp, exactly what
 *      the request dispatch itself matches against.
 *   2. REQUEST BODIES / QUERY — each route's `validate(<schema>)`
 *      middleware is located in its route-file source (bracket-matched
 *      call span), the identifier is resolved through the file's
 *      import table to the actual zod schema object (imported here),
 *      and converted to JSON Schema by the small zod-v3 walker below.
 *      Routes whose schema cannot be resolved (inline `z.object` at
 *      the call site, dynamic paths) are still emitted, with the
 *      unresolved bit reported in `x-generator.warnings` — honest
 *      gaps, never silent ones.
 *   3. RESPONSE SHAPES — handlers build `{ data: … }` inline (no zod),
 *      so static derivation is impossible; instead the generator
 *      merges the OBSERVED top-level shapes recorded by the contract
 *      suite (backend/tests/contract/snapshot.json, additive-only)
 *      into each covered operation's 2xx schema
 *      (additionalProperties: true everywhere — additions allowed).
 *
 * Success statuses are read from the handler source (res.status(201)),
 * defaulting to 200. Security is a documented heuristic: routes in
 * files with a router-level `authMiddleware` gate (or an explicit
 * authMiddleware argument) carry bearerAuth; optionalAuthMiddleware
 * and ungated routes are marked public (`security: []`).
 *
 * Usage (from repo root):  npm run api:openapi
 * Output:                  docs/api/openapi.json (committed)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ── Offline seatbelt ─────────────────────────────────────────────
// env.ts exits the process when DATABASE_URL / JWT secrets are absent
// (outside NODE_ENV=test). The generator performs zero DB work, so
// deterministic placeholders keep the run hermetic. Set BEFORE any
// backend import (env.ts is import-time).
process.env.DATABASE_URL ||= 'postgresql://openapi:openapi@localhost:5432/openapi';
process.env.JWT_ACCESS_SECRET ||= 'openapi-generator-offline-placeholder-secret-32';
process.env.JWT_REFRESH_SECRET ||= 'openapi-generator-offline-placeholder-secret-32';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BACKEND_ROOT, '..');
const APP_TS = path.join(BACKEND_ROOT, 'src', 'app.ts');
const ERRORS_TS = path.join(BACKEND_ROOT, 'src', 'lib', 'errors.ts');
const SNAPSHOT_JSON = path.join(BACKEND_ROOT, 'tests', 'contract', 'snapshot.json');
const OUT_JSON = path.join(REPO_ROOT, 'docs', 'api', 'openapi.json');

// ── Types ────────────────────────────────────────────────────────
type JsonSchema = Record<string, unknown>;
interface RouteInfo {
  method: string; // lower-case express verb
  path: string; // express path ('/:id/read')
  fullPath: string; // '/api/v1/…'
  mountPrefix: string;
  sourceFile: string; // absolute path of the declaring module
  successStatus: number;
  bodySchema: unknown | undefined; // zod schema object
  bodySchemaIdent: string | undefined;
  querySchema: unknown | undefined;
  querySchemaIdent: string | undefined;
  auth: 'required' | 'optional' | 'public';
  warnings: string[];
}

// ── Express router-stack walking ─────────────────────────────────

/**
 * Recover the mount prefix of a router layer from its regexp.
 * Express 4 compiles `app.use('/api/v1/auth', router)` into
 * /^\/api\/v1\/auth\/?(?=\/|$)/i — the static prefix is recoverable
 * byte-exactly. Anything that is NOT a static string prefix (param
 * mounts, regex mounts) throws: this app registers none, and a silent
 * wrong path in the contract doc is worse than a loud failure.
 */
function prefixFromLayer(layer: { regexp: RegExp }): string {
  const src = layer.regexp.source;
  if (!src.startsWith('^')) throw new Error(`Unexpected router regexp (no ^): ${src}`);
  let s = src.slice(1);
  // The `use`-mount suffix express always appends (strict:false, end:false):
  s = s.replace(/\\\/\?\(\?=\\\/\|\$\)$/, '');
  // Unescape the path-to-regexp escapes (`\/` → `/`, `\.` → `.` …) BEFORE
  // the static-shape check — the escapes themselves are not metacharacters.
  s = s.replace(/\\(.)/g, '$1');
  if (/[()[\]{}?*+|.^$\\]/.test(s)) {
    throw new Error(`Non-static mount regexp is not supported by the generator: /${s}/`);
  }
  return s;
}

function walkRoutes(
  stack: any[],
  base: string,
  routerFiles: Map<unknown, string>,
  out: RouteInfo[],
  sourceFile = '',
): void {
  for (const layer of stack) {
    if (layer.name === 'router' && layer.handle?.stack) {
      const prefix = base + prefixFromLayer(layer);
      const file = routerFiles.get(layer.handle) ?? routerFiles.get(layer.handle.router);
      walkRoutes(layer.handle.stack, prefix, routerFiles, out, file ?? `(unmatched router @ ${prefix})`);
      continue;
    }
    if (!layer.route) continue; // middleware layers (helmet, limiters, 404 …)
    const route = layer.route;
    const methods = Object.keys(route.methods ?? {}).filter((m) => m !== '_method');
    const p = typeof route.path === 'string' ? route.path : String(route.path);
    for (const method of methods) {
      out.push({
        method,
        path: p,
        fullPath: normalizeJoin(base, p),
        mountPrefix: base,
        sourceFile,
        successStatus: 200,
        bodySchema: undefined,
        bodySchemaIdent: undefined,
        querySchema: undefined,
        querySchemaIdent: undefined,
        auth: 'public',
        warnings: [],
      });
    }
  }
}

function normalizeJoin(base: string, p: string): string {
  const joined = `${base}${p === '/' ? '' : p}`;
  // Express matches '/courses' and '/courses/' identically (strict routing
  // is off); keep ONE canonical form in the doc.
  return joined.length > 1 && joined.endsWith('/') ? joined.slice(0, -1) : joined;
}

// ── Route-file source parsing (validate() + success status + auth) ──

interface CallSpan {
  start: number;
  end: number; // index just past the closing paren
}

/**
 * Single-token skipper shared by every source scanner in this file.
 * Given src[i] === start of a string / template / comment / REGEX literal,
 * return the index just past it — or -1 when src[i] is none of those
 * (plain code, including a division `/`). Regex-vs-division uses the
 * standard heuristic: a `/` after a value char (`)]}` word/digit) is
 * division, otherwise it starts a regex literal.
 */
function skipToken(src: string, i: number): number {
  const c = src[i]!;
  const n = src[i + 1];
  if (c === '/' && n === '/') {
    i += 2;
    while (i < src.length && src[i] !== '\n') i++;
    return i;
  }
  if (c === '/' && n === '*') {
    const end = src.indexOf('*/', i + 2);
    return end === -1 ? src.length : end + 2;
  }
  if (c === "'" || c === '"') {
    i++;
    while (i < src.length && src[i] !== c) { if (src[i] === '\\') i++; i++; }
    return i + 1;
  }
  if (c === '`') {
    i++;
    let depth = 0; // ${ … } interpolations may nest strings/braces
    while (i < src.length) {
      if (src[i] === '\\') { i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') { depth++; i += 2; continue; }
      if (depth > 0 && src[i] === '}') { depth--; i++; continue; }
      if (depth === 0 && src[i] === '`') return i + 1;
      i++;
    }
    return i;
  }
  if (c === '/') {
    // Regex or division — decide from the previous significant char.
    let p = i - 1;
    while (p >= 0 && /\s/.test(src[p]!)) p--;
    const prev = p >= 0 ? src[p]! : '';
    const afterValue = /[\w$)\]}"]/.test(prev);
    if (!afterValue) {
      i++;
      let inClass = false;
      while (i < src.length) {
        const rc = src[i]!;
        if (rc === '\\') { i += 2; continue; }
        if (rc === '\n') return i; // malformed regex — bail, treat as division
        if (inClass) { if (rc === ']') inClass = false; }
        else if (rc === '[') inClass = true;
        else if (rc === '/') return i + 1;
        i++;
      }
    }
  }
  return -1;
}

function matchCallSpan(src: string, openParenIndex: number): CallSpan {
  let depth = 0;
  let i = openParenIndex;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return { start: openParenIndex, end: i + 1 };
    } else {
      const skipped = skipToken(src, i);
      if (skipped > 0) { i = skipped; continue; }
    }
    i++;
  }
  throw new Error(
    `Unbalanced parens while scanning route source (context: ${src.slice(openParenIndex, openParenIndex + 120).replace(/\s+/g, ' ')})`,
  );
}

/** Parse `import { a, b as c } from 'spec'` named-import tables. */
function importTable(src: string): Map<string, string> {
  const table = new Map<string, string>();
  const re = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const spec = m[2]!;
    for (const raw of m[1]!.split(',')) {
      const ident = raw.split(/\s+as\s+/).pop()!.trim();
      if (ident) table.set(ident, spec);
    }
  }
  return table;
}

interface DeclInfo {
  span: CallSpan;
  argsStart: number;
}

/** Locate `<name>router.<method>('<path>'` (any `xRouter`/`router`) or the
 * same on bare `app` in the file source. */
function findDecl(src: string, method: string, routePath: string): DeclInfo | undefined {
  const escaped = routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `\\b(?:[\\w$]*[Rr]outer|app)\\s*\\.\\s*${method}\\s*\\(\\s*['"\`]${escaped}['"\`]`,
  );
  const m = re.exec(src);
  if (!m) return undefined;
  const openParen = src.indexOf('(', m.index);
  return { span: matchCallSpan(src, openParen), argsStart: openParen + 1 };
}

/** Extract the FIRST argument expression of the route's `validate(...)` call
 * plus its source ('body' | 'query'). The argument is returned as raw source
 * text — it may be a bare identifier (`loginSchema`), a member call
 * (`paginationSchema.extend({ … })`), or any inline zod expression. */
function firstValidateArg(src: string, outerSpan: CallSpan): { exprText: string; source: 'body' | 'query' } | undefined {
  const region = src.slice(outerSpan.start, outerSpan.end);
  const vIdx = region.search(/\bvalidate\s*\(/);
  if (vIdx < 0) return undefined;
  const openParen = outerSpan.start + vIdx + region.slice(vIdx).indexOf('(');
  const vSpan = matchCallSpan(src, openParen);
  // First arg = everything up to the top-level comma (', query') or the close.
  let depth = 0;
  let i = openParen + 1;
  while (i < vSpan.end - 1) {
    const c = src[i]!;
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) break;
    i++;
  }
  const exprText = src.slice(openParen + 1, i).trim();
  const rest = src.slice(i, vSpan.end - 1);
  const source = /,\s*['"](body|query|params)['"]/.exec(rest)?.[1] as 'body' | 'query' | 'params' | undefined;
  if (!exprText) return undefined;
  return { exprText, source: source === 'params' ? 'body' : (source ?? 'body') };
}

function successStatusFrom(src: string, span: CallSpan): number {
  const region = src.slice(span.start, span.end);
  const statuses = [...region.matchAll(/res\s*\.\s*status\s*\(\s*(\d{3})\s*\)/g)].map((m) => Number(m[1]));
  const ok = statuses.filter((s) => s >= 200 && s < 300);
  return ok[0] ?? 200;
}

function authFrom(src: string, decl: DeclInfo, fileSrc: string): 'required' | 'optional' | 'public' {
  const region = src.slice(decl.span.start, decl.span.end);
  if (/optionalAuthMiddleware/.test(region)) return 'optional';
  if (/(?:^|[^\w])authMiddleware[^\w]/.test(region)) return 'required';
  // Router-level gate: `<x>router.use(authMiddleware)` anywhere in the file
  // (every route in that file sits behind it unless it opts out with
  // optionalAuthMiddleware — the pattern every route file uses).
  if (/[\w$]*[Rr]outer\s*\.\s*use\s*\(\s*authMiddleware\s*\)/.test(fileSrc)) return 'required';
  return 'public';
}

// ── zod v3 → JSON Schema (hand-rolled walker) ────────────────────

const jsonSchemaWarnings: string[] = [];

function zodToJsonSchema(schema: any, depth = 0): JsonSchema {
  if (!schema || typeof schema !== 'object' || !schema._def) {
    jsonSchemaWarnings.push(`zodToJsonSchema: not a zod schema (${String(schema)})`);
    return {};
  }
  if (depth > 24) return {}; // runaway recursion guard
  const def = schema._def;
  switch (def.typeName) {
    case 'ZodString': {
      const out: JsonSchema = { type: 'string' };
      for (const check of def.checks ?? []) {
        switch (check.kind) {
          case 'min': out.minLength = check.value; break;
          case 'max': out.maxLength = check.value; break;
          case 'email': out.format = 'email'; break;
          case 'url': out.format = 'uri'; break;
          case 'uuid': out.format = 'uuid'; break;
          case 'datetime': out.format = 'date-time'; break;
          case 'regex': out.pattern = check.regex.source; break;
          case 'trim': case 'toLowerCase': case 'toUpperCase': break;
          default: break; // cuid/cidr/… — shape stays 'string'
        }
      }
      return out;
    }
    case 'ZodNumber': {
      const isInt = (def.checks ?? []).some((c: any) => c.kind === 'int');
      const out: JsonSchema = { type: isInt ? 'integer' : 'number' };
      for (const check of def.checks ?? []) {
        if (check.kind === 'min' && !check.inclusive) out.exclusiveMinimum = check.value;
        else if (check.kind === 'min') out.minimum = check.value;
        else if (check.kind === 'max' && !check.inclusive) out.exclusiveMaximum = check.value;
        else if (check.kind === 'max') out.maximum = check.value;
        else if (check.kind === 'multipleOf') out.multipleOf = check.value;
      }
      return out;
    }
    case 'ZodBoolean': return { type: 'boolean' };
    case 'ZodDate': return { type: 'string', format: 'date-time' };
    case 'ZodBigInt': return { type: 'integer' };
    case 'ZodNull': return { type: 'null' };
    case 'ZodUnknown': case 'ZodAny': case 'ZodVoid': return {};
    case 'ZodEnum': return { type: 'string', enum: [...def.values] };
    case 'ZodNativeEnum': {
      const values = [...new Set(Object.values(def.values as Record<string, unknown>))].filter(
        (v) => typeof v === 'string' || typeof v === 'number',
      );
      return { enum: values, ...(values.every((v) => typeof v === 'string') ? { type: 'string' } : {}) };
    }
    case 'ZodLiteral': return { enum: [def.value], ...(typeof def.value === 'string' ? { type: 'string' } : {}) };
    case 'ZodArray': {
      const out: JsonSchema = { type: 'array', items: zodToJsonSchema(def.type, depth + 1) };
      if (def.minLength) out.minItems = def.minLength.value;
      if (def.maxLength) out.maxItems = def.maxLength.value;
      return out;
    }
    case 'ZodObject': {
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries<any>(shape)) {
        properties[key] = zodToJsonSchema(value, depth + 1);
        if (!value?.isOptional?.()) required.push(key);
      }
      const out: JsonSchema = { type: 'object', properties };
      if (required.length > 0) out.required = required.sort();
      // `.strict()` objects reject unknown keys — pin the contract;
      // strip-ed objects tolerate additions.
      if (def.unknownKeys === 'strict') out.additionalProperties = false;
      else out.additionalProperties = true;
      return out;
    }
    case 'ZodUnion': case 'ZodDiscriminatedUnion':
      return { anyOf: (def.options as any[]).map((o) => zodToJsonSchema(o, depth + 1)) };
    case 'ZodOptional': return zodToJsonSchema(def.innerType, depth + 1);
    case 'ZodNullable':
      return { anyOf: [zodToJsonSchema(def.innerType, depth + 1), { type: 'null' }] };
    case 'ZodDefault': {
      const inner = zodToJsonSchema(def.innerType, depth + 1);
      if (def.defaultValue !== undefined) {
        try { inner.default = def.defaultValue(); } catch { /* lazy default threw — skip */ }
      }
      return inner;
    }
    case 'ZodEffects':
      // refine → same shape; transform/preprocess → best-effort inner shape
      return zodToJsonSchema(def.schema, depth + 1);
    case 'ZodRecord':
      return { type: 'object', additionalProperties: zodToJsonSchema(def.valueType, depth + 1) };
    case 'ZodBranded': return zodToJsonSchema(def.innerType ?? schema, depth + 1);
    case 'ZodCatch': return zodToJsonSchema(def.innerType, depth + 1);
    case 'ZodPipeline': return zodToJsonSchema(def.out ?? def.in, depth + 1);
    case 'ZodLazy': {
      try { return zodToJsonSchema(def.getter(), depth + 1); } catch { return {}; }
    }
    default:
      jsonSchemaWarnings.push(`zodToJsonSchema: unhandled ${def.typeName}`);
      return {};
  }
}

// ── Contract-snapshot merge (observed response shapes) ───────────

function shapeToJsonSchema(shape: any): JsonSchema {
  if (shape === 'empty' || shape == null) return {};
  if (typeof shape === 'string') {
    if (shape === 'string') return { type: 'string' };
    if (shape === 'number') return { type: 'number' };
    if (shape === 'boolean') return { type: 'boolean' };
    if (shape === 'null') return { type: 'null' };
    return {};
  }
  if (Array.isArray(shape)) return { type: 'array' };
  if ('[]' in shape) {
    const elem = shape['[]'];
    return { type: 'array', items: elem === 'empty' ? {} : shapeToJsonSchema(elem) };
  }
  const properties: Record<string, JsonSchema> = {};
  for (const [k, v] of Object.entries(shape)) properties[k] = shapeToJsonSchema(v);
  // additionalProperties stays true + no `required`: the OBSERVED shape is
  // a floor, not a ceiling — additions are contract-legal by definition.
  return { type: 'object', properties, additionalProperties: true };
}

// ── Main ─────────────────────────────────────────────────────────

function pascal(s: string): string {
  return s.replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ''));
}

async function main(): Promise<void> {
  // 1. Discover every router module app.ts mounts (statically) so each
  //    walked router instance can be traced back to its declaring file.
  const appSrc = readFileSync(APP_TS, 'utf8');
  const importSpecs = new Map<string, { spec: string; names: string[]; defaults: string[] }>();
  // Covers `import x from`, `import x, { a } from`, `import { a } from`,
  // and `import * as ns from` — all relative ('./…') specifiers.
  const importRe =
    /import\s+(?:(\w+)(?:\s*,\s*)?(?:\{([^}]*)\})?\s*|\{([^}]*)\}\s*|(?:\*\s+as\s+(\w+)\s*))from\s*['"](\.[^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(appSrc))) {
    const spec = m[5]!;
    const defaults = m[1] ? [m[1]!] : []; // `import x from` binds mod.default
    const names = [
      ...(m[4] ? [m[4]!] : []),
      ...(m[2] ?? m[3] ?? '')
        .split(',')
        .map((s) => s.trim().split(/\s+as\s+/)[0]!.trim())
        .filter(Boolean),
    ];
    importSpecs.set(spec, { spec, names, defaults });
  }

  const routerFiles = new Map<unknown, string>(); // router fn identity → file
  const moduleExports: { file: string; mod: Record<string, unknown> }[] = [];
  for (const { spec, names, defaults } of importSpecs.values()) {
    if (!/routes\.js$|\/router\.js$/.test(spec)) continue; // middleware/lib imports
    const abs = path.join(BACKEND_ROOT, 'src', spec.endsWith('.js') ? `${spec.slice(0, -3)}.ts` : spec);
    const url = pathToFileURL(abs).href;
    const mod = (await import(url)) as Record<string, unknown>;
    moduleExports.push({ file: abs, mod });
    for (const name of defaults) {
      const v = mod.default; // `import x from` binds the module's default export
      // Express Routers are functions — identity-matchable against layer.handle
      if (typeof v === 'function') routerFiles.set(v, abs);
    }
    for (const name of names) {
      const v = mod[name];
      if (typeof v === 'function') routerFiles.set(v, abs);
    }
  }

  // 2. Build the app and walk the real route table.
  const { createApp } = (await import(pathToFileURL(path.join(BACKEND_ROOT, 'src', 'app.ts')).href)) as {
    createApp: () => { _router?: { stack: any[] }; router?: { stack: any[] } };
  };
  const app = createApp();
  const stack = app._router?.stack ?? app.router?.stack;
  if (!stack) throw new Error('Cannot read the Express router stack (app._router) — express version changed?');
  const routes: RouteInfo[] = [];
  walkRoutes(stack, '', routerFiles, routes);

  // 2b. Routers whose module identity did not match (tsx may give app.ts's
  //     import and ours distinct module instances) fall back to SIGNATURE
  //     matching: a router's (method, path) set is as unique as a fingerprint.
  {
    const unmatched = new Map<string, RouteInfo[]>();
    for (const r of routes) {
      if (r.sourceFile.startsWith('(unmatched router')) {
        const list = unmatched.get(r.sourceFile) ?? [];
        list.push(r);
        unmatched.set(r.sourceFile, list);
      }
    }
    if (unmatched.size > 0) {
      // Signature set per candidate router module.
      const signaturesOf = (routerStack: any[]): Set<string> => {
        const sigs = new Set<string>();
        const walk = (s: any[]): void => {
          for (const l of s) {
            if (l.name === 'router' && l.handle?.stack) { walk(l.handle.stack); continue; }
            if (l.route) for (const meth of Object.keys(l.route.methods ?? {})) sigs.add(`${meth} ${l.route.path}`);
          }
        };
        walk(routerStack);
        return sigs;
      };
      const candidates: { file: string; sigs: Set<string> }[] = [];
      for (const { file, mod } of moduleExports) {
        for (const v of Object.values(mod)) {
          const rs = (v as { stack?: any[] } | undefined)?.stack;
          if (Array.isArray(rs)) candidates.push({ file, sigs: signaturesOf(rs) });
        }
      }
      for (const [marker, group] of unmatched) {
        const groupSigs = new Set(group.map((r) => `${r.method} ${r.path}`));
        const hits = candidates.filter((c) => c.sigs.size === groupSigs.size && [...groupSigs].every((s) => c.sigs.has(s)));
        if (hits.length === 1) {
          for (const r of group) r.sourceFile = hits[0]!.file;
        } else if (hits.length > 1) {
          group[0]!.warnings.push(`${marker} — signature-matched ${hits.length} router modules; left unattributed`);
        }
      }
    }
  }

  // 3. Attach per-route source facts (validate schema, status, auth).
  const fileSources = new Map<string, string>();
  const moduleCache = new Map<string, Record<string, unknown>>();
  let unresolved = 0;

  /**
   * Import a module by its (relative or bare) specifier, resolving relative
   * '.js' → '.ts' the way tsx does at runtime. Bare specifiers (zod,
   * @prisma/client) resolve through the hoisted node_modules.
   */
  async function importBySpec(spec: string, fromDir: string): Promise<Record<string, unknown> | undefined> {
    const isRel = spec.startsWith('.');
    const key = isRel ? path.resolve(fromDir, spec.replace(/\.js$/, '.ts')) : `pkg:${spec}`;
    let mod = moduleCache.get(key);
    if (!mod) {
      try {
        mod = (await import(isRel ? pathToFileURL(key).href : spec)) as Record<string, unknown>;
        moduleCache.set(key, mod);
      } catch {
        return undefined;
      }
    }
    return mod;
  }

  /** Find `(export )?const <ident> = <RHS>;` and return the RHS source text. */
  function localConstRhs(src: string, ident: string): string | undefined {
    // Column-0 anchor = top-level declarations only; handler-local consts
    // (e.g. `const category = await prisma…` inside a handler) must never
    // be caught by the resolver.
    const re = new RegExp(`^(?:export\\s+)?(?:const|let|var)\\s+${ident}\\s*[^\\w$]=`, 'm');
    const m = re.exec(src);
    if (!m) return undefined;
    let i = m.index + m[0].length - 1; // at '='
    while (src[i] !== '=') i++;
    i++; // past '='
    const start = i;
    let depth = 0;
    while (i < src.length) {
      const c = src[i]!;
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth--;
      else if (c === ';' && depth === 0) return src.slice(start, i);
      else {
        const skipped = skipToken(src, i);
        if (skipped > 0) { i = skipped; continue; }
      }
      i++;
    }
    return undefined;
  }

  /** Resolve a bare identifier to its runtime binding: the file's import
   * table first, then a same-file EXPORTED const (import the compiled module
   * — handles TS-annotated schema bodies `new Function` cannot parse), then
   * a same-file top-level (column-0) local const via recursive RHS
   * evaluation. Returns ANY value — numbers/regexes are legitimate scope
   * bindings for parent expressions; the schema check happens at the attach
   * site. */
  async function resolveIdent(ident: string, file: string, src: string, depth: number): Promise<unknown> {
    const imports = importTable(src);
    const spec = imports.get(ident);
    if (spec) {
      const mod = await importBySpec(spec, path.dirname(file));
      return mod?.[ident] ?? mod?.['default'];
    }
    if (new RegExp(`^export\\s+(?:const|let|var)\\s+${ident}\\b`, 'm').test(src)) {
      const selfSpec = `./${path.basename(file).replace(/\.ts$/, '.js')}`;
      const mod = await importBySpec(selfSpec, path.dirname(file));
      if (mod && mod[ident] !== undefined) return mod[ident];
    }
    const rhs = localConstRhs(src, ident);
    if (rhs !== undefined) return evalExprValue(rhs, file, src, depth + 1);
    return undefined;
  }

  /**
   * Evaluate a schema (or scope) expression from route source text against a
   * scope built from the file's imports + top-level consts. Construction-time
   * evaluation only — `.refine()` callbacks never run here.
   */
  async function evalExprValue(exprText: string, file: string, src: string, depth = 0): Promise<unknown> {
    if (depth > 12) return undefined;
    if (++evalBudget > 600) throw new Error('schema-evaluation budget exhausted — resolver runaway');
    const referenced = new Set([...exprText.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)].map((x) => x[0]!));
    const names: string[] = [];
    const values: unknown[] = [];
    for (const ident of referenced) {
      if (ident === 'z') {
        if (!names.includes('z')) {
          const zod = await importBySpec('zod', path.dirname(file));
          values.unshift((zod as { z?: unknown })?.z ?? zod);
          names.unshift('z');
        }
        continue;
      }
      const binding = await resolveIdent(ident, file, src, depth);
      if (binding !== undefined) { names.push(ident); values.push(binding); }
    }
    try {
      const fn = new Function(...names, `"use strict"; return (${exprText});`);
      return fn(...values);
    } catch (err) {
      jsonSchemaWarnings.push(`schema expression evaluation failed in ${path.basename(file)}: ${(err as Error).message} — expr: ${exprText.slice(0, 60).replace(/\n/g, ' ')}…`);
      return undefined;
    }
  }

  const identOf = (exprText: string): string => {
    if (/^[A-Za-z_$][\w$]*$/.test(exprText)) return exprText;
    const member = /^([A-Za-z_$][\w$]*)\s*\.\s*extend\b/.exec(exprText);
    if (member) return `${member[1]!}Extended`;
    return 'InlineSchema';
  };
  let evalBudget = 0;

  for (const route of routes) {
    if (route.sourceFile.startsWith('(unmatched router')) {
      route.warnings.push(route.sourceFile.slice(1, -1) + ' — source facts unavailable');
      route.sourceFile = APP_TS; // best-known location for the description
      unresolved++;
      continue;
    }
    if (!route.sourceFile) route.sourceFile = APP_TS; // declared directly on the app (health …)
    let src = fileSources.get(route.sourceFile);
    if (!src) { src = readFileSync(route.sourceFile, 'utf8'); fileSources.set(route.sourceFile, src); }
    const decl = findDecl(src, route.method, route.path);
    if (!decl) { route.warnings.push(`declaration not found in source (${route.method} ${route.path})`); unresolved++; continue; }
    const v = firstValidateArg(src, decl.span);
    if (v) {
      // Bare identifiers may be same-file exports — resolve those through the
      // compiled module (TS-annotated schema bodies cannot be `new Function`-ed).
      const isBareIdent = /^[A-Za-z_$][\w$]*$/.test(v.exprText);
      const schema = await (async () => {
        if (isBareIdent && !importTable(src).has(v.exprText)) {
          const direct = await resolveIdent(v.exprText, route.sourceFile, src, 0);
          if (direct !== null && typeof direct === 'object' && '_def' in (direct as Record<string, unknown>)) return direct;
        }
        const val = await evalExprValue(v.exprText, route.sourceFile, src, 0);
        return val !== null && typeof val === 'object' && '_def' in (val as Record<string, unknown>) ? val : undefined;
      })();
      if (schema) {
        if (v.source === 'query') { route.querySchema = schema; route.querySchemaIdent = identOf(v.exprText); }
        else { route.bodySchema = schema; route.bodySchemaIdent = identOf(v.exprText); }
      } else {
        route.warnings.push(`validate() schema could not be resolved (${v.exprText.slice(0, 40)}…) — request schema omitted`);
        unresolved++;
      }
    }
  }

  // 4. Contract snapshot (observed response shapes) — optional merge.
  let snapshot: { routes?: Record<string, { status?: number; shape?: unknown }> } | undefined;
  if (existsSync(SNAPSHOT_JSON)) {
    try { snapshot = JSON.parse(readFileSync(SNAPSHOT_JSON, 'utf8')); } catch { snapshot = undefined; }
  }

  // 5. Error envelope from the real ErrorCode union (parsed, not copied).
  const errorsSrc = existsSync(ERRORS_TS) ? readFileSync(ERRORS_TS, 'utf8') : '';
  const errorCodes = [...errorsSrc.matchAll(/^\s*\|\s*'([A-Z_]+)'\s*$/gm)].map((x) => x[1]!);
  const errorEnvelope: JsonSchema = {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', description: `UPPER_SNAKE machine code. Known values: ${errorCodes.join(', ')}` },
          message: { type: 'string', description: 'Human message (Arabic — D17-3); render verbatim in toasts.' },
          details: { description: 'Optional structured details (e.g. zod flatten() for VALIDATION_ERROR).' },
        },
        required: ['code', 'message'],
      },
    },
    required: ['error'],
  };

  // 6. Assemble the document.
  const backendPkg = JSON.parse(readFileSync(path.join(BACKEND_ROOT, 'package.json'), 'utf8'));
  const componentSchemas: Record<string, JsonSchema> = {
    ErrorEnvelope: errorEnvelope,
  };
  const schemaComponentName = (file: string, ident: string): string => {
    const base = pascal(path.basename(file).replace(/\.routes\.ts$|\.dto\.ts$|\.ts$/, ''));
    let name = `${base}${pascal(ident)}`;
    const sourceIdent = `${path.basename(file)}#${ident}`;
    let n = 2;
    while (componentSchemas[name]) {
      if ((componentSchemas[name] as any)['x-source-ident'] === sourceIdent) break; // same schema reused
      name = `${base}${pascal(ident)}_${n++}`;
    }
    return name;
  };

  const paths: Record<string, Record<string, unknown>> = {};
  const tagCounts = new Map<string, number>();
  const snapshotCovered: string[] = [];

  for (const route of routes.slice().sort((a, b) => a.fullPath.localeCompare(b.fullPath) || a.method.localeCompare(b.method))) {
    const oapiPath = route.fullPath.replace(/:([A-Za-z_$][\w$]*)/g, '{$1}');
    if (oapiPath.includes('*')) { route.warnings.push('wildcard/regex path — emitted under /api/v1/{wildcard} is skipped'); continue; }
    const item = (paths[oapiPath] ??= {});
    if (route.method === 'all') { route.warnings.push('router.all — skipped (not a doc-worthy verb)'); continue; }
    if (item[route.method]) { route.warnings.push(`duplicate registration for ${route.method.toUpperCase()} ${oapiPath} — kept the first`); continue; }

    // tag = first meaningful path segment after /api/v1
    const seg = oapiPath.split('/').filter(Boolean)[2] ?? 'root';
    const tag = seg === 'api' ? 'root' : seg;
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);

    const op: Record<string, unknown> = {
      tags: [tag],
      summary: `${route.method.toUpperCase()} ${route.fullPath}`,
      description: `Declared in \`${path.relative(REPO_ROOT, route.sourceFile)}\` (mounted at \`${route.mountPrefix}\`).`,
      'x-mounted-at': route.mountPrefix,
      responses: {},
    };

    // security heuristic (documented in the file header)
    if (route.auth === 'required') op.security = [{ bearerAuth: [] }];
    else op.security = []; // public / optional-auth: bearer works but is not required
    if (route.auth === 'optional') op.description += ' Accepts an OPTIONAL bearer token (optionalAuthMiddleware).';

    // query parameters from the real zod schema
    if (route.querySchema) {
      const qs = zodToJsonSchema(route.querySchema);
      const props = (qs.properties ?? {}) as Record<string, JsonSchema>;
      const required = (qs.required ?? []) as string[];
      op.parameters = Object.entries(props).map(([name, schema]) => ({
        name,
        in: 'query',
        required: required.includes(name),
        schema,
      }));
    }

    // request body from the real zod schema
    if (route.bodySchema) {
      const name = schemaComponentName(route.sourceFile, route.bodySchemaIdent!);
      const jsonSchema = zodToJsonSchema(route.bodySchema);
      componentSchemas[name] = {
        ...jsonSchema,
        'x-source-ident': `${path.basename(route.sourceFile)}#${route.bodySchemaIdent}`,
      };
      op.requestBody = {
        required: true,
        content: { 'application/json': { schema: { $ref: `#/components/schemas/${name}` } } },
      };
    }

    // responses — success + the standard error envelope
    const key = `${route.method.toUpperCase()} ${route.fullPath}`;
    const snapRoute = snapshot?.routes?.[key];
    const successSchema: JsonSchema = snapRoute?.shape
      ? { allOf: [{ $ref: '#/components/schemas/SuccessEnvelope' }, shapeToJsonSchema(snapRoute.shape)] }
      : { $ref: '#/components/schemas/SuccessEnvelope' };
    if (snapRoute?.shape) snapshotCovered.push(key);
    if (route.successStatus === 204) {
      op.responses['204'] = { description: 'No content' };
    } else {
      op.responses[String(route.successStatus)] = {
        description: `Success envelope \`{ data }${snapRoute?.shape ? ' — top-level fields observed by the contract suite' : ''}\``,
        content: { 'application/json': { schema: successSchema } },
      };
    }
    for (const [code, desc] of [
      ['400', 'Validation / bad request'],
      ['401', 'Missing, invalid or expired bearer token (TOKEN_EXPIRED on expiry — refresh)'],
      ['429', 'Rate limited (global 1000 req/15 min/IP; auth surface 10 req/15 min/IP)'],
      ['500', 'Unexpected server error'],
    ] as const) {
      if (route.successStatus === 204 && code === '400') continue;
      op.responses[code] = {
        description: desc,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
      };
    }

    item[route.method] = op;
    if (route.warnings.length > 0) op['x-warnings'] = route.warnings;
  }

  const doc = {
    openapi: '3.1.0',
    info: {
      title: 'Madarek Platform API',
      version: backendPkg.version as string,
      description: [
        'مدارك — Arabic-first smart-learning platform. Non-browser (Expo) clients should start at `docs/api/mobile-auth.md`.',
        '',
        'Conventions: every endpoint lives under `/api/v1` and answers `{ data: … }`',
        '(errors: `{ error: { code, message, details? } }`, Arabic messages, UPPER_SNAKE codes).',
        'Auth: `Authorization: Bearer <accessToken>` (15 min) + a 7-day `mdrk_refresh` cookie',
        'for rotation. The contract is ADDITIVE-ONLY for mobile clients — enforced by',
        '`backend/tests/contract/api-contract.test.ts` against the committed snapshot.',
        '',
        'Generated from the live Express route table + the real zod DTOs; response field',
        'shapes on snapshot-covered operations come from the committed contract snapshot',
        '(top-level observed fields, additionalProperties open).',
      ].join('\n'),
    },
    servers: [{ url: 'http://localhost:4000', description: 'Local dev (PORT=4000, madarek_dev)' }],
    tags: [...tagCounts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, description: `${count} operation(s) under /api/v1/${name === 'root' ? '' : name}` })),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token minted by POST /api/v1/auth/login (HS256; claims sub/role/inst/type; 15 min TTL). On 401 TOKEN_EXPIRED → POST /api/v1/auth/refresh.',
        },
        refreshCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'mdrk_refresh',
          description: 'httpOnly refresh cookie (SameSite=Strict, Path=/api/v1/auth, 7 days) consumed by POST /api/v1/auth/refresh. Native clients must persist this cookie (cookie jar) — the refresh endpoint does not (yet) accept a body token.',
        },
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          properties: { data: { description: 'Payload — shape per endpoint (see per-operation 2xx schemas).' } },
          required: ['data'],
        },
        ...componentSchemas,
      },
    },
    'x-generator': {
      tool: 'backend/scripts/generate-openapi.ts (hand-rolled: express-stack walk + zod-v3 walker)',
      generatedAt: new Date().toISOString(),
      operationCount: Object.values(paths).reduce((n, p) => n + Object.keys(p).length, 0),
      pathCount: Object.keys(paths).length,
      contractSnapshotCovered: snapshotCovered.length,
      snapshotCoveredRoutes: snapshotCovered,
      warnings: [
        ...routes.flatMap((r) => r.warnings.map((w) => `${r.method.toUpperCase()} ${r.fullPath}: ${w}`)),
        ...jsonSchemaWarnings.map((w) => `[resolver] ${w}`),
      ],
      securityHeuristic:
        'bearerAuth is attached when the route (or its router-level gate) uses authMiddleware; optionalAuthMiddleware and ungated routes are marked security:[]. Per-endpoint role/capability gates (requireRole/requireCapability) are NOT modelled — see the route sources.',
    },
  };

  mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');

  const opCount = (doc as any)['x-generator'].operationCount as number;
  console.log(`✅ docs/api/openapi.json — ${opCount} operations across ${Object.keys(paths).length} paths`);
  console.log(`   contract snapshot covered: ${snapshotCovered.length} operation(s)`);
  const warns = (doc as any)['x-generator'].warnings as string[];
  if (warns.length > 0) {
    console.log(`⚠️  ${warns.length} honest warning(s):`);
    for (const w of warns) console.log(`   - ${w}`);
  }
}

main().catch((err) => {
  console.error('❌ openapi generation failed:', err);
  process.exit(1);
});
