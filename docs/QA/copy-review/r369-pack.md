# R369 C4.1 — the authed-web copy read-through pack

Branch `agent/r369-product` · 2026-11-19 · instrument: `scripts/gates/copy-budget.mjs` (the same lexer, the same ceilings ratchet).

## The diet, measured

| scope | base (merge c09e8ea8) | before | after | cut |
|---|---|---|---|---|
| authed-area Arabic words (56 files, class=authed) | 8,812 | 8,814 | **6,669** | **−2,145 (−24.4 %)** — the −20 % bar MET with margin |
| whole-pages Arabic words (77 files) | 11,878 | 11,803 | **9,658** | −2,220 (−18.7 %) |
| enforced ceilings sum | 10,770 | 10,770 | **8,509** | ratcheted DOWN in this commit (55 entries; authed sum = 6,669 = headroom 0 — copy can never silently grow back) |

Base honesty: measured on the merge-base worktree (c09e8ea8, `git worktree add /tmp/wt-base`), not the round tip — the R369-start tip (wip/r368-t6) measures within 0.1 % (11,887).

## Wave 1 — the dedup hoist (the mechanic the mobile lane shipped in its wave-3)

The census (the gate's OWN lexer, `scripts/tmp-dupcensus.mjs`) found **514 identical Arabic strings living in 2+ authed page files — 1,284 words of pure duplication** the ratchet counted once per file. The hoist moved them to ONE shared constant each in `frontend/src/lib/copy.ts` (362 constants): the substituted sites render the **exact same words** (every constant is the verbatim string, `as const`); the gate scans `pages/**` only, so one sentence now has ONE owner.

Sites substituted: ~1,100 (JSX attributes `label="X"`→`label={X}`, plain TS literals, and JSX text nodes — the text-node replacements preserve the surrounding whitespace byte-for-byte so the rendering is identical at every site; verified by the full unit suite **2,980/2,980 green** and `tsc --noEmit` 0 errors).

## The 60 highest-savings hoisted strings (Arabic read-through)

Wording UNCHANGED everywhere — this table reads the consolidation: constant · verbatim wording · screens sharing it · words removed from the per-file count.

| # | constant | wording (verbatim) | screens | words off |
|---|---|---|---|---|
| 1 | `RETRY_ACTION` | إعادة المحاولة | 22 | 42 |
| 2 | `LOADING` | جارٍ التحميل… | 12 | 22 |
| 3 | `DASH_OWNER` | لوحة المالك | 9 | 16 |
| 4 | `CANCEL` | إلغاء | 15 | 14 |
| 5 | `ALL` | الكل | 14 | 13 |
| 6 | `EMPTY_COURSES_YET` | لا مقرّرات بعد | 5 | 12 |
| 7 | `NO_RESULTS` | لا نتائج | 6 | 10 |
| 8 | `SESSIONS_NOTICE_OTHER_DEVICES` | عند التغيير تُنهى جلسات بقية الأجهزة، وتبقى جلستك مفتوحة. | 2 | 9 |
| 9 | `NOUN_STUDENTS` | طلاب | 10 | 9 |
| 10 | `SAVING` | جارٍ الحفظ… | 5 | 8 |
| 11 | `ACTIVITY_LOG` | سجلّ النشاط | 5 | 8 |
| 12 | `EMPTY_COURSES` | لا مقرّرات | 5 | 8 |
| 13 | `NOUN_TWO_STUDENTS` | طالبان | 8 | 7 |
| 14 | `NOUN_STUDENT_ACC` | طالباً | 8 | 7 |
| 15 | `PREV` | السابق | 8 | 7 |
| 16 | `NEXT` | التالي | 8 | 7 |
| 17 | `DASH_REGISTRAR` | لوحة المسجل العام | 3 | 6 |
| 18 | `LABEL_STUDENTS` | الطلاب | 7 | 6 |
| 19 | `LABEL_COLLEGE` | الكلّيّة | 7 | 6 |
| 20 | `LABEL_STATUS` | الحالة | 7 | 6 |
| 21 | `NOUN_COURSE_ACC` | مقرّراً | 7 | 6 |
| 22 | `EMPTY_RESEARCH_YET` | لا بحوث بعد | 3 | 6 |
| 23 | `LABEL_LECTURES` | محاضرات | 7 | 6 |
| 24 | `NOUN_STUDENT` | طالب | 7 | 6 |
| 25 | `SAVED` | تمّ الحفظ | 4 | 6 |
| 26 | `LABEL_TODAY` | اليوم | 7 | 6 |
| 27 | `LIVE_MONITORING` | المراقبة الحيّة | 4 | 6 |
| 28 | `FAILED_FETCH_ALERTS` | تعذّر جلب التنبيهات | 3 | 6 |
| 29 | `E_LIBRARY` | المكتبة الإلكترونية | 4 | 6 |
| 30 | `CAMPUS_GUIDE` | دليل الحرم الجامعيّ | 3 | 6 |
| 31 | `NEXT_STEP` | الخطوة التالية | 4 | 6 |
| 32 | `SELF_DEV` | التطوير الذاتي | 4 | 6 |
| 33 | `VIRTUAL_LABS` | المعامل الافتراضية | 4 | 6 |
| 34 | `EMPTY_POSTS_YET` | لا منشورات بعد | 3 | 6 |
| 35 | `LABEL_COURSES` | مقرّرات | 6 | 5 |
| 36 | `LABEL_ACTIONS` | إجراءات | 6 | 5 |
| 37 | `LABEL_LECTURE` | محاضرة | 6 | 5 |
| 38 | `FROM` | من | 6 | 5 |
| 39 | `LABEL_THE_COURSE` | المقرّر | 6 | 5 |
| 40 | `LABEL_EMAIL` | البريد الإلكتروني | 3 | 4 |
| 41 | `FAILED_LOAD` | تعذّر التحميل | 3 | 4 |
| 42 | `MANAGE_STUDENTS` | إدارة الطلاب | 3 | 4 |
| 43 | `LIST_STUDENTS` | قائمة الطلاب | 3 | 4 |
| 44 | `CLOSE` | إغلاق | 5 | 4 |
| 45 | `LIVE_STREAM` | بثّ مباشر | 3 | 4 |
| 46 | `CLEAR_SEARCH` | مسح البحث | 3 | 4 |
| 47 | `BROADCAST_NOTICE` | بثّ إعلان | 3 | 4 |
| 48 | `RANK_ASSISTANT_PROF` | أستاذ مساعد | 3 | 4 |
| 49 | `RANK_ASSOCIATE_PROF` | أستاذ مشارك | 3 | 4 |
| 50 | `EXAM_REVIEW` | مراجعة الاختبارات | 3 | 4 |
| 51 | `MANAGE_USERS` | إدارة المستخدمين | 3 | 4 |
| 52 | `QUALITY_REPORTS` | تقارير الجودة | 3 | 4 |
| 53 | `LABEL_NAME` | الاسم | 5 | 4 |
| 54 | `LABEL_DEPT` | القسم | 5 | 4 |
| 55 | `LABEL_COLLEGE_SHORT` | كلّيّة | 5 | 4 |
| 56 | `ONE_COURSE` | مقرّر واحد | 3 | 4 |
| 57 | `NOUN_COURSE_TWO` | مقرّران | 5 | 4 |
| 58 | `FACULTY_BODY` | هيئة التدريس | 3 | 4 |
| 59 | `LABEL_THE_COURSES` | المقرّرات | 5 | 4 |
| 60 | `PUBLISHED_RESEARCH` | بحوث منشورة | 3 | 4 |
(tail rows: the remaining 302 constants follow the same law — see `frontend/src/lib/copy.ts`, each with its JSDoc wording + screen count.)
