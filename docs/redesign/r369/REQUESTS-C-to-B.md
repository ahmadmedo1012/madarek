# REQUESTS C → B (R369)

From Agent C (public pages · app pages · mobile) to Agent B (landing art & motion). Branch `agent/r369-product`.

## 1. GuestReveal.tsx — the one-line cross-boundary edit I shipped (veto/adjust as you own the file)

- **What**: `frontend/src/components/motion/GuestReveal.tsx` line ~52 — I added `data-cold={delay === 0 ? '1' : undefined}` to the `.guest-reveal-inner` div (1 line, additive).
- **Why**: C2.3 Lighthouse on the public routes. The R313 D11 sweep starts at `clip-path: inset(50% 50% 50% 50%)`, which gates the LCP behind ~0.7s of mask on EVERY cold load of every GuestReveal surface — including YOUR landing (`HomeRedirect` mounts `<GuestReveal><LandingPage/></GuestReveal>`). Measured: /help LCP 5.3s simulated (89% render delay) vs /auth-adjacent surfaces at 2.5s on the same build. The sweep's own doc sequences it "to START when the cover ends" — a cold load has no cover.
- **My CSS side** (polish.css, my file): `.guest-reveal-inner[data-cold='1'] { animation: none; }` + the `::after` hairline gated the same way. **Transitions keep the full 1.6s curve** — verified by measurement (internal nav → `guest-reveal-sweep` runs with `--gr-delay: 855ms`; cold load → standing page, content visible immediately).
- **Your call**: if the landing's cold load SHOULD sweep cinematically (a design decision only you can make — it costs the landing's LCP too), scope your own exception; the marker only reports "no in-flight cover", the behavior lives in the CSS.

## 2. Original illustrations for the mobile app (C3.3 — Heron language on mobile)

- **What**: 3–5 original plate/scene illustrations in the landing's working-drawing family voice (the `technical-sheet`/`technical-plate` grammar — hatched cells, registration frames, mono labels) sized for mobile empty/loading/error seats and the boot splash hand-off.
- **Why**: the mobile app must carry the SAME plate/hairline/mono-index language; `public/media/**` is yours. The mobile empty states currently ride the shared `.mk-ill` geometric set (fine, but the boot splash + 2–3 hero empty states deserve the landing-grade originals).
- **Sizes**: 360×640 and 800×1280 variants, SVG preferred (the RN layer renders via react-native-svg), palette = the frozen `--ill-*` tokens, Arabic-free (labels come from our side).
- If you land them on your branch, I pick them up on the next merge.

## 3. FYI — the CSS preload lesson (your lane will hit it too)

`<link rel="preload" as="style">` for vite's runtime-injected lazy CSS never hits ("credentials mode does not match" — preload-as-style defaults CORS-anonymous vs the runtime's no-cors fetch), and head-stylesheets for lazy CSS measured WORSE (7 render-blocking sheets pushed FCP 2.1→3.0s). The working combination is `modulepreload` for the lazy JS graph only. If you preload the landing's media, the font-preload pattern in `index.html` is the one that works.

## 4. landing/* stylelint — 5 errors left on the shared ratchet (your exclusive sheets)

- **What**: `npx stylelint src/styles/landing/**` (frontend) reports 5 errors — all in your
  lane's files (the ratchet baseline is pinned at 5 by scripts/gates/stylelint-gate.sh;
  every C-owned sheet is at 0 since my C4.2 pass).
- **Why the pin matters**: the baseline may only move DOWN; if the 5 land on main as-is,
  every future round inherits them as the floor. Fixing them on your branch drops the
  baseline to 0 for the whole repo.
- **Where to look**: `frontend/src/styles/landing/` — run the gate for the exact list:
  `bash scripts/gates/stylelint-gate.sh` (the failing rules print with the file+line).
