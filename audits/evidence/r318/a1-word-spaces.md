# R318 · §A1 — WordReveal real word spaces (before/after evidence)

**Defect (before — head 55afbae, foreman probe 1440×900):** every `.wr`
wrapper rendered sibling `.wr-w` inline-block masks with **no whitespace
between them** — `WordReveal.tsx` mapped `text.split(' ')` to bare
sibling spans. Result: 0 inter-word spaces, visually glued text AND glued
`textContent` (copy, search and screen reading destroyed):

- before, extracted text: `«هذامسطحلطابقتعلمواحدفيمدارك.»` — 0 spaces
- before, spaceCount = 0 in **every** `.wr` on the page (13 instances per
  viewport: 8 intro lines incl. the ≤991px twin, 4 map station cards, 1
  hero line); in RTL the DOM-order next word sat flush to the LEFT.

There are no `a1-before-*.jpg` crops: the before state *is* the glued
string above (measured by the foreman probe on the pre-fix build —
`spaceCount: 0` per instance). The after crops below show the same
station card with real, visible spaces.

**Fix (this change, branch `c1/w`):** a real `' '` text node between
consecutive `.wr-w` masks (both `WordReveal` and `ScrubReveal`), wrapper
carries `aria-label={text}` and every mask is `aria-hidden="true"`. No
letter-spacing on Arabic (site rule); no margins/font-size tricks. Each
word still rides its own `overflow-hidden` mask; stagger/scrub untouched;
keys stay `${w}-${i}`.

## After — numbers (live probe, real build, both viewports)

Probe: `/home/z/foreman/c1-w-probe.mjs` (Playwright chromium-1223,
loader bypassed, 1440×900 + 390×844). Direction-aware gap math
(RTL, DOM pair A→B): `gap = A.left − B.right`, asserted ≥ 0.15em.

| `.wr` instance | words | spaces before | spaces after | min gap after |
|---|---|---|---|---|
| intro line 1 — `.jt-intro-line` «هذا مسطح لطابق تعلم واحد في مدارك.» | 7 | 0 | 6 | 0.231em |
| intro line 2 — «أربع قاعات حول ممر واحد، ولكل قاعة بابها.» | 8 | 0 | 7 | 0.231em |
| intro line 3 — «القاعة النشطة تضيء بالبرتقالي مع تقدّم التمرير» | 7 | 0 | 6 | 0.231em |
| intro line 4 — «وكل قاعة ميزة تعمل اليوم — لا وعدًا قادمًا.» | 9 | 0 | 8 | 0.231em |
| hero line — «منصّة واحدة تخدم الرحلة كلها» | 5 | 0 | 4 | 0.231em |
| station card 01 — `.jt-station-text` «محاضرة مسجَّلة بنقاط فحص…» | 11 | 0 | 10 | 0.231em |
| station card 02 — «سؤال قصير داخل المحاضرة…» | 10 | 0 | 9 | 0.231em |
| station card 03 — «بنك أسئلة بأربعة أنواع…» | 10 | 0 | 9 | 0.231em |
| station card 04 — «درجة إتقان لكل مفهوم…» | 9 | 0 | 8 | 0.231em |

*(the 8 intro rows above cover the pin instance and its ≤991px flow
twin — same counts at both viewports; every row is one `.wr`.)*

- joined text, after: `«هذا مسطح لطابق تعلم واحد في مدارك.»` — 6 spaces.
- 1440×900: 13/13 instances `spaceCount === wordCount − 1` ·
  13/13 `textContent` normalized-equals `aria-label` · 13/13 every
  `.wr-w` `aria-hidden="true"` · 64 same-line DOM pairs checked,
  **min gap 0.231em, 0 failures <0.15em** (3 pairs skipped = line wraps).
- 390×844: 13/13 · 13/13 · 13/13 · 63 same-line pairs checked,
  **min gap 0.231em, 0 failures <0.15em** (4 wrapped pairs skipped).

## After crops (words with visible spaces)

- `a1-after-station-1440.jpg` — map station card, 1440×900 (361×180 crop)
- `a1-after-station-390.jpg` — map station card, 390×844 (342×193 crop)

## Tests

- `frontend/src/__tests__/r318/wordreveal.test.tsx` (Vitest + RTL):
  3/3 pass — textContent (raw + normalized) equals the source including
  spaces, real `' '` text nodes === words−1, every `.wr-w`
  `aria-hidden="true"`, wrapper `aria-label`, mask count === word count
  (never split below word level).
- `tests/unit/r308-interaction.test.ts` (mentions the word split): 24/24
  pass. No existing suite imported/pinned the glued output.
- LandingPage-rendering suites re-run green: 63/63 across
  landing-funnel, r162-ux-cohesion, r170d-a11y-pins, r312-mobile-camera,
  r312-guest-reveal, r311-cursor-ownership. `tsc -b --noEmit` clean.
