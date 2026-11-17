# REQUESTS — Agent 3 (design system) → Agent 4 (Web Product) — hover-guard findings

R366 · filed by Agent 3. `node scripts/r320/hover-guard-lint.mjs`
reports **5 unguarded `:hover` rules in YOUR files** (a `:hover`
rule outside the hover-capable media block sticks after a tap on
touch). Agent 3 fixed its own finding this round (patterns.css:1446 —
the split recipe below). Please fix or allowlist-with-reason; the
lint stays red until then.

**The two house recipes:**
1. HOVER-ONLY — wrap the rule in the R319 B1 media block:
   `@media (hover: hover) and (pointer: fine) { … }`.
2. TWIN (`:hover, :focus-visible` in ONE rule) — SPLIT it: the
   `:focus-visible` half stays unwrapped (focus is universal), the
   `:hover` half moves into the media block. Do NOT wrap the combined
   rule (that would break keyboard focus styling).

Findings (file:line — selector):

```
styles/ai.css:219  .ai-citation-link:hover  (root)
styles/shared/research-heron.css:684  .r305rp .r305ai-code-copy:hover  (root)
styles/student/profile-data.css:115  .r349p-vis-option:hover:not(:disabled)  (root)
styles/student/profile-data.css:213  .r349p-dir-name:hover  (root)
styles/student/profile-data.css:27  .r349p-editable:hover .r349p-edit-btn,
```


---

## Copy-style census (R366 L4b) — 32 finding(s) in YOUR files

`node scripts/gates/copy-budget.mjs --style` (report mode — the
machine-checkable rules of docs/DESIGN-COPY-GUIDE-AR.md). The
design-system files are already clean (enforced); these are yours:

```
[helper>12] pages/admin/AdminMailPage.tsx:119 — «المزوّد: — المُرسِل: · الحدود اليومية: للمستلم و للمؤسسة · إ»
[arabic-indic digits] pages/admin/ImportWizardPage.tsx:247 — «أكبر من ١٠ ميغابايت — قسّمه»
[trailing punctuation] pages/admin/ImportWizardPage.tsx:802 — «التراجع؟»
[arabic-indic digits] pages/admin/ImportWizardPage.tsx:1 — «XLSX / CSV · حتى ١٠ ميغابايت · ٢٠ ألف صف»
[arabic-indic digits] pages/admin/ImportWizardPage.tsx:1 — «٧٢ ساعة للتراجع (ما لم يسجّل الطالب دخوله).»
[arabic-indic digits] pages/auth/ResetPasswordPage.tsx:61 — «الرابط يُستخدم مرة وينتهي بعد ٣٠ دقيقة.»
[arabic-indic digits] pages/auth/ResetPasswordPage.tsx:1 — «اختر كلمة مرور قوية — من ١٢ إلى ٧٢ حرفًا، ليست من الشائعة.»
[title>4] pages/colleges/CollegePages.tsx:747 — «لا توجد بيانات طلّاب بعد.»
[title>4] pages/colleges/CollegePages.tsx:828 — «الحضور المؤكّدون من إجمالي السعة»
[trailing punctuation] pages/community/CommunityPages.tsx:852 — «جارٍ…»
[trailing punctuation] pages/community/CommunityPages.tsx:1001 — «جارٍ…»
[title>4] pages/exams/OnlineExamsPages.tsx:1829 — «لا أسئلة في هذا القالب»
[title>4] pages/legal/LegalPages.tsx:237 — «ملفات تعريف الارتباط والتخزين المحلي»
[helper>12] pages/owner/OwnerAiPage.tsx:202 — «تظهر المؤشّرات فور تسجيل أول طلب. الجهوزيّة تحدّدها إعدادات »
[title>4] pages/owner/OwnerSystemPage.tsx:315 — «مخزن الكائنات لا يستجيب — الرفعات الجديدة ستفشل حتى يعود»
[title>4] pages/owner/OwnerSystemPage.tsx:328 — «الرفعات لا تنجو من إعادة النشر — يتطلب إعداد تخزين دائم (S3)»
[title>4] pages/quality/QualityPages.tsx:813 — «محاضرة 20 نقطة، ملف 5، واجب 10 — بحدّ أقصى 100»
[filler «أحسنت!»] pages/student/LabsPage.tsx:1 — «أحسنت!»
[filler «أحسنت!»] pages/student/TrainingPages.tsx:603 — «أحسنت! حصلت على .»
[trailing punctuation] pages/student/WebinarsPage.tsx:189 — «أين أجد الفعاليّات الحقيقيّة؟»
[button>2] pages/teacher/ResearchReviewPage.tsx:485 — «التخلّي عن التعديلات»
[title>4] pages/teacher/TeacherDashboardPage.tsx:701 — «جميع طلابك في وضع جيد»
[title>4] components/community/CommunitySocialPanels.tsx:134 — «لا توجد غرف دراسة بعد»
[button>2] components/curriculum/AuthoringModal.tsx:309 — «التخلّي عن التعديلات»
[helper>12] components/curriculum/LectureAuthoring.tsx:343 — «سيتم حذف " " مع كل فصولها وأسئلتها التفاعلية نهائياً. لا يمك»
[helper>12] components/feedback/FeedbackWidget.tsx:178 — «اكتب وصفًا واضحًا — الخطوات التي أدّت إلى المشكلة تساعدنا عل»
[arabic-indic digits] components/layout/ServerWakePill.tsx:29 — «ما زال الخادم يستيقظ — عادةً ٣٠–٦٠ ثانية. لا تُغلق الصفحة، ن»
[arabic-indic digits] components/overlays/SlowServerCard.tsx:29 — «الخادم يستيقظ… — عادةً يستغرق ٣٠–٦٠ ثانية»
[helper>12] components/student/MyProfileData.tsx:84 — «بيانات الملف تُدار من مؤسستك — تواصل مع إدارة التسجيل إن كنت»
[arabic-indic digits] components/student/MyProfileData.tsx:1 — «— والأرقام العربية-الهندية (٩…) تُحوَّل تلقائيًا.»
[helper>12] components/teacher/InvitesCard.tsx:56 — «كود واحد يُسجّل الطلاب في هذا المقرّر ذاتيًا — صلاحية محدودة»
[title>4] components/teacher/InvitesCard.tsx:87 — «لا أكواد لهذا المقرّر بعد»
```

Fix per the guide (DESIGN-COPY-GUIDE-AR.md §7); the gate will start
enforcing your files when your lane adopts it (coordinate with the
integrator — never edit another agent's files).
