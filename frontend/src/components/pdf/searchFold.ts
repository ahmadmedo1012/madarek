/**
 * searchFold — Arabic-aware folding for the reader's in-document
 * search (PdfViewer), with character provenance.
 *
 * The canonical normalizer lives at
 * backend/src/modules/search/normalize.ts with the platform mirror at
 * frontend/src/lib/search.ts (AGENTS.md §6: any change applies to both
 * sides together). The reader folds with the SAME chain — NFC →
 * lowercase → strip diacritics + tatweel → fold alif/hamza variants →
 * fold ى→ي and ة→ه — but this module keeps a per-character map from
 * the FOLDED string back onto the ORIGINAL text-layer characters, so a
 * normalized match can be painted as a highlight mark over the exact
 * original glyphs (a folded offset alone cannot: folding deletes
 * characters — diacritics, tatweel, standalone hamza).
 *
 * Match semantics follow the search contract's «ال» tolerance: the
 * definite-article prefix is stripped from the QUERY at match time
 * (lib/search.stripAlPrefix), so «الشبكات» finds «شبكات» and
 * «خوارزميات» finds «الخوارزميات». The reader bounds the strip to
 * remainder ≥ 3 letters — unlike the boolean matcher, a count must not
 * degrade a short query («الي») into matching every character.
 */

const ARABIC_DIACRITICS = /[\u064B-\u0653\u0670\u06D6-\u06ED]/;
const TATWEEL = '\u0640';
const ALIF_VARIANTS = /[\u0622\u0623\u0625\u0671]/g; // آ أ إ ٱ
const WAW_HAMZA = /\u0624/g; // ؤ
const YA_HAMZA = /\u0626/g; // ئ
const HAMZA = /\u0621/g; // ء
const ALIF_MAQSURA = /\u0649/g; // ى
const TAA_MARBUTA = /\u0629/g; // ة

/** Per-character fold of the canonical chain. Returns '' when the
 *  character is removed by folding (diacritics, tatweel, standalone
 *  hamza). Single characters never re-compose under NFC, so the
 *  per-char application matches the whole-string normalizer output. */
function foldChar(ch: string): string {
  let c = ch.normalize('NFC').toLowerCase();
  if (c.length !== 1) return c === '' ? '' : c; // defensive: keep multi-unit results
  if (ARABIC_DIACRITICS.test(c) || c === TATWEEL) return '';
  c = c
    .replace(ALIF_VARIANTS, 'ا')
    .replace(WAW_HAMZA, 'و')
    .replace(YA_HAMZA, 'ي')
    .replace(HAMZA, '')
    .replace(ALIF_MAQSURA, 'ي')
    .replace(TAA_MARBUTA, 'ه');
  return c;
}

export interface FoldedText {
  /** The folded string (same chain as lib/search.normalizeArabicSearch). */
  folded: string;
  /** origOf[i] = index in the ORIGINAL string of the character that
   *  produced folded[i]. Aligns folded match ranges back onto the
   *  original text for highlight placement. */
  origOf: number[];
}

export function foldWithIndex(input: string): FoldedText {
  const foldedParts: string[] = [];
  const origOf: number[] = [];
  let orig = 0;
  for (const ch of input) {
    const f = foldChar(ch);
    for (const fc of f) {
      foldedParts.push(fc);
      origOf.push(orig);
    }
    orig += ch.length;
  }
  return { folded: foldedParts.join(''), origOf };
}

/** The reader's match term: the folded query with its leading «ال»
 *  folded away when the remainder is a real word (≥ 3 letters). */
export function matchTerms(words: string[]): string[] {
  return words.map((w) => {
    if (w.startsWith('ال') && w.length >= 5) return w.slice(2);
    return w;
  });
}

/** Non-overlapping match ranges over a FOLDED string, implementing the
 *  search contract's «ال» tolerance honestly: the FULL query form is
 *  matched first (a literal hit), then the bare form covers the rest —
 *  so «الشبكات» marks the whole word in «الشبكات» AND still finds bare
 *  «شبكات», while «شبكات» finds both spellings too. Overlaps are
 *  deduplicated in favor of the full form. */
function matchRanges(folded: string, words: string[]): Array<[number, number]> {
  if (!words.length || words.some((w) => !w)) return [];
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (words.length === 1) {
    const q = words[0]!;
    const bare = matchTerms([q])[0]!;
    const ranges: Array<[number, number]> = [];
    if (bare !== q) {
      let idx = folded.indexOf(q);
      while (idx !== -1) {
        ranges.push([idx, idx + q.length]);
        idx = folded.indexOf(q, idx + q.length);
      }
      idx = folded.indexOf(bare);
      while (idx !== -1) {
        const covered = ranges.some(([rs, re]) => idx >= rs && idx + bare.length <= re);
        if (!covered) ranges.push([idx, idx + bare.length]);
        idx = folded.indexOf(bare, idx + bare.length);
      }
      ranges.sort((a, b) => a[0] - b[0]);
    } else {
      let idx = folded.indexOf(q);
      while (idx !== -1) {
        ranges.push([idx, idx + q.length]);
        idx = folded.indexOf(q, idx + q.length);
      }
    }
    return ranges;
  }

  // Multi-word: every word tolerates the article prefix (full|bare),
  // words may be separated by any whitespace run.
  const pattern = new RegExp(
    words.map((w) => {
      const bare = matchTerms([w])[0]!;
      return bare !== w ? `(?:${esc(w)}|${esc(bare)})` : esc(w);
    }).join('\\s+'),
    'g',
  );
  const ranges: Array<[number, number]> = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(folded)) !== null) {
    ranges.push([m.index, m.index + m[0].length]);
    if (m.index === pattern.lastIndex) pattern.lastIndex += 1; // zero-width guard
  }
  return ranges;
}

/** The pdf.js text item's string contribution — TextItem carries `str`,
 *  TextMarkedContent carries none. Read defensively so the pdf.js union
 *  can flow straight from getTextContent(). */
function itemStr(item: unknown): string {
  if (typeof item !== 'object' || item === null) return '';
  const str = (item as { str?: unknown }).str;
  return typeof str === 'string' ? str : '';
}

export interface PageScan {
  /** Non-overlapping occurrences on the page. */
  count: number;
  /** Original-text context around the first occurrence. */
  snippet: string;
}

/** Scan one page's text items (pdf.js getTextContent) for the folded
 *  query words. Hits are honest per-page OCCURRENCE counts (non-
 *  overlapping), with the search contract's «ال» tolerance applied at
 *  match time. Returns null when nothing matches. */
export function scanPageItems(items: ReadonlyArray<unknown>, words: string[]): PageScan | null {
  if (!words.length || words.some((w) => !w)) return null;

  const folds = items.map((it) => foldWithIndex(itemStr(it)));
  const SEP = ' ';
  // joined = the folded items joined with a single space; map carries
  // each folded index to its position in the joined ORIGINAL string
  // (item strings joined with the same single space).
  let joined = '';
  const map: number[] = [];
  const originalParts: string[] = [];
  let originalLen = 0;
  folds.forEach((f, i) => {
    if (i > 0) {
      joined += SEP;
      originalParts.push(SEP);
      map.push(originalLen); // the separator maps to its own position
      originalLen += 1;
    }
    joined += f.folded;
    for (const o of f.origOf) {
      map.push(originalLen + o);
    }
    const str = itemStr(items[i]);
    originalParts.push(str);
    originalLen += str.length;
  });
  const original = originalParts.join('');

  const ranges = matchRanges(joined, words);
  if (!ranges.length) return null;
  const [firstStart, firstEnd] = ranges[0]!;
  const origStart = map[firstStart] ?? 0;
  const origEnd = map[firstEnd - 1] ?? origStart;
  const snippet = original
    .slice(Math.max(0, origStart - 30), Math.min(original.length, origEnd + 30))
    .replace(/\s+/g, ' ')
    .trim();
  return { count: ranges.length, snippet };
}

/** Match ranges in ORIGINAL-string coordinates for one text run (a
 *  text-layer span). Returns [start, end) pairs, non-overlapping,
 *  ascending — ready for <mark> wrapping. */
export function findFoldedRanges(text: string, words: string[]): Array<[number, number]> {
  if (!words.length || words.some((w) => !w)) return [];
  const { folded, origOf } = foldWithIndex(text);
  const ranges: Array<[number, number]> = [];
  for (const [s, e] of matchRanges(folded, words)) {
    const start = origOf[s];
    const end = origOf[e - 1];
    if (start !== undefined && end !== undefined) ranges.push([start, end + 1]);
  }
  return ranges;
}

/** Paint the search marks onto a rendered text layer: previous marks
 *  are unwrapped first (idempotent), then every plain text run that
 *  carries a match gets its matched slice wrapped in
 *  `mark.r305pdf-hitmark` (–`--current` when this page holds the
 *  active hit). Runs containing elements (line breaks, earlier marks)
 *  after the unwrap are still safe: unwrap runs first, then scan.
 *  Degradation is honest — a match inside a run pdf.js rendered with
 *  child elements simply stays unmarked; navigation/counting are
 *  unaffected (they live in the walk). */
export function applySearchMarks(layer: HTMLElement, words: string[], current: boolean): void {
  layer.querySelectorAll('mark.r305pdf-hitmark').forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      mark.remove();
      parent.normalize();
    }
  });
  if (!words.length) return;

  layer.querySelectorAll('span').forEach((span) => {
    if (span.closest('mark')) return;
    if (span.querySelector('mark, br, span')) return;
    const text = span.textContent ?? '';
    if (!text) return;
    const ranges = findFoldedRanges(text, words);
    if (!ranges.length) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const [s, e] of ranges) {
      if (s < cursor || e > text.length) continue;
      if (s > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, s)));
      const mark = document.createElement('mark');
      mark.className = 'r305pdf-hitmark' + (current ? ' r305pdf-hitmark--current' : '');
      mark.textContent = text.slice(s, e);
      frag.appendChild(mark);
      cursor = e;
    }
    if (!frag.childNodes.length) return;
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    span.textContent = '';
    span.appendChild(frag);
  });
}
