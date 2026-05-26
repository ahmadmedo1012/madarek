# 🎨 خطة إعادة تصميم منصة مدارك — النسخة المتقدمة
## تشخيص دقيق + برومبتات جاهزة للتنفيذ الفوري

---

## 🔍 التشخيص البصري للمشاكل الحقيقية

### الصفحة الرئيسية — المشاكل المُشاهَدة
| المشكلة | الوصف الدقيق | الأثر |
|---------|-------------|-------|
| Hero ميت بصرياً | خلفية بيضاء ناصعة بلا عمق، الصورة تطفو بدون إطار أو ظل | لا يوجد جذب بصري |
| الشعار ضعيف | مجرد أيقونة حقيبة 🎒 صغيرة بدون اسم واضح في الـ Navbar | ضعف في الهوية |
| الإحصاءات مسطحة | أرقام على خلفية بيضاء بأيقونات دائرية باهتة | لا تعكس أهمية الأرقام |
| البطاقات بلا روح | خلفية بيضاء + حدود رمادية فقط، لا gradient، لا عمق | تبدو كنموذج جاهز |
| الشريط الأزرق العلوي | لون كحلي مبتور فوق Navbar أبيض — التغيير مفاجئ | تضارب بصري |

### صفحة الدخول — المشاكل المُشاهَدة
| المشكلة | الوصف الدقيق |
|---------|-------------|
| النصف الأيمن الداكن | كحلي صلب بلا نسيج أو عمق، الشعار يطفو وحيداً |
| النموذج بارد | حقول بيضاء عادية، لا focus animation، لا ظلال، لا شخصية |
| أزرار الحسابات التجريبية | مجرد outline buttons مكدسة بلا تصميم |
| الانقسام مباشر | لا يوجد تدرج أو عنصر بصري يربط النصفين |

### لوحة الطالب — المشاكل المُشاهَدة
| المشكلة | الوصف الدقيق |
|---------|-------------|
| Tabs الأدوار في السايدبار | (طالب/أستاذ/إداري/جودة) فوق القائمة — مربك جداً |
| بطاقات غير متسقة | بطاقة التقدم بيضاء، بطاقة المعدل ذهبية/كريمية — لا نظام |
| "اسأل AI" كحلي مقاطع | يبدو وكأنه من تصميم مختلف |
| شريط التقدم | تدرج أزرق-ذهبي عشوائي بدون معنى |
| الخلفية ثلجية | الـ content area أبيض/رمادي فاتح بلا دفء |
| عدم وجود أيقونات في السايدبار | القائمة نصية فقط، بلا أيقونات واضحة |
| حجم "3.8" ضخم جداً | يطغى على التصميم بطريقة غير متوازنة |

---

## 🎯 الاتجاه التصميمي الجديد

**الهوية:** منصة أكاديمية ليبية رسمية + حديثة + ذكية  
**الأسلوب:** Refined Modern Academic — راقٍ، ذكي، محترف مع دفء عربي  
**الألوان:** Indigo عميق + ذهبي دافئ + رمادي دافئ (وليس كحلي بارد + أبيض ثلجي)  
**الخط:** IBM Plex Arabic (حديث وعلمي) أو Tajawal (أنيق وواضح)

---

## 📋 البرومبتات التنفيذية

---

### 🌐 برومبت A — نظام التصميم الجديد (Design Tokens)

```css
/* ===== globals.css ===== */

/* استيراد الخط */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');

:root {
  /* ===== الألوان الأساسية ===== */
  /* Indigo عميق — اللون الرئيسي */
  --c-primary-50:  #eef2ff;
  --c-primary-100: #e0e7ff;
  --c-primary-200: #c7d2fe;
  --c-primary-300: #a5b4fc;
  --c-primary-400: #818cf8;
  --c-primary-500: #6366f1;
  --c-primary-600: #4f46e5;
  --c-primary-700: #4338ca;
  --c-primary-800: #3730a3;
  --c-primary-900: #312e81;
  --c-primary-950: #1e1b4b;

  /* ذهبي دافئ — لون التميز والإنجاز */
  --c-gold-50:  #fffbeb;
  --c-gold-100: #fef3c7;
  --c-gold-200: #fde68a;
  --c-gold-400: #fbbf24;
  --c-gold-500: #f59e0b;
  --c-gold-600: #d97706;
  --c-gold-700: #b45309;

  /* رمادي دافئ — بديل الرمادي البارد */
  --c-warm-50:  #fafaf9;
  --c-warm-100: #f5f5f4;
  --c-warm-200: #e7e5e4;
  --c-warm-300: #d6d3d1;
  --c-warm-400: #a8a29e;
  --c-warm-500: #78716c;
  --c-warm-600: #57534e;
  --c-warm-700: #44403c;
  --c-warm-800: #292524;
  --c-warm-900: #1c1917;

  /* نجاح — أخضر زمردي */
  --c-success-50:  #ecfdf5;
  --c-success-100: #d1fae5;
  --c-success-500: #10b981;
  --c-success-600: #059669;
  --c-success-700: #047857;

  /* تحذير */
  --c-warning-50:  #fff7ed;
  --c-warning-500: #f97316;
  --c-warning-700: #c2410c;

  /* خطر */
  --c-danger-50:  #fff1f2;
  --c-danger-500: #f43f5e;
  --c-danger-700: #be123c;

  /* ===== الخلفيات ===== */
  --bg-page:       #f8f7f5;   /* دافئ قليلاً — ليس أبيض ثلجي */
  --bg-surface:    #ffffff;
  --bg-elevated:   #ffffff;
  --bg-sidebar:    #1e1b4b;   /* Indigo 950 — عميق ومحترف */
  --bg-topbar:     #ffffff;

  /* ===== النصوص ===== */
  --text-primary:   #1c1917;
  --text-secondary: #57534e;
  --text-tertiary:  #a8a29e;
  --text-on-dark:   #f5f5f4;
  --text-on-dark-2: #c7d2fe;  /* خافت على الخلفية الداكنة */

  /* ===== الحدود ===== */
  --border-light:  rgba(0,0,0,0.06);
  --border-medium: rgba(0,0,0,0.10);
  --border-heavy:  rgba(0,0,0,0.16);

  /* ===== الظلال ===== */
  --shadow-xs:  0 1px 2px rgba(0,0,0,0.04);
  --shadow-sm:  0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:  0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-lg:  0 10px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04);
  --shadow-xl:  0 20px 40px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.05);
  --shadow-glow: 0 0 0 3px rgba(99,102,241,0.15); /* Indigo glow للـ focus */

  /* ===== الأبعاد ===== */
  --radius-xs:   4px;
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   14px;
  --radius-xl:   20px;
  --radius-2xl:  28px;
  --radius-full: 9999px;

  --sidebar-width:    256px;
  --topbar-height:    64px;
  --content-max-w:   1200px;

  /* ===== الخط ===== */
  --font-main: 'IBM Plex Sans Arabic', 'Segoe UI', sans-serif;
  --fw-light:    300;
  --fw-regular:  400;
  --fw-medium:   500;
  --fw-semibold: 600;
  --fw-bold:     700;

  /* ===== السرعات ===== */
  --transition-fast:   150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow:   300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ===== Reset & Base ===== */
*, *::before, *::after { box-sizing: border-box; }

html {
  direction: rtl;
  font-family: var(--font-main);
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}

body {
  background: var(--bg-page);
  color: var(--text-primary);
  line-height: 1.6;
}

/* ===== إجبار الأرقام الغربية ===== */
* { font-variant-numeric: normal; }
.num, [data-num], td, th, .badge, .stat {
  font-feature-settings: "lnum" 1, "tnum" 1;
}
```

---

### 🏠 برومبت B — الصفحة الرئيسية (Landing Page) — إعادة بناء كاملة

```tsx
// pages/LandingPage.tsx
// التغييرات المطلوبة بدقة:

/* ━━━━━━━━━━━━━━━━━━━━━━━━━
   1. إزالة الشريط الأزرق العلوي
   أو دمجه داخل الـ Hero كـ top ribbon خفي
   ━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ━━━━━━━━━━━━━━━━━━━━━━━━━
   2. NAVBAR الجديد
   ━━━━━━━━━━━━━━━━━━━━━━━━━ */
// BEFORE: شعار حقيبة صغيرة + روابط
// AFTER:
<nav style={{
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(0,0,0,0.06)',
  position: 'sticky', top: 0, zIndex: 100,
  height: '68px',
}}>
  <div className="flex items-center justify-between px-8 h-full max-w-7xl mx-auto">
    {/* الشعار */}
    <div className="flex items-center gap-3">
      <div style={{
        width: 40, height: 40,
        background: 'linear-gradient(135deg, #4338ca, #6366f1)',
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
      }}>
        {/* أيقونة SVG للكتاب أو الجامعة */}
        <GraduationCap size={22} color="white" />
      </div>
      <div>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#1e1b4b' }}>مدارك</span>
        <span style={{ fontSize: 11, color: '#78716c', display: 'block', lineHeight: 1 }}>
          جامعة الزاوية
        </span>
      </div>
    </div>

    {/* الروابط */}
    <div className="hidden md:flex items-center gap-8">
      {['المميزات', 'الأدوار', 'النتائج', 'عن المنصة'].map(item => (
        <a key={item} style={{
          fontSize: 15, color: '#57534e', fontWeight: 500,
          transition: 'color 200ms',
          textDecoration: 'none',
        }}
        onMouseEnter={e => e.target.style.color = '#4f46e5'}
        onMouseLeave={e => e.target.style.color = '#57534e'}>
          {item}
        </a>
      ))}
    </div>

    {/* زر الدخول */}
    <button style={{
      background: 'linear-gradient(135deg, #4338ca, #6366f1)',
      color: 'white',
      border: 'none',
      borderRadius: 10,
      padding: '10px 24px',
      fontSize: 14, fontWeight: 600,
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
      display: 'flex', alignItems: 'center', gap: 8,
      transition: 'all 200ms',
    }}>
      <LogIn size={16} />
      تسجيل الدخول
    </button>
  </div>
</nav>

/* ━━━━━━━━━━━━━━━━━━━━━━━━━
   3. HERO SECTION الجديد
   ━━━━━━━━━━━━━━━━━━━━━━━━━ */
// BEFORE: خلفية بيضاء + صورة تطفو
// AFTER: خلفية غنية مع عمق بصري

<section style={{
  background: `
    radial-gradient(ellipse 80% 60% at 20% 40%, rgba(99,102,241,0.12) 0%, transparent 60%),
    radial-gradient(ellipse 60% 80% at 80% 60%, rgba(245,158,11,0.08) 0%, transparent 60%),
    #fafaf9
  `,
  minHeight: '92vh',
  padding: '80px 32px 60px',
  position: 'relative',
  overflow: 'hidden',
}}>
  {/* نقاط زخرفية — Dot Pattern خفيف */}
  <div style={{
    position: 'absolute', inset: 0,
    backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px)',
    backgroundSize: '32px 32px',
    pointerEvents: 'none',
  }} />

  {/* العناصر الزخرفية الطافية */}
  <div style={{
    position: 'absolute', top: 80, left: 80,
    width: 300, height: 300,
    background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)',
    borderRadius: '50%',
    filter: 'blur(40px)',
    pointerEvents: 'none',
  }} />
  <div style={{
    position: 'absolute', bottom: 60, right: 120,
    width: 200, height: 200,
    background: 'radial-gradient(circle, rgba(245,158,11,0.12), transparent 70%)',
    borderRadius: '50%',
    filter: 'blur(30px)',
    pointerEvents: 'none',
  }} />

  <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative">
    {/* النص — الجانب الأيمن (RTL) */}
    <div>
      {/* Badge رسمي */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 100,
        padding: '6px 16px',
        marginBottom: 24,
      }}>
        <span style={{
          width: 6, height: 6,
          background: '#6366f1', borderRadius: '50%',
          animation: 'pulse 2s infinite',
        }} />
        <span style={{ fontSize: 13, color: '#4f46e5', fontWeight: 500 }}>
          وزارة التعليم العالي والبحث العلمي · ليبيا
        </span>
      </div>

      <h1 style={{
        fontSize: 'clamp(36px, 5vw, 58px)',
        fontWeight: 800,
        lineHeight: 1.2,
        color: '#1c1917',
        marginBottom: 20,
      }}>
        منصة{' '}
        <span style={{
          background: 'linear-gradient(135deg, #4338ca, #818cf8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          مدارك
        </span>
        <br />
        للتعليم الذكي
      </h1>

      <p style={{
        fontSize: 18, color: '#57534e',
        lineHeight: 1.8, marginBottom: 40,
        maxWidth: 480,
      }}>
        منصة أكاديمية متطورة تجمع بين الابتكار والتميز — 
        تحت إشراف وزارة التعليم العالي والبحث العلمي.
      </p>

      {/* الأزرار */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button style={{
          background: 'linear-gradient(135deg, #4338ca, #6366f1)',
          color: 'white', border: 'none',
          borderRadius: 12, padding: '14px 32px',
          fontSize: 16, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          ابدأ رحلتك الآن
          <ArrowLeft size={18} />
        </button>
        <button style={{
          background: 'white',
          color: '#4338ca',
          border: '1.5px solid rgba(99,102,241,0.3)',
          borderRadius: 12, padding: '14px 28px',
          fontSize: 15, fontWeight: 500, cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          اكتشف المنصة
        </button>
      </div>

      {/* إحصاء صغير تحت الأزرار */}
      <div style={{ display: 'flex', gap: 32, marginTop: 48 }}>
        {[
          { num: '+50K', label: 'طالب مسجّل' },
          { num: '2.5K', label: 'عضو هيئة تدريس' },
          { num: '29', label: 'كلية أكاديمية' },
        ].map(({ num, label }) => (
          <div key={num}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b' }}>{num}</div>
            <div style={{ fontSize: 13, color: '#78716c', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>

    {/* الصورة — الجانب الأيسر */}
    <div style={{ position: 'relative' }}>
      {/* الإطار الخلفي المزخرف */}
      <div style={{
        position: 'absolute', inset: -16,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(245,158,11,0.1))',
        borderRadius: 32,
        transform: 'rotate(-2deg)',
      }} />
      {/* الإطار الثاني */}
      <div style={{
        position: 'absolute', inset: -8,
        background: 'white',
        borderRadius: 28,
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
      }} />
      {/* الصورة */}
      <img
        src="/university-image.jpg" /* استخدم الصورة الموجودة */
        alt="جامعة الزاوية"
        style={{
          width: '100%',
          borderRadius: 24,
          position: 'relative',
          display: 'block',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        }}
      />
      {/* Floating badge فوق الصورة */}
      <div style={{
        position: 'absolute', bottom: 20, right: 20,
        background: 'white',
        borderRadius: 14, padding: '10px 16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 36, height: 36,
          background: 'linear-gradient(135deg, #4338ca, #6366f1)',
          borderRadius: 9, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Award size={18} color="white" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1917' }}>
            #6 على مستوى ليبيا
          </div>
          <div style={{ fontSize: 11, color: '#78716c' }}>تصنيف الجامعات</div>
        </div>
      </div>
    </div>
  </div>
</section>

/* ━━━━━━━━━━━━━━━━━━━━━━━━━
   4. STATS BAR المُحسَّن
   ━━━━━━━━━━━━━━━━━━━━━━━━━ */
// BEFORE: أرقام بيضاء بأيقونات دائرية باهتة
// AFTER: شريط داكن احترافي

<section style={{
  background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
  padding: '48px 32px',
}}>
  <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
    {[
      { num: '#6',   sub: 'على مستوى ليبيا',     icon: Trophy,      color: '#fbbf24' },
      { num: '2.5K', sub: 'عضو هيئة تدريس',      icon: UserCheck,   color: '#34d399' },
      { num: '+50K', sub: 'طالب مسجّل',           icon: Users,       color: '#818cf8' },
      { num: '29',   sub: 'كلية أكاديمية',        icon: Building,    color: '#f9a8d4' },
    ].map(({ num, sub, icon: Icon, color }) => (
      <div key={num} style={{ textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <Icon size={24} color={color} />
        </div>
        <div style={{
          fontSize: 34, fontWeight: 800, color: 'white',
          lineHeight: 1,
        }}>{num}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>
          {sub}
        </div>
      </div>
    ))}
  </div>
</section>

/* ━━━━━━━━━━━━━━━━━━━━━━━━━
   5. FEATURES CARDS المُحسَّنة
   ━━━━━━━━━━━━━━━━━━━━━━━━━ */
// BEFORE: بطاقات بيضاء بحدود رمادية
// AFTER: بطاقات بتدرج خفي وظل وhover حقيقي

<div style={{
  background: 'white',
  borderRadius: 20,
  padding: 28,
  border: '1px solid rgba(0,0,0,0.06)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
  transition: 'all 250ms ease',
  cursor: 'default',
}}
onMouseEnter={e => {
  e.currentTarget.style.transform = 'translateY(-4px)';
  e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.12)';
  e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)';
}}
onMouseLeave={e => {
  e.currentTarget.style.transform = 'translateY(0)';
  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)';
  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
}}>
  <div style={{
    width: 52, height: 52, borderRadius: 14,
    background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.05))',
    border: '1px solid rgba(99,102,241,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  }}>
    <Brain size={26} color="#4f46e5" />
  </div>
  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1c1917', marginBottom: 10 }}>
    ذكاء اصطناعي مساعد
  </h3>
  <p style={{ fontSize: 14, color: '#78716c', lineHeight: 1.7 }}>
    مساعد دراسي يجيب على أسئلتك ويقترح مسارات مراجعة بناءً على أدائك الفعلي.
  </p>
</div>
```

---

### 🔐 برومبت C — صفحة تسجيل الدخول (Auth Page) — إعادة بناء كاملة

```tsx
// pages/AuthPage.tsx

// BEFORE: نصف أبيض + نصف كحلي مملّ
// AFTER: تصميم حديث بعمق بصري حقيقي

export function AuthPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      direction: 'rtl',
    }}>

      {/* ━━━ الجانب الأيسر — النموذج ━━━ */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '48px 64px',
        background: '#fafaf9',
      }}>
        {/* رابط العودة */}
        <a href="/" style={{
          position: 'absolute', top: 24, right: 24,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: '#78716c',
          textDecoration: 'none',
          padding: '6px 12px',
          borderRadius: 8,
          background: 'rgba(0,0,0,0.04)',
          transition: 'background 200ms',
        }}>
          <Home size={14} />
          الصفحة الرئيسية
        </a>

        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* شعار صغير */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <div style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, #4338ca, #6366f1)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}>
              <GraduationCap size={20} color="white" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1e1b4b' }}>مدارك</span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1c1917', marginBottom: 8 }}>
            مرحباً بعودتك
          </h1>
          <p style={{ fontSize: 15, color: '#78716c', marginBottom: 36 }}>
            سجّل دخولك للوصول إلى مقرراتك وبياناتك الأكاديمية
          </p>

          {/* حقل البريد */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: '#44403c', marginBottom: 8,
            }}>
              البريد الإلكتروني أو رقم القيد
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="example@zu.edu.ly أو UZ-2024-XXXXX"
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 16px',
                  fontSize: 14, fontFamily: 'inherit',
                  background: 'white',
                  border: '1.5px solid #e7e5e4',
                  borderRadius: 10,
                  color: '#1c1917',
                  outline: 'none',
                  transition: 'border-color 200ms, box-shadow 200ms',
                  direction: 'rtl',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#6366f1';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#e7e5e4';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <Mail size={16} style={{
                position: 'absolute', right: 14, top: '50%',
                transform: 'translateY(-50%)', color: '#a8a29e',
              }} />
            </div>
          </div>

          {/* حقل كلمة المرور */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#44403c' }}>
                كلمة المرور
              </label>
              <a href="/forgot-password" style={{
                fontSize: 13, color: '#6366f1', textDecoration: 'none',
              }}>
                نسيت كلمة المرور؟
              </a>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 44px',
                  fontSize: 14, fontFamily: 'inherit',
                  background: 'white',
                  border: '1.5px solid #e7e5e4',
                  borderRadius: 10,
                  outline: 'none',
                  transition: 'all 200ms',
                  direction: 'rtl',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#6366f1';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#e7e5e4';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <Lock size={16} style={{
                position: 'absolute', right: 14, top: '50%',
                transform: 'translateY(-50%)', color: '#a8a29e',
              }} />
            </div>
          </div>

          {/* زر الدخول */}
          <button style={{
            width: '100%', marginTop: 28,
            padding: '14px 24px',
            background: 'linear-gradient(135deg, #4338ca, #6366f1)',
            color: 'white', border: 'none',
            borderRadius: 12, fontSize: 16, fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            transition: 'all 200ms',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 12px 32px rgba(99,102,241,0.5)';
          }}
          onMouseLeave={e => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 24px rgba(99,102,241,0.4)';
          }}>
            تسجيل الدخول
          </button>

          {/* حسابات تجريبية */}
          <div style={{ marginTop: 32 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
            }}>
              <div style={{ flex: 1, height: 1, background: '#e7e5e4' }} />
              <span style={{ fontSize: 12, color: '#a8a29e' }}>حسابات تجريبية</span>
              <div style={{ flex: 1, height: 1, background: '#e7e5e4' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { role: 'طالب',    icon: GraduationCap, color: '#4f46e5', bg: '#eef2ff' },
                { role: 'أستاذ',   icon: BookOpen,      color: '#059669', bg: '#ecfdf5' },
                { role: 'الإدارة', icon: Building2,     color: '#d97706', bg: '#fffbeb' },
                { role: 'الجودة',  icon: Shield,        color: '#dc2626', bg: '#fff1f2' },
              ].map(({ role, icon: Icon, color, bg }) => (
                <button key={role} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px',
                  background: bg, border: `1.5px solid ${color}25`,
                  borderRadius: 10, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color,
                  fontFamily: 'inherit',
                  transition: 'all 150ms',
                }}>
                  <Icon size={15} />
                  {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ الجانب الأيمن — الديكور ━━━ */}
      <div style={{
        background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '60px 48px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* نقاط زخرفية */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        {/* دوائر ضوئية */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(129,140,248,0.3), transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: -40,
          width: 220, height: 220,
          background: 'radial-gradient(circle, rgba(245,158,11,0.2), transparent 70%)',
          borderRadius: '50%',
        }} />

        {/* المحتوى */}
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 380 }}>
          {/* الشعار */}
          <div style={{
            width: 80, height: 80,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 22, margin: '0 auto 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(12px)',
          }}>
            <GraduationCap size={40} color="white" />
          </div>

          <h2 style={{
            fontSize: 28, fontWeight: 800, color: 'white',
            lineHeight: 1.3, marginBottom: 16,
          }}>
            منصة الزاوية
            <br />
            للتعليم الذكي
          </h2>

          <p style={{
            fontSize: 15, color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.8, marginBottom: 40,
          }}>
            بوابتك الأكاديمية الذكية — سجّل الدخول ببريدك الجامعي أو رقم قيدك للوصول 
            إلى مقرراتك وموارد التعلم.
          </p>

          {/* Feature pills */}
          {[
            { icon: Zap, text: 'تعلّم بمساعدة الذكاء الاصطناعي' },
            { icon: BarChart2, text: 'تابع تقدّمك الأكاديمي لحظة بلحظة' },
            { icon: Users, text: 'تواصل مباشر مع الأساتذة' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12, padding: '12px 16px',
              marginBottom: 10, textAlign: 'right',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={16} color="rgba(255,255,255,0.9)" />
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### 📊 برومبت D — لوحة تحكم الطالب — إعادة بناء جذرية

```tsx
// BEFORE: Sidebar داكن كحلي + محتوى أبيض مسطح + tabs مربكة
// AFTER: Sidebar Indigo عميق راقٍ + محتوى دافئ + تسلسل بصري واضح

/* ━━━ A. SIDEBAR الجديد ━━━ */
<aside style={{
  width: 256,
  background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)',
  height: '100vh', position: 'fixed',
  right: 0, top: 0,
  display: 'flex', flexDirection: 'column',
  boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
  zIndex: 40,
}}>
  {/* شعار المنصة */}
  <div style={{
    padding: '24px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 11,
        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(99,102,241,0.5)',
      }}>
        <GraduationCap size={22} color="white" />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>مدارك</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>جامعة الزاوية</div>
      </div>
    </div>
  </div>

  {/* معلومات المستخدم — لا tabs للتبديل بين الأدوار هنا */}
  <div style={{
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 700, color: '#1c1917',
      }}>
        أح
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>أحمد ...</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'rgba(99,102,241,0.3)',
          borderRadius: 100, padding: '2px 10px',
          fontSize: 10, color: '#c7d2fe', fontWeight: 500,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#818cf8' }} />
          طالب
        </div>
      </div>
    </div>
  </div>

  {/* قائمة التنقل */}
  <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
    {/* القسم الرئيسي */}
    <div style={{ marginBottom: 8 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.3)', padding: '4px 8px 8px',
        textTransform: 'uppercase',
      }}>
        الرئيسي
      </div>
      {[
        { icon: Home,      label: 'الرئيسية',           active: false },
        { icon: Grid,      label: 'لوحة التحكم',        active: true  },
        { icon: Calendar,  label: 'الجدول الدراسي',     active: false },
        { icon: BookOpen,  label: 'مواد مسجلة',         active: false },
        { icon: BarChart2, label: 'النتائج والتقييمات', active: false },
      ].map(({ icon: Icon, label, active }) => (
        <button key={label} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 12px', borderRadius: 10, border: 'none',
          background: active ? 'rgba(99,102,241,0.25)' : 'transparent',
          color: active ? '#c7d2fe' : 'rgba(255,255,255,0.55)',
          cursor: 'pointer', textAlign: 'right',
          fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 600 : 400,
          marginBottom: 2,
          borderRight: active ? '3px solid #818cf8' : '3px solid transparent',
          transition: 'all 150ms',
        }}>
          <Icon size={17} />
          {label}
        </button>
      ))}
    </div>

    {/* قسم التعلم الذكي */}
    <div style={{ marginTop: 16 }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.3)', padding: '4px 8px 8px',
        textTransform: 'uppercase',
      }}>
        التعلم الذكي
      </div>
      {[
        { icon: Cpu,        label: 'المصفوفة التعليمية' },
        { icon: FileText,   label: 'الاختبارات الإلكترونية' },
        { icon: Library,    label: 'المكتبة الإلكترونية' },
        { icon: Flask,      label: 'المعامل الافتراضية' },
      ].map(({ icon: Icon, label }) => (
        <button key={label} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '9px 12px', borderRadius: 10, border: 'none',
          background: 'transparent',
          color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer', textAlign: 'right',
          fontFamily: 'inherit', fontSize: 13,
          marginBottom: 2, transition: 'all 150ms',
          borderRight: '3px solid transparent',
        }}>
          <Icon size={17} />
          {label}
        </button>
      ))}
    </div>
  </nav>

  {/* أسفل السايدبار */}
  <div style={{
    padding: '16px 12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  }}>
    <button style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 10, border: 'none',
      background: 'rgba(244,63,94,0.12)',
      color: '#fca5a5', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 13,
    }}>
      <LogOut size={16} />
      تسجيل الخروج
    </button>
  </div>
</aside>

/* ━━━ B. TOPBAR الجديد ━━━ */
<header style={{
  height: 64,
  background: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(0,0,0,0.06)',
  position: 'sticky', top: 0, zIndex: 30,
  display: 'flex', alignItems: 'center',
  padding: '0 24px',
  gap: 16,
}}>
  {/* Breadcrumb */}
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ fontSize: 13, color: '#a8a29e' }}>الرئيسية</span>
    <ChevronLeft size={14} color="#d6d3d1" />
    <span style={{ fontSize: 13, fontWeight: 600, color: '#1c1917' }}>لوحة التحكم</span>
  </div>

  {/* شريط البحث */}
  <div style={{
    flex: '0 0 300px', position: 'relative',
  }}>
    <input placeholder="ابحث في المنصة..." style={{
      width: '100%', padding: '8px 36px 8px 14px',
      background: '#f5f5f4', border: '1px solid #e7e5e4',
      borderRadius: 10, fontSize: 13, fontFamily: 'inherit',
      outline: 'none', direction: 'rtl',
    }} />
    <Search size={15} style={{
      position: 'absolute', right: 12, top: '50%',
      transform: 'translateY(-50%)', color: '#a8a29e',
    }} />
  </div>

  {/* زر AI — مُصغَّر وأنيق */}
  <button style={{
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '7px 14px',
    background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
    border: 'none', borderRadius: 9,
    color: 'white', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 2px 8px rgba(30,27,75,0.3)',
  }}>
    <Sparkles size={14} />
    اسأل AI
  </button>

  {/* الإشعارات */}
  <button style={{
    position: 'relative', width: 38, height: 38,
    background: 'transparent', border: '1px solid #e7e5e4',
    borderRadius: 10, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <Bell size={18} color="#57534e" />
    <span style={{
      position: 'absolute', top: 6, right: 6,
      width: 8, height: 8, borderRadius: '50%',
      background: '#f43f5e',
      border: '1.5px solid white',
    }} />
  </button>

  {/* المستخدم */}
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '6px 12px', borderRadius: 10,
    border: '1px solid #e7e5e4', cursor: 'pointer',
    background: 'white',
  }}>
    <div style={{
      width: 30, height: 30, borderRadius: 8,
      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: '#1c1917',
    }}>أح</div>
    <span style={{ fontSize: 13, fontWeight: 500, color: '#1c1917' }}>أحمد</span>
    <ChevronDown size={14} color="#a8a29e" />
  </div>
</header>

/* ━━━ C. بطاقات الإحصاء المُحسَّنة ━━━ */
// BEFORE: بطاقتان متضاربتان (بيضاء + كريمية)
// AFTER: 4 بطاقات موحدة النظام

<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 16, marginBottom: 24,
}}>
  {[
    {
      title: 'التقدم الأكاديمي',
      value: '75%',
      sub: '60 من 80 ساعة معتمدة',
      icon: TrendingUp,
      color: '#6366f1', bg: '#eef2ff',
      type: 'percent',
    },
    {
      title: 'المعدل التراكمي',
      value: '3.8',
      sub: 'ممتاز',
      icon: Star,
      color: '#d97706', bg: '#fffbeb',
      type: 'gpa',
    },
    {
      title: 'تقدم الفصل',
      value: '60%',
      sub: 'من بداية الفصل',
      icon: Calendar,
      color: '#059669', bg: '#ecfdf5',
      type: 'percent',
    },
    {
      title: 'الواجبات المعلقة',
      value: '3',
      sub: 'واجبات لم تُسلَّم بعد',
      icon: ClipboardList,
      color: '#dc2626', bg: '#fff1f2',
      type: 'count',
    },
  ].map(({ title, value, sub, icon: Icon, color, bg }) => (
    <div key={title} style={{
      background: 'white',
      borderRadius: 16,
      padding: '20px 20px',
      border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: '#78716c', marginBottom: 8, fontWeight: 500 }}>
            {title}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1c1917', lineHeight: 1 }}>
            {value}
          </div>
          <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 6 }}>{sub}</div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={22} color={color} />
        </div>
      </div>
    </div>
  ))}
</div>

/* ━━━ D. ترحيب مُحسَّن ━━━ */
// BEFORE: نص بارد بدون خلفية
// AFTER: بطاقة ترحيب بـ gradient خفيف

<div style={{
  background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
  borderRadius: 20, padding: '28px 32px',
  marginBottom: 24, position: 'relative', overflow: 'hidden',
}}>
  {/* زخرفة خلفية */}
  <div style={{
    position: 'absolute', top: -20, left: -20,
    width: 160, height: 160,
    background: 'radial-gradient(circle, rgba(129,140,248,0.3), transparent 70%)',
    borderRadius: '50%',
  }} />
  <div style={{ position: 'relative' }}>
    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
      الاثنين، 26 مايو 2026
    </div>
    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 6 }}>
      صباح الخير، أحمد 👋
    </h1>
    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
      لوحة متابعة تقدّمك الأكاديمي — كلية تقنية المعلومات
    </p>
  </div>
</div>
```

---

### 🎨 برومبت E — تحسينات CSS عامة فورية (Quick Wins)

```css
/* ملف: improvements.css — أضفه فوراً */

/* ━━━ 1. خلفية الصفحة الداخلية ━━━ */
.dashboard-content {
  background: #f8f7f5; /* دافئ بدلاً من أبيض ثلجي */
  min-height: 100vh;
}

/* ━━━ 2. بطاقات موحدة ━━━ */
.card {
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: box-shadow 250ms ease, transform 250ms ease;
}
.card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

/* ━━━ 3. شريط التقدم ━━━ */
.progress-track {
  height: 8px;
  background: #f0eeec;
  border-radius: 100px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4f46e5, #818cf8);
  border-radius: 100px;
  transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
}
/* للتقدم الذهبي — إنجازات */
.progress-fill.gold {
  background: linear-gradient(90deg, #d97706, #fbbf24);
}
/* للتقدم الأخضر — حضور */
.progress-fill.success {
  background: linear-gradient(90deg, #059669, #34d399);
}

/* ━━━ 4. Badges ━━━ */
.badge {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 600;
  font-variant-numeric: normal;
}
.badge-primary { background: #eef2ff; color: #4f46e5; }
.badge-success { background: #ecfdf5; color: #059669; }
.badge-warning { background: #fffbeb; color: #d97706; }
.badge-danger  { background: #fff1f2; color: #dc2626; }
.badge-gold    { background: #fffbeb; color: #b45309; }

/* ━━━ 5. Active sidebar item ━━━ */
.sidebar-item.active {
  background: rgba(99,102,241,0.2) !important;
  color: #c7d2fe !important;
  border-right: 3px solid #818cf8 !important;
  font-weight: 600;
}
.sidebar-item:hover:not(.active) {
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.75);
}

/* ━━━ 6. Input focus states ━━━ */
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #6366f1 !important;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important;
}

/* ━━━ 7. أزرار رئيسية ━━━ */
.btn-primary {
  background: linear-gradient(135deg, #4338ca, #6366f1);
  color: white; border: none;
  border-radius: 10px; padding: 10px 22px;
  font-size: 14px; font-weight: 600;
  cursor: pointer; font-family: inherit;
  box-shadow: 0 4px 12px rgba(99,102,241,0.35);
  transition: all 200ms ease;
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99,102,241,0.45);
}

.btn-secondary {
  background: white; color: #4338ca;
  border: 1.5px solid rgba(99,102,241,0.25);
  border-radius: 10px; padding: 10px 22px;
  font-size: 14px; font-weight: 500;
  cursor: pointer; font-family: inherit;
  transition: all 200ms ease;
}
.btn-secondary:hover {
  background: #eef2ff;
  border-color: rgba(99,102,241,0.4);
}

/* ━━━ 8. Loading Skeleton ━━━ */
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton {
  background: linear-gradient(90deg,
    #f0eeec 25%, #e7e5e4 50%, #f0eeec 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 8px;
}

/* ━━━ 9. Scrollbar مخصص ━━━ */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: #d6d3d1; border-radius: 100px;
}
::-webkit-scrollbar-thumb:hover { background: #a8a29e; }

/* ━━━ 10. إخفاء أرقام هندية — نهائياً ━━━ */
* {
  font-variant-numeric: normal !important;
  -moz-font-feature-settings: "lnum" !important;
  -webkit-font-feature-settings: "lnum" !important;
  font-feature-settings: "lnum" !important;
}
```

---

### 📋 برومبت F — Notification Dropdown الصحيح

```tsx
// components/NotificationDropdown.tsx
// يجب أن يكون Dropdown وليس صفحة

import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, ChevronLeft, BookOpen, 
         FileText, Award, AlertCircle } from 'lucide-react';

const NOTIFICATION_ICONS = {
  assignment: { icon: FileText,   bg: '#eef2ff', color: '#4f46e5' },
  grade:      { icon: Award,      bg: '#fffbeb', color: '#d97706' },
  course:     { icon: BookOpen,   bg: '#ecfdf5', color: '#059669' },
  alert:      { icon: AlertCircle,bg: '#fff1f2', color: '#dc2626' },
};

export function NotificationDropdown({ notifications, unreadCount, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* ━━━ زر الجرس ━━━ */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 38, height: 38, position: 'relative',
          background: 'transparent',
          border: `1px solid ${open ? '#6366f1' : '#e7e5e4'}`,
          borderRadius: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 150ms',
          background: open ? '#eef2ff' : 'transparent',
        }}
      >
        <Bell size={17} color={open ? '#4f46e5' : '#57534e'} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 5, right: 5,
            width: 8, height: 8, borderRadius: '50%',
            background: '#f43f5e',
            border: '1.5px solid white',
          }} />
        )}
      </button>

      {/* ━━━ Panel الإشعارات ━━━ */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,               /* RTL: يظهر من اليسار */
          width: 360,
          background: 'white',
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 20px 48px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          zIndex: 1000,
          animation: 'dropIn 180ms ease',
        }}>
          {/* الرأس */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #f5f5f4',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1c1917' }}>
                الإشعارات
              </span>
              {unreadCount > 0 && (
                <span style={{
                  background: '#eef2ff', color: '#4f46e5',
                  borderRadius: 100, padding: '1px 8px',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {unreadCount}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onMarkAllRead}
                style={{
                  fontSize: 12, color: '#6366f1', fontWeight: 500,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 8px', borderRadius: 6,
                  fontFamily: 'inherit',
                }}
              >
                <Check size={13} style={{ display: 'inline', marginLeft: 4 }} />
                تعليم الكل كمقروء
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: '#f5f5f4', border: 'none',
                  borderRadius: 7, width: 26, height: 26,
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={13} color="#78716c" />
              </button>
            </div>
          </div>

          {/* قائمة الإشعارات */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.map(({ id, type, title, message, time, isRead }) => {
              const { icon: Icon, bg, color } = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.alert;
              return (
                <div key={id} style={{
                  display: 'flex', gap: 14,
                  padding: '14px 20px',
                  background: isRead ? 'white' : '#fafaf9',
                  borderBottom: '1px solid #f5f5f4',
                  cursor: 'pointer',
                  transition: 'background 150ms',
                  position: 'relative',
                }}>
                  {!isRead && (
                    <div style={{
                      position: 'absolute', right: 8, top: '50%',
                      transform: 'translateY(-50%)',
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#6366f1',
                    }} />
                  )}
                  <div style={{
                    width: 40, height: 40, borderRadius: 11,
                    background: bg, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={19} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1917', marginBottom: 3 }}>
                      {title}
                    </div>
                    <div style={{
                      fontSize: 12, color: '#78716c', lineHeight: 1.5,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {message}
                    </div>
                    <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 4 }}>{time}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* الذيل */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #f5f5f4',
            background: '#fafaf9',
          }}>
            <a href="/notifications" onClick={() => setOpen(false)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 13, color: '#4f46e5', fontWeight: 600,
              textDecoration: 'none',
            }}>
              عرض جميع الإشعارات
              <ChevronLeft size={14} />
            </a>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}
```

---

## 📌 خلاصة الأولويات الفورية

### 🔴 ابدأ بهذه الـ 3 خطوات اليوم:

**الخطوة 1 — تغيير الخط والألوان (30 دقيقة)**
```bash
# أضف في index.html:
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet">

# في globals.css غيّر:
body { font-family: 'IBM Plex Sans Arabic', sans-serif; background: #f8f7f5; }
# وأضف المتغيرات من برومبت A
```

**الخطوة 2 — تحديث السايدبار (ساعتان)**
- طبّق كود برومبت D — قسم SIDEBAR
- أزل tabs الأدوار من أعلى السايدبار
- أضف الأيقونات مع كل عنصر قائمة
- غيّر الخلفية إلى gradient Indigo عميق

**الخطوة 3 — إصلاح Notifications (ساعة)**
- طبّق كامل برومبت F
- احذف route `/notifications` من زر الجرس
- يجب أن يفتح Dropdown في مكانه فقط

---

*الإصدار 2.0 — بناءً على تحليل بصري مباشر للقطات الشاشة*  
*جامعة الزاوية — منصة مدارك — مايو 2026*
