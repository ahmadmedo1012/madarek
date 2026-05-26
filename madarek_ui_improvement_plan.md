# 📋 خطة تطوير وتحسين مظهر منصة مدارك
## منصة جامعة الزاوية للتعليم الذكي

---

## أولاً: ملخص المشاكل المُكتشفة

| # | المشكلة | الأولوية | الصفحة المتأثرة |
|---|---------|----------|----------------|
| 1 | التصميم العام يحتاج تحسيناً شاملاً | 🔴 عالية | جميع الصفحات |
| 2 | زر الإشعارات يفتح صفحة بدلاً من Dropdown | 🔴 عالية | جميع الصفحات |
| 3 | أرقام هندية بدلاً من أرقام عربية/غربية | 🟡 متوسطة | متفرقة |
| 4 | غياب نظام تصميم موحد (Design System) | 🔴 عالية | جميع الصفحات |

---

## ثانياً: برومبت التطوير الشامل (للمطوّر)

---

### 🎨 برومبت رقم 1 — نظام الألوان والخطوط (Design System)

```
أنت مطوّر Frontend متخصص في React وTailwind CSS.

المطلوب: إنشاء نظام تصميم موحد (Design System) لمنصة "مدارك" التعليمية 
لجامعة الزاوية الليبية. المنصة تدعم RTL وتستخدم اللغة العربية.

**لوحة الألوان الجديدة:**
:root {
  /* الألوان الرئيسية */
  --primary-50:  #EEF2FF;
  --primary-100: #E0E7FF;
  --primary-500: #4F46E5;   /* اللون الرئيسي - بنفسجي عميق */
  --primary-600: #4338CA;
  --primary-700: #3730A3;
  
  /* ألوان النجاح */
  --success-50:  #ECFDF5;
  --success-500: #10B981;
  --success-700: #047857;
  
  /* ألوان التحذير */
  --warning-50:  #FFFBEB;
  --warning-500: #F59E0B;
  --warning-700: #B45309;
  
  /* ألوان الخطر */
  --danger-50:   #FFF1F2;
  --danger-500:  #F43F5E;
  --danger-700:  #BE123C;
  
  /* درجات الرمادي */
  --gray-50:  #F9FAFB;
  --gray-100: #F3F4F6;
  --gray-200: #E5E7EB;
  --gray-300: #D1D5DB;
  --gray-400: #9CA3AF;
  --gray-500: #6B7280;
  --gray-600: #4B5563;
  --gray-700: #374151;
  --gray-800: #1F2937;
  --gray-900: #111827;
  
  /* الخلفيات */
  --bg-primary:   #FFFFFF;
  --bg-secondary: #F9FAFB;
  --bg-tertiary:  #F3F4F6;
  
  /* الظلال */
  --shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1);
  
  /* الحواف الدائرية */
  --radius-sm:  0.375rem;
  --radius-md:  0.5rem;
  --radius-lg:  0.75rem;
  --radius-xl:  1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;
}

**الخطوط:**
- الخط الرئيسي: "Cairo" أو "Noto Kufi Arabic" من Google Fonts
- أوزان الخط المستخدمة: 400 (عادي), 500 (متوسط), 600 (شبه عريض), 700 (عريض)
- حجم الخط الأساسي: 16px
- تسلسل الأحجام: 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48px

**الشبكة (Grid):**
- حاوية رئيسية: max-width 1280px
- الحشو الأفقي: 24px للجوال، 32px للوحة، 48px للشاشة الكبيرة
- الفجوات: 16px، 24px، 32px

طبّق هذا النظام على ملفات globals.css أو tailwind.config.js
```

---

### 🔔 برومبت رقم 2 — إصلاح زر الإشعارات (Dropdown بدلاً من صفحة)

```
أنت مطوّر React. المشكلة: زر الإشعارات في Navbar يوجّه المستخدم 
لصفحة /notifications بدلاً من عرض Dropdown في مكانه.

المطلوب: تحويله إلى مكوّن NotificationDropdown يعمل هكذا:

1. **عند النقر على زر الجرس:** يظهر Dropdown Panel في مكانه (لا توجيه)
2. **عند النقر خارجه:** يختفي (useClickOutside hook)
3. **تصميم الـ Dropdown:**

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'assignment' | 'grade';
  isRead: boolean;
  createdAt: Date;
  link?: string;
}

الكود المطلوب:

// NotificationDropdown.tsx
import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, ChevronRight } from 'lucide-react';

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // إغلاق عند النقر خارج المكوّن
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* زر الجرس */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
        aria-label="الإشعارات"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {/* شارة العدد */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 
                          text-white text-[10px] font-bold rounded-full 
                          flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {/* Panel الإشعارات */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-2xl 
                       shadow-xl border border-gray-100 z-50 overflow-hidden
                       animate-in fade-in slide-in-from-top-2 duration-200">
          {/* الرأس */}
          <div className="flex items-center justify-between px-4 py-3 
                         border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">الإشعارات</h3>
            <div className="flex items-center gap-2">
              <button onClick={markAllRead} 
                      className="text-xs text-primary-600 hover:text-primary-700 
                                font-medium transition-colors">
                تعليم الكل كمقروء
              </button>
              <button onClick={() => setIsOpen(false)}
                      className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>
          
          {/* قائمة الإشعارات */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.map(notification => (
                <NotificationItem key={notification.id} {...notification} />
              ))
            )}
          </div>
          
          {/* الذيل - رابط عرض الكل */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <Link to="/notifications" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-1 text-sm 
                             text-primary-600 hover:text-primary-700 font-medium
                             transition-colors">
              عرض جميع الإشعارات
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

الـ Dropdown يظهر ويختفي بـ animation سلس، ولا يوجّه لصفحة أخرى.
رابط "عرض جميع الإشعارات" في الأسفل يوجّه لصفحة الإشعارات الكاملة فقط.
```

---

### 🔢 برومبت رقم 3 — إصلاح الأرقام الهندية

```
أنت مطوّر React. المشكلة: بعض الأرقام في الموقع تظهر بالصيغة الهندية 
(٠١٢٣٤٥٦٧٨٩) بدلاً من الصيغة العربية/الغربية (0123456789).

**السبب:** CSS يطبّق font-variant-numeric أو الخط العربي يحوّل الأرقام تلقائياً.

**الحل الشامل:**

1. في ملف globals.css أضف:
/* إجبار الأرقام الغربية في كل مكان */
* {
  font-variant-numeric: normal;
}

/* لعناصر الأرقام المحددة */
[data-numeral], .numeral, .stat-number, 
.badge, .count, table td:is([class*="num"], [class*="count"]) {
  font-feature-settings: "lnum" 1;
  font-variant-numeric: normal;
  direction: ltr;
  unicode-bidi: embed;
}

2. في ملف tailwind.config.js:
fontFamily: {
  'arabic': ['Cairo', 'sans-serif'],
},
// تأكد من إضافة هذا في CSS:
// @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');

3. دالة مساعدة لتحويل الأرقام:
// utils/numbers.ts
export function toWesternNumerals(str: string | number): string {
  return String(str).replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632));
}

export function formatNumber(num: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(num);
}

// استخدمها في كل مكان تعرض فيه أرقاماً:
// ❌ خطأ:   <span>{count}</span>
// ✅ صحيح:  <span>{toWesternNumerals(count)}</span>

4. في مكوّن DateDisplay:
// استخدم 'en-GB' أو 'en-US' لعرض التواريخ بالأرقام الغربية
const formatDate = (date: Date) => 
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  }).format(date);
```

---

### 🏠 برومبت رقم 4 — تحسين الصفحة الرئيسية (Landing Page)

```
أنت مطوّر React + Tailwind. المطلوب تحسين شامل للصفحة الرئيسية لمنصة 
"مدارك" (منصة جامعة الزاوية للتعليم الذكي).

**الهيكل الجديد للصفحة الرئيسية:**

[1] HERO SECTION
- خلفية: Gradient من primary-700 إلى primary-500
- عنوان رئيسي: "منصة مدارك للتعليم الذكي" — خط Cairo Bold 48px
- عنوان فرعي: "بوابتك للتعليم الرقمي في جامعة الزاوية" — 20px
- زران رئيسيان: "تسجيل الدخول" (أبيض صلب) + "تعرّف أكثر" (outline أبيض)
- صورة أو Illustration على اليمين (أو لوتي animation)
- موجة SVG في الأسفل تفصل القسم عن ما يليه

[2] STATS BAR
- شريط رمادي فاتح به 4 أرقام إحصائية:
  - عدد الطلاب المسجّلين
  - عدد المقررات
  - عدد أعضاء هيئة التدريس
  - معدل الرضا
- كل رقم: عدد كبير Bold + تسمية صغيرة تحته
- تأثير Count-up animation عند الدخول للقسم

[3] FEATURES SECTION
- عنوان: "لماذا تختار مدارك؟"
- شبكة 3 أعمدة (grid) من بطاقات المزايا:
  - كل بطاقة: أيقونة ملوّنة + عنوان + وصف قصير
  - ألوان متنوعة لخلفيات الأيقونات
- المزايا: تعلّم ذكي، متابعة الأداء، تواصل مباشر، محتوى غني، 
           تقييم فوري، دعم مستمر

[4] ROLES SECTION  
- عنوان: "للجميع في الجامعة"
- 4 بطاقات أفقية أو Grid:
  - الطالب: وصف + زر "دخول الطلاب"
  - عضو هيئة التدريس: وصف + زر "دخول الأساتذة"
  - الإدارة: وصف + زر "دخول الإدارة"
  - ضمان الجودة: وصف + زر "دخول الجودة"

[5] FOOTER
- شعار الجامعة + شعار المنصة
- روابط سريعة
- معلومات التواصل
- حقوق النشر

**ملاحظات التصميم:**
- الاتجاه: RTL
- خط Cairo من Google Fonts
- Tailwind CSS للتنسيق
- تأثيرات hover سلسة على البطاقات (scale + shadow)
- Framer Motion للـ animations (أو CSS animations بسيطة)
```

---

### 📊 برومبت رقم 5 — تحسين لوحة تحكم الطالب (Student Dashboard)

```
أنت مطوّر React. المطلوب تحسين شامل للوحة تحكم الطالب في منصة مدارك.

**الهيكل المطلوب:**

[SIDEBAR - يمين للـ RTL]
- عرض: 260px
- خلفية: white مع border-r رفيع
- عناصر القائمة:
  * الرئيسية (Home icon)
  * مقرراتي (BookOpen icon)
  * الجدول الدراسي (Calendar icon)
  * الواجبات (ClipboardList icon)
  * الامتحانات (FileText icon)
  * درجاتي (Award icon)
  * الرسائل (MessageSquare icon)
  * الإعدادات (Settings icon)
- Active item: خلفية primary-50 + نص primary-700 + خط جانبي primary-500
- تأثير hover: خلفية gray-50

[TOPBAR]
- ترحيب: "مرحباً [اسم الطالب]" + التاريخ الحالي
- شريط بحث
- زر الإشعارات (Dropdown وليس صفحة — راجع برومبت رقم 2)
- صورة الملف الشخصي + اسم + رتبة

[MAIN CONTENT AREA]

القسم الأول - بطاقات الإحصاء (4 بطاقات):
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  المقررات المسجلة │    الواجبات     │   الدرجة الكلية │   حضور الفصول  │
│       6         │   3 متبقية      │    87.5%        │      92%        │
│   📚 أزرق       │   📋 برتقالي    │   ⭐ بنفسجي    │   ✅ أخضر      │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
كل بطاقة تحتوي:
- لون خلفية فاتح (50 stop)
- أيقونة ملوّنة (500 stop)
- رقم كبير bold
- تسمية + اتجاه التغيير (↑ ↓)

القسم الثاني - صفين جانبيين:

اليسار (7 أعمدة):
[مقرراتي الحالية]
- قائمة بالمقررات
- كل مقرر: صورة مصغّرة + اسم المقرر + اسم الأستاذ
  + شريط تقدّم (Progress Bar) ملوّن + نسبة الإتمام
- زر "متابعة" لكل مقرر

اليمين (5 أعمدة):
[الواجبات القادمة]
- قائمة مرتّبة بالتاريخ
- كل واجب: أيقونة + اسم + تاريخ التسليم + badge الحالة
- badge الحالة: "متأخر" (أحمر) / "اليوم" (برتقالي) / "غداً" (أصفر) / "هذا الأسبوع" (أزرق)

القسم الثالث:
[التقويم الأسبوعي]
- عرض أسبوعي بسيط
- كل يوم: قائمة المحاضرات والمواعيد
- ألوان مختلفة لكل مقرر

**تصميم بطاقة المقرر:**
<div className="bg-white rounded-2xl border border-gray-100 
               hover:shadow-md transition-all duration-200 p-4 
               flex items-center gap-4">
  <div className="w-12 h-12 rounded-xl [bg-color] 
                 flex items-center justify-center flex-shrink-0">
    <Icon className="w-6 h-6 [text-color]" />
  </div>
  <div className="flex-1 min-w-0">
    <h4 className="font-semibold text-gray-900 text-sm truncate">اسم المقرر</h4>
    <p className="text-xs text-gray-500 mt-0.5">د. اسم الأستاذ</p>
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>التقدم</span>
        <span>65%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 rounded-full" 
             style={{ width: '65%' }} />
      </div>
    </div>
  </div>
  <button className="text-primary-600 hover:text-primary-700 
                    text-xs font-medium flex items-center gap-1">
    متابعة <ChevronLeft className="w-3 h-3" />
  </button>
</div>
```

---

### 👨‍🏫 برومبت رقم 6 — تحسين لوحة تحكم المدرّس (Teacher Dashboard)

```
أنت مطوّر React. المطلوب تحسين لوحة تحكم المدرّس في منصة مدارك.

**الإضافات الرئيسية على النمط العام:**

[SIDEBAR الخاص بالمدرس]
* الرئيسية
* مقرراتي
* إدارة المحتوى (رفع محاضرات، ملفات)
* الواجبات والامتحانات
* قائمة الطلاب
* التقييمات والدرجات
* التقارير والإحصاءات
* الرسائل

[بطاقات الإحصاء للمدرس]
- إجمالي الطلاب المسجّلين
- المقررات التي يدرّسها
- متوسط درجات الطلاب
- الواجبات بانتظار التصحيح

[القسم الرئيسي - صفّان جانبيان]

اليسار:
[مقرراتي - Quick Access]
- بطاقة لكل مقرر:
  * اسم المقرر + عدد الطلاب + آخر تحديث
  * 3 أزرار سريعة: [رفع محتوى] [إضافة واجب] [عرض الطلاب]
  * شريط تقدّم يُظهر نسبة إكمال المحتوى

اليمين:
[الواجبات بانتظار المراجعة]
- قائمة مرتّبة بالأقدم أولاً
- كل واجب: اسم الطالب + المقرر + تاريخ التسليم + زر "مراجعة"
- Badge: "جديد" (أخضر) / "مراجعة" (أصفر)

[جدول الحضور السريع]
- Widget صغير لتسجيل الحضور السريع لمقرر اليوم
- زر "بدء تسجيل الحضور" يفتح Modal أنيق

**Modal رفع المحتوى:**
- drag & drop zone مع Dashed border + Icon
- دعم PDF, Video, Audio, Images, Documents
- شريط تقدّم الرفع
- تسمية المحتوى + اختيار المقرر + وصف اختياري
```

---

### ⚙️ برومبت رقم 7 — تحسين لوحة الإدارة (Admin Dashboard)

```
أنت مطوّر React. المطلوب تحسين لوحة تحكم الإدارة في منصة مدارك.

**مكوّنات لوحة الإدارة:**

[إحصاءات سريعة - 4 بطاقات كبيرة]
- إجمالي المستخدمين (مع تفكيك: طلاب / أساتذة / موظفون)
- المقررات النشطة
- الجلسات النشطة الآن (Live)
- التقارير المعلّقة

[رسم بياني - Chart.js أو Recharts]
- خط زمني لعدد تسجيلات الدخول اليومية (آخر 30 يوم)
- قضبان لتوزيع الدرجات عبر الأقسام
- Pie chart لتوزيع أدوار المستخدمين

[جداول الإدارة]
- جدول آخر المستخدمين المسجّلين
  * الاسم + البريد + الدور + تاريخ التسجيل + الحالة (نشط/معطّل)
  * أزرار: [تفاصيل] [تعديل] [تعطيل]
  * Pagination في الأسفل

- جدول المقررات
  * اسم المقرر + القسم + المدرّس + عدد الطلاب + الحالة
  * فلترة حسب القسم والحالة

[Modal إضافة مستخدم جديد]
- نموذج متعدد الخطوات (Stepper):
  خطوة 1: المعلومات الأساسية (الاسم، البريد، الدور)
  خطوة 2: الصلاحيات والمجموعات
  خطوة 3: تأكيد وإرسال

**تصميم الجداول:**
- Header: bg-gray-50 + text-gray-600 + text-xs uppercase
- Rows: hover:bg-gray-50 transition
- Borders: border-b border-gray-100 فقط (لا borders عمودية)
- Status Badges: pill مستدير + لون مناسب
- أزرار الإجراءات: icon buttons صغيرة مع tooltip
```

---

### 🧭 برومبت رقم 8 — تحسين Navbar الرئيسي (مشترك بين جميع الصفحات)

```
أنت مطوّر React. المطلوب إنشاء Navbar احترافي مشترك لمنصة مدارك.

**المواصفات:**
- ارتفاع: 64px
- خلفية: bg-white مع border-b border-gray-100 وظل خفيف (shadow-sm)
- Sticky في الأعلى: position: sticky; top: 0; z-index: 50

**المكوّنات من اليمين لليسار (RTL):**
1. شعار المنصة (Logo + "مدارك")
2. Toggle لفتح/إغلاق Sidebar على الجوال
3. Spacer (flex-1)
4. شريط البحث (مخفي على الجوال، ظاهر على اللوحة)
5. زر الإشعارات (Dropdown — برومبت رقم 2)
6. زر الرسائل (Dropdown مشابه)
7. Avatar المستخدم + اسمه + دوره + سهم لأسفل
   → Dropdown يحتوي: الملف الشخصي / الإعدادات / تسجيل الخروج

**User Dropdown:**
<div className="w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-1">
  {/* رأس الـ Dropdown */}
  <div className="px-3 py-3 border-b border-gray-50">
    <div className="flex items-center gap-3">
      <img src={avatar} className="w-10 h-10 rounded-full object-cover" />
      <div>
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        <p className="text-xs text-gray-500">{role}</p>
      </div>
    </div>
  </div>
  
  {/* قائمة الخيارات */}
  <div className="py-1">
    <MenuItem icon={User} label="الملف الشخصي" href="/profile" />
    <MenuItem icon={Settings} label="الإعدادات" href="/settings" />
    <MenuItem icon={HelpCircle} label="المساعدة" href="/help" />
    <div className="border-t border-gray-100 my-1" />
    <MenuItem icon={LogOut} label="تسجيل الخروج" onClick={logout} 
              className="text-red-600 hover:bg-red-50" />
  </div>
</div>

**Breadcrumbs (تحت Navbar مباشرة):**
الرئيسية > مقرراتي > مقرر البرمجة
- separator: "/" أو "›"
- الصفحة الحالية: bold + text-gray-900
- الصفحات السابقة: text-gray-400 + hover:text-gray-600 + link
```

---

### 📱 برومبت رقم 9 — الاستجابة للجوال (Mobile Responsive)

```
أنت مطوّر React + Tailwind. المطلوب ضمان استجابة كاملة للجوال في منصة مدارك.

**النقاط الحرجة:**

1. SIDEBAR على الجوال:
- يُخفى افتراضياً
- يظهر من الجانب الأيمن (RTL) عند النقر على زر القائمة (☰)
- Overlay داكن خلفه يُغلقه عند النقر
- Animation: translate-x من اليمين للداخل

const [sidebarOpen, setSidebarOpen] = useState(false);
// Sidebar: fixed inset-y-0 right-0 z-50 w-64 bg-white shadow-xl
// يظهر: translate-x-0 | يختفي: translate-x-full

2. NAVBAR على الجوال:
- إخفاء شريط البحث (hidden md:flex)
- إخفاء اسم المستخدم (hidden sm:block)
- إظهار زر القائمة (md:hidden)

3. DASHBOARD CARDS:
- شاشة كبيرة (lg): 4 أعمدة
- شاشة وسطى (md): 2 أعمدة
- جوال (sm): 1 عمود
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4

4. TABLES على الجوال:
- استبدل الجداول بـ Card View على الجوال:
<div className="block md:hidden space-y-3">
  {data.map(row => (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-sm text-gray-500">{row.subtitle}</p>
        </div>
        <StatusBadge status={row.status} />
      </div>
      <div className="mt-3 flex gap-2">
        <ActionButton />
      </div>
    </div>
  ))}
</div>

5. FORMS على الجوال:
- حقول النماذج: full width على الجوال
- Grid 2-columns على اللوحة/الشاشة الكبيرة
- grid-cols-1 md:grid-cols-2

6. BOTTOM NAVIGATION (للجوال فقط):
- شريط تنقل سفلي: 5 أيقونات للصفحات الأكثر استخداماً
- fixed bottom-0 left-0 right-0 bg-white border-t
- الأيقونة النشطة: text-primary-600 + bg-primary-50 مستدير
```

---

### ✨ برومبت رقم 10 — التفاصيل الدقيقة والـ Micro-interactions

```
أنت مطوّر React. المطلوب إضافة تفاصيل تصميمية دقيقة ترفع جودة منصة مدارك.

**1. Loading States:**
// Skeleton Loading لبطاقات المقررات
const CourseSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
    <div className="flex gap-4">
      <div className="w-12 h-12 bg-gray-200 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-2 bg-gray-200 rounded w-full mt-2" />
      </div>
    </div>
  </div>
);

**2. Empty States:**
const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center 
                   justify-center mb-4">
      <Icon className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
    <p className="text-sm text-gray-500 max-w-xs mb-4">{description}</p>
    {action && <Button>{action}</Button>}
  </div>
);

**3. Toast Notifications (نجاح/خطأ/تحذير):**
// باستخدام react-hot-toast أو sonner
import { toast } from 'sonner';

// نجاح
toast.success('تم حفظ البيانات بنجاح', {
  description: 'سيتم تطبيق التغييرات فوراً',
  duration: 3000,
});

// خطأ
toast.error('حدث خطأ في الاتصال', {
  description: 'يرجى المحاولة مرة أخرى',
});

**4. Hover Effects على البطاقات:**
/* CSS */
.course-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.course-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px -4px rgba(0,0,0,0.12);
}

**5. Progress Bar ملوّن:**
const ProgressBar = ({ value, color = 'primary' }) => {
  const colors = {
    primary: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div 
        className={`h-full ${colors[color]} rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
};

**6. Avatar بالأحرف الأولى (Fallback):**
const Avatar = ({ src, name, size = 'md' }) => {
  const initials = name?.split(' ').map(n => n[0]).slice(0, 2).join('');
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' };
  
  if (src) return <img src={src} className={`${sizes[size]} rounded-full object-cover`} />;
  
  return (
    <div className={`${sizes[size]} rounded-full bg-primary-100 text-primary-700 
                    font-semibold flex items-center justify-center`}>
      {initials}
    </div>
  );
};

**7. Status Badges:**
const STATUS_MAP = {
  active:   { label: 'نشط',       class: 'bg-green-100 text-green-700' },
  inactive: { label: 'غير نشط',   class: 'bg-gray-100  text-gray-600'  },
  pending:  { label: 'في الانتظار', class: 'bg-amber-100 text-amber-700' },
  late:     { label: 'متأخر',      class: 'bg-red-100   text-red-700'   },
};

const StatusBadge = ({ status }) => {
  const { label, class: cls } = STATUS_MAP[status] || STATUS_MAP.inactive;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full 
                      text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
};
```

---

## ثالثاً: قائمة التحقق من التطوير (Checklist)

### 🔴 عاجل (يجب تنفيذه أولاً)
- [ ] إصلاح زر الإشعارات → Dropdown بدلاً من صفحة
- [ ] إصلاح الأرقام الهندية في CSS وJavaScript
- [ ] تطبيق خط Cairo بشكل صحيح
- [ ] توحيد نظام الألوان (CSS Variables)

### 🟡 مهم (الأسبوع الأول)
- [ ] تحسين Navbar وإضافة User Dropdown
- [ ] تحسين Sidebar مع Active States صحيحة
- [ ] تطبيق Skeleton Loading
- [ ] إضافة Empty States للقوائم الفارغة
- [ ] تحسين البطاقات (hover effects, progress bars)

### 🟢 تحسين (الأسبوع الثاني)
- [ ] استجابة كاملة للجوال
- [ ] Toast Notifications موحّدة
- [ ] تحسين الصفحة الرئيسية Landing Page
- [ ] Status Badges موحّدة
- [ ] تحسين النماذج (Forms)

### 🔵 متقدم (لاحقاً)
- [ ] Dark Mode
- [ ] تحسين أداء الصفحة (Lazy Loading)
- [ ] Accessibility (ARIA, keyboard navigation)
- [ ] Animations باستخدام Framer Motion

---

## رابعاً: أدوات وحزم مُوصى بها

| الحزمة | الغرض | npm install |
|--------|-------|-------------|
| `lucide-react` | أيقونات موحّدة | `npm i lucide-react` |
| `sonner` | Toast Notifications | `npm i sonner` |
| `@radix-ui/react-dropdown-menu` | Dropdown سهل | `npm i @radix-ui/react-dropdown-menu` |
| `recharts` | الرسوم البيانية | `npm i recharts` |
| `framer-motion` | Animations | `npm i framer-motion` |
| `date-fns` | تنسيق التواريخ | `npm i date-fns` |
| `clsx` + `tailwind-merge` | دمج CSS classes | `npm i clsx tailwind-merge` |

---

*تم إعداد هذه الخطة بناءً على فحص منصة مدارك — جامعة الزاوية*  
*التاريخ: مايو 2026*
