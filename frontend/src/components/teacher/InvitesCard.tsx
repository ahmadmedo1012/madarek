/**
 * InviteCodesCard — r323 B3.1 — the teacher/registrar generation seat.
 *
 * «كيف يدخل 100 طالب بغير أن أكتبهم؟»: pick the scope (the caller's
 * selected offering), pick the life (7/14/30 days) + the cap, mint the
 * 8-char code, copy it, watch the usage counter, revoke when done. The
 * register page consumes the code (single flow, one truth).
 */
import { useMemo, useState } from 'react';
import { Check, Copy, Link2, Plus, Trash2 } from 'lucide-react';
import { Card } from '../primitives';
import { EmptyState } from '../primitives/States';
import { Icon } from '../Icon';
import { useCreateInvite, useInvites, useRevokeInvite, type InviteRow } from '../../hooks/resources/invites';
import { apiErrorMessage } from '../../hooks/useResources';
import { formatDate } from '../../utils/numbers';

function scopeLabel(inv: InviteRow): string {
  if (inv.offering) return `مقرر ${inv.offering.course.code} — ${inv.offering.course.name}`;
  if (inv.department) return `قسم ${inv.department.name}`;
  if (inv.faculty) return `كلية ${inv.faculty.name}`;
  return 'بلا هدف';
}

export function InviteCodesCard({ offeringId }: { offeringId?: string | null }) {
  const invitesQ = useInvites();
  const create = useCreateInvite();
  const revoke = useRevokeInvite();
  const [days, setDays] = useState(14);
  const [maxUses, setMaxUses] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const scoped = useMemo(
    () => (invitesQ.data ?? []).filter((i) => (offeringId ? i.offeringId === offeringId : true)),
    [invitesQ.data, offeringId],
  );

  const mint = () => {
    if (!offeringId) { setError('اختر المقرّر أولًا.'); return; }
    setError(null);
    create.mutate(
      { role: 'STUDENT', offeringId, expiresInDays: days, maxUses },
      {
        onSuccess: (inv) => {
          void navigator.clipboard?.writeText(inv.code).catch(() => {});
          setCopied(inv.id);
          setTimeout(() => setCopied(null), 2500);
        },
        onError: (e) => setError(apiErrorMessage(e, 'تعذّر توليد الكود — أعد المحاولة')),
      },
    );
  };

  return (
    <Card title="أكواد الدعوة" subtitle="كود واحد يُسجّل الطلاب في هذا المقرّر ذاتيًا — صلاحية محدودة وعدد محدود.">
      <div className="inv-form">
        <label className="inv-field">
          <span>الصلاحية</span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="مدة الصلاحية">
            <option value={7}>7 أيام</option>
            <option value={14}>14 يومًا</option>
            <option value={30}>30 يومًا</option>
          </select>
        </label>
        <label className="inv-field">
          <span>أقصى عدد</span>
          <input
            type="number"
            min={1}
            max={500}
            value={maxUses}
            onChange={(e) => setMaxUses(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
            aria-label="أقصى عدد للاستخدام"
          />
        </label>
        <button type="button" className="btn primary sm" onClick={mint} disabled={create.isPending}>
          <Icon icon={Plus} size={13} /> {create.isPending ? 'جارٍ التوليد…' : 'ولّد كودًا'}
        </button>
      </div>
      {error && <p className="inv-error" role="alert">{error}</p>}

      {invitesQ.isPending ? (
        <p className="inv-note">جارٍ تحميل الأكواد…</p>
      ) : scoped.length === 0 ? (
        <EmptyState
          title="لا أكواد لهذا المقرّر بعد"
          description="ولّد كودًا وشاركه مع طلابك — يسجّلون به أنفسهم في المقرّر مباشرة."
        />
      ) : (
        <div className="inv-list" role="list">
          {scoped.map((inv) => {
            const exhausted = inv.usedCount >= inv.maxUses;
            const expired = new Date(inv.expiresAt).getTime() < Date.now();
            return (
              <div key={inv.id} className="inv-row" role="listitem">
                <code className="inv-code" dir="ltr">{inv.code}</code>
                <span className="inv-meta">
                  {scopeLabel(inv)} · استُخدم {inv.usedCount}/{inv.maxUses} ·{' '}
                  {expired ? <b className="inv-dead">منتهي</b> : <>حتى {formatDate(inv.expiresAt, { day: 'numeric', month: 'short' })}</>}
                  {exhausted && !expired && <b className="inv-dead"> · مستنفد</b>}
                </span>
                <span className="inv-actions">
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => {
                      void navigator.clipboard?.writeText(inv.code).catch(() => {});
                      setCopied(inv.id);
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    aria-label={`انسخ الكود ${inv.code}`}
                  >
                    <Icon icon={copied === inv.id ? Check : Copy} size={13} />
                    {copied === inv.id ? 'نُسخ' : 'نسخ'}
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => revoke.mutate(inv.id)}
                    aria-label={`ألغِ الكود ${inv.code}`}
                  >
                    <Icon icon={Trash2} size={13} /> إلغاء
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p className="inv-note">
        <Icon icon={Link2} size={12} /> يُدخل الطلاب الكود في صفحة إنشاء الحساب — تُسجَّل تلقائيًا في المقرّر.
      </p>
    </Card>
  );
}
