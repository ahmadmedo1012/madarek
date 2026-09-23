import { useId, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Trophy, Calendar, Award, Plus, Filter, ArrowLeft, Lock, Send, FileText, X, Check, Gavel,
} from 'lucide-react';
import { Card, MetricCard, Badge, UserAvatar } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Modal } from '../../components/overlays';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import {
  useCompetitions, useCompetition, useCreateCompetition, useEnterCompetition,
  useCloseCompetition, useMyPermissions,
  useScoreCompetitionEntry, useJudgeCompetition,
  type CompetitionRow, type CompetitionDetail,
} from '../../hooks/useResources';
import { useAuthStore } from '../../stores/auth.store';

const STATUS_LABEL: Record<CompetitionRow['status'], string> = {
  OPEN: 'مفتوحة',
  CLOSED: 'مغلقة',
  JUDGED: 'تمّ التحكيم',
};
const STATUS_COLOR: Record<CompetitionRow['status'], 'green' | 'amber' | 'gold'> = {
  OPEN: 'green',
  CLOSED: 'amber',
  JUDGED: 'gold',
};

const CATEGORIES = ['بحث', 'برمجة', 'ابتكار', 'تصميم', 'محاضرة', 'ريادة أعمال', 'أخرى'];
const ICON_CHOICES = ['🏆', '🎯', '🔬', '💡', '💻', '🎨', '🎤', '📊']; // allow-emoji: admin icon-picker palette (user-supplied content)

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (days < 0) return 'انتهى';
  if (days === 0) return 'ينتهي اليوم';
  if (days === 1) return 'ينتهي غداً';
  if (days < 7) return `بعد ${days} أيام`;
  if (days < 30) return `بعد ${Math.round(days / 7)} أسابيع`;
  return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.round(h / 24)} يوم`;
}

/* ───────────────────────── Index page ───────────────────────── */

export function CompetitionsIndexPage() {
  const q = useCompetitions();
  const perms = useMyPermissions();
  const [filter, setFilter] = useState<'all' | 'OPEN' | 'CLOSED' | 'JUDGED'>('all');
  const [creating, setCreating] = useState(false);

  const canRun = perms.data?.capabilities.includes('COMPETITIONS_RUN') ?? false;

  const competitions = q.data ?? [];
  const visible = filter === 'all' ? competitions : competitions.filter((c) => c.status === filter);

  const stats = {
    open: competitions.filter((c) => c.status === 'OPEN').length,
    totalEntries: competitions.reduce((s, c) => s + c._count.entries, 0),
    closingSoon: competitions.filter((c) => {
      if (c.status !== 'OPEN') return false;
      const days = (new Date(c.deadline).getTime() - Date.now()) / 86400000;
      return days >= 0 && days <= 7;
    }).length,
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المسابقات الأكاديمية</h1>
          <p className="page-subtitle">شارك في تحديات المعرفة والابتكار، أو نظِّم مسابقتك الخاصّة.</p>
        </div>
        {canRun && (
          <button type="button" className="btn primary" onClick={() => setCreating(true)}>
            <Icon icon={Plus} size={14} />
            مسابقة جديدة
          </button>
        )}
      </header>

      {/* KPI strip */}
      <div className="grid-3">
        <MetricCard icon={Trophy} label="مسابقات مفتوحة" value={stats.open.toLocaleString('ar-LY')} color="green" />
        <MetricCard icon={Calendar} label="تنتهي قريباً" value={stats.closingSoon.toLocaleString('ar-LY')} color="amber" />
        <MetricCard icon={Award} label="إجمالي المشاركات" value={stats.totalEntries.toLocaleString('ar-LY')} color="purple" />
      </div>

      {/* Filter chips */}
      <div className="feed-toolbar">
        <div className="flex items-center gap-2">
          <Icon icon={Filter} size={14} className="text-subtle" />
          <span className="text-xs text-subtle">تصفية:</span>
          {([
            ['all', 'الكل'], ['OPEN', 'مفتوحة'], ['CLOSED', 'مغلقة'], ['JUDGED', 'تمّ التحكيم'],
          ] as const).map(([v, l]) => (
            <button
              key={v}
              type="button"
              className={`pill${filter === v ? ' on' : ''}`}
              onClick={() => setFilter(v)}
            >{l}</button>
          ))}
        </div>
      </div>

      {q.isPending ? <LoadingState /> :
       q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> :
       visible.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'لا توجد مسابقات بعد' : 'لا توجد نتائج لهذه الفئة'}
          description={canRun ? 'يمكنك إنشاء أول مسابقة بالنقر على "مسابقة جديدة".' : undefined}
        />
      ) : (
        <div className="comp-index-grid">
          {visible.map((c) => (
            <Link key={c.id} to={`/competitions/${c.id}`} className="comp-index-card">
              <div className="comp-index-emoji" aria-hidden><EmojiIcon emoji={c.iconEmoji ?? '🏆'} size={26} /></div>
              <div className="comp-index-body">
                <div className="comp-index-head">
                  <span className="comp-index-category">{c.category}</span>
                  <Badge color={STATUS_COLOR[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                </div>
                <h3 className="comp-index-title">{c.title}</h3>
                <p className="comp-index-desc">{c.description}</p>
                <div className="comp-index-meta">
                  <span><Icon icon={Calendar} size={12} /> {formatDeadline(c.deadline)}</span>
                  <span>·</span>
                  <span><Icon icon={Award} size={12} /> {c._count.entries} مشترك</span>
                  {c.prize && <><span>·</span><span>الجائزة: {c.prize}</span></>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && <CreateCompetitionModal onClose={() => setCreating(false)} />}
    </div>
  );
}

/* ───────────────────────── Detail page ───────────────────────── */

export function CompetitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = useCompetition(id);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const closer = useCloseCompetition(id ?? '');
  const judge = useJudgeCompetition(id ?? '');
  const [entering, setEntering] = useState(false);

  if (q.isPending) return <div className="page"><LoadingState /></div>;
  if (q.isError || !q.data) return <div className="page"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;

  const c = q.data;
  const isOrganizer = !!user && c.organizerId === user.id;
  // myEntry — prefer an exact id match when the payload carries one (the
  // organizer path returns the raw entry, which includes userId), and fall
  // back to a full first+last-name comparison otherwise. NOTE: the public
  // (non-organizer) competition detail payload does NOT include user ids or
  // emails — see backend social.routes.ts — so the name fallback is the best
  // available signal until the backend adds `userId` to entry selects.
  const myEntry = c.entries.find((e) => {
    const entryUserId = (e as { userId?: string }).userId;
    if (entryUserId) return entryUserId === user?.id;
    return e.user.firstName === user?.firstName && e.user.lastName === user?.lastName;
  });
  const canEnter = c.status === 'OPEN' && new Date(c.deadline) > new Date();
  const allScored = c.entries.length > 0 && c.entries.every((e) => e.score !== null);
  const someScored = c.entries.some((e) => e.score !== null);
  const sortedEntries = c.status === 'JUDGED'
    ? [...c.entries].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    : c.entries;

  return (
    <div className="page comp-detail">
      <button type="button" className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/competitions')}>
        <Icon icon={ArrowLeft} size={14} />
        كل المسابقات
      </button>

      {/* Hero */}
      <header className="comp-hero">
        <div className="comp-hero-emoji" aria-hidden><EmojiIcon emoji={c.iconEmoji ?? '🏆'} size={36} /></div>
        <div className="comp-hero-body">
          <div className="comp-hero-meta">
            <span className="comp-hero-category">{c.category}</span>
            <Badge color={STATUS_COLOR[c.status]}>{STATUS_LABEL[c.status]}</Badge>
          </div>
          <h1 className="comp-hero-title">{c.title}</h1>
          <p className="comp-hero-desc">{c.description}</p>
          <div className="comp-hero-stats">
            <div><Icon icon={Calendar} size={13} /> {formatDeadline(c.deadline)}</div>
            <div><Icon icon={Award} size={13} /> {c._count.entries} مشترك</div>
            {c.prize && <div><Icon icon={Trophy} size={13} /> {c.prize}</div>}
            <div className="text-subtle">نظَّمها {c.organizer.firstName} {c.organizer.lastName}</div>
          </div>
          <div className="comp-hero-actions">
            {canEnter && (
              <button type="button" className="btn primary" onClick={() => setEntering(true)}>
                <Icon icon={Send} size={14} />
                {myEntry ? 'تعديل مشاركتي' : 'شارك الآن'}
              </button>
            )}
            {isOrganizer && c.status === 'OPEN' && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => closer.mutate()}
                disabled={closer.isPending}
              >
                <Icon icon={Lock} size={14} />
                إغلاق المسابقة
              </button>
            )}
            {isOrganizer && c.status === 'CLOSED' && (
              <button
                type="button"
                className="btn primary"
                onClick={() => judge.mutate()}
                disabled={judge.isPending || !someScored}
                title={!someScored ? 'قَيِّم مشاركة واحدة على الأقلّ أوّلاً' : undefined}
              >
                <Icon icon={Gavel} size={14} />
                {judge.isPending ? 'جارٍ النشر…' : allScored ? 'إعلان النتائج' : 'إعلان النتائج (مشاركات بلا تقييم)'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Entries list */}
      <Card title="المشاركات" subtitle={`${c.entries.length} مشاركة${isOrganizer ? '' : c.status === 'JUDGED' ? ' · مرتَّبة حسب النتيجة' : ' (يظهر العنوان فقط حتى يتمّ التحكيم)'}`}>
        {c.entries.length === 0 ? (
          <EmptyState title="لم يشارك أحد بعد" description={canEnter ? 'كن أوّل من يشارك!' : undefined} />
        ) : (
          <ul className="comp-entry-list">
            {sortedEntries.map((e, i) => (
              <li key={e.id} className="comp-entry-row">
                {c.status === 'JUDGED' && e.score !== null && (
                  <span className="comp-entry-rank" aria-label={`الترتيب ${i + 1}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}{/* allow-emoji: medal rank glyphs */}
                  </span>
                )}
                <UserAvatar
                  initials={e.user.avatarInitials ?? `${e.user.firstName[0]}${e.user.lastName[0]}`}
                  color={e.user.avatarColor ?? undefined}
                  size={36}
                />
                <div className="comp-entry-body">
                  <div className="comp-entry-title">{e.title}</div>
                  <div className="comp-entry-meta">
                    {e.user.firstName} {e.user.lastName} · {formatRelative(e.submittedAt)}
                    {e.score !== null && c.status !== 'OPEN' && ` · النتيجة: ${e.score}/100`}
                  </div>
                  {isOrganizer && e.body && (
                    <div className="comp-entry-text">{e.body}</div>
                  )}
                  {e.fileUrl && isOrganizer && (
                    <a href={e.fileUrl} target="_blank" rel="noreferrer" className="comp-entry-file">
                      <Icon icon={FileText} size={12} /> ملف مُرفَق
                    </a>
                  )}
                  {isOrganizer && c.status === 'CLOSED' && id && (
                    <ScoreInput
                      competitionId={id}
                      entryId={e.id}
                      currentScore={e.score}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {entering && id && (
        <EnterCompetitionModal
          competitionId={id}
          existing={myEntry?.body !== undefined ? { title: myEntry.title, body: myEntry.body } : undefined}
          onClose={() => setEntering(false)}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Score input (organizer-only) ───────── */

function ScoreInput({
  competitionId, entryId, currentScore,
}: {
  competitionId: string;
  entryId: string;
  currentScore: number | null;
}) {
  const [value, setValue] = useState<string>(currentScore !== null ? String(currentScore) : '');
  const score = useScoreCompetitionEntry(competitionId);
  const scoreLabelId = useId();

  const save = () => {
    if (value === '') {
      score.mutate({ entryId, score: null });
      return;
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 100) return;
    score.mutate({ entryId, score: Math.round(n) });
  };

  return (
    <div className="comp-score-input">
      <label id={scoreLabelId} className="text-xxs text-subtle">التقييم (من 100)</label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          className="auth-input"
          style={{ maxWidth: 100 }}
          aria-labelledby={scoreLabelId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
          disabled={score.isPending}
        />
        {score.isSuccess && currentScore !== null && (
          <Icon icon={Check} size={14} style={{ color: 'var(--success)' }} />
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Create modal ───────────────────────── */

const createSchema = z.object({
  title: z.string().min(3, 'العنوان قصير جدّاً').max(200),
  description: z.string().min(10, 'الوصف قصير جدّاً').max(4000),
  category: z.string().min(1, 'اختر فئة'),
  prize: z.string().max(200).optional(),
  deadline: z.string().min(1, 'حدِّد الموعد النهائي'),
  iconEmoji: z.string().max(8).optional(),
});
type CreateInputs = z.infer<typeof createSchema>;

function CreateCompetitionModal({ onClose }: { onClose: () => void }) {
  const create = useCreateCompetition();
  const titleId = useId();
  const descId = useId();
  const catId = useId();
  const deadlineId = useId();
  const prizeId = useId();
  const iconLabelId = useId();

  const form = useForm<CreateInputs>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: '', description: '', category: CATEGORIES[0], prize: '', deadline: '', iconEmoji: '🏆' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        ...values,
        deadline: new Date(values.deadline).toISOString(),
      });
      onClose();
    } catch { /* surfaced below */ }
  });

  return (
    <Modal open onClose={onClose} ariaLabel="مسابقة جديدة">
      <header className="comp-modal-head">
        <h2>مسابقة جديدة</h2>
        <button type="button" className="comp-modal-close" onClick={onClose} aria-label="إغلاق">
          <Icon icon={X} size={16} />
        </button>
      </header>
      <form onSubmit={onSubmit} className="comp-modal-form" style={{ overflowY: 'auto' }}>
        <div className="comp-form-field">
          <label htmlFor={titleId}>العنوان</label>
          <input id={titleId} type="text" {...form.register('title')} className="auth-input" />
          {form.formState.errors.title && <span className="auth-field-error">{form.formState.errors.title.message}</span>}
        </div>
        <div className="comp-form-field">
          <label htmlFor={descId}>الوصف</label>
          <textarea id={descId} rows={4} {...form.register('description')} className="auth-input" />
          {form.formState.errors.description && <span className="auth-field-error">{form.formState.errors.description.message}</span>}
        </div>
        <div className="comp-form-row">
          <div className="comp-form-field">
            <label htmlFor={catId}>الفئة</label>
            <select id={catId} {...form.register('category')} className="auth-input">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="comp-form-field">
            <label htmlFor={deadlineId}>الموعد النهائي</label>
            <input id={deadlineId} type="datetime-local" {...form.register('deadline')} className="auth-input" />
            {form.formState.errors.deadline && <span className="auth-field-error">{form.formState.errors.deadline.message}</span>}
          </div>
        </div>
        <div className="comp-form-row">
          <div className="comp-form-field">
            <label htmlFor={prizeId}>الجائزة (اختياري)</label>
            <input id={prizeId} type="text" {...form.register('prize')} placeholder="شهادة، 500 د.ل، …" className="auth-input" />
          </div>
          <div className="comp-form-field">
            <label id={iconLabelId}>أيقونة</label>
            <div className="comp-icon-picker" role="group" aria-labelledby={iconLabelId}>
              {ICON_CHOICES.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  aria-pressed={form.watch('iconEmoji') === ic}
                  className={`comp-icon-btn${form.watch('iconEmoji') === ic ? ' on' : ''}`}
                  onClick={() => form.setValue('iconEmoji', ic)}
                >{ic}</button>
              ))}
            </div>
          </div>
        </div>
        {create.isError && (
          <div className="auth-error">تعذَّر إنشاء المسابقة. تحقَّق من البيانات.</div>
        )}
        <div className="comp-modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>إلغاء</button>
          <button type="submit" className="btn primary" disabled={create.isPending}>
            {create.isPending ? 'جارٍ الإنشاء…' : 'إنشاء'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ───────────────────────── Enter modal ───────────────────────── */

const enterSchema = z.object({
  title: z.string().min(3, 'العنوان قصير').max(200),
  body: z.string().min(10, 'الوصف قصير').max(4000),
  fileUrl: z.string().url('رابط غير صالح').optional().or(z.literal('')),
});
type EnterInputs = z.infer<typeof enterSchema>;

function EnterCompetitionModal({
  competitionId, existing, onClose,
}: {
  competitionId: string;
  existing?: { title: string; body: string };
  onClose: () => void;
}) {
  const enter = useEnterCompetition(competitionId);
  const titleId = useId();
  const bodyId = useId();
  const fileUrlId = useId();

  const form = useForm<EnterInputs>({
    resolver: zodResolver(enterSchema),
    defaultValues: { title: existing?.title ?? '', body: existing?.body ?? '', fileUrl: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await enter.mutateAsync({
        title: values.title,
        body: values.body,
        fileUrl: values.fileUrl || undefined,
      });
      onClose();
    } catch { /* surfaced below */ }
  });

  return (
    <Modal open onClose={onClose} ariaLabel={existing ? 'تعديل مشاركتي' : 'تقديم مشاركة'}>
      <header className="comp-modal-head">
        <h2>{existing ? 'تعديل مشاركتي' : 'تقديم مشاركة'}</h2>
        <button type="button" className="comp-modal-close" onClick={onClose} aria-label="إغلاق">
          <Icon icon={X} size={16} />
        </button>
      </header>
      <form onSubmit={onSubmit} className="comp-modal-form" style={{ overflowY: 'auto' }}>
        <div className="comp-form-field">
          <label htmlFor={titleId}>عنوان المشاركة</label>
          <input id={titleId} type="text" {...form.register('title')} className="auth-input" />
          {form.formState.errors.title && <span className="auth-field-error">{form.formState.errors.title.message}</span>}
        </div>
        <div className="comp-form-field">
          <label htmlFor={bodyId}>الوصف / المحتوى</label>
          <textarea id={bodyId} rows={6} {...form.register('body')} className="auth-input" />
          {form.formState.errors.body && <span className="auth-field-error">{form.formState.errors.body.message}</span>}
        </div>
        <div className="comp-form-field">
          <label htmlFor={fileUrlId}>رابط الملف (اختياري)</label>
          <input id={fileUrlId} type="url" {...form.register('fileUrl')} placeholder="https://…" className="auth-input" />
          {form.formState.errors.fileUrl && <span className="auth-field-error">{form.formState.errors.fileUrl.message}</span>}
        </div>
        {enter.isError && <div className="auth-error">تعذَّر تقديم المشاركة. تحقَّق من البيانات.</div>}
        <div className="comp-modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>إلغاء</button>
          <button type="submit" className="btn primary" disabled={enter.isPending}>
            <Icon icon={Send} size={14} />
            {enter.isPending ? 'جارٍ الإرسال…' : existing ? 'حفظ التعديلات' : 'إرسال'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
