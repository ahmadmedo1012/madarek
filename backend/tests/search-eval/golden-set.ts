/**
 * R350 S4 — the golden set: programmatic query generation over the
 * corpus (the honest ≥250 — every query carries a real expected id,
 * no hand-typed padding). Shapes:
 *
 *   exact     — the entity's title, verbatim (Recall@1 must be ~1)
 *   prefix    — the title's first word (prefix tier)
 *   substring — a mid-word fragment (substring tier)
 *   al        — ال-prefixed query against a non-ال title
 *   diacritic — diacritics/tatweel sprinkled onto the query
 *   hamza     — أ/إ/آ variants swapped for plain ا in the query
 *   teh       — ة↔ه swapped
 *   maqsura   — ى↔ي swapped
 *   digits    — course codes typed with Eastern-Arabic digits
 *   english   — the English haystack arms
 *   clitic    — و/ب/ل+ال-prefixed queries
 */
import { CORPUS, type CorpusEntity } from './corpus.js';

export interface GoldenQuery {
  shape: string;
  q: string;
  /** the expected entity id — must appear in the top-k */
  expectedId: string;
}

const sprinkle = (s: string): string =>
  s.split(' ').map((w, i) => (i % 2 === 0 ? `${w[0] ?? ''}\u064B${w.slice(1)}` : w)).join(' ');

function queriesFor(e: CorpusEntity, out: GoldenQuery[]): void {
  const t = e.title;
  out.push({ shape: 'exact', q: t, expectedId: e.id });
  out.push({ shape: 'prefix', q: t.split(' ')[0]!, expectedId: e.id });
  const words = t.split(' ').filter((w) => w.length >= 4);
  if (words.length > 0) {
    const w = words[words.length - 1]!;
    out.push({ shape: 'substring', q: w.slice(1, -1), expectedId: e.id });
  }
  if (!t.startsWith('ال') && !t.includes(' ')) {
    out.push({ shape: 'al', q: `ال${t}`, expectedId: e.id });
  }
  if (/[\u0600-\u06FF]/.test(t)) {
    out.push({ shape: 'diacritic', q: sprinkle(t), expectedId: e.id });
    out.push({ shape: 'hamza', q: t.replace(/ا/g, 'أ'), expectedId: e.id });
    if (t.includes('ة')) out.push({ shape: 'teh', q: t.replace(/ة/g, 'ه'), expectedId: e.id });
    if (t.includes('ي')) out.push({ shape: 'maqsura', q: t.replace(/ي/g, 'ى'), expectedId: e.id });
    out.push({ shape: 'clitic', q: `و${t.startsWith('ال') ? t : `ال${t}`}`, expectedId: e.id });
  }
  const english = e.haystacks.find((h) => /^[A-Za-z]/.test(h));
  if (english !== undefined) {
    out.push({ shape: 'english', q: english, expectedId: e.id });
    out.push({ shape: 'english-lower', q: english.toLowerCase(), expectedId: e.id });
  }
  const code = e.haystacks.find((h) => /^[A-Z]{2,}\d/.test(h));
  if (code !== undefined) {
    const eastern = code.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!);
    out.push({ shape: 'digits', q: eastern, expectedId: e.id });
  }
}

export function buildGoldenSet(): GoldenQuery[] {
  const out: GoldenQuery[] = [];
  for (const e of CORPUS) queriesFor(e, out);
  return out;
}
