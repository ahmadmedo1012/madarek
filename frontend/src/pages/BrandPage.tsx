/**
 * BrandPage — `/__brand` — the R323 brand system's own spec sheet
 * (§A1). The foreman's integration pass wires the route (App.tsx is
 * outside this task's ownership); the page ships self-contained so
 * wiring it is one import.
 *
 * Contents (docs/redesign/r323/brand/BRAND.md is the written contract;
 * this page is its live specimen):
 *   1. the construction plate — the mark ON its 32-grid, coordinates
 *      labelled, drawn from the SAME constants the Logo renders
 *      (frontend/src/brand/mark.ts — no second geometry),
 *   2. the four variants (lockup · mark · wordmark · stacked),
 *   3. the four tones on their proper grounds,
 *   4. clear space = ½ mark height,
 *   5. the minimum sizes (mark 16 px, lockup 88 px),
 *   6. the three colour tokens (paper · ink · orange),
 *   7. do / don't,
 *   8. the animated draw (hairlines → the orange point LAST).
 *
 * Dark-mode correctness is structural: every chrome colour is a system
 * token; the three literal brand hexes appear ONLY inside the swatch
 * tiles (as chip grounds + <data> text), which is their documented
 * seat. Raw <svg> here is the construction DRAWING — the same
 * brand-symbology category as StarMark/LibyaFlag, accepted by the
 * check-icons allowlist entry for this page.
 */
import type React from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import { Logo } from '../brand';
import {
  MARK_AXIS,
  MARK_DIAMOND_PATH,
  MARK_GRID_POINTS,
  MARK_POINT,
  MARK_VIEWBOX,
} from '../brand/mark';
import '../styles/r323-brand.css';

/* the grid the construction is judged on: hairlines every 2 units,
 * lattice intersections the mark's anchors snap to. */
const GRID_LINES = Array.from({ length: 17 }, (_, i) => i * 2);
const LABELLED: ReadonlyArray<readonly [number, number, string]> = [
  [8, 8, '(8,8)'],
  [24, 8, '(24,8)'],
  [16, 5, '(16,5)'],
  [16, 27, '(16,27)'],
];

function ConstructionPlate(): React.JSX.Element {
  return (
    <figure className="r323b-plate">
      <svg
        className="r323b-grid-svg"
        viewBox="0 0 32 32"
        role="img"
        aria-label="لوحة الإنشاء: الخاتم على شبكة 32 وحدة"
        focusable="false"
        style={{ display: 'block' }}
      >
        {/* the 32-unit grid, hairline every 2 units */}
        <g stroke="var(--rule)" strokeWidth="0.12">
          {GRID_LINES.map((v) => (
            <line key={`v${v}`} x1={v} y1={0} x2={v} y2={32} />
          ))}
          {GRID_LINES.map((v) => (
            <line key={`h${v}`} x1={0} y1={v} x2={32} y2={v} />
          ))}
        </g>
        {/* the point's seat — the crosshair through (24,8) */}
        <g stroke="var(--rule-strong)" strokeWidth="0.14">
          <line x1={MARK_POINT.x - 1} y1={MARK_POINT.y + 2} x2={MARK_POINT.x + 5} y2={MARK_POINT.y + 2} />
          <line x1={MARK_POINT.x + 2} y1={MARK_POINT.y - 1} x2={MARK_POINT.x + 2} y2={MARK_POINT.y + 5} />
        </g>
        {/* the mark itself — the same constants <Logo> renders */}
        <g fill="none" stroke="var(--text-strong)" strokeWidth="0.5" strokeLinejoin="miter">
          <rect x={MARK_AXIS.x} y={MARK_AXIS.y} width={MARK_AXIS.size} height={MARK_AXIS.size} />
          <path d={MARK_DIAMOND_PATH} />
        </g>
        <rect x={MARK_POINT.x} y={MARK_POINT.y} width={MARK_POINT.size} height={MARK_POINT.size} fill="var(--accent)" />
        {/* the anchors, pinned as dots */}
        <g fill="var(--text-muted)">
          {MARK_GRID_POINTS.map(([gx, gy]) => (
            <circle key={`${gx}-${gy}`} cx={gx} cy={gy} r="0.5" />
          ))}
        </g>
        {/* coordinate labels (mono; Latin digits — LTR inside the plate) */}
        <g fill="var(--text-muted)" style={{ fontSize: '1.7px', fontFamily: 'var(--font-mono)' }}>
          {LABELLED.map(([gx, gy, label]) => (
            <text key={label} x={gx + 0.7} y={gy - 0.9}>
              {label}
            </text>
          ))}
        </g>
      </svg>
      <figcaption>
        MARK_VIEWBOX «{MARK_VIEWBOX}» · الشعرة 1.5px غير قياسية · وصلات miter · النقطة فوق التقاطع (24,8)
      </figcaption>
    </figure>
  );
}

const VARIANT_ROWS: ReadonlyArray<readonly [string, React.JSX.Element, string]> = [
  [
    'lockup — الافتراضي',
    <Logo key="lockup" variant="lockup" size={32} />,
    'alt: <Logo /> · horizontal RTL — mark RIGHT, wordmark LEFT',
  ],
  [
    'mark — الرمز وحده',
    <Logo key="mark" variant="mark" size={32} />,
    'alt: <Logo variant="mark" /> · sidebar/badge seat',
  ],
  [
    'wordmark — الكلمة المفرّغة',
    <Logo key="wordmark" variant="wordmark" size={24} />,
    'alt: <Logo variant="wordmark" /> · size = the word ink height',
  ],
  [
    'stacked — التكوين الرأسي',
    <Logo key="stacked" variant="stacked" size={44} />,
    'alt: <Logo variant="stacked" /> · mark / مدارك / MADAREK',
  ],
];

const TONE_ROWS: ReadonlyArray<readonly [string, string, React.JSX.Element]> = [
  ['auto', 'currentColor + var(--accent) — أي أرضية نظام', <Logo key="t1" variant="lockup" size={28} />],
  ['ink', 'حبر صريح على ورق/صور فاتحة', <Logo key="t2" variant="lockup" size={28} tone="ink" />],
  ['paper', 'على الأرضيات الداكنة (صف دركي في الصفحة)', <Logo key="t3" variant="lockup" size={28} tone="paper" />],
  ['orange', 'لوحة الإشارة الواحدة — استعمال نادر', <Logo key="t4" variant="mark" size={28} tone="orange" />],
];

const SWATCHES: ReadonlyArray<readonly [string, string, string, string]> = [
  ['الورق · paper', 'r323b-chip-paper', '#F6F6EE', 'الأرضية (فاتح) + النسخ الساكنة'],
  ['الحبر · ink', 'r323b-chip-ink', '#282828', 'الشعيرات والكلمة — يركب currentColor'],
  ['البرتقالي · orange', 'r323b-chip-orange', '#FA3600', 'النقطة — الإشارة الوحيدة · var(--accent)'],
];

export default function BrandPage(): React.JSX.Element {
  usePageTitle('دليل الهوية');
  return (
    <main className="r323b-page" dir="rtl">
      <header>
        <Logo variant="lockup" size={40} />
        <h1>نظام العلامة</h1>
        <p className="r323b-mono">R323 · BRAND SYSTEM · /__brand</p>
        <p className="r323b-lead">
          «نقطة تصبح مدارًا» — هوية واحدة بعد ست هويات متزاحة: الخاتم
          يُعاد رسمه شعيرات حبر موحّدة بوصلات miter، ونقطة برتقالية واحدة
          تجلس على التقاطع (24,8). المرجع المكتوب:{' '}
          <code>docs/redesign/r323/brand/BRAND.md</code>.
        </p>
      </header>

      {/* 1 · construction */}
      <section className="r323b-sec" aria-labelledby="r323b-cons">
        <h2 id="r323b-cons">
          الإنشاء على شبكة 32 <span className="r323b-mono">· CONSTRUCTION</span>
        </h2>
        <ConstructionPlate />
      </section>

      {/* 2 · variants */}
      <section className="r323b-sec" aria-labelledby="r323b-vars">
        <h2 id="r323b-vars">
          النسخ الأربع <span className="r323b-mono">· VARIANTS</span>
        </h2>
        <div>
          {VARIANT_ROWS.map(([name, specimen, alt]) => (
            <div className="r323b-row" key={name}>
              <span className="r323b-specimen">{specimen}</span>
              <span>
                <strong>{name}</strong>
                <br />
                <span className="r323b-mono">{alt}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 3 · tones */}
      <section className="r323b-sec" aria-labelledby="r323b-tones">
        <h2 id="r323b-tones">
          النغمات <span className="r323b-mono">· TONES</span>
        </h2>
        <div>
          {TONE_ROWS.map(([tone, why, specimen]) => (
            <div
              className={`r323b-row ${tone === 'paper' ? 'r323b-ground-ink' : ''}`}
              key={tone}
            >
              <span className="r323b-specimen">{specimen}</span>
              <span>
                <strong>
                  tone=&quot;{tone}&quot;
                </strong>
                <br />
                <span className="r323b-mono">{why}</span>
              </span>
            </div>
          ))}
        </div>
        <p>
          المقعد `var(--accent)` يعيد ضبط نفسه في النسق الداكن (الجمر
          المضيء) — لا «نسخة داكنة» ثانية من الشعار، ولا خلفية برتقالية
          تحت الرمز أبدًا.
        </p>
      </section>

      {/* 4 · clear space */}
      <section className="r323b-sec" aria-labelledby="r323b-clear">
        <h2 id="r323b-clear">
          الفراغ الأمان <span className="r323b-mono">· CLEAR SPACE = ½ MARK</span>
        </h2>
        <div className="r323b-plate">
          <figure className="r323b-clear-fig">
            <span className="r323b-clearspace">
              <Logo variant="mark" size={16} />
            </span>
            <figcaption>
              الإطار المتقطع هو الحد الأدنى: ½ ارتفاع الرمز من كل جهة (هنا
              8px حول رمز 16px) — لا نص ولا حافة ولا شعرة جدول داخله.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* 5 · min sizes */}
      <section className="r323b-sec" aria-labelledby="r323b-min">
        <h2 id="r323b-min">
          الحد الأدنى <span className="r323b-mono">· MIN SIZES — MARK 16PX · LOCKUP 88PX</span>
        </h2>
        <div className="r323b-ladder">
          <figure>
            <Logo variant="mark" size={16} />
            <figcaption className="r323b-mono">mark · 16px (الحد الأدنى)</figcaption>
          </figure>
          <figure>
            <Logo variant="mark" size={24} />
            <figcaption className="r323b-mono">mark · 24px</figcaption>
          </figure>
          <figure>
            <Logo variant="mark" size={32} />
            <figcaption className="r323b-mono">mark · 32px</figcaption>
          </figure>
          <figure>
            <Logo variant="lockup" size={88} />
            <figcaption className="r323b-mono">lockup · 88px (الحد الأدنى)</figcaption>
          </figure>
          <figure>
            <Logo variant="stacked" size={64} />
            <figcaption className="r323b-mono">stacked · 64px</figcaption>
          </figure>
        </div>
      </section>

      {/* 6 · colours */}
      <section className="r323b-sec" aria-labelledby="r323b-colors">
        <h2 id="r323b-colors">
          الألوان الثلاثة فقط <span className="r323b-mono">· COLOUR TOKENS</span>
        </h2>
        <div className="r323b-swatches">
          {SWATCHES.map(([name, chipClass, hex, role]) => (
            <div className="r323b-swatch" key={hex}>
              <div className={`chip ${chipClass}`} aria-hidden="true" />
              <dl>
                <dt>{name}</dt>
                <dd>
                  <data value={hex}>{hex}</data>
                </dd>
                <dd>{role}</dd>
              </dl>
            </div>
          ))}
        </div>
        <p>
          لا تدرّجات، لا توهّج، ولا نحاسي أو ذهبي — الرمزان المتقاعدان
          موثّقان في <code>AUDIT.md §2</code> — ولا لون رابع. البوابة:
          اختبار <code>r323-brand-system.test.ts</code>.
        </p>
      </section>

      {/* 7 · do / don't */}
      <section className="r323b-sec" aria-labelledby="r323b-dd">
        <h2 id="r323b-dd">
          افعل / لا تفعل <span className="r323b-mono">· DO / DON'T</span>
        </h2>
        <div className="r323b-dd">
          <div>
            <span className="r323b-mono">DO · افعل</span>
            <ul className="r323b-do">
              <li>ابدأ من الشبكة: كل مراسي الرمز تقاطعات (VARIANTS.md — ب).</li>
              <li>شعرة موحّدة بوصلات miter — بلا استدارة ولا ظل.</li>
              <li>نقطة برتقالية واحدة فوق التقاطع (24,8).</li>
              <li>الفراغ الأمان ½ ارتفاع الرمز؛ الحد الأدنى 16px / 88px.</li>
              <li>currentColor + var(--accent) — والداكن يتكيف وحده.</li>
              <li>inline SVG فقط، مع title و data-logo على الجذر.</li>
            </ul>
          </div>
          <div>
            <span className="r323b-mono">DON'T · لا تفعل</span>
            <ul className="r323b-dont">
              <li>لا تدرّج، لا توهّج، لا نحاسي/ذهبي، لا لون رابع.</li>
              <li>لا وصلات round ولا استدارة — النحو miter.</li>
              <li>لا تدوير أو ميل أو تغيير نسب الرمز.</li>
              <li>لا حشو للمربعين ولا «نسخة مصمتة».</li>
              <li>لا تباعد أحرف على العربية (الكلمة متصلة كما نحجتها harfbuzz).</li>
              <li>لا هويات قديمة (StarMark / BrandMark / نجم EdgeTab / لوحة الإقلاع) — قائمة R323-PENDING تبدّل في التكامل.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 8 · animation */}
      <section className="r323b-sec" aria-labelledby="r323b-anim">
        <h2 id="r323b-anim">
          الرسم المتحرك <span className="r323b-mono">· ANIMATED — POINT LAST</span>
        </h2>
        <div className="r323b-anim">
          <Logo variant="lockup" size={44} animated />
        </div>
        <p>
          <code>animated</code> يرسم الشعيرات 600–900ms — النقطة البرتقالية
          آخر شيء يظهر. تحت <code>prefers-reduced-motion</code> لا يتحرك
          شيء: الشعار كامل من اللحظة الأولى.
        </p>
      </section>
    </main>
  );
}
