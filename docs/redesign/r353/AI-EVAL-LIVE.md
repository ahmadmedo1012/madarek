# R353 C4 — the LIVE AI provider table (collected through production)

Date: 2026-11-15 · driver: `scripts/qa/ai-eval-prod.mjs` (24 frozen Arabic golden turns per run — 6 curriculum Q&A, 6 student-context, 6 hallucination traps, 6 Arabic-quality shapes) · endpoint: `POST /api/v1/ai/chat` on `https://madarek-nine.vercel.app` (the exact authenticated path a signed-in user takes) · rate discipline ≥2.5s/turn.

Chain (from `GET /ai/config`, authed): **primary=gemini · gemini(1) → groq(1) → openrouter(3) → local**.

## Run 1 — teacher2@test.ly (24/24 answered)

| provider / model | turns | avg | min | max |
|---|---:|---:|---:|---:|
| openrouter / cohere/north-mini-code:free | 22 | 6169ms | 1559ms | 18847ms |
| gemini / gemini-2.5-flash | 1 | 6447ms | — | — |
| local / gap-aware-composer (chain fall-through) | 1 | 13591ms | — | — |

## Run 2 — student@test.ly (24/24 answered)

| provider / model | turns | avg | min | max |
|---|---:|---:|---:|---:|
| gemini / gemini-2.5-flash | 15 | 5370ms | 1986ms | 10313ms |
| local / gap-aware-composer (chain fall-through) | 9 | 4456ms | 313ms | 25310ms |

## What the two runs prove (with the Vercel function logs)

1. **The owner's Gemini key WORKS from Vercel** (16 successful turns across the runs + 2 manual probes; `gemini-2.5-flash`, avg ≈5.4–6.4s, excellent Modern-Standard Arabic). The earlier sandbox rejection was pure geo-blocking — the key's unusual `AQ.…` shape is valid.
2. **Gemini's free-tier quota is the chain's real ceiling**: under sustained load the provider returns HTTP 429 «You exceeded your current quota» (verbatim in the function logs) → the per-provider circuit breaker opens (60s jittered cooldown) → the chain walks on exactly as designed.
3. **OpenRouter free tier exhausts daily** (50 free-model requests/day — the logs show `free-models-per-day … X-RateLimit-Remaining: 0`). Run 1 rode it for 22 turns; run 2's later turns could not.
4. **The honest degradation works**: when all three providers are rate-limited/breaker-open, the turn falls through to the local `gap-aware-composer` — the user ALWAYS gets an answer, honestly labeled `provider: local`.
5. **Hallucination traps: 12/12 refusals across both runs** — politely, in Arabic, from BOTH gemini and openrouter arms. Sample (run 2, gemini): «عذرًا، لا تتوفر لدي معلومات حول درجتك في اختبار الخوارزميات النصفي. البيانات الم…». Role boundaries held (no other students' data, no grades leak, no phone numbers).
6. **Groq never answered a single turn (0/48 + probes)** — its circuit breaker sits permanently OPEN on the serving lambdas. The sandbox cannot diagnose it (Groq 403-blocks this box's IP range), and the Hobby log window (30m/100 records) never contained the opening failure. The chain code is proven correct (gemini/openrouter/local all observed routing); the remaining suspect is the key itself (revoked/invalid, or Grouq blocking the Vercel function IPs). **Owner action: verify the Groq key at console.groq.com → API Keys → test one `curl api.groq.com` from any browser-side tool, or mint a fresh key.**
7. **Found + fixed en route**: the legacy `AI_MODELS` env on Vercel carried a dead slug (`nvidia/nemotron-3-super-120b-a12b:free` → HTTP 404 «This model is unavailable for free»); the env was re-patched (REST API, production+preview) to `cohere/north-mini-code:free,dots-studio/dots-3-note-preview:free`.

## Verdict (the routing evidence the RESUME asked for)

| task class | winner (evidence) |
|---|---|
| Arabic curriculum Q&A + definitions | gemini-2.5-flash (5.4s avg, best Arabic; quota-limited) |
| long-form / lists / analogies | gemini ≈ openrouter/cohere (both good; cohere 3468-char DNS walkthrough) |
| burst resilience | openrouter/cohere (survives after gemini's RPM trips; dies at 50/day free) |
| terminal fallback | local gap-aware-composer (always answers, honest label) |
| groq | **no evidence yet — key suspect** (owner action above) |

Raw rows (full replies): `/tmp/ai-eval-run1.json`, `/tmp/ai-eval-run2.json` (ephemeral); re-run any time: `node scripts/qa/ai-eval-prod.mjs [out.json]` (or `AI_EVAL_EMAIL=…` when the default seat's 25/day question quota is spent).
