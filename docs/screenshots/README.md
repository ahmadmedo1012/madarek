# Screenshots · لقطات الشاشة

README-ready stills of the two design worlds, captured at **1440×900** from the running
app (r133). All PNGs are ≤300KB (256-color quantized) so the READMEs stay fast.

لقطات جاهزة للـ README للعالمَين التصميميين، مقاس **1440×900** من التطبيق الحيّ (r133).
جميع الملفات PNG بحجم أقل من 300KB لتبقى صفحة الـ README سريعة.

| File · الملف | EN caption | AR caption | Size |
|---|---|---|---|
| `landing-hero.png` | Orbit Ink landing hero — the headline over the live OrbitScene canvas | الواجهة التعريفية بأسلوب Orbit Ink — العنوان فوق محرك OrbitScene الحيّ | 115KB |
| `landing-colleges.png` | The colleges constellation — the 25-college ring section | قسم كوكبة الكليات — حلقة الكليات الخمس والعشرين | 35KB |
| `auth-light.png` | Sign-in page, light theme (copper on cream `#FBFAF9`/`#B57438`) | صفحة الدخول، النسق الفاتح (نحاسي على كريمي) | 48KB |
| `auth-dark.png` | Sign-in page, dark theme (gold on night `#070B16`/`#E9B44C`) | صفحة الدخول، النسق الداكن (ذهبي على ليلي) | 36KB |
| `owner-dashboard-light.png` | Owner dashboard — KPI cards, education doughnut chart, live band, activity feed (light) | لوحة تحكم المالك — بطاقات المؤشرات ومخطط الكليات والشريط الحيّ وسجل النشاط (فاتح) | 25KB |
| `owner-dashboard-dark.png` | Owner dashboard (dark) | لوحة تحكم المالك (داكن) | 26KB |

## Capture notes · ملاحظات الالتقاط

- Taken with Playwright (Chromium headless, `ar-LY` locale, RTL) against the Vite dev
  server; themes are the real theme store resolving `data-theme` light/dark.
- The owner-dashboard stills use small API fixtures (stats/realtime/alerts/activity/
  education) because a screenshot session has no backend — the layout, chart and
  components are the shipped code, the numbers are sample data.
- For the two landing stills the `.ln-grain` noise veil is disabled **in the shot
  only** (per-pixel noise pushes a 1440×900 PNG past 700KB; the repo code keeps the
  veil untouched at `--ln-grain-op: 0.075`).

التُقطت اللقطات عبر Playwright (كروميوم بلا واجهة، لغة `ar-LY`) مقابل خادم Vite للتطوير،
والأنساق هي أنساق المتجر الحقيقية. لقطات لوحة المالك تستخدم بيانات تجريبية لأن جلسة
الالتقاط بلا خادم خلفي — التخطيط والمكوّنات هي الشيفرة المشحونة. وفي لقطتي الواجهة
التعريفية عُطّل حجاب الحبيبات `.ln-grain` في اللقطة فقط (الضوضاء لكل بكسل ترفع حجم
PNG إلى ما يتجاوز 700KB) — شيفرة المستودع لم تُمسّ.
