import { Link } from 'react-router-dom';
import { Bell, Languages, LifeBuoy, MonitorSmartphone, Moon, Palette } from 'lucide-react';
import { Card } from '../components/primitives';
import { Icon } from '../components/Icon';
import { PageFrame, PageHeader } from '../components/patterns';
import { SectionBar, EmptyCell } from '../components/student';
import { ChangePasswordCard } from '../components/account/ChangePasswordCard';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { useMe } from '../hooks/useAuth';
import { useAuthStore } from '../stores/auth.store';
import { roleLabel } from '../lib/roleLabels';
import { usePageTitle } from '../hooks/usePageTitle';
/* The §B2 kit sheet (SectionBar + EmptyCell registers — global inside
 * @layer pages) + this page's own row/note family. */
import '../styles/r319-student.css';
import '../styles/r320-settings.css';

/**
 * SettingsPage — the ANY-AUTHED account-settings sheet (R320 cycle-3,
 * PAGES-GAP P2-1 + P2-2).
 *
 * The gap this closes (PAGES-GAP T-1/T-2): change-password existed ONLY
 * in the student profile — the API serves every role, and teachers had
 * NO change-password UI at all; language/numerals/notification prefs/
 * sessions/data-export had NO page anywhere; /admin/settings is the
 * ADMIN platform sheet (re-titled «إعدادات المنصّة»), not user
 * settings. THIS page is the one settings door every role shares,
 * mounted like /vision (ProtectedRoute + AppShell, no role allow).
 *
 * Honesty rules (the §D discipline): a seat that does not exist yet
 * renders as an honest «قريبًا» EmptyCell — never a fake toggle that
 * implies server state. What WORKS today and is wired here: theme
 * (the theme store + /me profile sync), change-password (the r180-F4
 * route), and the honest account facts from /auth/me.
 */
export default function SettingsPage() {
  usePageTitle('إعدادات الحساب');
  const { data: me } = useMe();
  const role = useAuthStore((s) => s.user?.role);

  const institution = me?.currentInstitution?.name;
  const displayName = me ? `${me.firstName} ${me.lastName}`.trim() : null;

  return (
    <PageFrame width="default">
      <PageHeader
        title="إعدادات الحساب"
        description="مظهرك وكلمة مرورك ومقاعد حسابك — في ورقة واحدة لكل الأدوار."
        eyebrow="الحساب"
      />

      {/* ── [01] المظهر ─────────────────────────────────────────── */}
      <section>
        <SectionBar index="01" title="المظهر" />
        <p className="set-note">
          اختيارك يُطبَّق فورًا على هذا الجهاز ويُحفظ في ملفك الشخصي، فتجده كما هو على أجهزتك الأخرى.
        </p>
        <Card>
          <div className="set-row">
            <div className="set-row-main">
              <Icon icon={Palette} size={16} aria-hidden />
              <div>
                <div className="set-row-title">السمة</div>
                <div className="set-row-note">فاتح · داكن · تلقائي (يتبع نظام جهازك)</div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </Card>
      </section>

      {/* ── [02] تغيير كلمة المرور ──────────────────────────────── */}
      <section>
        <SectionBar index="02" title="تغيير كلمة المرور" />
        <p className="set-note">
          متاح لكل الأدوار. عند التغيير تُنهى جلساتك على بقية الأجهزة، وتبقى جلستك الحالية مفتوحة.
        </p>
        <ChangePasswordCard />
      </section>

      {/* ── [03] معلومات الحساب والتحقق ─────────────────────────── */}
      <section>
        <SectionBar index="03" title="معلومات الحساب والتحقق" />
        <p className="set-note">كما تقرؤها الخدمة الآن — لا حاجة لتخمين ما هو محفوظ.</p>
        <Card>
          <div className="set-row">
            <div className="set-row-main">
              <Icon icon={MonitorSmartphone} size={16} aria-hidden />
              <div>
                <div className="set-row-title">الاسم المعروض</div>
                <div className="set-row-note">{displayName ?? '—'}</div>
              </div>
            </div>
          </div>
          <div className="set-row">
            <div className="set-row-main">
              <Icon icon={Languages} size={16} aria-hidden />
              <div>
                <div className="set-row-title">البريد الإلكتروني</div>
                <div className="set-row-note">
                  {me?.email ? <bdi dir="ltr" className="font-mono">{me.email}</bdi> : '—'}
                </div>
              </div>
            </div>
          </div>
          <div className="set-row">
            <div className="set-row-main">
              <Icon icon={Moon} size={16} aria-hidden />
              <div>
                <div className="set-row-title">الدور</div>
                <div className="set-row-note">{role ? roleLabel(role) : '—'}</div>
              </div>
            </div>
          </div>
          {institution && (
            <div className="set-row">
              <div className="set-row-main">
                <Icon icon={LifeBuoy} size={16} aria-hidden />
                <div>
                  <div className="set-row-title">المؤسسة الحالية</div>
                  <div className="set-row-note">{institution}</div>
                </div>
              </div>
            </div>
          )}
        </Card>
        <p className="set-note">
          التحقق بالبريد قيد الإطلاق — حسابات العرض التجريبية تُنشأ ببريد مؤكَّد في نموذج البيانات،
          ولا توجد بعدُ رسائل تحقق تُرسَل للمستخدمين الجدد.
        </p>
      </section>

      {/* ── [04] الإشعارات (مقعد صادق) ──────────────────────────── */}
      <section>
        <SectionBar index="04" title="الإشعارات" />
        <p className="set-note">تفضيلات الإشعارات (البريد داخل المنصة وغيرها) غير متاحة بعد.</p>
        <EmptyCell
          label="قريبًا"
          note={
            <>
              تنبيهات داخل التطبيق تصلك كما هي اليوم عبر أيقونة الجرس؛ مفاتيح التفضيل لكل نوع
              تحتاج أعمدةً في الخدمة لم تُبنَ بعد — ستُفتح هنا أول ما تصل.
            </>
          }
        />
      </section>

      {/* ── [05] اللغة والأرقام (مقعد صادق) ─────────────────────── */}
      <section>
        <SectionBar index="05" title="اللغة والأرقام" />
        <p className="set-note">مدارك عربية-أولًا بلغة واحدة اليوم؛ مقعد اللغة محجوز.</p>
        <EmptyCell
          label="العربية (الوحيدة حاليًا)"
          note="واجهة واحدة عربية RTL بترقيم موحّد؛ إضافة لغات أو نظام أرقام بديل قرار إطلاقٍ لاحق — سيجلس هنا."
        />
      </section>

      {/* ── [06] الجلسات والأجهزة (مقعد صادق) ───────────────────── */}
      <section>
        <SectionBar index="06" title="الجلسات والأجهزة" />
        <p className="set-note">قائمة الأجهزة النشطة غير متاحة بعد — وسيلة إنهائها الفعّالة متاحة الآن.</p>
        <EmptyCell
          label="قريبًا"
          note={
            <>
              لا توجد واجهة لعرض الجلسات بعد. اليوم: تغيير كلمة المرور (القسم [02]) يُنهي جلسات
              بقية الأجهزة فورًا ويُبقي جلستك الحالية — نفس النتيجة من زاوية الأمان.
            </>
          }
        />
      </section>

      {/* ── [07] بياناتي (مقعد صادق + قناة) ─────────────────────── */}
      <section>
        <SectionBar index="07" title="بياناتي" />
        <p className="set-note">لا يوجد تصدير ذاتي أو حذف ذاتي بعد — الطلب يصل عبر قناة التواصل.</p>
        <EmptyCell
          label="عبر الطلب"
          note={
            <>
              لطلب نسخة من بياناتك أو حذف حسابك، استخدم <Link to="/contact">صفحة التواصل</Link> —
              الطلبات تُنفيذ يدويًا من فريق المنصة في هذه المرحلة التجريبية. ما نجمعه ولماذا موثّق في{' '}
              <Link to="/legal/privacy">سياسة الخصوصية</Link>.
            </>
          }
          action={<Link to="/contact" className="btn lg"><Icon icon={Bell} size={16} />فتح قناة التواصل</Link>}
        />
      </section>
    </PageFrame>
  );
}
