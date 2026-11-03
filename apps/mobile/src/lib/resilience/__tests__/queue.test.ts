/**
 * R334 B8 — the offline exam-answer queue unit tests: enqueue/peek/flush,
 * stable-id conflict (newest wins), failure retry, permanent-drop, and
 * single-flight flush. AsyncStorage rides the global jest mock.
 */
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ANSWER_QUEUE_STORAGE_KEY,
  clearAnswerQueue,
  enqueueAnswer,
  flushAnswers,
  peekAnswers,
  pendingAnswerCount,
  removeAnswer,
  sendAnswerViaExamsApi,
  type QueuedAnswer,
} from "../queue";

beforeEach(async () => {
  await clearAnswerQueue();
});

afterEach(async () => {
  await clearAnswerQueue();
});

const mcq = (questionId: string, choiceIndex: number, attemptId = "a1") => ({
  attemptId,
  questionId,
  choiceIndex,
});

describe("enqueue / peek", () => {
  it("stores answers FIFO by enqueuedAt and derives stable ids", async () => {
    await enqueueAnswer({ ...mcq("q1", 2), now: 100 });
    await enqueueAnswer({ ...mcq("q2", 0), now: 50 });
    const items = await peekAnswers();
    expect(items.map((q) => q.questionId)).toEqual(["q2", "q1"]);
    expect(items[0].id).toBe("a1:q2");
    expect(items[0].attempts).toBe(0);
    expect(await pendingAnswerCount()).toBe(2);
  });

  it("CONFLICT: re-answering a pending question replaces it (newest wins)", async () => {
    await enqueueAnswer({ ...mcq("q1", 1), now: 100 });
    await enqueueAnswer({ ...mcq("q1", 3), now: 200 });
    const items = await peekAnswers();
    expect(items).toHaveLength(1);
    expect(items[0].choiceIndex).toBe(3);
    expect(items[0].enqueuedAt).toBe(200);
  });

  it("validates the payload honestly", async () => {
    await expect(enqueueAnswer({ attemptId: "", questionId: "q1", choiceIndex: 1 })).rejects.toThrow();
    await expect(enqueueAnswer({ attemptId: "a1", questionId: "q1" })).rejects.toThrow(
      /answerText or choiceIndex/,
    );
  });

  it("removeAnswer drops exactly one item", async () => {
    await enqueueAnswer(mcq("q1", 1));
    await enqueueAnswer(mcq("q2", 1));
    await removeAnswer("a1:q1");
    expect((await peekAnswers()).map((q) => q.questionId)).toEqual(["q2"]);
  });
});

describe("flushAnswers", () => {
  it("sends FIFO and empties the queue on success", async () => {
    await enqueueAnswer({ ...mcq("q1", 2), now: 10 });
    await enqueueAnswer({ ...mcq("q2", 1), now: 20 });
    const sent: string[] = [];
    const report = await flushAnswers(async (item) => {
      sent.push(item.id);
    });
    expect(sent).toEqual(["a1:q1", "a1:q2"]);
    expect(report).toMatchObject({ sent: 2, failed: 0, dropped: 0, remaining: 0 });
    expect(await peekAnswers()).toEqual([]);
  });

  it("FAILURE RETRY: failed sends stay queued with attempts + lastError, then succeed", async () => {
    await enqueueAnswer({ ...mcq("q1", 2), now: 10 });
    await enqueueAnswer({ attemptId: "a1", questionId: "q9", answerText: "تحليل", now: 20 });

    let fail = true;
    const report1 = await flushAnswers(async () => {
      if (fail) throw new Error("NETWORK: تعذّر الاتصال");
    });
    expect(report1).toMatchObject({ sent: 0, failed: 2, remaining: 2 });

    const afterFail = await peekAnswers();
    expect(afterFail.every((q) => q.attempts === 1)).toBe(true);
    expect(afterFail.every((q) => q.lastError === "NETWORK: تعذّر الاتصال")).toBe(true);
    expect(afterFail.every((q) => typeof q.lastTriedAt === "number")).toBe(true);

    fail = false;
    const report2 = await flushAnswers(async () => undefined);
    expect(report2).toMatchObject({ sent: 2, failed: 0, remaining: 0 });
    expect(await peekAnswers()).toEqual([]);
  });

  it("shouldDrop marks permanent failures as dropped (reported, not silent)", async () => {
    await enqueueAnswer(mcq("q1", 1));
    const gone = new Error("attempt closed");
    const report = await flushAnswers(
      async () => {
        throw gone;
      },
      { shouldDrop: (err) => err === gone },
    );
    expect(report).toMatchObject({ sent: 0, failed: 0, dropped: 1, remaining: 0 });
    expect(await peekAnswers()).toEqual([]);
  });

  it("single-flight: concurrent flushes share one run", async () => {
    await enqueueAnswer(mcq("q1", 1));
    await enqueueAnswer(mcq("q2", 1));
    let calls = 0;
    const sender = async () => {
      calls += 1;
      await Promise.resolve();
    };
    const [r1, r2] = await Promise.all([flushAnswers(sender), flushAnswers(sender)]);
    expect(calls).toBe(2); // each item sent exactly once, not four times
    expect(r1).toEqual(r2);
    expect(await pendingAnswerCount()).toBe(0);
  });

  it("carries the full answer shape to the sender (aligned with examsApi.answer)", async () => {
    await enqueueAnswer({ attemptId: "a7", questionId: "q3", answerText: "جواب مقالي" });
    let seen: QueuedAnswer | null = null;
    await flushAnswers(async (item) => {
      seen = item;
    });
    expect(seen).toMatchObject({
      attemptId: "a7",
      questionId: "q3",
      answerText: "جواب مقالي",
    });
  });
});

describe("the shipped sender", () => {
  it("is wired to examsApi.answer with the checkpoint payload shape", async () => {
    // The adapter posts through the (globally mocked) fetch — assert the
    // wire shape: URL, method, and the examsApi.answer payload.
    const item: QueuedAnswer = {
      id: "a1:q1",
      attemptId: "a1",
      questionId: "q1",
      choiceIndex: 3,
      enqueuedAt: 1,
      attempts: 0,
    };
    await sendAnswerViaExamsApi(item);
    const fetchMock = globalThis.fetch as unknown as {
      mock: { calls: [string, { method?: string; body?: string }][] };
    };
    const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    expect(String(url)).toContain("/exams/attempts/a1/answer");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body ?? "{}")).toEqual({ questionId: "q1", choiceIndex: 3 });
  });
});

describe("storage honesty", () => {
  it("persists under the documented key as JSON", async () => {
    await enqueueAnswer(mcq("q1", 1));
    const raw = await AsyncStorage.getItem(ANSWER_QUEUE_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string) as QueuedAnswer[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("a1:q1");
  });
});
