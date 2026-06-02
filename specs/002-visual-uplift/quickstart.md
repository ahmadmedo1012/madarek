# Quickstart — Adopting the Visual Uplift

**Date**: 2026-06-02
**Plan**: [plan.md](./plan.md)

The fastest path from "I'm working on a Madrak page" to "my page reads
as world-class." The motion + interaction foundation from `001-*` is in
place. This guide is the **composition** layer on top of it.

---

## Where things live (additions on top of 001-*)

```
frontend/src/styles/tokens.css       ← extended with --type-* role tokens
                                       and --chart-6/7/8 palette additions
frontend/src/styles/components.css   ← .tabular-nums utility,
                                       responsive-table card-list rules
frontend/src/lib/chartTheme.ts       ← chartPalette() now returns 8
frontend/src/components/primitives/
                ResponsiveTable.tsx  ← NEW — table + mobile card list
frontend/tests/visual/
                routes.ts            ← audit route manifest
                audit.spec.ts        ← Playwright audit
                __captures__/        ← before/after PNGs
scripts/check-icons.sh               ← Lucide-only gate (NEW)
specs/002-visual-uplift/             ← this spec, plan, contracts
```

---

## Six things you'll do all the time

### 1. Use type roles, not raw font sizes

```css
/* good */
.section-title {
  font-size: var(--type-headline-size-lg);
  font-weight: var(--type-headline-weight);
  line-height: var(--type-headline-line-height);
  letter-spacing: var(--type-headline-letter-spacing);
}

/* bad — raw size leaves weight + line-height + letter-spacing un-pinned */
.section-title { font-size: var(--fs-h1); }
```

Roles: `display` (hero), `headline` (page/section title), `body`
(paragraphs), `label` (form labels, captions), `metric` (KPI numbers).

### 2. Tabular numerals on every digit-bearing surface

```tsx
<div className="kpi-tile">
  <span className="kpi-label">إجمالي الطلاب</span>
  <span className="kpi-value tabular-nums">
    <AnimatedNumber value={1250} tabular />
  </span>
</div>
```

Apply `.tabular-nums` to KPIs, table numeric columns, counters,
percentages, dates with shifting digits.

### 3. Use the canonical chart palette

```tsx
import { chartPalette, cartesianOptions } from '@/lib/chartTheme';

const data = {
  labels: ['الأحد','الإثنين','الثلاثاء'],
  datasets: [
    { label: 'الحضور', data: [120, 132, 118], backgroundColor: chartPalette()[0] },
    { label: 'الواجبات', data: [80, 95, 110],  backgroundColor: chartPalette()[1] },
  ],
};

<Line data={data} options={cartesianOptions({ legend: true })} />
```

Don't pick chart colors out of nowhere. Series 0 → `palette[0]`, series 1 →
`palette[1]`, … wraps modulo 8.

### 4. Mobile-aware tables

```tsx
import { ResponsiveTable } from '@/components/primitives/ResponsiveTable';

<ResponsiveTable
  columns={[
    { id: 'name', header: 'الطالب', cell: r => r.name },
    { id: 'grade', header: 'الدرجة', align: 'end', tabularNums: true,
      cell: r => r.grade },
    { id: 'status', header: 'الحالة', cell: r => <Badge>{r.status}</Badge> },
  ]}
  rows={students}
  getRowKey={r => r.id}
  mobilePrimary="name"
  mobileSecondary="grade"
/>
```

Renders as `<table>` ≥ 768 px and as a card list < 768 px. Same data
hierarchy, no horizontal scroll on mobile.

### 5. Lucide icons only

```tsx
// good
import { BookOpen } from 'lucide-react';
import { Icon } from '../components/Icon';
<Icon icon={BookOpen} size={16} aria-hidden="true" />

// bad
<span aria-hidden>📚</span>          // emoji in chrome — fails the gate
<svg viewBox="0 0 24 24">...</svg>   // ad-hoc SVG — fails the gate
```

Canonical sizes: 14 / 16 / 18 / 20 / 24 px. Justify per-instance overrides.

### 6. Section rhythm tokens

```css
/* good */
.landing-features { padding-block: var(--section-pad-y-narrow); }
.landing-hero     { padding-block: var(--section-pad-y-wide); }

/* bad */
.landing-features { padding-block: 64px 80px; }
```

Two values cover every primary section. No ad-hoc spacing.

---

## Six things you must NOT do

1. Do not introduce new motion or interaction tokens. The foundation
   from `001-*` is the source — extend the **composition**, not the
   foundation.
2. Do not write raw `<num>ms` / `cubic-bezier()` / hex colors. The
   `001-*` lint gate still runs and still fails the build.
3. Do not pick chart colors per chart. Use `chartPalette()`.
4. Do not collapse a `<table>` to a stack via CSS-only — use
   `<ResponsiveTable>` so ARIA reading order stays correct.
5. Do not introduce emoji in chrome or component primitives.
6. Do not skip the audit. Every PR that materially changes a primary
   surface re-runs `npm run -w frontend test:visual`.

---

## How to verify your change is on-brand

1. **Audit**: `npm run -w frontend test:visual` regenerates captures
   for the routes you touched. Skim the diffs.
2. **Reduced motion**: DevTools → Rendering → emulate
   `prefers-reduced-motion: reduce`. Reload your route. Counters snap;
   reveals appear in final state.
3. **Mobile**: 360 px viewport. Confirm zero horizontal scroll, every
   table is now a card list, every CTA reachable with one thumb.
4. **RTL**: switch the platform to Arabic. Confirm directional motion
   mirrors and layout doesn't break.
5. **Lucide only**: `bash scripts/check-icons.sh`. Should pass.
6. **Tokens**: `bash scripts/check-motion-tokens.sh`. Should pass.

---

## Common questions

| Question | Answer / Where to look |
|----------|------------------------|
| "What size should this title use?" | A role token. Display for hero, headline for page/section, label for caption. Never raw `--fs-*` in new code. |
| "I need a 6-color chart." | `chartPalette()` already returns 8. Pick the first 6 (or any documented subset). |
| "My table is unreadable on mobile." | Replace it with `<ResponsiveTable>`. |
| "I have an emoji that's actually meaningful." | Confirm it's user-supplied content, not chrome. If chrome, replace with Lucide. |
| "I need a new section padding." | You don't. Use one of `--section-pad-y-narrow` or `--section-pad-y-wide`. If genuinely needed, propose extending the contract. |
| "How do I run the audit locally?" | `npm run -w frontend test:visual`. Captures go under `frontend/tests/visual/__captures__/`. |
| "I added a primitive — does the audit pick it up?" | The audit walks the route manifest. If your primitive ships on a primary route, it's covered. If you added a new route, add it to `frontend/tests/visual/routes.ts`. |

---

## Commands

```bash
# Frontend dev (unchanged)
npm run dev:web

# Type-check
npm run -w frontend typecheck

# Unit tests
npm run -w frontend test

# Build (verifies bundle budget)
npm run build

# Visual audit
npm run -w frontend test:visual

# Reduced-motion audit
npm run -w frontend test:visual:reduced-motion

# Token + icon discipline gates
npm run check:motion-tokens
npm run check:icons
```

---

## Reading order if you want the full picture

1. `spec.md` — what we're building and why.
2. `plan.md` — how it fits into the codebase.
3. `research.md` — why each decision (R-001..R-011).
4. `data-model.md` — type roles, palette, ResponsiveTable, audit manifest.
5. `contracts/type-system.md` — canonical type contract.
6. `contracts/chart-theme.md` — canonical chart contract.
7. `contracts/icon-policy.md` — Lucide-only rule + allowlist.
8. `contracts/audit-script.md` — how the Playwright audit runs.

That's the whole uplift system.
