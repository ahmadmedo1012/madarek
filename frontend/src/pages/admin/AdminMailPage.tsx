/**
 * R350 E6 — «البريد»: the admin mail surface.
 *
 * One page, four honest panels:
 *  · الحالة — provider configured?, the last-24h sent/failed counters,
 *    the outbox backlog (domain verification is owner-side — said plainly).
 *  · سجلّ التسليم — the outbox delivery log (filters + pagination +
 *    per-row retry/cancel; the provider id links its message).
 *  · قائمة الحجب — bounces/complaints/unsubscribes (+ un-suppress).
 *  · إرسال رسالة اختبار — a REAL provider send to a chosen address.
 *
 * Auth: the ADMIN role gate rides the route (ProtectedRoute), not this
 * page. Data: the mail-admin hooks (platform-level, 30s status polling).
 */
import { useState } from 'react';
import { apiErrorMessage } from '../../lib/format';
import { toast } from '../../lib/toast';
import { formatDate } from '../../utils/numbers';
import { Card } from '../../components/primitives';
import { EmptyState, ErrorState, ListSkeleton, TableSkeleton } from '../../components/primitives/States';
import { PageHeader } from '../../components/patterns';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  CheckCircle2,
  ListChecks,
  Mail,
  MailX,
  RefreshCw,
  Send,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  useMailAdminStatus,
  useMailCancel,
  useMailOutbox,
  useMailOutboxMeta,
  useMailRetry,
  useMailSuppression,
  useMailTemplates,
  useMailTestSend,
  useMailUnsuppress,
} from '../../hooks/useResources';
import { TablePaginationFooter } from './TablePaginationFooter';

import '../../styles/admin.css';
import '../../styles/shared/heron-admin-owner.css';

const OUTBOX_ROW_UNIT: [string, string, string, string] = ['صف واحد', 'صفّان', 'صفوف', 'صفًا'];
const SUPPRESSION_ROW_UNIT: [string, string, string, string] = ['عنوان واحد', 'عنوانان', 'عناوين', 'عنوانًا'];

const STATUS_LABEL_AR: Record<string, string> = {
  queued: 'في الانتظار',
  sending: 'يُرسَل الآن',
  sent: 'أُرسل',
  failed: 'فشل',
  suppressed: 'محجوب/ملغى',
};

const SUPPRESSION_TYPE_AR: Record<string, string> = {
  hard_bounce: 'ارتداد قاسٍ',
  complaint: 'شكوى (سبام)',
  unsubscribe: 'إلغاء اشتراك',
};

const OUTBOX_STATUSES = ['', 'queued', 'sending', 'sent', 'failed', 'suppressed'] as const;

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'sent'
      ? 'pill on'
      : status === 'failed' || status === 'suppressed'
        ? 'pill danger'
        : 'pill';
  return <span className={`${cls} mail-status-pill`}>{STATUS_LABEL_AR[status] ?? status}</span>;
}

export function AdminMailPage() {
  return (
    <div className="page r305ao">
      <PageHeader
        title="البريد"
        description="حالة مزوّد البريد، سجلّ التسليم، قائمة الحجب، وإرسال رسالة اختبار — كل ما يجري فعلًا، بلا ادّعاء."
        breadcrumbs={[
          { label: 'لوحة المسجل العام', to: '/admin/dashboard' },
          { label: 'البريد' },
        ]}
      />
      <ProviderStatusCard />
      <DeliveryLogCard />
      <div className="r350-e6-grid">
        <SuppressionCard />
        <TestSendCard />
      </div>
    </div>
  );
}

function ProviderStatusCard() {
  const { data, isPending, isError, error, refetch } = useMailAdminStatus();
  if (isPending) {
    return (
      <Card title="حالة المزوّد" icon={Activity}>
        <ListSkeleton rows={4} />
      </Card>
    );
  }
  if (isError || !data) {
    return (
      <Card title="حالة المزوّد" icon={Activity}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Card>
    );
  }
  return (
    <Card
      title="حالة المزوّد"
      icon={Activity}
      subtitle={`المزوّد: ${data.provider} — المُرسِل: ${data.from} · الحدود اليومية: ${data.caps.recipientDaily} للمستلم و${data.caps.institutionDaily} للمؤسسة · إعادة المحاولة: ${data.retryScheduleMin.join('، ')} دقيقة`}
      actions={
        <span className={data.configured ? 'pill on' : 'pill'}>
          {data.configured ? 'مضبوط' : 'غير مضبوط'}
        </span>
      }
    >
      <div className="stat-grid r350-e6-stats">
        <Metric label="أُرسل (٢٤ ساعة)" value={String(data.last24h.sent)} ok={data.last24h.sent >= 0} icon={CheckCircle2} />
        <Metric label="فشل (٢٤ ساعة)" value={String(data.last24h.failed)} ok={data.last24h.failed === 0} icon={XCircle} />
        <Metric label="في الانتظار" value={String(data.outboxTotals.queued)} ok={data.outboxTotals.queued < 50} icon={ListChecks} />
        <Metric label="محجوب" value={String(data.suppressionTotal)} ok={data.suppressionTotal < 50} icon={ShieldAlert} />
      </div>
      {data.lastSentAt && (
        <p className="r350-e6-note">
          آخر إرسال ناجح: <time dateTime={data.lastSentAt}>{formatDate(data.lastSentAt)}</time>
          {data.lastSentTemplate ? <> — القالب <code>{data.lastSentTemplate}</code></> : null}
        </p>
      )}
      {!data.configured && (
        <p className="r350-e6-note">
          لتشغيل الإرسال الفعلي: اضبط <code>MAIL_PROVIDER</code> و<code>MAIL_API_KEY</code> و<code>MAIL_FROM</code> من إعدادات الخدمة — الدليل الكامل في <code>MAIL-SETUP-AR.md</code>. توثيق النطاق لدى المزوّد خطوة تخصّ المالك.
        </p>
      )}
    </Card>
  );
}

function Metric({ label, value, ok, icon: Icon }: { label: string; value: string; ok: boolean; icon: LucideIcon }) {
  return (
    <div className="metric-cell" aria-label={`${label}: ${value}`}>
      <span className={ok ? 'metric-ok' : 'metric-warn'}>
        <Icon aria-hidden />
        <bdi>{value}</bdi>
      </span>
      <span className="metric-label">{label}</span>
    </div>
  );
}

function DeliveryLogCard() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const { data, isPending, isError, error, refetch } = useMailOutbox({ page, status: status || undefined });
  const meta = useMailOutboxMeta({ page, status: status || undefined });
  const retry = useMailRetry();
  const cancel = useMailCancel();

  return (
    <Card
      title="سجلّ التسليم"
      icon={Mail}
      subtitle="كل رسالة عبر صندوق الصادر: الحالة، المحاولات، معرّف المزوّد، وأزرار إعادة الإرسال/الإلغاء."
      actions={
        <div className="filter-bar" role="group" aria-label="تصفية حسب الحالة">
          {OUTBOX_STATUSES.map((s) => (
            <button
              key={s || 'all'}
              type="button"
              className={`pill${status === s ? ' on' : ''}`}
              aria-pressed={status === s}
              onClick={() => {
                setPage(1);
                setStatus(s);
              }}
            >
              {s === '' ? 'الكل' : (STATUS_LABEL_AR[s] ?? s)}
            </button>
          ))}
        </div>
      }
    >
      {isPending ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="لا رسائل بعد"
          description="لم يُرسِل النظام أي بريد حتى الآن — الرسائل تظهر هنا لحظة دخولها صندوق الصادر."
        />
      ) : (
        <div className="table-wrap">
          <table className="table tbl-stack ws-table">
            <thead>
              <tr>
                <th scope="col">الموضوع</th>
                <th scope="col">إلى</th>
                <th scope="col">القالب</th>
                <th scope="col">الحالة</th>
                <th scope="col">المحاولات</th>
                <th scope="col">تاريخ الإنشاء</th>
                <th scope="col">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td data-label="الموضوع">
                    <span className="mail-subject">{row.subject}</span>
                    {row.providerId && (
                      <a
                        className="mail-provider-id"
                        href={`https://resend.com/emails/${encodeURIComponent(row.providerId)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <bdi>{row.providerId}</bdi>
                      </a>
                    )}
                  </td>
                  <td data-label="إلى">
                    <bdi>{row.to}</bdi>
                  </td>
                  <td data-label="القالب">
                    <code>{row.template}</code>
                  </td>
                  <td data-label="الحالة">
                    <StatusPill status={row.status} />
                    {row.lastError && <span className="mail-error">{row.lastError}</span>}
                  </td>
                  <td data-label="المحاولات" className="font-mono admin-table-num">
                    <bdi>{row.attempts}</bdi>
                  </td>
                  <td data-label="تاريخ الإنشاء">
                    <time dateTime={row.createdAt}>{formatDate(row.createdAt)}</time>
                  </td>
                  <td data-label="إجراء">
                    <span className="r350-e6-actions">
                      {row.status === 'failed' && (
                        <button
                          type="button"
                          className="btn accent sm"
                          onClick={() =>
                            retry.mutate(row.id, {
                              onSuccess: () => toast.success('أُعيد الصف إلى قائمة الانتظار.', { title: 'إعادة إرسال' }),
                              onError: (err) => toast.error(apiErrorMessage(err, 'تعذّرت إعادة الإرسال.'), { title: 'فشل' }),
                            })
                          }
                        >
                          <RefreshCw aria-hidden /> إعادة إرسال
                        </button>
                      )}
                      {(row.status === 'queued' || row.status === 'sending') && (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() =>
                            cancel.mutate(row.id, {
                              onSuccess: () => toast.success('أُلغي إرسال الصف.', { title: 'إلغاء' }),
                              onError: (err) => toast.error(apiErrorMessage(err, 'تعذّر الإلغاء.'), { title: 'فشل' }),
                            })
                          }
                        >
                          <XCircle aria-hidden /> إلغاء
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta.data && meta.data.totalPages > 1 && (
            <TablePaginationFooter
              page={meta.data.page}
              totalPages={meta.data.totalPages}
              total={meta.data.total}
              unit={OUTBOX_ROW_UNIT}
              onPage={setPage}
            />
          )}
        </div>
      )}
    </Card>
  );
}

function SuppressionCard() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useMailSuppression(page);
  const meta = useMailOutboxMeta({ page, enabled: false }); // placeholder to satisfy meta type; real suppression meta derives from data length
  const unsuppress = useMailUnsuppress();
  void meta;
  return (
    <Card
      title="قائمة الحجب"
      icon={MailX}
      subtitle="العناوين التي ارتدّت أو اشتكت أو ألغت الاشتراك — لن يُرسَل إليها مجددًا ما دامت هنا."
    >
      {isPending ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={MailX} title="لا محجوبين" description="لا عناوين محجوبة — كل الرسائل تصل مَن تصلهم." />
      ) : (
        <ul className="r350-e6-suppression">
          {data.map((row) => (
            <li key={row.id}>
              <span className="suppression-mail">
                <bdi>{row.email}</bdi>
              </span>
              <span className={`pill${row.type === 'unsubscribe' ? '' : ' danger'}`}>
                {SUPPRESSION_TYPE_AR[row.type] ?? row.type}
              </span>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() =>
                  unsuppress.mutate(row.id, {
                    onSuccess: () => toast.success('أُزيل العنوان من قائمة الحجب.', { title: 'إزالة الحجب' }),
                    onError: (err) => toast.error(apiErrorMessage(err, 'تعذّرت الإزالة.'), { title: 'فشل' }),
                  })
                }
              >
                إزالة الحجب
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && data.length > 0 && (
        <TablePaginationFooter
          page={page}
          totalPages={Math.max(1, Math.ceil(data.length / 20) + page - 1)}
          total={data.length}
          unit={SUPPRESSION_ROW_UNIT}
          onPage={setPage}
        />
      )}
    </Card>
  );
}

function TestSendCard() {
  const [to, setTo] = useState('');
  const send = useMailTestSend();
  const templates = useMailTemplates();
  return (
    <Card
      title="إرسال رسالة اختبار"
      icon={Send}
      subtitle="إرسال حقيقي عبر المزوّد المضبوط إلى عنوان تختاره — أثبتِ التوصيل بنفسك."
    >
      <form
        className="r350-e6-testsend"
        onSubmit={(e) => {
          e.preventDefault();
          if (!to) return;
          send.mutate(to, {
            onSuccess: () => toast.success('انضمت رسالة الاختبار إلى صندوق الصادر — تُسلَّم مع الدفعة القادمة.', { title: 'أُرسلت' }),
            onError: (err) => toast.error(apiErrorMessage(err, 'تعذّر الانضمام إلى صندوق الصادر — الحد اليومي ممتلئ أو الإرسال غير مضبوط.'), { title: 'فشل' }),
          });
        }}
      >
        <label className="field">
          <span className="field-label">عنوان الوصول</span>
          <input
            type="email"
            dir="ltr"
            required
            value={to}
            placeholder="name@example.ly"
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button type="submit" className="btn accent" disabled={send.isPending || !to}>
          <Send aria-hidden /> إرسال
        </button>
      </form>
      {templates.data && templates.data.templates.length > 0 && (
        <p className="r350-e6-note">
          قوالب جاهزة للمعاينة: {templates.data.templates.map((t) => (
            <code key={t}>{t}</code>
          ))}
        </p>
      )}
    </Card>
  );
}
