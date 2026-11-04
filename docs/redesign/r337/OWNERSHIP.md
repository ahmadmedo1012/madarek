# R337 — Exclusive file ownership (update BEFORE spawning agents; conflicts = merge blocks)

| agent | branch | owns (exclusive) |
|---|---|---|
| lead (this session) | main | docs/redesign/r337/*, scripts/conformance/*, .github/workflows/ci.yml, scripts/verify.sh |
| A-usecase | r337/usecase | frontend/src/components/landing/sections/Product.tsx? NO — usecase seat: sections/Vision.tsx? (verify at spawn: the usecase-wrap section component), its CSS sheet, mapping/home-usecase-wrap.json |
| A-intro | r337/intro | sections/Statement.tsx (+ journey folder if intro owns it), styles/landing/statement.css, mapping/home-intro-wrap.json |
| A-problem | r337/problem | sections/Chapters.tsx (verify), styles/landing/pains.css, mapping/home-problem-wrap.json |
| A-why | r337/why | sections/Why.tsx + WhyScene.tsx, styles/landing/why.css, mapping/home-why-wrap.json |
| A-footer | r337/footer | sections/Footer.tsx, styles/landing/footer.css, mapping/footer.json |
| A-platform | r337/platform | sections/Live.tsx (verify: plan/platform seat), styles/landing/platform.css, mapping/home-platform-wrap.json |
| A-map | r337/map | sections/* map seat (verify), styles/landing/colleges.css (map?), mapping/home-map-wrap.json |
| A-cta | r337/cta | sections/Vision.tsx (cta seat? verify), styles/landing/cta.css, mapping/home-cta-wrap.json |
| A-hero | r337/hero | sections/Hero.tsx + hero/*, styles/landing/hero.css + hero-mechanics.css, mapping/home-hero-wrap.json |
| A-motion | r337/motion | frontend/src/lib/motion/*, styles/landing/preloader.css, mapping/_chrome.json |
| A-hover | r337/hover | styles/landing/nav.css + consent-edge.css (interaction deltas) |
| C-css | r337/css | styles/{owner,colleges-batch,shared/*}.css — only files NO section agent owns |
| D-inner | r337/inner | frontend/src/pages/{auth,about,help,app}*, styles/auth.css etc |
| E-mobile | r337/mobile | apps/mobile/**, .github/workflows/mobile-build.yml |

Section→file binding must be verified against LandingPage.tsx imports at spawn time (the seats moved in P2-0).
