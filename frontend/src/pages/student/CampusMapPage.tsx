import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Building2, Phone, ExternalLink, ArrowLeft, Info,
} from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { EmptyState, ErrorState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { useFaculties } from '../../hooks/useResources';

/**
 * Honest campus directory.
 *
 * The previous CampusMapPage rendered 8 invented buildings with fake
 * x/y coordinates (removed in the honesty purge — a pan/zoom campus
 * map needs building data the platform does not track). The "map"
 * moment is the city-footprint band below: real faculty counts per
 * city derived from the /faculties payload, doubling as the directory
 * filter. A true interactive campus map remains a facilities-data
 * follow-up (see the note card at the bottom of the page).
 */

/** Arabic counted-noun forms for the counts on this page:
 *  1 → singular, 2 → dual, 3–10 → plural, 11+ → singular accusative. */
function arCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n <= 10) return `${n.toLocaleString('ar-LY')} ${few}`;
  return `${n.toLocaleString('ar-LY')} ${many}`;
}

export default function CampusMapPage() {
  const facs = useFaculties();
  const faculties = facs.data ?? [];
  const [city, setCity] = useState<string>('all');

  /* City footprint — real counts from the faculties payload, sorted by
     actual footprint size (the old page sorted cities by a hardcoded
     list; every value below is derived from live data). */
  const cityStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of facs.data ?? []) counts.set(f.city, (counts.get(f.city) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'));
  }, [facs.data]);
  const maxCount = cityStats[0]?.count ?? 1;

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

      {/* The campus "map" — an honest footprint band (real counts per
          city; the bar length is proportional to the faculty count) that
          doubles as the directory filter. This band is the page's
          authored moment: the bars grow in on entrance. */}
      <Card
        title="انتشار الكليّات على المدن"
        icon={MapPin}
        subtitle="طول كل شريط يتناسب مع عدد الكليّات المسجَّلة في المدينة — انقر مدينة لتصفية الدليل."
      >
        {facs.isPending ? (
          <div className="flex-col gap-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div className="campus-skel-row" key={i} aria-hidden>
                <Skeleton width={84} height={13} />
                <Skeleton width={`${72 - i * 14}%`} height={8} rounded="var(--r-full)" />
                <Skeleton width={26} height={13} />
              </div>
            ))}
          </div>
        ) : facs.isError ? (
          <ErrorState
            message="تعذَّر تحميل قائمة الكليّات"
            error={facs.error}
            onRetry={() => facs.refetch()}
          />
        ) : (
          <div className="campus-city-list" role="group" aria-label="تصفية الكليّات حسب المدينة">
            <button
              type="button"
              className={`campus-city-row${city === 'all' ? ' on' : ''}`}
              aria-pressed={city === 'all'}
              onClick={() => setCity('all')}
            >
              <span className="campus-city-name">جميع المدن</span>
              <span className="campus-city-track" aria-hidden>
                <span className="campus-city-fill" style={{ inlineSize: '100%' }} />
              </span>
              <span className="campus-city-count">{faculties.length.toLocaleString('ar-LY')}</span>
            </button>
            {cityStats.map((c, i) => (
              <button
                key={c.name}
                type="button"
                className={`campus-city-row${city === c.name ? ' on' : ''}`}
                aria-pressed={city === c.name}
                style={{ ['--city-i' as never]: i + 1 }}
                onClick={() => setCity(c.name)}
              >
                <span className="campus-city-name">{c.name}</span>
                <span className="campus-city-track" aria-hidden>
                  <span
                    className="campus-city-fill"
                    style={{ inlineSize: `${Math.max(8, Math.round((c.count / maxCount) * 100))}%` }}
                  />
                </span>
                <span className="campus-city-count">{c.count.toLocaleString('ar-LY')}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Directory — the band above owns the error state, so this
          section only renders its honest empty state with data loaded. */}
      {facs.isError ? null : facs.isPending ? (
        <Card title="جميع الكليّات" icon={Building2}>
          <div className="grid-3" aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div className="list-row" key={i} aria-hidden>
                <Skeleton width={22} height={22} />
                <div className="list-row-body flex-col gap-2">
                  <Skeleton width="72%" height={13} />
                  <Skeleton width="48%" height={11} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="لا توجد كلّيّات في هذه المدينة"
          description="جرِّب اختيار مدينة أخرى من انتشار الكليّات بالأعلى."
        />
      ) : (
        <Card
          title={city === 'all' ? 'جميع الكليّات' : `كلّيّات ${city}`}
          icon={Building2}
          subtitle={arCount(visible.length, 'كلّيّة واحدة', 'كلّيّتان', 'كليّات', 'كلّيّة')}
        >
          <div className="grid-3">
            {visible.map((f) => (
              <Link
                key={f.id}
                to={`/colleges/${f.id}`}
                className="list-row campus-faculty-link"
              >
                <span style={{ color: 'var(--accent)' }} aria-hidden>
                  <EmojiIcon emoji={f.iconEmoji ?? '🏛️'} size={22} />
                </span>
                <div className="list-row-body">
                  <div className="list-row-title">{f.name}</div>
                  <div className="list-row-sub">
                    <Badge color="purple">{f.city}</Badge>
                    {' '}
                    {arCount(f.departments.length, 'قسم واحد', 'قسمان', 'أقسام', 'قسماً')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card title="معلومات التواصل" icon={Phone}>
        <div className="grid-2" style={{ gap: 'var(--sp-3)' }}>
          <div className="fact-row">
            <span className="text-xxs text-subtle">الهاتف</span>
            <bdi dir="ltr" className="font-mono text-sm">+218 23 762659</bdi>
            <bdi dir="ltr" className="font-mono text-sm">+218 23 762882</bdi>
          </div>
          <div className="fact-row">
            <span className="text-xxs text-subtle">البريد الإلكتروني</span>
            <bdi dir="ltr" className="font-mono text-sm">info@zu.edu.ly</bdi>
            <bdi dir="ltr" className="font-mono text-sm">ico@zu.edu.ly</bdi>
          </div>
        </div>

        <div className="campus-map-note">
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
