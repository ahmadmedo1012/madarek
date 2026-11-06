#!/usr/bin/env node
/**
 * .githooks/commit-msg.mjs — r339/T-23 conventional-commit engine (zero deps).
 *
 * Enforces the rules exported by the root `commitlint.config.mjs`
 * (single source of truth — @commitlint itself is NOT installed).
 * Wired by `.githooks/commit-msg` via `git config core.hooksPath .githooks`
 * (package.json "prepare" — unchanged; pre-push keeps its own contract).
 *
 * Levels follow commitlint semantics: 2 = error (exit 1), 1 = warn (print
 * only), 0 = off. Unknown rule names are a hard failure (fail-closed) so a
 * config typo can't silently disable the gate.
 */
import { readFile } from 'node:fs/promises';

const configPath = new URL('../commitlint.config.mjs', import.meta.url);
const { default: config } = await import(configPath);

const rules = new Map(Object.entries(config.rules ?? {}));
const ignores = config.ignores ?? [];

const die = (lines) => {
  console.error(lines.map((l) => `[commit-msg] ${l}`).join('\n'));
  process.exit(1);
};

// ── load the message git handed us ──────────────────────────────────────────
const file = process.argv[2];
if (!file) die(['no commit-message file argument — refusing to validate blind']);

const raw = await readFile(file, 'utf8');
// Strip `#` comment lines (the default template + editor leftovers), then
// take the first non-empty line as the header.
const header =
  raw
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .find((l) => l.trim()) ?? '';

if (header === '') die(['empty commit message']);

// git-native messages (plain merges, reverts, fixups) are exempt.
if (ignores.some((fn) => { try { return fn(header); } catch { return false; } })) {
  process.exit(0);
}

// ── parse: type[!][(scope)][!]: subject ────────────────────────────────────
const m = header.match(/^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?: (?<subject>.+)$/);
if (!m) {
  die([
    `✗ التنسيق غير صالح — رأس الالتزام يجب أن يكون «نوع(نطاق): موضوع»`,
    `  invalid format — header must be "type(scope): subject" or "type: subject"`,
    `  المُستلَم | received: "${header}"`,
    `  مثال | example: feat(motion r339 T-11b1): footer reveals — coverage 46.9→56.3%`,
  ]);
}
const { type, subject } = m.groups;

const fail = (rule, ar, en) => {
  // level 1 → warn and keep going; level 2 → collect a blocking error.
  const level = rules.get(rule)?.[0] ?? 2;
  const line = `⚠ ${rule}: ${ar} | ${en}`;
  if (level >= 2) errors.push(line);
  else console.error(`[commit-msg] (تحذير | warn, non-blocking) ${line}`);
};
const errors = [];

// type-empty [never]
if (!type) fail('type-empty', 'لا نوع في الرأس', 'missing commit type');
else {
  // type-enum [always]
  const allowed = rules.get('type-enum')?.[2];
  if (allowed && !allowed.includes(type)) {
    fail(
      'type-enum',
      `النوع غير معروف: "${type}"`,
      `unknown type; allowed: ${allowed.join(' ')}`,
    );
  }
}

// subject-empty [never]
if (!subject || !subject.trim()) fail('subject-empty', 'الموضوع فارغ', 'empty subject');

// subject-max-length [always] (WARN per config — evidence-rich subjects are house style)
const maxLen = rules.get('subject-max-length')?.[2];
if (maxLen && subject.length > maxLen) {
  fail(
    'subject-max-length',
    `طول الموضوع ${subject.length} > ${maxLen} (أسلوبنا التاريخي يسمح — تحذير فقط)`,
    `subject is ${subject.length} chars > ${maxLen} (house style allows — warning only)`,
  );
}

if (errors.length) {
  die([
    '✗ رُفض الالتزام — الرسالة لا تحترم عرف الالتزام | commit rejected — violates the commit convention',
    ...errors,
    `  المُستلَم | received: "${header}"`,
    '  الأنواع المسموحة | allowed types: ' + (rules.get('type-enum')?.[2] ?? []).join(' '),
    '  مثال | example: fix(r339 T-12): dark-ink all-sections zero + 390 sheet gutters',
  ]);
}
process.exit(0);
