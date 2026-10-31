#!/usr/bin/env tsx
/**
 * scripts/r327/ai-retrieval-check.ts — P4(b) the grounded-retrieval
 * proof, run against the LIVE local stack's database.
 *
 * The r325 P4(b) row wants «grounded answers w/ citations». The live
 * dev stack runs the AI chat in LOCAL composer mode (no LLM key), and
 * in local mode the chat envelope deliberately carries NO citations
 * (the template composer never read the sources — it must not pretend
 * to cite). So the grounding layer is proven HERE, at the exact
 * function the chat route calls every turn (searchKnowledge), against
 * the real AiKnowledgeChunk rows the /ai/knowledge/reindex endpoint
 * indexed from the seeded course truth.
 *
 * What this script measures (all against DATABASE_URL):
 *  1. pg_trgm's Arabic blindness — similarity() of two IDENTICAL
 *     Arabic strings (the root cause the r327 prefilter fix addresses:
 *     the `%` trigram operator extracted no Arabic trigrams, so the
 *     whole-phrase ILIKE was the only Arabic recall path).
 *  2. The OLD prefilter (trigram % OR whole-phrase ILIKE) vs the NEW
 *     prefilter (+ per-token ILIKE) — candidate counts for natural
 *     Arabic questions (the exact questions a student would type).
 *  3. The REAL searchKnowledge() output for the same questions —
 *     hit count + top titles (post Arabic-aware re-ranker), i.e. the
 *     citations a provider-mode answer would carry.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres@localhost:5433/madarek_dev \
 *     npx tsx scripts/r327/ai-retrieval-check.ts
 */
import { createRequire } from 'node:module';
// @prisma/client lives in the backend workspace's node_modules (the
// repo root does not hoist it) — resolve it the way scripts' Z14 sharp
// fix does: createRequire anchored at the backend package.
const requireFromBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const { PrismaClient } = requireFromBackend('@prisma/client') as typeof import('@prisma/client');
import { searchKnowledge } from '../../backend/src/modules/ai/knowledge.js';

const prisma = new PrismaClient();

/** Natural Arabic questions about the seeded course truth (the 25
 * checkpoint chunks /ai/knowledge/reindex indexed from the showcase
 * institution's 24 lectures). Written the way a STUDENT would phrase
 * them — not engineered to substring-match the stored text. */
const QUESTIONS: ReadonlyArray<{ id: string; q: string }> = [
  { id: 'os-virtual-memory', q: 'ما الفائدة من الذاكرة الافتراضية في أنظمة التشغيل؟' },
  { id: 'os-role', q: 'ما هي وظائف نظام التشغيل الأساسية؟' },
  { id: 'sql-having', q: 'متى أستخدم HAVING بدلاً من WHERE في الاستعلامات؟' },
  { id: 'sql-joins', q: 'كيف أربط بين جدولين في قاعدة البيانات العلائقية؟' },
  { id: 'db-foreign-key', q: 'ما الغرض من المفتاح الأجنبي في النموذج العلائقي؟' },
  { id: 'db-3nf', q: 'اشرح لي قواعد التطبيع حتى الصورة الثالثة 3NF' },
  { id: 'arch-cache', q: 'لماذا تكون الذاكرة المخبئية أسرع من الذاكرة الرئيسية؟' },
  { id: 'arch-twos-complement', q: 'كيف نمثل الأعداد السالبة بالمتممة الثنائية؟' },
  { id: 'data-representation', q: 'كيف يحسب الحاسوب تمثيل البيانات والأرقام؟' },
  { id: 'hardware-components', q: 'ما مكونات الحاسوب وبنيته الداخلية؟' },
];

async function main(): Promise<void> {
  const institutionId = process.argv[2] ?? 'inst-zawia-showcase';
  const chunkCount = await prisma.aiKnowledgeChunk.count({ where: { institutionId } });
  console.log(`━━━ r327 P4(b) — grounded-retrieval check ━━━`);
  console.log(`institution: ${institutionId} · AiKnowledgeChunk rows: ${chunkCount}`);
  console.log('');

  // 1) The measured root cause: pg_trgm extracts no Arabic trigrams.
  const [arIdent] = await prisma.$queryRaw<Array<{ s: number }>>`
    SELECT similarity('الذاكرة الافتراضية', 'الذاكرة الافتراضية') AS s`;
  const [latin] = await prisma.$queryRaw<Array<{ s: number }>>`
    SELECT similarity('virtual memory', 'virtual memory management') AS s`;
  console.log('1) pg_trgm similarity (the measured root cause):');
  console.log(`   similarity('الذاكرة الافتراضية', 'الذاكرة الافتراضية') = ${Number(arIdent?.s ?? 0).toFixed(3)}  ← identical ARABIC strings score ZERO`);
  console.log(`   similarity('virtual memory', 'virtual memory management')  = ${Number(latin?.s ?? 0).toFixed(3)}  ← latin scores normally`);
  console.log('');

  // 2) Old vs new prefilter candidate counts, per natural question.
  console.log('2) prefilter candidates — OLD (trigram % OR whole-phrase ILIKE) vs NEW (+ per-token ILIKE):');
  for (const { id, q } of QUESTIONS) {
    const oldCount = await prisma.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM "AiKnowledgeChunk"
      WHERE "institutionId" = ${institutionId}
        AND ("content" % ${q} OR "content" ILIKE ${'%' + q.slice(0, 60) + '%'})`;
    const tokens = [...new Set(q.split(/[\s,،.؛:!?()«»"'\-_/]+/).map((t) => t.trim()).filter((t) => t.length >= 3 && t.length <= 40))].slice(0, 6);
    const patterns = tokens.map((t) => `%${t}%`);
    const newCount = await prisma.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM "AiKnowledgeChunk"
      WHERE "institutionId" = ${institutionId}
        AND ("content" % ${q} OR "content" ILIKE ${'%' + q.slice(0, 60) + '%'} OR "content" ILIKE ANY(${patterns}))`;
    console.log(`   ${id.padEnd(22)} old=${String(oldCount?.[0]?.n ?? 0).padStart(2)}  new=${String(newCount?.[0]?.n ?? 0).padStart(2)}`);
  }
  console.log('');

  // 3) The REAL searchKnowledge (the exact function the chat route
  //    calls) — the citations a provider-mode answer would carry.
  console.log('3) searchKnowledge() (the chat route\'s own retrieval) — hits after the Arabic-aware re-ranker:');
  let retrieved = 0;
  for (const { id, q } of QUESTIONS) {
    const hits = await searchKnowledge(prisma, institutionId, q);
    if (hits.length > 0) retrieved += 1;
    const top = hits[0];
    console.log(
      `   ${id.padEnd(22)} hits=${hits.length}${top ? `  top: «${top.title}»${top.locator ? ` · ${top.locator}` : ''} (score ${top.score.toFixed(2)})` : '  —'}`,
    );
  }
  console.log('');
  console.log(`retrieved ≥1 grounded source for ${retrieved}/${QUESTIONS.length} natural Arabic questions`);
  console.log('(local-mode chat envelopes stay citations:[] by design — the composer never cites;');
  console.log(' these hits are what a provider-mode answer cites, and what the reindex index)');
}

main()
  .catch((err) => {
    console.error('CHECK FAILED:', err?.message ?? String(err));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
