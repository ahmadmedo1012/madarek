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
import { existsSync, readFileSync, statSync } from 'node:fs';
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
    expect(urls.length).toBe(12);
    for (const u of urls) {
      const file = path.join(root, 'public', u.replace(/^\//, ''));
      expect(existsSync(file), `${u} missing from public/fonts`).toBe(true);
    }
  });

  it('all font faces use font-display: swap', () => {
    const css = stripComments(read('src/styles/fonts.css'));
    const faces = css.match(/@font-face\s*\{/g)?.length ?? 0;
    expect(faces).toBe(12);
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

describe('hero image optimization (perf fix: 2 MB PNG)', () => {
  it('the 2 MB PNG is gone; WebP + JPEG replacements exist', () => {
    expect(existsSync(path.join(root, 'public/main_photo.png'))).toBe(false);
    const webp = statSync(path.join(root, 'public/main_photo.webp'));
    const jpg = statSync(path.join(root, 'public/main_photo.jpg'));
    // budget: 250 KB for the primary format (came in at ~100 KB)
    expect(webp.size).toBeGreaterThan(0);
    expect(webp.size).toBeLessThan(250 * 1024);
    expect(jpg.size).toBeGreaterThan(0);
    expect(jpg.size).toBeLessThan(400 * 1024);
  });

  it('LandingPage renders the <picture> art with intrinsic dimensions', () => {
    const src = read('src/pages/LandingPage.tsx');
    expect(src).toContain('<picture>');
    expect(src).toContain('srcSet="/main_photo.webp"');
    expect(src).toContain('src="/main_photo.jpg"');
    expect(src).toMatch(/width=\{1377\}/);
    expect(src).toMatch(/height=\{768\}/);
    expect(src).toContain('loading="lazy"');
    expect(src).toContain('decoding="async"');
  });

  it('no source file references the deleted PNG anymore', () => {
    const landing = read('src/pages/LandingPage.tsx');
    expect(landing).not.toContain('main_photo.png');
  });
});

describe('theme-color metas match the real canvas tokens', () => {
  it('dark meta = #191918, light meta = #FBFAF9 (tokens.css --bg)', () => {
    const html = read('index.html');
    expect(html).toContain('<meta name="theme-color" content="#191918" media="(prefers-color-scheme: dark)"');
    expect(html).toContain('<meta name="theme-color" content="#FBFAF9" media="(prefers-color-scheme: light)"');
  });
});
