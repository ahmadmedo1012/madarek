/**
 * r324 X10 — the innerText gate: debug/jargon must never reach a
 * visitor's screen.
 *
 * The owner's red team (P0/P8) reads mono code/revision/coordinate
 * chrome as debug noise: `SHEET`, `ERR [`, `ROUTE NOT MAPPED`,
 * `[0,` coordinate pairs, `[MDRK-…]` prefixes, `SCALE 1:100`,
 * `REGISTRY NN/NN`… The R324 sweep retired every visible carrier;
 * THIS gate holds the line: every swept public surface renders with a
 * clean innerText, and any regression (a ghost-agent reintroducing a
 * "sheet number") fails here with the offending page + match.
 *
 * Scope note: the sweep renders the GUEST-facing surfaces whose
 * grammar ever carried the drafting chrome (landing, errors, auth,
 * register, the nine public sheets, colleges/capabilities). The
 * authenticated app's PageHeader family is pinned separately in
 * PageHeader.test.tsx. `legal.css`-adjacent false positives are
 * handled by the exact patterns below (mono human indexes like [01]
 * stay allowed — they are `[nn]` WITHOUT a comma).
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LandingPage from '../../src/pages/LandingPage';
import NotFoundPage from '../../src/pages/NotFoundPage';
import Error500Page from '../../src/pages/Error500Page';
import Error403Page from '../../src/pages/Error403Page';
import MaintenancePage from '../../src/pages/MaintenancePage';
import AuthPage from '../../src/pages/AuthPage';
import RegisterPage from '../../src/pages/RegisterPage';
import ForgotPasswordPage from '../../src/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../../src/pages/auth/ResetPasswordPage';
import { PrivacyPage, TermsPage, CookiesPage, AccessibilityPage, SecurityPage, DataPage } from '../../src/pages/legal/LegalPages';
import { HelpPage, AboutPage, ContactPage } from '../../src/pages/PublicPages';
import { CampusLifePage } from '../../src/pages/campus/CampusPages';
import { CapabilitiesPage } from '../../src/pages/capabilities/CapabilityPages';

/** The banned jargon patterns (P0 X10 + P8's list). The bare NN/NN
 * pair is deliberately NOT banned: the map's `[01/05]` station
 * progress markers are the ALLOWED human-index voice (station 1 of
 * 5 — the brief's own «الخطوة 2 من 4» precedent); the carriers that
 * made NN/NN look like a revision tag (SHEET/MDRK/REGISTRY) are
 * banned directly. */
const BANNED: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: 'SHEET (sheet/revision tag)', re: /SHEET/i },
  { name: 'ERR [ code eyebrow', re: /ERR \[/ },
  { name: 'ROUTE NOT MAPPED coordinates', re: /ROUTE NOT MAPPED/ },
  { name: '[x,y] coordinate pair', re: /\[\d+,\s?\d+/ },
  { name: '[MDRK-…] prefix', re: /MDRK-/ },
  { name: 'SCALE tag', re: /SCALE 1:100/ },
  { name: 'REGISTRY revision tag', re: /REGISTRY \d\d\/\d\d/ },
];

/** Pages whose COPY legitimately contains a banned pattern's shape
 * (none today — the honest-copy rule keeps Arabic prose clean; this
 * list documents that fact instead of a per-page allowlist). */
const ALLOW_EMPTY: ReadonlyArray<string> = [];

function cleanInner(c: HTMLElement): string {
  // jsdom has no innerText; a TEXT_NODE-only walk IS innerText's
  // content for this gate (comment nodes — JSX source comments — are
  // excluded the way innerText excludes them; textContent would read
  // them and false-fail). <style>/<script> subtrees are skipped: the
  // UA stylesheet renders them display:none, so real innerText never
  // carries them (the landing's inline-SVG <style> blocks name CSS
  // classes like .pl-sheet — selectors, not content).
  let out = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? '';
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as Element).tagName.toLowerCase();
      if (tag === 'style' || tag === 'script') return;
    }
    node.childNodes.forEach(walk);
  };
  c.childNodes.forEach(walk);
  return out;
}

const SURFACES: ReadonlyArray<{ name: string; el: React.ReactElement }> = (() => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrap = (el: React.ReactElement) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{el}</MemoryRouter>
    </QueryClientProvider>
  );
  return [
    { name: 'landing /', el: wrap(<LandingPage />) },
    { name: '/404', el: wrap(<NotFoundPage />) },
    { name: '/500', el: wrap(<Error500Page />) },
    { name: '/403', el: wrap(<Error403Page />) },
    { name: '/maintenance', el: wrap(<MaintenancePage />) },
    { name: '/auth', el: wrap(<AuthPage />) },
    { name: '/auth/register', el: wrap(<RegisterPage />) },
    { name: '/auth/forgot', el: wrap(<ForgotPasswordPage />) },
    { name: '/auth/reset', el: wrap(<ResetPasswordPage />) },
    { name: '/legal/privacy', el: wrap(<PrivacyPage />) },
    { name: '/legal/terms', el: wrap(<TermsPage />) },
    { name: '/legal/cookies', el: wrap(<CookiesPage />) },
    { name: '/legal/accessibility', el: wrap(<AccessibilityPage />) },
    { name: '/legal/security', el: wrap(<SecurityPage />) },
    { name: '/legal/data', el: wrap(<DataPage />) },
    { name: '/help', el: wrap(<HelpPage />) },
    { name: '/about', el: wrap(<AboutPage />) },
    { name: '/contact', el: wrap(<ContactPage />) },
    { name: '/colleges', el: wrap(<CampusLifePage />) },
    { name: '/capabilities', el: wrap(<CapabilitiesPage />) },
  ];
})();

describe('r324 X10 — the innerText jargon gate (every swept public surface)', () => {
  for (const surface of SURFACES) {
    it(`${surface.name} renders with a clean innerText (no SHEET / ERR [ / coordinates / MDRK- tags)`, () => {
      const { container, unmount } = render(surface.el);
      const text = cleanInner(container);
      for (const ban of BANNED) {
        const hit = ban.re.test(text);
        if (hit) {
          // the diagnostic IS the failure message — show the offending
          // fragment so the fix is one read away (flags preserved!)
          const ctx = new RegExp(`.{0,70}${ban.re.source}.{0,70}`, ban.re.flags);
          const m = text.match(ctx);
          throw new Error(
            `${surface.name}: banned jargon "${ban.name}" in innerText → …${m?.[0]?.replace(/\s+/g, ' ') ?? '??'}…`,
          );
        }
      }
      unmount();
    });
  }

  it('the allowlist stays empty — a page needing an exemption is a bug to fix, not a hole to widen', () => {
    expect(ALLOW_EMPTY).toEqual([]);
  });
});
