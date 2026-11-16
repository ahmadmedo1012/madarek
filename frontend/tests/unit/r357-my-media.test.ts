/**
 * r357 L2 — MyMedia's pure conversion helper (client WebP): the canvas
 * re-encode, the downscale, and the honest fallbacks. jsdom has no
 * canvas rasterizer, so the canvas is INJECTED (the helper takes a
 * factory) and createImageBitmap is stubbed per case.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { convertToWebP, PHOTO_MAX_BYTES, PHOTO_MAX_EDGE } from '../../src/components/student/MyMedia';

const fakeCanvas = (toBlobResult: Blob | null) => {
  const draws: Array<[number, number]> = [];
  return {
    canvas: {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: (_b: unknown, x: number, y: number) => draws.push([x, y]) }),
      toBlob: (cb: (b: Blob | null) => void) => cb(toBlobResult),
    } as unknown as HTMLCanvasElement,
    draws,
  };
};

describe('r357 L2 · convertToWebP (client-side photo conversion)', () => {
  const bitmap = (w: number, h: number) => ({ width: w, height: h, close: vi.fn() });

  beforeEach(() => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap(1600, 900)));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('re-encodes through the canvas: webp blob, ≤640px long edge, draw once', async () => {
    const webp = new Blob([new Uint8Array([1])], { type: 'image/webp' });
    const { canvas, draws } = fakeCanvas(webp);
    const file = new File([new Uint8Array(9)], 'p.jpg', { type: 'image/jpeg' });
    const out = await convertToWebP(file, () => canvas);
    expect(out.contentType).toBe('image/webp');
    expect(out.blob).toBe(webp);
    // 1600×900 → scale 640/1600 = 0.4 → 640×360
    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(360);
    expect(draws).toHaveLength(1);
  });

  it('a small image never scales UP (scale caps at 1)', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap(300, 200)));
    const webp = new Blob([new Uint8Array(1)], { type: 'image/webp' });
    const { canvas } = fakeCanvas(webp);
    const file = new File([new Uint8Array(4)], 's.png', { type: 'image/png' });
    await convertToWebP(file, () => canvas);
    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(200);
  });

  it('canvas cannot re-encode (null blob) → the ORIGINAL bytes pass through', async () => {
    const { canvas } = fakeCanvas(null);
    const file = new File([new Uint8Array(4)], 'orig.png', { type: 'image/png' });
    const out = await convertToWebP(file, () => canvas);
    expect(out.blob).toBe(file);
    expect(out.contentType).toBe('image/png');
  });

  it('no canvas factory at all (headless guard) → passthrough, never a crash', async () => {
    const file = new File([new Uint8Array(4)], 'x.webp', { type: 'image/webp' });
    const out = await convertToWebP(file, () => null);
    expect(out.blob).toBe(file);
    expect(out.contentType).toBe('image/webp');
  });

  it('bitmap decode fails → the original file within the byte ceiling', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new TypeError('nope'); }));
    const file = new File([new Uint8Array(4)], 'y.png', { type: 'image/png' });
    const out = await convertToWebP(file, () => null);
    expect(out.blob).toBe(file);
    expect(out.contentType).toBe('image/png');
  });

  it('the ceilings are the backend contract (2 MB, 640px)', () => {
    expect(PHOTO_MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(PHOTO_MAX_EDGE).toBe(640);
  });
});
