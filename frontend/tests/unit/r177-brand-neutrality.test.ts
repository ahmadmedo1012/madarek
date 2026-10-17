/**
 * r177 (Phase 1 — brand neutrality) public-copy pins.
 *
 * Madarek presents itself as an INDEPENDENT educational platform. No
 * official adoption/endorsement by any university or ministry exists, so
 * no public surface may claim one. The University of Zawia records remain
 * — as explicitly labeled SHOWCASE data (مؤسّسة العرض) — never as the
 * platform's identity.
 *
 * Pure fs pins on the public identity surfaces: index.html meta/OG/JSON-LD,
 * the landing/auth copy, the document-title bases, and the package
 * description. These lock the neutral wording against regression exactly
 * the way assets.test.ts pins static-asset truths.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); // frontend/
const repoRoot = path.resolve(root, '..'); // monorepo root
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const readRepo = (p: string) => readFileSync(path.join(repoRoot, p), 'utf8');

/** Affiliation-claim markers that must never reappear in public copy. */
const OFFICIAL_CLAIMS = [
  'المنصّة الرسمية',
  'المنصة الرسمية',
  'وزارة التعليم العالي والبحث العلمي',
  'رسمية لجامعة',
] as const;

describe('r177 — public metadata is platform-neutral (index.html)', () => {
  const html = read('index.html');

  it('title and description carry the independent platform identity', () => {
    expect(html).toContain('<title>مدارك · منصّة التعليم الذكي</title>');
    expect(html).toContain('منصّة تعليم ذكي مستقلّة');
  });

  it('OG / Twitter cards describe Madarek, not a university', () => {
    expect(html).toContain('<meta property="og:site_name" content="مدارك — منصّة التعليم الذكي" />');
    expect(html).not.toMatch(/og:(site_name|title)" content="[^"]*جامعة الزاوية/);
    expect(html).not.toMatch(/twitter:title" content="[^"]*جامعة الزاوية/);
  });

  it('JSON-LD site node is Madarek; the university survives as showcase data under about', () => {
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(ld).not.toBeNull();
    const data = JSON.parse(ld![1]!);
    expect(data['@type']).toBe('WebSite');
    expect(data['name']).toBe('مدارك');
    // no official-affiliation claim anywhere in the structured data
    const flat = JSON.stringify(data);
    for (const claim of OFFICIAL_CLAIMS) {
      expect(flat).not.toContain(claim);
    }
    // the showcase institution keeps its full public record (25 colleges)
    expect(data['about']['@type']).toBe('EducationalOrganization');
    expect(data['about']['name']).toBe('جامعة الزاوية');
    expect(data['about']['department']).toHaveLength(25);
    expect(data['about']['description']).toContain('المؤسّسة المرجعية للعرض');
  });

  it('no ministry/official claim remains in any meta line', () => {
    for (const claim of OFFICIAL_CLAIMS) {
      expect(html).not.toContain(claim);
    }
  });
});

describe('r177 — landing/auth copy is affiliation-free', () => {
  it('landing presents the independent identity and labels showcase data', () => {
    const landing = read('src/pages/LandingPage.tsx');
    for (const claim of OFFICIAL_CLAIMS) {
      // comments document the OLD wording on purpose — strip them first
      const code = landing.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      expect(code, `landing still carries: ${claim}`).not.toContain(claim);
    }
    expect(landing).toContain('مستقلّة');
    expect(landing).toContain('مؤسّسة العرض: جامعة الزاوية');
    // brand subtitle is a product descriptor, not a university
    expect(landing.match(/landing-brand-sub">\s*([^<\s])/g)?.length ?? 0).toBe(2);
    expect(landing).not.toMatch(/landing-brand-sub">\s*جامعة الزاوية/);
    expect(landing.match(/landing-brand-sub">\s*منصّة التعليم الذكي/g)?.length).toBe(2);
    // the copyright is the platform's alone
    expect(landing).toContain('© {year} مدارك</span>');
  });

  it('auth pages carry the platform identity, no ministry strip', () => {
    for (const f of ['src/pages/AuthPage.tsx', 'src/pages/RegisterPage.tsx']) {
      const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      for (const claim of OFFICIAL_CLAIMS) {
        expect(src, `${f} still carries: ${claim}`).not.toContain(claim);
      }
      expect(src).toContain('منصّة تعليم ذكي مستقلّة');
    }
  });

  it('document-title bases drop the university co-branding (kept in sync)', () => {
    const shell = read('src/components/layout/AppShell.tsx');
    const colleges = read('src/pages/colleges/CollegePages.tsx');
    expect(shell).toContain("const DOC_TITLE_BASE = 'مدارك · منصّة التعليم الذكي'");
    expect(colleges).toContain("const GUEST_TITLE_BASE = 'مدارك · منصّة التعليم الذكي'");
  });
});

describe('r177 — root manifests describe the independent platform', () => {
  it('package.json name + description are Madarek-branded', () => {
    const pkg = JSON.parse(readRepo('package.json'));
    expect(pkg['name']).toBe('madarek');
    expect(pkg['description']).toContain('مستقلّة');
    expect(pkg['description']).not.toContain('جامعة الزاوية');
  });

  it('README headers claim independence, not university ownership', () => {
    const readme = readRepo('README.md');
    const readmeEn = readRepo('README.en.md');
    expect(readme).toContain('# مدارك — منصّة التعليم الذكي');
    expect(readme).toContain('مستقلّة');
    expect(readmeEn).toContain('# Madarek — Smart Learning Platform');
    expect(readmeEn).toContain('**independent** smart-learning platform');
    for (const claim of ['الرسمية لجامعة', 'official smart-learning platform of']) {
      expect(readme).not.toContain(claim);
      expect(readmeEn).not.toContain(claim);
    }
  });
});
