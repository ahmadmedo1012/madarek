/**
 * R334 3-g — exam runner + exams list + results: the pure-logic net.
 *
 * WHY THIS FILE (not colocated next to the routes): the render-net walks
 * EVERY .ts/.tsx under app/ and requires a default-exported screen from
 * each — a test or lib file there would break that hard gate. Route-owned
 * pure helpers are therefore exported by name from the route files and
 * pinned here (the repo's established home for route-adjacent nets).
 *
 * Covers: the countdown leaf contract (mount under the reanimated mock,
 * immediate-expire path), navigator-cell derivation + Arabic a11y, the
 * save-chip state machine, the online/offline save plan, the unanswered
 * warning grammar, list status-chip semantics (one accent), timer-to-start
 * formatting, the results share summary, and the queue→examsApi wiring the
 * runner relies on (enqueue offline → flush maps onto POST /answer).
 *
 * HONESTY: jest + mocks — no emulator in this sandbox; UI-thread tick
 * fidelity and real haptics/sheet behavior are device-verified scope.
 */
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import {
  ExamCountdown,
  deriveNavigatorCells,
  deriveSaveChip,
  navCellA11y,
  planAnswerSave,
  unansweredNoteAr,
} from "../../app/student/online-exams/[templateId]";
import { examStatusChip, fmtUntilAr } from "../../app/student/online-exams";
import { resultsShareText } from "../../app/student/results";
import {
  clearAnswerQueue,
  enqueueAnswer,
  flushAnswers,
  sendAnswerViaExamsApi,
} from "@/lib/resilience/queue";
import type { ExamTemplateRow } from "@/api/exams";

const HOUR = 3_600_000;

/* ── the countdown leaf (audit-P1 fix) ─────────────────────────────── */

describe("ExamCountdown", () => {
  it("mounts without re-rendering the JS tree and seeds the a11y label", async () => {
    const onExpire = jest.fn();
    await render(
      <ExamCountdown
        expiresAtMs={Date.now() + 90_000}
        initialSeconds={90}
        onExpire={onExpire}
        testID="clock"
      />,
    );
    const el = screen.getByTestId("clock");
    expect(el.props.defaultValue).toBe("1:30");
    expect(el.props.accessibilityLabel).toBe("الوقت المتبقي 1:30");
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("fires onExpire exactly once when the attempt is already expired at mount", async () => {
    const onExpire = jest.fn();
    await render(
      <ExamCountdown expiresAtMs={Date.now() - 1_000} initialSeconds={0} onExpire={onExpire} testID="clock" />,
    );
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("clock").props.defaultValue).toBe("0:00");
  });
});

/* ── save pipeline ─────────────────────────────────────────────────── */

describe("deriveSaveChip", () => {
  it("orders worst-first: failed > saving > queued > saved > none", () => {
    expect(deriveSaveChip({ failed: true, saving: true, queued: true, saved: true })).toBe("failed");
    expect(deriveSaveChip({ failed: false, saving: true, queued: true, saved: true })).toBe("saving");
    expect(deriveSaveChip({ failed: false, saving: false, queued: true, saved: true })).toBe("queued");
    expect(deriveSaveChip({ failed: false, saving: false, queued: false, saved: true })).toBe("saved");
    expect(deriveSaveChip({ failed: false, saving: false, queued: false, saved: false })).toBeNull();
  });
});

describe("planAnswerSave", () => {
  it("routes offline taps to the durable queue, online taps to the chained direct send", () => {
    expect(planAnswerSave(false)).toBe("queue");
    expect(planAnswerSave(true)).toBe("direct");
  });
});

/* ── navigator (question grid sheet) ───────────────────────────────── */

describe("deriveNavigatorCells", () => {
  const questions = [{ id: "q1" }, { id: "q2" }, { id: "q3" }, { id: "q4" }];
  const cells = deriveNavigatorCells(questions, {
    answeredQids: new Set(["q1", "q2"]),
    flaggedQids: new Set(["q2"]),
    failedQids: new Set(["q3"]),
    currentIndex: 1,
  });

  it("derives answered / flagged / failed / current per cell", () => {
    expect(cells[0]).toMatchObject({ qid: "q1", answered: true, flagged: false, failed: false, current: false });
    expect(cells[1]).toMatchObject({ qid: "q2", answered: true, flagged: true, failed: false, current: true });
    expect(cells[2]).toMatchObject({ qid: "q3", answered: false, flagged: false, failed: true, current: false });
    expect(cells[3]).toMatchObject({ qid: "q4", answered: false, flagged: false, failed: false, current: false });
  });

  it("keeps indices aligned with the question order", () => {
    expect(cells.map((c) => c.index)).toEqual([0, 1, 2, 3]);
  });
});

describe("navCellA11y", () => {
  it("reads state honestly in Arabic (current, answered, flagged)", () => {
    const label = navCellA11y({
      qid: "q2",
      index: 1,
      current: true,
      answered: true,
      flagged: true,
      failed: false,
    });
    expect(label).toBe("السؤال 2 — الحالي — مُجاب — معلَّم للمراجعة");
  });

  it("calls out failed saves and unanswered cells", () => {
    expect(
      navCellA11y({ qid: "q3", index: 2, current: false, answered: false, flagged: false, failed: true }),
    ).toBe("السؤال 3 — تعذّر الحفظ");
    expect(
      navCellA11y({ qid: "q4", index: 3, current: false, answered: false, flagged: false, failed: false }),
    ).toBe("السؤال 4 — بدون إجابة");
  });
});

/* ── submit confirmation copy ──────────────────────────────────────── */

describe("unansweredNoteAr", () => {
  it("follows the four-form Arabic counted-noun grammar", () => {
    expect(unansweredNoteAr(1)).toBe("لديك سؤال واحد بدون إجابة.");
    expect(unansweredNoteAr(2)).toBe("لديك سؤالان بدون إجابة.");
    expect(unansweredNoteAr(5)).toBe("لديك 5 أسئلة بدون إجابة.");
    expect(unansweredNoteAr(11)).toBe("لديك 11 سؤالاً بدون إجابة.");
  });
});

/* ── exams list: status chips + timer-to-start ─────────────────────── */

describe("examStatusChip", () => {
  const base = {
    id: "t1",
    title: "الاختبار",
    kind: "QUIZ",
    status: "PUBLISHED",
    durationMin: 30,
    passingScore: 50,
  } as ExamTemplateRow;
  const now = Date.UTC(2025, 0, 15, 12, 0, 0);

  it("upcoming → sky chip with a human countdown to open", () => {
    const exam = { ...base, openAt: new Date(now + 2 * HOUR).toISOString() } as ExamTemplateRow;
    expect(examStatusChip(exam, now)).toEqual({ label: "يفتح بعد ساعتين", tone: "sky" });
  });

  it("live + startable → THE accent chip; resumable attempt keeps the accent", () => {
    const open = { ...base, openAt: new Date(now - HOUR).toISOString() } as ExamTemplateRow;
    expect(examStatusChip(open, now)).toEqual({ label: "متاح الآن", tone: "accent" });
    const resumable = {
      ...open,
      myAttempt: { id: "a1", templateId: "t1", status: "IN_PROGRESS" },
    } as ExamTemplateRow;
    expect(examStatusChip(resumable, now)).toEqual({ label: "متابعة المحاولة", tone: "accent" });
  });

  it("missed (closed, no attempt) → grey; expired attempt → rose", () => {
    const closed = {
      ...base,
      openAt: new Date(now - 3 * HOUR).toISOString(),
      closeAt: new Date(now - HOUR).toISOString(),
    } as ExamTemplateRow;
    expect(examStatusChip(closed, now)).toEqual({ label: "أغلق باب التسليم", tone: "grey" });
    const expired = {
      ...closed,
      myAttempt: { id: "a1", templateId: "t1", status: "EXPIRED" },
    } as ExamTemplateRow;
    expect(examStatusChip(expired, now).tone).toBe("rose");
  });

  it("graded → mint with the score; submitted → yellow pending manual grading", () => {
    const graded = {
      ...base,
      openAt: new Date(now - 3 * HOUR).toISOString(),
      closeAt: new Date(now - HOUR).toISOString(),
      myAttempt: { id: "a1", templateId: "t1", status: "GRADED", score: 8, maxScore: 10 },
    } as ExamTemplateRow;
    expect(examStatusChip(graded, now)).toEqual({ label: "ناجح · 8/10", tone: "mint" });
    const pending = {
      ...graded,
      myAttempt: { id: "a1", templateId: "t1", status: "SUBMITTED", score: 8, maxScore: 10 },
    } as ExamTemplateRow;
    expect(examStatusChip(pending, now).tone).toBe("yellow");
  });

  it("practice retake after a finished attempt stays grey (accent is act-now only)", () => {
    const practice = {
      ...base,
      kind: "PRACTICE",
      openAt: new Date(now - HOUR).toISOString(),
      myAttempt: { id: "a1", templateId: "t1", status: "GRADED", score: 8, maxScore: 10 },
    } as ExamTemplateRow;
    expect(examStatusChip(practice, now)).toEqual({ label: "تدريبي — إعادة متاحة", tone: "grey" });
  });
});

describe("fmtUntilAr", () => {
  it("uses accusative duals so «بعد …» reads grammatically", () => {
    expect(fmtUntilAr(30_000)).toBe("أقل من دقيقة");
    expect(fmtUntilAr(60_000)).toBe("دقيقة واحدة");
    expect(fmtUntilAr(120_000)).toBe("دقيقتين");
    expect(fmtUntilAr(5 * 60_000)).toBe("5 دقائق");
    expect(fmtUntilAr(2 * HOUR)).toBe("ساعتين");
    expect(fmtUntilAr(26 * HOUR)).toBe("يوم واحد");
  });
});

/* ── results share summary ─────────────────────────────────────────── */

describe("resultsShareText", () => {
  it("builds an honest Arabic summary capped at five courses", () => {
    const text = resultsShareText({
      avgGradePct: 82,
      courses: [
        { courseName: "رياضيات", gradePct: 90 },
        { courseName: "فيزياء", gradePct: 74 },
        { courseName: "كيمياء", gradePct: null },
        { courseName: "أحياء", gradePct: 88 },
        { courseName: "حاسب", gradePct: 80 },
        { courseName: "لغة", gradePct: 78 },
        { courseName: "تاريخ", gradePct: 82 },
      ],
    });
    expect(text).toContain("المتوسط العام: 82%");
    expect(text).toContain("• رياضيات: 90%");
    expect(text).toContain("• حاسب: 80%");
    expect(text).not.toContain("كيمياء"); // ungraded rows are not shared
    expect(text).toContain("ومقرّر آخر"); // 6 graded − 5 shared
  });
});

/* ── the offline queue → examsApi wiring the runner depends on ─────── */

describe("exam answer queue wiring (the runner's offline path)", () => {
  const fetchMock = globalThis.fetch as unknown as {
    mock: { calls: [string, { body?: string }][] };
  };
  const answerCalls = () =>
    fetchMock.mock.calls.filter(([url]) => String(url).includes("/exams/attempts/att-1/answer"));

  beforeEach(async () => {
    fetchMock.mock.calls.length = 0;
    await clearAnswerQueue();
  });

  it("enqueues offline and flushes onto POST /exams/attempts/:id/answer with the same shape as a direct send", async () => {
    await enqueueAnswer({ attemptId: "att-1", questionId: "q-9", choiceIndex: 2 });
    const report = await flushAnswers(sendAnswerViaExamsApi);
    expect(report).toMatchObject({ sent: 1, failed: 0, dropped: 0, remaining: 0 });

    const bodies = answerCalls().map(([, init]) => JSON.parse(init?.body ?? "{}"));
    expect(bodies).toEqual([{ questionId: "q-9", choiceIndex: 2 }]);
  });

  it("newest-wins: re-answering a still-pending question replaces it (one POST on flush)", async () => {
    await enqueueAnswer({ attemptId: "att-1", questionId: "q-1", choiceIndex: 0, now: 1 });
    await enqueueAnswer({ attemptId: "att-1", questionId: "q-1", choiceIndex: 3, now: 2 });
    const report = await flushAnswers(sendAnswerViaExamsApi);
    expect(report.sent).toBe(1);
    const bodies = answerCalls().map(([, init]) =>
      JSON.parse(init?.body ?? "{}") as { choiceIndex: number },
    );
    expect(bodies).toEqual([{ questionId: "q-1", choiceIndex: 3 }]);
  });
});
