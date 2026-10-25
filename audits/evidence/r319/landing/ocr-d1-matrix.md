# §D1 wordmark OCR matrix — the measured acceptance (R319 c2-L)

Wordmark: «مدارك» shaped from Alexandria 700 (harfbuzz, م initial + 10 tatweel
kashida + د final — ONE connected chain), clipper-unioned to one clean contour
set (the R318 filled render hid a doubled-outline seam at the م→د join; the
stroke-only render exposed it — VLM: «a visible vertical line/gap… doubled
geometry»), emitted full-cell-width (aspect 4.545:1 = the reference strip's own
aspect, heron-footer.json), stroke-only 1.7px non-scaling outline + interior
tone twin.

All rows: tesseract `ara+eng` (TESSDATA_PREFIX=/home/z/.tessdata), PSM 7→6,
DPR-2 element shots, JPEG q70 (the r318 gate's own protocol), normalized by
the gate's `containsWordmark`.

| variant | 1440 light | 1440 dark | 390 light | 390 dark |
|---|---|---|---|---|
| hollow, stroke 1.7–9px (pre-union, doubled join) | ✗ صدارك | ✗ | ✗ صمدارك* | ✗ |
| hollow, stroke 2.5/3.5/5/7/9px (pre-union) | ✗ | ✗ | ✗ | ✗ |
| unioned, hollow 1.7px + tint 15% | ✗ صدارك | ✗ | ✗ صدارك | ✗ |
| unioned, hollow 1.7px + tint 22% | ✗ | ✗ | ✗ | ✗ |
| unioned, hollow 1.7px + tint 30% | ✗ | — | ✓ | — |
| unioned, hollow 1.7px + tint 38% | ✓ | — | ✗ | — |
| unioned, hollow 1.7px + tint 44% | ✓ | — | ✗ | — |
| **unioned, hollow 1.7px + tint 50%** | **✓ مدارك** | **✓ مدارك** | **✓ مدارك** | **✓ مدارك** |
| unioned, hollow 1.7px + tint 58% | ✓ | ✓ | ✓ | ✓ |
| unioned, hollow 1.7px + tint 66% | ✓ | ✓ | ✓ | ✓ |
| unioned, full fill (the R318 register) | ✓ مدارك | ✓ | ✓ | ✓ |
| plain TEXT render (Alexandria 700, 297px) — control | ✓ مدارك | ✓ | ✓ | ✓ |

*One-off: tesseract is unstable around the م/ص confusion at light tones
(30% passed 390 but failed 1440; 38/44% the inverse). The read STABILISES at
50% and holds through 66%.

## The acceptance

**Shipped: outline (1.7px non-scaling stroke, the visible letterform edge) +
50% interior tone (the drafting poché register) — reads «مدارك» in all four
gate cells.** The pure stroke-only variant is machine-unreadable at every
measured weight — the interior tone is the minimum mass tesseract's Arabic
model needs; 50% is the lightest STABLE tone (the 30-44% band is unstable
cell-to-cell). Visually: NOT the solid R318 fill — the interior is half-tone,
the stroke carries the edge, the kashida-elongated word spans the full cell
(94.5% ink width @1440 vs the reference's own 86%).
