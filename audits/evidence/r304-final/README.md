# R304 FINAL — fresh browser evidence (the acceptance set)

Captured from the integrated tree (`redesign/r304-integration`, pure-function
pose sampler + full-viewport canvas + retuned ribbon ledger), Vite dev build,
headless Chromium (software GL tier → the same 0.7 DPR path a SwiftShader
device takes). Every frame states its viewport, scroll anchor, and theme.

## Desktop 1536×1000 — light theme
| file | scroll anchor | what it proves |
|---|---|---|
| g-hero.png | y=0 (hero anchor) | strong centered focal ribbon; headline/CTA clear; camera probe verified pose = ledger[0] exactly |
| h-statement.png | y=1069 (statement) | ribbon receded to the left gutter; heading + three role rows fully clear (RTL reading column protected) |
| g-chapters.png | y=2500 (chapters, mid-run) | demo card + copy own the stage; sculpt a low far-left landmark |
| g-chapters2.png | y=3600 (exam spread 04/05) | exam demo card pristine; heading clear of the sash |
| h-live.png | y=5130 (live) | copper ring framed INSIDE the live drawing window; dark capabilities slab crisp; no top-band collision |
| g-roles.png | y=6131 (roles) | five-role panorama owns the width; distant veiled landmark |
| g-colleges.png | y=7055 (colleges) | chips + heading clear; sculpt behind the numeral zone |
| h-vision.png | y=8104 (vision) | roadmap rows fully readable; no inside-the-sculpture camera (impossible with a solid Möbius band — re-authored as the quiet recede) |
| g-cta.png | y=9056 (cta) | conversion band centered and clear; ribbon as a right-edge copper accent |
| h-footer.png | y=9872 (footer) | link columns legible over the veiled recede |

## Desktop 1536×1000 — dark theme (real toggle path)
| file | scroll anchor | what it proves |
|---|---|---|
| dark-hero.png | y=0 | theme flip repaints the canvas immediately (applyTheme → re-render); dark material response correct |
| dark-live.png | y=5130 | inverted ledger slab + ring porthole hold AA contrast |

## Mobile 390×844 — light theme (authored compositions, not a crop fudge)
| file | scroll anchor | what it proves |
|---|---|---|
| m3-hero.png | y=0 | type-first hero; complete small loop in the low-left pocket; zero copy collision |
| m3-statement.png | y=715 | statement column clear |
| m3-chapters.png | y=1479 | chapter run stack |
| m3-chapters2.png | y=3000 | research demo card (pin fix verified next frame) |
| m3-chapters3.png | y=4400 | later spreads |
| m3-live.png | y=5746 | dark capabilities slab edge-to-edge, crisp |
| m3-roles.png | y=6617 | role rows legible |
| m3-colleges.png | y=7626 | chip grid legible |
| m3-vision.png | y=8796 | roadmap rows legible, sculpt a quiet smudge |
| m3-cta.png | y=9673 | CTA button clear, accent at edge |
| m3-footer.png | y=10246 | colophon columns legible |
| m4-research-demo.png | supervisor-note pin scrolled into view | «ملاحظة المشرف» flows as the sheet's first row — the old absolute corner placement overlapped the wrapped Arabic title |

## Mobile 360×844
| file | scroll anchor | what it proves |
|---|---|---|
| v360-hero.png | y=0 | same authored composition holds; scrollWidth 350 ≤ 360 — no horizontal overflow |
| v360-statement.png | y=660 | reading column clear |
| v360-vision.png | y=8600 | roadmap legible |

## Honesty pins
- Software-GL tier renders with DPR 0.7 buffer + full-viewport CSS canvas —
  the sizing fix is verified by the canvas rect measuring exactly 1536×1000.
- Authenticated product surfaces were NOT exercised end-to-end in this
  environment: the backend requires PostgreSQL, which this sandbox does not
  provide (db deploy/seed fail with `Unsupported DATABASE_URL protocol
  "file:"`). The 2,081-test frontend suite (student/teacher/research/admin/
  owner component suites included) is the exercised evidence for those
  workstreams, plus the route guards' designed error state observed live.
