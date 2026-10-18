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
 *
 * r183 (Wave B — brand-identity closure): the r177 sweep was copy-deep
 * but legal-surface/asset/issuer shallow. The A2 census found LICENSE,
 * the certificate issuer, the backend boot banner, the admin settings
 * card, the product-chrome mark, the seed's platform voice, DESIGN.md's
 * identity line and docs/PROJECT-REFERENCE.md still speaking ZU. The
 * r183 block below pins every one of those closed surfaces too.
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

describe('r182 — the docs center intro stays affiliation-free', () => {
  /* docs/README.md escaped the r177 sweep: its intro still said
   * «منصة التعلم الذكية لجامعة الزاوية» while the brand audit
   * (brand-audit-and-changes.md) documents it as already fixed.
   * Pin the corrected wording so the docs index can never drift
   * back into university co-branding. */
  it('docs/README.md presents Madarek as the independent platform with Zawia as showcase', () => {
    const docsIndex = readRepo('docs/README.md');
    expect(docsIndex).toContain('منصّة تعليم');
    expect(docsIndex).toContain('مستقلّة');
    expect(docsIndex).toContain('مؤسّسة العرض المرجعية');
    expect(docsIndex).not.toContain('منصة التعلم الذكية\nلجامعة الزاوية');
    expect(docsIndex).not.toMatch(/مشروع \*\*مدارك\*\* — منصة[^\n]*جامعة الزاوية/);
  });
});

describe('r183 — brand-identity closure (the surfaces r177 missed)', () => {
  /* The A2 census (r183 Wave A) found the drift r177 left behind on the
   * non-copy surfaces: the LICENSE legal paragraph, the certificate
   * issuer, the backend boot banner, the auth error voice, the admin
   * settings card, the product-chrome mark + favicon, DESIGN.md's
   * identity line, docs/PROJECT-REFERENCE.md, the legacy planning docs,
   * and the seed's platform voice. Zawia survives — legitimately — as
   * showcase DATA; what these pins forbid is ZU AS the platform's
   * identity ever coming back. */

  it('LICENSE states the independent platform + showcase-data disclosure (grant intact)', () => {
    const license = readRepo('LICENSE');
    expect(license).toContain(
      'Madarek is an independent smart-learning platform developed by Ahmad Medo',
    );
    expect(license).toContain('showcase/reference data, not affiliation');
    expect(license).not.toContain('developed and deployed for University of Zawia');
    // the proprietary grant itself must stay untouched
    expect(license).toContain('no right to\ndeploy, modify, or redistribute is granted');
  });

  it('docs/PROJECT-REFERENCE.md is affiliation-free and mirrors the real license', () => {
    const ref = readRepo('docs/PROJECT-REFERENCE.md');
    expect(ref).not.toContain('ZU Smart Learning Platform');
    expect(ref).not.toContain('Ministry of Higher Education');
    expect(ref).not.toContain('Internal — University of Zawia');
    expect(ref).toContain('مستقلّة');
    expect(ref).toContain('showcase/reference data');
    expect(ref).toContain('Proprietary');
  });

  it('DESIGN.md header describes the independent platform; canon doc-accuracy stays true', () => {
    const design = readRepo('DESIGN.md');
    expect(design).toContain('منصّة تعليم ذكي مستقلّة عربية-أولًا · the design canon as it ships in code');
    expect(design).not.toContain('منصة التعليم الذكي لجامعة الزاوية');
    // A3 read-verified doc accuracy: CI census, spinner arc reality, polish header name
    expect(design).toContain(
      '9 jobs: lint · typecheck · build · frontend tests · backend tests · db-integration · e2e · design gates',
    );
    expect(design).not.toContain('7 jobs:');
    expect(design).toContain('top arc neutral-900 (light) / accent (dark)');
    expect(design).toContain('Polish Bundle (consolidated v6 → v21)');
    expect(design).not.toContain('Layer-hygiene');
  });

  it('backend boot banner and certificate issuer are the platform name, not ZU', () => {
    const index = readRepo('backend/src/index.ts');
    expect(index).toContain('Madarek Platform API listening');
    expect(index).not.toContain('ZU Platform API');
    const training = readRepo('backend/src/http/routes/training.routes.ts');
    expect(training).toContain("issuer: 'منصّة مدارك التعليميّة'");
    expect(training).not.toContain('منصة جامعة الزاوية للتعليم الذكي');
  });

  it('backend auth errors address platform administration, not university administration', () => {
    const auth = readRepo('backend/src/modules/auth/auth.service.ts');
    expect(auth).not.toContain('إدارة الجامعة');
    expect(auth.match(/إدارة المنصّة/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('admin settings card names the platform consistently (no self-contradicting rows)', () => {
    const admin = read('src/pages/admin/AdminExtraPages.tsx');
    expect(admin).toContain('مدارك — منصّة التعليم الذكي');
    expect(admin).not.toContain('منصّة الزاوية للتعليم الذكيّ');
  });

  it('the product chrome renders the Madarek mark; the favicon is the neutral mark', () => {
    const brand = read('src/components/BrandMark.tsx');
    expect(brand).toContain('src="/brand/madarek-mark.svg"');
    // the src attribute alone — the doc comment may cite zu-mark.svg as
    // showcase-data provenance (the file stays on disk, assets.test.ts keeps it)
    expect(brand).not.toContain('src="/brand/zu-mark.svg"');
    const favicon = read('public/favicon.svg');
    // derived from the madarek shield mark palette — NOT the ZU crest palette
    expect(favicon).toContain('#2952C8');
    expect(favicon).not.toContain('#0E3F6C');
    expect(favicon).not.toContain('#3FB6C9');
  });

  it('the four legacy planning docs open with a superseded banner', () => {
    for (const f of [
      'docs/archive/Madarek_PRD_v2.md',
      'docs/archive/PROJECT_OVERVIEW.md',
      'docs/archive/ARCHITECTURE.md',
      'docs/archive/DOCUMENTATION.md',
    ]) {
      const doc = readRepo(f);
      expect(doc.startsWith('> **[توثيق تاريخي — Historical record (superseded)]**'), `${f} lost its superseded banner`).toBe(true);
      expect(
        doc.includes('independent Arabic-first smart-learning platform') || doc.includes('مستقلّة عربية-أولًا'),
        `${f} banner must state the independent-platform truth`,
      ).toBe(true);
      expect(
        doc.includes('showcase/reference data') || doc.includes('بيانات عرض مرجعية'),
        `${f} banner must label the Zawia records as showcase data`,
      ).toBe(true);
    }
  });

  it('seed.ts platform voice is affiliation-free (r183 lead fix, pinned here)', () => {
    /* KNOWN-PENDING at r183-B2 time: the lead's parallel seed.ts rewrite
     * (A2 census: ministry-collaboration announcement, old platform
     * names in track/lesson/vision/MCQ/competition copy) lands with this
     * wave — this pin is red until it does, by design. The showcase
     * institution NAME (جامعة الزاوية as data rows) is legitimate and
     * NOT pinned here; what is pinned is the platform speaking in the
     * university's voice. */
    const seed = readRepo('backend/prisma/seed.ts');
    expect(seed).not.toContain('منصة جامعة الزاوية للتعليم الذكي');
    expect(seed).not.toContain('منصة الزاوية');
    expect(seed).not.toContain('منصّة الزاوية');
    expect(seed).not.toContain('بالتعاون مع وزارة التعليم العالي');
  });
});
