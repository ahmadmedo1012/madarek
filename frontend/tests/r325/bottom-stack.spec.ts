/**
 * bottom-stack.spec.ts — Y6 (R325) — the BOTTOM-STACK overlap probe.
 *
 * The owner's demand (defect Y6): the consent bar must NOT overlap
 * sticky CTAs, toasts, or the FAB — and neither may any of those
 * overlap EACH OTHER. This spec drives the REAL rendered app and
 * asserts pairwise `getBoundingClientRect()` intersections are EMPTY
 * for every FIXED bottom-anchored layer present on the probed screen:
 *
 *   · the landing (guest): [.cb-banner] + [.toast-stack] — the consent
 *     gate owns the bottom seat and the toast stack must sit ABOVE it;
 *   · the authenticated shell (STUDENT): [.toast-stack] + [.fb-fab] +
 *     [.bottom-nav] (the phone's sticky dock) — toasts rise above the
 *     dock, the FAB rises above toasts;
 *   · the drop paths: accepting the consent eases the stack back to
 *     the natural seats; dismissing a toast drops the FAB cleanly.
 *
 * "Any sticky CTA" is DISCOVERED, not hardcoded: every interactive
 * `position: fixed | sticky` element whose box lives in the viewport's
 * bottom band joins the pairwise set (see discoverBottomBandChrome). What
 * deliberately does NOT join: IN-FLOW CTAs — a transient toast passing
 * over the hero button for its ~3.5s life is the platform-wide
 * snackbar contract (Material's own guidance); the Y6 defect is FIXED
 * chrome colliding with FIXED chrome, and pinning toast-vs-flow would
 * demand re-flowing the page on every transient toast.
 *
 * Probe widths: 320 (the mission floor) · 390 · 1440 · 1920, both
 * themes on the landing (the gate's home); the shell probes the
 * toast/FAB/dock triangle at 390 + 1440.
 *
 * The coordination itself is lib/bottomStack.ts (the bottom-stack
 * manager): every layer reads `bottom: calc(var(--app-bottom-stack) +
 * <own seat>)`, the manager measures the real boxes through a
 * ResizeObserver, and the 200ms ease is pinned here via computed
 * transition checks.
 *
 * HOW TO RUN
 * ──────────
 *   cd frontend && npx playwright test --project=r325
 *   # against an already-running dev server:
 *   MADAREK_E2E_BASE_URL=http://localhost:5206 npx playwright test --project=r325
 *
 * EVIDENCE (opt-in — a plain run never writes): R325_EVIDENCE=before|after
 * captures the overlap states at 390 and 1440 into
 * audits/evidence/r325/y6/<mode>/ (the r305 no-dirty-tree rule).
 *
 * The hermetic fixture (../e2e/fixtures/e2e) seeds the guest/STUDENT
 * session + the mock transport, so no backend is needed. Toasts are
 * raised through the REAL store the REAL ToastStack renders — the spec
 * dynamic-imports /src/lib/toast.ts (the exact module URL the app
 * graph uses, so it is the SAME zustand instance in the dev server).
 */
import { expect, test } from '../e2e/fixtures/e2e';
import type { Page } from '@playwright/test';

/* ── evidence plumbing ─────────────────────────────────────────────── */

const EVIDENCE_MODE = process.env.R325_EVIDENCE; // 'before' | 'after' | undefined

function evidencePath(name: string): string | undefined {
  if (!EVIDENCE_MODE) return undefined;
  // playwright runs from frontend/ — the audits tree is the repo root's.
  return `../audits/evidence/r325/y6/${EVIDENCE_MODE}/${name}`;
}

const SHOT_OPTIONS = { animations: 'disabled' as const, caret: 'hide' as const };

/* ── geometry helpers ──────────────────────────────────────────────── */

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Rect intersection with a 1px forgiveness seam (the r323 precedent). */
function overlaps(a: Box, b: Box): boolean {
  const seam = 1;
  return (
    a.x < b.x + b.width - seam &&
    a.x + a.width > b.x + seam &&
    a.y < b.y + b.height - seam &&
    a.y + a.height > b.y + seam
  );
}

/**
 * The managed layers (lib/bottomStack.ts rank: consent → toast → fab)
 * plus the phone dock — probed explicitly wherever they exist.
 */
const MANAGED_LAYERS = ['.cb-banner', '.toast-stack', '.fb-fab', '.bottom-nav'] as const;

/**
 * Collect the visible boxes of the bottom-stack layers: the MANAGED
 * selectors plus a DISCOVERY pass for "any sticky CTA" — every
 * interactive `position: fixed | sticky` element whose box sits in the
 * viewport's bottom band, on screen, and is neither decorative
 * (pointer-events: none — the grain/cursor/canvas layers) nor a
 * full-viewport sheet. Discovery dedupes by DOM NODE (the consent bar
 * matches both its explicit selector and the discovery filter — as two
 * selector strings it would self-intersect and fail spuriously).
 */
async function collectBottomBoxes(page: Page): Promise<Array<{ sel: string; box: Box }>> {
  return page.evaluate((managed: string[]) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const seen = new Set<Element>();
    const picked: Array<{ sel: string; box: Box }> = [];
    const push = (el: Element | null, sel: string) => {
      if (!el || seen.has(el)) return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none') return;
      seen.add(el);
      picked.push({ sel, box: { x: r.x, y: r.y, width: r.width, height: r.height } });
    };

    for (const sel of managed) push(document.querySelector(sel), sel);

    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const s = getComputedStyle(el);
      if (s.position !== 'fixed' && s.position !== 'sticky') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      if (r.bottom < vh * 0.7 || r.y >= vh) continue; // bottom band, on screen
      if (s.pointerEvents === 'none') continue; // decorative layers
      if (r.width >= vw * 0.95 && r.height >= vh * 0.95) continue; // full sheets
      if (!el.matches('a, button, input, [role]')) continue; // interactive chrome
      push(el, `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} (discovered)`);
    }
    return picked;
  }, [...MANAGED_LAYERS]);
}

/**
 * Assert NO pair of bottom-stack layer boxes intersects. Absent layers
 * (e.g. .bottom-nav on desktop, .fb-fab on the guest landing) are
 * skipped — the probe pins the layers that actually share the screen.
 */
async function assertBottomStackClear(page: Page): Promise<void> {
  const boxes = await collectBottomBoxes(page);

  expect(
    boxes.length,
    'at least one probed layer must be on screen',
  ).toBeGreaterThanOrEqual(1);

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      expect(
        overlaps(a.box, b.box),
        `${a.sel} must never intersect ${b.sel} ` +
          `(${JSON.stringify(a.box)} vs ${JSON.stringify(b.box)})`,
      ).toBe(false);
    }
  }
}

/**
 * Read a layer's INLINE `--app-bottom-stack` (the manager's per-layer
 * base offset) as a NUMBER. parseFloat — the manager writes `Npx`, and
 * `Number('60px')` is NaN (measured live: the first probe draft read
 * NaN and failed every offset pin while the geometry was correct).
 */
async function readInlineStackOffset(page: Page, selector: string): Promise<number> {
  const raw = await page
    .locator(selector)
    .evaluate((el) => el.style.getPropertyValue('--app-bottom-stack'));
  return parseFloat(raw || '0');
}

/**
 * Raise one toast through the REAL store (the same /src/lib/toast.ts
 * module URL the app graph imports → the same zustand instance the
 * mounted ToastStack renders). `error` never auto-dismisses, so the
 * geometry is stable for the whole probe; the dismissal path clicks
 * the card's own close button.
 */
async function openToast(page: Page): Promise<void> {
  await page.locator('.toast-stack').waitFor({ state: 'attached' });
  /* FUNCTION form, deliberately: the shared fixture freezes the wall
   * clock (page.clock.setFixedTime) and a frozen clock makes Playwright
   * SILENTLY return undefined for STRING-form evaluates that return
   * promises (measured live — the string form pushed nothing, no
   * error). The function form survives the clock and serialises the
   * dynamic import into the page, where it resolves to the SAME
   * /src/lib/toast.ts module instance the app graph loaded. The
   * specifier rides as an ARGUMENT (closures don't cross the evaluate
   * boundary) — and as a non-literal it also stays invisible to tsc
   * (a literal '/src/…' specifier would fail typecheck:tests with
   * TS2307, the dev-server URL is not a TS module). */
  const pushed = await page.evaluate(async (specifier: string) => {
    const mod = (await import(/* @vite-ignore */ specifier)) as {
      toast: { error: (msg: string, opts?: { title?: string }) => string };
    };
    return mod.toast.error(
      'رسالة اختبار التكديس السفلي — يجب أن تجلس فوق الحاجز دون أن تحجبه',
      { title: 'تكديس سفلي' },
    );
  }, '/src/lib/toast.ts');
  expect(String(pushed)).toContain('toast-');
  await expect(page.locator('.toast-stack .toast').first()).toBeVisible();
  // let the entrance animation (≤400ms token) settle so the measured
  // box is the final one
  await page.waitForTimeout(450);
}

/** The consent gate's entrance is a 1.2s-delayed rise — wait for opacity 1. */
async function awaitConsentSettled(page: Page): Promise<void> {
  const banner = page.locator('.cb-banner');
  await banner.waitFor({ state: 'visible' });
  await expect
    .poll(async () => banner.evaluate((el) => getComputedStyle(el).opacity), {
      timeout: 10_000,
      intervals: [200],
    })
    .toBe('1');
  await page.waitForTimeout(250);
}

/** Dismiss the probe's toast through its own close affordance. */
async function dismissToast(page: Page): Promise<void> {
  await page.locator('.toast-stack .toast .toast-close').first().click();
  await expect(page.locator('.toast-stack .toast')).toHaveCount(0);
  // the manager's RO → var write → 200ms ease
  await page.waitForTimeout(350);
}

/* ── the probe ─────────────────────────────────────────────────────── */

const WIDTHS = [
  { name: '320', width: 320, height: 700 },
  { name: '390', width: 390, height: 844 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1000 },
] as const;

test.describe('Y6 — the bottom stack (consent · toast · FAB)', () => {
  for (const vp of WIDTHS) {
    test.describe(`the landing gate vs the toast stack @${vp.name} — paper`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test('the toast sits ABOVE the unanswered consent bar', async ({ page }) => {
        await page.goto('/');
        await awaitConsentSettled(page);
        await openToast(page);

        const shot = evidencePath(`landing-${vp.name}-toast-consent.png`);
        if (shot) await page.screenshot({ path: shot, ...SHOT_OPTIONS });

        // the managed pair + whatever fixed/sticky CTAs share the band
        await assertBottomStackClear(page);

        // the manager's bookkeeping: the gate registers at the base seat…
        const consentVar = await page
          .locator('.cb-banner')
          .evaluate((el) => el.style.getPropertyValue('--app-bottom-stack'));
        expect(consentVar).toBe('0px');
        // …and the stack's inline offset covers the gate's REAL height.
        const stackOffset = await readInlineStackOffset(page, '.toast-stack');
        const consentHeight = await page
          .locator('.cb-banner')
          .evaluate((el) => el.getBoundingClientRect().height);
        expect(stackOffset).toBeGreaterThanOrEqual(Math.floor(consentHeight));
      });
    });

    test.describe(`the landing gate vs the toast stack @${vp.name} — ink`, () => {
      // the dark sheet resolves the same geometry through the same tokens —
      // the Y6 contract is BOTH themes, so it is pinned, not assumed.
      test.use({ viewport: { width: vp.width, height: vp.height }, themeSeed: 'dark' });

      test('the same stack holds on the dark sheet', async ({ page }) => {
        await page.goto('/');
        await awaitConsentSettled(page);
        await openToast(page);

        const shot = evidencePath(`landing-${vp.name}-ink-toast-consent.png`);
        if (shot) await page.screenshot({ path: shot, ...SHOT_OPTIONS });

        await assertBottomStackClear(page);
      });
    });
  }

  test.describe('accepting the gate drops the stack cleanly (390)', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('after «موافق» the toast eases back to its natural seat', async ({ page }) => {
      await page.goto('/');
      await awaitConsentSettled(page);
      await openToast(page);
      await assertBottomStackClear(page);

      await page.locator('.cb-accept').click();
      await expect(page.locator('.cb-banner')).toHaveCount(0);
      await page.waitForTimeout(350); // the 200ms seat ease

      const shot = evidencePath('landing-390-accepted-seat.png');
      if (shot) await page.screenshot({ path: shot, ...SHOT_OPTIONS });

      // natural ≤920 seat: dock floor (72 + 8) — the gate no longer lifts it
      const vh = await page.evaluate(() => window.innerHeight);
      const bottom = await page
        .locator('.toast-stack')
        .evaluate((el) => el.getBoundingClientRect().bottom);
      expect(Math.abs(vh - bottom - 80)).toBeLessThanOrEqual(2);

      // with the last layer gone, :root carries no total
      const rootVar = await page.evaluate(() =>
        document.documentElement.style.getPropertyValue('--app-bottom-stack'),
      );
      const stackHeight = await page
        .locator('.toast-stack')
        .evaluate((el) => el.getBoundingClientRect().height);
      if (stackHeight === 0) expect(rootVar).toBe('');
    });
  });

  test.describe('the shell: toast stack vs FAB vs sticky dock', () => {
    test.use({ e2eRole: 'STUDENT' });

    for (const vp of [
      { name: '390', width: 390, height: 844 },
      { name: '1440', width: 1440, height: 900 },
    ]) {
      test.describe(`@${vp.name}`, () => {
        test.use({ viewport: { width: vp.width, height: vp.height } });

        test('toasts rise above the dock, the FAB rises above toasts', async ({ page }) => {
          await page.goto('/student/dashboard');
          await expect(page.locator('.fb-fab')).toBeVisible();
          await openToast(page);

          const shot = evidencePath(`shell-${vp.name}-toast-fab.png`);
          if (shot) await page.screenshot({ path: shot, ...SHOT_OPTIONS });

          // the bottom-nav only docks ≤920px; on desktop the pair is toast+FAB
          await assertBottomStackClear(page);

          // the FAB clears the toast stack's REAL height (offset ≥ stack height)
          const fabOffset = await readInlineStackOffset(page, '.fb-fab');
          const stackHeight = await page
            .locator('.toast-stack')
            .evaluate((el) => el.getBoundingClientRect().height);
          expect(fabOffset).toBeGreaterThanOrEqual(Math.floor(stackHeight));
        });

        test('dismissing the toast drops the FAB to its own seat', async ({ page }) => {
          await page.goto('/student/dashboard');
          await expect(page.locator('.fb-fab')).toBeVisible();
          await openToast(page);
          await dismissToast(page);

          const shot = evidencePath(`shell-${vp.name}-fab-dropped.png`);
          if (shot) await page.screenshot({ path: shot, ...SHOT_OPTIONS });

          const vh = await page.evaluate(() => window.innerHeight);
          const seat = vp.width <= 640 ? 72 : 18; // the authored FAB seats
          const bottom = await page
            .locator('.fb-fab')
            .evaluate((el) => el.getBoundingClientRect().bottom);
          expect(Math.abs(vh - bottom - seat)).toBeLessThanOrEqual(2);
        });
      });
    }
  });

  test.describe('the 200ms seat ease is pinned', () => {
    test.use({ viewport: { width: 1440, height: 900 }, e2eRole: 'STUDENT' });

    test('every stack layer transitions its inset-block-end in 200ms', async ({ page }) => {
      await page.goto('/student/dashboard');
      // settle the route before reading computed styles — the shell
      // (and its FAB) must be mounted, and the route needs the seeded
      // STUDENT session: as a guest this redirects to /auth, where no
      // FAB exists (the first draft's red herring).
      await expect(page.locator('.fb-fab')).toBeVisible();
      const read = (sel: string) =>
        page.locator(sel).evaluate((el) => {
          const s = getComputedStyle(el);
          return { property: s.transitionProperty, duration: s.transitionDuration };
        });

      const fab = await read('.fb-fab');
      expect(fab.property).toContain('inset-block-end');
      expect(fab.duration.split(',').map((d) => d.trim())).toContain('0.2s');

      await openToast(page);
      const stack = await read('.toast-stack');
      expect(stack.property).toContain('inset-block-end');
      expect(stack.duration.split(',').map((d) => d.trim())).toContain('0.2s');
    });
  });
});
