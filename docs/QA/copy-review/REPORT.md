# Copy QUALITY review — R356 Lane 2a/2b (the editor's verdict)

Method: `pack.md` (this directory) generated from `git diff e83a3da6~1..HEAD` —
every Arabic line the R355 diet removed or added across all 63 touched page
files (2,011 removed / 1,499 added source lines). Read end-to-end as a native
Arabic editor against the eight failure classes from the brief:

1. broken grammar/spelling — **none found** (the diet even fixed a pre-existing
   typo: «تُراجع هذه الصاسة» → «تُراجع قبل الإطلاق»)
2. lost meaning / dropped required info — **one real finding, fixed** (below)
3. truncated sentences — none (shortened sentences remain complete)
4. English leftovers — none (Latin strings are intentional: model names,
   `argon2`, `mdrk_refresh`, `@test.ly`, code identifiers)
5. inconsistent Libyan-education terms — consistent throughout
   (المسجل العام، الكلية، القسم، الشعبة، المقرّر، مراقب الامتحانات)
6. wrong tone — none (helpers stay معكّم/موجز, errors stay actionable)
7. errors still say what to do — verified across the pack (e.g.
   «تعذّر النشر.» → the toast still names the action; validation messages
   keep their bounds: «بين 5 و 480 دقيقة»، «خياران على الأقل»)
8. empty states = 1 line + 1 button — verified (e.g. «لا مقرّرات بعد» +
   «تواصل مع المسجل العام لإكمال التسجيل.»)

## The finding (fixed in this commit)

**Legal truth drift (pre-diet, caught by this review):** the privacy page's
«أين يُخزَّن» section still named **Render** as the web host — stale since the
Vercel cutover (Render is the suspended standby). Fixed: `Render` → `Vercel`
in `LegalPages.tsx`; the real-facts pin in `legal-pages.test.tsx` follows the
same truth (the pin's documented intent — "the REAL facts per page" — was
always the LIVE host). 90/90 legal tests green after the change.

## Lane 2b — legal substance preserved (compared with the pre-diet version)

| required element | survived the diet? |
|---|---|
| purpose | ✅ «لغرض واحد: تشغيل منصّة تعليمية تجريبية» |
| data collected | ✅ account fields, student/teacher academic fields, content, audit log — every category from the pre-diet text |
| where stored | ✅ (now truthful: Vercel + Neon + operator-defined store) |
| retention | ✅ 15m/7d tokens + `[يُستكمل قبل الإطلاق]` for the full policy |
| rights | ✅ edit profile/password (kills sessions) + export/delete channel (§08) |
| third parties | ✅ the AI-assistant disclosure (provider list openai/openrouter/groq, local fallback) — every sub-point intact |
| contact | ✅ early-registration channel + contact page link |
| jurisdiction | ✅ operator legal identity + governing law as honesty markers |
| the 9-key storage ledger | ✅ verbatim table (keys, purposes, purge behavior) |

## Accepted shortenings (read, judged, kept)

- Owner-facing confirm dialogs lost their "no undo" clauses (e.g.
  «سيُغلَق التنبيه نهائيًّا ويُسجَّل الحل باسمك.») — the title still carries
  the finality; owner tools, acceptable.
- KPI `hint` sub-lines that restated the label (e.g. «حسابات مسجَّلة» under
  «إجمالي المستخدمين») — pure duplication, correctly cut.
- The unit-form arrays shortened consistently (e.g. «مقرّر مسجَّل واحد» →
  «مقرّر مسجَّل») — grammatical in all four Arabic plural forms used.

## Mobile note

The R355 diet touched web pages only; apps/mobile screens were NOT edited
(the mobile ratchet was born from a census, not a diet) — the sub-agent-edit
risk class does not apply there. Mobile copy quality rides its own ratchet
(13,056 words, no-growth law) + the emulator ledger (Lane 2c, in flight).

## Ceilings

No ceiling moved. The one text change (Render→Vercel) is a Latin 1:1 swap —
outside the Arabic-word budget entirely.
