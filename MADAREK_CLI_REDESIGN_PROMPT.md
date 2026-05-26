
# MADAREK PLATFORM — COMPLETE UI/UX REDESIGN MISSION
# ====================================================
# Send this entire file to Claude CLI:
#   claude < REDESIGN_PROMPT.md
# or paste its contents directly into claude CLI session
# ====================================================

You are a senior UI/UX engineer and React expert. Your mission is to completely
redesign the Madarek educational platform (منصة مدارك) for Zawia University, Libya.

The platform uses React + Tailwind CSS (or CSS-in-JS). It is an RTL Arabic platform.

## CURRENT STATE — CRITICAL PROBLEMS TO FIX

### 🔴 BROKEN: Login Page
The login page left side has a random bright-blue background that clashes with everything.
Input fields are dark on dark — unreadable. This must be rebuilt from scratch.

### 🔴 BROKEN: Hindi Numerals
The number 45 renders as "٤٥" on the training page. ALL numbers site-wide
must render as Western Arabic (0-9), never Eastern Arabic/Hindi (٠-٩).

### 🟠 WRONG: Dark Mode Implementation
Dark mode was applied blindly — result is a heavy, oppressive black website.
An academic university platform must be LIGHT by default with an optional 
elegant dark mode. The current dark is just "everything is black."

### 🟠 WRONG: Sidebar — No Icons
The sidebar is pure text. Every nav item must have a Lucide icon.

### 🟠 WRONG: Metric Cards
Still showing two inconsistent cards (circular progress + GPA card).
Should be replaced with 4 uniform stat cards with proper visual hierarchy.

### 🟡 MISSING: Animations & Micro-interactions
Zero animations. The platform feels static and dead.

### 🟡 MISSING: Visual Depth
Flat colors everywhere. No shadows, no gradients where they matter,
no hover effects, no visual feedback.

---

## STEP 1 — EXPLORE THE CODEBASE

First, explore the project structure:

```
find . -type f -name "*.tsx" -o -name "*.jsx" -o -name "*.css" \
  | grep -v node_modules | grep -v .next | sort | head -80
```

Then read the key files:
- src/index.css or globals.css (main styles)
- src/App.tsx or main entry
- The login/auth page component
- The student dashboard component  
- The sidebar/layout component
- tailwind.config.js or tailwind.config.ts

Report what you find before making changes.

---

## STEP 2 — GLOBAL CSS OVERHAUL

### 2A. Replace globals.css / index.css with this foundation:

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');

/* ═══════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════ */
:root {
  /* Primary — Indigo */
  --p-50:  #eef2ff;
  --p-100: #e0e7ff;
  --p-200: #c7d2fe;
  --p-300: #a5b4fc;
  --p-400: #818cf8;
  --p-500: #6366f1;
  --p-600: #4f46e5;
  --p-700: #4338ca;
  --p-800: #3730a3;
  --p-900: #312e81;
  --p-950: #1e1b4b;

  /* Gold — achievements/GPA */
  --g-50:  #fffbeb;
  --g-100: #fef3c7;
  --g-300: #fcd34d;
  --g-400: #fbbf24;
  --g-500: #f59e0b;
  --g-600: #d97706;
  --g-700: #b45309;

  /* Warm Gray — replaces cold gray */
  --w-50:  #fafaf9;
  --w-100: #f5f5f4;
  --w-200: #e7e5e4;
  --w-300: #d6d3d1;
  --w-400: #a8a29e;
  --w-500: #78716c;
  --w-600: #57534e;
  --w-700: #44403c;
  --w-800: #292524;
  --w-900: #1c1917;

  /* Semantic */
  --success-bg: #ecfdf5; --success-fg: #059669; --success-border: #a7f3d0;
  --warning-bg: #fff7ed; --warning-fg: #ea580c; --warning-border: #fed7aa;
  --danger-bg:  #fff1f2; --danger-fg:  #e11d48; --danger-border:  #fecdd3;
  --info-bg:    #eff6ff; --info-fg:    #2563eb; --info-border:    #bfdbfe;

  /* Layout */
  --bg-page:    #f8f7f5;
  --bg-surface: #ffffff;
  --sidebar-w:  260px;
  --topbar-h:   64px;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-lg: 0 10px 24px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04);
  --shadow-xl: 0 20px 40px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.05);
  --shadow-glow: 0 0 0 3px rgba(99,102,241,0.15);

  /* Radius */
  --r-xs: 4px; --r-sm: 6px; --r-md: 10px;
  --r-lg: 14px; --r-xl: 20px; --r-2xl: 28px; --r-full: 9999px;

  /* Transitions */
  --t-fast:   150ms cubic-bezier(0.4,0,0.2,1);
  --t-normal: 200ms cubic-bezier(0.4,0,0.2,1);
  --t-slow:   300ms cubic-bezier(0.4,0,0.2,1);
}

/* ═══════════════════════════════════════
   DARK MODE TOKENS
═══════════════════════════════════════ */
[data-theme="dark"], .dark {
  --bg-page:    #0f0e13;
  --bg-surface: #1a1825;
  --w-50:  #1a1825;
  --w-100: #221f2e;
  --w-200: #2d2a3d;
  --w-300: #3d3952;
  --w-400: #6b6886;
  --w-500: #9794ab;
  --w-600: #b8b5cc;
  --w-700: #d4d2e3;
  --w-800: #eceaf5;
  --w-900: #f5f4fb;
  color-scheme: dark;
}

/* ═══════════════════════════════════════
   BASE RESET
═══════════════════════════════════════ */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0; padding: 0;
}

html {
  direction: rtl;
  font-family: 'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background: var(--bg-page);
  color: var(--w-900);
  line-height: 1.6;
  transition: background var(--t-normal), color var(--t-normal);
}

/* ═══════════════════════════════════════
   FIX HINDI NUMERALS — CRITICAL
═══════════════════════════════════════ */
* {
  font-variant-numeric: normal !important;
  -moz-font-feature-settings: "lnum" 1 !important;
  -webkit-font-feature-settings: "lnum" 1 !important;
  font-feature-settings: "lnum" 1 !important;
}

/* ═══════════════════════════════════════
   CUSTOM SCROLLBAR
═══════════════════════════════════════ */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--w-300);
  border-radius: var(--r-full);
  transition: background var(--t-fast);
}
::-webkit-scrollbar-thumb:hover { background: var(--w-400); }

/* ═══════════════════════════════════════
   BUTTON SYSTEM
═══════════════════════════════════════ */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 8px; padding: 10px 20px;
  font-family: inherit; font-size: 14px; font-weight: 600;
  border: none; border-radius: var(--r-md);
  cursor: pointer; text-decoration: none;
  transition: all var(--t-normal);
  white-space: nowrap; user-select: none;
}
.btn-primary {
  background: linear-gradient(135deg, var(--p-700), var(--p-500));
  color: #fff;
  box-shadow: 0 4px 14px rgba(99,102,241,0.4);
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99,102,241,0.5);
}
.btn-primary:active { transform: translateY(0); }

.btn-secondary {
  background: var(--bg-surface); color: var(--p-600);
  border: 1.5px solid rgba(99,102,241,0.25);
  box-shadow: var(--shadow-xs);
}
.btn-secondary:hover { background: var(--p-50); border-color: rgba(99,102,241,0.4); }

.btn-ghost {
  background: transparent; color: var(--w-600);
}
.btn-ghost:hover { background: var(--w-100); color: var(--w-900); }

.btn-sm { padding: 7px 14px; font-size: 13px; }
.btn-lg { padding: 14px 28px; font-size: 16px; }
.btn-icon {
  padding: 0; width: 38px; height: 38px;
  border-radius: var(--r-md); background: transparent;
  border: 1px solid var(--w-200); color: var(--w-600);
  display: flex; align-items: center; justify-content: center;
}
.btn-icon:hover { background: var(--w-100); border-color: var(--w-300); }

/* ═══════════════════════════════════════
   CARD SYSTEM
═══════════════════════════════════════ */
.card {
  background: var(--bg-surface);
  border-radius: var(--r-xl);
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--t-normal), transform var(--t-normal),
              border-color var(--t-normal);
}
.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
  border-color: rgba(99,102,241,0.15);
}
.card-flat {
  background: var(--bg-surface);
  border-radius: var(--r-xl);
  border: 1px solid rgba(0,0,0,0.06);
}

/* ═══════════════════════════════════════
   STAT CARD
═══════════════════════════════════════ */
.stat-card {
  background: var(--bg-surface);
  border-radius: var(--r-xl);
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: var(--shadow-sm);
  padding: 20px 20px;
  display: flex; flex-direction: column; gap: 4px;
  position: relative; overflow: hidden;
  transition: all var(--t-normal);
}
.stat-card::before {
  content: '';
  position: absolute; top: 0; right: 0;
  width: 80px; height: 80px;
  border-radius: 0 var(--r-xl) 0 100%;
  background: var(--stat-color, var(--p-50));
  opacity: 0.5;
}
.stat-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
.stat-card .stat-icon {
  width: 44px; height: 44px; border-radius: var(--r-lg);
  background: var(--stat-color, var(--p-50));
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 12px;
}
.stat-card .stat-value {
  font-size: 30px; font-weight: 800; line-height: 1;
  color: var(--w-900);
}
.stat-card .stat-label {
  font-size: 12px; color: var(--w-500); font-weight: 500;
}
.stat-card .stat-sub {
  font-size: 11px; color: var(--w-400); margin-top: 2px;
}

/* ═══════════════════════════════════════
   INPUT SYSTEM
═══════════════════════════════════════ */
.input-wrap { position: relative; }
.input-wrap .input-icon {
  position: absolute; right: 12px; top: 50%;
  transform: translateY(-50%); color: var(--w-400);
  pointer-events: none;
}
.input {
  width: 100%; padding: 12px 42px 12px 16px;
  font-family: inherit; font-size: 14px;
  background: var(--bg-surface); color: var(--w-900);
  border: 1.5px solid var(--w-200); border-radius: var(--r-md);
  outline: none; direction: rtl;
  transition: border-color var(--t-fast), box-shadow var(--t-fast);
}
.input::placeholder { color: var(--w-400); }
.input:hover { border-color: var(--w-300); }
.input:focus {
  border-color: var(--p-500);
  box-shadow: var(--shadow-glow);
}
.input-label {
  display: block; font-size: 13px; font-weight: 600;
  color: var(--w-700); margin-bottom: 8px;
}

/* ═══════════════════════════════════════
   BADGE SYSTEM
═══════════════════════════════════════ */
.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: var(--r-full);
  font-size: 11px; font-weight: 600;
  font-variant-numeric: normal;
}
.badge-primary { background: var(--p-50); color: var(--p-700); }
.badge-success { background: var(--success-bg); color: var(--success-fg); }
.badge-warning { background: var(--warning-bg); color: var(--warning-fg); }
.badge-danger  { background: var(--danger-bg);  color: var(--danger-fg);  }
.badge-gold    { background: var(--g-50);        color: var(--g-700);      }
.badge-gray    { background: var(--w-100);       color: var(--w-600);      }

/* ═══════════════════════════════════════
   PROGRESS BAR
═══════════════════════════════════════ */
.progress { height: 8px; background: var(--w-100); border-radius: var(--r-full); overflow: hidden; }
.progress-fill {
  height: 100%; border-radius: var(--r-full);
  transition: width 600ms cubic-bezier(0.4,0,0.2,1);
}
.progress-fill.indigo  { background: linear-gradient(90deg, var(--p-700), var(--p-400)); }
.progress-fill.gold    { background: linear-gradient(90deg, var(--g-600), var(--g-400)); }
.progress-fill.success { background: linear-gradient(90deg, #059669, #34d399); }
.progress-fill.danger  { background: linear-gradient(90deg, #e11d48, #fb7185); }

/* ═══════════════════════════════════════
   SKELETON LOADER
═══════════════════════════════════════ */
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, var(--w-100) 25%, var(--w-200) 50%, var(--w-100) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--r-md);
}

/* ═══════════════════════════════════════
   ANIMATIONS
═══════════════════════════════════════ */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(16px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes dropIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes countUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-ring {
  0%   { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(2.2); opacity: 0; }
}

.animate-fadeInUp  { animation: fadeInUp  0.3s ease forwards; }
.animate-fadeIn    { animation: fadeIn    0.25s ease forwards; }
.animate-scaleIn   { animation: scaleIn   0.2s ease forwards; }
.animate-dropIn    { animation: dropIn    0.2s cubic-bezier(0.34,1.56,0.64,1) forwards; }

/* Staggered children */
.stagger > *:nth-child(1) { animation-delay: 0ms; }
.stagger > *:nth-child(2) { animation-delay: 50ms; }
.stagger > *:nth-child(3) { animation-delay: 100ms; }
.stagger > *:nth-child(4) { animation-delay: 150ms; }
.stagger > *:nth-child(5) { animation-delay: 200ms; }
.stagger > *:nth-child(6) { animation-delay: 250ms; }
```

### 2B. Add this utility JS function for numbers — create src/utils/numbers.ts:

```typescript
/**
 * Converts Eastern Arabic (Hindi) numerals to Western Arabic numerals.
 * Fixes the ٤٥ → 45 bug.
 */
export function toWestern(value: string | number): string {
  return String(value).replace(/[٠-٩]/g, d =>
    String(d.charCodeAt(0) - 0x0660)
  );
}

/**
 * Format a number safely — always Western Arabic digits.
 */
export function formatNum(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('en-US', options).format(value);
}

/**
 * Format date — always Western Arabic digits.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB').format(d);
}
```

Then find every JSX file that renders numbers and wrap them:
- Search: `{count}` `{stats.}` `{number}` `{grade}` `{points}` etc.
- Replace with: `{toWestern(count)}` `{formatNum(stats.)}` etc.

---

## STEP 3 — REBUILD AUTH PAGE (PRIORITY 1)

Find the auth/login component file. COMPLETELY replace it with:

```tsx
// Auth.tsx — Complete redesign
import { useState } from 'react';
import {
  GraduationCap, Mail, Lock, Eye, EyeOff,
  Home, ArrowLeft, Zap, BarChart2, Users,
  BookOpen, Building2, Shield
} from 'lucide-react';

export function AuthPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      direction: 'rtl',
      fontFamily: "'IBM Plex Sans Arabic', sans-serif",
    }}>

      {/* ══════════ RIGHT — Decorative Panel ══════════ */}
      <div style={{
        background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }} />
        {/* Glow blobs */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(129,140,248,0.35), transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: -40,
          width: 240, height: 240,
          background: 'radial-gradient(circle, rgba(251,191,36,0.2), transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 380 }}>
          <div style={{
            width: 80, height: 80,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <GraduationCap size={40} color="white" />
          </div>

          <h2 style={{
            fontSize: 28, fontWeight: 800, color: 'white',
            lineHeight: 1.3, marginBottom: 14,
          }}>
            منصة الزاوية للتعليم الذكي
          </h2>
          <p style={{
            fontSize: 14, color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.8, marginBottom: 36,
          }}>
            بوابتك الأكاديمية الرقمية — سجّل الدخول ببريدك الجامعي 
            أو رقم قيدك للوصول إلى مقرراتك وموارد التعلّم.
          </p>

          {/* Feature pills */}
          {[
            { Icon: Zap,       text: 'مساعد ذكاء اصطناعي متقدم' },
            { Icon: BarChart2, text: 'متابعة التقدم الأكاديمي' },
            { Icon: Users,     text: 'تواصل مباشر مع الأساتذة' },
          ].map(({ Icon, text }) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '11px 16px',
              marginBottom: 10, textAlign: 'right',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={16} color="rgba(255,255,255,0.85)" />
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════ LEFT — Form Panel ══════════ */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px 64px',
        background: '#fafaf9',
        position: 'relative',
      }}>
        {/* Back link */}
        <a href="/" style={{
          position: 'absolute', top: 24, right: 24,
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: '#78716c', textDecoration: 'none',
          padding: '6px 12px', borderRadius: 8,
          background: 'rgba(0,0,0,0.04)',
          transition: 'background 200ms',
        }}>
          <Home size={14} />
          الصفحة الرئيسية
        </a>

        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Logo */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              background: 'linear-gradient(135deg, #4338ca, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            }}>
              <GraduationCap size={22} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#1e1b4b' }}>مدارك</div>
              <div style={{ fontSize: 11, color: '#a8a29e', lineHeight: 1 }}>جامعة الزاوية</div>
            </div>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1c1917', marginBottom: 6 }}>
            مرحباً بعودتك 👋
          </h1>
          <p style={{ fontSize: 14, color: '#78716c', marginBottom: 32 }}>
            أدخل بياناتك للوصول إلى بوابتك الأكاديمية
          </p>

          {/* Email field */}
          <div style={{ marginBottom: 18 }}>
            <label className="input-label">البريد الإلكتروني أو رقم القيد</label>
            <div className="input-wrap">
              <input
                className="input"
                type="text"
                placeholder="example@zu.edu.ly أو UZ-2024-XXXXX"
              />
              <Mail size={16} className="input-icon" />
            </div>
          </div>

          {/* Password field */}
          <div style={{ marginBottom: 10 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 8,
            }}>
              <label className="input-label" style={{ margin: 0 }}>كلمة المرور</label>
              <a href="/forgot" style={{
                fontSize: 13, color: '#6366f1', textDecoration: 'none', fontWeight: 500,
              }}>
                نسيت كلمة المرور؟
              </a>
            </div>
            <div className="input-wrap">
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                style={{ paddingLeft: 42 }}
              />
              <Mail size={16} className="input-icon" />
              <button
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', color: '#a8a29e',
                  display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 24 }}>
            <ArrowLeft size={18} />
            تسجيل الدخول
          </button>

          {/* Demo accounts */}
          <div style={{ marginTop: 28 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
            }}>
              <div style={{ flex: 1, height: 1, background: '#e7e5e4' }} />
              <span style={{ fontSize: 12, color: '#a8a29e', whiteSpace: 'nowrap' }}>
                حسابات تجريبية
              </span>
              <div style={{ flex: 1, height: 1, background: '#e7e5e4' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { role: 'طالب',    Icon: GraduationCap, c: '#4f46e5', bg: '#eef2ff' },
                { role: 'أستاذ',   Icon: BookOpen,      c: '#059669', bg: '#ecfdf5' },
                { role: 'الإدارة', Icon: Building2,     c: '#d97706', bg: '#fffbeb' },
                { role: 'الجودة',  Icon: Shield,        c: '#dc2626', bg: '#fff1f2' },
              ].map(({ role, Icon, c, bg }) => (
                <button key={role} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px',
                  background: bg,
                  border: `1.5px solid ${c}22`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: c,
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
    </div>
  );
}
```

---

## STEP 4 — REBUILD SIDEBAR

Find the Sidebar component. Replace the navigation list completely:

```tsx
// Sidebar.tsx — Complete redesign

import {
  GraduationCap, LayoutDashboard, Calendar, BookOpen,
  BarChart2, ClipboardList, FileText, Library, FlaskConical,
  BrainCircuit, Users, Briefcase, Building2, MapPin,
  CreditCard, LogOut, ChevronLeft, Settings, Bell
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'الرئيسي',
    items: [
      { icon: LayoutDashboard, label: 'لوحة التحكم', href: '/student/dashboard' },
      { icon: Calendar,        label: 'الجدول الدراسي', href: '/schedule' },
      { icon: BookOpen,        label: 'مواد مسجلة', href: '/courses' },
      { icon: BarChart2,       label: 'النتائج والتقييمات', href: '/grades' },
      { icon: ClipboardList,   label: 'الواجبات', href: '/assignments' },
    ],
  },
  {
    label: 'التعلم الذكي',
    items: [
      { icon: BrainCircuit,  label: 'المصفوفة التعليمية', href: '/matrix' },
      { icon: FileText,      label: 'الاختبارات الإلكترونية', href: '/exams' },
      { icon: Library,       label: 'المكتبة الإلكترونية', href: '/library' },
      { icon: FlaskConical,  label: 'المعامل الافتراضية', href: '/labs' },
    ],
  },
  {
    label: 'التطوير والمجتمع',
    items: [
      { icon: GraduationCap, label: 'التطوير الذاتي', href: '/training' },
      { icon: Users,         label: 'المجتمع الجامعي', href: '/community' },
      { icon: Briefcase,     label: 'فرص العمل', href: '/jobs' },
    ],
  },
  {
    label: 'حسابي والخدمات',
    items: [
      { icon: Settings,   label: 'ملفي الشخصي', href: '/profile' },
      { icon: Building2,  label: 'جامعة الزاوية', href: '/university' },
      { icon: CreditCard, label: 'الشؤون المالية', href: '/finance' },
      { icon: MapPin,     label: 'خريطة الحرم', href: '/map' },
    ],
  },
];

export function Sidebar({ activeHref, collapsed }) {
  return (
    <aside style={{
      width: collapsed ? 68 : 260,
      background: 'linear-gradient(180deg, #1e1b4b 0%, #2d2a70 60%, #312e81 100%)',
      height: '100vh',
      position: 'fixed',
      right: 0, top: 0,
      display: 'flex', flexDirection: 'column',
      boxShadow: '-2px 0 20px rgba(0,0,0,0.15)',
      zIndex: 40,
      transition: 'width 250ms cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
    }}>

      {/* Logo */}
      <div style={{
        padding: collapsed ? '20px 14px' : '22px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, flexShrink: 0,
          borderRadius: 11,
          background: 'linear-gradient(135deg, #6366f1, #818cf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(99,102,241,0.5)',
        }}>
          <GraduationCap size={22} color="white" />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>مدارك</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>جامعة الزاوية</div>
          </div>
        )}
      </div>

      {/* User profile */}
      {!collapsed && (
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0, borderRadius: 10,
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#1c1917',
          }}>
            أح
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'white',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              أحمد الزروق
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(99,102,241,0.25)',
              borderRadius: 100, padding: '1px 9px',
              fontSize: 10, color: '#c7d2fe', fontWeight: 500,
              marginTop: 2,
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#818cf8',
              }} />
              طالب
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{
        flex: 1, overflowY: 'auto', padding: '10px 10px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.1) transparent',
      }}>
        {NAV_SECTIONS.map(({ label, items }) => (
          <div key={label} style={{ marginBottom: 6 }}>
            {!collapsed && (
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.28)',
                padding: '6px 10px 4px',
                textTransform: 'uppercase',
              }}>
                {label}
              </div>
            )}
            {items.map(({ icon: Icon, label: itemLabel, href }) => {
              const isActive = activeHref === href;
              return (
                <a key={href} href={href} style={{
                  display: 'flex', alignItems: 'center',
                  gap: collapsed ? 0 : 10,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '10px 0' : '9px 10px',
                  borderRadius: 10,
                  background: isActive ? 'rgba(99,102,241,0.22)' : 'transparent',
                  color: isActive ? '#c7d2fe' : 'rgba(255,255,255,0.5)',
                  textDecoration: 'none',
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  marginBottom: 1,
                  borderRight: isActive ? '3px solid #818cf8' : '3px solid transparent',
                  transition: 'all 150ms',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                  }
                }}>
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  {!collapsed && itemLabel}
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 10px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button style={{
          width: '100%',
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : 10,
          padding: collapsed ? '10px 0' : '9px 10px',
          borderRadius: 10, border: 'none',
          background: 'rgba(244,63,94,0.1)',
          color: '#fca5a5',
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
          transition: 'background 150ms',
        }}>
          <LogOut size={17} />
          {!collapsed && 'تسجيل الخروج'}
        </button>
      </div>
    </aside>
  );
}
```

---

## STEP 5 — REBUILD TOPBAR

Find the Topbar/Header component. Replace with:

```tsx
// Topbar.tsx

import {
  Bell, Search, Sparkles, ChevronDown,
  ChevronLeft, Menu
} from 'lucide-react';
import { useState } from 'react';

export function Topbar({ onToggleSidebar, currentPage, collegeName }) {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header style={{
      height: 64,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
      position: 'sticky', top: 0, zIndex: 30,
      display: 'flex', alignItems: 'center',
      padding: '0 20px',
      gap: 12,
    }}>

      {/* Right: breadcrumb */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={onToggleSidebar}
          className="btn-icon"
          style={{ marginLeft: 4 }}
        >
          <Menu size={18} />
        </button>
        <span style={{ fontSize: 13, color: '#a8a29e' }}>الرئيسية</span>
        <ChevronLeft size={13} color="#d6d3d1" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1c1917' }}>
          {currentPage}
        </span>
      </div>

      {/* Center: college badge */}
      {collegeName && (
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.04))',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 8, padding: '5px 14px',
          fontSize: 13, fontWeight: 600, color: '#4f46e5',
        }}>
          {collegeName}
        </div>
      )}

      {/* Left: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            placeholder="ابحث في المنصة..."
            style={{
              width: 220, padding: '8px 36px 8px 14px',
              background: '#f5f5f4', border: '1px solid #e7e5e4',
              borderRadius: 9, fontSize: 13, fontFamily: 'inherit',
              outline: 'none', direction: 'rtl',
              transition: 'all 200ms',
            }}
            onFocus={e => {
              e.target.style.borderColor = '#6366f1';
              e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
              e.target.style.background = 'white';
            }}
            onBlur={e => {
              e.target.style.borderColor = '#e7e5e4';
              e.target.style.boxShadow = 'none';
              e.target.style.background = '#f5f5f4';
            }}
          />
          <Search size={14} style={{
            position: 'absolute', right: 12, top: '50%',
            transform: 'translateY(-50%)', color: '#a8a29e',
            pointerEvents: 'none',
          }} />
        </div>

        {/* AI button */}
        <button style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 14px',
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          border: 'none', borderRadius: 9,
          color: 'white', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 2px 10px rgba(30,27,75,0.35)',
          transition: 'all 200ms',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <Sparkles size={14} />
          اسأل AI
        </button>

        {/* Notifications — DROPDOWN not page */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => setNotifOpen(o => !o)}
            style={{
              position: 'relative',
              background: notifOpen ? '#eef2ff' : 'transparent',
              borderColor: notifOpen ? '#6366f1' : undefined,
            }}
          >
            <Bell size={18} color={notifOpen ? '#4f46e5' : '#57534e'} />
            <span style={{
              position: 'absolute', top: 6, right: 6,
              width: 7, height: 7, borderRadius: '50%',
              background: '#f43f5e', border: '1.5px solid white',
            }} />
          </button>

          {notifOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0,
              width: 340, background: 'white',
              borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 20px 48px rgba(0,0,0,0.12)',
              overflow: 'hidden', zIndex: 100,
              animation: 'dropIn 0.18s ease forwards',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid #f5f5f4',
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1917' }}>
                  الإشعارات
                </span>
                <span style={{
                  background: '#eef2ff', color: '#4f46e5',
                  padding: '2px 9px', borderRadius: 100,
                  fontSize: 11, fontWeight: 700,
                }}>6</span>
              </div>

              {/* Sample notifications */}
              {[
                { title: 'واجب جديد في البرمجة المتقدمة', time: 'منذ 10 دقائق', dot: '#6366f1' },
                { title: 'تم نشر درجة الاختبار الأول', time: 'منذ ساعة', dot: '#10b981' },
                { title: 'تذكير: موعد تسليم الواجب غداً', time: 'منذ 3 ساعات', dot: '#f59e0b' },
              ].map(({ title, time, dot }) => (
                <div key={title} style={{
                  display: 'flex', gap: 12, padding: '12px 18px',
                  borderBottom: '1px solid #f9f9f9', cursor: 'pointer',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafaf9'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: dot, flexShrink: 0, marginTop: 5,
                  }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1c1917' }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 3 }}>
                      {time}
                    </div>
                  </div>
                </div>
              ))}

              <div style={{
                padding: '11px 18px', background: '#fafaf9',
                textAlign: 'center',
              }}>
                <span
                  onClick={() => { setNotifOpen(false); window.location.href = '/notifications'; }}
                  style={{
                    fontSize: 13, color: '#4f46e5', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  عرض جميع الإشعارات ←
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', borderRadius: 10,
          border: '1px solid #e7e5e4',
          cursor: 'pointer', background: 'white',
          transition: 'all 150ms',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#1c1917',
          }}>أح</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1c1917' }}>أحمد الزروق</div>
            <div style={{ fontSize: 10, color: '#a8a29e' }}>طالب</div>
          </div>
          <ChevronDown size={13} color="#a8a29e" />
        </div>
      </div>
    </header>
  );
}
```

---

## STEP 6 — REBUILD STUDENT DASHBOARD

Find the student dashboard page. Replace the main content area:

```tsx
// StudentDashboard.tsx — Main content area

import {
  TrendingUp, Star, CalendarDays, ClipboardList,
  BookOpen, GraduationCap, ChevronLeft, Clock
} from 'lucide-react';

// ── Welcome Banner ──────────────────────────────────────
<div style={{
  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
  borderRadius: 20,
  padding: '28px 32px',
  marginBottom: 24,
  position: 'relative', overflow: 'hidden',
  animation: 'fadeInUp 0.4s ease forwards',
}}>
  {/* Decorative circles */}
  <div style={{
    position: 'absolute', top: -30, left: -30,
    width: 180, height: 180,
    background: 'radial-gradient(circle, rgba(129,140,248,0.3), transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none',
  }} />
  <div style={{
    position: 'absolute', bottom: -20, right: 40,
    width: 120, height: 120,
    background: 'radial-gradient(circle, rgba(251,191,36,0.15), transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none',
  }} />
  {/* Dot grid */}
  <div style={{
    position: 'absolute', inset: 0,
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
    backgroundSize: '24px 24px', pointerEvents: 'none',
  }} />
  <div style={{ position: 'relative' }}>
    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
      الإثنين، 26 مايو 2026
    </p>
    <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 6 }}>
      مساء الخير، أحمد 👋
    </h1>
    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
      لوحة متابعة تقدّمك الأكاديمي — كلية تقنية المعلومات
    </p>
  </div>
</div>

{/* ── 4 Stat Cards ───────────────────────────────────── */}
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 16, marginBottom: 24,
  animation: 'fadeInUp 0.4s 0.05s ease both',
}}>
  {[
    {
      label: 'التقدم الأكاديمي',
      value: '75%',
      sub: '60 من 80 ساعة معتمدة',
      Icon: TrendingUp,
      iconColor: '#4f46e5', iconBg: '#eef2ff',
      accent: 'rgba(99,102,241,0.06)',
    },
    {
      label: 'المعدل التراكمي',
      value: '3.8',
      sub: 'ممتاز',
      Icon: Star,
      iconColor: '#d97706', iconBg: '#fffbeb',
      accent: 'rgba(217,119,6,0.06)',
      badge: { label: 'ممتاز', class: 'badge badge-gold' },
    },
    {
      label: 'تقدم الفصل',
      value: '60%',
      sub: 'من بداية الفصل',
      Icon: CalendarDays,
      iconColor: '#059669', iconBg: '#ecfdf5',
      accent: 'rgba(5,150,105,0.06)',
    },
    {
      label: 'واجبات معلّقة',
      value: '3',
      sub: 'تحتاج تسليماً',
      Icon: ClipboardList,
      iconColor: '#e11d48', iconBg: '#fff1f2',
      accent: 'rgba(225,29,72,0.06)',
    },
  ].map(({ label, value, sub, Icon, iconColor, iconBg, accent }, i) => (
    <div key={label} style={{
      background: 'white',
      borderRadius: 16,
      padding: '20px',
      border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      position: 'relative', overflow: 'hidden',
      transition: 'all 250ms',
      animationDelay: `${i * 50}ms`,
      cursor: 'default',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-3px)';
      e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.08)';
      e.currentTarget.style.borderColor = iconColor + '30';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
      e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
    }}>
      {/* Accent corner */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: 100, height: 100,
        background: accent,
        borderRadius: '0 0 100% 0',
      }} />
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14, position: 'relative',
      }}>
        <Icon size={22} color={iconColor} />
      </div>
      <div style={{ fontSize: 11, color: '#78716c', fontWeight: 500, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#1c1917', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 5 }}>{sub}</div>
    </div>
  ))}
</div>

{/* ── Progress bars section ──────────────────────────── */}
<div style={{
  background: 'white', borderRadius: 16, padding: '20px 24px',
  border: '1px solid rgba(0,0,0,0.06)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  marginBottom: 24,
  animation: 'fadeInUp 0.4s 0.15s ease both',
}}>
  <div style={{
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  }}>
    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1c1917' }}>
      تقدم الفصل الدراسي الحالي
    </h3>
    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#78716c' }}>
      <span>بداية الفصل · 10/09</span>
      <span>نهاية الفصل · 15/01</span>
    </div>
  </div>
  <div className="progress" style={{ height: 10 }}>
    <div className="progress-fill indigo" style={{ width: '60%' }} />
  </div>
  <div style={{
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 8,
  }}>
    <span style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>60%</span>
    <span style={{ fontSize: 11, color: '#a8a29e' }}>مكتمل</span>
  </div>
</div>
```

---

## STEP 7 — FIX ALL HINDI NUMERALS

Search and fix every file that might show numbers:

```bash
# Find files with potential number rendering issues
grep -rn "نقاطك\|الأوسمة\|نقطة\|درجة\|معدل" src/ --include="*.tsx" --include="*.ts" -l

# Also search for Arabic-Indic digit characters
grep -rn "[٠١٢٣٤٥٦٧٨٩]" src/ --include="*.tsx" --include="*.jsx" -l
```

In every file that shows numbers, import and use:
```tsx
import { toWestern, formatNum } from '@/utils/numbers';
// Replace: {points}        → {toWestern(points)}
// Replace: {grade}         → {formatNum(grade, { minimumFractionDigits: 1 })}
// Replace: {count}         → {toWestern(count)}
```

Also add to globals.css (already added above, but verify):
```css
* { font-variant-numeric: normal !important; font-feature-settings: "lnum" 1 !important; }
```

---

## STEP 8 — LANDING PAGE NAVBAR & HERO

Find the landing page. Fix these specific issues:

### Navbar — replace the bag emoji icon with proper logo:
```tsx
{/* Remove: just the bag icon */}
{/* Add: proper logo with name */}
<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
  <div style={{
    width: 38, height: 38, borderRadius: 10,
    background: 'linear-gradient(135deg, #4338ca, #6366f1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
  }}>
    <GraduationCap size={20} color="white" />
  </div>
  <div>
    <span style={{ fontSize: 17, fontWeight: 800, color: currentColor }}>مدارك</span>
    <br />
    <span style={{ fontSize: 10, color: 'rgba(currentColor, 0.5)', lineHeight: 1 }}>
      جامعة الزاوية
    </span>
  </div>
</div>
```

### Remove the standalone announcement bar OR merge into hero:
The dark navy announcement bar at the top creates an awkward gap.
Either remove it entirely, or absorb it into the hero section as a subtle top ribbon.

### Hero — add gradient background instead of pure white/black:
```tsx
// For light mode hero, replace solid white background with:
background: `
  radial-gradient(ellipse 70% 50% at 80% 30%, rgba(99,102,241,0.1) 0%, transparent 60%),
  radial-gradient(ellipse 50% 60% at 20% 70%, rgba(245,158,11,0.06) 0%, transparent 60%),
  #fafaf9
`
// For dark mode, replace solid black with:
background: `
  radial-gradient(ellipse 70% 50% at 80% 30%, rgba(99,102,241,0.18) 0%, transparent 60%),
  radial-gradient(ellipse 50% 60% at 20% 70%, rgba(251,191,36,0.08) 0%, transparent 60%),
  #0f0e13
`
```

---

## STEP 9 — ADD ENTRANCE ANIMATIONS TO KEY PAGES

In the dashboard page, add useEffect-driven animation on mount:

```tsx
// Add to any page component
useEffect(() => {
  const elements = document.querySelectorAll('.animate-on-mount');
  elements.forEach((el, i) => {
    (el as HTMLElement).style.animationDelay = `${i * 60}ms`;
    el.classList.add('animate-fadeInUp');
  });
}, []);

// Add className="animate-on-mount" to each card/section
```

For number counting animation on stat cards:
```tsx
function useCountUp(target: number, duration = 1200) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const steps = 40;
    const increment = target / steps;
    const interval = duration / steps;
    let count = 0;
    const timer = setInterval(() => {
      count += increment;
      if (count >= target) { setCurrent(target); clearInterval(timer); }
      else setCurrent(Math.floor(count));
    }, interval);
    return () => clearInterval(timer);
  }, [target, duration]);
  return current;
}
// Usage: <span>{useCountUp(75)}%</span>
```

---

## STEP 10 — DARK MODE TOGGLE FIX

The current dark mode implementation blacks out everything. Fix it:

```tsx
// ThemeProvider.tsx
// Apply 'dark' class to <html> element, not individual components

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark');
  html.setAttribute('data-theme', isDark ? 'dark' : 'light');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// On app load:
const saved = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (saved === 'dark' || (!saved && prefersDark)) {
  document.documentElement.classList.add('dark');
  document.documentElement.setAttribute('data-theme', 'dark');
}

// IMPORTANT: The default must be LIGHT. Dark is opt-in.
// An academic platform is a professional tool — light by default.
```

---

## EXECUTION ORDER

Execute in this exact order:

1. `Read and report` — explore all key files first
2. Apply `globals.css` changes (Step 2A)
3. Create `src/utils/numbers.ts` (Step 2B)
4. Fix Hindi numerals in all files (Step 7)
5. Rebuild Auth page (Step 3)
6. Rebuild Sidebar (Step 4)
7. Rebuild Topbar (Step 5)
8. Rebuild Student Dashboard (Step 6)
9. Fix Landing page (Step 8)
10. Add animations (Step 9)
11. Fix dark mode (Step 10)

After each step, report:
- What file was changed
- Summary of changes made
- Any issues found

---

## CONSTRAINTS

- Keep ALL existing React component structure — just update the JSX/CSS
- Do NOT change routing, state management, or API calls
- Do NOT change any backend logic
- Preserve all existing functionality
- Test that the login form still works after redesign
- Keep all existing href/navigation paths

---

## SUCCESS CRITERIA

After all changes:
✅ Login page: white form on light gray left + rich indigo right panel
✅ Numbers: all digits are 0-9 (Western Arabic), never ٠-٩
✅ Sidebar: dark indigo gradient + icons on every nav item + user profile
✅ Dashboard: 4 uniform stat cards + welcome banner with depth
✅ Topbar: notification DROPDOWN (not page) + clean search bar
✅ Landing: proper logo + hero with gradient bg + dark navbar fix
✅ Animations: fade-in on page load, hover lift on cards
✅ Dark mode: light by default, dark as opt-in only

This is a university educational platform for ~50,000 students.
Make it look like it deserves that responsibility.
