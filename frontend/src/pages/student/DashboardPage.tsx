import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
} from 'chart.js';
import { Link } from 'react-router-dom';
import {
  BookOpen, CheckCircle2,
  Calendar, Bell, ChevronLeft, Play, PlayCircle,
  Compass, AlertCircle, ArrowLeft,
  Cog, Cpu, Database, Network, Globe, Shield, GraduationCap, Presentation, FileText, FlaskConical, BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, ProgressBar } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState, KpiSkeleton, ListSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useMyEnrollments, useResume, useGaps, useMyProfile } from '../../hooks/useResources';
import { useAuthStore } from '../../stores/auth.store';

ChartJS.register(ArcElement, Tooltip, Legend);

// Map course code to a meaningful Lucide icon
const courseIcon = (codeOrName: string): LucideIcon => {
  const s = codeOrName.toLowerCase();
  if (s.includes('se') || s.includes('برمج')) return Cog;
  if (s.includes('ct') || s.includes('تقنيات الحاسوب')) return Cpu;
  if (s.includes('is') || s.includes('نظم')) return Database;
  if (s.includes('net') || s.includes('شبك')) return Network;
  if (s.includes('web') || s.includes('إنترنت')) return Globe;
  if (s.includes('sec') || s.includes('أمن')) return Shield;
  return BookOpen;
};

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return 'سهرة سعيدة';
    if (h < 12) return 'صباح الخير';
    if (h < 18) return 'مساء النور';
    return 'مساء الخير';
  })();

  return (
    <div className="page" style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div className="page-title-block">
          <h1 className="page-title" style={{ fontSize: 24, fontWeight: 'bold' }}>{greeting}، {user?.firstName ?? 'أحمد'}</h1>
          <p className="page-subtitle" style={{ color: 'var(--text-muted)' }}>
            لوحة متابعة تقدمك الأكاديمي.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <Card style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: '600' }}>المعدل التراكمي</div>
              <div style={{ fontSize: 48, fontWeight: 'bold', color: 'var(--accent)', lineHeight: 1.2 }}>3.8</div>
              <div style={{ fontSize: 14, padding: '4px 0' }}><Badge color="green">ممتاز</Badge></div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gold-soft)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon icon={GraduationCap} size={24} />
            </div>
          </div>
        </Card>

        <Card style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
             <Doughnut
                data={{
                  labels: ['منجز', 'متبقي'],
                  datasets: [{
                    data: [75, 25],
                    backgroundColor: ['#0B2545', '#E9ECEF'],
                    borderWidth: 0,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '80%',
                  plugins: { legend: { display: false }, tooltip: { enabled: false } },
                }}
              />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--accent)', lineHeight: 1 }}>75%</span>
              </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: '600' }}>التقدم الأكاديمي</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text)', marginTop: 4 }}>60 من 80 ساعة معتمدة</div>
          </div>
        </Card>
      </div>

      <Card style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: '600' }}>تقدم الفصل الدراسي الحالي</div>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--accent)' }}>60%</div>
        </div>
        <div style={{ width: '100%', height: 12, background: 'var(--surface-3)', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ width: '60%', height: '100%', background: 'var(--gold)', borderRadius: 6 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-subtle)', fontSize: 14 }}>
          <span>بداية الفصل 10/09</span>
          <span>نهاية الفصل 15/01</span>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 'bold' }}>المهام والفصول القادمة</h3>
        
        <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={Presentation} size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>برمجة متقدمة - قاعة 301</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>اليوم 10:00 ص</div>
          </div>
        </Card>

        <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--gold-soft)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={FileText} size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>تسليم مشروع التخرج</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>غداً 11:59 م</div>
          </div>
        </Card>

        <Card style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={FlaskConical} size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>معمل الذكاء الاصطناعي - قاعة 205</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>الخميس 2:00 م</div>
          </div>
        </Card>
      </div>

    </div>
  );
}
