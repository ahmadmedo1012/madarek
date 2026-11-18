# DESIGN-COPY-GUIDE-AR — «مدارك» Arabic microcopy standard

**Owner:** Agent 3 (design system) · **Round:** R366 · **Status:** BINDING for
every agent that writes or edits a user-facing Arabic string (web `frontend/`,
mobile `apps/mobile/`). Machine-checkable subset enforced by
`scripts/gates/copy-budget.mjs --style` (L4-b); the word ceilings in
`docs/QA/copy-budget*.json` stay untouched — this guide is the QUALITY layer
on top of the QUANTITY layer.

Language: **Libyan Arabic context, Modern Standard Arabic (MSA) register.**
Never dialect. Never English in UI strings (proper nouns, file names and
codes stay Latin). One term per concept, everywhere, in every role.

---

## 1 · Buttons — verbs only, ≤ 2 words

A button label is an IMPERATIVE VERB (or verb + one noun). It says what
clicking DOES, not what the screen IS. ≤ 2 words, no trailing ellipsis
(except «المزيد…» when it opens a sheet), no punctuation at the end.

| Action | Canonical label | Never use |
|---|---|---|
| save | **حفظ** | احفظ التغييرات الآن، تخزين |
| cancel | **إلغاء** | تراجع، إغلاق بدون حفظ |
| delete | **حذف** | إزالة، مسح (except مسح in filter bars = clear) |
| confirm destructive | **تأكيد الحذف** | نعم احذفه، موافق |
| create | **إضافة** (things) / **إنشاء** (accounts, exams, courses) | عمل، بناء |
| edit | **تعديل** | تغيير، تحرير |
| publish / submit | **نشر** / **إرسال** | اعتماد (reserve اعتماد for approval flows) |
| approve / reject | **اعتماد** / **رفض** | موافقة، رفض نهائي |
| close | **إغلاق** | خروج، إخفاء |
| search | **بحث** | ابحث هنا (placeholder is «بحث…») |
| upload / download | **رفع** / **تحميل** | استيراد/تصدير (reserve for file-format conversion) |
| export / import | **تصدير** / **استيراد** | — |
| filter / clear | **تصفية** / **مسح** | فلترة، تنقية |
| enable / disable | **تفعيل** / **تعطيل** | تشغيل/إيقاف (reserve for hardware-ish toggles) |
| continue / back | **متابعة** / **رجوع** | التالي/السابق (reserve التالي for step counters) |
| login / logout | **تسجيل الدخول** / **تسجيل الخروج** | دخول، خروج، تسجيل |
| register | **إنشاء حساب** | تسجيل، اشترك |
| retry | **إعادة المحاولة** | حاول مجددًا، أعد |
| copy link | **نسخ الرابط** | انسخ، شارك |
| share | **مشاركة** | — |
| open | **فتح** / **التفاصيل** (link-style) | اضغط هنا، اعرض المزيد |

Rules:
- Icon-only buttons carry `aria-label` from THIS table (same word).
- Button groups order: primary action first in DOM (visual order follows
  RTL flow); destructive is always the visually-secondary outline/danger
  style, never primary.
- «تأكيد» alone is FORBIDDEN (confirm-WHAT?). Use تأكيد + noun:
  تأكيد الحذف، تأكيد النشر، تأكيد الإرسال.

## 2 · The four copy slots — length laws

| Slot | Law | Example (good) |
|---|---|---|
| **Title** (page/section/card) | ≤ 4 words, noun phrase, no verb, no period | «الجدول الدراسي» — «نتائج الفصل» — «بنك الأسئلة» |
| **Subtitle** (optional, under title) | 1 line, ≤ 8 words, adds info the title cannot | «مقرراتك المسجّلة في فصل خريف 2025» |
| **Helper** (field hint, empty hint) | ≤ 12 words, starts with the VALUE not «يرجى» | «الرقم الوطني كما في البطاقة، 13 رقمًا» |
| **Body/empty/error** | ≤ 2 sentences; sentence 1 = state, sentence 2 = action | «لا توجد إشعارات بعد. ستظهر هنا تحديثات مقرراتك.» |

Never: «يرجى»، «الرجاء»، «من فضلك» openers; marketing adjectives
(مذهل، رائع، أفضل، فريد، سريع كالبرق); exclamation marks; emoji in
strings (icons are `lucide-react`, never text emoji); ALL-CAPS Arabic.

### Empty states — the 2-sentence contract
Sentence 1: WHAT is empty (this surface, not «لا توجد بيانات» generic —
name the noun). Sentence 2: the action or when it fills.
- Before: «لا توجد بيانات لعرضها»
- After: «لا توجد واجبات بعد. تظهر الواجبات عند نشر الأستاذ.»
- With action: «لا توجد ملاحظات. أضف ملاحظتك الأولى.» + button «إضافة»

### Error states — failure + next step, never blame, never stack traces
Pattern: **«تعذّر [الفعل] [المفعول]. [السبب القصير أو الخطوة].»**
- «تعذّر تحميل النتائج. تحقّق من الاتصال ثم أعد المحاولة.» + button «إعادة المحاولة»
- Validation: «أدخل بريدًا صحيحًا» / «كلمة المرور 8 أحرف على الأقل» — the
  field's own noun, the exact constraint, no «خطأ:» prefix.
- NEVER: «حدث خطأ ما»، «Oops»، «Error 500»، English messages, raw API text.
  Map every API error to a sentence from this pattern (one mapper, shared).

### Confirm dialogs — the destructive contract
Title = the action («حذف المقرر؟»). One sentence: the consequence,
irreversible flagged with «لا يمكن التراجع». Buttons: تأكيد الحذف (danger)
+ إلغاء. No extra warnings, no double-confirm dialogs.

### Loading
- Inline/button: «جارٍ التحميل…» (spinner carries the motion, text stays).
- Full surfaces: skeleton first, words only when progress is real:
  «جارٍ تصدير النتائج…». Never jokes, never «قد يستغرق هذا وقتًا».

## 3 · Libyan-education glossary — one word per concept

Locked terms (nav, roles, badges — changing any = a cross-agent REQUEST):
**طالب** (student) · **أستاذ** (faculty — NEVER مدرّس) · **معيد** (teaching
assistant) · **المسجّل العام** (registrar) · **عميد** (dean) · **رئيس قسم**
(department head) · **جودة** (quality unit) · **المالك** (institution owner)
· **مقرّر** (course — NEVER مساق/كورس) · **فصل دراسي** (semester — NEVER
ترم) · **خريف/ربيع** (semesters) · **السنة الدراسية** · **كلية**
(college/faculty) · **قسم** (department) · **شعبة** (section) · **محاضرة**
· **قاعة** (hall) · **الجدول الدراسي** (timetable) · **التقويم الأكاديمي**
· **الدرجة** (grade mark) · **النتائج والتقييمات** · **واجب** (assignment)
· **اختبار إلكتروني** (online exam) · **بنك الأسئلة** · **حضر/متأخر/غائب**
(attendance triad) · **الشؤون الأكاديمية** · **المكتبة الإلكترونية** ·
**بحوثي العلمية** (student research) · **البحث العلمي** (faculty research).

Rules:
- Definite article per product usage above; do not alternate مقرر/المقرر in
  the same surface for the same referent.
- Plurals stay MSA sound: مقرّرات، واجبات، اختبارات — never broken
  colloquial plurals (مواد for مقررات is BANNED in UI chrome; «المواد»
  allowed only in long-form help/legal prose when meaning subject matter).
- Role names in badges: singular always (badge shows the role, not count).

## 4 · Numbers, dates, times, currency

All formatting goes through `frontend/src/utils/numbers.ts` (web) and the
mobile formatters — hand-rolled concatenation is forbidden.

- **Digits:** Latin (Western) `0–9` everywhere — `ar-LY-u-nu-latn` is the
  pinned locale. Arabic-Indic ٠–٩ appear ONLY inside quoted Quranic/heritage
  text (none today).
- **Numbers:** comma grouping, dot decimal — «2,340» / «3.4» / «61.8%»
  (`formatNum`/`formatPct1`; percent glyph added by the caller).
- **Counts:** «12 طالبًا» — number + singular noun in accusative (تمييز);
  use the shared `<Count>`/plural helpers; never «12 طلاب» in chrome.
- **Dates:** «12 مارس 2025» (`formatDate`, ar-LY month names); short form
  `YYYY-MM-DD` (en-CA) only in inputs/export files; weekday «الأربعاء».
- **Time:** 24-hour «14:30» (`formatTime`, en-GB pattern, Africa/Tripoli).
  Add «م»/«ص» only in chat/notification prose, never in tables.
- **Ranges:** «من 14:00 إلى 16:00» · dates «12–14 مارس» (en dash, no spaces).
- **Currency:** Libyan Dinar «دينار» written after the number — «250 دينار»
  (fees context, rare). No «LYD» in UI strings.
- **IDs/codes:** mono font, LTR (`dir="ltr"`), Latin digits, never
  translated: «STU-2025-0143».

## 5 · Tone

- Calm, factual, respectful. The user is a student in a Libyan university or
  a school pupil — short sentences, concrete nouns, zero hype.
- Address: neutral MSA («يمكنك»، «ستظهر») — never gendered «يمكنكَ/يمكنكِ»,
  never «سيادتك».
- Ownership in empty/error states: the SYSTEM failed or is empty, never the
  user («تعذّر»، «لم تُضف بعد» — not «لم تختر»، «أدخلت خطأ»).
- Progress is quiet: no gamified exclamations inside the logged-in app
  («أحسنت!» banned — achievements live in their own surfaces with their own
  registered voices).
- The «؟» tooltip rule: anything longer than the slot laws above moves
  BEHIND a help affordance («؟» icon, tooltip, or a help page link) — the
  explanation survives, the surface stays clean.

## 6 · What must NEVER be cut (the floor under the diet)

1. The ACTION sentence in empty/error states (sentence 2 of the contract).
2. The destructive consequence sentence in confirms («لا يمكن التراجع»).
3. The exact constraint in field validation (length, format, required).
4. The unit on every number that has one («12 طالبًا»، «3.4%»، «45 دقيقة»).
5. The date/time on every notification, message, and submission.
6. Accessibility labels on every icon-only control (from the verb table).
7. Legal/account identifiers (fees, deadlines) — shorten the sentence,
   never delete the fact.

## 7 · Machine-checkable rules (enforced by `copy-budget --style`)

Report mode first (L4-b), then enforced on Agent-3-owned files; ceilings
never move. A finding is a file+line, fix-forward:

1. Button-ish strings (`<Button>` children, `.btn` text): ≤ 2 words.
2. Title-ish strings (`PageHeader title`, `h1/h2` in owned pages): ≤ 4 words.
3. Helper-ish strings (`FormField hint`, `.helper`): ≤ 12 words.
4. Double spaces `  ` inside Arabic strings; leading/trailing whitespace.
5. Banned fillers: يرجى، الرجاء، من فضلك، حدث خطأ ما، Oops، بنجاح!، مرحبًا بك في.
6. Banned marketing inside app chrome: مذهل، رائع، أفضل، فريد، ثوري.
7. Arabic-Indic digits ٠-٩ outside the sanctioned heritage exception.
8. English letters inside Arabic UI strings (allowlist: codes, emails,
   proper nouns caught by a brand allowlist).
9. Trailing punctuation on titles/buttons (…، !، ؛، ،).
10. «تأكيد» as a standalone destructive button label.

*— Agent 3 · R366. Updates to this guide are additive + versioned here; a
term change that touches another agent's surface goes through
`docs/redesign/r366/REQUESTS-agent3-to-<n>.md`.*
