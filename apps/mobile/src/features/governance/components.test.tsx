/**
 * R334 (3-j Governance Round 2) — the no-raw-enum contract, colocated
 * with the GOV kit that owns it.
 *
 * The rule (docs/mobile/screens/governance.md): a KNOWN enum renders its
 * web-parity Arabic label; an UNKNOWN enum renders the honest Arabic
 * fallback («غير معروف» or a scoped sibling) — NEVER the raw internal
 * code (SYNC_*, INST_STATUS, English severity words, provider codes…).
 *
 * Pure-function tests for every label helper added/migrated in Round 2
 * plus render smoke for the shared chips (one Badge vocabulary) and the
 * UserAvatar fallback contract (initials when no URL — a broken image
 * never renders).
 *
 * NOT verified here: on-device image loading, tone color perception —
 * no emulator in this sandbox (honesty label).
 */
import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";
import {
  DIFFICULTY_TONE,
  EXAM_KIND_LABEL,
  LOGIN_REASON_LABEL,
  PAPER_STATUS_LABEL,
  SEVERITY_LABEL,
  SYNC_STATUS_LABEL,
  UNKNOWN_LABEL,
  InstitutionStatusChip,
  PaperStatusChip,
  SeverityChip,
  SyncStatusChip,
  UserAvatar,
  alertCategoryLabel,
  auditActionLabel,
  avatarUrlOf,
  difficultyLabel,
  feedbackKindLabel,
  feedbackStatusLabel,
  instStatusLabel,
  loginReasonLabel,
  questionTypeLabel,
  resourceLabel,
  settingCategoryLabel,
  syncStatusLabel,
} from "./components";

describe("R334 governance kit — label maps cover the backend enums", () => {
  it("sync statuses: every SYNC_STATUS_LABEL key stays Arabic-labelled", () => {
    for (const [code, label] of Object.entries(SYNC_STATUS_LABEL)) {
      expect(syncStatusLabel(code)).toBe(label);
      expect(label).toMatch(/[\u0600-\u06FF]/);
    }
    // Unknown codes never render raw (the original leak: `SYNC_QUEUED`).
    expect(syncStatusLabel("SYNC_QUEUED")).toBe("غير معروفة");
    expect(syncStatusLabel("RUNNING_2")).toBe("غير معروفة");
    expect(syncStatusLabel(null)).toBe("—");
    expect(syncStatusLabel(undefined)).toBe("—");
  });

  it("login reasons: known codes map, unknown read «سبب آخر», null is a dash", () => {
    expect(loginReasonLabel("INVALID_CREDENTIALS")).toBe("بيانات دخول غير صحيحة");
    expect(loginReasonLabel("TOTALLY_NEW_CODE")).toBe("سبب آخر");
    expect(loginReasonLabel("")).toBe("—");
  });

  it("question types + difficulty: web QTYPE/DIFFICULTY parity, unknown → غير معروف", () => {
    expect(questionTypeLabel("MCQ")).toBe("اختيار من متعدد");
    expect(questionTypeLabel("TRUE_FALSE")).toBe("صح أم خطأ");
    expect(questionTypeLabel("ESSAY")).toBe("سؤال مقالي");
    expect(questionTypeLabel("ORAL")).toBe(UNKNOWN_LABEL);
    expect(difficultyLabel("EASY")).toBe("سهل");
    expect(difficultyLabel("HARD")).toBe("صعب");
    expect(difficultyLabel("EXTREME")).toBe(UNKNOWN_LABEL);
    // The tone budget is mint/yellow/rose only (adjacent chips never blur).
    expect(Object.values(DIFFICULTY_TONE).every((t) => ["mint", "yellow", "rose"].includes(t))).toBe(true);
  });

  it("institution + feedback statuses: known Arabic, unknown never raw", () => {
    expect(instStatusLabel("ACTIVE")).toBe("نشطة");
    expect(instStatusLabel("SUSPENDED")).toBe("معلّقة");
    expect(instStatusLabel("ARCHIVED")).toBe(UNKNOWN_LABEL);
    expect(feedbackStatusLabel("open")).toBe("مفتوحة");
    expect(feedbackStatusLabel("deferred")).toBe(UNKNOWN_LABEL);
  });

  it("setting categories: known keys Arabic, free-form strings read «فئة أخرى»", () => {
    expect(settingCategoryLabel("general")).toBe("عام");
    expect(settingCategoryLabel("storage")).toBe("التخزين");
    expect(settingCategoryLabel("some-random-key")).toBe("فئة أخرى");
    expect(settingCategoryLabel(null)).toBe("—");
  });

  it("audit actions + resources: unknown codes get the generic Arabic label", () => {
    expect(auditActionLabel("user.login")).toBe("تسجيل دخول ناجح");
    expect(auditActionLabel("totally.unknown.action")).toBe("عمليّة إداريّة");
    expect(resourceLabel("User")).toBe("مستخدم");
    expect(resourceLabel("MysteryModel")).toBe("مورد");
    expect(resourceLabel(null)).toBe("");
  });

  it("alert severities/categories: both casings covered, unknown → غير معروف / أخرى", () => {
    for (const key of ["critical", "CRITICAL", "warning", "INFO"]) {
      expect(SEVERITY_LABEL[key]).toBeTruthy();
    }
    expect(alertCategoryLabel("plagiarism")).toBe("الاقتباس");
    expect(alertCategoryLabel("quantum")).toBe("أخرى");
  });

  it("feedback kinds: BUG/IDEA labelled, anything else never renders raw", () => {
    expect(feedbackKindLabel("BUG")).toBe("مشكلة");
    expect(feedbackKindLabel("IDEA")).toBe("اقتراح");
    expect(feedbackKindLabel("PRAISE")).toBe(UNKNOWN_LABEL);
    expect(feedbackKindLabel(null)).toBe("—");
  });

  it("paper statuses + exam kinds keep the R334 Round-1 maps intact", () => {
    expect(PAPER_STATUS_LABEL.PUBLISHED).toBe("منشورة");
    expect(EXAM_KIND_LABEL.FINAL).toBe("نهائي");
    expect(Object.keys(LOGIN_REASON_LABEL).length).toBeGreaterThan(5);
  });
});

describe("R334 governance kit — shared chips render the Arabic label", () => {
  it("SyncStatusChip: known + unknown statuses (no raw codes in the tree)", async () => {
    const ok = await render(<SyncStatusChip status="SUCCESS" />);
    expect(ok.getByText("ناجحة")).toBeTruthy();
    const weird = await render(<SyncStatusChip status="SYNC_WEIRD" />);
    expect(weird.getByText("غير معروفة")).toBeTruthy();
    const none = await render(<SyncStatusChip status={null} />);
    expect(none.getByText("—")).toBeTruthy();
  });

  it("SeverityChip + PaperStatusChip + InstitutionStatusChip: one vocabulary", async () => {
    const crit = await render(<SeverityChip severity="critical" />);
    expect(crit.getByText("حرج")).toBeTruthy();
    const strange = await render(<SeverityChip severity="STRANGE" />);
    expect(strange.getByText(UNKNOWN_LABEL)).toBeTruthy();
    const paper = await render(<PaperStatusChip status="PUBLISHED" />);
    expect(paper.getByText("منشورة")).toBeTruthy();
    const inst = await render(<InstitutionStatusChip status="ACTIVE" />);
    expect(inst.getByText("نشطة")).toBeTruthy();
    const frozen = await render(<InstitutionStatusChip status="FROZEN" />);
    expect(frozen.getByText(UNKNOWN_LABEL)).toBeTruthy();
  });
});

describe("R334 governance kit — UserAvatar fallback contract", () => {
  it("avatarUrlOf: only a non-empty string payload counts as a URL", () => {
    expect(avatarUrlOf({ avatarUrl: "https://x.test/a.png" })).toBe("https://x.test/a.png");
    expect(avatarUrlOf({ avatarUrl: "  " })).toBeNull();
    expect(avatarUrlOf({ avatarUrl: 42 })).toBeNull();
    expect(avatarUrlOf({})).toBeNull();
    expect(avatarUrlOf(null)).toBeNull();
  });

  it("no URL → initials circle only (the roster default)", async () => {
    const { getByText } = await render(<UserAvatar initials="أم" />);
    expect(getByText("أم")).toBeTruthy();
  });
});
