# Contract — Notifications

**Endpoint group**: `/api/v1/notifications`
**Auth**: Bearer access token (existing). All endpoints require an authenticated user.
**Backs**: FR-021..FR-026 (US4), R-006.

---

## `GET /api/v1/notifications`

List the authenticated user's notifications, reverse-chronological.

**Query**:

| Param | Type | Default | Description |
|---|---|---|---|
| `since` | ISO 8601 timestamp | omitted | If set, returns only notifications created after this timestamp. Used for SSE-reconnect backfill. |
| `limit` | integer 1..100 | 50 | Page size. |
| `cursor` | string | omitted | Opaque cursor for pagination. |
| `unread` | boolean | omitted | If `true`, only unread notifications. |

**Response 200**:

```json
{
  "data": [
    {
      "id": "ckxxxxx",
      "category": "GRADE_POSTED",
      "titleKey": "notifications.grade_posted.title",
      "titleParams": { "courseTitle": "خوارزميات" },
      "bodyKey": "notifications.grade_posted.body",
      "bodyParams": { "grade": 87 },
      "route": "/courses/abc/assignments/def",
      "createdAt": "2026-06-02T14:22:01.000Z",
      "readAt": null
    }
  ],
  "nextCursor": "eyJpZCI6IjAyOSJ9"
}
```

Notifications are returned with **i18n keys + params** rather than rendered strings, so the client can localize per the user's `Locale` (US7). Existing notifications written before this feature ships continue to expose a `body` plain-text field; clients fall back to it if the keyed form is absent.

---

## `PATCH /api/v1/notifications/:id`

Mark a single notification read or unread.

**Body**:

```json
{ "read": true }
```

**Response 200**:

```json
{ "data": { "id": "ckxxxxx", "readAt": "2026-06-02T14:25:00.000Z" } }
```

`404` if not the authenticated user's notification.

---

## `POST /api/v1/notifications/mark-all-read`

Mark every unread notification of the authenticated user as read.

**Body**: empty.

**Response 200**:

```json
{ "data": { "markedCount": 12 } }
```

---

## `GET /api/v1/notifications/preferences`

Return the user's preference set, with implicit defaults filled in for any missing category.

**Response 200**:

```json
{
  "data": [
    { "category": "LECTURE_UPLOAD",      "inApp": true,  "email": "OFF" },
    { "category": "ASSIGNMENT_DUE_SOON", "inApp": true,  "email": "OFF" },
    { "category": "GRADE_POSTED",        "inApp": true,  "email": "OFF" },
    { "category": "ANNOUNCEMENT",        "inApp": true,  "email": "OFF" },
    { "category": "EXAM_SCHEDULED",      "inApp": true,  "email": "OFF" },
    { "category": "RESEARCH_REVIEWED",   "inApp": true,  "email": "OFF" },
    { "category": "MENTION",             "inApp": true,  "email": "OFF" }
  ]
}
```

---

## `PUT /api/v1/notifications/preferences`

Replace the preference set. The body MUST contain every category; partial updates use the path below.

**Body**:

```json
{
  "preferences": [
    { "category": "GRADE_POSTED", "inApp": true,  "email": "WEEKLY" },
    { "category": "ANNOUNCEMENT", "inApp": false, "email": "OFF" }
  ]
}
```

**Response 200**: same shape as `GET /api/v1/notifications/preferences`.

The server **ignores** the `email` value at delivery time in v1 (Clarification 2) but persists it. UI discloses this with a "coming soon" badge on the email controls.

---

## `PATCH /api/v1/notifications/preferences/:category`

Update a single category's preferences.

**Body**:

```json
{ "inApp": false, "email": "DAILY" }
```

**Response 200**:

```json
{ "data": { "category": "GRADE_POSTED", "inApp": false, "email": "DAILY" } }
```

---

## `GET /api/v1/notifications/stream` (SSE)

Real-time notification stream. Backs FR-025 + R-006.

**Request headers**:

```
Accept: text/event-stream
Authorization: Bearer <access-token>
Last-Event-ID: <last seen notification id, optional>
```

**Response**: `text/event-stream` with no caching:

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

**Events**:

```
: heartbeat                                    ← comment line, every 30s
event: notification
id: ckxxxxx
data: {"id":"ckxxxxx","category":"GRADE_POSTED","titleKey":"...","createdAt":"..."}

event: invalidate
data: {"scope":"unread-count"}                 ← client invalidates the badge query
```

**Reconnection**:

1. The browser's native `EventSource` automatically reconnects on disconnect, sending the last `id:` it saw as `Last-Event-ID:`.
2. The server uses `Last-Event-ID` to backfill any notifications created since.
3. On any 4xx response, the client should NOT auto-retry — `401` triggers the standard 401-refresh interceptor; `403` indicates a revoked session.

---

## Category mapping (existing → new enum)

| Existing `Notification.category` | New `NotificationCategory` |
|---|---|
| `URGENT` (with subtype) | mapped per subtype: `EXAM_SCHEDULED`, `ASSIGNMENT_DUE_SOON` |
| `ACADEMIC` (with subtype) | mapped per subtype: `LECTURE_UPLOAD`, `GRADE_POSTED`, `RESEARCH_REVIEWED` |
| `SYSTEM` | `ANNOUNCEMENT` |
| `SOCIAL` | `MENTION` |

Backfill runs in `011_notification_preference.sql` data step: read existing `Notification.category` (and any subtype payload) and tag rows with the new categorization on first read by the client. No structural change to the existing model.

---

## Errors

| Code | Meaning |
|---|---|
| `NOTIFICATION_NOT_FOUND` (404) | The notification id doesn't belong to the authenticated user, or doesn't exist. |
| `INVALID_CATEGORY` (400) | A body referenced a category not in the `NotificationCategory` enum. |
| `RATE_LIMITED` (429) | Mutating endpoints rate-limited at 60 mutations/minute per user. |
| `STEP_UP_REQUIRED` (403) | (preferences only) Reserved for future use; v1 does not require step-up. |

---

## Test surface

1. List + cursor pagination round-trip.
2. Mark-read and mark-all-read mutate `readAt` correctly.
3. Preferences PUT enforces full coverage of categories; PATCH updates one row only.
4. `inApp = false` for a category prevents new persistence + delivery for that category.
5. Email-cadence values are persisted but no email is sent (v1).
6. SSE: open a stream, write a notification, assert the stream emits within 1 second.
7. SSE: disconnect for 5 seconds, reconnect with `Last-Event-ID`, assert backfill includes notifications written during the disconnect.
8. Heartbeat every 30s prevents proxy idle-disconnect.
