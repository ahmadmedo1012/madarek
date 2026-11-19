---
description: "Task list for R368 T5 — public non-landing pages fidelity"
---

# Tasks: Public Non-Landing Pages — Fidelity & Hardening

**Input**: `specs/013-public-pages-fidelity/spec.md`

**Branch**: `wip/r368-t5-public` (worktree, not merged)

**Tests**: Playwright + axe-core browser sweep, responsive/keyboard
checks, Lighthouse, frontend typecheck/ESLint/vitest. No new test
harness or dependency was added.

## Format: `[ID] [P?] Description`

- **[P]**: parallelizable
- File paths repository-relative
- `[X]` done with evidence · `[ ]` open

---

## Phase 1: Inventory & measurement

- [X] T5.1 Inventory the real public route set from `frontend/src/App.tsx`
      (guest block + error routes). Result: `/about`, `/help`,
      `/contact`, 6 × `/legal/*`, `/capabilities`, `/colleges`,
      `/404`, `/403`, `/500`, `/maintenance`. Landing/auth excluded.
- [X] T5.2 Measure accessibility: axe-core 4.x WCAG 2.1 A/AA +
      best-practice on the 15 non-landing routes × {1440, 390} ×
      {light, dark} = 60 cells. Result: **0 violations** on all 60
      (the landing, excluded from scope, still fails its own cells).
- [X] T5.3 Measure layout/RTL: `scrollWidth - clientWidth` at 320/360/
      390/768/1440, one-h1 count, `lang`/`dir`. Result: **0 overflow**,
      **1 h1 per route**, `ar`/`rtl` everywhere.
- [X] T5.4 Measure keyboard: first `Tab` on 6 guest sheets. Result:
      `.skip-link` first on all six, focus lands on `#main`.
- [X] T5.5 Measure head metadata per route. Found: `/capabilities` and
      guest `/colleges` inherit the landing's description/canonical/
      og:url (canonical `/`).
- [X] T5.6 Measure print: `@media print` hides `.lg/.ab/.hp/.cu`
      chrome; one-column prose survives on `/legal/privacy`,
      `/legal/cookies`, `/about`, `/help`.

## Phase 2: Fixes

- [X] T5.7 `/capabilities` owns its head: `useLegalMeta({title:
      'سجلّ القدرات', path: '/capabilities', description: …})`.
      Verified canonical `…/capabilities`, og:title `سجلّ القدرات`.
- [X] T5.8 Guest `/colleges` owns its head: `useLegalMeta({title:
      COLLEGES_LABEL, path: '/colleges', description: …})` replacing
      the guest-only title effect. Verified canonical `…/colleges`,
      og:title `كلّيّات الجامعة`.
- [X] T5.9 `/colleges` loading state announces itself:
      `aria-busy="true"` wrapper + polite `role="status"` «جارٍ تحميل
      الكلّيّات…»; skeleton stays `aria-hidden`. Verified in-browser
      with the `/colleges` API held open.
- [X] T5.10 Legal wording, pending markers, storage ledger, and all
      copy consts untouched (diff inspected: no legal file changed).

## Phase 3: Verification

- [X] T5.11 `tsc -b --noEmit` (frontend) — pass.
- [X] T5.12 ESLint on the two touched page files — 0 errors
      (2 pre-existing exhaustive-deps warnings on `CollegePages`).
- [X] T5.13 Frontend vitest: **3154 passed / 3155**, 1 failure in
      `tests/unit/useScrollRestoration.test.tsx` — reproduced on the
      clean tree with this branch's changes stashed, so it is
      PRE-EXISTING and unrelated to T5.
- [X] T5.14 `npm run build -w frontend` — pass; bundle gate
      **PASS** (total 762.4 KB gz ≤ 770, entry 66.1 ≤ 92, pdf 95.7 ≤ 110).

## Phase 4: Record

- [X] T5.15 This spec + task list, with the measured evidence and the
      explicit note that the source plan file was absent at task start.
- [X] T5.16 Commit + push `wip/r368-t5-public` (no merge to `main`,
      no deploy).

## Residual

- WebKit not available in this sandbox → not measured (RESIDUAL).
- Lighthouse performance category on the dev server is not
  representative; only a11y/SEO/best-practices are cited.
