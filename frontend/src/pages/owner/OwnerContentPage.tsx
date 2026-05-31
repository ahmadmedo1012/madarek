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
 */
export function OwnerContentPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المحتوى والعلامة التجاريّة</h1>
          <p className="page-subtitle">إدارة محتوى المنصّة، الإعلانات، والميزات.</p>
        </div>
      </div>

      <div className="grid-2">
        <Card title="الإعلانات الرسميّة" icon={Bell}>
          <p className="text-sm text-muted" style={{ margin: '0 0 var(--sp-3) 0', lineHeight: 1.6 }}>
            إنشاء وبثّ الإعلانات على مستوى المنصّة أو الكلّيّة أو القسم — مع نطاق محدّد، وأيقونة،
            وخيار التثبيت في أعلى القائمة.
          </p>
          <Link to="/community" className="btn primary sm">
            <Icon icon={ArrowLeft} size={13} />
            فتح المجتمع الجامعيّ
          </Link>
        </Card>

        <Card title="ميزات المنصّة" icon={ToggleRight}>
          <p className="text-sm text-muted" style={{ margin: '0 0 var(--sp-3) 0', lineHeight: 1.6 }}>
            تشغيل وإطفاء الميزات (المعامل الافتراضيّة، البثّ المباشر، الاختبارات...) عبر نظام أعلام
            الميزات. التغييرات تُطبَّق فوراً على جميع المستخدمين.
          </p>
          <Link to="/owner/system" className="btn primary sm">
            <Icon icon={ArrowLeft} size={13} />
            فتح إعدادات النظام
          </Link>
        </Card>
      </div>

      <Card title="الهويّة البصريّة" icon={Palette}>
        <div style={{
          padding: 'var(--sp-3)',
          background: 'var(--accent-soft)',
          color: 'var(--accent)',
          borderRadius: 'var(--r-md)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--sp-2)',
          fontSize: 'var(--fs-xs)',
          lineHeight: 1.6,
        }}>
          <Icon icon={Info} size={14} style={{ flexShrink: 0, marginBlockStart: 2 }} />
          <span>
            تعديل ألوان العلامة التجاريّة (الأساسيّ، الثانويّ، التمييز) ومحتوى الصفحة الرئيسيّة قيد
            التطوير. حالياً تُعتمَد ألوان وزارة التعليم العالي وجامعة الزاوية الرسميّة.
          </span>
        </div>

        <div className="grid-3" style={{ marginBlockStart: 'var(--sp-3)', gap: 'var(--sp-2)' }}>
          <div style={{ padding: 'var(--sp-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
            <div className="text-xxs text-subtle">اللون الأساسيّ</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBlockStart: 4 }}>
              <span style={{ width: 20, height: 20, borderRadius: 4, background: '#003461', display: 'inline-block' }} />
              <span className="font-mono text-xs">#003461</span>
            </div>
          </div>
          <div style={{ padding: 'var(--sp-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
            <div className="text-xxs text-subtle">اللون الثانويّ</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBlockStart: 4 }}>
              <span style={{ width: 20, height: 20, borderRadius: 4, background: '#fed65b', display: 'inline-block' }} />
              <span className="font-mono text-xs">#fed65b</span>
            </div>
          </div>
          <div style={{ padding: 'var(--sp-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
            <div className="text-xxs text-subtle">لون التمييز</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBlockStart: 4 }}>
              <span style={{ width: 20, height: 20, borderRadius: 4, background: '#a3c9ff', display: 'inline-block' }} />
              <span className="font-mono text-xs">#a3c9ff</span>
            </div>
          </div>
        </div>
      </Card>

      <Card title="محتوى الواجهة الرئيسيّة" icon={Type}>
        <p className="text-sm text-muted" style={{ padding: 'var(--sp-3) 0', lineHeight: 1.6 }}>
          محرّر العنوان والوصف الفرعيّ ونصّ زرّ "ابدأ الآن" قيد التطوير. النصوص الحاليّة محدّدة
          في كود الصفحة الرئيسيّة.
        </p>
      </Card>
    </div>
  );
}
