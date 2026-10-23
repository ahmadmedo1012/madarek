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
import { universityVideosFixture } from './fixtures/r307-media-fixtures';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');
const stripLineComments = (src: string) => src.replace(/^\s*\/\/.*$/gm, '');

const tsx = read('src/pages/LandingPage.tsx');
const liveTsx = stripLineComments(stripComments(tsx));
const manifest = JSON.parse(read('public/media/manifest.json')) as {
  photos: Array<{ id: string; derivativeWidths: number[]; source: { license: string; licenseUrl: string | null; author: string } }>;
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
  it('every manifest photo ships every promised derivative', () => {
    for (const photo of manifest.photos) {
      for (const w of photo.derivativeWidths) {
        const file = `public/media/universities/${photo.id}-${w}.webp`;
        expect(existsSync(path.join(root, file)), `${file} missing`).toBe(true);
      }
    }
  });

  it('every manifest product capture ships every promised derivative', () => {
    for (const prod of manifest.products) {
      for (const w of prod.derivativeWidths) {
        const file = `public/media/product/${prod.id}-${w}.webp`;
        expect(existsSync(path.join(root, file)), `${file} missing`).toBe(true);
      }
    }
  });

  it('every photo carries licence + author + source — attribution is structural', () => {
    expect(manifest.photos.length).toBeGreaterThanOrEqual(8);
    const institutions = new Set(manifest.photos.map((p) => (p as unknown as { institution: string }).institution));
    expect(institutions.size).toBeGreaterThanOrEqual(3);
    for (const photo of manifest.photos) {
      expect(photo.source.license, `${photo.id} licence`).toMatch(/Public domain|CC BY/);
      expect(photo.source.author, `${photo.id} author`).toBeTruthy();
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
  it('the 5+5 register/login counts survive untouched', () => {
    expect((liveTsx.match(/to="\/auth\/register"/g) ?? []).length).toBe(5);
    expect((liveTsx.match(/to="\/auth"/g) ?? []).length).toBe(5);
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
    // (R313: the section ends at the why-section now, not #videos)
    const productAt = tsx.indexOf('id="product"');
    const productBlock = stripComments(tsx.slice(productAt, tsx.indexOf('className="wy-section"')));
    expect(productBlock).toContain('ctaTo="#cta"');
    expect(productBlock).not.toMatch(/to="\/auth/);
  });
});
