import {
  Wallet, Receipt, Building2, Phone, Mail, Clock, ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useMyProfile } from '../../hooks/useResources';

/**
 * Honest financial-affairs landing.
 *
 * The platform's data model does not yet have Fee / Payment / Invoice
 * entities. Rendering invented amounts and a fake checkout modal would
 * mislead students about what they owe and pretend the platform processes
 * payments. So this page surfaces real student identity + a clear pointer
 * to the bursary, without inventing financial figures.
 */
export default function PaymentPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useMyProfile();
  const fullName = user ? `${user.firstName} ${user.lastName}` : '—';
  const universityId = profile.data?.student?.universityId ?? null;
  const facultyName = profile.data?.student?.faculty?.name ?? null;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الشؤون الماليّة</h1>
          <p className="page-subtitle">حالة رسومك الجامعيّة وكيفيّة سدادها.</p>
        </div>
      </div>

      <Card title="بياناتك" icon={Wallet}>
        <div className="grid-3" style={{ gap: 'var(--sp-3)' }}>
          <FactRow label="الاسم" value={fullName} />
          <FactRow label="الرقم الجامعيّ" value={universityId ?? '—'} mono />
          <FactRow label="الكلّيّة" value={facultyName ?? '—'} />
        </div>
      </Card>

      <Card title="حالة الرسوم" icon={Receipt}>
        <div style={{
          padding: 'var(--sp-4)',
          background: 'var(--surface-2)',
          borderRadius: 'var(--r-md)',
          lineHeight: 1.7,
        }}>
          <p className="text-sm text-muted" style={{ margin: 0 }}>
            تكامل الدفع الإلكترونيّ مع نظام الخزينة الجامعيّة قيد التطوير. حتى ذلك الحين،
            للاطّلاع على رصيدك الفعليّ وسداد الرسوم المستحقّة، تواصل مع مكتب الشؤون
            الماليّة في كلّيّتك أو عبر القنوات أدناه.
          </p>
        </div>
      </Card>

      <div className="grid-2">
        <Card title="مكتب الشؤون الماليّة بالجامعة" icon={Building2}>
          <div className="flex-col gap-3">
            <ContactRow icon={Phone} label="الهاتف" value="+218 23 762659" mono />
            <ContactRow icon={Phone} label="هاتف بديل" value="+218 23 762882" mono />
            <ContactRow icon={Mail} label="البريد الإلكترونيّ" value="info@zu.edu.ly" mono />
            <ContactRow
              icon={Building2}
              label="العنوان"
              value="جامعة الزاوية — الزاوية، ليبيا"
            />
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
            الساعات المعتمدة من الإدارة. قد تتغيّر خلال فترات الامتحانات والإجازات الرسميّة.
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

function FactRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      padding: 'var(--sp-3)',
      background: 'var(--surface-2)',
      borderRadius: 'var(--r-md)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span className="text-xxs text-subtle">{label}</span>
      <span className={mono ? 'font-mono text-sm' : 'text-sm'}>{value}</span>
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
        <div className={mono ? 'list-row-sub font-mono' : 'list-row-sub'}>{value}</div>
      </div>
    </div>
  );
}
