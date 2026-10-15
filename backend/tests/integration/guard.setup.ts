/**
 * Fail-closed environment guard for the DB integration suite (r171b).
 *
 * Runs as a vitest setupFile — BEFORE any test module (and therefore
 * before any PrismaClient is constructed or any connection opened).
 * The suite is opt-in by design (AGENTS.md §5.2: the default `npm test`
 * stays DB-free); this guard makes the opt-in contract un-skippable:
 *
 *   - DATABASE_URL missing        → refuse (this is NOT npm test; the
 *                                    caller must point at a disposable DB)
 *   - not a postgres(ql):// URL   → refuse
 *   - host contains onrender/neon → refuse (production-looking)
 *   - host not localhost/127.0.0.1/::1 → refuse (never point tests at
 *                                    a database you cannot afford to
 *                                    lose — the suite TRUNCATES tables)
 *
 * Refusal prints a bilingual (Arabic first, D17-3) message naming the
 * exact problem and exits the worker process non-zero — no test runs.
 *
 * The guard itself only parses the URL: it performs NO connection and
 * prints NO credentials (hostname only, never the full URL).
 */
import process from 'node:process';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Production-looking substrings — belt AND braces (they are not local
 * hosts anyway, but the message must name the danger explicitly). */
const PROD_HOST_MARKERS = ['onrender', 'neon'] as const;

function refuse(reasonAr: string, reasonEn: string): never {
  console.error('');
  console.error('╔══════════════════════════════════════════════════════════════╗');
  console.error('║  ⛔ حزام اختبارات تكامل قاعدة البيانات — رفضَ الاشتغال        ║');
  console.error('║  DB integration harness — refusing to run                     ║');
  console.error('╠══════════════════════════════════════════════════════════════╣');
  console.error(`║  السبب: ${reasonAr}`);
  console.error(`║  Reason: ${reasonEn}`);
  console.error('╠──────────────────────────────────────────────────────────────╨');
  console.error('│  هذا الحزام اختياري ولا يعمل ضمن `npm test` (الذي يبقى بلا');
  console.error('│  قاعدة بيانات بقرار AGENTS.md §5.2). وجّه DATABASE_URL إلى');
  console.error('│  قاعدة تجريبية معزولة على localhost ثم أعد المحاولة.');
  console.error('│  This suite is opt-in and never part of `npm test`. Point');
  console.error('│  DATABASE_URL at a disposable LOCAL database (localhost /');
  console.error('│  127.0.0.1 only) — it truncates every table it finds.');
  console.error('│  انظر / See: docs/11-testing.md (قسم اختبارات تكامل قاعدة البيانات)');
  console.error('╚══════════════════════════════════════════════════════════════╝');
  process.exit(1);
}

const raw = process.env.DATABASE_URL;
if (!raw || raw.trim() === '') {
  refuse(
    'DATABASE_URL غير مضبوط في بيئة التشغيل.',
    'DATABASE_URL is not set — the integration suite needs an explicit disposable database.',
  );
}

let url: URL;
try {
  url = new URL(raw);
} catch {
  refuse(
    'DATABASE_URL ليس رابطًا صالحًا.',
    'DATABASE_URL is not a parseable URL.',
  );
}

if (!/^postgres(ql)?:$/.test(url.protocol)) {
  refuse(
    `بروتوكول DATABASE_URL هو «${url.protocol}» — المسموح postgresql:// فقط.`,
    `DATABASE_URL protocol is "${url.protocol}" — only postgresql:// is supported.`,
  );
}

const host = url.hostname.toLowerCase();
const prodMarker = PROD_HOST_MARKERS.find((marker) => host.includes(marker));
if (prodMarker) {
  refuse(
    `المستضيف «${host}» يبدو مستضيف إنتاج (${prodMarker}) — الرفض حتمي.`,
    `Host "${host}" looks production-grade (${prodMarker}) — fail closed.`,
  );
}

if (!LOCAL_HOSTS.has(host)) {
  refuse(
    `المستضيف «${host}» ليس محليًا — المسموح localhost أو 127.0.0.1 فقط.`,
    `Host "${host}" is not local — only localhost / 127.0.0.1 / ::1 are allowed.`,
  );
}

if (!url.pathname || url.pathname === '/') {
  refuse(
    'الرابط بلا اسم قاعدة بيانات — أنشئ قاعدة تجريبية معزولة ووجّه إليها.',
    'DATABASE_URL has no database name — create and point at a dedicated disposable database.',
  );
}

// Guard passed: DATABASE_URL is a local, named, disposable database.
