import { useState } from 'react';
import { Palette, Type, Bell, ToggleRight, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { ToggleSwitch } from '../../components/owner/ToggleSwitch';

export function OwnerContentPage() {
  // Hero content
  const [heroTitle, setHeroTitle] = useState('منصة الزاوية للتعليم الذكي');
  const [heroSubtitle, setHeroSubtitle] = useState('بوابتك الأكاديمية الشاملة لتجربة تعليمية متكاملة تجمع بين الذكاء الاصطناعي والمحتوى الأكاديمي المتميز');
  const [ctaText, setCtaText] = useState('ابدأ رحلتك التعليمية');
  const [heroSaved, setHeroSaved] = useState(false);

  // Colors
  const [primaryColor, setPrimaryColor] = useState('#003461');
  const [secondaryColor, setSecondaryColor] = useState('#fed65b');
  const [accentColor, setAccentColor] = useState('#a3c9ff');

  // Announcement
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annScope, setAnnScope] = useState('platform');
  const [annPriority, setAnnPriority] = useState('normal');
  const [annSent, setAnnSent] = useState(false);

  // Feature toggles
  const [toggles, setToggles] = useState({
    ai: true,
    labs: true,
    community: true,
    live: true,
    exams: true,
    jobs: true,
  });

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleHeroSave = () => {
    setHeroSaved(true);
    setTimeout(() => setHeroSaved(false), 2000);
  };

  const handleAnnSubmit = () => {
    setAnnSent(true);
    setAnnTitle('');
    setAnnBody('');
    setTimeout(() => setAnnSent(false), 2000);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المحتوى والعلامة التجارية</h1>
          <p className="page-subtitle">تخصيص المظهر والمحتوى العام للمنصة</p>
        </div>
      </div>

      {/* Hero Content */}
      <Card title="محتوى الواجهة الرئيسية" icon={Type}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', padding: 'var(--sp-3) 0' }}>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>عنوان الصفحة الرئيسية</label>
            <input
              type="text"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 'var(--fs-sm)', color: 'var(--text)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>العنوان الفرعي</label>
            <textarea
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 'var(--fs-sm)', color: 'var(--text)', resize: 'vertical' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>نص زر الدعوة (CTA)</label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              style={{ width: '100%', maxWidth: 300, padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 'var(--fs-sm)', color: 'var(--text)' }}
            />
          </div>
          <div>
            <button type="button" className="btn primary" onClick={handleHeroSave}>
              {heroSaved ? <><Icon icon={CheckCircle2} size={14} /> تم الحفظ</> : 'حفظ التغييرات'}
            </button>
          </div>
        </div>
      </Card>

      {/* Color Settings */}
      <Card title="إعدادات الألوان" icon={Palette}>
        <div style={{ padding: 'var(--sp-3) 0' }}>
          <div className="owner-color-swatch">
            <label>اللون الأساسي</label>
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{primaryColor}</span>
          </div>
          <div className="owner-color-swatch">
            <label>اللون الثانوي</label>
            <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{secondaryColor}</span>
          </div>
          <div className="owner-color-swatch">
            <label>لون التمييز</label>
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{accentColor}</span>
          </div>
        </div>
      </Card>

      {/* Announcement */}
      <Card title="إعلان عام جديد" icon={Bell}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', padding: 'var(--sp-3) 0' }}>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>عنوان الإعلان</label>
            <input
              type="text"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              placeholder="عنوان الإعلان..."
              style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 'var(--fs-sm)', color: 'var(--text)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>نص الإعلان</label>
            <textarea
              value={annBody}
              onChange={(e) => setAnnBody(e.target.value)}
              rows={3}
              placeholder="اكتب محتوى الإعلان هنا..."
              style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 'var(--fs-sm)', color: 'var(--text)', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>النطاق</label>
              <select
                value={annScope}
                onChange={(e) => setAnnScope(e.target.value)}
                style={{ padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 'var(--fs-sm)', color: 'var(--text)' }}
              >
                <option value="platform">المنصة بالكامل</option>
                <option value="faculty">كلية محددة</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>الأولوية</label>
              <select
                value={annPriority}
                onChange={(e) => setAnnPriority(e.target.value)}
                style={{ padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 'var(--fs-sm)', color: 'var(--text)' }}
              >
                <option value="normal">عادية</option>
                <option value="high">مرتفعة</option>
                <option value="urgent">عاجلة</option>
              </select>
            </div>
          </div>
          <div>
            <button type="button" className="btn primary" onClick={handleAnnSubmit} disabled={!annTitle || !annBody}>
              {annSent ? <><Icon icon={CheckCircle2} size={14} /> تم الإرسال</> : 'نشر الإعلان'}
            </button>
          </div>
        </div>
      </Card>

      {/* Feature Toggles */}
      <Card title="تبديل الوحدات" icon={ToggleRight}>
        <div style={{ padding: 'var(--sp-2) 0' }}>
          <ToggleSwitch label="المساعد الذكي (AI)" description="تفعيل خدمات الذكاء الاصطناعي للطلاب والأساتذة" checked={toggles.ai} onChange={() => handleToggle('ai')} />
          <ToggleSwitch label="المعامل الافتراضية" description="محاكاة المختبرات العلمية والهندسية" checked={toggles.labs} onChange={() => handleToggle('labs')} />
          <ToggleSwitch label="المجتمع الجامعي" description="منتدى التواصل والنقاش بين المستخدمين" checked={toggles.community} onChange={() => handleToggle('community')} />
          <ToggleSwitch label="البث المباشر" description="خدمة البث المباشر للمحاضرات والفعاليات" checked={toggles.live} onChange={() => handleToggle('live')} />
          <ToggleSwitch label="الاختبارات الإلكترونية" description="نظام الامتحانات الإلكترونية عبر الإنترنت" checked={toggles.exams} onChange={() => handleToggle('exams')} />
          <ToggleSwitch label="فرص العمل" description="عرض فرص التوظيف والتدريب للطلاب" checked={toggles.jobs} onChange={() => handleToggle('jobs')} />
        </div>
      </Card>
    </div>
  );
}
