/** Training tracks, badges, certificates, gamification. */
import { get, post } from "./client";
import type { TrainingLesson, TrainingTrack } from "./types";

export interface TrainingBadge {
  slug: string;
  title: string;
  description?: string | null;
  iconEmoji?: string | null;
  rarity: string;
  earnedAt?: string | null;
  [k: string]: unknown;
}

export interface TrainingEnrollment {
  trackSlug: string;
  trackTitle?: string;
  progressPct: number;
  startedAt: string;
  completedAt?: string | null;
  [k: string]: unknown;
}

export const trainingApi = {
  catalog: () => get<TrainingTrack[]>("/training/catalog"),
  track: (slug: string) => get<TrainingTrack & { lessons: TrainingLesson[] }>(`/training/tracks/${slug}`),
  enroll: (slug: string) => post<unknown>(`/training/tracks/${slug}/enroll`),
  completeLesson: (lessonId: string, quizAnswer?: string) => post<unknown>(`/training/lessons/${lessonId}/complete`, quizAnswer ? { quizAnswer } : undefined),
  mine: () => get<TrainingEnrollment[]>("/training/me"),
  badges: () => get<TrainingBadge[]>("/training/me/badges"),
  certificates: () => get<{ id: string; title: string; issuer?: string; hours?: number; status?: string; issuedAt?: string | null }[]>("/training/me/certificates"),
  leaderboard: () => get<{ firstName: string; lastName: string; points: number; [k: string]: unknown }[]>("/training/leaderboard"),
};
