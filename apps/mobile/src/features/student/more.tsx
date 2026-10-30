/**
 * Student beyond-learning shared kit — label maps, window/verdict logic
 * and tiny presentational bits owned by the Student More agent.
 * Mirrors: frontend OnlineExamsPages / ResearchPage / LibraryPage /
 * MorePages / LivePage / LabsPage / JobsPage / MoocPage Arabic copy.
 */
import { type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { latn, pct } from "@/lib/format";
import type { StatusToneName } from "@/design/tokens";
import type { ExamTemplateRow } from "@/api/exams";

/* ── Arabic counted nouns (web countAr four-form grammar) ────────── */
export function countAr(n: number, forms: [string, string, string, string]): string {
  const v = Math.abs(n);
  if (v === 1) return forms[0];
  if (v === 2) return forms[1];
  if (v >= 3 && v <= 10) return `${latn(v)} ${forms[2]}`;
  return `${latn(v)} ${forms[3]}`;
}

/** «نقطة واحدة» / «نقطتان» / «N نقاط» (D17-2 grammar). */
export function pointsAr(n: number): string {
  return countAr(n, ["نقطة واحدة", "نقطتان", "نقاط", "نقطة"]);
}

/* ── Exam kinds ──────────────────────────────────────────────────── */
export const KIND_LABEL: Record<string, string> = {
  QUIZ: "اختبار قصير",
  MIDTERM: "نصفي",
  FINAL: "نهائي",
  PRACTICE: "تدريبي",
};

export const KIND_TONE: Record<string, StatusToneName> = {
  QUIZ: "sky",
  MIDTERM: "lavender",
  FINAL: "copper",
  PRACTICE: "mint",
};

/* ── Exam window (web examWindowState — the backend start guards) ── */
export type ExamWindow = "upcoming" | "open" | "closed";

export function examWindowState(
  exam: Pick<ExamTemplateRow, "openAt" | "closeAt">,
  now = Date.now(),
): ExamWindow {
  if (exam.openAt && new Date(exam.openAt).getTime() > now) return "upcoming";
  if (exam.closeAt && new Date(exam.closeAt).getTime() < now) return "closed";
  return "open";
}

/** Web startable rule: no attempt, a live one (resumable), or practice retake. */
export function examStartable(e: ExamTemplateRow): boolean {
  return !e.myAttempt || e.myAttempt.status === "IN_PROGRESS" || e.kind === "PRACTICE";
}

/* ── Attempt verdict chip (r164-e three-way contract) ────────────── */
export interface AttemptVerdict {
  label: string;
  tone: StatusToneName;
  score: { value: number; max: number } | null;
}

export function attemptVerdict(exam: ExamTemplateRow): AttemptVerdict | null {
  const a = exam.myAttempt;
  if (!a) return null;
  const scoreOf =
    a.score === null || a.score === undefined ? null : { value: Number(a.score), max: Number(a.maxScore) };
  switch (a.status) {
    case "SUBMITTED":
      return { label: "بانتظار التصحيح اليدوي", tone: "yellow", score: scoreOf };
    case "EXPIRED":
      return { label: "انتهى وقت المحاولة دون تسليم", tone: "rose", score: null };
    case "GRADED": {
      if (a.score === null || a.score === undefined) return null;
      const passed =
        Number(a.maxScore) > 0 && (Number(a.score) / Number(a.maxScore)) * 100 >= (exam.passingScore ?? 0);
      return { label: passed ? "ناجح" : "لم يجتز", tone: passed ? "mint" : "rose", score: scoreOf };
    }
    default:
      return null; // IN_PROGRESS owns its own resumable chip
  }
}

/* ── Exam taker instruments ───────────────────────────────────────── */
export const AR_CHOICE_LETTERS = ["أ", "ب", "ج", "د", "هـ", "و"];

export const TRUE_FALSE_OPTIONS = ["صواب", "خطأ"];

export const QTYPE_LABEL: Record<string, string> = {
  MCQ: "اختيار من متعدد",
  TRUE_FALSE: "صح أم خطأ",
  SHORT: "إجابة قصيرة",
  ESSAY: "سؤال مقالي",
};

/** M:SS countdown, Western glyphs (contract rule 2). */
export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${latn(m)}:${String(r).padStart(2, "0")}`;
}

/**
 * Restore server-saved answers into the taker's form state (web D5):
 * value is the choice index for MCQ / TRUE_FALSE, the text otherwise
 * (blank text counts as unanswered).
 */
export function restoreSavedAnswers(
  saved: { questionId: string; value: number | string | null }[] | undefined,
): Record<string, { choiceIndex?: number; answerText?: string }> {
  const restored: Record<string, { choiceIndex?: number; answerText?: string }> = {};
  for (const row of saved ?? []) {
    const v = row.value;
    if (typeof v === "number" && Number.isInteger(v) && v >= 0) {
      restored[row.questionId] = { choiceIndex: v };
    } else if (typeof v === "string" && v.trim() !== "") {
      restored[row.questionId] = { answerText: v };
    } else if (v && typeof v === "object") {
      const o = v as { choiceIndex?: unknown; answerText?: unknown };
      const entry: { choiceIndex?: number; answerText?: string } = {};
      if (typeof o.choiceIndex === "number") entry.choiceIndex = o.choiceIndex;
      if (typeof o.answerText === "string" && o.answerText.trim() !== "") entry.answerText = o.answerText;
      if (entry.choiceIndex !== undefined || entry.answerText !== undefined) restored[row.questionId] = entry;
    }
  }
  return restored;
}

/** The two exact Arabic wire strings the submit route answers terminally. */
export function isTerminalSubmitError(e: unknown): boolean {
  const detail = (e as { message?: string })?.message ?? "";
  return detail === "تم تسليم هذه المحاولة مسبقاً" || detail === "انتهى وقت هذه المحاولة";
}

/* ── Research paper statuses (mobile chip labels) ─────────────────── */
export const PAPER_STATUS_LABEL: Record<string, string> = {
  UPLOADED: "مرفوع",
  SCANNING: "قيد الفحص",
  CHECKS_PASSED: "اجتاز الفحص",
  CHECKS_FAILED: "لم يجتز",
  GRADED: "مُصحَّح",
  PUBLISHED: "منشور",
};

export const PAPER_STATUS_TONE: Record<string, StatusToneName> = {
  UPLOADED: "sky",
  SCANNING: "yellow",
  CHECKS_PASSED: "mint",
  CHECKS_FAILED: "rose",
  GRADED: "mint",
  PUBLISHED: "lavender",
};

/* ── Jobs ─────────────────────────────────────────────────────────── */
export const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "دوام كامل",
  PART_TIME: "دوام جزئي",
  INTERNSHIP: "تدريب",
  FREELANCE: "حر",
  REMOTE: "عن بُعد",
};

/* ── Live sessions ────────────────────────────────────────────────── */
export const LIVE_STATUS: Record<string, { label: string; tone: StatusToneName }> = {
  LIVE: { label: "مباشرة الآن", tone: "copper" },
  SCHEDULED: { label: "مجدولة", tone: "sky" },
  ENDED: { label: "انتهت", tone: "grey" },
  CANCELLED: { label: "ملغاة", tone: "rose" },
};

/* ── Gamification ─────────────────────────────────────────────────── */
export const TIER_LABEL: Record<string, string> = {
  BRONZE: "برونزي",
  SILVER: "فضي",
  GOLD: "ذهبي",
  PLATINUM: "بلاتيني",
};

/**
 * Tier derived from the self-development level (the orb colour keyed off
 * the same ladder the training economy ranks by). Disclosed next to the
 * orb so the mapping never masquerades as server data.
 */
export function tierForLevel(level: number | null | undefined): "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" {
  const l = level ?? 1;
  if (l >= 7) return "PLATINUM";
  if (l >= 5) return "GOLD";
  if (l >= 3) return "SILVER";
  return "BRONZE";
}

export const RARITY_TONE: Record<string, StatusToneName> = {
  COMMON: "grey",
  RARE: "sky",
  EPIC: "lavender",
  LEGENDARY: "yellow",
};

export const RARITY_LABEL: Record<string, string> = {
  COMMON: "شائع",
  RARE: "نادر",
  EPIC: "ملحمي",
  LEGENDARY: "أسطوري",
};

/* ── Tiny presentational bits ─────────────────────────────────────── */

/** Quiet muted note line under a section bar. */
export function SectionNote({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <T variant="sm" color="muted" style={style}>
      {children}
    </T>
  );
}

/** Row of small hairline chips (hashtags etc.). */
export function ChipRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: "row", flexWrap: "wrap", gap: sp[6], alignItems: "center" }, style]}>
      {children}
    </View>
  );
}

/** Honest scan-results pair (declared simulation). */
export function scanLine(plagiarismPct: number | null | undefined, aiContentPct: number | null | undefined): string {
  const parts: string[] = [];
  if (plagiarismPct !== null && plagiarismPct !== undefined) parts.push(`انتحال ${pct(plagiarismPct)}`);
  if (aiContentPct !== null && aiContentPct !== undefined) parts.push(`ذكاء اصطناعي ${pct(aiContentPct)}`);
  return parts.join(" · ");
}
