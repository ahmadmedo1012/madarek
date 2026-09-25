import {
  Wallet, Receipt, Building2, Phone, Mail, Clock, ArrowLeft, Info, CheckCircle2,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/primitives';
import { Skeleton } from '../../components/primitives/States';
import { Reveal } from '../../components/motion';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useMyProfile } from '../../hooks/useResources';
import { toast } from '../../lib/toast';

/**
 * Honest financial-affairs landing.
 *
 * The platform's data model has no Fee / Payment / Invoice entities (the
 * backend exposes no fee endpoints), and the university does not publish
 * fee amounts for local students — so this page deliberately renders no
 * card / checkout form and no figures: a fake money path would mislead
 * students about what they owe. The money-path quality pass therefore
 * targets honest identity states (loading / error + retry), bidi-isolated
 * contact runs, tabular numerals, and a clear "what to do today" path.
 */
export default function PaymentPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useMyProfile();
  const fullName = user ? `${user.firstName} ${user.lastName}` : '—';
  const universityId = profile.data?.student?.universityId ?? null;
  const facultyName = profile.data?.student?.faculty?.name ?? null;

  // There is deliberately no checkout flow to confirm (see docblock) —
  // the page's one action needing success feedback is a retry that
  // recovers the student's data after a failed load.
  const hadLoadError = useRef(false);
  useEffect(() => {
    if (profile.isError) hadLoadError.current = true;
    else if (profile.isSuccess && hadLoadError.current) {
      hadLoadError.current = false;
      toast.success('تم تحميل بياناتك الدراسية من الخادم.', { title: 'تمّ التحديث' });
    }
  }, [profile.isError, profile.isSuccess]);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الشؤون الماليّة</h1>
          <p className="page-subtitle">حالة رسومك الجامعيّة وكيفيّة سدادها.</p>
        </div>
      </header>

      <Card title="بياناتك" icon={Wallet}>
        <div className="grid-3" style={{ gap: 'var(--sp-3)' }}>
          <FactRow label="الاسم" value={fullName} />
          <FactRow label="الرقم الجامعيّ" value={universityId} mono pending={profile.isPending} />
          <FactRow label="الكلّيّة" value={facultyName} pending={profile.isPending} />
        </div>
        {profile.isError && (
          <div className="fact-error" role="status">
            <Icon icon={Info} size={13} />
            <span>تعذّر تحميل بياناتك الدراسية من الخادم.</span>
            <button type="button" className="btn ghost sm" onClick={() => profile.refetch()}>
              إعادة المحاولة
            </button>
          </div>
        )}
      </Card>

      {/* The page's one authored moment: the fees-status card lifts in
          once (small distance) — money-path restraint, no confetti. */}
      <Reveal distance="small">
        <Card title="حالة الرسوم" icon={Receipt}>
          <div className="payment-panel">
            <p className="text-sm text-muted" style={{ margin: 0, lineHeight: 'var(--lh-loose)' }}>
              تكامل الدفع الإلكترونيّ مع نظام الخزينة الجامعيّة قيد التطوير، والمنصّة لا تعرض
              أيّ مبالغ تقديريّة. رصيدك الفعليّ وسجلّ سدادك مصدرهما مكتب الشؤون الماليّة —
              حتّى ذلك الحين، خُطواتك اليوم:
            </p>
            <ul className="payment-checklist">
              <li>
                <Icon icon={CheckCircle2} size={14} aria-hidden />
                <span>راجع مكتب الشؤون الماليّة في كلّيّتك أو تواصل معه عبر القنوات أدناه.</span>
              </li>
              <li>
                <Icon icon={CheckCircle2} size={14} aria-hidden />
                <span>أحضر رقمك الجامعيّ أو بطاقتك الجامعيّة عند المراجعة أو السداد.</span>
              </li>
              <li>
                <Icon icon={CheckCircle2} size={14} aria-hidden />
                <span>مواعيد الرسوم وإعلانات الإدارة الماليّة تُنشر على لوحة المجتمع الجامعيّ.</span>
              </li>
            </ul>
          </div>
        </Card>
      </Reveal>

      <div className="grid-2">
        <Card title="مكتب الشؤون الماليّة بالجامعة" icon={Building2}>
          <div className="flex-col gap-3">
            <ContactRow icon={Phone} label="الهاتف" value="+218 23 762659" mono />
            <ContactRow icon={Phone} label="هاتف بديل" value="+218 23 762882" mono />
            <ContactRow icon={Mail} label="البريد الإلكترونيّ" value="info@zu.edu.ly" mono />
            <ContactRow icon={Building2} label="العنوان" value="جامعة الزاوية — الزاوية، ليبيا" />
          </div>
        </Card>

        <Card title="ساعات العمل" icon={Clock}>
          <div className="flex-col gap-2">
            <div className="list-row">
              <div className="list-row-body">
                <div className="list-row-title">الأحد إلى الخميس</div>
                <div className="list-row-sub">من 9:00 صباحاً حتى 2:00 مساءً</div>
              </div>
            </div>
            <div className="list-row">
              <div className="list-row-body">
                <div className="list-row-title">الجمعة والسبت</div>
                <div className="list-row-sub">إجازة أسبوعيّة</div>
              </div>
            </div>
          </div>
          <p className="text-xxs text-subtle" style={{ marginBlockStart: 'var(--sp-3)', lineHeight: 1.6 }}>
            الساعات المعتمدة من الإدارة. قد تتغيّر خلال فترات الاختبارات والإجازات الرسميّة.
          </p>
        </Card>
      </div>

      <Card title="إعلانات الإدارة الماليّة">
        <p className="text-sm text-muted" style={{ padding: 'var(--sp-3) 0' }}>
          الإعلانات الرسميّة الخاصّة بالرسوم والمواعيد تُنشر على لوحة المجتمع الجامعيّ.
        </p>
        <Link to="/community" className="btn primary sm">
          <Icon icon={ArrowLeft} size={13} />
          فتح المجتمع الجامعيّ
        </Link>
      </Card>
    </div>
  );
}

function FactRow({
  label, value, mono, pending,
}: { label: string; value: string | null; mono?: boolean; pending?: boolean }) {
  return (
    <div className="fact-row">
      <span className="text-xxs text-subtle">{label}</span>
      {pending ? (
        <Skeleton width="62%" height={14} />
      ) : value === null ? (
        <span className="text-sm" title="غير متوفّر حاليّاً">—</span>
      ) : mono ? (
        <bdi dir="ltr" className="font-mono text-sm">{value}</bdi>
      ) : (
        <span className="text-sm" title={value}>{value}</span>
      )}
    </div>
  );
}

function ContactRow({ icon, label, value, mono }: {
  icon: typeof Building2; label: string; value: string; mono?: boolean;
}) {
  return (
    <div className="list-row">
      <div className="metric-icon" style={{ color: 'var(--accent)' }}>
        <Icon icon={icon} size={16} />
      </div>
      <div className="list-row-body">
        <div className="list-row-title">{label}</div>
        <div className="list-row-sub">
          {mono ? <bdi dir="ltr" className="font-mono">{value}</bdi> : value}
        </div>
      </div>
    </div>
  );
}
