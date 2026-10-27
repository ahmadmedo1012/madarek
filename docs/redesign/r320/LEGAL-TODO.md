# R320 LEGAL-TODO — every `[يُستكمل قبل الإطلاق]` item the §D pages need

Agent GAP · Task c1-GAP · companion to `PAGES-GAP.md` (same crawl, head `5ce0bf04`).
DOCS-ONLY. The rule: **no page invents a legal fact.** What the code proves is
listed here as KNOWN-true; everything else is a row below — each with the page
that needs it, where the truth must come from (the OWNER — a human decision or a
real-world account/registration, never code), and the honest fallback text the
page ships with until the row is filled.

## 1 · The KNOWN-true list (verified in code — pages may state these as facts)

| Fact | Evidence (file:line) |
|---|---|
| **App hosting: Render** (the web service; canonical URL `https://madarek.onrender.com/`) | frontend/index.html:33 (canonical) + 34-48 (OG/Twitter absolute URLs); backend/src/env.ts:37-44 (`RENDER_GIT_COMMIT`, Render's own build env); backend/scripts/migrate-deploy.mjs:3 («for Render → Neon») |
| **Database hosting: Neon** (managed PostgreSQL; pooled via PgBouncer; cold-starts) | backend/scripts/migrate-deploy.mjs:3, 6 («Neon pooler URL (PgBouncer)»), 74 («Neon cold-start can take 20-30s»), 227-230 (Neon suspended/allow-list diagnostics) |
| **AI: opt-in, OpenAI-compatible, env-configured** — `AI_PROVIDER` (only `'openai'` transport mode exists), `AI_BASE_URL` (defaults `https://api.openai.com/v1`), `AI_API_KEY`, `AI_MODEL`, `AI_MODELS` (OpenRouter free-model list). When NOT configured the platform runs a LOCAL composer (`model='gap-aware-composer'`, 0 tokens — clearly labelled, never a fake LLM). OpenRouter routing gets the honest `openrouter` label; known hosts labeled `openai`/`openrouter`/`groq`, unknown hosts by hostname | backend/src/env.ts:73-102, 129-130; backend/src/lib/ai.ts:2-35 (mode contract), 365-380 (`providerLabelFromBaseUrl`), 351-352 (`OPENROUTER_REFERER = 'https://madarek.onrender.com'`), 599-609 (provider resolution); surfaced at `GET /api/v1/ai/config` (ai.routes.ts:665-681) |
| **Mail: NO provider exists** — zero nodemailer/SMTP/Resend/SendGrid/Mailgun refs in backend/src + backend/package.json (verified by search). Nothing in the platform sends email today | backend/package.json (no mail dep); backend/src/** (no transport code) |
| **File storage: env-selected driver** — `STORAGE_DRIVER ∈ {local, s3, postgres}` default `local` (dev-only; Render's filesystem is ephemeral); `s3` = any S3-compatible store (AWS S3 / Cloudflare R2 / MinIO); `postgres` = BYTEA in the app's own Neon DB (the stated Render-Free pilot trade-off) | backend/src/lib/storage.ts:1-19; backend/src/env.ts:53, 111-120 |
| **Uploaded content today: research papers + course materials** (`papers/`, `materials/` namespaces → `GET /api/v1/files/...`) | backend/src/lib/storage.ts:3-5; backend/src/http/routes/files.routes.ts:556, 609 |
| **Web storage: exactly 8 localStorage keys + 1 httpOnly cookie** (the full table with purposes + consent classes) | PAGES-GAP.md §2 (each key cited to ConsentBanner.tsx / theme.store.ts / useThemeProfileSync.ts / auth.store.ts / ui.store.ts / DocumentViewerPage.tsx / ProfilePage.tsx; cookie `mdrk_refresh` to auth.routes.ts:20-35) |
| **No analytics, no third-party scripts, no ad/tracking pixels** — index.html loads self-hosted fonts only | frontend/index.html:65-69 |
| **The demo institution is synthetic** («جامعة مدارك التجريبية» — fully artificial, display data only) | frontend/src/pages/LandingPage.tsx:1346-1350; backend/prisma/seed.ts (the seeded university); index.html:53-63 (JSON-LD says it in machine-readable form too) |
| **Auth/session mechanics**: argon2 password hashing; access JWT 15m + refresh JWT 7d (`env.ts:191-192`) in an httpOnly+`sameSite=strict` cookie scoped to `/api/v1/auth`; per-IP auth rate limit + per-user lockout; password policy 12-72 chars + blocklist | auth.routes.ts:20-35, 94-131; env.ts:191-192; hooks/useChangePassword.ts:49-55; middleware/rateLimit.ts; lockout.ts |
| **No certifications exist** — no GDPR/ISO/SOC2/registered-entity claim anywhere in the repo (the pages must not add one) | (absence — verified by search) |

## 2 · The TODO rows — `[يُستكمل قبل الإطلاق]`

| # | Needed fact | Page(s) that need it | Where the truth must come from | Honest fallback text until filled |
|---|---|---|---|---|
| 1 | **Operator legal identity** — the person/entity operating «مدارك» (legal name, or a deliberate decision to operate unnamed at launch) | `/legal/terms` (المشغّل), `/legal/privacy` (الجهة المسؤولة), `/legal/security`, `/about` | OWNER — a real registration or an explicit launch decision | «تُشغَّل مدارك حاليًا كمشروع تقني تجريبي مستقل؛ الهوية القانونية للمشغّل [يُستكمل قبل الإطلاق].» |
| 2 | **Jurisdiction / governing law** (country of operation for legal purposes) | `/legal/terms` (القانون الحاكم), `/legal/privacy` | OWNER | «[يُستكمل قبل الإطلاق]» — the footer keeps only the honest demo-university + country display (LandingPage.tsx:1414-1418), which is NOT a legal domicile |
| 3 | **Real contact channel** (a working email or form inbox a human reads) | `/contact`, `/legal/privacy` (التواصل), `/legal/security` (responsible disclosure), `/help` | OWNER — a real inbox/account | The current truth: «التسجيل المبكر من صفحة البداية هو قناة التواصل المتاحة حاليًا — لا بريد عام في مرحلة الإطلاق التجريبي» (LandingPage.tsx:1426-1427) |
| 4 | **Data-retention periods** — how long accounts, messages, notifications, AI conversations, uploaded files, and audit-log rows are kept; the deletion pipeline (none exists today) | `/legal/privacy` (مدة الاحتفاظ), `/settings` (تصدير بياناتي/حذف الحساب) | OWNER — a policy decision + (later) a retention job | Honest mechanics only: session tokens 15m/7d, consent record kept until re-decision, reset token 30 min (once P0 ships); «سياسة الاحتفاظ بالبيانات وطلب حذف الحساب [يُستكمل قبل الإطلاق] — حتى ذلك الحين تُعامل جميع البيانات كبيانات عرض تجريبية» |
| 5 | **Which AI provider is actually configured in production** (OpenAI direct? OpenRouter? none/local-only at launch?) — the mechanism is KNOWN (§1) but the operator's choice is a fact only the owner can state | `/legal/privacy` (الأطراف الثالثة), `/legal/data`, `/help` | OWNER — states which env is live in production | «تعمل المساعدة الذكية عبر مزوّد متوافق مع OpenAI يُحدَّد بالإعداد؛ عند تعطيله تعمل أداة محلية بسيطة دون إرسال أي بيانات لمزوّد خارجي — المزوّد الفعلي [يُستكمل قبل الإطلاق].» |
| 6 | **AI data-processing terms** — whether chat content is used for training, and the provider's data policy link | `/legal/privacy` (الأطراف الثالثة) | OWNER + the chosen provider's published terms | «[يُستكمل قبل الإطلاق]» — do NOT copy any vendor's marketing claims |
| 7 | **Mail provider + credentials** (SMTP/Resend/SendGrid/… — nothing exists today, §1) | `/auth/forgot-password` (real delivery), email-verification states (P2-2) | OWNER — a real provider account + env keys | Dev-inbox mode: `@test.ly` targets show the reset link on-screen labelled «وضع الاختبار» (PAGES-GAP.md §5); every other domain gets the honest «البريد الفعلي غير مهيَّأ بعد [يُستكمل قبل الإطلاق]» + the contact channel |
| 8 | **Sending identity** — the from-address, display name, and SPF/DKIM setup for the mail above | forgot-password emails (7) | OWNER (DNS access on the sending domain) | (same row as 7 — no email is sent until this is real; never send from an unauthenticated address) |
| 9 | **Each policy's «آخر تحديث» date** — the owner signs off each policy's text at launch | every `/legal/*` page | OWNER — content sign-off | The build stamps the real date each page lands; a pre-launch review pass re-stamps at launch |
| 10 | **Accessibility conformance target** — the standard/level the owner commits to (e.g. WCAG 2.1 AA) and whether a formal audit will happen | `/legal/accessibility` | OWNER — a commitment, not a claim | Describe ONLY what ships (skip links, aria grammar, 44px targets, reduced-motion, contrast gates — PAGES-GAP.md P1-2) + «لم يُجرَ تقييم رسمي لإمكانية الوصول بعد؛ الالتزام المستهدف [يُستكمل قبل الإطلاق]» |
| 11 | **Responsible-disclosure policy** — scope, safe-harbour terms, response expectations | `/legal/security` | OWNER | Real shipped controls only (§1 auth facts) + «قناة الإبلاغ: [تتبع البند 3]؛ سياسة الإفصاح المسؤول التفصيلية [يُستكمل قبل الإطلاق]» |
| 12 | **Data export/delete request handling** — who fulfils requests and in what turnaround | `/settings` (تصدير بياناتي/حذف الحساب), `/legal/privacy` (حقوقك) | OWNER | Request-only form routed to the contact channel (3) + «آلية التنفيذ ومدة الاستجابة [يُستكمل قبل الإطلاق]» |
| 13 | **@test.ly dev-inbox in production** — keep (labelled test mode) or retire once real mail (7/8) is live | `/auth/forgot-password` | OWNER — an operational decision | Test mode stays visibly labelled; retiring it is one flag once mail is real |
| 14 | **About-page identity copy** — what may be said about who builds مدارك (background, funding, team — or explicitly nothing) | `/about` | OWNER | The independence paragraph verbatim (LandingPage.tsx:1346-1350): «منصّة تعليمية تقنية مستقلّة، عربية أولًا. لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها…» — nothing added |
| 15 | **`SECURITY.txt`** (`.well-known/security.txt` — the standardized disclosure contact file) | public/ static file (pairs with 11) | OWNER (needs the real contact from 3) | Ship only when row 3 is real — an invented address in a security.txt is worse than none |
| 16 | **Content licence** — the licence users' submissions and the platform's own rendered art/content ship under (R320 §D build: the pages state ownership honestly and stay silent on the licence) | `/legal/terms` (المحتوى) | OWNER — a real licence decision (e.g. all-rights-reserved vs CC) | «ما ترفعه وتكتبه أنت يبقى لك» + the synthetic-data disclosure; no licence named until the owner picks one |
| 17 | **Suspension / termination policy** — when an account may be suspended or terminated, and by whom (the platform ships per-user `isActive` + lockout mechanics, but no published policy) | `/legal/terms` | OWNER — a policy decision | Omitted entirely at this build — nothing is stated that no one has decided |
| 18 | **Contact response window** — the committed SLA for answering the early-access channel | `/contact`, `/help` | OWNER — an operational commitment | «نافذة الرد الملتزمة [يُستكمل قبل الإطلاق]» — no response-time promise until a real one exists |

## 3 · Rules for filling a row

1. The owner's answer is written INTO the page copy and the `[يُستكمل قبل الإطلاق]`
   marker is removed — the row here is then struck through (~~…~~) with the
   fill date, so this file stays the audit trail of what was decided when.
2. A row may NEVER be filled from a template, a vendor's marketing page, or
   another company's policy — only from the owner's real decision/account/registration.
3. If a fact changes in code (provider switched, mail added), the §1 KNOWN-true
   list is updated in the same commit as the code change — the two docs travel
   together (this file + PAGES-GAP.md §2's key table are the pages' sources of truth).
4. No PAT/token/credential ever lands in either file — only provider NAMES and
   public URLs.

## 4 · The R320 §D build note (c2-LEGAL) — every page marker → its row

The nine public sheets shipped at R320 §D (branch `r320/legal`) carry
`LEGAL_UPDATED = 2026-10-27` (row 9's interim rule: the build stamps the
real date; the pre-launch review pass re-stamps). Every
`[يُستكمل قبل الإطلاق]` marker the pages render maps to exactly one row
above — the unit belt (`frontend/tests/unit/legal-pages.test.tsx`) pins
this mirror so a page marker can never appear without its TODO row:

| Page (sheet code) | Markers on the page → TODO rows |
|---|---|
| `/legal/privacy` [L-01] | مدة الاحتفاظ → 4 · حقوقك (التنفيذ) → 12 · مزوّد الإنتاج → 5 · شروط معالجة المحادثات → 6 · (التواصل cites row 3's honest channel) |
| `/legal/terms` [L-02] | الهوية القانونية للمشغّل → 1 · القانون الحاكم → 2 · المحتوى silent → 16 · الإيقاف/الإنهاء silent → 17 |
| `/legal/cookies` [L-03] | none — the storage inventory is all KNOWN-true (§1) |
| `/legal/accessibility` [L-04] | الالتزام المستهدف + لا تقييم رسمي → 10 |
| `/legal/security` [L-05] | سياسة الإفصاح التفصيلية → 11 · (قناة الإبلاغ tracks row 3) |
| `/legal/data` [L-06] | سياسة الاحتفاظ → 4 · (المزوّد tracks row 5) |
| `/about` [C-04] | من يبنيها → 14 · (الهوية tracks row 1) |
| `/help` [C-05] | none — every FAQ answer cites a real shipped surface (استرجاع كلمة المرور states the honest no-mail truth per rows 3/7) |
| `/contact` [C-03] | نافذة الرد الملتزمة → 18 · (القناة نفسها is row 3's honest fallback verbatim) |

Static identity shipped with the suite: `public/robots.txt` (the five
authed trees disallowed), `public/sitemap.xml` (16 public routes),
`public/manifest.webmanifest` + `brand/icon-{180,192,512}.png` (rendered
from the one brand mark), `index.html` manifest + apple-touch-icon links.
`SECURITY.txt` (row 15) deliberately NOT shipped — an invented address
in a security.txt is worse than none.
