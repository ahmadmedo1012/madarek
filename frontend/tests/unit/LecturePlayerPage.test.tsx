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
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LecturePlayerPage, { isWatchComplete, resumeSeekSec } from '../../src/pages/student/LecturePlayerPage';

const mocks = vi.hoisted(() => ({
  lecture: null as Record<string, unknown> | null,
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
  useReportWatch: () => ({ mutate: mocks.reportWatch }),
  useAnswerCheckpoint: () => ({ mutateAsync: mocks.answerCheckpoint }),
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
