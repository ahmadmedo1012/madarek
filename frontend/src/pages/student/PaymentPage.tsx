import { useState } from 'react';
import {
  Wallet, Receipt, CheckCircle2, Calendar, ChevronLeft,
  Download, X, CreditCard,
} from 'lucide-react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { Icon } from '../../components/Icon';

const FEES = [
  { label: 'رسوم التسجيل · فصل 2026 ربيع', amount: 850, paid: true, date: '8 فبراير 2026' },
  { label: 'رسوم خدمات أكاديمية', amount: 120, paid: true, date: '8 فبراير 2026' },
  { label: 'رسوم استعارة المكتبة', amount: 30, paid: true, date: '15 فبراير 2026' },
  { label: 'رسوم بطاقة الطالب', amount: 25, paid: true, date: '8 فبراير 2026' },
  { label: 'رسوم التسجيل · فصل 2025 ربيع', amount: 850, paid: false, date: 'تستحق 15 يناير' },
  { label: 'رسوم المعامل العملية', amount: 180, paid: false, date: 'تستحق 25 يناير' },
];

export default function PaymentPage() {
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const outstanding = FEES.filter((f) => !f.paid).reduce((s, f) => s + f.amount, 0);
  const paid = FEES.filter((f) => f.paid).reduce((s, f) => s + f.amount, 0);
  const total = outstanding + paid;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الشؤون المالية</h1>
          <p className="page-subtitle">رسومك الجامعية، الإيصالات، وعمليات الدفع.</p>
        </div>
        {outstanding > 0 && (
          <button type="button" className="btn primary" onClick={() => setShowCheckout(true)}>
            <Icon icon={CreditCard} size={14} />
            دفع الرسوم المستحقة
          </button>
        )}
      </div>

      <div className="grid-3">
        <MetricCard icon={Wallet} label="المتبقي للسداد" value={`${outstanding} ل.د`} color="red" />
        <MetricCard icon={CheckCircle2} label="المدفوع هذا العام" value={`${paid} ل.د`} color="green" />
        <MetricCard icon={Receipt} label="إجمالي رسوم العام" value={`${total} ل.د`} color="brand" />
      </div>

      <Card title="فاتورة الفصل الحالي" icon={Receipt}>
        <div className="invoice-card">
          <div>
            <div className="invoice-section-label">من</div>
            <div className="invoice-section-value">جامعة مدارك</div>
            <div className="text-xs text-subtle" style={{ marginTop: 4 }}>مدارك، ليبيا · 1988</div>
          </div>
          <div>
            <div className="invoice-section-label">إلى</div>
            <div className="invoice-section-value">أحمد الزروق</div>
            <div className="text-xs text-subtle font-mono" style={{ marginTop: 4 }}>UZ-2024-00001</div>
          </div>
          <div className="invoice-total">
            <div>
              <div className="invoice-section-label">المبلغ المستحق</div>
              <div className="text-xs text-subtle">يستحق قبل 25 يناير 2025</div>
            </div>
            <div className="invoice-total-num">{outstanding} ل.د</div>
          </div>
        </div>
      </Card>

      <Card title="جميع المعاملات" icon={Receipt}>
        <div className="flex-col">
          {FEES.map((f, i) => (
            <div className="list-row" key={i}>
              <div className="metric-icon" style={{ color: f.paid ? 'var(--success)' : 'var(--warning)' }}>
                <Icon icon={f.paid ? CheckCircle2 : Calendar} size={16} />
              </div>
              <div className="list-row-body">
                <div className="list-row-title">{f.label}</div>
                <div className="list-row-sub">{f.date}</div>
              </div>
              <div className="fee-amount font-mono">{f.amount} ل.د</div>
              {f.paid ? (
                <button type="button" className="btn ghost sm">
                  <Icon icon={Download} size={13} /> الإيصال
                </button>
              ) : (
                <Badge color="amber">مستحق</Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Checkout modal */}
      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">إتمام الدفع</div>
              <button type="button" className="icon-btn" onClick={() => setShowCheckout(false)}>
                <Icon icon={X} size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{
                padding: 'var(--sp-4)',
                background: 'var(--surface-2)',
                borderRadius: 'var(--r-md)',
                marginBottom: 'var(--sp-4)',
              }}>
                <div className="invoice-section-label">المبلغ الإجمالي</div>
                <div className="invoice-total-num">{outstanding} ل.د</div>
              </div>
              <div className="auth-field">
                <label>طريقة الدفع</label>
                <select className="input">
                  <option>بطاقة مصرفية (Visa / Mastercard)</option>
                  <option>تحويل بنكي</option>
                  <option>الدفع في خزينة الجامعة</option>
                </select>
              </div>
              <div className="auth-row">
                <div className="auth-field">
                  <label>رقم البطاقة</label>
                  <input className="input" type="text" placeholder="•••• •••• •••• ••••" />
                </div>
                <div className="auth-field">
                  <label>تاريخ الانتهاء</label>
                  <input className="input" type="text" placeholder="MM/YY" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn ghost" onClick={() => setShowCheckout(false)}>إلغاء</button>
              <button type="button" className="btn primary" onClick={() => {
                setShowCheckout(false);
                setShowSuccess(true);
              }}>
                <Icon icon={CreditCard} size={14} />
                تأكيد الدفع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success modal */}
      {showSuccess && (
        <div className="modal-overlay" onClick={() => setShowSuccess(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-body" style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--success-soft)', color: 'var(--success)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 'var(--sp-4)',
              }}>
                <Icon icon={CheckCircle2} size={32} />
              </div>
              <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>تم الدفع بنجاح</div>
              <div className="text-sm text-muted" style={{ marginTop: 'var(--sp-2)', maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
                سيتم إرسال إيصال الدفع إلى بريدك الجامعي خلال دقائق.
              </div>
              <div className="font-mono text-xxs text-subtle" style={{ marginTop: 'var(--sp-3)' }}>
                رقم المعاملة: TX-{Math.random().toString(36).substring(2, 10).toUpperCase()}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn primary" onClick={() => setShowSuccess(false)}>
                إغلاق
                <Icon icon={ChevronLeft} size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
