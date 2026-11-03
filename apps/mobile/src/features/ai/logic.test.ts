/**
 * features/ai/logic — the pure Assistant logic net (R334 3-f).
 *
 * Pins the two state machines the chat UX rides on: the role-aware
 * suggestion pool (rotation per conversation) and the chat-turn lifecycle
 * (streaming → done / stopped / error, retry), plus quota classification,
 * citation chips, and the markdown fence splitter. No renderer, no I/O.
 */
import { describe, expect, it } from "@jest/globals";
import { splitCodeFences } from "./Markdown";
import {
  appendDelta,
  beginTurn,
  canSend,
  citationChipLabel,
  completeTurn,
  dropFailedTurn,
  failTurn,
  isCitationOpenable,
  isQuotaError,
  nextTurnKey,
  pickSuggestions,
  retryTarget,
  stopTurn,
  streamingKey,
  type ChatTurn,
} from "./logic";

describe("pickSuggestions — role + rotation", () => {
  it("serves a bounded, role-aware set", () => {
    const student = pickSuggestions("student", 0, 4);
    const teacher = pickSuggestions("teacher", 0, 4);
    expect(student).toHaveLength(4);
    expect(teacher).toHaveLength(4);
    expect(student.map((s) => s.id)).not.toEqual(teacher.map((s) => s.id));
    for (const s of [...student, ...teacher]) {
      expect(s.label.trim().length).toBeGreaterThan(0);
      expect(s.prompt.trim().length).toBeGreaterThan(0);
    }
  });

  it("rotates the pool by offset — fresh chips for the next conversation", () => {
    const first = pickSuggestions("student", 0, 4).map((s) => s.id);
    const second = pickSuggestions("student", 1, 4).map((s) => s.id);
    expect(second[0]).toBe(first[1]);
    expect(second).not.toEqual(first);
  });

  it("wraps the pool without repeating a chip", () => {
    const rotated = pickSuggestions("teacher", 4, 4).map((s) => s.id);
    expect(new Set(rotated).size).toBe(4);
  });

  it("never asks for more chips than the pool holds", () => {
    expect(pickSuggestions("student", 0, 99).length).toBeLessThanOrEqual(6);
  });
});

describe("the chat turn state machine", () => {
  const start = (text: string, key = "a-1"): ChatTurn[] => beginTurn([], text, key);

  it("beginTurn appends the user message + a streaming placeholder", () => {
    const msgs = start("ما الفرق بين الكومة والطابور؟");
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ role: "user", content: "ما الفرق بين الكومة والطابور؟", status: "done" });
    expect(msgs[1]).toMatchObject({ role: "assistant", content: "", status: "streaming", key: "a-1" });
    expect(canSend(msgs)).toBe(false);
    expect(streamingKey(msgs)).toBe("a-1");
  });

  it("appendDelta grows only the streaming assistant turn", () => {
    let msgs = start("س");
    msgs = appendDelta(msgs, "a-1", "الجواب");
    msgs = appendDelta(msgs, "a-1", " الجزء الثاني");
    expect(msgs[1].content).toBe("الجواب الجزء الثاني");
    // deltas after completion are ignored (a late chunk can't resurrect a turn)
    msgs = completeTurn(msgs, "a-1", { reply: "النص النهائي", messageId: "m1" });
    const frozen = appendDelta(msgs, "a-1", "متأخر");
    expect(frozen[1].content).toBe("النص النهائي");
  });

  it("completeTurn replaces the buffer with the server's reply (done wins)", () => {
    let msgs = start("س");
    msgs = appendDelta(msgs, "a-1", "ناقص بسبب انقطاع");
    msgs = completeTurn(msgs, "a-1", {
      reply: "الرد الكامل كما حفظه الخادم",
      messageId: "m9",
      engine: "local",
      model: "composer",
      citations: [{ index: 1, title: "مصدر", locator: null, url: null, snippet: "" }],
    });
    expect(msgs[1]).toMatchObject({
      status: "done",
      content: "الرد الكامل كما حفظه الخادم",
      messageId: "m9",
      model: "composer",
    });
    expect(msgs[1].citations).toHaveLength(1);
    expect(canSend(msgs)).toBe(true);
  });

  it("stopTurn keeps the partial text and marks it stopped (an honest label)", () => {
    let msgs = start("س");
    msgs = appendDelta(msgs, "a-1", "نصف جواب");
    msgs = stopTurn(msgs, "a-1");
    expect(msgs[1]).toMatchObject({ status: "stopped", content: "نصف جواب" });
    expect(retryTarget(msgs)).toBeNull(); // a stop is not a failure
    expect(canSend(msgs)).toBe(true);
  });

  it("failTurn + retryTarget + dropFailedTurn — the retry loop", () => {
    let msgs = start("السؤال الفاشل", "a-1");
    msgs = failTurn(msgs, "a-1", "تعذّر الاتصال بالخادم");
    expect(msgs[1]).toMatchObject({ status: "error", error: "تعذّر الاتصال بالخادم" });

    const target = retryTarget(msgs);
    expect(target).toEqual({ key: "a-1", prompt: "السؤال الفاشل" });

    // retry drops the failed bubble AND its user question, then re-asks
    const dropped = dropFailedTurn(msgs, "a-1");
    expect(dropped).toHaveLength(0);
    expect(retryTarget(dropped)).toBeNull();

    // a later failure wins retryTarget (the last one is the live one)
    let two = beginTurn(dropped, "سؤال ثانٍ", "a-2");
    two = failTurn(two, "a-2", "خطأ");
    expect(retryTarget(two)).toEqual({ key: "a-2", prompt: "سؤال ثانٍ" });
  });

  it("retryTarget returns null when the failed bubble lost its user turn", () => {
    const msgs = failTurn([{ key: "a-x", role: "assistant", content: "", status: "streaming" }], "a-x", "خطأ");
    expect(retryTarget(msgs)).toBeNull();
  });

  it("nextTurnKey is unique per call", () => {
    const keys = new Set([nextTurnKey("assistant"), nextTurnKey("assistant"), nextTurnKey("user")]);
    expect(keys.size).toBe(3);
  });
});

describe("quota classification", () => {
  it("recognizes the backend's Arabic quota marker and bare 429s", () => {
    expect(isQuotaError({ status: 429, message: "أي شيء" })).toBe(true);
    expect(isQuotaError({ status: 200, message: "وصلتَ حدَّ الأسئلة اليوميّ — عُد غدًا" })).toBe(true);
    expect(isQuotaError({ status: 500, message: "خطأ في الخادم" })).toBe(false);
    expect(isQuotaError(null)).toBe(false);
  });
});

describe("citation chips", () => {
  it("labels with the locator when present, plain title otherwise", () => {
    expect(citationChipLabel({ index: 1, title: "محاضرة ٢", locator: "ص ٥", url: null, snippet: "" })).toBe(
      "محاضرة ٢ (ص ٥)",
    );
    expect(citationChipLabel({ index: 2, title: "ملف", locator: null, url: null, snippet: "" })).toBe("ملف");
    expect(citationChipLabel({ index: 3, title: "  ", locator: " ", url: null, snippet: "" })).toBe("مصدر");
  });

  it("only http(s) citations are openable (no dead links)", () => {
    expect(isCitationOpenable({ index: 1, title: "t", locator: null, url: "https://x.example", snippet: "" })).toBe(true);
    expect(isCitationOpenable({ index: 1, title: "t", locator: null, url: "javascript:alert(1)", snippet: "" })).toBe(false);
    expect(isCitationOpenable({ index: 1, title: "t", locator: null, url: null, snippet: "" })).toBe(false);
  });
});

describe("splitCodeFences — streaming-safe markdown fences", () => {
  it("separates prose and code, keeping the language tag", () => {
    const segments = splitCodeFences("شرح:\n\n```ts\nconst x = 1;\n```\n\nوخلاصة.");
    expect(segments).toEqual([
      { kind: "prose", text: "شرح:" },
      { kind: "code", text: "const x = 1;", lang: "ts" },
      { kind: "prose", text: "وخلاصة." },
    ]);
  });

  it("renders an unterminated fence (mid-stream) as a live code block", () => {
    const segments = splitCodeFences("جارٍ الكتابة:\n```py\nprint(");
    expect(segments).toEqual([
      { kind: "prose", text: "جارٍ الكتابة:" },
      { kind: "code", text: "print(", lang: "py" },
    ]);
  });

  it("handles multiple fences and empty input", () => {
    expect(splitCodeFences("```\na\n```\n```\nb\n```")).toEqual([
      { kind: "code", text: "a", lang: undefined },
      { kind: "code", text: "b", lang: undefined },
    ]);
    expect(splitCodeFences("")).toEqual([]);
    expect(splitCodeFences("نص عادي فقط")).toEqual([{ kind: "prose", text: "نص عادي فقط" }]);
  });
});
