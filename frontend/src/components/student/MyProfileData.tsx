import { useMemo, useState } from 'react';
import {
  User, Phone, ShieldCheck, MapPin, Calendar, GraduationCap,
  Users, FileText, Lock, Eye, EyeOff, Check, Pencil, X, AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge } from '../primitives';
import { EmptyCell, SectionBar } from './index';
import { Icon } from '../Icon';
import { useMyProfile } from '../../hooks/useResources';
import { usePatchMyProfile, type StudentProfileView, type CustomFieldValue, type PatchMyProfileInput } from '../../hooks/resources/people';
import { checkLibyanPhone, foldDigits } from '../../lib/phone-validation';

/**
 * r349-P3 — «بياناتي واتصالي»: the student's real file, six sections
 * (البيانات الشخصية · الاتصال · الأكاديمية · ولي الأمر · الوثائق ·
 * الأمان) over the privacy-shaped self view from GET /me/profile.
 *
 * Editability follows the two-lane rule (PRIVACY-MATRIX §4): the self
 * lane edits CONTACT & PREFERENCES only (nameEn/DOB/gender/city/
 * address/phones/visibility); the documentary identity (الاسم الرباعي،
 * الرقم الوطني، الميلاد-المكان) and the academic record are read-only
 * here — the registrar lane (PATCH /people/:id) owns them.
 */

type EditField =
  | 'nameEn' | 'dateOfBirth' | 'gender' | 'city' | 'address'
  | 'studentPhone' | 'additionalPhone'
  | 'emergencyContactName' | 'emergencyContactPhone';

const GENDER_LABELS: Record<string, string> = {
  MALE: 'ذكر', FEMALE: 'أنثى', UNSPECIFIED: 'غير محدد',
};

const STUDY_TYPE_LABELS: Record<string, string> = {
  MORNING: 'صباحي', EVENING: 'مسائي', PARALLEL: 'موازي',
};

const ENROLLMENT_LABELS: Record<string, string> = {
  ACTIVE: 'مقيّد', SUSPENDED: 'موقوف', DEFERRED: 'مؤجّل',
  GRADUATED: 'متخرّج', WITHDRAWN: 'منسحب',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function MyProfileData() {
  const profile = useMyProfile();
  const patch = usePatchMyProfile();
  const view = profile.data?.student?.profile ?? null;
  const customFields = profile.data?.student?.customFields ?? [];

  const [editing, setEditing] = useState<EditField | null>(null);
  const [draft, setDraft] = useState('');
  const [revealError, setRevealError] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const phoneCheck = useMemo(
    () => (editing === 'studentPhone' || editing === 'emergencyContactPhone' || editing === 'additionalPhone'
      ? checkLibyanPhone(draft)
      : null),
    [editing, draft],
  );

  if (profile.isPending) {
    return (
      <section aria-label="بياناتي واتصالي" aria-busy="true">
        <SectionBar index="01" title="بياناتي واتصالي" />
        <Card><div className="r349p-skeleton-line" /><div className="r349p-skeleton-line r349p-skeleton-line--w70" /><div className="r349p-skeleton-line r349p-skeleton-line--w40" /></Card>
      </section>
    );
  }
  if (profile.isError || !view) {
    return (
      <section aria-label="بياناتي واتصالي">
        <SectionBar index="01" title="بياناتي واتصالي" />
        <EmptyCell label="لا يوجد ملف بيانات" note="بيانات الملف تُدار من مؤسستك — تواصل مع إدارة التسجيل إن كنت تتوقع ملفًا هنا." />
      </section>
    );
  }

  const startEdit = (field: EditField, current: string | null) => {
    setEditing(field);
    setDraft(current ?? '');
    setRevealError(false);
  };
  const cancelEdit = () => { setEditing(null); setDraft(''); setRevealError(false); };

  const saveEdit = () => {
    if (!editing) return;
    if (editing === 'studentPhone' || editing === 'emergencyContactPhone' || editing === 'additionalPhone') {
      if (draft.trim() !== '' && !phoneCheck?.ok) { setRevealError(true); return; }
    }
    const value = draft.trim() === '' ? null : draft.trim();
    const payload: PatchMyProfileInput = {};
    if (editing === 'nameEn') payload.nameEn = value;
    else if (editing === 'dateOfBirth') payload.dateOfBirth = value;
    else if (editing === 'gender') payload.gender = (value ?? undefined) as PatchMyProfileInput['gender'];
    else if (editing === 'city') payload.city = value;
    else if (editing === 'address') payload.address = value;
    else if (editing === 'studentPhone') payload.studentPhone = value;
    else if (editing === 'additionalPhone') payload.additionalPhone = value;
    else if (editing === 'emergencyContactName') payload.emergencyContactName = value;
    else if (editing === 'emergencyContactPhone') payload.emergencyContactPhone = value;
    patch.mutate(
      payload,
      {
        onSuccess: () => {
          const done = editing;
          setEditing(null); setDraft(''); setRevealError(false);
          setSavedAt(done);
          window.setTimeout(() => setSavedAt(null), 2500);
        },
      },
    );
  };

  const setVisibility = (visibility: 'INSTITUTION_STAFF' | 'PRIVATE') => {
    patch.mutate({ studentPhoneVisibility: visibility });
  };

  const saving = patch.isPending;
  const errorAr = patch.isError ? 'تعذّر الحفظ — أعد المحاولة' : null;
  const privatePhone = view.phoneVisibility === 'PRIVATE';

  return (
    <section aria-label="بياناتي واتصالي" className="r349p-data">
      {/* [01] البيانات الشخصية — documentary identity (read) + the
          self-editable demographics. */}
      <SectionBar index="01" title="البيانات الشخصية" />
      <Card>
        <div className="grid-2">
          <Tile label="الاسم كما في الوثائق" value={view.nameAr ?? '—'} icon={User} />
          <EditableTile
            label="الاسم (لاتيني)" value={view.nameEn ?? '—'} icon={User}
            editing={editing === 'nameEn'} draft={draft}
            onDraft={setDraft} onBegin={() => startEdit('nameEn', view.nameEn)}
            onCancel={cancelEdit} onSave={saveEdit} saving={saving}
            revealError={revealError} errorAr={null}
            saved={savedAt === 'nameEn'} inputDir="ltr"
          />
          <Tile label="اسم الأب" value={view.fatherName ?? '—'} icon={User} />
          <Tile label="اسم الجد" value={view.grandfatherName ?? '—'} icon={User} />
          <Tile label="اسم الأم" value={view.motherName ?? '—'} icon={User} />
          <Tile label="الرقم الوطني" value={view.nationalId.value ?? '—'} icon={Lock} mono />
          <EditableTile
            label="تاريخ الميلاد" value={fmtDate(view.dateOfBirth)} icon={Calendar}
            editing={editing === 'dateOfBirth'} draft={draft}
            onDraft={setDraft} onBegin={() => startEdit('dateOfBirth', view.dateOfBirth?.slice(0, 10) ?? '')}
            onCancel={cancelEdit} onSave={saveEdit} saving={saving}
            revealError={revealError} errorAr={null}
            saved={savedAt === 'dateOfBirth'} inputType="date"
          />
          <Tile label="مكان الميلاد" value={view.birthPlace ?? '—'} icon={MapPin} />
          <div className="fact-tile fact-tile--field">
            <Icon icon={User} size={16} className="text-subtle" aria-hidden />
            <div>
              <div className="text-xxs text-subtle">الجنس</div>
              <div className="text-sm" style={{ color: 'var(--text)', marginTop: 'var(--sp-0-5)' }}>
                {view.gender ? GENDER_LABELS[view.gender] ?? '—' : '—'}
              </div>
            </div>
          </div>
          <EditableTile
            label="المدينة (السكن)" value={view.city ?? '—'} icon={MapPin}
            editing={editing === 'city'} draft={draft}
            onDraft={setDraft} onBegin={() => startEdit('city', view.city)}
            onCancel={cancelEdit} onSave={saveEdit} saving={saving}
            revealError={revealError} errorAr={null}
            saved={savedAt === 'city'}
          />
          <EditableTile
            label="العنوان" value={view.address ?? '—'} icon={MapPin}
            editing={editing === 'address'} draft={draft}
            onDraft={setDraft} onBegin={() => startEdit('address', view.address)}
            onCancel={cancelEdit} onSave={saveEdit} saving={saving}
            revealError={revealError} errorAr={null}
            saved={savedAt === 'address'}
          />
        </div>
        <p className="r349p-note">
          الاسم الرباعي والرقم الوطني ومكان الميلاد يُدخلها المسجّل العام في مؤسستك —
          لتصحيحها راجعه.
        </p>
      </Card>

      {/* [02] الاتصال — the self-editable phone lane + visibility. */}
      <SectionBar index="02" title="الاتصال" />
      <Card>
        <div className="grid-2">
          <EditableTile
            label="هاتفي" value={view.phone.display ?? '—'} icon={Phone} mono
            editing={editing === 'studentPhone'} draft={draft}
            onDraft={(v) => setDraft(foldDigits(v))}
            onBegin={() => startEdit('studentPhone', view.phone.display)}
            onCancel={cancelEdit} onSave={saveEdit} saving={saving}
            revealError={revealError}
            errorAr={phoneCheck && !phoneCheck.ok && revealError ? phoneCheck.reasonAr : null}
            saved={savedAt === 'studentPhone'} inputDir="ltr" inputMode="tel"
            placeholder="09XX XXX XXXX"
          />
          <EditableTile
            label="هاتف إضافي" value={view.additionalPhone ?? '—'} icon={Phone} mono
            editing={editing === 'additionalPhone'} draft={draft}
            onDraft={(v) => setDraft(foldDigits(v))}
            onBegin={() => startEdit('additionalPhone', view.additionalPhone)}
            onCancel={cancelEdit} onSave={saveEdit} saving={saving}
            revealError={revealError}
            errorAr={phoneCheck && !phoneCheck.ok && revealError ? phoneCheck.reasonAr : null}
            saved={savedAt === 'additionalPhone'} inputDir="ltr" inputMode="tel"
            placeholder="اختياري"
          />
          <EditableTile
            label="جهة الطوارئ" value={view.emergencyContact.name ?? '—'} icon={Users}
            editing={editing === 'emergencyContactName'} draft={draft}
            onDraft={setDraft} onBegin={() => startEdit('emergencyContactName', view.emergencyContact.name)}
            onCancel={cancelEdit} onSave={saveEdit} saving={saving}
            revealError={revealError} errorAr={null}
            saved={savedAt === 'emergencyContactName'}
          />
          <EditableTile
            label="هاتف الطوارئ" value={view.emergencyContact.phone ?? '—'} icon={Phone} mono
            editing={editing === 'emergencyContactPhone'} draft={draft}
            onDraft={(v) => setDraft(foldDigits(v))}
            onBegin={() => startEdit('emergencyContactPhone', view.emergencyContact.phone)}
            onCancel={cancelEdit} onSave={saveEdit} saving={saving}
            revealError={revealError}
            errorAr={phoneCheck && !phoneCheck.ok && revealError ? phoneCheck.reasonAr : null}
            saved={savedAt === 'emergencyContactPhone'} inputDir="ltr" inputMode="tel"
            placeholder="09XX XXX XXXX"
          />
        </div>
        {errorAr && <p className="r349p-error" role="alert">{errorAr}</p>}
        <p className="r349p-note">
          الصيغ المقبولة: <bdi dir="ltr">09XXXXXXXXX</bdi> أو <bdi dir="ltr">9XXXXXXXX</bdi> أو
          <bdi dir="ltr">+218XXXXXXXXX</bdi> — والأرقام العربية-الهندية (٩…) تُحوَّل تلقائيًا.
        </p>
      </Card>

      {/* [03] الأكاديمية — read-only for the student. */}
      <SectionBar index="03" title="الأكاديمية" />
      <Card>
        <div className="grid-2">
          <Tile label="الكلية / المؤسسة" value={profile.data?.student?.faculty?.name ?? '—'} icon={GraduationCap} />
          <Tile label="القسم / التخصص" value={profile.data?.student?.department?.name ?? '—'} icon={GraduationCap} />
          <Tile label="رقم القيد" value={view.universityId} icon={FileText} mono />
          <Tile
            label="وضع الدراسة"
            value={view.academic.studyType ? STUDY_TYPE_LABELS[view.academic.studyType] ?? '—' : '—'}
            icon={Calendar}
          />
          <div className="fact-tile fact-tile--field">
            <Icon icon={ShieldCheck} size={16} className="text-subtle" aria-hidden />
            <div>
              <div className="text-xxs text-subtle">الحالة الدراسية</div>
              <div style={{ marginTop: 'var(--sp-0-5)' }}>
                <Badge color={view.academic.enrollmentStatus === 'ACTIVE' ? 'green' : 'amber'}>
                  {ENROLLMENT_LABELS[view.academic.enrollmentStatus] ?? view.academic.enrollmentStatus}
                </Badge>
              </div>
            </div>
          </div>
          <Tile label="السنة / الصف" value={fmtYearOrGrade(view)} icon={GraduationCap} />
          {view.academic.secondarySchool && (
            <Tile label="الثانوية" value={view.academic.secondarySchool} icon={GraduationCap} />
          )}
          {view.academic.secondarySchoolPercent !== null && (
            <Tile
              label="نسبة الثانوية"
              value={`${view.academic.secondarySchoolPercent}%`}
              icon={FileText}
              mono
            />
          )}
          {view.academic.admissionYear !== null && (
            <Tile label="سنة القبول" value={String(view.academic.admissionYear)} icon={Calendar} mono />
          )}
        </div>
      </Card>

      {/* [04] ولي الأمر — read-only for the student (staff-entered). */}
      <SectionBar index="04" title="ولي الأمر" />
      <Card>
        {view.guardian ? (
          <div className="grid-2">
            <Tile label="الاسم" value={view.guardian.name ?? '—'} icon={Users} />
            <Tile label="صلة القرابة" value={view.guardian.relationship ?? '—'} icon={Users} />
            <Tile label="الهاتف" value={view.guardian.phone.display ?? '—'} icon={Phone} mono />
          </div>
        ) : (
          <EmptyCell label="لا توجد بيانات ولي أمر" note="تُدخلها إدارة التسجيل في مؤسستك." />
        )}
      </Card>

      {/* [05] الوثائق — the institution's custom fields on this file. */}
      <SectionBar index="05" title="الوثائق وبيانات المؤسسة" />
      <Card>
        {customFields.length ? (
          <div className="grid-2">
            {customFields.map((f) => (
              <Tile key={f.key} label={f.labelAr} value={fmtCustomValue(f)} icon={FileText} />
            ))}
          </div>
        ) : (
          <EmptyCell label="لا حقول إضافية" note="لم تُعرّف مؤسستك حقولًا مخصصة على ملفات الطلبة بعد." />
        )}
      </Card>

      {/* [06] الأمان — who sees my phone (plain Arabic). */}
      <SectionBar index="06" title="الأمان والخصوصية" />
      <Card>
        <div className="r349p-vis" role="radiogroup" aria-label="من يرى هاتفي">
          <div className="r349p-vis-head">
            <Icon icon={Eye} size={16} className="text-subtle" aria-hidden />
            <span>من يرى هاتفي؟</span>
          </div>
          <VisOption
            active={!privatePhone}
            title="طاقم مؤسستي"
            description="أساتذتي وإدارة مؤسستي يرون رقمي — هوائية التواصل الطبيعية."
            onClick={() => setVisibility('INSTITUTION_STAFF')}
            disabled={saving}
            icon={Eye}
          />
          <VisOption
            active={privatePhone}
            title="خاص بي فقط"
            description="يظهر مقنّعًا للطاقم، ومن يحتاجه يرسل لي طلب تواصل أقرّه بنفسي."
            onClick={() => setVisibility('PRIVATE')}
            disabled={saving}
            icon={EyeOff}
          />
          {errorAr && <p className="r349p-error" role="alert">{errorAr}</p>}
        </div>
        <p className="r349p-note">
          كلمة المرور تُدار من «إعدادات الحساب» — تغييرها يُنهي جلساتك على بقية الأجهزة.
        </p>
      </Card>
    </section>
  );
}

/* ── helpers ─────────────────────────────────────────────────────── */

function fmtYearOrGrade(view: StudentProfileView): string {
  const a = view.academic;
  if (a.stage || a.grade) {
    return [a.stage, a.grade, a.section].filter(Boolean).join(' · ') || '—';
  }
  return '—';
}

function fmtCustomValue(f: CustomFieldValue): string {
  if (f.value === null || f.value === undefined) return '—';
  if (f.type === 'BOOLEAN') return f.value ? 'نعم' : 'لا';
  if (f.type === 'DATE') return fmtDate(String(f.value));
  if (f.type === 'MULTI_SELECT') return Array.isArray(f.value) ? f.value.join('، ') : '—';
  if (f.type === 'NUMBER') return String(f.value);
  return String(f.value);
}

/* ── tiles ───────────────────────────────────────────────────────── */

function Tile({ label, value, icon, mono }: { label: string; value: string; icon: LucideIcon; mono?: boolean }) {
  return (
    <div className="fact-tile fact-tile--field">
      <Icon icon={icon} size={16} className="text-subtle" aria-hidden />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-xxs text-subtle">{label}</div>
        <div className="text-sm" style={{ color: 'var(--text)', marginTop: 'var(--sp-0-5)' }}>
          {mono ? <bdi dir="ltr" className="font-mono">{value}</bdi> : value}
        </div>
      </div>
    </div>
  );
}

interface EditableTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  mono?: boolean;
  editing: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onBegin: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  revealError: boolean;
  errorAr: string | null;
  saved: boolean;
  inputDir?: 'rtl' | 'ltr';
  inputMode?: 'tel' | 'text' | 'numeric';
  inputType?: string;
  placeholder?: string;
}

function EditableTile(p: EditableTileProps) {
  if (!p.editing) {
    return (
      <div className="fact-tile fact-tile--field r349p-editable">
        <Icon icon={p.icon} size={16} className="text-subtle" aria-hidden />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-xxs text-subtle">{p.label}</div>
          <div className="text-sm" style={{ color: 'var(--text)', marginTop: 'var(--sp-0-5)' }}>
            {p.saved ? (
              <span className="r349p-saved"><Icon icon={Check} size={12} /> حُفظ</span>
            ) : p.mono ? (
              <bdi dir="ltr" className="font-mono">{p.value}</bdi>
            ) : (
              p.value
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn ghost sm r349p-edit-btn"
          onClick={p.onBegin}
          aria-label={`تعديل ${p.label}`}
        >
          <Icon icon={Pencil} size={12} />
        </button>
      </div>
    );
  }
  return (
    <div className="fact-tile fact-tile--field r349p-editing" style={{ gridColumn: '1 / -1' }}>
      <Icon icon={p.icon} size={16} className="text-subtle" aria-hidden />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-xxs text-subtle">{p.label}</div>
        <input
          className="r349p-input"
          value={p.draft}
          dir={p.inputDir}
          inputMode={p.inputMode}
          type={p.inputType ?? 'text'}
          placeholder={p.placeholder}
          onChange={(e) => p.onDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); p.onSave(); }
            if (e.key === 'Escape') p.onCancel();
          }}
          autoFocus
          aria-label={p.label}
          aria-invalid={Boolean(p.errorAr)}
        />
        {p.errorAr && (
          <span className="r349p-error" role="alert">
            <Icon icon={AlertCircle} size={12} /> {p.errorAr}
          </span>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <button type="button" className="btn primary sm" onClick={p.onSave} disabled={p.saving}>
          {p.saving ? '…' : 'حفظ'}
        </button>
        <button type="button" className="btn ghost sm" onClick={p.onCancel} disabled={p.saving}>
          <Icon icon={X} size={12} />
        </button>
      </div>
    </div>
  );
}

function VisOption({
  active, title, description, onClick, disabled, icon,
}: {
  active: boolean; title: string; description: string;
  onClick: () => void; disabled?: boolean; icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      className={`r349p-vis-option ${active ? 'r349p-vis-option--active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      role="radio"
      aria-checked={active}
    >
      <Icon icon={icon} size={16} aria-hidden />
      <span className="r349p-vis-title">{title}</span>
      <span className="r349p-vis-desc">{description}</span>
    </button>
  );
}
