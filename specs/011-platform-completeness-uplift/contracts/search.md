# Contract — Search

**Endpoint group**: `/api/v1/search`
**Auth**: Bearer access token (existing); accessible to any authenticated role.
**Backs**: FR-019, Clarification 5, R-004.

---

## `GET /api/v1/search`

Run a global search across course titles, faculty names, and lecture titles using the canonical Arabic-aware normalizer + substring + ≥4-char trigram fuzzy matching.

**Query**:

| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | required | Raw user query, 1..200 chars. Empty / whitespace-only returns 400. |
| `types` | comma-separated of `course,faculty,lecture` | all three | Restricts result categories. |
| `limit` | integer 1..50 | 20 | Maximum total results. |
| `locale` | `ar` \| `en` | from `User.locale` | Used only for tie-breaking; the index is locale-agnostic. |

**Response 200**:

```json
{
  "data": {
    "query": "خوارزم",
    "queryNormalized": "خوارزم",
    "results": [
      {
        "type": "course",
        "id": "ckxxx",
        "titleAr": "خوارزميات متقدمة",
        "titleEn": "Advanced Algorithms",
        "facultyNameAr": "هندسة البرمجيات",
        "route": "/courses/ckxxx",
        "score": 1.0,
        "matchKind": "EXACT_SUBSTRING"
      },
      {
        "type": "lecture",
        "id": "ckyyy",
        "title": "خوارزمية الفرز السريع",
        "courseTitleAr": "خوارزميات متقدمة",
        "route": "/courses/ckxxx/lectures/ckyyy",
        "score": 0.83,
        "matchKind": "EXACT_SUBSTRING"
      },
      {
        "type": "faculty",
        "id": "ckzzz",
        "nameAr": "العلوم الرياضية",
        "nameEn": "Mathematical Sciences",
        "route": "/colleges/mathematical-sciences",
        "score": 0.31,
        "matchKind": "TRIGRAM_FUZZY"
      }
    ]
  }
}
```

**Empty result**:

```json
{ "data": { "query": "...", "queryNormalized": "...", "results": [] } }
```

The frontend renders the empty-state copy keyed under `search.no_results.title` / `search.no_results.body` (FR-019, US3 acceptance #6).

---

## Canonical normalization algorithm

Both indexed text (write-time) and incoming queries (read-time) pass through the **identical** function exposed at `backend/src/modules/search/normalize.ts` (and re-exported at `frontend/src/lib/search.ts` for highlighting):

```ts
export function normalizeArabicSearch(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, '')      // strip Arabic diacritics
    .replace(/ـ/g, '')                      // strip tatweel
    .replace(/[آأإٱ]/g, 'ا')  // alif variants → ا
    .replace(/ؤ/g, 'و')                // ؤ → و
    .replace(/ئ/g, 'ي')                // ئ → ي
    .replace(/ء/g, '')                      // hamza dropped
    .replace(/ى/g, 'ي')                // ى → ي
    .replace(/ة/g, 'ه')                // ة → ه
    .trim();
}
```

The function is pure and deterministic. The `ال` definite-article tolerance is **not** applied here — it is applied at match time as described below (the index stores the literal normalized form so we can match either with or without `ال`).

---

## Match strategy

Given a normalized query `qN`:

1. Compute `qN_noAl` by stripping a leading `ال` if present.
2. **Substring match phase** — for each entity type in scope, run:
   ```sql
   SELECT * FROM "<Entity>"
   WHERE searchable_normalized ILIKE '%' || $qN || '%'
      OR searchable_normalized ILIKE '%' || $qN_noAl || '%'
   LIMIT $limit;
   ```
3. **Fuzzy phase** — only if `length(qN) >= 4`:
   ```sql
   SELECT *,
          GREATEST(
            similarity(searchable_normalized, $qN),
            similarity(searchable_normalized, $qN_noAl)
          ) AS sim
   FROM "<Entity>"
   WHERE searchable_normalized % $qN
      OR searchable_normalized % $qN_noAl
   ORDER BY sim DESC
   LIMIT $limit;
   ```
4. **Merge** — union the results with substring matches scored 1.0 (exact) and trigram matches scored by `sim`. Dedupe by `(type, id)`. Order by `score DESC`, then by `length(searchable_normalized) ASC` (shorter titles bubble up), then alphabetical.

The `match_kind` returned to the client distinguishes `EXACT_SUBSTRING` from `TRIGRAM_FUZZY` for UI emphasis.

---

## Performance budget

1. P95 < 250 ms server-side on the warm path (covers FR-019's 250 ms debounce window).
2. The trigram phase is gated by `length(qN) >= 4` to keep short-prefix queries cheap.
3. With `pg_trgm` GIN indexes on `Course.searchable_normalized`, `Faculty.searchable_normalized`, `Lecture.searchable_normalized` and a corpus of ~30K rows total, the single-query plan is index-only. Verified during implementation by `EXPLAIN ANALYZE`.

---

## Errors

| Code | Meaning |
|---|---|
| `EMPTY_QUERY` (400) | `q` is missing, empty, or whitespace-only after normalization. |
| `INVALID_TYPE` (400) | `types` contained a value other than `course,faculty,lecture`. |
| `RATE_LIMITED` (429) | Search rate-limited at 60 queries/minute per user. |

---

## Test surface

The full acceptance matrix for FR-019 + Edge Case #6:

| Query | Expected match in seeded fixtures |
|---|---|
| `خوارزميات` | Course "خوارزميات متقدمة" (EXACT_SUBSTRING, score 1.0) |
| `خوارزم` | Same course (EXACT_SUBSTRING; substring matches the prefix) |
| `الخوارزميات` (with `ال`) | Same course (substring against `qN_noAl`) |
| `خوارزميه` (taa-marbuta variant) | Same course (taa-marbuta folded to ه, matches "خوارزميات" → "خوارزميات" yields `خوارزميات`-not-quite — actually matches via trigram fuzzy if length ≥ 4; verify) |
| `خوارزِميَات` (vocalized) | Same course (diacritics stripped) |
| `خوارمزيات` (transposition) | Same course (TRIGRAM_FUZZY at length 9) |
| `Cisco` | Lecture "Cisco Networking" (EXACT_SUBSTRING; case-insensitive) |
| `cis` (length 3) | Same lecture via substring (length 3 short-circuits trigram, but substring still matches) |
| `xyz` | Empty results |
| ` ` (whitespace only) | 400 EMPTY_QUERY |

Tests live at `backend/src/modules/search/search.test.ts` (when introduced). The normalizer alone is unit-tested with property-based tests for idempotency: `normalize(normalize(s)) === normalize(s)` for every fixture.

---

## Future extensions (out of scope for spec 011)

1. Full-text search across lecture transcripts and material content.
2. Filtering by faculty / department / term.
3. Personalized ranking (re-rank by enrollment, recency).
4. Cross-language matching (English query matching Arabic title via translation).

These are tracked separately and do not affect the v1 contract above.
