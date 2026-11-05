# R332 — per-section contracts (`sections/<name>.md`)

Every section agent writes its contract **before coding**, then rebuilds the component and
**deletes the old CSS it owns** (single layered `styles/landing/<section>.css`).

Contract template:

```md
# <section> — Twin contract
## Heron fact
selector(s) + measured numbers (heron-program.json §<ref> + Twin capture run-XXX)
## Madarek now
file:line + measured numbers (same probes, same viewport)
## Delta
table: metric · Heron · Madarek · Δpx · Δ% · pass/fail vs threshold
## Fix
the owning rule(s) to edit/delete (no patch-on-patch; one CSS file per section; no !important; no ID selectors)
## Proof
before/after screenshots at identical viewport+scroll + Heron twin frame (paths in /home/z/evidence-r332), ≥3 substantive differences named
```

Section → Heron anchor (from `heron-program.json` `stack.webflow` component list):

| Madarek block (id) | Heron component | Owner |
|---|---|---|
| header + hero | `home-hero-wrap` | W1 |
| `#statement` | `home-intro-wrap` | W2 |
| `#live` (pains) | `home-problem-wrap` | W3 |
| `#chapters` (pinned plan) | `home-map-wrap` | W4 |
| `#product` | `home-platform-wrap` | W5 |
| `#wy-` (why band) | `home-why-wrap` | W5 |
| `#roles` | `home-usecase-wrap` | W5 |
| `#vision` (CTA) | `home-cta-wrap` | W5 |
| footer | `footer-wrap` | W6 |
| header/menu/cursor/transitions | header-component + bundle | W7 |
| consent card | (Heron-grammar corner element) | W8 |

QA matrix (A-QA-1/2/3 + Twin): sections × {1920,1440,1024,768,390,360} × {Chromium, WebKit} ×
light at 0/25/50/75/100% scroll + motion captures. Gates: `impeccable detect` clean, contrast
≥4.5/3, no horizontal scroll, no overlap/clip probes, CLS <0.02, ≥55fps @4× CPU, reduced-motion
path, visible keyboard focus. Reviewers give /10 **with a reason for every lost point**; <9
returns the task.
