/**
 * r349-P4 — the phone-validation mirror's contract, pinned.
 *
 * The authority is backend/src/lib/phones.ts (normalizePhone + its 20
 * tests); this mirror only previews that verdict for the typing user.
 * These tests pin the RECOGNIZED FORMS (the same list the web's mirror
 * documents), the Eastern-Arabic folding, and the tel:/wa.me verb
 * derivation the contact sheet rides — a drift here breaks the
 * dialer, so it never ships silently.
 */
import { describe, expect, it } from "@jest/globals";
import { checkLibyanPhone, foldDigits, telHref, waHref } from "./phone-validation";

describe("checkLibyanPhone — the recognized Libyan forms", () => {
  it("accepts the local mobile form with the leading 0 (10 digits)", () => {
    expect(checkLibyanPhone("0912345678")).toEqual({ ok: true, normalized: "218912345678" });
    expect(checkLibyanPhone("091 234 5678")).toEqual({ ok: true, normalized: "218912345678" });
  });

  it("accepts the bare national significant number (9X… mobile / 2X… landline)", () => {
    expect(checkLibyanPhone("912345678")).toEqual({ ok: true, normalized: "218912345678" });
    expect(checkLibyanPhone("212345678")).toEqual({ ok: true, normalized: "218212345678" });
  });

  it("accepts the Libyan landline local form", () => {
    expect(checkLibyanPhone("0211234567")).toEqual({ ok: true, normalized: "218211234567" });
  });

  it("accepts the international Libyan forms (+218 / 00218 / 218…)", () => {
    expect(checkLibyanPhone("+218 91 234 5678")).toEqual({ ok: true, normalized: "218912345678" });
    expect(checkLibyanPhone("00218 91 234 5678")).toEqual({ ok: true, normalized: "218912345678" });
    expect(checkLibyanPhone("218912345678")).toEqual({ ok: true, normalized: "218912345678" });
  });

  it("keeps other international numbers as typed (explicit +)", () => {
    expect(checkLibyanPhone("+44 7911 123456")).toEqual({ ok: true, normalized: "447911123456" });
  });

  it("folds Eastern-Arabic digits before deciding", () => {
    expect(checkLibyanPhone("٠٩١٢٣٤٥٦٧٨")).toEqual({ ok: true, normalized: "218912345678" });
    expect(foldDigits("٠٩١٢-٣٤٥")).toBe("0912-345");
  });
});

describe("checkLibyanPhone — the rejections (Arabic reasons)", () => {
  it("rejects the empty and digit-less input", () => {
    expect(checkLibyanPhone("")).toEqual({ ok: false, reasonAr: "أدخل رقم الهاتف" });
    expect(checkLibyanPhone("   ")).toEqual({ ok: false, reasonAr: "أدخل رقم الهاتف" });
    expect(checkLibyanPhone("abc")).toEqual({ ok: false, reasonAr: "الرقم يجب أن يحتوي خانات رقمية" });
  });

  it("rejects the too-short number with the Libyan hint", () => {
    const r = checkLibyanPhone("0912345");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasonAr).toContain("الرقم قصير");
  });

  it("rejects unknown shapes (an 8-digit trunk form is neither fish nor fowl)", () => {
    const r = checkLibyanPhone("09123456");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasonAr).toContain("صيغة غير معروفة");
  });

  it("rejects unknown shapes", () => {
    const r = checkLibyanPhone("1234567890123456");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasonAr).toContain("صيغة غير معروفة");
  });
});

describe("the contact verbs (telHref / waHref)", () => {
  it("derives tel:+218… from a valid display", () => {
    expect(telHref("0912345678")).toBe("+218912345678");
    expect(telHref("+218 91 234 5678")).toBe("+218912345678");
  });

  it("derives the wa.me form (digits, no plus)", () => {
    expect(waHref("0912345678")).toBe("https://wa.me/218912345678");
  });

  it("never hands the dialer a masked or malformed display", () => {
    expect(telHref(null)).toBeNull();
    expect(telHref("")).toBeNull();
    expect(telHref("لا يوجد")).toBeNull();
    expect(telHref("1234567890123456")).toBeNull();
    expect(waHref("ليس رقمًا")).toBeNull();
  });
});
