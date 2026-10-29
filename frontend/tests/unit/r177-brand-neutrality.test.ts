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
    // r191: ذكي → ذكية (the rejected provenance slogan removed)
    expect(html).toContain('منصّة تعليم ذكية مستقلّة');
  });

  it('OG / Twitter cards describe Madarek, not a university', () => {
    expect(html).toContain('<meta property="og:site_name" content="مدارك — منصّة التعليم الذكي" />');
    expect(html).not.toMatch(/og:(site_name|title)" content="[^"]*جامعة الزاوية/);
    expect(html).not.toMatch(/twitter:title" content="[^"]*جامعة الزاوية/);
  });

  it('r188 — JSON-LD site node is Madarek ALONE: no `about` university node exists at all', () => {
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
    // r188: the retired real-university `about` node is GONE — the only
    // demo-data mention is the fictional tenant, inside the description.
    expect(data['about']).toBeUndefined();
    expect(data['description']).toContain('جامعة مدارك التجريبية');
    expect(data['description']).toContain('اصطناعية');
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
    // r188: the only sample-data story is the FICTIONAL demo tenant,
    // stated in the independence manifesto with its synthetic label.
    expect(landing).toContain('جامعة مدارك التجريبية');
    expect(landing).toContain('اصطناعية بالكامل');
    expect(landing).not.toContain('جامعة الزاوية');
    // brand subtitle is a product descriptor, not a university
    // R315 override (K-B): the desktop header's logo cell is the
    // reference's measured mark+wordmark seat — the tagline stack is
    // retired from the masthead; the descriptor lives on in the footer
    // brand block (exactly one seat on the sheet) + <title>/meta.
    expect(landing.match(/fo-brand-sub">\s*([^<\s])/g)?.length ?? 0).toBe(1);
    expect(landing).not.toMatch(/fo-brand-sub">\s*جامعة الزاوية/);
    expect(landing.match(/fo-brand-sub">\s*منصّة التعليم الذكي/g)?.length).toBe(1);
    // the copyright is the platform's alone
    // r193: the year renders in WESTERN digits — the platform's one
    // numeral convention (formatNum ar-LY→latn); the r191 Arabic-Indic
    // AR() helper was the drift and is gone.
    expect(landing).toContain('© {year} مدارك</span>');
  });

  it('auth pages carry the platform identity, no ministry strip', () => {
    for (const f of ['src/pages/AuthPage.tsx', 'src/pages/RegisterPage.tsx']) {
      const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      for (const claim of OFFICIAL_CLAIMS) {
        expect(src, `${f} still carries: ${claim}`).not.toContain(claim);
      }
      // r191: the auth identity strip (rejected slogan removed).
      expect(src).toContain('منصّة تعليم ذكية مستقلّة');
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
  it('docs/README.md presents Madarek as the independent platform with the fictional demo tenant', () => {
    const docsIndex = readRepo('docs/README.md');
    expect(docsIndex).toContain('منصّة تعليم');
    expect(docsIndex).toContain('مستقلّة');
    // r188: the demo tenant is the fictional «جامعة مدارك التجريبية» —
    // synthetic data, never a real-university showcase framing.
    expect(docsIndex).toContain('جامعة مدارك التجريبية');
    expect(docsIndex).toContain('اصطناعية');
    expect(docsIndex).not.toContain('مؤسّسة العرض المرجعية');
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
    // R323 override (A1 integration): the BrandMark primitive is RETIRED
    // (deleted with StarMark.tsx) — the chrome now draws the ONE brand
    // system <Logo variant="mark"> from frontend/src/brand/. The chrome
    // contract rides the Sidebar + HydrationSplash seats.
    const sidebar = read('src/components/layout/Sidebar.tsx');
    expect(sidebar).toContain("import { Logo } from '../../brand'");
    expect(sidebar).toContain('<Logo variant="mark"');
    const splash = read('src/components/HydrationSplash.tsx');
    expect(splash).toContain("import { Logo } from '../brand'");
    expect(splash).toContain('<Logo variant="mark"');
    const favicon = read('public/favicon.svg');
    // r188: the mark is the khatam star (copper→gold) — the retired
    // blue/violet shield gradient and the ZU crest colors are gone.
    // derived from the madarek shield mark palette — NOT the ZU crest palette
    // R323 override: A1 replaced the copper→gold ramp with the paper/ink/orange
    // system — the favicon is now hairline ink + one solid orange point
    // (#FA3600); copper/gold hexes are BANNED from the favicon (r323-brand-system
    // gate (c) pins this too). The r188 copper assertions are inverted, not deleted.
    expect(favicon).toContain('#282828');
    expect(favicon).toContain('#FA3600');
    expect(favicon).not.toContain('#B57438');
    expect(favicon).not.toContain('#E9B44C');
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
