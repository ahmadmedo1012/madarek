import { Link } from 'react-router-dom';
import {
  Calendar, Globe, Mic2, Video, ArrowLeft, MessageSquare,
} from 'lucide-react';
import { Card, MetricCard } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useCampusEvents } from '../../hooks/useResources';

/**
 * Honest webinars landing.
 *
 * The previous WebinarsPage rendered 7 invented webinars with fake
 * international speakers (Prof Sarah Lin from Stanford, etc.). The
 * platform's real events live in CampusEvent / LiveSession; this page
 * points students at them and surfaces a count of real upcoming events.
 */
export default function WebinarsPage() {
  const events = useCampusEvents();
  const upcomingCount = events.data?.length ?? 0;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الندوات وورش العمل</h1>
          <p className="page-subtitle">
            الفعاليّات الجامعيّة الرسميّة تُنشر على لوحة المجتمع — ستجد هنا الإحصائيّة الحيّة وروابط سريعة.
          </p>
        </div>
      </header>

      <div className="grid-3">
        <MetricCard
          icon={Calendar}
          label="فعاليّات قادمة"
          value={events.isPending ? '…' : upcomingCount.toLocaleString('ar-LY')}
          color="brand"
        />
        <MetricCard
          icon={Mic2}
          label="بثوث مباشرة"
          value="—"
          change="من خلال صفحة البثّ"
          color="purple"
        />
        <MetricCard
          icon={Video}
          label="ندوات مسجَّلة"
          value="—"
          change="على فيديوهات المقرّرات"
          color="gold"
        />
      </div>

      <Card title="أين أجد الفعاليّات الحقيقيّة؟" icon={Globe}>
        <div className="grid-2" style={{ gap: 'var(--sp-3)', padding: 'var(--sp-3) 0' }}>
          <div style={{
            padding: 'var(--sp-4)',
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-md)',
          }}>
            <h3 style={{ fontSize: 'var(--fs-md)', margin: '0 0 var(--sp-2) 0' }}>
              <Icon icon={MessageSquare} size={16} /> المجتمع الجامعيّ
            </h3>
            <p className="text-sm text-muted" style={{ margin: '0 0 var(--sp-3) 0', lineHeight: 1.6 }}>
              تابع الفعاليّات والإعلانات والمسابقات على مستوى الجامعة. جميع الأحداث القادمة ظاهرة هناك مع
              زر "سأحضر" للتأكيد.
            </p>
            <Link to="/community" className="btn primary sm">
              <Icon icon={ArrowLeft} size={13} />
              فتح المجتمع
            </Link>
          </div>

          <div style={{
            padding: 'var(--sp-4)',
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-md)',
          }}>
            <h3 style={{ fontSize: 'var(--fs-md)', margin: '0 0 var(--sp-2) 0' }}>
              <Icon icon={Video} size={16} /> البثّ المباشر
            </h3>
            <p className="text-sm text-muted" style={{ margin: '0 0 var(--sp-3) 0', lineHeight: 1.6 }}>
              جلسات البثّ المباشر الخاصّة بمقرّراتك مع التسجيلات بعد الجلسة.
            </p>
            <Link to="/student/live" className="btn primary sm">
              <Icon icon={ArrowLeft} size={13} />
              فتح صفحة البثّ
            </Link>
          </div>
        </div>
      </Card>

      {events.isPending ? (
        <LoadingState />
      ) : events.isError ? (
        <ErrorState error={events.error} onRetry={() => events.refetch()} />
      ) : null}
    </div>
  );
}
