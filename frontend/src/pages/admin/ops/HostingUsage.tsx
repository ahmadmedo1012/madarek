/**
 * R351 X5 — the hosting/usage seat in the admin settings page.
 *
 * Reads /ops/vercel-usage.json — a static asset the weekly
 * vercel-usage-watch workflow commits (deployments per day + the
 * production freshness pair). No token ever reaches the browser: the
 * watch runs in CI with the repo secret and publishes only the derived
 * table; the invocations/Active-CPU limits are documented inside the
 * asset itself (they are not exposed by the API on this plan+token —
 * the owner reads the dashboard weekly; see docs/RELEASE.md §الاستضافة).
 */
import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { Card, Badge } from '../../../components/primitives';

interface UsageDoc {
  generatedAt: string;
  deployments7d: number;
  deploymentsPerDay: Array<{ date: string; count: number }>;
  maxDay: { date: string; count: number; pctOfLimit: number };
  freshness: { liveBuildId: string; mainHead: string; current: boolean };
  plan: { name: string; nonCommercial: boolean };
  alerts: Array<{ date: string; pct: number }>;
  limitations: string[];
}

/** The Hobby daily-deploy limit the watch alert threshold rides on. */
const LIMIT_PER_DAY = 100;

export function HostingUsageCard() {
  const usage = useQuery({
    queryKey: ['ops', 'vercel-usage'],
    queryFn: async () => {
      const res = await fetch('/ops/vercel-usage.json');
      if (!res.ok) throw new Error('usage doc unavailable');
      return (await res.json()) as UsageDoc;
    },
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <Card title="الاستضافة والاستخدام" icon={Activity}>
      {usage.isPending ? (
        <div className="settings-row">
          <div>
            <div className="settings-label">لوحة الاستخدام</div>
            <div className="settings-value">جارٍ التحميل…</div>
          </div>
        </div>
      ) : usage.isError ? (
        <div className="settings-row">
          <div>
            <div className="settings-label">لوحة الاستخدام</div>
            <div className="settings-value">بيانات الاستخدام غير متاحة الآن — راجع لوحة Vercel مباشرة.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="settings-row">
            <div>
              <div className="settings-label">النشرات (آخر 7 أيام)</div>
              <div className="settings-value">
                {usage.data!.deployments7d} نشرات · أعلى يوم {usage.data!.maxDay.date}:
                {' '}{usage.data!.maxDay.count} من حدّ {LIMIT_PER_DAY}/يوم
              </div>
            </div>
            <Badge
              color={
                usage.data!.maxDay.pctOfLimit >= 85
                  ? 'red'
                  : usage.data!.maxDay.pctOfLimit >= 60
                    ? 'amber'
                    : 'green'
              }
            >
              {usage.data!.maxDay.pctOfLimit >= 60
                ? `عتبة 60% — ${usage.data!.maxDay.pctOfLimit}%`
                : 'بأمان'}
            </Badge>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">نضارة الإنتاج</div>
              {/* dir="ltr": a sha prefix must never be RTL-shuffled. */}
              <div className="settings-value" dir="ltr">
                {usage.data!.freshness.liveBuildId}
                {usage.data!.freshness.current
                  ? ' · يطابق main'
                  : ` · main ${usage.data!.freshness.mainHead}`}
              </div>
            </div>
            <Badge color={usage.data!.freshness.current ? 'green' : 'red'}>
              {usage.data!.freshness.current ? 'محدَث' : 'متقادم'}
            </Badge>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">الخطة والحدود</div>
              <div className="settings-value">
                {usage.data!.plan.name} · للاستخدام غير التجاري — تُقرَّر الترقية قبل أي
                استخدام تجاري (Pro / Render Starter — docs/RELEASE.md).
              </div>
            </div>
          </div>
          <p className="text-sm text-muted" style={{ marginBlockStart: 'var(--sp-2)' }}>
            {usage.data!.limitations[0]}
          </p>
        </>
      )}
    </Card>
  );
}
