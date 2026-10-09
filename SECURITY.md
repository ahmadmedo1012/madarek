# الأمان | Security Policy

> سياسة الإفصاح المسؤول لمنصة مدارك.
> The responsible-disclosure policy for the Madarek platform.

## النسخ المدعومة | Supported Versions

| الفرع | Branch | الحالة | Status |
|---|---|---|---|
| `main` | `main` | ✅ مدعوم | supported |

## الإبلاغ عن ثغرة | Reporting a Vulnerability

**عربي —** لا تفتح Issue عامًا للثغرات الأمنية أبدًا. أرسل التفاصيل **بشكل خاص** إلى
`ahmadmedo1012@gmail.com` (المشرف: أحمد مدو)، أو عبر خاصية «الإبلاغ الخاص عن الثغرات»
(Private vulnerability reporting) في إعدادات المستودع فور تفعيلها. أرفق وصفًا للثغرة،
خطوات إعادة الإنتاج، والأثر المتوقع. زمن الرد المستهدف: ٧٢ ساعة.

**English —** Never open a public issue for a security vulnerability. Report
**privately** to `ahmadmedo1012@gmail.com` (maintainer: Ahmad Medo), or via the
repository's Private vulnerability reporting once enabled in settings. Include
a description, reproduction steps, and expected impact. Target response: 72h.

## النطاق | Scope

**داخل النطاق | In scope** — منصة مدارك وجميع مساراتها: كل واجهات `/api`،
المصادقة والجلسات، عزل نطاق الكليات (college scope)، تخزين الملفات وتقديم
البحوث، وقاعدة البيانات ومعالجة البيانات الشخصية.

The Madarek platform: all `/api` routes, auth & sessions, college-scope
isolation, file storage & research submissions, data storage & PII handling.

**خارج النطاق | Out of scope** — هجمات حجب الخدمة، الهندسة الاجتماعية، التقارير
الآلية بلا إثبات عملي، والثغرات في نسخ معدَّلة غير منشورة. | DoS, social
engineering, automated scanner reports without a working PoC, and modified
deployments.

## وضع الأمان الحالي | Current posture

| المستودع / Repo | CSP | تحديد المعدل / Rate limit | فحص الأسرار / Secret scan |
|---|---|---|---|
| مدارك / madarek | ✓ helmet + فحص هاش | ✓ وسيط الخلفية | — |

ملف `.env` غير متتبَّع. | `.env` files are untracked.

## الإفصاح | Disclosure

إفصاح منسق بعد الإصلاح والتحقق — لا يُنشر شيء قبل الترقيع. | Coordinated
disclosure after the fix is verified — nothing goes public before the patch.
المبلّغون الجديّرون يُذكرون في `CHANGELOG.md`. | Creditable reporters are
acknowledged in `CHANGELOG.md`.
