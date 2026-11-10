/**
 * r307 — the landing media layer contract.
 *
 * The r306 sheet («لوحة مدارك») gained its documentary media layer in
 * R307 (DESIGN.md §6a-6c): Commons-licensed university photography,
 * official-channel documentaries behind click-to-load facades, and
 * real product captures. This sheet pins what interaction tests
 * cannot see cheaply:
 *   · the media registry ↔ the manifest ↔ the bytes on disk agree
 *     (every derivative the srcset promises actually ships);
 *   · every photo carries licence + author + source (attribution is
 *     structural, never an afterthought);
 *   · every video has verified official-channel identity evidence and
 *     NO thumbnail hotlink (img-src stays self-only);
 *   · the CSP admits exactly the two embed hosts and nothing wider;
 *   · the funnel counts survive the media layer untouched (the 5+5
 *     contract stays pinned by landing-funnel.test.tsx — this sheet
 *     pins that the new sections added ZERO new auth links).
 *
 * Pure fs + one rendered-DOM check (the facade mounts no iframe until
 * the visitor asks) — the landing-funnel convention.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { VideoCard } from '../../src/components/landing/VideoCard';
import { MediaFrame } from '../../src/components/landing/MediaFrame';
import { HERO_PHOTOS } from '../../src/data/university-media';
import { universityVideosFixture } from './fixtures/r307-media-fixtures';

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
  videos: Array<{ videoId: string; identityEvidence: string; channelUrl: string }>;
};

beforeAll(() => {
  if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
    class ResizeObserverStub {
      observe(): void { /* no-op */ }
      unobserve(): void { /* no-op */ }
      disconnect(): void { /* no-op */ }
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: ResizeObserverStub,
    });
  }
});

describe('r307 — the media registry agrees with the manifest and the bytes', () => {
  it('R343 — every documented university seat renders an ORIGINAL card (registry parity)', async () => {
    const manifest = JSON.parse(read('public/media/manifest.json'));
    const cardsSrc = read('../shared/media/university-cards.ts');
    for (const c of manifest.cards.items) {
      expect(cardsSrc, `the card ${c.id} must live in the ONE shared geometry source`).toContain(`id: '${c.id}'`);
      expect(c.composition, 'the four original compositions only').toMatch(/^(arcade|courtyard|tower|hall)$/);
    }
    // R345 F — the retired photo derivatives are GONE (the mobile campus
    // ported to the card system; the -800 mobile seats shipped with them)
    expect(existsSync(path.join(root, 'public/media/universities')), 'the retired photo dir is deleted').toBe(false);
  });

  it('every manifest product capture ships every promised derivative', () => {
    for (const prod of manifest.products) {
      for (const w of prod.derivativeWidths) {
        const file = `public/media/product/${prod.id}-${w}.webp`;
        expect(existsSync(path.join(root, file)), `${file} missing`).toBe(true);
      }
    }
  });

  it('R345 — the retired photo register is fully retired (no photos[] in the manifest)', () => {
    const m = JSON.parse(read('public/media/manifest.json'));
    expect(m.photos, 'the photos[] register is deleted with its derivatives').toBeUndefined();
    expect(m.cards.items.length, 'the card register carries the nine documented seats').toBeGreaterThanOrEqual(9);
    const institutions = new Set(m.cards.items.map((c: { id: string }) => c.id));
    expect(institutions.size, 'nine distinct documented seats').toBeGreaterThanOrEqual(9);
  });

  it('R345 — MediaFrame renders the ORIGINAL card seat (no raster img, no license deed)', () => {
    for (const photo of [HERO_PHOTOS[0], HERO_PHOTOS[2]]) {
      const { container } = render(
        <MemoryRouter>
          <MediaFrame photo={photo} variant="hero-lead" />
        </MemoryRouter>,
      );
      const svg = container.querySelector(`svg[data-spec="ucard.${photo.id}"]`);
      expect(svg, `${photo.id} renders its original card`).toBeTruthy();
      expect(container.querySelector('img'), `${photo.id} mounts no raster img`).toBeNull();
      expect(container.querySelector('a[href*="creativecommons.org"]'), `${photo.id} carries no license deed`).toBeNull();
      expect(container.textContent, 'the caption signs the original drawing').toContain('MADAREK · ORIGINAL DRAWING');
    }
  });

  it('R345 — the mobile twins ride the ONE shared source (cards + illustrations, byte-synced)', () => {
    const shared = read('../shared/media/university-cards.ts');
    const twin = read('../apps/mobile/src/media/university-cards.generated.ts');
    expect(twin, 'the mobile card twin embeds the shared geometry verbatim').toContain(shared);
    const manifest = JSON.parse(read('public/media/manifest.json'));
    const illusTwin = read('../apps/mobile/src/media/illustrations.generated.ts');
    for (const it of manifest.illustrations.items) {
      expect(illusTwin, `the mobile illustration register carries ${it.id}`).toContain(`"${it.id}"`);
      expect(illusTwin, `${it.id} light twin path`).toContain(it.assets.light);
      expect(illusTwin, `${it.id} dark twin path`).toContain(it.assets.dark);
    }
  });
});

describe('r307 — the videos are official-channel documentaries, never hotlinked', () => {
  it('every video has identity evidence + a channel URL', () => {
    expect(manifest.videos.length).toBeGreaterThanOrEqual(2);
    for (const v of manifest.videos) {
      expect(v.videoId).toMatch(/^[\w-]{11}$/);
      expect(v.identityEvidence, `${v.videoId} evidence`).toContain('قناة');
      expect(v.channelUrl).toMatch(/^https:\/\/(www\.)?youtube/);
    }
  });

  it('no i.ytimg.com thumbnail hotlink anywhere in the frontend source', () => {
    expect(read('src/pages/LandingPage.tsx')).not.toContain('i.ytimg.com');
    expect(read('src/components/landing/VideoCard.tsx')).not.toContain('i.ytimg.com');
    expect(read('src/data/university-media.ts')).not.toContain('i.ytimg.com');
  });

  it('the facade mounts NO iframe until the visitor clicks (rendered DOM)', () => {
    const { container, getByRole } = render(
      <MemoryRouter>
        <VideoCard video={universityVideosFixture} />
      </MemoryRouter>,
    );
    expect(container.querySelector('iframe')).toBeNull();
    expect(getByRole('button', { name: /شاهد الفيديو/ })).toBeTruthy();
    fireEvent.click(getByRole('button', { name: /شاهد الفيديو/ }));
    const iframe = container.querySelector<HTMLIFrameElement>('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.src).toContain('youtube-nocookie.com/embed/');
    // close returns to the facade (and focus moves back to the trigger)
    fireEvent.click(getByRole('button', { name: 'إغلاق الفيديو' }));
    expect(container.querySelector('iframe')).toBeNull();
  });
});

describe('r307 — the CSP admits exactly the two embed hosts', () => {
  it('frame-src lists youtube-nocookie + youtube and nothing wider', () => {
    const app = read('../backend/src/app.ts');
    const m = app.match(/'frame-src':\s*\[([\s\S]*?)\],/);
    expect(m, 'frame-src directive present').toBeTruthy();
    const body = m?.[1] ?? '';
    expect(body).toContain('youtube-nocookie.com');
    expect(body).toContain('youtube.com');
    expect(body).not.toMatch(/https?:\/\/(?!www\.youtube)(?![^']*'self')/);
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

describe('r307 — the media layer added ZERO new funnel links', () => {
  it('the 5+5 register/login counts survive untouched (R331: login 6 — the hero secondary joined the register)', () => {
    expect((liveTsx.match(/to="\/auth\/register"/g) ?? []).length).toBe(5);
    expect((liveTsx.match(/to="\/auth"/g) ?? []).length).toBe(6);
  });

  it('the new sections route to anchors and app routes only', () => {
    /* R313 override (WP-A1 · D7): the media rail (#campus-life) and the
     * video facades (#videos) moved OFF the landing onto /campus; their
     * ids + licence captions moved WITH the media (checked on the
     * sub-page below). The landing keeps #product + #cta anchors. */
    const campusSrc = read('src/pages/campus/CampusPages.tsx');
    for (const id of ['campus-life', 'videos']) {
      expect(campusSrc, `${id} must live on /campus now`).toContain(id);
    }
    for (const id of ['product', 'cta']) {
      expect(liveTsx).toContain(`id="${id}"`);
    }
    // the product CTA scrolls to the conversion row — never an auth link
    // (R313: the section ends at the why-section now, not #videos.
    //  r324 X3: the CTA rides the section's row-2 .pr-note line —
    //  a direct href="#cta" anchor, still never an auth route.)
    const productAt = productTsx.indexOf('id="product"');
    const productBlock = stripComments(productTsx.slice(productAt, productTsx.indexOf('className="wy-section"')));
    expect(productBlock).toContain('href="#cta"');
    expect(productBlock).not.toMatch(/to="\/auth/);
    expect(productBlock).not.toMatch(/href="\/auth/);
  });
});
