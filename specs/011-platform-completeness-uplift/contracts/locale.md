# Contract — Locale & i18n

**Endpoint group**: `/api/v1/me/locale`, static `/i18n/<locale>.json`
**Auth**: Bearer access token (existing) for the PATCH endpoint; static catalogs are public.
**Backs**: FR-038..FR-041 (US7), R-003.

---

## `GET /api/v1/me`

Existing endpoint, augmented to include `locale`:

```json
{
  "data": {
    "id": "ckxxx",
    "email": "student@uoz.edu.ly",
    "role": "STUDENT",
    "locale": "AR"
  }
}
```

Frontend uses `data.locale` to bootstrap the i18next runtime on hydration.

---

## `PATCH /api/v1/me/locale`

Update the authenticated user's persisted UI language.

**Body**:

```json
{ "locale": "EN" }
```

`locale` ∈ `{"AR", "EN"}`.

**Response 200**:

```json
{ "data": { "locale": "EN" } }
```

**Errors**:

| Code | Meaning |
|---|---|
| `INVALID_LOCALE` (400) | Body value not in enum. |
| `RATE_LIMITED` (429) | Capped at 30 changes/minute per user. |

The server writes an `AuditLog` entry `{ action: "LOCALE_CHANGED", from, to }` for every successful change (constitution principle VII).

---

## Static catalog endpoint

Locale message catalogs are served as static JSON from the SPA host:

```
GET /i18n/ar.json
GET /i18n/en.json
```

**Response headers**:

```
Cache-Control: public, max-age=31536000, immutable
Content-Type: application/json
```

Catalogs are versioned by content hash in the URL during production build (`/i18n/ar.<hash>.json`) so the immutable cache header is safe. The Vite build emits the catalogs as separate chunks under `frontend/dist/i18n/` and the static-file middleware serves them with the headers above.

**Catalog shape** (canonical Arabic file):

```json
{
  "common": {
    "save": "حفظ",
    "cancel": "إلغاء",
    "skip_to_main": "تخطّى إلى المحتوى الرئيسي"
  },
  "nav": {
    "home": "الرئيسية",
    "courses": "المقررات",
    "faculties": "الكليات"
  },
  "notifications": {
    "title": "الإشعارات",
    "mark_all_read": "تعليم الكل كمقروء",
    "empty.title": "لا توجد إشعارات",
    "grade_posted.title": "تم نشر درجة جديدة",
    "grade_posted.body": "تلقيتَ {grade} درجة في {courseTitle}"
  },
  "search": {
    "placeholder": "ابحث عن مقرر أو كلية أو محاضرة",
    "no_results.title": "لا توجد نتائج",
    "no_results.body": "جرّب صياغة أخرى أو تحقق من الإملاء"
  },
  "auth": {
    "remember_me": "ابقني مسجَّل الدخول",
    "step_up.title": "أكّد كلمة المرور للمتابعة"
  }
}
```

The English catalog mirrors keys exactly; missing keys fall back to Arabic at runtime with a console warning in development (caught by the `check-i18n-coverage.sh` CI guard).

---

## i18n key conventions

Keys follow a flat-with-namespace pattern: `<namespace>.<subnamespace>.<id>` lower-snake.

1. Namespace by surface: `common`, `nav`, `auth`, `dashboard`, `course`, `lecture`, `assignment`, `notifications`, `search`, `profile`, `settings`, `errors`.
2. Subnamespaces are flat dot-separated, NOT nested objects, to keep grep-ability high.
3. Every key documented in the canonical Arabic file is required in the English file.
4. Notification i18n keys live under `notifications.<category>.title` / `.body` and are emitted by the server on the wire (see `notifications.md`).

The CI guard `scripts/check-i18n-coverage.sh` does three things:

1. Greps every `.tsx` for literal Arabic / English strings in JSX text or attribute positions and fails on any not wrapped in `t(...)`.
2. Compares key sets across `ar.json` and `en.json` and fails on any divergence.
3. Verifies that every key referenced in code (via `t('foo.bar')`) exists in both catalogs.

---

## Direction handling

The `<html dir>` attribute is computed from the active locale:

| Locale | `dir` | `lang` |
|---|---|---|
| `AR` | `rtl` | `ar` |
| `EN` | `ltr` | `en` |

Switching is performed by `frontend/src/i18n/runtime.ts` immediately on locale change; CSS that depends on direction uses logical properties (`margin-inline-start`) where the existing `tokens.css` already supports them.

---

## Locale resolution at first paint

Resolution order on the very first request (no `User.locale` known yet because no session):

1. If the URL contains `?lang=ar|en`, use it transiently (do not persist).
2. Else if `document.cookie` contains `mdrk_locale=ar|en` (set by a previous session on this device), use it.
3. Else use `navigator.languages[0]` matched against `{AR, EN}` (default `AR` if neither matches).
4. After authentication, the value is replaced by `User.locale` from `GET /api/v1/me`.

The `mdrk_locale` cookie is **not** http-only (it must be readable by the bootstrap script in `index.html`), is set with `SameSite=Lax`, and has a 1-year `Max-Age`.

---

## Test surface

1. Default user → `GET /me` returns `locale: AR`.
2. PATCH `EN` → `GET /me` returns `locale: EN`; AuditLog written.
3. PATCH invalid value → 400 `INVALID_LOCALE`.
4. Catalog GET responds with immutable cache header.
5. Bootstrap with no cookie + `Accept-Language: en` → first paint is English.
6. Bootstrap with `?lang=en` URL → first paint is English regardless of cookie.
7. Direction flip on locale switch leaves no clipped layout in any of the nine inventoried skeleton routes (manual smoke).
