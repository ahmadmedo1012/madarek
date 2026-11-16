# MAIL — the Resend setup, the current truth, and the owner checklist

> R352 M-lane. Evidence law: every claim below carries a command + result.
> R357 L3 update: the production-function send is now PROVEN (row below).

## Current state (verified 2026-11-16, R357 L3)

| item | value | evidence |
|---|---|---|
| Provider | Resend | `MAIL_PROVIDER=resend` on the Vercel `madarek` project (production scope); `mailProvider: "resend"` on live `/api/v1/status` |
| API key | **send-only** (restricted) | `GET api.resend.com/domains` → 401 `restricted_api_key` — the key cannot list/manage domains, it can only send |
| Test send (direct API, R352) | **delivered** | `POST /emails` from `Madarek <onboarding@resend.dev>` → ahmadmedo1012@gmail.com → HTTP 200, id `01a1da87-bb40-7518-97b3-a7fb7a3aca55` |
| **Test send (production function, R357 L3)** | **sent, 2.1 s** | `POST /auth/forgot-password {"email":"ahmadmedo1012@gmail.com"}` (2026-11-16 13:43 UTC) → outbox row `reset-password` → `status=sent`, `attempts=1`, `sentAt` +2.1 s, providerId `01a1e499-258a-78c6-9cf6-ccd547edb189` |
| From identity | `مدارك <onboarding@resend.dev>` | MAIL_FROM on production; the ONE logo (brand/icon-192.png, hash-pinned) rides every template header from APP_ORIGIN |
| Templates | RTL Arabic, dark-mode safe, plain-text part, List-Unsubscribe headers | `backend/src/lib/mail.ts` (r350 E5 shell) |
| Outbox | retry + webhook events + suppression | `backend/src/lib/mail-outbox.ts`, `mail-events.ts`; drained by the post-enqueue pass + the 5-min tick (`scripts` → Tick workflow) |

### The SPF/DKIM check is one Gmail click (owner-side)

The R357 L3 send is in the owner's inbox (13:43 UTC, «مدارك — رابط إعادة
تعيين كلمة المرور»). Open it in Gmail → ⋮ → «إظهار الأصل» — the headers
show `spf=pass` and `dkim=pass` for resend.dev (Resend signs via
amazonses.com). That click is the final delivery receipt; the platform
side (outbox → Resend acceptance, 2.1 s) is proven above.

## The honest limitation (read this once)

`onboarding@resend.dev` is Resend's **shared development sender** — Resend
delivers it **only to the account's own email address** (the owner's
ahmadmedo1012@gmail.com). Any send to another address is refused by Resend
(403) and the outbox records the failure honestly (retry → fail, visible in
the mail-admin surface).

**What works today:** every mail the PLATFORM sends to the OWNER's own
address — assisted-reset links, announcements tests to himself, activation
mails for his own account.

**What needs the owner's action:** real mail to teachers/students/parents
requires a **custom sending domain** (the checklist below). No code change
is needed — only DNS records + one env var flip (`MAIL_FROM`).

## The owner checklist — verifying a custom domain (30 minutes)

1. Buy a domain (e.g. `madarek.ly` / `madarek.com`). ~10–30 $/yr.
2. In Resend → Domains → **Add Domain** → enter it. Resend shows the exact
   records. They are (names may differ slightly per region):
   - **SPF** — TXT on `@`:
     `v=spf1 include:amazonses.com ~all`
   - **DKIM** — two/three CNAMEs (Resend gives per-domain tokens):
     `resend._domainkey.<domain>` → `resend._domainkey.amazonses.com`
     (and the `amrsmtp...` pair Resend lists)
   - **DMARC** — TXT on `_dmarc.<domain>`, start permissive, tighten later:
     `v=DMARC1; p=none; rua=mailto:ahmadmedo1012@gmail.com`
     → after 2–4 weeks of clean reports move to `p=quarantine`.
3. Wait for Resend's "Verified" badge (usually minutes to 48 h).
4. Tell the agent / set on Vercel:
   `MAIL_FROM=مدارك <no-reply@<your-domain>>`
5. Send one test to the owner's inbox, then one to a second inbox you
   control (e.g. an Outlook account) — the second one is the real proof
   (delivery outside the account).

## BIMI (the Gmail avatar) — stated once, plainly

The Gmail sender avatar needs **BIMI + DMARC at enforcement (`p=` set to
quarantine/reject) + usually a paid VMC certificate** (~$1,000+/yr from
Digicert/Entrust). Everything not requiring payment is already shipped:

- the ONE logo asset exists as PNG (mail header) and SVG sources
  (`frontend/public/brand/`), hash-pinned by `scripts/brand/build-assets.mjs`;
- when the custom domain is live, add the BIMI TXT record on
  `default._bimi.<domain>`:
  `v=BIMI1; l=https://<domain>/brand/madarek-mark.svg; a=`
  (the `a=` authority evidence URL stays empty until a VMC is bought —
  Gmail then shows the avatar only for VMC'd senders, other clients may
  show it anyway);
- the SVG must be SVG Tiny P/S format for strict BIMI validators — the
  current `madarek-mark.svg` is plain SVG; convert when the domain is
  real (one command, documented for then).

## Why not configure a domain now?

The owner has no domain yet (the production URL is still
`madarek-nine.vercel.app` — see Z1). Everything is staged so the switch is
**one MAIL_FROM change + DNS records**, zero code.

## Mail links policy

Every template's CTA/links are absolute URLs built from `APP_ORIGIN`
(= `https://madarek-nine.vercel.app` today). When a custom domain lands
(Z1), `APP_ORIGIN` + the canonical/OG/sitemap flip in ONE commit and mail
links follow automatically — no per-template edits.
