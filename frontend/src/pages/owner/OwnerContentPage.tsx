import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  Palette, Bell, ToggleRight, ArrowLeft, Info,
} from 'lucide-react';
import { Card } from '../../components/primitives';
import { Icon } from '../../components/Icon';

/**
 * Honest content / branding landing.
 *
 * The previous OwnerContentPage rendered four fake editors (hero title,
 * brand colors, announcement composer, feature toggles) all wired to
 * local React state. The "save" buttons flashed "تم الحفظ" but nothing
 * persisted anywhere. The page misled the owner into thinking they had
 * configured the platform.
 *
 * Real persistence already exists for two of these: announcements live
 * at POST /announcements (used in /community) and feature flags live
 * at /owner/feature-flags (used in /owner/system). The hero/brand
 * editor has no backend yet.
 *
 * r165g (truthfulness): the flags card no longer promises «التغييرات
 * تُطبَّق فوراً» — repo-wide, NOTHING consumes the FeatureFlag table
 * at runtime (the owner console's own GET/PUT are the only readers),
 * so the honest copy says the state is recorded + audited but not
 * applied. If a runtime gate ever lands, restore the effect claim.
 *
 * Wave 6-b: structural inline styles → owner.css §6-b classes, the
 * brand hexes are bidi-isolated as Latin runs, and the identity card's
 * swatches settle in staggered (the page's authored moment).
 */

/**
 * r183-B5 (A9 wave-A P2 — the identity surface's honesty): the old
 * BRAND_SWATCHES hardcoded the reference university's palette
 * (#003461/#fed65b/#a3c9ff) while the notice above claimed «ألوان علامة
 * مدارك الرسميّة… في نظام التصميم» — chips and copy disagreed. The
 * swatches now resolve AT RUNTIME from the live design tokens
 * (getComputedStyle on <html>: the [data-theme="dark"] block wins when
 * the night skin is applied), so the card displays the platform's
 * ACTUAL brand — the label names the token, the chip shows its computed
 * value. The hexes are still displayed data (content), never a style
 * token gap: they sit in inline style on an aria-hidden chip, the same
 * concession the admin course themeColor tint makes.
 */
const BRAND_TOKENS = [
  { label: 'اللون الأساسيّ', token: '--accent' },
  { label: 'اللون الثانويّ', token: '--gold' },
  { label: 'لون التمييز', token: '--accent-soft' },
] as const;

interface BrandSwatch {
  label: string;
  token: string;
  /** The token's computed value in the APPLIED theme (e.g. «#B57438»);
   * null when the environment can't resolve it (jsdom / very old
   * engines) — rendered as the honest «غير متاحة», never a fabricated
   * hex. */
  value: string | null;
}

/** Read one token's computed value from the applied theme. */
function resolveTokenValue(token: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || null;
}

/**
 * Bumps whenever `<html data-theme>` flips — the applied-skin re-resolve
 * signal (the same single source chartTheme's singleton watches; kept
 * local here so this leaf page never drags chart.js into its lazy
 * chunk). jsdom never flips the attribute, so unit tests resolve once.
 */
function useAppliedThemeVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.attributeName === 'data-theme')) {
        setVersion((v) => v + 1);
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);
  return version;
}

export function OwnerContentPage() {
  // Swatches resolve per applied theme and refresh when it flips.
  const themeVersion = useAppliedThemeVersion();
  const swatches = useMemo<BrandSwatch[]>(
    () => BRAND_TOKENS.map((s) => ({ ...s, value: resolveTokenValue(s.token) })),
    // themeVersion is the re-resolve signal by design (the applied skin
    // changed) — the same intentional-dep shape the chart pages' themeKey
    // memo deps document.
    [themeVersion],
  );
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المحتوى والعلامة التجاريّة</h1>
          <p className="page-subtitle">إدارة الإعلانات، أعلام الميزات، والهويّة البصريّة للمنصّة</p>
        </div>
      </header>

      <div className="grid-2">
        <Card title="الإعلانات الرسميّة" icon={Bell}>
          <p className="owner-card-lead">
            إنشاء وبثّ الإعلانات على مستوى المنصّة أو الكلّيّة أو القسم — مع نطاق محدّد، وأيقونة،
            وخيار التثبيت في أعلى القائمة.
          </p>
          <Link to="/community" className="btn primary sm">
            <Icon icon={ArrowLeft} size={13} />
            فتح المجتمع الجامعيّ
          </Link>
        </Card>

        <Card title="ميزات المنصّة" icon={ToggleRight}>
          <p className="owner-card-lead">
            تشغيل وإطفاء الميزات (المعامل الافتراضيّة، البثّ المباشر، الاختبارات...) عبر نظام أعلام
            الميزات — تُسجَّل الحالة وتُوثَّق في سجلّ النشاط، ولا تستهلكها أيّ بوابة تشغيل بعد:
            الميزات تعمل بحالاتها المضمّنة في الشيفرة.
          </p>
          <Link to="/owner/system" className="btn primary sm">
            <Icon icon={ArrowLeft} size={13} />
            فتح إعدادات النظام
          </Link>
        </Card>
      </div>

      <Card title="الهويّة البصريّة" icon={Palette} className="owner-card-settle">
        <div className="owner-brand-notice">
          <Icon icon={Info} size={14} />
          <span>
            تعديل ألوان العلامة التجاريّة (الأساسيّ، الثانويّ، التمييز) ومحتوى الصفحة الرئيسيّة قيد
            التطوير. حالياً تُعتمَد ألوان علامة مدارك الرسميّة المعتمدة في نظام التصميم — تُقرَأ
            مباشرةً من رموز نظام التصميم النشطة (فاتح/داكن) عند عرض الصفحة.
            {/* r299: the one-sentence «محتوى الواجهة الرئيسيّة» card folded
                in here — a whole bordered box for one sentence that restated
                this same dev-status note; the «فوراً» honesty contract
                (r165g) stays intact (no «instant» promises anywhere). */}
            محرّر العنوان والوصف الفرعيّ ونصّ زرّ «ابدأ الآن» قيد التطوير — النصوص
            الحاليّة محدّدة في كود الصفحة الرئيسيّة.
          </span>
        </div>

        <div className="owner-swatch-grid">
          {swatches.map((s, i) => (
            <div key={s.token} className="owner-swatch" style={{ '--swatch-i': i } as CSSProperties}>
              <div className="text-xxs text-subtle">
                {s.label}{' '}
                {/* The token's own name — the label names WHAT it reads. */}
                <bdi className="font-mono" dir="ltr">{s.token}</bdi>
              </div>
              <div className="owner-swatch-row">
                {s.value != null ? (
                  <>
                    <span
                      className="owner-swatch-chip"
                      style={{ background: s.value }}
                      aria-hidden
                    />
                    <bdi className="owner-swatch-hex" dir="ltr">{s.value}</bdi>
                  </>
                ) : (
                  <span className="text-xxs text-subtle">قيمة الرمز غير متاحة الآن</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
