# Feature Specification: Public Non-Landing Pages — Fidelity & Hardening

**Feature Branch**: `wip/r368-t5-public`

**Created**: 2026-11-19

**Status**: Landed on the task branch (not merged to `main`)

**Input**: R368 plan task 5 — «تحسين الصفحات العامة غير landing».

> **Source note (read this first).** At task start the referenced plan
> `docs/superpowers/plans/heron-fidelity-plan.md` did not exist in the
> repository, and no `wip/r368-t*` branches existed on the remote (the
> tree's latest round is r366). This spec therefore derives T5's scope
> from the REAL public route inventory (`frontend/src/App.tsx` +
> `frontend/src/lib/routes.ts`) and records the work actually measured
> instead of restating a plan that is not on disk. If the plan is later
> restored, this file is the T5 implementation record it can point at.

## Overview

The public, unauthenticated surfaces outside the landing page are the
platform's storefront: `/about`, `/help`, `/contact`, the six
`/legal/*` policy sheets, `/capabilities` (السجلّ), the guest colleges
registry `/colleges`, and the designed error sheets (`/404`, `/403`,
`/500`, `/maintenance`). They share one drawing-sheet grammar
(`GuestSheetChrome`, `pf-*` pattern library, section-scoped CSS) and
one honesty law: every claim is written from real code behaviour.

This spec is **not** a redesign: it is a measured fidelity and
hardening pass on those pages — Arabic RTL, phones (320–390),
light/dark, empty/loading/error states, keyboard order, and head
metadata — with no change to the landing, the auth pages, the
authenticated app, shared tokens, `App.tsx`, `frontend/src/lib/routes.ts`,
the API, or permissions.

## Scope

| Surface | Route(s) | Owner files |
|---|---|---|
| Identity sheet | `/about` | `pages/PublicPages.tsx`, `styles/about.css` |
| FAQ sheet | `/help` | `pages/PublicPages.tsx`, `styles/help.css` |
| Contact sheet | `/contact` | `pages/PublicPages.tsx` |
| Policy suite (6) | `/legal/{privacy,terms,cookies,accessibility,security,data}` | `pages/legal/LegalPages.tsx`, `pages/legal/LegalSheet.tsx`, `styles/legal.css` |
| Capability ledger | `/capabilities` | `pages/capabilities/CapabilityPages.tsx` |
| Guest colleges registry | `/colleges` | `pages/colleges/CollegePages.tsx`, `styles/colleges.css` |
| Error sheets | `/404`, `/403`, `/500`, `/maintenance` | `pages/Error*Page.tsx`, `pages/NotFoundPage.tsx`, `pages/MaintenancePage.tsx`, `styles/errors.css` |

**Out of scope (by instruction):** `LandingPage` and `components/landing/*`,
authenticated pages, `App.tsx`, `lib/routes.ts`, `styles/tokens*`,
`shared/*`, backend/API/permissions, and all other agents' files.

## Requirements

- **FR-1 Arabic/RTL** — `<html lang="ar" dir="rtl">` on every route; no
  LTR drift; Latin technical runs stay `dir="ltr"` `<bdi>` mono.
- **FR-2 Responsive** — no horizontal document overflow at 320, 360,
  390, 768, and 1440 CSS px; the 1 h1 stays inside the viewport.
- **FR-3 Themes** — the pages hold in the site's own
  `html[data-theme=dark]` flip with unchanged anatomy.
- **FR-4 Accessibility** — zero axe-core WCAG 2.1 A/AA + best-practice
  violations; one h1 per page; the skip link is the first tabbable
  element and lands on `#main`; decorative `[nn]` indices stay
  `aria-hidden`.
- **FR-5 States** — loading, empty, and error states exist and are
  announced to assistive tech (no silent skeleton, no unlabelled
  retry).
- **FR-6 Head metadata** — every public sheet declares its OWN title,
  description, canonical URL, and `og:url`; no public page may inherit
  the landing's canonical `/`.
- **FR-7 Legal/copy integrity** — legal wording, the `[يُستكمل قبل
  الإطلاق]` markers, and the storage ledger stay byte-identical;
  the copy diet's one-home-per-string consts stay in use.

## Acceptance (measured)

- **AC-1** axe-core: 0 violations across the 15 public non-landing
  routes × {1440, 390} × {light, dark} = **60 checks** (the landing was
  excluded; it carries pre-existing violations owned by the landing
  track).
- **AC-2** `document.scrollingElement.scrollWidth - clientWidth = 0` on
  all 12 routes at 320/360/390/768/1440.
- **AC-3** exactly one h1 per route; `dir=rtl`, `lang=ar` on all.
- **AC-4** first `Tab` focuses `.skip-link` on `/about`, `/help`,
  `/contact`, `/legal/privacy`, `/capabilities`, `/colleges`.
- **AC-5** `/capabilities` and `/colleges` canonical = their own URL,
  description/og:title = their own words (verified in the head).
- **AC-6** `/colleges` loading state exposes `aria-busy="true"` and a
  polite `role="status"` announcement («جارٍ تحميل الكلّيّات…»); the
  empty and error states still render.
- **AC-7** Lighthouse (local dev server, `/about`): accessibility 100,
  SEO 100, best-practices 96 (the only deduction is the expected
  console 500 while no backend runs).
- **AC-8** `tsc -b --noEmit` (frontend), ESLint on every touched file,
  and the frontend test suite pass.

## Findings & changes

1. **Head metadata leak (fixed).** `/capabilities` and the guest
   `/colleges` registry set only a tab title; the landing's
   `description`, `link[rel=canonical]`, `og:url`, and `og:title`
   stayed mounted. Canonical pointed at `/`, so search engines were
   told both pages were the landing. Both now call `useLegalMeta`
   with their own path/words.
2. **Silent loading skeleton (fixed).** The colleges gallery's
   row-shaped skeleton is `aria-hidden` by design, and it carried no
   live region — a screen-reader user heard nothing while the roster
   loaded. The wrapper now carries `aria-busy="true"` plus a polite
   `role="status"` line, matching the shared skeleton family's
   contract (`KpiSkeleton`/`TableSkeleton`/`CardSkeleton`).
3. **No defect found** in the legal suite, about/help/contact,
   or the designed error sheets under axe, RTL, overflow, keyboard,
   print (`@media print` hides the guest chrome, keeps one-column
   prose), or the 320 px reflow check.

## Residual / not claimed

- The 60-cell axe sweep and the responsive sweep ran on Chromium
  (Playwright `chromium_headless_shell-1248`, symlinked fallback);
  WebKit was **not** measured — reported as RESIDUAL, not as a pass.
- Lighthouse ran against the Vite dev server; its performance score
  is not representative (unminified, uncompressed). Only the
  accessibility/SEO/best-practices categories are cited.
- `/capabilities` and `/colleges` metadata is applied client-side
  (same mechanism as the rest of the suite). Prerendering/crawler
  behaviour is unchanged.
