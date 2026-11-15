/**
 * R350 S4 + r353-F — the golden set: programmatic query generation over
 * the corpus (the honest ≥250 — every query carries a real expected id,
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
 *
 * r353-F — the REALISTIC registrar shapes (the old set was
 * wrong-shaped: zero phone, zero student-number, zero email, zero
 * typo, zero Arabic-Indic-digit queries — it could never have caught
 * the reverse-fold fetch gap):
 *
 *   keyboard            — the plain Libyan keyboard form of a hamza/ة
 *                         title («اسامه العبار» for «أسامة العبار» —
 *                         the multi-seat reverse-fold case)
 *   hamza-reverse       — hamza seats flattened in the QUERY while the
 *                         STORED title carries them (the bug-1 direction)
 *   al-reverse          — the ال stripped from an ال-leading title
 *   multiword-reversed  — the name typed in the other order
 *                         («المهدي محمد» for «محمد المهدي»)
 *   student-number      — the full universityId (Latin, hyphenated)
 *   student-number-tail — the numeric tail only («00001»)
 *   student-number-lc   — lowercase id (uz-2024-00001)
 *   student-number-ar   — Arabic-Indic digits (UZ-٢٠٢٤-٠٠٠٠١)
 *   phone-trunk         — the Libyan trunk form (0912…)
 *   phone-intl          — +218…
 *   phone-ar            — Arabic-Indic digits (٠٩١…)
 *   email               — the full address
 *   email-local         — the local part only
 *   typo-transpose      — adjacent letters swapped (1 edit)
 *   typo-sub            — one letter substituted (1 edit)
 *   typo-insert         — one letter doubled (1 edit)
 *   typo-delete         — one letter dropped (1 edit)
 */
import { CORPUS, type CorpusEntity } from './corpus.js';

export interface GoldenQuery {
  shape: string;
  q: string;
  /** the expected entity id — must appear in the top-k */
  expectedId: string;
}

/**
 * The typo / fetch shapes the FETCH stage intentionally does not cover:
 * the SQL fetch is a contains scan — a letter-level typo query cannot
 * substring-match its target, and fuzzy SQL (trigram similarity) is a
 * documented non-goal of this pass. The rank stage still answers them
 * (typoHit) for candidates that reach the window through any other
 * arm. The fetch-recall gate skips exactly these shapes.
 */
export const FETCH_EXEMPT_SHAPES: readonly string[] = [
  'typo-transpose',
  'typo-sub',
  'typo-insert',
  'typo-delete',
];

const sprinkle = (s: string): string =>
  s.split(' ').map((w, i) => (i % 2 === 0 ? `${w[0] ?? ''}\u064B${w.slice(1)}` : w)).join(' ');

/** Arabic → Arabic-Indic digits (٠-٩). */
const toEasternDigits = (s: string): string =>
  s.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!);

/** The plain Libyan keyboard form: hamza seats → ا, ة → ه (what a user
 * types when the keyboard has no hamza/ta-marbuta keys). */
const plainKeyboard = (s: string): string => s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');

/** One deterministic 1-edit typo of a word (never the word itself). */
function transpose(word: string): string {
  if (word.length < 4) return word;
  return `${word[0]}${word[2]}${word[1]}${word.slice(3)}`;
}
function substitute(word: string): string {
  const letters = 'بجدرسصطعفقكلمنهوي';
  if (word.length < 4) return word;
  const at = Math.floor(word.length / 2);
  return `${word.slice(0, at)}${letters[at % letters.length]!}${word.slice(at + 1)}`;
}
function insertDouble(word: string): string {
  if (word.length < 4) return word;
  const at = Math.floor(word.length / 2);
  return `${word.slice(0, at)}${word[at]}${word.slice(at)}`;
}
function deleteOne(word: string): string {
  if (word.length < 5) return word;
  const at = Math.floor(word.length / 2);
  return `${word.slice(0, at)}${word.slice(at + 1)}`;
}

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
  if (t.startsWith('ال')) {
    out.push({ shape: 'al-reverse', q: t.slice(2), expectedId: e.id });
  }
  if (/[\u0600-\u06FF]/.test(t)) {
    out.push({ shape: 'diacritic', q: sprinkle(t), expectedId: e.id });
    out.push({ shape: 'hamza', q: t.replace(/ا/g, 'أ'), expectedId: e.id });
    out.push({ shape: 'hamza-reverse', q: t.replace(/[أإآ]/g, 'ا'), expectedId: e.id });
    if (t.includes('ة')) out.push({ shape: 'teh', q: t.replace(/ة/g, 'ه'), expectedId: e.id });
    if (t.includes('ي')) out.push({ shape: 'maqsura', q: t.replace(/ي/g, 'ى'), expectedId: e.id });
    out.push({ shape: 'clitic', q: `و${t.startsWith('ال') ? t : `ال${t}`}`, expectedId: e.id });
    // r353-F: the plain-keyboard form (ALL fold classes at once — the
    // multi-seat reverse-fold case «اسامه» for «أسامة»).
    const kb = plainKeyboard(t);
    if (kb !== t) out.push({ shape: 'keyboard', q: kb, expectedId: e.id });
    // r353-F: 1-edit typos on the first 4+ letter word.
    const typoWord = t.split(' ').find((w) => w.length >= 4);
    if (typoWord) {
      const variants: Array<[string, (w: string) => string]> = [
        ['typo-transpose', transpose],
        ['typo-sub', substitute],
        ['typo-insert', insertDouble],
        ['typo-delete', deleteOne],
      ];
      for (const [shape, fn] of variants) {
        const typoed = fn(typoWord);
        if (typoed !== typoWord) {
          out.push({ shape, q: t.replace(typoWord, typoed), expectedId: e.id });
        }
      }
    }
  }
  // r353-F: multiword order freedom («المهدي محمد» for «محمد المهدي»).
  const titleWords = t.split(' ').filter(Boolean);
  if (titleWords.length >= 2) {
    out.push({ shape: 'multiword-reversed', q: [...titleWords].reverse().join(' '), expectedId: e.id });
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
  // r353-F: the registrar's identifier lookups.
  if (e.universityId !== undefined) {
    out.push({ shape: 'student-number', q: e.universityId, expectedId: e.id });
    const tail = /\d+$/.exec(e.universityId)?.[0] ?? e.universityId;
    out.push({ shape: 'student-number-tail', q: tail.slice(-5), expectedId: e.id });
    out.push({ shape: 'student-number-lc', q: e.universityId.toLowerCase(), expectedId: e.id });
    out.push({ shape: 'student-number-ar', q: toEasternDigits(e.universityId), expectedId: e.id });
  }
  if (e.studentPhoneNormalized !== undefined || e.guardianPhoneNormalized !== undefined) {
    const digits = (e.studentPhoneNormalized ?? e.guardianPhoneNormalized)!;
    // The trunk form: 0 + the 9-digit Libyan NSN.
    const trunk = `0${digits.slice(3)}`;
    out.push({ shape: 'phone-trunk', q: trunk, expectedId: e.id });
    out.push({ shape: 'phone-intl', q: `+${digits}`, expectedId: e.id });
    out.push({ shape: 'phone-ar', q: toEasternDigits(trunk), expectedId: e.id });
  }
  if (e.email !== undefined) {
    out.push({ shape: 'email', q: e.email, expectedId: e.id });
    out.push({ shape: 'email-local', q: e.email.split('@')[0]!, expectedId: e.id });
    out.push({ shape: 'email-upper', q: e.email.toUpperCase(), expectedId: e.id });
  }
}

export function buildGoldenSet(): GoldenQuery[] {
  const out: GoldenQuery[] = [];
  for (const e of CORPUS) queriesFor(e, out);
  return out;
}
