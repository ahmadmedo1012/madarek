import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  Palette, Type, Bell, ToggleRight, ArrowLeft, Info,
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
 * Wave 6-b: structural inline styles → owner.css §6-b classes, the
 * brand hexes are bidi-isolated as Latin runs, and the identity card's
 * swatches settle in staggered (the page's authored moment).
 */

/**
 * Official University of Zawiya brand palette — DISPLAYED DATA, not style
 * tokens: these hexes document the brand the platform currently carries
 * (docs/FRONTEND-REFERENCE.md — «brand navy #003461, gold»). They render
 * as content here, so the raw values are the point, not a token gap.
 */
const BRAND_SWATCHES = [
  { label: 'اللون الأساسيّ', hex: '#003461' },
  { label: 'اللون الثانويّ', hex: '#fed65b' },
  { label: 'لون التمييز', hex: '#a3c9ff' },
] as const;

export function OwnerContentPage() {
  return (
    <div className="page owner-content-page">
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
            الميزات. التغييرات تُطبَّق فوراً على جميع المستخدمين.
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
            التطوير. حالياً تُعتمَد ألوان وزارة التعليم العالي وجامعة الزاوية الرسميّة.
          </span>
        </div>

        <div className="owner-swatch-grid">
          {BRAND_SWATCHES.map((s, i) => (
            <div key={s.hex} className="owner-swatch" style={{ '--swatch-i': i } as CSSProperties}>
              <div className="text-xxs text-subtle">{s.label}</div>
              <div className="owner-swatch-row">
                <span
                  className="owner-swatch-chip"
                  style={{ background: s.hex }}
                  aria-hidden
                />
                <bdi className="owner-swatch-hex" dir="ltr">{s.hex}</bdi>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="محتوى الواجهة الرئيسيّة" icon={Type} className="owner-card-settle">
        <p className="owner-card-lead">
          محرّر العنوان والوصف الفرعيّ ونصّ زرّ «ابدأ الآن» قيد التطوير. النصوص الحاليّة محدّدة
          في كود الصفحة الرئيسيّة.
        </p>
      </Card>
    </div>
  );
}
