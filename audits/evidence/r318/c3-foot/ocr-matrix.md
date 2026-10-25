# ocr-matrix.md — the §A6 ink-mode + construction-track sweeps

Reader = the gate's own: `tesseract -l ara+eng --psm 7→6`
(`TESSDATA_PREFIX=/home/z/.tessdata`), element shot at deviceScaleFactor 2,
JPEG q70. Every row = the composed «مدارك» sheet rendered at its final
geometry on plain paper (`#181818` ink / light: ink `#F4F4EE` on `#181818`
dark). PASS = the raw string normalizes (harakat/tatweel/bidi stripped,
spaces dropped — the gate's own `normalizeArabic`) to a string containing
«مدارك».

## 1. Ink mode — the reference's stroke-only hollow outlines FAIL everywhere

The brief's technique (fill:none + vector-effect:non-scaling-stroke + miter
joins) was measured FIRST, on the same composed letterforms, both cuts, both
themes, stroke 1.25 → 8 CSS px (the manifest's ~1.7px included):

| cut | theme | sw=1.25 | 1.7 | 2.5 | 4 | 8 |
|---|---|---|---|---|---|---|
| wide @1440 | light | «él j \| ‏هد‎» | «él j \| ‏هد‎» | «هد \| رك» | «‎j \| aa‏ كم» | «él ‏ر‎ \| aa» |
| wide @1440 | dark | «‎j \| sa‏ الت» | «هد \| ‎j‏ كه» | «‎j \| xa‏ الت» | «‎j \| aa‏ كم» | «él j \| aa» |
| compact @390 | light | «él jy ١ aa» | «‎jy I aa‏ لتم» | «‎jy I axa‏ كم» | «‎jy \| da‏ كم» | «él jy I ‏هد‎» |
| compact @390 | dark | «‎jy \| aa‏ الت» | «‎jy \| aa‏ الت» | «‎jy \| axa‏ لك» | «‎jy \| da‏ الك» | «él jy I ‏هد‎» |

(The prior session's wider sweep — 1.25→25 CSS px, miter/round joins, psm
6/7, ara-only — found no passing cell either.) Hollow outlines confuse the
segmenter: it reads the double edges as glyph pairs. **The filled
letterforms read «مدارك» — the §A6 acceptance (OCR PASS) wins over the
sketch technique; the drafting voice stays in the reg marks + mono line.**

## 2. Construction track (font units, at the three non-joining boundaries)

### WIDE cut at its final geometry (box 1398×107.2 @1440, ink 101.9px tall)

| track | ink w @1440 | light | dark |
|---|---|---|---|
| 0 | 259.6px | PASS «مدارك» | PASS «مدارك» |
| 150 | 299.5px | PASS «مدارك» | PASS «مدارك» |
| **300** | **339.4px** | **PASS «مدارك»** | **PASS «مدارك»** |
| 450 | 379.3px | PASS «مدارك» | FAIL «مد اراك» (hallucinated alif) |

### COMPACT cut at its final geometry (box 346×97.4 @390, ink 75.7px tall)

| track | margins | light | dark |
|---|---|---|---|
| 0/150/300/450 | 10/20/35 | PASS «مدارك» | PASS «مدارك» |
| 650 | 10 | PASS «مد ارك» | PASS «مد ارك» (space-split — normalizer-only) |
| 650 | 20 | FAIL «مد اراك» | FAIL «مد اراك» |

### Decision

**300u, both cuts** — the widest drafting spread that reads as ONE WORD
«مدارك» at both viewports, both themes, with the 450/650 failure modes
documented above (the prior session's 650u choice was re-measured at the
final smaller ink scale and demoted: it split the word / hallucinated an
alif).
