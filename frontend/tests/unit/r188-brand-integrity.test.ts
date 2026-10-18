/**
 * r188 — BRAND-INTEGRITY GATE.
 *
 * The R188 brand reset removed the real University of Zawia identity
 * from every ACTIVE product surface, replacing it with the explicitly
 * fictional demonstration tenant (جامعة مدارك التجريبية). This gate
 * fails loudly if that identity — or any real-university imagery or
 * claim — re-appears where users can see it.
 *
 * Scope rules (deliberate — the gate distinguishes ACTIVE identity
 * from LEGITIMATE history):
 *   · SCANNED (active surfaces): the landing/auth/register/colleges/
 *     university pages + shared components + data modules + styles +
 *     index.html + public/ assets + backend routes/lib/seed — with
 *     COMMENTS STRIPPED first (source comments documenting the r188
 *     retirement are history, not identity).
 *   · NOT SCANNED (legitimate history): CHANGELOG.md, docs/**,
 *     audits/**, specs/**, prisma/migrations/** (applied history),
 *     tests/** (fixtures quoting the retired strings on purpose),
 *     README demo-account history notes.
 *   · ALLOWLISTED strings: the legacy fixed institution id
 *     `inst-zawia-showcase` (an internal FK anchor whose string never
 *     renders to users — documented in seed.ts) and the zu-sync module
 *     path comment.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// the REPO root (frontend/tests/unit → three levels up) — the gate scans
// BOTH workspaces, so a frontend-relative root would vacuously pass.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** The retired real-university identity strings, active-surface-banned. */
const BANNED = [
  'جامعة الزاوية',
  'University of Zawia',
  'مؤسّسة العرض المرجعية', // the r177 showcase framing (superseded by the r188 fictional tenant)
  'zu.edu.ly', // the real university's domain (demo emails moved to demo.madarek.ly)
  'main_photo', // the retired real-campus photography family
  'zu-mark', // the retired ZU crest asset
];

/** Internal anchors that never render to users (documented legacy). */
const ALLOW = ['inst-zawia-showcase'];

/** Recursively collect files with the given extensions under dir.
 * __tests__ directories are skipped: backend test fixtures quote the
 * retired strings on purpose (search-normalization corpora) — they are
 * legitimate test history, not active product identity. */
function collect(dir: string, exts: string[], out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      collect(full, exts, out);
    } else if (exts.some((e) => entry.endsWith(e))) out.push(full);
  }
  return out;
}

const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments (CSS/TS)
    .replace(/\/\/[^\n]*/g, '') // line comments (TS)
    .replace(/<!--[\s\S]*?-->/g, ''); // HTML comments

function scan(relDir: string, exts: string[]): string[] {
  const violations: string[] = [];
  for (const file of collect(path.join(root, relDir), exts)) {
    const rel = path.relative(root, file);
    const live = stripComments(readFileSync(file, 'utf8'));
    for (const banned of BANNED) {
      let idx = live.indexOf(banned);
      while (idx !== -1) {
        // allowlist: the legacy internal id only, exactly spelled
        const context = live.slice(Math.max(0, idx - 40), idx + banned.length + 20);
        const isAllowed = ALLOW.some((a) => context.includes(a));
        if (!isAllowed) {
          violations.push(`${rel}: «${banned}»`);
          break;
        }
        idx = live.indexOf(banned, idx + 1);
      }
    }
  }
  return violations;
}

describe('r188 — brand-integrity gate (active surfaces stay Zawia-free)', () => {
  it('frontend active code: pages/components/data/styles carry no university identity', () => {
    const violations = [
      ...scan('frontend/src/pages', ['.tsx', '.ts']),
      ...scan('frontend/src/components', ['.tsx', '.ts']),
      ...scan('frontend/src/data', ['.ts']),
      ...scan('frontend/src/styles', ['.css']),
      ...scan('frontend/src/lib', ['.ts']),
    ];
    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('index.html + public assets: metadata and brand files carry no university identity', () => {
    const html = stripComments(readFileSync(path.join(root, 'frontend/index.html'), 'utf8'));
    for (const banned of BANNED) {
      expect(html, `index.html carries «${banned}»`).not.toContain(banned);
    }
    // the retired crest/campus assets stay deleted
    expect(existsSync(path.join(root, 'frontend/public/brand/zu-mark.svg'))).toBe(false);
    expect(existsSync(path.join(root, 'frontend/public/main_photo.jpg'))).toBe(false);
    expect(existsSync(path.join(root, 'frontend/public/main_photo.webp'))).toBe(false);
  });

  it('backend active code: routes/lib/seed carry no university identity in executable strings', () => {
    const violations = [
      ...scan('backend/src', ['.ts']),
      ...scan('backend/prisma', ['.ts']),
    ];
    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('the fictional demonstration tenant IS the public sample-data story', () => {
    // positive pins: the new identity exists where users see it.
    const seed = readFileSync(path.join(root, 'backend/prisma/seed.ts'), 'utf8');
    expect(seed).toContain("slug: 'madarek-demo'");
    expect(seed).toContain("name: 'جامعة مدارك التجريبية'");
    const landing = readFileSync(path.join(root, 'frontend/src/pages/LandingPage.tsx'), 'utf8');
    expect(landing).toContain('جامعة مدارك التجريبية');
    expect(landing).toContain('اصطناعية بالكامل');
  });

  it('regression: the old Zawia landing behaviors would FAIL this gate', () => {
    // Simulated string set from the pre-r188 landing (hero eyebrow +
    // campus caption + footer note) — proves each banned string would
    // have been caught, so the gate cannot silently rot.
    const preR188Landing = [
      'مؤسّسة العرض: جامعة الزاوية · 25 كلية · 1988',
      'ZAWIYA · 1988',
      'مؤسّسة العرض المرجعية على منصّة مدارك — مؤسّسة تعليميّة حكوميّة',
      'بيانات جامعة الزاوية الظاهرة في المنصّة بيانات عرض مرجعية',
      'student@zu.edu.ly',
    ].join('\n');
    const hits = BANNED.filter((b) => preR188Landing.includes(b));
    expect(hits).toEqual(['جامعة الزاوية', 'مؤسّسة العرض المرجعية', 'zu.edu.ly']);
  });
});
