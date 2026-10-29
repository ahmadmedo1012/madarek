/**
 * Shared local primitives for the Common surfaces (vision / colleges /
 * competitions / community / training / achievements / campus / legal /
 * about / help / contact). Built here because the shared UI kit is FROZEN
 * — anything it doesn't provide lives in this features folder.
 */
import { LogIn } from "lucide-react-native";
import { router } from "expo-router";
import { ApiError } from "@/api/client";
import { latn } from "@/lib/format";
import { EmptyState } from "@/components/ui/states";

/* ── Counted Arabic nouns (web lib/format countAr grammar) ─────────
 * One / dual / few (3–10) / many (11+). Numbers ride latn(). */
export function countAr(n: number, forms: [string, string, string, string]): string {
  if (n === 1) return forms[0];
  if (n === 2) return forms[1];
  if (n <= 10) return `${latn(n)} ${forms[2]}`;
  return `${latn(n)} ${forms[3]}`;
}

/** «نقطة واحدة / نقطتان / 5 نقاط / 25 نقطة» */
export function pointsAr(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (n === 1) return "نقطة واحدة";
  if (n === 2) return "نقطتان";
  return `${latn(n)} ${n <= 10 ? "نقاط" : "نقطة"}`;
}

/** «درس واحد / درسان / 5 دروس / 15 درسًا» */
export function lessonsAr(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return countAr(n, ["درس واحد", "درسان", "دروس", "درسًا"]);
}

/** «دقيقة واحدة / دقيقتان / 5 دقائق / 15 دقيقة» */
export function minutesAr(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return countAr(n, ["دقيقة واحدة", "دقيقتان", "دقائق", "دقيقة"]);
}

/** «عضو واحد / عضوان / 5 أعضاء» */
export function membersAr(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return countAr(n, ["عضو واحد", "عضوان", "أعضاء", "عضوًا"]);
}

/* ── Auth-error detection (public-ish pages) ─────────────────────────
 * The community/competitions/training endpoints require auth; a guest
 * gets an ApiError UNAUTHENTICATED from the client after the refresh
 * attempt fails. Render a sign-in prompt, never a crash. */
export function isUnauthError(e: unknown): boolean {
  return e instanceof ApiError && (e.code === "UNAUTHENTICATED" || e.status === 401);
}

export function apiMessage(e: unknown, fallback = "حدث خطأ غير متوقّع."): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/* ── Competition status grammar (task mapping) ─────────────────────── */
import type { StatusToneName } from "@/design/tokens";
import type { Competition } from "@/api/types";

/** Competition status → Arabic label + Heron tone (task mapping). */
export function competitionStatus(status: string): { label: string; tone: StatusToneName } {
  switch (status) {
    case "OPEN":
      return { label: "مفتوحة", tone: "mint" };
    case "CLOSED":
      return { label: "مغلقة", tone: "grey" };
    case "JUDGED":
      return { label: "تم التحكيم", tone: "sky" };
    default:
      return { label: status, tone: "grey" };
  }
}

/** An OPEN competition past its deadline is «انتهى التقديم» (web 5-A12 P2-3). */
export function submissionEnded(c: Pick<Competition, "status" | "deadline">): boolean {
  return c.status === "OPEN" && !!c.deadline && new Date(c.deadline).getTime() <= Date.now();
}

/** Sign-in EmptyState for guests hitting auth-walled data. */
export function SignInPrompt({
  message = "هذا القسم يحتاج حسابًا — سجّل الدخول لعرض المحتوى والمشاركة.",
}: {
  message?: string;
}) {
  return (
    <EmptyState
      title="سجّل الدخول للمشاركة"
      message={message}
      icon={<LogIn size={22} color="#70706A" />}
      actionLabel="تسجيل الدخول"
      onAction={() => router.push("/auth")}
    />
  );
}
