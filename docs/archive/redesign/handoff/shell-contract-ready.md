# shell-contract-ready — عقد الأنماط المشتركة جاهز (Agent S)

- **الفرع**: `redesign/shell` (منشور على origin)
- **SHA**: `41c5aab` — `feat(r210): عقد الأنماط المشتركة (المرحلة 0 — Agent S)`
- **ما يفعله الصفحات الآن**: `git merge origin/redesign/shell` (بلا rebase) ثم:

```tsx
import { PageFrame, PageHeader, SectionHeader, RowList, RowItem,
         SplitView, StatLine, FilterBar, TodayList } from '../../components/patterns';
```

- **العقد normative**: `frontend/src/components/patterns/CONTRACT.md`
  (التواقيع الثمانية مجمدة؛ props اختيارية فقط لاحقًا).
- **الأنماط**: `frontend/src/styles/patterns.css` — مستوردة من `main.tsx`
  (سطر واحد بعد layout.css؛ كل الأصناف ببادئة `pf-` — عند تعارض استيراد
  احتفظ بالسطر).
- **البوابات وقت النشر**: lint 0 أخطاء (19 تحذيرًا معروفًا) · typecheck ×4 ·
  1971 اختبار واجهة · تكافؤ 190/190 · raw-css · ألوان — كلها خضراء.
- **ملاحظة للعائلات**: الأرقام تصل مُنسَّقة (لا تنسّق داخل value)؛ SplitView
  يحتاج `detail` + `detailOpen` + `onDetailClose` كمصدر حقيقة واحد؛ على ≤920px
  التفاصيل Sheet ملء شاشة — لا تبِن نسخة موازية.
- **الصيانة**: تحسينات بصرية خلف العقد تتبع في هذا الفرع — ادمجوا بانتظام
  كل ~45 دقيقة وفق بروتوكول الفريق.
