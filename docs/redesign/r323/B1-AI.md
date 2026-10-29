# R323 · B1.1 — the AI assistant on a real model

> The owner-facing operator doc: what to set, what it costs, what the user sees.
> The honest-local rule holds everywhere: **a rule-based reply never wears an LLM badge.**

## What changed

- `backend/src/lib/ai.ts` now runs an ordered **model fallback chain** over any
  OpenAI-compatible provider (OpenRouter, Groq, DeepSeek, OpenAI itself):
  on 429 / 5xx / timeout it moves to the next model in `AI_MODELS` with
  exponential backoff + jitter (≤2 retries per model, per-model timeout).
- The chat route streams **Server-Sent Events** (`token` deltas → `done` → typed
  `error`), with the non-streaming JSON path preserved for older clients.
- **Cost control** (a budget guard, not a security layer): `AiQuota` counts
  per-user daily asks (CAS day roll-over); `AiBudget` counts the platform's
  monthly tokens — real provider usage only, honest zeros in local mode.
- The UI (`AiAssistantPage`) streams tokens into the bubble with **stop /
  regenerate / copy / thumbs up-down**; the quota state «وصلتَ حدّ اليوم» is an
  Arabic card, and the local mode badge reads «الوضع المحلي (قواعد جاهزة)».

## Production env vars (Render → Environment)

| Var | Example | Notes |
|---|---|---|
| `AI_PROVIDER` | `openai` | `local` (default) keeps the rule-based composer |
| `AI_BASE_URL` | `https://openrouter.ai/api/v1` | keep the version suffix; any OpenAI-compatible host |
| `AI_API_KEY` | *(secret)* | provider key — set via Render's secret files/env, never in git |
| `AI_MODEL` | `meta-llama/llama-3.3-70b-instruct:free` | the primary model id |
| `AI_MODELS` | `meta-llama/llama-3.3-70b-instruct:free,deepseek/deepseek-chat-v3-0324:free` | ordered fallback chain (≤3 recommended) |
| `AI_TIMEOUT_MS` | `45000` | per-model round-trip ceiling |
| `AI_DAILY_LIMIT_DEFAULT` | `25` | per-user daily asks |

Free-router note: OpenRouter's `:free` models are rate-limited and best-effort —
fine for the pilot; the chain exists precisely so a throttled free model falls
through to the next one.

## Migration

`backend/prisma/migrations/20261029013000_r323_ai_quota` is purely additive
(AiQuota / AiBudget / AiFeedback). `npm run db:deploy` applies it on Render;
no data migration is needed.

## Telemetry & honesty

`AiTelemetry` records model, latency and tokens **from real usage only** — the
owner dashboard card shows the truth, and the local mode's zeros are real zeros.

## What comes next (B1.2+)

Grounded answers (RAG over course materials with timestamps/page citations),
role prompts (Socratic tutor / teacher co-pilot / registrar helper), the
«اسأل عن هذه اللحظة» player hook, and `scripts/ai-eval/` (≥60 Arabic cases,
LLM-judged) — each lands with its own E2E per the brief.
