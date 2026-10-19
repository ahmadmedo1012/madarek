/**
 * Static asset & loading-performance guards (WS-F5).
 *
 * These lock in the fixes that are invisible to component tests:
 *  - self-hosted IBM Plex fonts (no render-blocking Google Fonts <link>)
 *  - every @font-face url resolves to a real file in public/fonts
 *  - hero art is an optimized <picture> (WebP ≤ 250 KB), not the old
 *    2 MB PNG
 *  - theme-color metas match the real canvas tokens
 *
 * Pure fs assertions — no jsdom interaction needed.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
/** Drop /* … *‌/ comment blocks so header prose can't skew counts. */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('self-hosted fonts (perf fix: render-blocking Google Fonts)', () => {
  it('index.html has no Google Fonts request chain', () => {
    const html = read('index.html');
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
  });

  it('index.html preloads the two critical arabic subsets', () => {
    const html = read('index.html');
    expect(html).toContain('rel="preload" href="/fonts/plex-sans-arabic-400-normal-arabic.woff2"');
    expect(html).toContain('rel="preload" href="/fonts/plex-sans-arabic-700-normal-arabic.woff2"');
    // both preloads must be CORS-mode font fetches
    expect(html.match(/as="font" type="font\/woff2" crossorigin/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('every @font-face in fonts.css points to an existing woff2 file', () => {
    const css = stripComments(read('src/styles/fonts.css'));
    const urls = [...css.matchAll(/url\('?(\/fonts\/[^)']+\.woff2)'?\)/g)].map((m) => m[1]!);
    // 14 faces — 10 IBM Plex (Sans Arabic 400-700 arabic+latin + Mono
    // ×2) + 4 Alexandria (r191: the Arabic display family is 600/700
    // only — the 500 rungs retired with the wire-weight diet; the two
    // 500-weight landing consumers moved to 600). r190 added the
    // family (500/600/700); Premium-polish PP-X1 deleted the dead Noto
    // Kufi ×6 + Amiri + Rubik; r152j (A7) deleted the dead Serif ×2.
    expect(urls.length).toBe(14);
    for (const u of urls) {
      const file = path.join(root, 'public', u.replace(/^\//, ''));
      expect(existsSync(file), `${u} missing from public/fonts`).toBe(true);
    }
  });

  it('all font faces use font-display: swap', () => {
    const css = stripComments(read('src/styles/fonts.css'));
    const faces = css.match(/@font-face\s*\{/g)?.length ?? 0;
    expect(faces).toBe(14);   // 10 Plex + 4 Alexandria (r191: 600/700 only)
    expect(css.match(/font-display:\s*swap/g)?.length).toBe(faces);
  });

  it('fonts.css is imported before tokens.css in main.tsx', () => {
    const main = read('src/main.tsx');
    const fonts = main.indexOf("import './styles/fonts.css'");
    const tokens = main.indexOf("import './styles/tokens.css'");
    expect(fonts).toBeGreaterThanOrEqual(0);
    expect(tokens).toBeGreaterThanOrEqual(0);
    expect(fonts).toBeLessThan(tokens);
  });
});

describe('r188 brand reset — campus photography retired (no real-university imagery)', () => {
  it('every main_photo campus cut is gone (the whole photo family)', () => {
    // The retired real-university campus imagery (main_photo.{png,jpg,webp}
    // + the 750w/card cuts) stays deleted — the folio landing ships a
    // vector manuscript figure, and no public surface may re-introduce
    // photography of a real campus.
    for (const f of [
      'main_photo.png', 'main_photo.jpg', 'main_photo.webp',
      'main_photo-750.webp', 'main_photo-card.webp',
    ]) {
      expect(existsSync(path.join(root, 'public', f)), `${f} must stay deleted (r188)`).toBe(false);
    }
  });

  it('r190 — landing art is ORIGINAL ABSTRACT (AI-art-directed scenes), never photography of real institutions', () => {
    const src = read('src/pages/LandingPage.tsx');
    expect(src).not.toContain('<picture>');
    expect(src).not.toContain('main_photo');
    // the r188 photography ban's INTENT: no real-university imagery.
    // r190 ships original abstract scenes (hero + media stage) —
    // no identifiable place, person, logo, or text in the art; the
    // real-institution ban is re-pinned on the file inventory:
    expect(src).toContain('hero-scene.webp');
    expect(src).toContain('orbit-ring.webp');
    // …and the r188 provenance strings survive (brand gates below
    // still pin جامعة مدارك التجريبية as synthetic data).
  });

  it('no stylesheet ships a campus photo as a CSS background', () => {
    for (const f of readdirSync(path.join(root, 'src/styles'))) {
      if (!f.endsWith('.css')) continue;
      const css = read(`src/styles/${f}`);
      expect(css, `${f} references retired campus photography`).not.toMatch(
        /url\(['"]?\/main_photo[^)]*\)/,
      );
    }
  });
});

describe('welcome-card background + dead brand assets (audit 11-g P2-3 / P1-4 → r188)', () => {
  it('student welcome card paints token recipes, not photography (r188)', () => {
    // The retired campus-photo overlay is gone with the brand reset —
    // the welcome-card family grounds on accent-soft token recipes.
    const css = read('src/styles/student.css');
    expect(css).not.toContain("url('/main_photo-card.webp')");
    expect(css).not.toContain("url('/main_photo.webp')");
  });

  it('no stylesheet ships the full-res hero as a CSS background', () => {
    // CSS backgrounds cannot do responsive srcset — the 99.6 KB hero must
    // only ever be consumed via the <picture> art on the landing page.
    for (const f of readdirSync(path.join(root, 'src/styles'))) {
      if (!f.endsWith('.css')) continue;
      const css = read(`src/styles/${f}`);
      expect(css, `${f} references the full-res hero as a background`).not.toMatch(
        /url\('\/main_photo\.(webp|jpg)'\)/,
      );
    }
  });

  it('dead brand assets stay deleted; the three referenced keepers remain', () => {
    const dead = [
      'madarek-logo-full.jpg',
      'madarek-logo.jpg',
      'madarek-logo-md.jpg',
      'madarek-logo-sm.jpg',
      'zu-campus.jpg',
      'zu-campus-sm.jpg',
    ];
    for (const f of dead) {
      expect(existsSync(path.join(root, 'public/brand', f)), `${f} should stay deleted`).toBe(false);
    }
    // keepers (r188): og:image/twitter (index.html → madarek-og.jpg) +
    // BrandMark / favicon (madarek-mark.svg). The retired ZU crest
    // (zu-mark.svg) and the old logo sheet (madarek-logo-lg.jpg) joined
    // the dead list — no real-university asset remains on disk.
    for (const f of ['madarek-og.jpg', 'madarek-mark.svg']) {
      expect(existsSync(path.join(root, 'public/brand', f)), `${f} must remain`).toBe(true);
    }
    for (const f of ['zu-mark.svg', 'madarek-logo-lg.jpg']) {
      expect(existsSync(path.join(root, 'public/brand', f)), `${f} must stay deleted (r188 brand reset)`).toBe(false);
    }
  });
});

describe('theme-color metas match the real canvas tokens', () => {
  it('dark meta = #070B16 (fleet ruling R13 — the dark --bg ground), light meta = #FBFAF9 (tokens.css --bg)', () => {
    const html = read('index.html');
    expect(html).toContain('<meta name="theme-color" content="#070B16" media="(prefers-color-scheme: dark)"');
    expect(html).toContain('<meta name="theme-color" content="#FBFAF9" media="(prefers-color-scheme: light)"');
    // the runtime sync script must paint the same dark ground (r133-F7:
    // was #191918 — light-theme ink that matches no dark surface)
    expect(html.match(/['"]#070B16['"]/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(html).not.toContain('#191918');
  });
});
