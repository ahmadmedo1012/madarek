<!-- r339/T-23 — PR checklist (Arabic-first). Keep answers honest: a red gate stated beats a green box ticked blind. -->

## 📌 الملخص | Summary

ماذا يغيّر هذا الـ PR ولماذا؟ (مرجع الجولة/المهمة إن وجد — round/task ref)
What does this PR change and why?

## ✅ قائمة تدقيق R339 | R339 checklist

**البوابات | Gates**

- [ ] `bash scripts/verify.sh --fast` أخضر قبل الدفع | green before push (tsc + vitest + bundle gate)
- [ ] حجم الحزمة مذكور ورقمه ≤ 770 KB gz | bundle size stated, ≤ 770 KB gz (before → after)
- [ ] الاختبارات قانون | tests are law — لا اختبار حُذف أو أُضعف تأكيدُه | no test deleted, no assertion weakened

**الأثر المطابَقي | Conformance impact**

- [ ] الأثر مذكور: الأقسام المتأثرة + قبل ← بعد | stated: sections touched + before → after
- [ ] انضباط السقف: لا رفع سقوف ولا إعادة تثبيت خطوط أساس | ratchet discipline: no ceiling raise, no baseline re-pin
- [ ] دلتا الاستثناء < 5% | excusal (excused-element) delta < 5%

**التحقق اليدوي | Manual verification**

- [ ] المظهران ليلي + نهاري | dark + light both checked
- [ ] ‏390px محمول مُتحقق منه | mobile 390 checked
- [ ] RTL عربي أولًا | Arabic-first RTL correct
- [ ] لقطات شاشة لتغييرات الواجهة | screenshots for UI changes

**النظافة | Hygiene**

- [ ] لا أسرار في الـ diff | no secrets in the diff
- [ ] `CHANGELOG.md` مُحدَّث إن استحق سطرًا | CHANGELOG updated if user-relevant
