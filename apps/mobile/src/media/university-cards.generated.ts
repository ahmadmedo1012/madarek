/* ═══════════════════════════════════════════════════════════════════
 * university-cards.generated.ts — GENERATED FILE — DO NOT EDIT BY HAND.
 * Generator: scripts/media/sync-university-cards.mjs (byte-copy of
 * shared/media/university-cards.ts + this header; regen after any
 * edit to the shared source; drift-gated by `npm run cards:check`).
 *
 * The ONE university-card geometry source (R343 C-1): registry +
 * original elevation compositions (arcade · courtyard · tower · hall)
 * as normalized draw lists — consumed by web (inline SVG) and by this
 * app (react-native-svg, src/components/UniversityCard.tsx). Never
 * forked; never hand-edited.
 * ═══════════════════════════════════════════════════════════════════ */

/**
 * university-cards — R343 C-1 · the typographic/architectural card system.
 *
 * ONE geometry source consumed by BOTH surfaces (never forked):
 *  · web — `frontend/src/components/media/UniversityCard.tsx` renders it
 *    as an inline SVG (theme via CSS variables, real text nodes);
 *  · mobile — `apps/mobile` renders the same draw lists via
 *    react-native-svg (and `scripts/r343/build-university-cards.mjs`
 *    emits static twin files from this module when a raster/svg asset
 *    seat needs a file).
 *
 * Design law (the R343 imagery system, per docs/redesign/r343/IMAGERY.md):
 *  · NO photos, NO crests, NO traced buildings — four ORIGINAL line-art
 *    elevation compositions (arcade · courtyard · tower · hall), pure
 *    geometric hairlines drawn here;
 *  · paper `#F6F6EE` / ink `#282828` / accent `#FA3600`, radius 0, no
 *    shadows — colors ride CSS variables on web (current rules inject
 *    them), never baked into geometry;
 *  · the [nn] numeral is the card's index in the documented registry;
 *  · Arabic name is the display voice; the Latin line is a mono label.
 *
 * The geometry is authored ONCE here as draw lists (deterministic,
 * parameterized by the card's aspect) — no external tools, no randomness.
 */

export type CardComposition = 'arcade' | 'courtyard' | 'tower' | 'hall';

export interface UniversityCardSpec {
  /** the documented registry id (manifest.json photos[].id lineage) */
  id: string;
  /** index numeral, zero-padded — the [nn] seat */
  nn: string;
  /** institution display name (Arabic) */
  nameAr: string;
  /** sub-line (Arabic — the faculty/seat the card documents) */
  subAr: string;
  /** Latin mono label (institution or seat) */
  nameEn: string;
  /** city (Arabic) */
  cityAr: string;
  /** the elevation composition */
  composition: CardComposition;
  /** aspect ratio (w/h) — kept from the retired photo seat (CLS-safe) */
  ratio: number;
}

/** The documented universities (IMAGERY.md §2 — 9 retired photo ids). */
export const UNIVERSITY_CARDS: readonly UniversityCardSpec[] = [
  { id: 'uob-wide', nn: '01', nameAr: 'جامعة بنغازي', subAr: 'الإدارة المركزية', nameEn: 'UNIVERSITY OF BENGHAZI', cityAr: 'بنغازي', composition: 'hall', ratio: 2689 / 827 },
  { id: 'uob-science', nn: '02', nameAr: 'جامعة بنغازي', subAr: 'كلية العلوم', nameEn: 'FACULTY OF SCIENCE', cityAr: 'بنغازي', composition: 'arcade', ratio: 4000 / 3000 },
  { id: 'tripoli-science', nn: '03', nameAr: 'جامعة طرابلس', subAr: 'كلية العلوم', nameEn: 'FACULTY OF SCIENCE', cityAr: 'طرابلس', composition: 'courtyard', ratio: 3024 / 4032 },
  { id: 'uob-garden', nn: '04', nameAr: 'جامعة بنغازي', subAr: 'حديقة الجامعة', nameEn: 'THE GARDEN AVENUE', cityAr: 'بنغازي', composition: 'courtyard', ratio: 4912 / 1080 },
  { id: 'garyounis-classic', nn: '05', nameAr: 'جامعة بنغازي (قاريونس)', subAr: 'الحرم من الجوّ', nameEn: 'THE CAMPUS FROM ABOVE', cityAr: 'بنغازي', composition: 'tower', ratio: 1509 / 1275 },
  { id: 'garyounis-1', nn: '06', nameAr: 'جامعة بنغازي (قاريونس)', subAr: 'مدخل الحرم', nameEn: 'THE CAMPUS GATE', cityAr: 'بنغازي', composition: 'arcade', ratio: 3648 / 2736 },
  { id: 'omu-agri', nn: '07', nameAr: 'جامعة عمر المختار', subAr: 'كلية الزراعة — البيضاء', nameEn: 'FACULTY OF AGRICULTURE', cityAr: 'البيضاء', composition: 'hall', ratio: 1310 / 908 },
  { id: 'fateh-science', nn: '08', nameAr: 'جامعة طرابلس', subAr: 'ممرّ كلية العلوم', nameEn: 'THE SCIENCE WALK', cityAr: 'طرابلس', composition: 'arcade', ratio: 1280 / 960 },
  { id: 'uob', nn: '09', nameAr: 'جامعة بنغازي', subAr: 'تفصيلة من الإدارة', nameEn: 'THE ADMINISTRATION DETAIL', cityAr: 'بنغازي', composition: 'tower', ratio: 4000 / 3000 },
];

export function cardById(id: string): UniversityCardSpec | undefined {
  return UNIVERSITY_CARDS.find((c) => c.id === id);
}

/* ── the four ORIGINAL elevation compositions ─────────────────────────────
 * Pure geometric draw lists in a normalized box: x∈[0,100], y∈[0,100]
 * (y grows downward like SVG). Every list is a function of the card's
 * aspect so wide panoramas stretch the facade and portraits stack it —
 * the compositions stay legible at every retired seat ratio.
 * A stroke list item: [x1,y1,x2,y2]; an arc item: [cx,cy,rx,ry,rot,
 * large,sweep,x2,y2] (SVG A-parameters); a fill-rect accent: [x,y,w,h]. */

export type Line4 = readonly [number, number, number, number];
/** SVG A-parameters: [cx, cy, rx, ry, rot, large, sweep, x2, y2] */
export type Arc9 = readonly [number, number, number, number, number, number, number, number, number];

export interface CardDraw {
  strokes: readonly Line4[];
  arcs: readonly Arc9[];
  /** the one accent element per card (door / flag / marker) as a filled rect */
  accent: readonly [number, number, number, number];
}

/** arcade — a repeating arcade facade: 7 arches on columns + cornice. */
function drawArcade(wide: boolean): CardDraw {
  const n = wide ? 7 : 5;
  const strokes: Line4[] = [];
  const arcs: Arc9[] = [];
  const span = 88 / n;
  const x0 = 6;
  const base = 92;
  const top = 34;
  strokes.push([x0, top, 94, top]); // cornice
  strokes.push([x0, base, 94, base]); // ground
  for (let i = 0; i <= n; i++) strokes.push([x0 + i * span, top, x0 + i * span, base]); // piers
  for (let i = 0; i < n; i++) {
    const cx = x0 + i * span + span / 2;
    arcs.push([cx, base - 14, span / 2 - 2.4, 15, 0, 0, 1, cx, base - 29]);
    strokes.push([cx - span / 2 + 2.4, base - 14, cx - span / 2 + 2.4, base]); // jamb L
    strokes.push([cx + span / 2 - 2.4, base - 14, cx + span / 2 - 2.4, base]); // jamb R
    strokes.push([cx - span / 2 + 2.4, base - 14, cx + span / 2 - 2.4, base - 14]); // spring line
  }
  strokes.push([x0, 20, 94, 20]); // parapet
  return { strokes, arcs, accent: [50 - 3.2, base - 29, 6.4, 29] }; // the center gate, accent
}

/** courtyard — a walled court: enclosing walls, a central path, palms. */
function drawCourtyard(wide: boolean): CardDraw {
  const strokes: Line4[] = [];
  const arcs: Arc9[] = [];
  const yTop = 30;
  const yBase = 92;
  strokes.push([8, yBase, 92, yBase]); // near wall
  strokes.push([8, yBase, 8, yTop + 10]); // near-left jamb
  strokes.push([92, yBase, 92, yTop + 10]); // near-right jamb
  strokes.push([8, yTop + 10, 26, yTop]); // receding left wall
  strokes.push([92, yTop + 10, 74, yTop]); // receding right wall
  strokes.push([26, yTop, 74, yTop]); // far wall
  const pathY = wide ? 74 : 70;
  strokes.push([42, yBase, 46, pathY]); // path edges
  strokes.push([58, yBase, 54, pathY]);
  strokes.push([46, pathY, 54, pathY]);
  strokes.push([40, pathY, 60, pathY]); // threshold
  const palmXs = wide ? [18, 30, 70, 82] : [22, 78];
  for (const px of palmXs) {
    strokes.push([px, yBase, px, yBase - 16]); // trunk
    arcs.push([px, yBase - 20, 4.6, 4.6, 0, 0, 1, px, yBase - 20.1]); // crown circle
  }
  strokes.push([30, yTop + 4, 70, yTop + 4]); // far colonnade hint
  return { strokes, arcs, accent: [46, pathY, 8, 3] }; // the threshold bar, accent
}

/** tower — a campanile tower with stepped side wings. */
function drawTower(wide: boolean): CardDraw {
  const strokes: Line4[] = [];
  const arcs: Arc9[] = [];
  const base = 92;
  const top = 16;
  strokes.push([6, base, 94, base]); // ground
  strokes.push([42, top, 58, top]); // cap
  strokes.push([42, top, 42, base]); // tower L
  strokes.push([58, top, 58, base]); // tower R
  strokes.push([45, top + 5, 55, top + 5]); // belfry beam
  arcs.push([50, top + 12, 5, 6, 0, 0, 1, 50, top + 12.1]); // bell opening
  const wingW = wide ? 16 : 10;
  strokes.push([42 - wingW, 44, 42, 44]); // wing L
  strokes.push([42 - wingW, 44, 42 - wingW, base]);
  strokes.push([58, 44, 58 + wingW, 44]); // wing R
  strokes.push([58 + wingW, 44, 58 + wingW, base]);
  const floors = [56, 68, 80];
  for (const fy of floors) {
    strokes.push([44, fy, 56, fy]); // tower floor lines
    strokes.push([42 - wingW + 2, fy + 6, 40, fy + 6]); // wing windows hint L
    strokes.push([60, fy + 6, 58 + wingW - 2, fy + 6]); // wing windows hint R
  }
  strokes.push([48, top, 48, top - 6]); // flag mast
  return { strokes, arcs, accent: [46.5, top - 6, 7, 4] }; // the flag, accent
}

/** hall — a long domed hall: pediment, dome arc, repeating windows. */
function drawHall(wide: boolean): CardDraw {
  const strokes: Line4[] = [];
  const arcs: Arc9[] = [];
  const base = 92;
  const cornice = 40;
  strokes.push([6, base, 94, base]); // ground
  strokes.push([6, cornice, 94, cornice]); // cornice
  strokes.push([6, cornice, 6, base]); // wall L
  strokes.push([94, cornice, 94, base]); // wall R
  arcs.push([50, cornice, 16, 17, 0, 0, 1, 50, cornice + 0.1]); // the dome
  strokes.push([38, cornice, 38, cornice - 6]); // drum L
  strokes.push([62, cornice, 62, cornice - 6]); // drum R
  strokes.push([36, cornice - 6, 64, cornice - 6]); // drum base
  arcs.push([50, cornice - 8, 3, 3, 0, 0, 1, 50, cornice - 8.1]); // finial
  const n = wide ? 8 : 5;
  const span = 80 / n;
  for (let i = 0; i < n; i++) {
    const wx = 10 + i * span;
    strokes.push([wx, 56, wx + span - 6, 56]); // window head
    strokes.push([wx, 56, wx, 74]); // window L
    strokes.push([wx + span - 6, 56, wx + span - 6, 74]); // window R
    strokes.push([wx, 74, wx + span - 6, 74]); // window sill
    strokes.push([wx + (span - 6) / 2, 56, wx + (span - 6) / 2, 74]); // mullion
  }
  strokes.push([6, cornice + 6, 94, cornice + 6]); // frieze
  return { strokes, arcs, accent: [46.5, 78, 7, 14] }; // the center door, accent
}

export function drawComposition(c: CardComposition, ratio: number): CardDraw {
  const wide = ratio >= 1.45;
  switch (c) {
    case 'arcade': return drawArcade(wide);
    case 'courtyard': return drawCourtyard(wide);
    case 'tower': return drawTower(wide);
    case 'hall': return drawHall(wide);
  }
}
