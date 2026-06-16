import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Building2, Phone, Mail, ExternalLink, ArrowLeft, Info,
} from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { LoadingState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { useFaculties } from '../../hooks/useResources';

/**
 * Honest campus directory.
 *
 * The previous CampusMapPage rendered 8 invented buildings with fake
 * x/y coordinates, made-up room counts, and invented working hours
 * — none of which the platform actually tracks. Replaced with a real
 * faculty directory grouped by city, plus a transparent note that the
 * interactive campus map is conceptual / coming from facilities.
 */
export default function CampusMapPage() {
  const facs = useFaculties();
  const faculties = facs.data ?? [];
  const [city, setCity] = useState<string>('all');

  const cities = Array.from(new Set(faculties.map((f) => f.city)));
  const order = ['الزاوية', 'العجيلات', 'زوارة', 'أبو عيسى', 'ناصر', 'مناطق أخرى'];
  const sortedCities = cities.sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const visible = city === 'all' ? faculties : faculties.filter((f) => f.city === city);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">دليل الحرم الجامعيّ</h1>
          <p className="page-subtitle">
            كلّيّات جامعة الزاوية بحسب المدينة، مع روابط لصفحاتها التفصيليّة.
          </p>
        </div>
      </header>

      <Card>
        <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`pill${city === 'all' ? ' on' : ''}`}
            onClick={() => setCity('all')}
          >
            <Icon icon={MapPin} size={13} />
            الكلّ
          </button>
          {sortedCities.map((c) => (
            <button
              key={c}
              type="button"
              className={`pill${city === c ? ' on' : ''}`}
              onClick={() => setCity(c)}
            >
              <Icon icon={Building2} size={13} />
              {c}
            </button>
          ))}
        </div>
      </Card>

      {facs.isPending ? (
        <LoadingState />
      ) : visible.length === 0 ? (
        <EmptyState
          title="لا توجد كلّيّات في هذه المدينة"
          description="جرِّب اختيار مدينة أخرى من الفلتر بالأعلى."
        />
      ) : (
        <Card title={city === 'all' ? 'جميع الكلّيّات' : `كلّيّات ${city}`} icon={Building2}>
          <div className="grid-3">
            {visible.map((f) => (
              <Link
                key={f.id}
                to={`/colleges/${f.id}`}
                className="list-row"
                style={{ textAlign: 'start', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <span style={{ color: 'var(--accent)' }} aria-hidden><EmojiIcon emoji={f.iconEmoji ?? '🏛️'} size={22} /></span>
                <div className="list-row-body">
                  <div className="list-row-title">{f.name}</div>
                  <div className="list-row-sub">
                    <Badge color="purple">{f.city}</Badge>
                    {' '}
                    {f.departments.length} قسم
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card title="معلومات التواصل" icon={Phone}>
        <div className="grid-2" style={{ gap: 'var(--sp-3)' }}>
          <div style={{ padding: 'var(--sp-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
            <div className="text-xxs text-subtle" style={{ marginBlockEnd: 4 }}>الهاتف</div>
            <div className="text-sm font-mono">+218 23 762659</div>
            <div className="text-sm font-mono" style={{ marginBlockStart: 4 }}>+218 23 762882</div>
          </div>
          <div style={{ padding: 'var(--sp-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
            <div className="text-xxs text-subtle" style={{ marginBlockEnd: 4 }}>البريد الإلكتروني</div>
            <div className="text-sm font-mono"><Icon icon={Mail} size={12} /> info@zu.edu.ly</div>
            <div className="text-sm font-mono" style={{ marginBlockStart: 4 }}><Icon icon={Mail} size={12} /> ico@zu.edu.ly</div>
          </div>
        </div>

        <div style={{
          marginBlockStart: 'var(--sp-3)',
          padding: 'var(--sp-3)',
          background: 'var(--accent-soft)',
          color: 'var(--accent)',
          borderRadius: 'var(--r-md)',
          fontSize: 'var(--fs-xs)',
          display: 'flex',
          gap: 'var(--sp-2)',
          alignItems: 'flex-start',
          lineHeight: 1.6,
        }}>
          <Icon icon={Info} size={14} style={{ flexShrink: 0, marginBlockStart: 2 }} />
          <span>
            خريطة الحرم التفاعليّة قيد التطوير. حاليّاً يمكنك الاطّلاع على المواقع الفعليّة عبر الموقع
            الرسميّ:{' '}
            <a href="https://www.zu.edu.ly" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
              zu.edu.ly <Icon icon={ExternalLink} size={11} />
            </a>
          </span>
        </div>
      </Card>

      <Card>
        <Link to="/student/university" className="btn primary sm">
          <Icon icon={ArrowLeft} size={13} />
          صفحة جامعة الزاوية الكاملة
        </Link>
      </Card>
    </div>
  );
}
