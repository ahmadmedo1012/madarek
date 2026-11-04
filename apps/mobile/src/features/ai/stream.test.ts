/**
 * features/ai/stream — the pure SSE frame parser net (R334 3-f).
 *
 * Pins the wire grammar the backend serves (backend ai.routes.ts r323
 * B1.1) against chunk boundaries that mean nothing: token accumulation,
 * done/error frames, keep-alive noise, CRLF, and the trailing frame that
 * arrives without its closing blank line. The XHR transport itself is
 * device-only verification (no emulator in this sandbox — honesty label).
 */
import { describe, expect, it } from "@jest/globals";
import { canStreamAi, createAiSseParser, isStreamAbortError, type AiSseEvent } from "./stream";

function collect(): { events: AiSseEvent[]; push: (chunk: string) => void; end: () => void } {
  const events: AiSseEvent[] = [];
  const parser = createAiSseParser((ev) => events.push(ev));
  return { events, push: parser.push, end: parser.end };
}

describe("createAiSseParser — token frames", () => {
  it("emits one token per frame", () => {
    const { events, push } = collect();
    push('event: token\ndata: {"t":"مرح"}\n\n');
    push('event: token\ndata: {"t":"با"}\n\n');
    expect(events).toEqual([
      { kind: "token", delta: "مرح" },
      { kind: "token", delta: "با" },
    ]);
  });

  it("survives a frame split across two reads (chunk boundaries mean nothing)", () => {
    const { events, push } = collect();
    push('event: tok');
    push('en\ndata: {"t":"A"');
    push('}\n\n');
    expect(events).toEqual([{ kind: "token", delta: "A" }]);
  });

  it("skips empty deltas and non-string t", () => {
    const { events, push } = collect();
    push('event: token\ndata: {"t":""}\n\n');
    push('event: token\ndata: {"t":42}\n\n');
    expect(events).toEqual([]);
  });
});

describe("createAiSseParser — done frames", () => {
  it("carries the final turn verbatim", () => {
    const { events, push } = collect();
    push(
      'event: done\ndata: {"conversationId":"c1","messageId":"m1","reply":"الجواب","engine":"local","model":"composer","remaining":3}\n\n',
    );
    expect(events).toEqual([
      {
        kind: "done",
        final: {
          conversationId: "c1",
          messageId: "m1",
          reply: "الجواب",
          engine: "local",
          model: "composer",
          remaining: 3,
        },
      },
    ]);
  });

  it("parses citations (the r323 B1.2 retrieval list)", () => {
    const { events, push } = collect();
    push(
      'event: done\ndata: {"conversationId":"c","messageId":"m","reply":"r","citations":[{"index":1,"title":"محاضرة ٣","locator":"ص ١٢","url":"https://x.example","snippet":"..."}]}\n\n',
    );
    expect(events[0]).toEqual({
      kind: "done",
      final: expect.objectContaining({
        citations: [expect.objectContaining({ title: "محاضرة ٣", locator: "ص ١٢" })],
      }),
    });
  });
});

describe("createAiSseParser — error frames + noise", () => {
  it("defaults the typed error fields when the frame is sparse", () => {
    const { events, push } = collect();
    push("event: error\ndata: {}\n\n");
    expect(events).toEqual([
      {
        kind: "error",
        error: { code: "PROVIDER_FAILURE", message: "تعذَّر توليد الردّ — أعد المحاولة", retryable: true },
      },
    ]);
  });

  it("honors retryable: false", () => {
    const { events, push } = collect();
    push('event: error\ndata: {"code":"QUOTA","message":"وصلتَ حدَّ الأسئلة اليوميّ","retryable":false}\n\n');
    expect(events[0]).toEqual({
      kind: "error",
      error: { code: "QUOTA", message: "وصلتَ حدَّ الأسئلة اليوميّ", retryable: false },
    });
  });

  it("skips comments, event-less frames, and malformed data (never content)", () => {
    const { events, push } = collect();
    push(": keep-alive\n\n");
    push('data: not json\n\n');
    push('event: token\ndata: {"t":"ok"}\n\n');
    expect(events).toEqual([{ kind: "token", delta: "ok" }]);
  });

  it("tolerates CRLF endings", () => {
    const { events, push } = collect();
    push('event: token\r\ndata: {"t":"س"}\r\n\r\n');
    expect(events).toEqual([{ kind: "token", delta: "س" }]);
  });

  it("end() flushes a trailing frame that lacked the closing blank line", () => {
    const { events, push, end } = collect();
    push('event: done\ndata: {"conversationId":"c","messageId":"m","reply":"r"}');
    expect(events).toEqual([]);
    end();
    expect(events).toEqual([
      { kind: "done", final: { conversationId: "c", messageId: "m", reply: "r" } },
    ]);
  });
});

describe("stream helpers", () => {
  it("canStreamAi() is exactly the XHR + AbortController capability probe", () => {
    // jest's node env has no XMLHttpRequest — the probe must say so
    // honestly (the JSON grammar fallback takes over); RN + web both have it.
    expect(canStreamAi()).toBe(
      typeof XMLHttpRequest === "function" && typeof AbortController === "function",
    );
  });

  it("isStreamAbortError reads the DOM name convention", () => {
    const abort = new Error("x");
    abort.name = "AbortError";
    expect(isStreamAbortError(abort)).toBe(true);
    expect(isStreamAbortError(new Error("x"))).toBe(false);
    expect(isStreamAbortError(null)).toBe(false);
  });
});
