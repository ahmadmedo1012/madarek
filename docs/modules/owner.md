# الوحدة: قطاع المالك (OWNER)

> الدور: `OWNER` — أعلى سلطة، محمي بحرس «آخر مالك نشط». بوابة مساراته
> موحدة: `requireRole(OWNER)` على `/api/v1/owner/*` (`owner.routes.ts`).

## خريطة الصفحات (الواجهة)

`frontend/src/pages/owner/OwnerPages.tsx` برميل re-export نظيف فوق 10
ملفات مستقلة (لقطع chunks)، + `styles/owner.css`:

| المسار | الملف | الغرض |
|---|---|---|
| `/owner/dashboard` | `OwnerDashboardPage.tsx` | KPIs، حلقي توزيع (Plugin تسمية مركزية)، شريط إجراءات بنمط 5-D3 |
| `/owner/users` | `OwnerUsersPage.tsx` | مستخدمون بصفحات خادمية (`['owner','users',{page,limit,q,role}]` + keepPreviousData) |
| `/owner/activity` | `OwnerActivityPage.tsx` | سجل التدقيق بخرائط `ACTION_LABEL`/`RESOURCE_LABELS` العربية الكاملة |
| `/owner/content`, `/owner/education` | `OwnerContentPage.tsx`, `OwnerEducationPage.tsx` | نظرة محتوى/تعليم |
| `/owner/system`, `/owner/realtime`, `/owner/ai` | `OwnerSystemPage.tsx`… | حالة نظام/مؤشرات زمنية/ذكاء (استقصاء لا WebSocket) |
| `/owner/alerts` | `OwnerAlertsPage.tsx` | تنبيهات `OperationalAlert` بخنق 5 دقائق + «حلّ» |
| `/owner/governance` | `OwnerGovernancePage.tsx` | نظرة الحاكمية (أدوار/نطاقات/مناصب) |
| حوار تأكيد ومفتاح تبديل | `components/owner/ConfirmDialog.tsx`, `ToggleSwitch.tsx` | عناصر مالِكة |

## الـendpoints (17 في `owner.routes.ts`)

| المجموعة | المسارات |
|---|---|
| مؤشرات | `GET /owner/stats`، `/owner/education`، `/owner/system`، `/owner/realtime`، `/owner/ai-metrics` |
| مستخدمون | `GET /owner/users`، `POST /owner/users/:id/role`، `PATCH /owner/users/:id/status` |
| تدقيق | `GET /owner/activity` |
| تنبيهات | `GET /owner/alerts`، `POST /owner/alerts/:id/resolve` |
| دخول | `GET /owner/login-analytics` |
| منصة | `GET /owner/settings`، `PUT /owner/settings/:key`، `GET /owner/feature-flags`، `PUT /owner/feature-flags/:slug` |
| حاكمية | `GET /owner/governance` |

كل تعديل أدوار/حالة: **قفل `lockActiveOwnerRows` (FOR UPDATE) + فحص
عدّ + توفير/إبطال + AuditLog** داخل معاملة واحدة — عبر `lib/governance.ts`.

## النماذج المرتبطة

`User` (إدارة أدوار/حالة/نطاق)، `AuditLog`، `PlatformSetting`، `FeatureFlag`،
`OperationalAlert`، `LoginEvent` (تحليلات دخول — تُسرَّح تلقائيًا بعد 180 يومًا)،
`AiTelemetry`، `SyncRun` (عرضًا).

## النقاط الحرجة للتعديل

- **لا تتجاوز الحراس**: حتى المالك لا يستطيع تعطيل آخر مالك نشط — إن
  احتجت تغيير السلوك فنمطه: دالة قرار نقية في `governance.ts` + اختبار.
- **التدقيق شامل**: أي مسار حاكمي جديد يكتب AuditLog بنفس المعاملة،
  وبإجراء/مورد مسجلين في خرائط التسميات العربية (وإلا ظهر خامًا في
  `/owner/activity`).
- **الأعلام والأزرار**: استخدام `FeatureFlag` الجاهز بدل تكرار منطق
  إعدادات جديد.
- **حدود المعدل والتنبيهات**: خنق التنبيه 5 دقائق/كود في الذاكرة —
  ضمن قيد «حالة في الذاكرة» في [../16](../16-decisions-and-limitations.md).
