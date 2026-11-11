/**
 * r307 — the landing media layer contract (master/D3 rewrite).
 *
 * The R307 documentary media layer (university photography, cards and
 * official-channel videos) is RETIRED by the master consolidation
 * mission: Madarek is an independent, institution-neutral platform.
 * This sheet now pins BOTH directions:
 *   · the GENERIC media that remains (product captures + r342
 *     illustrations) still agrees with the manifest and the bytes on
 *     disk — every derivative the srcset promises actually ships;
 *   · the curated university section CANNOT come back: no manifest registers,
 *     no card geometry sources, no mobile twins, no embed surfaces, no
 *     YouTube CSP holes, no /campus route, and the landing statement
 *     crawl is OUR OWN capability register — never external
 *     institutions;
 *   · the CSP is tightened to self-only embeds;
 *   · the funnel counts survive untouched (the 5+5 contract stays
 *     pinned by landing-funnel.test.tsx — this sheet pins that the
 *     media changes added ZERO new auth links).
 *
 * Pure fs checks — the landing-funnel convention.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');
const stripLineComments = (src: string) => src.replace(/^\s*\/\/.*$/gm, '');

/* P2-0 (r335 split): the product band moved to sections/Product.tsx —
 * the product-block extraction below reads its new home. */
const productTsx = read('src/components/landing/sections/Product.tsx');
/* R331 split: the guest surface = LandingPage + chrome/SheetNav + hero/Hero.
 * P2-0 (r335 split): + the nine section bands (same surface, new layout). */
const surfaceTsx = [
  'src/pages/LandingPage.tsx',
  'src/components/landing/chrome/SheetNav.tsx',
  'src/components/landing/hero/Hero.tsx',
  'src/components/landing/sections/Hero.tsx',
  'src/components/landing/sections/Statement.tsx',
  'src/components/landing/sections/Live.tsx',
  'src/components/landing/sections/Chapters.tsx',
  'src/components/landing/sections/Product.tsx',
  'src/components/landing/sections/Why.tsx',
  'src/components/landing/sections/Roles.tsx',
  'src/components/landing/sections/Vision.tsx',
  'src/components/landing/sections/Footer.tsx',
].map(read).join('\n');
const liveTsx = stripLineComments(stripComments(surfaceTsx));
const manifest = JSON.parse(read('public/media/manifest.json')) as {
  products: Array<{ id: string; derivativeWidths: number[] }>;
  illustrations: { items: Array<{ id: string; assets: { light: string; dark: string } }> };
};

describe('r307 — the generic media registry agrees with the manifest and the bytes', () => {
  it('every manifest product capture ships every promised derivative', () => {
    for (const prod of manifest.products) {
      for (const w of prod.derivativeWidths) {
        const file = `public/media/product/${prod.id}-${w}.webp`;
        expect(existsSync(path.join(root, file)), `${file} missing`).toBe(true);
      }
    }
  });

  it('the mobile illustration twin rides the ONE shared register', () => {
    const illusTwin = read('../apps/mobile/src/media/illustrations.generated.ts');
    for (const it of manifest.illustrations.items) {
      expect(illusTwin, `the mobile illustration register carries ${it.id}`).toContain(`"${it.id}"`);
      expect(illusTwin, `${it.id} light twin path`).toContain(it.assets.light);
      expect(illusTwin, `${it.id} dark twin path`).toContain(it.assets.dark);
    }
  });
});

describe('r307/master — the curated university section is retired and cannot return', () => {
  it('the manifest carries no curated registers (no videos[], no cards[], no photos[])', () => {
    const m = JSON.parse(read('public/media/manifest.json'));
    expect(m.videos, 'the videos[] register is deleted').toBeUndefined();
    expect(m.cards, 'the cards[] register is deleted').toBeUndefined();
    expect(m.photos, 'the photos[] register is deleted').toBeUndefined();
  });

  it('the card geometry sources + generators are deleted', () => {
    expect(existsSync(path.join(root, '../shared/media/university-cards.ts'))).toBe(false);
    expect(existsSync(path.join(root, '../apps/mobile/src/media/university-cards.generated.ts'))).toBe(false);
    expect(existsSync(path.join(root, '../scripts/media/sync-university-cards.mjs'))).toBe(false);
    expect(existsSync(path.join(root, 'public/media/universities')), 'the retired photo dir stays deleted').toBe(false);
  });

  it('no embed surface remains in the frontend source', () => {
    for (const gone of [
      'src/components/landing/VideoCard.tsx',
      'src/components/landing/MediaFrame.tsx',
      'src/components/landing/journey/InkSketch.tsx',
      'src/components/illustrations/UniversityCard.tsx',
      'src/pages/campus/CampusPages.tsx',
      'src/data/university-media.ts',
    ]) {
      expect(existsSync(path.join(root, gone)), `${gone} is retired`).toBe(false);
    }
    expect(liveTsx).not.toContain('youtube-nocookie.com');
    expect(liveTsx).not.toContain('i.ytimg.com');
    expect(liveTsx).not.toContain("to=\"/campus\"");
    expect(liveTsx).not.toContain("href=\"/campus\"");
  });

  it('the /campus route is retired from the app shell', () => {
    const appTsx = read('src/App.tsx');
    expect(appTsx).not.toContain('path="/campus"');
    expect(appTsx).not.toContain("import('./pages/campus/CampusPages')");
  });

  it('the statement crawl is OUR OWN capability register — no external institutions', () => {
    const statementTsx = read('src/components/landing/sections/Statement.tsx');
    expect(statementTsx, 'the capability register is the crawl source').toContain('CAPABILITY_REGISTER');
    /* R349 U4 — the banned names are READ from the shared single source
     * (scripts/qa/identity-banned.json — the same list identity-guard.mjs
     * enforces): this file spells none of them. */
    const BANNED = JSON.parse(
      readFileSync(
        path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../scripts/qa/identity-banned.json'),
        'utf8',
      ),
    ) as { universities: string[]; fragments: string[] };
    for (const banned of [...BANNED.universities, ...BANNED.fragments]) {
      expect(statementTsx, `${banned} must not appear in the statement`).not.toContain(banned);
    }
  });

  it('the retired curated CSS families stay deleted', () => {
    const patternsCss = read('src/styles/patterns.css');
    for (const fam of ['.mf-', '.um-', '.vc-', '.vd-', '.inkm-']) {
      expect(patternsCss, `${fam} family is retired`).not.toContain(fam);
    }
    expect(existsSync(path.join(root, 'src/styles/campus-media.css'))).toBe(false);
  });
});

describe('r307 — the CSP is tightened with the embeds gone', () => {
  it('frame-src is self-only — the YouTube holes are closed', () => {
    const app = read('../backend/src/app.ts');
    const m = app.match(/'frame-src':\s*\[([\s\S]*?)\],/);
    expect(m, 'frame-src directive present').toBeTruthy();
    const body = m?.[1] ?? '';
    expect(body).toContain("'self'");
    expect(body).not.toContain('youtube');
  });

  it('img-src stays self-only — no remote image hosts were added', () => {
    const app = read('../backend/src/app.ts');
    const m = app.match(/'img-src':\s*\[([^\]]*)\],/);
    const imgSrc = m?.[1] ?? '';
    expect(imgSrc).toContain("'self'");
    expect(imgSrc).toContain('data:');
    expect(imgSrc).toContain('blob:');
    expect(imgSrc).not.toMatch(/https?:\/\//);
  });
});

describe('r307 — the media changes added ZERO new funnel links', () => {
  it('the 5+5 register/login counts survive untouched (R347 D4: login 5 — the header-bar login retired, the hero secondary stays)', () => {
    expect((liveTsx.match(/to="\/auth\/register"/g) ?? []).length).toBe(5);
    expect((liveTsx.match(/to="\/auth"/g) ?? []).length).toBe(5); /* R347 D4: the header-bar login retired; the hero secondary is the fold's ONE login */
  });

  it('the new sections route to anchors and app routes only', () => {
    /* master/D3: the /campus sub-page is retired with the curated section —
     * the landing keeps #product + #cta anchors. */
    for (const id of ['product', 'cta']) {
      expect(liveTsx).toContain(`id="${id}"`);
    }
    // the product CTA scrolls to the conversion row — never an auth link
    // (R313: the section ends at the why-section now.  r324 X3: the CTA
    //  rides the section's row-2 .pr-note line — a direct href="#cta"
    //  anchor, still never an auth route.)
    const productAt = productTsx.indexOf('id="product"');
    const productBlock = stripComments(productTsx.slice(productAt, productTsx.indexOf('className="wy-section"')));
    expect(productBlock).toContain('href="#cta"');
    expect(productBlock).not.toMatch(/to="\/auth/);
    expect(productBlock).not.toMatch(/href="\/auth/);
  });
});
