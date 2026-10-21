/**
 * G final shared-surfaces pass — regression pins.
 *
 * Every pin here protects a REAL defect this workstream fixed (measured
 * or contract-verified), in the house idiom: interaction tests at the
 * mocked-hook boundary + fs-level contract pins where the fix lives in
 * CSS/source (the r166a landing-scrollspy pattern).
 *
 *  1. RegisterPage pending parity — the submit buttons were disabled
 *     silently: no aria-busy, no polite mirror (AuthPage has both, and
 *     its tests pin them). The flip to busy must be ANNOUNCED.
 *  2. AiAssistantPage native-surface completion — the header rode the
 *     legacy .page-title markup while the whole family moved to the
 *     patterns contract (pf-page-title), the conversations empty state
 *     was a bare paragraph instead of the shared EmptyState kit, and
 *     the chat controls measured 40/40/35px on coarse-pointer tablets
 *     (the r290 touch-floor class of defect — .btn/.icon-btn got the
 *     (pointer: coarse) floors, the chat-* recipes never did).
 *  3. TrainingPages family parity — the catalog's filter row was the
 *     one hand-rolled pill row left in the family (FilterBar contract),
 *     the enroll button said nothing while pending (silent disable),
 *     and the track's English NAME rode font-mono (r197: mono is for
 *     IDs/metrics only).
 *  4. Vision de-inlining — the detail page carried ~15 inline style
 *     blocks; the grammar now lives in styles/vision.css.
 *  5. Dead code stays dead — CollegesPopover + colleges-popover.css +
 *     the .college-card/.comp-index families are deleted; community no
 *     longer imports training.css for classes it never consumed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { useAuthStore } from '../../src/stores/auth.store';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
/** Also drop // line comments (TSX scans — retirement prose is not code). */
const stripAllComments = (src: string) =>
  stripComments(src).replace(/\/\/[^\n]*/g, '');

/* ══════════ the single useResources mock boundary (house pattern) ══════════
 * One factory serves all three rendered pages (register/assistant/
 * training) — per-suite behavior flips through the hoisted state. */
const h = vi.hoisted(() => ({
  register: {
    mutateAsync: vi.fn(async () => ({ user: { role: 'STUDENT' as const } })),
    isPending: false,
    isError: false,
    reset: vi.fn(),
  },
  aiConfig: { data: undefined as undefined | { engine: string; model: string | null }, isPending: true, isError: false },
  conversations: {
    data: [] as Array<{ id: string; title: string | null; createdAt: string }>,
    isPending: false,
    isError: false,
    refetch: () => undefined,
  },
  track: {
    data: undefined as undefined | {
      id: string; slug: string; title: string; titleEn: string | null;
      summary: string; category: string; level: string; iconEmoji: string | null;
      themeColor: string | null; estMinutes: number; pointsAward: number;
      enrolled: boolean; isCompleted: boolean; completedAt: string | null;
      lessons: Array<{
        id: string; order: number; title: string; summary: string | null;
        contentMarkdown: string; estMinutes: number; pointsAward: number;
        quizQuestion: string | null; isCompleted: boolean;
      }>;
    },
    isPending: false,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  enroll: { isPending: false, mutateAsync: vi.fn() },
  chat: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  gaps: { data: [], isPending: false, isError: false, refetch: () => undefined },
  delConversation: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  fetchMessages: vi.fn(async () => [] as Array<{ id: string; role: string; text: string; createdAt: string }>),
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useFaculties: () => ({
      data: [
        {
          id: 'fac-1',
          name: 'كلية تقنية المعلومات',
          iconEmoji: '💻',
          city: 'الزاوية',
          departments: [{ id: 'dep-1', name: 'علوم الحاسوب' }],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useAiConfig: () => h.aiConfig,
    useAiConversations: () => h.conversations,
    // The assistant surface's remaining hooks (the AiAssistantPage-*
    // suite idiom): flat stubs so no QueryClient is needed in jsdom.
    useAiChat: () => h.chat,
    useGaps: () => h.gaps,
    useDeleteAiConversation: () => h.delConversation,
    fetchAiConversationMessages: () => h.fetchMessages(),
    useTrainingTrack: () => h.track,
    useEnrollTrack: () => h.enroll,
  };
});

vi.mock('../../src/hooks/useAuth', () => ({
  useRegister: () => h.register,
}));

vi.mock('../../src/hooks/useInstitutions', () => ({
  useInstitutions: () => ({
    data: [{ id: 'inst-zawia', name: 'جامعة الزاوية', nameEn: 'University of Zawia', slug: 'zawia' }],
    isPending: false,
    isError: false,
  }),
}));

import RegisterPage from '../../src/pages/RegisterPage';
import AiAssistantPage from '../../src/pages/student/AiAssistantPage';
import { TrainingTrackPage } from '../../src/pages/student/TrainingPages';

const TRACK = {
  id: 'trk1',
  slug: 'study-skills',
  title: 'مهارات المذاكرة العميقة',
  titleEn: 'Deep Study Skills',
  summary: 'مسار يبني عادات مذاكرة قائمة على الاسترجاع الفعّال.',
  category: 'STUDY_SKILLS',
  level: 'BEGINNER',
  iconEmoji: '🧠',
  themeColor: null,
  estMinutes: 45,
  pointsAward: 120,
  enrolled: false,
  isCompleted: false,
  completedAt: null,
  lessons: [
    {
      id: 'les1',
      order: 1,
      title: 'لماذا يفشل إعادة القراءة',
      summary: 'الفرق بين الألفة والإتقان.',
      contentMarkdown: 'النثر…',
      estMinutes: 10,
      pointsAward: 30,
      quizQuestion: null,
      isCompleted: false,
    },
  ],
};

beforeEach(() => {
  h.register = {
    mutateAsync: vi.fn(async () => ({ user: { role: 'STUDENT' } })),
    isPending: false,
    isError: false,
    reset: vi.fn(),
  };
  h.aiConfig = { data: undefined, isPending: true, isError: false };
  h.conversations = { data: [], isPending: false, isError: false, refetch: () => undefined };
  h.track = { data: TRACK, isPending: false, isError: false, error: null, refetch: vi.fn() };
  h.enroll = { isPending: false, mutateAsync: vi.fn() };
  h.chat = { isPending: false, isError: false, error: null, mutateAsync: vi.fn() };
  h.gaps = { data: [], isPending: false, isError: false, refetch: () => undefined };
  h.delConversation = { isPending: false, isError: false, error: null, mutateAsync: vi.fn() };
  h.fetchMessages = vi.fn(async () => []);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* ══════════════ 1 · RegisterPage pending parity ══════════════ */

describe('G · RegisterPage — the pending flip is announced (AuthPage parity)', () => {
  it('the student submit button carries aria-busy + the sr-only polite mirror while pending', () => {
    h.register.isPending = true;
    render(
      <MemoryRouter initialEntries={['/auth/register']}>
        <RegisterPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /طالب/ }));

    const submit = screen.getByRole('button', { name: /جارٍ الإنشاء…/ });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    // The polite mirror mounts WITH the busy state — aria-busy alone is
    // silent for screen readers (the r157 F5 contract).
    expect(screen.getByText('جارٍ إنشاء حسابك…')).toBeInTheDocument();
  });

  it('the teacher submit button carries the same contract', () => {
    h.register.isPending = true;
    render(
      <MemoryRouter initialEntries={['/auth/register']}>
        <RegisterPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /أستاذ/ }));

    const submit = screen.getByRole('button', { name: /جارٍ الإنشاء…/ });
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('جارٍ إنشاء حسابك…')).toBeInTheDocument();
  });

  it('idle state mounts neither the busy attributes nor the mirror', () => {
    render(
      <MemoryRouter initialEntries={['/auth/register']}>
        <RegisterPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /طالب/ }));

    const submit = screen.getByRole('button', { name: 'إنشاء الحساب' });
    expect(submit).toBeEnabled();
    // The house idiom (AuthPage): explicit aria-busy="false" at rest —
    // what must NOT appear while idle is the polite mirror.
    expect(submit).toHaveAttribute('aria-busy', 'false');
    expect(screen.queryByText('جارٍ إنشاء حسابك…')).toBeNull();
  });
});

/* ══════════════ 2 · AiAssistantPage — native surface ══════════════ */

describe('G · AiAssistantPage — the header rides the family patterns contract', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'u1', role: 'STUDENT', email: 's@test.dev', firstName: 'طالب', lastName: 'تجريبي', avatarInitials: 'تج' },
    });
    window.HTMLElement.prototype.scrollTo = () => undefined;
  });

  it('the h1 carries the patterns class (pf-page-title) inside the PageFrame root', () => {
    const { container } = render(
      <MemoryRouter>
        <AiAssistantPage />
      </MemoryRouter>,
    );
    const h1 = screen.getByRole('heading', { level: 1, name: 'المساعد الذكيّ' });
    expect(h1).toHaveClass('pf-page-title');
    expect(h1.closest('.pf-page')).not.toBeNull();
    // The legacy chrome is gone.
    expect(container.querySelector('.page-header')).toBeNull();
  });

  it('the conversations empty state uses the shared EmptyState kit (not a bare paragraph)', () => {
    const { container } = render(
      <MemoryRouter>
        <AiAssistantPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('لا توجد محادثات سابقة بعد')).toBeInTheDocument();
    expect(screen.getByText('ابدأ بأول سؤال وستظهر محادثاتك هنا.')).toBeInTheDocument();
    // The kit contract: the illustration mount.
    expect(container.querySelector('.state-illustration')).not.toBeNull();
  });
});

describe('G · ai.css — the chat controls meet the 44px touch floor on real touch devices', () => {
  const ai = stripComments(read('src/styles/ai.css'));

  it('the coarse-pointer belt floors every chat control (the r290 class of fix)', () => {
    const belt = ai.match(/@media \(pointer: coarse\) \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(belt).toContain('.ai-surface .chat-input');
    expect(belt).toContain('.ai-surface .chat-send');
    expect(belt).toContain('.ai-surface .ai-quick-chip');
    expect(belt).toContain('.ai-surface .chat-retry');
    expect(belt).toContain('min-block-size: 44px');
    // min-* only grows the hit box — the 40px desktop rhythm stays
    // (no bare block-size/inline-size floor in the belt).
    expect(belt).not.toMatch(/\n\s+(block-size|inline-size): 44px/);
  });

  it('the de-inlined composer bits live as classes now', () => {
    expect(ai).toMatch(/\.ai-engine-tag \{/);
    expect(ai).toMatch(/\.ai-counter \{/);
    expect(ai).toMatch(/\.ai-bubble-skeleton \{/);
    expect(ai).toMatch(/\.ai-suggestion-text \{/);
  });
});

/* ══════════════ 3 · TrainingPages family parity ══════════════ */

describe('G · TrainingTrackPage — the enroll button speaks while pending', () => {
  it('pending renders the busy label + aria-busy (never a silent disable)', () => {
    h.enroll.isPending = true;
    render(
      <MemoryRouter initialEntries={['/training/study-skills']}>
        <TrainingTrackPage />
      </MemoryRouter>,
    );
    const enroll = screen.getByRole('button', { name: 'جارٍ البدء…' });
    expect(enroll).toBeDisabled();
    expect(enroll).toHaveAttribute('aria-busy', 'true');
  });

  it('the English track NAME is not mono (r197: mono is for IDs/metrics)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/training/study-skills']}>
        <TrainingTrackPage />
      </MemoryRouter>,
    );
    const name = container.querySelector('.track-hero-main .text-xs.text-subtle bdi');
    expect(name).toHaveTextContent('Deep Study Skills');
    expect(name?.parentElement).not.toHaveClass('font-mono');
  });
});

describe('G · training family source contracts', () => {
  const trainingCss = stripComments(read('src/styles/training.css'));
  const trainingTsx = read('src/pages/student/TrainingPages.tsx');

  it('the catalog filter rides the shared FilterBar (sticky) — no hand-rolled pill row', () => {
    expect(trainingTsx).toContain('<FilterBar');
    expect(trainingTsx).toContain('sticky');
    expect(trainingTsx).not.toContain('className="filter-pill-row"');
  });

  it('the de-inlined cert/toggle/summary classes exist in the sheet', () => {
    for (const cls of ['.cert-row', '.cert-body', '.cert-title', '.cert-meta', '.ach-lb-toggle', '.lesson-summary']) {
      expect(trainingCss).toContain(`${cls} {`);
    }
    expect(trainingCss).not.toContain('.track-grid {');
  });
});

/* ══════════════ 4 · Vision + community + colleges parity ══════════════ */

describe('G · vision — the reading-surface grammar lives in vision.css', () => {
  const visionCss = stripComments(read('src/styles/vision.css'));
  const visionTsx = read('src/pages/vision/VisionPages.tsx');

  it('the stylesheet carries the extracted classes (tokens only)', () => {
    for (const cls of ['.vision-h2', '.vision-article', '.vision-chip', '.vision-step', '.vision-notify', '.vision-prevnext']) {
      expect(visionCss).toContain(cls);
    }
    // No raw color literal smuggled into the new sheet.
    expect(visionCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgb\(/);
  });

  it('the TSX no longer carries the inline style constants', () => {
    expect(visionTsx).not.toContain('VISION_H2_STYLE');
    expect(visionTsx).not.toContain('VISION_ARTICLE_STYLE');
    expect(visionTsx.match(/style=\{\{/g) ?? []).toHaveLength(1); // the data-driven gradient only
  });

  it('the gallery header rides the patterns PageHeader', () => {
    expect(visionTsx).toContain('<PageHeader');
    expect(visionTsx).toContain('<PageFrame>');
  });
});

describe('G · community + colleges + competitions parity', () => {
  it('community no longer imports training.css (zero consumed classes)', () => {
    const community = read('src/pages/community/CommunityPages.tsx');
    expect(community).not.toContain('styles/training.css');
  });

  it('the post hashtags render sans (r197 mono contract)', () => {
    const panels = read('src/components/community/CommunitySocialPanels.tsx');
    const tagSpan = panels.match(/<span key=\{t\} className="[^"]*">#\{t\}<\/span>/)?.[0] ?? '';
    expect(tagSpan).not.toContain('font-mono');
    expect(tagSpan).toContain('post-tag');
  });

  it('the competitions FilterBar is sticky (family parity with colleges)', () => {
    const comps = read('src/pages/competitions/CompetitionsPages.tsx');
    expect(comps).toContain('sticky');
  });

  it('the colleges leaderboard header rides the patterns PageHeader', () => {
    const colleges = read('src/pages/colleges/CollegePages.tsx');
    expect(colleges).not.toContain('className="page-header"');
    expect(colleges).toContain('<PageHeader');
  });
});

/* ══════════════ 5 · dead code stays dead ══════════════ */

describe('G · the popover retirement is permanent', () => {
  it('CollegesPopover and its sheet are gone', () => {
    expect(() => read('src/components/CollegesPopover.tsx')).toThrow();
    expect(() => read('src/styles/colleges-popover.css')).toThrow();
    // No lingering import anywhere in the source tree (comments
    // stripped — the retirement notes name the component in prose).
    for (const f of ['src/main.tsx', 'src/App.tsx']) {
      const code = stripAllComments(read(f));
      expect(code).not.toContain('CollegesPopover');
      expect(code).not.toContain('colleges-popover');
    }
  });
});
