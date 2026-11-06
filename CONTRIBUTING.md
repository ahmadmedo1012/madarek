# المساهمة | Contributing

> مساهمات مدارك تمر عبر جولات عمل منسقة — هذا المستند يوثّق القواعد
> القائمة فعلًا. | Madarek contributions flow through coordinated
> work rounds — this documents the rules in force.

## الإعداد | Setup

انسخ `.env.example` إلى `.env` ثم اتبع خطوات التشغيل في `README.md` (Quickstart).
مدير الحزم: **npm** (workspaces). لا ترفع `.env` أو أي سر حقيقي أبدًا.

Copy `.env.example` → `.env`, then follow the README quickstart. Node `>=20 <25`
(CI pins 22). Never commit `.env` or real secrets.

## اتفاقيات العمل R339 | R339 working agreements

هذه قواعد الجولة الحالية، ملزمة لكل وكيل/مساهم | Binding for every agent
and contributor this round:

1. **بوابة الدفع**: `bash scripts/verify.sh --fast` أخضر قبل كل دفع — هذا
   عقد R337 بعد حادثتي main الأحمر. | `verify.sh --fast` green before every
   push (the R337 contract; full set ~8 min, fast ~4 min).
2. **الاختبارات قانون**: لا يُحذف اختبار ولا يُضعَف تأكيد ليمرّ الكود —
   إن فشل الاختبار فالخلل في الكود. | Tests are law: never delete a test
   or weaken an assertion to make code pass.
3. **لا رفع سقوف**: لا يُرفع سقف (bundle ≤ 770 KB gz…) ولا يُعاد تثبيت خط
   أساس بوابة إلا بتوثيق سبب مقنع في نفس الـ PR. | Never raise a ceiling
   or re-pin a gate baseline without a documented justification.
4. **انضباط السقاطة (ratchet)**: أرقام المطابقة تتحسن فقط؛ التحسن يُثبَّت
   في نفس الالتزام (`--update`)، والتراجع يُرفض. | Conformance numbers may
   only improve; improvements get re-pinned in the same commit, regressions
   are rejected.
5. **سقف الاستثناء 5%**: دلتا العناصر المستثناة (excused) في أي قسم < 5%
   — الاستثناءات تكلفة تُدار لا بابًا خلفيًا. | Excused-element delta per
   section stays under 5%.
6. **تسمية الفروع**: `rNNN/<task>` لعمل الجولات (مثل `r339/t23`) — تجنّب
   نمط `r338/t13*` (محجوز بقواعد المستودع). | Branches: `rNNN/<task>`;
   the `r338/t13*` pattern is reserved by a repo ruleset — avoid it.

## عرف الالتزام | Commit convention

`نوع(نطاق): موضوع` — يفرضها بوابة `commit-msg` (أدناه). النوع من:

`feat` `fix` `docs` `style` `refactor` `perf` `test` `chore` `merge`
`revert` `instrument` `audit` `conformance` `motion` `wip` `polish`
`spec` `ci` `diet`

النطاق حرّ اختياريًا (`fix(r131):` أو `feat(motion r339 T-11b1):` أو
`merge: r339/t23 (…)`). الموضوع موجز ≤ 100 حرفًا (تحذير لا حظر — أسلوبنا
التاريخي غنيّ بالقياسات). القواعد الكاملة في `commitlint.config.mjs`.
أمثلة حقيقية من التاريخ:

```
fix(r131): a11y hardening — light icon-well contrast to -ink tier …
feat(motion r339 T-11b1): footer/usecase/intro reveals — coverage 46.9→56.3%
```

الموضوع إنجليزي موجز؛ نصوص الواجهة **عربية أولًا** (RTL). | Concise English
subject; UI copy stays Arabic-first and RTL-correct.

## الخطافات | Git hooks

السلك عبر `git config core.hooksPath .githooks` (سطر `prepare` في
package.json — يعاد ضبطه مع كل `npm install`). | Wired via core.hooksPath
(husky غير مستخدم — لا حاجة لتابعية إضافية):

| الخطاف | ما يفعل |
|---|---|
| `pre-commit` | eslint `--quiet` على الملفات المُرحَّلة فقط (frontend/backend src) — بديل lint-staged بدون تابعة |
| `commit-msg` | بوابة الالتزام التقليدي (محرك node صِفر التبعيات يقرأ `commitlint.config.mjs`) |
| `pre-push` | فحوصات R319+R320 السريعة (~15 ث) — عقد الدفع قبل verify.sh الكامل |

## بوابات الجودة | Quality gates

| الفحص | الأمر |
|---|---|
| **المجموعة الكاملة** | `bash scripts/verify.sh` (أو `--fast`) |
| lint | `npm run lint` |
| typecheck | `npm run typecheck` |
| tests | `npm test` |
| colleges parity | `npm run validate:colleges` |
| icons (Lucide فقط) | `bash scripts/check-icons.sh` |
| motion tokens (لا قيم خام) | `bash scripts/check-motion-tokens.sh` |
| بصمات CSP | `bash scripts/check-csp-hash.sh` |
| تكافؤ التصدير | `node scripts/verify-parity-export.mjs` |
| dead-code ratchet | `bash scripts/deadcode/check.sh` |
| build | `npm run build -w backend && npm run build -w frontend` |

(القائمة الكاملة بأوامرها في AGENTS.md §4.) البوابات خضراء قبل كل دفعة،
والـ CI يفرضها على كل PR. | All gates green before every push; CI enforces
them on every PR.

## الفروع والـ PR | Branch & PR flow

1. فرع لكل عمل (`r339/<task>` لجولات البرنامج، أو `feat/…`/`fix/…`)
   يفتح PR إلى `main` — لا دفع مباشر إلى `main` إلا بترتيب مسبق مع المشرف.
2. املأ قائمة تدقيق الـ PR (`.github/PULL_REQUEST_TEMPLATE.md`): البوابات،
   أثر المطابقة (قبل ← بعد)، حجم الحزمة (≤ 770 KB gz)، المظهران، 390،
   RTL، لقطات الشاشة لتغييرات الواجهة.
3. أي تغيير يستحق سطرًا في `CHANGELOG.md` يُحدَّث في نفس الـ PR.

Work happens on branches opening PRs into `main`; direct pushes to `main`
are reserved for maintainer-coordinated work. Fill the PR checklist; keep
`CHANGELOG.md` current.

## اللغة والنسخ | Language & copy

الواجهة عربية أولًا والمصطلحات من معجم مدارك (راجع `README.md`).
| UI copy is Arabic-first; terminology follows the project glossary.
