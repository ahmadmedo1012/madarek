/**
 * 12-10 — Lecture player watch-report honesty (audit 11-f P0-1) and
 * resume-seek (audit 11-f P1-6).
 *
 * 1. isWatchComplete: the ÷0 → Infinity regression — an unset
 *    durationSec (0) must never report completed.
 * 2. resumeSeekSec: the seek-target math (3s rewind, duration clamp,
 *    completed / trivial-position skips).
 * 3. The 10-second reporter and the onEnded report both route through
 *    the guarded computation (rendered <video>, stubbed jsdom media).
 * 4. Resume-seek fires once, on the first loadedmetadata only.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LecturePlayerPage, { isWatchComplete, resumeSeekSec } from '../../src/pages/student/LecturePlayerPage';

const mocks = vi.hoisted(() => ({
  lecture: null as Record<string, unknown> | null,
  lectures: null as Array<Record<string, unknown>> | null,
  offeringFull: null as Record<string, unknown> | null,
  reportWatch: vi.fn(),
  answerCheckpoint: vi.fn(),
}));

vi.mock('../../src/hooks/useResources', () => ({
  useLecture: () => ({
    data: mocks.lecture,
    isPending: !mocks.lecture,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  /* PP-X2: the page's prev/next bar reads the offering's sibling
     lectures (audit P1-7). Defaults to a three-lecture offering with
     the base lecture in the middle — prev AND next exist. */
  useOfferingLectures: () => ({
    data: mocks.lectures ?? [
      { id: 'lec0', ordinal: 2, title: 'المحاضرة السابقة' },
      { id: 'lec1', ordinal: 3, title: 'محاضرة الشبكات' },
      { id: 'lec2', ordinal: 4, title: 'المحاضرة التالية' },
    ],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useReportWatch: () => ({ mutate: mocks.reportWatch }),
  useAnswerCheckpoint: () => ({ mutateAsync: mocks.answerCheckpoint }),
  /* r164d: the player sidebar's materials card reads the offering's
     /full payload (the same key CourseDetailPage seeds). Default null
     → isPending → the card renders nothing (its fail-soft contract). */
  useOfferingFull: () => ({
    data: mocks.offeringFull,
    isPending: !mocks.offeringFull,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

const baseLecture = {
  id: 'lec1',
  offeringId: 'off1',
  title: 'محاضرة الشبكات',
  ordinal: 3,
  durationSec: 600,
  videoUrl: 'https://cdn.example.com/lec1.mp4',
  createdAt: '2026-01-01T00:00:00.000Z',
  chapters: [],
  checkpoints: [],
  watchEvents: [] as Array<{ watchedSec: number; totalSec: number; completed: boolean }>,
  offering: {
    id: 'off1',
    course: { id: 'c1', name: 'شبكات الحاسوب', code: 'CS301' },
    teacher: { id: 't1', firstName: 'أحمد', lastName: 'الألفي' },
  },
};

function renderPlayer() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/lectures/lec1']}>
        <Routes>
          <Route path="/lectures/:lectureId" element={<LecturePlayerPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function getVideo(): HTMLVideoElement {
  return screen.getByLabelText('محاضرة: محاضرة الشبكات') as HTMLVideoElement;
}

/* jsdom media elements never actually play — stub the playing state
   the 10-second reporter checks before reporting. */
function pretendPlaying(video: HTMLVideoElement, currentTime: number) {
  Object.defineProperty(video, 'paused', { get: () => false, configurable: true });
  Object.defineProperty(video, 'currentTime', {
    value: currentTime,
    configurable: true,
    writable: true,
  });
}

/* Intercept seeks without depending on jsdom's media seek semantics. */
function trackSeeks(video: HTMLVideoElement): number[] {
  const seeks: number[] = [];
  Object.defineProperty(video, 'currentTime', {
    get: () => 0,
    set: (v: number) => seeks.push(v),
    configurable: true,
  });
  return seeks;
}

describe('isWatchComplete (P0-1 guard)', () => {
  it('never completes a lecture with an unset duration (÷0 → Infinity regression)', () => {
    expect(isWatchComplete(25, 0)).toBe(false);
    expect(isWatchComplete(0, 0)).toBe(false);
  });

  it('completes only at ≥ 95% of an authored duration', () => {
    expect(isWatchComplete(949, 1000)).toBe(false);
    expect(isWatchComplete(950, 1000)).toBe(true);
    expect(isWatchComplete(1000, 1000)).toBe(true);
  });

  it('rejects non-finite shares', () => {
    expect(isWatchComplete(Number.NaN, 600)).toBe(false);
    expect(isWatchComplete(Number.POSITIVE_INFINITY, 600)).toBe(false);
  });
});

describe('resumeSeekSec (P1-6 seek target)', () => {
  it('rewinds 3s from the saved high-water mark', () => {
    expect(resumeSeekSec(300, false, 600)).toBe(297);
  });

  it('skips completed lectures and trivial saved positions', () => {
    expect(resumeSeekSec(300, true, 600)).toBeNull();
    expect(resumeSeekSec(4, false, 600)).toBeNull();
    expect(resumeSeekSec(0, false, 600)).toBeNull();
  });

  it('clamps inside the real video duration', () => {
    expect(resumeSeekSec(700, false, 600)).toBe(599);
    expect(resumeSeekSec(120, false, 100)).toBe(99); // target 117 → clamped to duration-1
  });

  it('falls back to the raw target when the duration is unknown', () => {
    expect(resumeSeekSec(300, false, Number.NaN)).toBe(297);
    expect(resumeSeekSec(300, false, 0)).toBe(297);
  });
});

describe('LecturePlayerPage watch reporting', () => {
  beforeEach(() => {
    mocks.lecture = { ...baseLecture, watchEvents: [] };
    mocks.reportWatch.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('the 10s reporter sends completed:false when durationSec is unset (P0-1)', () => {
    vi.useFakeTimers();
    mocks.lecture = { ...baseLecture, durationSec: 0 };
    renderPlayer();
    pretendPlaying(getVideo(), 25);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(mocks.reportWatch).toHaveBeenCalledTimes(1);
    expect(mocks.reportWatch.mock.calls[0]?.[0]).toMatchObject({
      lectureId: 'lec1',
      watchedSec: 25,
      totalSec: 0,
      completed: false,
    });
  });

  it('the 10s reporter sends completed:true only past 95% of an authored duration', () => {
    vi.useFakeTimers();
    mocks.lecture = { ...baseLecture, durationSec: 600 };
    renderPlayer();
    pretendPlaying(getVideo(), 500); // 83% — not complete

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(mocks.reportWatch.mock.calls[0]?.[0]).toMatchObject({ totalSec: 600, completed: false });

    mocks.reportWatch.mockClear();
    pretendPlaying(getVideo(), 580); // 96.7% — complete
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(mocks.reportWatch.mock.calls[0]?.[0]).toMatchObject({ totalSec: 600, completed: true });
  });

  it('does not report while the video is paused', () => {
    vi.useFakeTimers();
    renderPlayer(); // jsdom default: paused = true

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(mocks.reportWatch).not.toHaveBeenCalled();
  });

  it('onEnded reports the actually-watched amount and never completes an unset duration', () => {
    mocks.lecture = { ...baseLecture, durationSec: 0 };
    renderPlayer();
    const video = getVideo();
    Object.defineProperty(video, 'currentTime', { value: 251, configurable: true, writable: true });

    fireEvent(video, new Event('ended'));

    expect(mocks.reportWatch).toHaveBeenCalledTimes(1);
    expect(mocks.reportWatch.mock.calls[0]?.[0]).toMatchObject({
      lectureId: 'lec1',
      watchedSec: 251,
      totalSec: 0,
      completed: false,
    });
  });

  it('onEnded completes a lecture with an authored duration', () => {
    mocks.lecture = { ...baseLecture, durationSec: 600 };
    renderPlayer();
    const video = getVideo();
    Object.defineProperty(video, 'currentTime', { value: 600, configurable: true, writable: true });

    fireEvent(video, new Event('ended'));

    expect(mocks.reportWatch.mock.calls[0]?.[0]).toMatchObject({
      watchedSec: 600,
      totalSec: 600,
      completed: true,
    });
  });
});

describe('LecturePlayerPage resume-seek (P1-6)', () => {
  beforeEach(() => {
    mocks.reportWatch.mockClear();
  });

  it('seeks to the saved position on the first loadedmetadata only', () => {
    mocks.lecture = {
      ...baseLecture,
      watchEvents: [{ watchedSec: 300, totalSec: 600, completed: false }],
    };
    renderPlayer();
    const video = getVideo();
    const seeks = trackSeeks(video);

    fireEvent(video, new Event('loadedmetadata'));
    expect(seeks).toEqual([297]);

    // One-shot guard: a later metadata reload (src change) must not
    // re-seek past whatever the student scrubbed to manually.
    fireEvent(video, new Event('loadedmetadata'));
    expect(seeks).toEqual([297]);
  });

  it('does not seek a completed lecture', () => {
    mocks.lecture = {
      ...baseLecture,
      watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }],
    };
    renderPlayer();
    const video = getVideo();
    const seeks = trackSeeks(video);

    fireEvent(video, new Event('loadedmetadata'));
    expect(seeks).toEqual([]);
  });

  it('does not seek when the saved position is trivial', () => {
    mocks.lecture = {
      ...baseLecture,
      watchEvents: [{ watchedSec: 4, totalSec: 600, completed: false }],
    };
    renderPlayer();
    const video = getVideo();
    const seeks = trackSeeks(video);

    fireEvent(video, new Event('loadedmetadata'));
    expect(seeks).toEqual([]);
  });
});

/* PP-X2 (audit P1-7) — the prev/next lecture bar: the watch loop's
 * exit ramp. prev = ordinal−1 (disabled on the first), next =
 * ordinal+1 (primary), and on the LAST lecture the dominant action
 * becomes «عُد إلى المقرّر» back to the course detail. */
describe('LecturePlayerPage prev/next bar (P1-7)', () => {
  beforeEach(() => {
    mocks.reportWatch.mockClear();
    mocks.lectures = null;
  });
  afterEach(() => {
    mocks.lectures = null;
  });

  it('links prev/next to the sibling lectures by ordinal', () => {
    mocks.lecture = { ...baseLecture };
    renderPlayer();

    const prev = screen.getByRole('link', { name: /المحاضرة السابقة/ });
    expect(prev).toHaveAttribute('href', '/student/lectures/lec0');
    const next = screen.getByRole('link', { name: /المحاضرة التالية/ });
    expect(next).toHaveAttribute('href', '/student/lectures/lec2');
  });

  it('disables prev on the first lecture', () => {
    mocks.lecture = { ...baseLecture };
    mocks.lectures = [
      { id: 'lec1', ordinal: 1, title: 'الأولى' },
      { id: 'lec2', ordinal: 2, title: 'الثانية' },
    ];
    renderPlayer();

    // prev is a disabled button (no href to follow), next still links.
    expect(screen.getByRole('button', { name: /المحاضرة السابقة/ })).toBeDisabled();
    expect(screen.getByRole('link', { name: /المحاضرة التالية/ })).toHaveAttribute(
      'href',
      '/student/lectures/lec2',
    );
  });

  it('the last lecture swaps next for «عُد إلى المقرّر» to the course', () => {
    mocks.lecture = { ...baseLecture };
    mocks.lectures = [
      { id: 'lec0', ordinal: 2, title: 'السابقة' },
      { id: 'lec1', ordinal: 3, title: 'محاضرة الشبكات' },
    ];
    renderPlayer();

    expect(screen.queryByRole('link', { name: /المحاضرة التالية/ })).toBeNull();
    const back = screen.getByRole('link', { name: /عُد إلى المقرّر/ });
    expect(back).toHaveAttribute('href', '/student/courses/off1');
  });

  it('pulses the next button exactly once when the video ends', () => {
    mocks.lecture = { ...baseLecture, durationSec: 600 };
    renderPlayer();
    const next = screen.getByRole('link', { name: /المحاضرة التالية/ });
    expect(next).not.toHaveClass('pulse');

    const video = getVideo();
    fireEvent(video, new Event('ended'));

    const pulsing = screen.getByRole('link', { name: /المحاضرة التالية/ });
    expect(pulsing).toHaveClass('pulse');
    // The animation end retires the pulse (one iteration, not a loop).
    fireEvent.animationEnd(pulsing);
    expect(screen.getByRole('link', { name: /المحاضرة التالية/ })).not.toHaveClass('pulse');
  });
});

/* ── r153b: unload flush ──────────────────────────────────────────
 * The 10s ticker loses the session tail when the tab closes between
 * ticks. The pagehide/visibility flush sends ONE keepalive fetch with
 * the live position — keepalive (not sendBeacon) because the endpoint
 * needs the Authorization header. */
describe('r153b — watch flush on pagehide/hidden', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('flushes the live position with a keepalive POST on pagehide', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    mocks.lecture = { ...baseLecture, durationSec: 600 };
    renderPlayer();
    const video = getVideo();
    pretendPlaying(video, 237);

    fireEvent(window, new Event('pagehide'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error('pagehide flush: expected one fetch call');
    const [url, init] = call;
    expect(url).toBe('/api/v1/lectures/lec1/watch');
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({
      watchedSec: 237,
      totalSec: 600,
      completed: false,
    });
  });

  it('does not flush when the video is paused (jsdom default)', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    mocks.lecture = { ...baseLecture, durationSec: 600 };
    renderPlayer();
    // no pretendPlaying — paused is jsdom's honest default

    fireEvent(window, new Event('pagehide'));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('marks completion honestly in the flush (≥95% of a set duration)', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    mocks.lecture = { ...baseLecture, durationSec: 600 };
    renderPlayer();
    const video = getVideo();
    pretendPlaying(video, 594);

    fireEvent(window, new Event('pagehide'));

    const doneCall = fetchMock.mock.calls[0];
    if (!doneCall) throw new Error('pagehide flush: expected one fetch call');
    expect(JSON.parse(doneCall[1].body).completed).toBe(true);
  });

  it('removes its listeners on unmount (no flush after leaving the page)', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    mocks.lecture = { ...baseLecture, durationSec: 600 };
    const { unmount } = renderPlayer();
    unmount();

    fireEvent(window, new Event('pagehide'));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/* ── r157 (W2-F7 / audit 6A5 + 6A11): checkpoint answer memory ────
 * The server now remembers answered checkpoints (CheckpointAnswer
 * rows, projected back by GET /lectures/:id as answers:
 * [{checkpointId}]). The player SEEDS its answered set from them
 * (merge — in-flight answers survive refetches), so a resumed
 * lecture never re-quizzes. Skip (button / Esc) is honest: it never
 * counts as answered and only suppresses the re-fire for THIS
 * session; only answer → «متابعة المحاضرة» counts. */
describe('r157 — checkpoint answer memory (seed) + honest skip', () => {
  beforeEach(() => {
    mocks.reportWatch.mockClear();
    mocks.answerCheckpoint.mockReset();
    mocks.answerCheckpoint.mockResolvedValue({ correct: true, correctIndex: 0, explanation: 'شرح الإجابة' });
    mocks.lectures = null;
  });
  afterEach(() => {
    mocks.lectures = null;
  });

  /* jsdom keeps the Modal mounted through its exit-animation window
     (useDelayedUnmount). jsdom has no AnimationEvent constructor, and
     fireEvent.animationEnd's fallback Event carries animationName
     undefined — so the Modal's exit handler would never run. Build the
     event by hand (the name rides a defined property, exactly as a
     real browser's animationend carries it) and end the exit window
     the way the runtime would. */
  const finishModalExit = () => {
    const overlay = document.querySelector('.modal-overlay');
    if (!overlay) return;
    const e = new Event('animationend', { bubbles: true });
    Object.defineProperty(e, 'animationName', { value: 'madarek-overlay-out' });
    // act() — the exit sets state (setRendered(false)); without it the
    // update defers past the assertions (raw dispatch ≠ RTL fireEvent).
    act(() => {
      overlay.dispatchEvent(e);
    });
  };

  const seekTo = (video: HTMLVideoElement, sec: number) => {
    Object.defineProperty(video, 'currentTime', { value: sec, configurable: true, writable: true });
    fireEvent(video, new Event('timeupdate'));
  };

  const oneCheckpointLecture = () => ({
    ...baseLecture,
    checkpoints: [
      {
        id: 'cp1', triggerSec: 100, question: 'السؤال الأول',
        options: ['نافذة واحدة', 'عشر نوافذ'], conceptId: null, answers: [],
      },
    ],
  });

  it('the server answer seed suppresses the re-quiz (6A5)', () => {
    mocks.lecture = {
      ...baseLecture,
      checkpoints: [
        {
          id: 'cp100', triggerSec: 100, question: 'السؤال الأول',
          options: ['أ', 'ب'], conceptId: null,
          // Server memory: answered in a PREVIOUS session.
          answers: [{ checkpointId: 'cp100' }],
        },
        {
          id: 'cp200', triggerSec: 200, question: 'السؤال الثاني',
          options: ['أ', 'ب'], conceptId: null, answers: [],
        },
      ],
    };
    renderPlayer();
    const video = getVideo();

    // Past the ANSWERED checkpoint's trigger: pre-r157 this modal
    // slammed open on every reload, and each re-answer burned the
    // r155a mastery cap. The seed keeps it silent.
    seekTo(video, 150);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText(/أُجيب عن 1 من/)).toBeInTheDocument();

    // The UNANSWERED checkpoint still fires honestly.
    seekTo(video, 250);
    expect(screen.getByRole('dialog', { name: 'نقطة تفاعل: السؤال الثاني' })).toBeInTheDocument();
  });

  it('the checkpoint dialog carries the question in its accessible name', () => {
    mocks.lecture = oneCheckpointLecture();
    renderPlayer();
    seekTo(getVideo(), 150);

    // Pre-r157 the dialog was named «نقطة تفاعل» — one unnamed-quiz
    // announcement for every checkpoint on the page.
    expect(screen.getByRole('dialog', { name: 'نقطة تفاعل: السؤال الأول' })).toBeInTheDocument();
  });

  it('«تخطّي» closes without counting and suppresses the re-fire for this session', () => {
    mocks.lecture = oneCheckpointLecture();
    renderPlayer();
    const video = getVideo();
    seekTo(video, 150);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Always visible — even before an answer.
    fireEvent.click(screen.getByRole('button', { name: 'تخطّي' }));
    finishModalExit();
    expect(screen.queryByRole('dialog')).toBeNull();

    // Honest: skip ≠ answer — the count stayed 0.
    expect(screen.getByText(/أُجيب عن 0 من/)).toBeInTheDocument();

    // Session suppression: the playhead still sits past the trigger
    // (150 ≥ 100) — a later tick must not slam the quiz back open.
    seekTo(video, 160);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Esc routes to skip — closes the dialog without counting it answered', () => {
    mocks.lecture = oneCheckpointLecture();
    renderPlayer();
    const video = getVideo();
    seekTo(video, 150);
    expect(screen.getByRole('dialog', { name: 'نقطة تفاعل: السؤال الأول' })).toBeInTheDocument();

    // Pre-r157 Esc called closeCheckpoint — it silently COUNTED the
    // checkpoint as answered (an honest-sounding lie).
    fireEvent.keyDown(document, { key: 'Escape' });
    finishModalExit();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText(/أُجيب عن 0 من/)).toBeInTheDocument();

    // And suppressed for the session (no instant re-fire).
    seekTo(video, 160);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('answer → «متابعة المحاضرة» counts the checkpoint', async () => {
    mocks.lecture = oneCheckpointLecture();
    renderPlayer();
    const video = getVideo();
    seekTo(video, 150);

    const options = within(screen.getByRole('group', { name: 'خيارات الإجابة' })).getAllByRole('button');
    await act(async () => {
      fireEvent.click(options[0]!);
    });

    // The answer landed (server memory row exists) → the primary CTA.
    fireEvent.click(await screen.findByRole('button', { name: 'متابعة المحاضرة' }));
    finishModalExit();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText(/أُجيب عن 1 من/)).toBeInTheDocument();

    // Counted → suppressed for the session (no re-fire at the same
    // playhead; the next session seeds from the server row).
    seekTo(video, 160);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

/* ── r164d (course flow): materials within reach + checkpoint loop ──
 * Two continuity fixes, pinned:
 *  1. The player sidebar carries the offering's materials (the same
 *     /full payload the course page reads) with honest materialHref
 *     targets — the handouts used to be two navigations away.
 *  2. A lecture whose watch is COMPLETE but whose checkpoints are open
 *     ends at a banner (not a wall): «إلى نقطة التفاعل التالية» seeks
 *     to the first unanswered checkpoint and re-opens it — including
 *     un-skipping one suppressed this session. */
describe('r164d — materials card in the player sidebar', () => {
  beforeEach(() => {
    mocks.reportWatch.mockClear();
    mocks.lectures = null;
    mocks.offeringFull = null;
  });
  afterEach(() => {
    mocks.offeringFull = null;
  });

  it('renders nothing while the offering payload is pending (fail-soft)', () => {
    mocks.lecture = { ...baseLecture };
    renderPlayer();
    expect(screen.queryByText('مواد المقرّر')).toBeNull();
  });

  it('lists the materials with honest targets: viewer / external / unavailable', () => {
    mocks.lecture = { ...baseLecture };
    mocks.offeringFull = {
      id: 'off1',
      materials: [
        {
          id: 'm1', name: 'ملخص المحاضرة', type: 'PDF',
          url: '/api/v1/files/materials/summary.pdf',
          sizeBytes: '1024', createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'm2', name: 'مرجع خارجي', type: 'DOC',
          url: 'https://docs.example.com/ref.pdf',
          sizeBytes: '2048', createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'm3', name: 'بذرة قديمة', type: 'PPT',
          url: 'https://seed.example.invalid/deck.pptx',
          sizeBytes: '4096', createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    renderPlayer();

    expect(screen.getByText('مواد المقرّر')).toBeInTheDocument();
    const viewer = screen.getByRole('link', { name: /ملخص المحاضرة/ });
    expect(viewer.getAttribute('href')).toContain('/document/summary.pdf');
    expect(viewer.getAttribute('href')).toContain('ns=materials');
    const external = screen.getByRole('link', { name: /مرجع خارجي/ });
    expect(external).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('link', { name: /بذرة قديمة/ })).toBeNull();
    expect(screen.getByText('غير متوفر بعد')).toBeInTheDocument();
  });

  it('an offering with zero materials renders no card', () => {
    mocks.lecture = { ...baseLecture };
    mocks.offeringFull = { id: 'off1', materials: [] };
    renderPlayer();
    expect(screen.queryByText('مواد المقرّر')).toBeNull();
  });
});

describe('r164d — completed watch, open checkpoints: the banner (not a wall)', () => {
  beforeEach(() => {
    mocks.reportWatch.mockClear();
    mocks.answerCheckpoint.mockReset();
    mocks.answerCheckpoint.mockResolvedValue({ correct: true, correctIndex: 0, explanation: 'شرح' });
    mocks.lectures = null;
    mocks.offeringFull = null;
  });
  afterEach(() => {
    mocks.offeringFull = null;
  });

  const completedTwoCheckpointLecture = (answeredIds: string[]) => ({
    ...baseLecture,
    watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }],
    checkpoints: [
      {
        id: 'cp1', triggerSec: 100, question: 'السؤال الأول',
        options: ['أ', 'ب'], conceptId: null,
        answers: answeredIds.includes('cp1') ? [{ checkpointId: 'cp1' }] : [],
      },
      {
        id: 'cp2', triggerSec: 200, question: 'السؤال الثاني',
        options: ['أ', 'ب'], conceptId: null,
        answers: answeredIds.includes('cp2') ? [{ checkpointId: 'cp2' }] : [],
      },
    ],
  });

  it('no banner while the watch is incomplete (checkpoints re-fire naturally during playback)', () => {
    mocks.lecture = {
      ...baseLecture,
      watchEvents: [],
      checkpoints: [
        { id: 'cp1', triggerSec: 100, question: 'السؤال الأول', options: ['أ', 'ب'], conceptId: null, answers: [] },
      ],
    };
    renderPlayer();
    expect(screen.queryByText(/أنهيت المشاهدة/)).toBeNull();
  });

  it('no banner when the watch is complete AND all checkpoints answered', () => {
    mocks.lecture = completedTwoCheckpointLecture(['cp1', 'cp2']);
    renderPlayer();
    expect(screen.queryByText(/أنهيت المشاهدة/)).toBeNull();
    expect(screen.getByText(/أُجيب عن 2 من/)).toBeInTheDocument();
  });

  it('banner appears on completed-watch with open checkpoints; the button re-opens the FIRST unanswered one', () => {
    mocks.lecture = completedTwoCheckpointLecture(['cp1']);
    renderPlayer();

    const banner = screen.getByText(/أنهيت المشاهدة/);
    expect(banner).toHaveTextContent(/تبقى/);
    expect(screen.getByText(/أُجيب عن 1 من/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /إلى نقطة التفاعل التالية/ }));

    // cp1 is answered — cp2 (the FIRST unanswered, trigger-sorted) opens.
    expect(screen.getByRole('dialog', { name: 'نقطة تفاعل: السؤال الثاني' })).toBeInTheDocument();
  });

  it('the banner un-skips a checkpoint suppressed this session and re-opens it', () => {
    mocks.lecture = completedTwoCheckpointLecture([]);
    renderPlayer();
    const video = getVideo();

    // cp1 fires during playback; the student skips it (session-local).
    const seekTo = (v: HTMLVideoElement, sec: number) => {
      Object.defineProperty(v, 'currentTime', { value: sec, configurable: true, writable: true });
      fireEvent(v, new Event('timeupdate'));
    };
    seekTo(video, 150);
    fireEvent.click(screen.getByRole('button', { name: 'تخطّي' }));
    const finishModalExit = () => {
      const overlay = document.querySelector('.modal-overlay');
      if (!overlay) return;
      const e = new Event('animationend', { bubbles: true });
      Object.defineProperty(e, 'animationName', { value: 'madarek-overlay-out' });
      act(() => {
        overlay.dispatchEvent(e);
      });
    };
    finishModalExit();
    expect(screen.queryByRole('dialog')).toBeNull();

    // Watch completes → the banner is the way back to the skipped loop.
    const banner = screen.getByText(/أنهيت المشاهدة/);
    expect(banner).toHaveTextContent(/نقطتا تفاعل لم تُجبا/);
    fireEvent.click(screen.getByRole('button', { name: /إلى نقطة التفاعل التالية/ }));
    expect(screen.getByRole('dialog', { name: 'نقطة تفاعل: السؤال الأول' })).toBeInTheDocument();
  });

  it('the seek targets the checkpoint trigger (the modal and the playhead agree)', () => {
    mocks.lecture = completedTwoCheckpointLecture(['cp1']);
    renderPlayer();
    const video = getVideo();
    const seeks: number[] = [];
    Object.defineProperty(video, 'currentTime', {
      get: () => 0,
      set: (v: number) => seeks.push(v),
      configurable: true,
    });

    fireEvent.click(screen.getByRole('button', { name: /إلى نقطة التفاعل التالية/ }));

    expect(seeks).toEqual([200]);
    expect(screen.getByRole('dialog', { name: 'نقطة تفاعل: السؤال الثاني' })).toBeInTheDocument();
  });
});
