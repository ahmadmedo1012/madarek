/**
 * R334 2-h — the shared Arabic error humanizer contract (colocated).
 *
 * Pins the precedence chain: `userMessage` passthrough → already-Arabic
 * message passthrough (the client.ts / D17-3 normalization — the most
 * specific copy wins verbatim) → known ApiError/backend codes → known
 * HTTP statuses → English-phrase dictionary → generic Arabic fallback.
 * The hard invariant: the result ALWAYS carries Arabic glyphs — raw
 * English `error.message` text never reaches a user, whatever the input
 * (including undefined/null and unknown garbage).
 */
import { describe, expect, it } from "@jest/globals";
import { ApiError } from "../api/client";
import { humanizeError } from "./errors";

const ARABIC = /[\u0600-\u06FF]/;

describe("humanizeError — normalized / Arabic passthrough", () => {
  it("passes the transport's normalized ApiError messages verbatim", () => {
    // The exact offline copy src/api/client.ts throws (code NETWORK).
    const network = new ApiError(
      "NETWORK",
      "تعذّر الاتصال بالخادم — تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.",
      0,
    );
    expect(humanizeError(network)).toBe(
      "تعذّر الاتصال بالخادم — تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.",
    );

    // Session-expiry copy from the 401 refresh path.
    const session = new ApiError("UNAUTHENTICATED", "انتهت صلاحية الجلسة — سجّل الدخول من جديد", 401);
    expect(humanizeError(session)).toBe("انتهت صلاحية الجلسة — سجّل الدخول من جديد");
  });

  it("passes backend-shaped AppError JSON (Arabic message + code) verbatim", () => {
    const backend = {
      name: "AppError",
      code: "FORBIDDEN",
      message: "هذا القسم مخصص للمشرفين فقط",
      status: 403,
    };
    // The specific Arabic message wins over the generic code copy.
    expect(humanizeError(backend)).toBe("هذا القسم مخصص للمشرفين فقط");
  });

  it("honors an explicit Arabic userMessage slot above everything else", () => {
    expect(humanizeError({ userMessage: "رسالة مخصّصة للمستخدم", message: "Unauthorized" })).toBe(
      "رسالة مخصّصة للمستخدم",
    );
  });
});

describe("humanizeError — known codes, statuses, and English patterns", () => {
  it("maps by code when the message is not Arabic", () => {
    expect(humanizeError({ code: "NETWORK", message: "fetch failed", status: 0 })).toMatch(ARABIC);
    expect(humanizeError({ code: "FORBIDDEN", message: "Forbidden", status: 403 })).toBe(
      "ليست لديك صلاحية الوصول إلى هذا المحتوى.",
    );
    expect(humanizeError({ code: "TOO_MANY_REQUESTS", message: "Slow down", status: 429 })).toMatch(ARABIC);
  });

  it("maps by HTTP status when the code is unrecognized", () => {
    expect(humanizeError({ code: "HTTP_ERROR", message: "Bad Gateway", status: 502 })).toMatch(ARABIC);
    expect(humanizeError({ status: 404, message: "nope" })).toBe("لم يتم العثور على المطلوب.");
  });

  it("maps common English error phrases to Arabic", () => {
    expect(humanizeError(new Error("Unauthorized"))).toMatch(ARABIC);
    expect(humanizeError(new Error("Access denied"))).toBe("ليست لديك صلاحية الوصول إلى هذا المحتوى.");
    expect(humanizeError(new Error("Resource not found"))).toMatch(ARABIC);
    expect(humanizeError(new Error("Network request failed"))).toMatch(ARABIC);
    expect(humanizeError(new Error("Request timeout"))).toMatch(ARABIC);
    expect(humanizeError(new Error("Internal Server Error"))).toMatch(ARABIC);
    expect(humanizeError(new Error("Validation failed: email is required"))).toMatch(ARABIC);
    expect(humanizeError(new Error("Too many requests"))).toMatch(ARABIC);
  });

  it("lowercases mixed-case input before pattern matching", () => {
    expect(humanizeError(new Error("NETWORK Error: Connection Refused"))).toMatch(ARABIC);
  });
});

describe("humanizeError — unknown garbage and empty inputs", () => {
  it("returns the generic Arabic sentence for unrecognized junk", () => {
    expect(humanizeError(new Error("ECONNRESET 0xdeadbeef xyz"))).toBe("حدث خطأ غير متوقع، حاول مرة أخرى");
    expect(humanizeError({ weird: true })).toBe("حدث خطأ غير متوقع، حاول مرة أخرى");
    expect(humanizeError(42)).toBe("حدث خطأ غير متوقع، حاول مرة أخرى");
    expect(humanizeError("plain english string")).toBe("حدث خطأ غير متوقع، حاول مرة أخرى");
  });

  it("never returns non-Arabic text and never throws on empty inputs", () => {
    expect(humanizeError(undefined)).toBe("حدث خطأ غير متوقع، حاول مرة أخرى");
    expect(humanizeError(null)).toBe("حدث خطأ غير متوقع، حاول مرة أخرى");
    expect(humanizeError("")).toBe("حدث خطأ غير متوقع، حاول مرة أخرى");
    // The hard invariant across every branch: the output is Arabic.
    for (const input of [undefined, null, new Error("Boom"), { code: "X" }, "junk"]) {
      expect(humanizeError(input)).toMatch(ARABIC);
    }
  });
});
