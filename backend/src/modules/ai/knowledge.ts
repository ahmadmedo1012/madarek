/**
 * r323 B1.2 — the RAG knowledge layer (lexical, pg_trgm-backed).
 *
 * One job: when a student asks the tutor something, the platform should
 * answer FROM THE COURSE'S OWN MATERIALS and say exactly where each
 * fact came from («المصدر: محاضرة 2 · الدقيقة 14:20»), as a link that
 * opens the player at the timestamp. No vector store, no new infra —
 * the retrieval is honest lexical scoring over `AiKnowledgeChunk` rows
 * (trigram prefilter in Postgres, Arabic-aware re-scoring in JS).
 *
 * Pure layer (DB-free testable):
 *   · parseSrtVtt / groupTranscriptWindows — captions → windows
 *   · formatMinSec — the «الدقيقة 14:20» locator
 *   · chunkText — bounded chunks on sentence/paragraph boundaries
 *   · scoreKnowledgeHits — the Arabic-aware lexical ranker
 *   · buildRagContextBlock — the numbered system block + citations
 * DB layer:
 *   · indexLectureKnowledge — (re)index one lecture (transcript +
 *     checkpoints) into AiKnowledgeChunk, idempotent per source
 *   · searchKnowledge — trigram prefilter → JS re-score → top hits
 */
import type { PrismaClient } from '@prisma/client';
import { normalizeArabicSearch } from '../search/normalize.js';

// ─── Captions → windows ───────────────────────────────────────────

export interface TranscriptCue {
  startSec: number;
  endSec: number;
  text: string;
}

/** 00:00:14,200 (SRT) or 00:00:14.200 (VTT) → seconds. */
export function parseTimestamp(raw: string): number | null {
  const m = /^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/.exec(raw.trim());
  if (m === null) return null;
  const [, h, min, s, ms] = m;
  return Number(h) * 3600 + Number(min) * 60 + Number(s) + Number(ms) / 1000;
}

/** seconds → «الدقيقة 14:20» (minutes carried past 60 honestly). */
export function formatMinSec(totalSec: number): string {
  const clamped = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `الدقيقة ${m}:${String(s).padStart(2, '0')}`;
}

/**
 * SRT/VTT → cues. Handles both timestamp grammars, strips the WEBVTT
 * header / NOTE blocks / cue identifiers, and joins multi-line cue
 * text. A cue with an unparsable timestamp is skipped (a malformed
 * caption must not kill the whole index pass).
 */
export function parseSrtVtt(text: string): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  const blocks = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) continue;
    if (/^WEBVTT/i.test(lines[0]!) && lines.length === 1) continue;
    const timeLineIndex = lines.findIndex((l) => l.includes('-->'));
    if (timeLineIndex === -1) continue;
    const [fromRaw, toRaw] = lines[timeLineIndex]!.split('-->');
    const startSec = parseTimestamp(fromRaw ?? '');
    let endSec = parseTimestamp(toRaw?.split(/\s+/).filter(Boolean)[0] ?? '');
    if (startSec === null || endSec === null) continue;
    if (endSec <= startSec) endSec = startSec + 1;
    const body = lines
      .slice(timeLineIndex + 1)
      .join(' ')
      // VTT inline markup (position tags, speaker tags) — strip the
      // angle-bracket forms; plain text is all the index wants.
      .replace(/<[^>]+>/g, '')
      .trim();
    if (body === '') continue;
    cues.push({ startSec, endSec, text: body });
  }
  return cues;
}

/**
 * Merge cues into ~`windowSec` caption windows — one chunk per window
 * (retrieval granularity), each carrying its own timestamp locator.
 */
export function groupTranscriptWindows(cues: readonly TranscriptCue[], windowSec = 60): TranscriptCue[] {
  const windows: TranscriptCue[] = [];
  let current: { startSec: number; endSec: number; parts: string[] } | null = null;
  for (const cue of cues) {
    if (current === null || cue.startSec - current.startSec >= windowSec) {
      if (current !== null) {
        windows.push({ startSec: current.startSec, endSec: current.endSec, text: current.parts.join(' ') });
      }
      current = { startSec: cue.startSec, endSec: cue.endSec, parts: [cue.text] };
    } else {
      current.endSec = Math.max(current.endSec, cue.endSec);
      current.parts.push(cue.text);
    }
  }
  if (current !== null) {
    windows.push({ startSec: current.startSec, endSec: current.endSec, text: current.parts.join(' ') });
  }
  return windows;
}

// ─── Chunking ─────────────────────────────────────────────────────

/**
 * Split prose into ≤ `maxChars` chunks on paragraph then sentence
 * boundaries (Arabic sentence enders included). A single over-long
 * sentence is hard-split — a 2000-char monster must never become one
 * un-indexable chunk.
 */
export function chunkText(text: string, maxChars = 600): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean === '') return [];
  const pieces = clean.split(/(?<=[.!?؟])\s+/);
  const chunks: string[] = [];
  let buffer = '';
  const flush = () => {
    if (buffer.trim() !== '') chunks.push(buffer.trim());
    buffer = '';
  };
  for (const sentence of pieces) {
    const piece = sentence.trim();
    if (piece === '') continue;
    if (piece.length > maxChars) {
      flush();
      // hard-split the monster sentence — bounded chunks always win
      for (let i = 0; i < piece.length; i += maxChars) {
        chunks.push(piece.slice(i, i + maxChars));
      }
      continue;
    }
    if (buffer.length + piece.length + 1 > maxChars) flush();
    buffer += (buffer === '' ? '' : ' ') + piece;
  }
  flush();
  return chunks;
}

// ─── Lexical scoring (Arabic-aware) ───────────────────────────────

export interface KnowledgeHitRow {
  id: string;
  sourceType: string;
  sourceId: string;
  title: string;
  locator: string | null;
  url: string | null;
  content: string;
}

export interface ScoredKnowledgeHit extends KnowledgeHitRow {
  score: number;
}

const TOKEN_SPLIT = /[\s,،.؛:!?()«»"'\-_/]+/;

/**
 * The ranker: normalized token overlap between the question and the
 * chunk (title+body), with a substring bonus for partial matches the
 * tokenization misses. Tokens under 3 chars are noise (Arabic
 * prepositions) and never match.
 */
export function scoreKnowledgeHits(query: string, rows: readonly KnowledgeHitRow[], limit = 6): ScoredKnowledgeHit[] {
  const qTokens = normalizeArabicSearch(query)
    .split(TOKEN_SPLIT)
    .filter((t) => t.length >= 3);
  if (qTokens.length === 0) return [];
  const qSet = new Set(qTokens);
  const scored = rows.map((row) => {
    const hNormalized = normalizeArabicSearch(`${row.title} ${row.content}`);
    const hSet = new Set(hNormalized.split(TOKEN_SPLIT).filter((t) => t.length >= 3));
    let overlap = 0;
    for (const t of qSet) if (hSet.has(t)) overlap += 1;
    const substringBonus = qTokens.some((t) => hNormalized.includes(t)) ? 0.5 : 0;
    return { ...row, score: overlap / qTokens.length + substringBonus };
  });
  return scored
    .filter((h) => h.score >= 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ─── The system block + citations ─────────────────────────────────

export interface KnowledgeCitation {
  index: number;
  title: string;
  locator: string | null;
  url: string | null;
  snippet: string;
}

/** A hit row + its chunk body → the citation the UI renders. */
export function toCitation(index: number, hit: KnowledgeHitRow): KnowledgeCitation {
  return {
    index,
    title: hit.title,
    locator: hit.locator,
    url: hit.url,
    snippet: hit.content.length > 160 ? `${hit.content.slice(0, 160)}…` : hit.content,
  };
}

const CITATION_HEADER = 'السياق من مقرراتك (استند إليه إن كان ذا صلة، واذكر المصدر بصيغة «المصدر: [رقم]» عندما تستند إليه):';

/**
 * The numbered context block appended to the system prompt when the
 * retrieval found anything. Kept compact (bounded chars) so free-tier
 * context windows survive it.
 */
export function buildRagContextBlock(hits: readonly ScoredKnowledgeHit[], maxTotalChars = 1800): { block: string; citations: KnowledgeCitation[] } {
  if (hits.length === 0) return { block: '', citations: [] };
  const lines: string[] = [CITATION_HEADER];
  const citations: KnowledgeCitation[] = [];
  let total = CITATION_HEADER.length;
  for (let i = 0; i < hits.length; i += 1) {
    const hit = hits[i]!;
    const cite = toCitation(i + 1, hit);
    const line = `[${cite.index}] ${cite.title}${cite.locator ? ` · ${cite.locator}` : ''}: ${cite.snippet}`;
    if (total + line.length > maxTotalChars) break;
    total += line.length;
    lines.push(line);
    citations.push(cite);
  }
  return { block: lines.join('\n'), citations };
}

/**
 * The honest empty-result rule: when nothing relevant was found the
 * caller must TELL the model to answer generally and label it — never
 * to pretend the course said something it did not.
 */
export const RAG_UNGROUNDED_NOTE =
  'لم يُعثر على مقطع ذي صلة في مواد المقرر لهذا السؤال — أجب من معرفتك العامة ووضّح للطالب أن الإجابة ليست من مواد المقرر.';

// ─── DB layer ─────────────────────────────────────────────────────

type PrismaLike = Pick<PrismaClient, 'aiKnowledgeChunk' | '$queryRaw'>;

/**
 * (Re)index ONE lecture's transcript windows into AiKnowledgeChunk.
 * Idempotent per source: the lecture's previous 'lecture' chunks are
 * deleted first (delete+recreate — bounded by one lecture's size).
 * `deepLinkBase` (when provided) turns a window into a player deep
 * link (`${base}?lecture=<id>&t=<sec>`).
 */
export async function indexLectureTranscript(
  prisma: PrismaLike,
  institutionId: string,
  lecture: { id: string; title: string },
  transcriptText: string,
  deepLinkBase?: string,
): Promise<number> {
  const cues = parseSrtVtt(transcriptText);
  const windows = groupTranscriptWindows(cues);
  const rows = windows.map((w) => ({
    institutionId,
    sourceType: 'lecture',
    sourceId: lecture.id,
    title: lecture.title,
    locator: formatMinSec(w.startSec),
    url: deepLinkBase ? `${deepLinkBase}?lecture=${lecture.id}&t=${Math.floor(w.startSec)}` : null,
    content: w.text,
  }));
  await prisma.aiKnowledgeChunk.deleteMany({ where: { sourceType: 'lecture', sourceId: lecture.id } });
  if (rows.length > 0) await prisma.aiKnowledgeChunk.createMany({ data: rows });
  return rows.length;
}

/**
 * The chat-side retrieval: trigram prefilter in Postgres (bounded
 * candidates over the GIN index) → Arabic-aware re-score in JS → top
 * hits. The raw query and the normalized query BOTH prefilter (the
 * stored text is as-written; folding happens only in the ranker), so
 * a hamza/diacritic mismatch still finds its chunk.
 */
export async function searchKnowledge(
  prisma: PrismaLike,
  institutionId: string,
  query: string,
  limit = 6,
): Promise<ScoredKnowledgeHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  const candidates = await prisma.$queryRaw<KnowledgeHitRow[]>`
    SELECT id, "sourceType" AS "sourceType", "sourceId" AS "sourceId",
           title, locator, url, content
    FROM "AiKnowledgeChunk"
    WHERE "institutionId" = ${institutionId}
      AND ("content" % ${trimmed} OR "content" ILIKE ${'%' + trimmed.slice(0, 60) + '%'})
    ORDER BY GREATEST(similarity("content", ${trimmed}), 0)
    LIMIT 60`;
  if (candidates.length === 0) return [];
  return scoreKnowledgeHits(trimmed, candidates, limit);
}
