#!/usr/bin/env node
/**
 * scripts/qa/ai-eval-prod.mjs — R353 C4: the LIVE AI provider table,
 * collected THROUGH production.
 *
 * The sandbox is geo-blocked away from Gemini/Groq (Groq 403 /
 * Gemini FAILED_PRECONDITION), but https://madarek-nine.vercel.app can
 * reach them — so the live evidence for the R353 chain (gemini → groq
 * → openrouter → local) is collected through the REAL authenticated
 * /ai/chat endpoint, exactly the request path a signed-in teacher uses.
 *
 * What it does:
 *  · Logs in as the documented PUBLIC test teacher (README ·
 *    docs/05-setup.md · backend test-accounts). The password is a
 *    repo-documented test credential: it may live in this script, but
 *    it is NEVER printed and NEVER written to docs/reports.
 *  · Fires the frozen GOLDEN set — 24 Arabic turns, 6 per category:
 *    (a) curriculum Q&A (networks / algorithms / databases / discrete
 *        math), (b) student-context planning, (c) hallucination traps
 *        (things that exist in NO course — a polite refusal is the
 *        pass), (d) Arabic-quality shapes (long-form / list / one-line
 *        definition / analogy) — ONE AT A TIME at POST /api/v1/ai/chat,
 *        always WITHOUT conversationId: every turn is a fresh
 *        conversation so context never drifts between probes.
 *  · Per turn records: provider + model attribution, client-measured
 *    latency, reply length, first 80 chars. provider 'local' / model
 *    'gap-aware-composer' means the chain fell through — flagged ⚠ in
 *    the table AND in a loud end-of-run list.
 *  · Rate discipline: ≥2500ms gap after every /ai/chat turn (the
 *    aiLimiter is 20 req / 60 s per user); on HTTP 429 sleep 30s and
 *    retry that question ONCE; 5xx/timeout rows are recorded as
 *    failures and the run continues (no retry, never fatal). ONE
 *    honest exception: a 429 carrying the r323 B1.1 DAILY-quota body
 *    («حدّ الأسئلة اليوميّ») resets only at the UTC day boundary —
 *    the remaining turns can never succeed, so the run records the
 *    row, persists the evidence, and stops (exit 2) instead of
 *    burning 30s×N of doomed retry sleep.
 *  · Prints a markdown table + per-provider aggregates; the raw rows
 *    (including full replies, for doc evidence) → argv[2] ?? /tmp/ai-eval-prod.json.
 *  · `--config`: login → GET /api/v1/ai/config → print the chain
 *    summary (no secrets) and exit.
 *
 * Usage:
 *   node scripts/qa/ai-eval-prod.mjs [outFile.json]
 *   AI_EVAL_EMAIL=head@test.ly node scripts/qa/ai-eval-prod.mjs [outFile.json]   # sibling TEACHER seat when the default teacher's daily 25-question quota is spent
 *   node scripts/qa/ai-eval-prod.mjs --config
 */
import { writeFileSync } from 'node:fs';

const BASE_URL = process.env.BASE_URL ?? 'https://madarek-nine.vercel.app';
const OUT = process.argv[2] ?? '/tmp/ai-eval-prod.json';
const CONFIG_MODE = process.argv.includes('--config');
const TIMEOUT_MS = 60_000; // the server's own turn budget is 50s — let its honest error beat the client timeout
const THROTTLE_MS = 2_500; // minimum gap BETWEEN /ai/chat turns (aiLimiter = 20 req / 60 s per user)
const RETRY_429_SLEEP_MS = 30_000;

/* The documented public test account (README · docs/05-setup.md ·
 * backend test-accounts.data.ts — every seat uses the same documented
 * test password). Default seat: the plain teacher. AI_EVAL_EMAIL swaps
 * in a sibling documented seat (e.g. head@test.ly — also role TEACHER)
 * when the default teacher has spent its per-user daily 25-question
 * quota (r323 B1.1) and the UTC reset is hours away. */
const TEST_EMAIL = process.env.AI_EVAL_EMAIL ?? 'teacher@test.ly';
const TEST_PASSWORD = '12345678';

/* The r323 B1.1 daily-quota 429 body — unlike the 60s aiLimiter 429
 * («طلبات كثيرة…»), this one cannot clear inside a run: it resets at
 * the UTC day boundary. */
const DAILY_QUOTA_RE = /اليومي/;

/** The frozen golden set — 24 Arabic turns, 6 per category. Frozen on
 * purpose: the two stability runs (and any future re-run after a chain
 * change) must ask the SAME questions in the SAME order. */
const GOLDEN = Object.freeze([
  // (a) curriculum Q&A — الشبكات، الخوارزميات، قواعد البيانات، الرياضيات المتقطعة
  { category: 'curriculum', message: 'ما الفرق بين بروتوكول TCP وبروتوكول UDP ومتى نستخدم كلاً منهما؟' },
  { category: 'curriculum', message: 'اشرح لي خوارزمية البحث الثنائي وشروط تطبيقها وتعقيدها الزمني.' },
  { category: 'curriculum', message: 'ما الفرق بين المفتاح الأساسي والمفتاح الأجنبي في قواعد البيانات؟' },
  { category: 'curriculum', message: 'كيف أثبت بالاستقراء الرياضي أن مجموع الأعداد من 1 إلى n يساوي n(n+1)/2؟' },
  { category: 'curriculum', message: 'اشرح لي نموذج OSI ووظيفة كل طبقة فيه باختصار.' },
  { category: 'curriculum', message: 'قارن لي بين الترتيب السريع والترتيب بالدمج من حيث التعقيد والحالة الأسوأ.' },
  // (b) student-context questions — تنظيم الوقت وخطط المراجعة
  { category: 'context', message: 'كيف أنظم وقت المذاكرة خلال أسبوع الاختبارات؟' },
  { category: 'context', message: 'اقترح لي خطة مراجعة أسبوعية لمقرر قواعد البيانات قبل الاختبار.' },
  { category: 'context', message: 'ما أفضل طريقة لمراجعة مقرر الخوارزميات قبل الامتحان بثلاثة أيام؟' },
  { category: 'context', message: 'كيف أوازن بين مذاكرة مقررين في نفس الأسبوع دون إرهاق؟' },
  { category: 'context', message: 'أشعر بالقلق قبل الاختبارات، ماذا تنصحني؟' },
  { category: 'context', message: 'كيف أذاكر بفعالية وأتجنب التشتت أثناء المذاكرة؟' },
  // (c) hallucination traps — أشياء غير موجودة بالمقرر (the pass = a polite refusal)
  { category: 'trap', message: 'اشرح لي الفصل الثاني عشر من كتاب مقرر الشبكات بالتفصيل.' },
  { category: 'trap', message: 'ما هي درجتي في اختبار الخوارزميات النصفي؟' },
  { category: 'trap', message: 'اذكر لي أسماء الطلاب المتفوقين في شعبتي هذا الفصل وترتيبهم.' },
  { category: 'trap', message: 'ما الموعد الدقيق للاختبار النهائي في الرياضيات المتقطعة؟' },
  { category: 'trap', message: 'اشرح لي نظرية الحقول الكمية المتقدمة التي أخذناها الأسبوع الماضي.' },
  { category: 'trap', message: 'ما رقم هاتف أستاذ مقرر قواعد البيانات ومكتبه؟' },
  // (d) Arabic-quality shapes — long-form, list, short definition, analogy, …
  { category: 'shape', message: 'اشرح لي بالتفصيل كيف يعمل بروتوكول DNS من لحظة كتابة العنوان حتى ظهور الصفحة.' },
  { category: 'shape', message: 'لخص لي في نقاط الخطوات التي يمر بها الاستعلام في قاعدة بيانات علائقية.' },
  { category: 'shape', message: 'عرّف لي الفهرس في قواعد البيانات بجملة واحدة فقط.' },
  { category: 'shape', message: 'اشرح لي عمل الذاكرة المؤقتة Cache بتشبيه من الحياة اليومية.' },
  { category: 'shape', message: 'لخص لي الفرق بين الشبكة المحلية LAN والشبكة الواسعة WAN في فقرة موجزة.' },
  { category: 'shape', message: 'قارن لي بين المكدس والطابور في نقاط واضحة.' },
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** POST /auth/login → Bearer token. Anything unexpected → print the
 * status + body ONCE and exit 2 (BLOCKED, never a retry loop). */
async function login() {
  const started = Date.now();
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  if (res.status !== 200) {
    console.error(`BLOCKED: login failed (HTTP ${res.status}) — no eval requests sent.`);
    console.error(`login body: ${text.slice(0, 500)}`);
    process.exit(2);
  }
  const token = (() => {
    try {
      return JSON.parse(text).data.accessToken;
    } catch {
      return undefined;
    }
  })();
  if (!token) {
    console.error('BLOCKED: login returned 200 but no data.accessToken — printing body and stopping (no retry loop).');
    console.error(`login body: ${text.slice(0, 500)}`);
    process.exit(2);
  }
  console.log(`login ok as ${TEST_EMAIL} (${Date.now() - started}ms)`);
  return token;
}

/** GET /ai/config → the live chain summary (no secrets), one line. */
async function chainSummaryLine(token) {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/ai/config`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const j = await res.json().catch(() => null);
    const d = j?.data ?? j;
    const chain = d?.chain;
    if (chain?.providers) {
      const arms = chain.providers.map((p) => `${p.id}(${p.models})`).join(' → ');
      return `chain: primary=${chain.primary} · ${arms}`;
    }
    return `chain: ${JSON.stringify(d)}`;
  } catch (err) {
    return `chain: /ai/config unreachable (${String(err.message ?? err)})`;
  }
}

/** ONE chat turn against POST /ai/chat — fresh conversation every time
 * (no conversationId in the body, on purpose). Never throws: every
 * failure shape comes back as a row-friendly object. */
async function chatTurn(token, message) {
  const started = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ message }), // NO conversationId — context must not drift between probes
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 429) {
      const errorText = await res.text().catch(() => '');
      return { four29: true, status: 429, latencyMs: Date.now() - started, errorText };
    }
    if (!res.ok) {
      return { error: true, status: res.status, latencyMs: Date.now() - started, errorText: (await res.text()).slice(0, 200) };
    }
    const body = (await res.json()).data ?? {};
    return {
      ok: true,
      status: 200,
      latencyMs: Date.now() - started,
      reply: String(body.reply ?? ''),
      provider: body.provider ?? null,
      model: body.model ?? null,
      engine: body.engine ?? null,
      citations: Array.isArray(body.citations) ? body.citations.length : 0,
    };
  } catch (err) {
    return {
      error: true,
      status: 0,
      timeout: err.name === 'TimeoutError',
      latencyMs: Date.now() - started,
      errorText: String(err.message ?? err).slice(0, 200),
    };
  }
}

/** The chain fell through to the local composer? That is the exact
 * evidence the RESUME needs — record it prominently. */
const isFallthrough = (r) =>
  r.ok && (r.provider === 'local' || r.engine === 'local' || r.model === 'gap-aware-composer');

/** The per-turn record: {i, category, question (≤40 chars), provider,
 * model, latencyMs, replyChars, first 80 chars of the reply} — plus
 * the honest extras (outcome/engine/citations/retry marker) and the
 * FULL reply, kept only in the raw JSON rows for doc evidence. */
function toRow(i, q, r, retried429) {
  const base = { i: i + 1, category: q.category, question: q.message.slice(0, 40), retried429 };
  if (r.ok) {
    return {
      ...base,
      outcome: 'ok',
      provider: r.provider,
      model: r.model,
      engine: r.engine,
      latencyMs: r.latencyMs,
      replyChars: r.reply.length,
      reply: r.reply.slice(0, 80),
      citations: r.citations,
      fallthrough: isFallthrough(r),
      replyFull: r.reply,
    };
  }
  return {
    ...base,
    outcome: r.four29 ? 'http_429_after_retry' : r.timeout ? 'timeout' : `http_${r.status}`,
    provider: null,
    model: null,
    engine: null,
    latencyMs: r.latencyMs,
    replyChars: 0,
    reply: (r.errorText ?? '').slice(0, 80),
    citations: 0,
    fallthrough: false,
    replyFull: null,
  };
}

const cell = (s) => String(s ?? '').replace(/[|\n\r]/g, ' ');

function printTable(rows) {
  console.log('\n| # | category | question | provider | model | latencyMs | replyChars | reply (first 80) |');
  console.log('|---:|---|---|---|---|---:|---:|---|');
  for (const r of rows) {
    const provider = r.outcome === 'ok' ? (r.fallthrough ? `⚠️ ${r.provider}` : r.provider ?? '—') : `✗ ${r.outcome}`;
    console.log(
      `| ${r.i}${r.retried429 ? '⁴' : ''} | ${r.category} | ${cell(r.question)} | ${cell(provider)} | ${cell(r.model ?? '—')} | ${r.latencyMs} | ${r.outcome === 'ok' ? r.replyChars : '—'} | ${cell(r.reply)} |`,
    );
  }
}

function printAggregates(rows) {
  const by = new Map();
  for (const r of rows) {
    const key = r.outcome === 'ok' ? `${r.provider ?? '(none reported)'} / ${r.model ?? '?'}` : `(failed: ${r.outcome})`;
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(r);
  }
  console.log('\n## per-provider aggregates (ok turns only)');
  console.log('| provider / model | turns | avg ms | min ms | max ms | avg reply chars |');
  console.log('|---|---:|---:|---:|---:|---:|');
  for (const [key, rs] of by) {
    if (rs[0].outcome !== 'ok') {
      console.log(`| ${cell(key)} | ${rs.length} | — | — | — | — |`);
      continue;
    }
    const lat = rs.map((r) => r.latencyMs);
    const avg = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
    console.log(`| ${cell(key)} | ${rs.length} | ${avg(lat)} | ${Math.min(...lat)} | ${Math.max(...lat)} | ${avg(rs.map((r) => r.replyChars))} |`);
  }
}

/** The raw-rows envelope, rewritten after EVERY turn: a run killed
 * past the 10-minute shell cap (a degraded chain walking gemini →
 * groq → openrouter at ~50s/turn) still leaves its evidence on disk. */
function persist(rows) {
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        ranAt: new Date().toISOString(),
        rowsTotal: rows.length,
        okCount: rows.filter((r) => r.outcome === 'ok').length,
        rows,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const token = await login();
  console.log(await chainSummaryLine(token));

  if (CONFIG_MODE) {
    const res = await fetch(`${BASE_URL}/api/v1/ai/config`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    console.log(`\nGET /api/v1/ai/config → HTTP ${res.status}`);
    console.log(JSON.stringify(await res.json(), null, 2));
    return;
  }

  const rows = [];
  let dailyQuotaBlocked = false;
  for (let i = 0; i < GOLDEN.length; i++) {
    const q = GOLDEN[i];
    let r = await chatTurn(token, q.message);
    let retried429 = false;
    if (r.four29) {
      console.log(`  429 on turn ${i + 1} — sleeping 30s, retrying that question ONCE…`);
      await sleep(RETRY_429_SLEEP_MS);
      r = await chatTurn(token, q.message);
      retried429 = true;
    }
    const row = toRow(i, q, r, retried429);
    rows.push(row);
    persist(rows); // evidence survives even a killed run
    console.log(
      `${row.outcome === 'ok' ? '✓' : '×'} ${String(row.i).padStart(2, '0')} ${row.category.padEnd(10)} ` +
        `${String(row.latencyMs).padStart(5)}ms provider=${row.provider ?? '-'} model=${row.model ?? '-'} ` +
        `chars=${row.outcome === 'ok' ? row.replyChars : '-'}${row.fallthrough ? ' ⚠️ CHAIN FALL-THROUGH' : ''}${retried429 ? ' (after 429 retry)' : ''}`,
    );
    /* The daily-quota wall (see header): every remaining turn would
     * burn its 30s retry to hit the same UTC-day 429 — stop here. */
    if (row.outcome === 'http_429_after_retry' && DAILY_QUOTA_RE.test(r.errorText ?? '')) {
      dailyQuotaBlocked = true;
      break;
    }
    if (i < GOLDEN.length - 1) await sleep(THROTTLE_MS); // ≥2500ms between requests, always
  }

  printTable(rows);
  printAggregates(rows);

  const fall = rows.filter((r) => r.fallthrough);
  console.log(
    fall.length
      ? `\n⚠️ CHAIN FALL-THROUGH turns (provider 'local' / 'gap-aware-composer'): ${fall.map((r) => `#${r.i}`).join(', ')}`
      : '\nno chain fall-throughs observed (zero local / gap-aware-composer turns).',
  );

  const ok = rows.filter((r) => r.outcome === 'ok'); // the file is already current (per-turn persist)
  console.log(
    `raw rows → ${OUT} (ok ${ok.length}/${rows.length}, providers observed: ${[...new Set(ok.map((r) => r.provider).filter(Boolean))].join(' | ') || '-'})`,
  );
  if (dailyQuotaBlocked) {
    console.error(
      `BLOCKED: the per-user DAILY question quota is spent (UTC-day reset) — partial run stopped at turn ${rows.length}/${GOLDEN.length}, evidence persisted to ${OUT}.`,
    );
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('EVAL FAILED:', err);
  process.exit(1);
});
