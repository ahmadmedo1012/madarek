# المساهمة | Contributing

> مساهمات مدارك تمر عبر جولات عمل منسقة — هذا المستند يوثّق القواعد
> القائمة فعلًا. | Madarek contributions flow through coordinated
> work rounds — this documents the rules in force.

## الإعداد | Setup

انسخ `.env.example` إلى `.env` ثم اتبع خطوات التشغيل في `README.md` (Quickstart).
مدير الحزم: **npm** (workspaces).
لا ترفع `.env` أو أي سر حقيقي أبدًا.

Copy `.env.example` → `.env`, then follow the README quickstart. Node `>=20 <25` (CI pins 22).
Never commit `.env` or real secrets.

## بوابات الجودة | Quality gates

| الفحص | الأمر |
|---|---|
| lint | `npm run lint` |
| typecheck | `npm run typecheck` |
| tests | `npm test` |
| colleges parity | `npm run validate:colleges` |
| build | `npm run build -w backend && npm run build -w frontend` |

البوابات خضراء قبل كل دفعة، والـ CI يفرضها على كل PR. | All gates green
before every push; CI enforces them on every PR.

## عرف الالتزام | Commit convention

`نوع(نطاق): موضوع` — النوع من: `feat` `fix` `polish` `docs` `test` `chore`
`merge`، مع وسم الجولة `rNNN` لعمل جولات البرنامج. أمثلة حقيقية من التاريخ:

```
fix(r131): a11y hardening — light icon-well contrast to -ink tier …
fix(r128): canonical landing repairs — define --ln-ease …
docs(r126): docs-truth — README real test counts
```

الموضوع إنجليزي موجز؛ نصوص الواجهة **عربية أولًا** (RTL). | Concise English
subject; UI copy stays Arabic-first and RTL-correct.

## الفروع والـ PR | Branch & PR flow

1. فرع لكل عمل (`feat/…`, `fix/…`) يفتح PR إلى `main` — لا دفع مباشر إلى
   `main` إلا بترتيب مسبق مع المشرف.
2. املأ قائمة تدقيق الـ PR: البوابات، المظهران (ليلي/نهاري)، RTL، لقطات الشاشة
   لتغييرات الواجهة.
3. أي تغيير يستحق سطرًا في `CHANGELOG.md` يُحدَّث في نفس الـ PR.

Work happens on feature branches (`feat/…`, `fix/…`) opening PRs into
`main`. Direct pushes to `main` are reserved for maintainer-coordinated
work. Fill the PR checklist; keep `CHANGELOG.md` current.

## اللغة والنسخ | Language & copy

الواجهة عربية أولًا والمصطلحات من معجم مدارك (راجع `README.md`).
| UI copy is Arabic-first; terminology follows the project glossary.
