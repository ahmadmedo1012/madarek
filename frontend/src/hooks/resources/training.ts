// training.ts — r153c domain split of ../useResources.ts (training domain: achievements/skills/leaderboard · self-development tracks.)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';

/* r179 (phase-5) scope classification (mirrors
 * backend/src/http/routes/training.routes.ts): the training CATALOG
 * (tracks/lessons/badges) and its points LEADERBOARD are
 * PLATFORM-SHARED by design (SHARED_CATALOG — every institution trains
 * on the same public tracks), and /training/me* reads are USER-scoped
 * (PointsLedger/Certificate keyed by userId). NONE of this module's
 * keys carry the institution scope segment — not an omission, the
 * classification. */

// ── Achievements / Skills / Leaderboard ────────────────────────
export interface UserAchievement {
  unlockedAt: string;
  achievement: { id: string; name: string; description?: string; icon?: string | null; xp: number };
}
export function useMyAchievements() {
  return useQuery({
    queryKey: ['me', 'achievements'],
    queryFn: () => unwrap<UserAchievement[]>(api.get('/me/achievements')),
  });
}

export interface UserSkill {
  level: number;
  progressPct: number;
  skill: { id: string; name: string; category?: string | null; icon?: string | null };
}
export function useMySkills() {
  return useQuery({
    queryKey: ['me', 'skills'],
    queryFn: () => unwrap<UserSkill[]>(api.get('/me/skills')),
  });
}

export interface LeaderEntry {
  id: string;
  firstName: string;
  lastName: string;
  avatarInitials?: string | null;
  avatarColor?: string | null;
  totalXp: number;
  level: number;
}
export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => unwrap<LeaderEntry[]>(api.get('/leaderboard')),
  });
}

// ── Training (Self-Development) ───────────────────────────────
export type TrainingCategory =
  | 'ONBOARDING' | 'ACADEMIC' | 'FLIPPED' | 'STUDY_SKILLS' | 'RESEARCH'
  | 'CAREER' | 'COMMUNICATION' | 'ENGLISH' | 'PROGRAMMING' | 'PRODUCTIVITY' | 'VISION';

export type TrainingLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type BadgeRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface TrainingTrackCard {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  summary: string;
  category: TrainingCategory;
  level: TrainingLevel;
  iconEmoji?: string | null;
  themeColor?: string | null;
  estMinutes: number;
  pointsAward: number;
  totalLessons: number;
  enrolled: boolean;
  completedLessons: number;
  isCompleted: boolean;
  progressPct: number;
}
export function useTrainingCatalog() {
  return useQuery({
    queryKey: ['training', 'catalog'],
    queryFn: () => unwrap<TrainingTrackCard[]>(api.get('/training/catalog')),
  });
}

export interface TrainingLessonView {
  id: string;
  order: number;
  title: string;
  summary?: string | null;
  contentMarkdown: string;
  estMinutes: number;
  pointsAward: number;
  quizQuestion?: string | null;
  isCompleted: boolean;
}
export interface TrainingTrackDetail {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  summary: string;
  category: TrainingCategory;
  level: TrainingLevel;
  iconEmoji?: string | null;
  themeColor?: string | null;
  estMinutes: number;
  pointsAward: number;
  enrolled: boolean;
  isCompleted: boolean;
  completedAt?: string | null;
  lessons: TrainingLessonView[];
}
export function useTrainingTrack(slug: string | undefined) {
  return useQuery({
    queryKey: ['training', 'track', slug],
    enabled: !!slug,
    queryFn: () => unwrap<TrainingTrackDetail>(api.get(`/training/tracks/${slug}`)),
  });
}

export function useEnrollTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) =>
      unwrap<{ id: string; trackId: string; startedAt: string }>(
        api.post(`/training/tracks/${slug}/enroll`),
      ),
    onSuccess: (_d, slug) => {
      qc.invalidateQueries({ queryKey: ['training', 'catalog'] });
      qc.invalidateQueries({ queryKey: ['training', 'track', slug] });
      qc.invalidateQueries({ queryKey: ['training', 'me'] });
    },
  });
}

export interface CompleteLessonResult {
  newlyCompleted: boolean;
  pointsAwarded: number;
  totalPoints: number;
  level: { level: number; tier: Tier; toNext: number; pctIntoLevel: number };
  newBadges: Array<{ slug: string; title: string; iconEmoji: string }>;
}
export function useCompleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, quizAnswer }: { lessonId: string; quizAnswer?: string }) =>
      unwrap<CompleteLessonResult>(
        api.post(`/training/lessons/${lessonId}/complete`, { quizAnswer }),
      ),
    onSuccess: () => {
      // 15-d P2-4: lesson completion awards XP / level / badges, so the
      // XP leaderboard, the achievements list and the student dashboard
      // KPIs (totalXp / level) all read stale data until these are
      // invalidated alongside the training family.
      qc.invalidateQueries({ queryKey: ['training'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
      qc.invalidateQueries({ queryKey: ['me', 'achievements'] });
      qc.invalidateQueries({ queryKey: ['me', 'dashboard'] });
    },
  });
}

export interface TrainingMeSummary {
  points: number;
  level: { level: number; tier: Tier; toNext: number; pctIntoLevel: number };
  badgeCount: number;
  certificateCount: number;
  tracksEnrolled: number;
  tracksCompleted: number;
  recentBadges: Array<{ slug: string; title: string; iconEmoji: string; rarity: BadgeRarity; earnedAt: string }>;
}
export function useTrainingMe() {
  return useQuery({
    queryKey: ['training', 'me'],
    queryFn: () => unwrap<TrainingMeSummary>(api.get('/training/me')),
  });
}

export interface UserBadgeRow {
  slug: string;
  title: string;
  description: string;
  iconEmoji: string;
  themeColor?: string | null;
  rarity: BadgeRarity;
  earnedAt: string | null;
  isEarned: boolean;
}
export function useMyBadges() {
  return useQuery({
    queryKey: ['training', 'me', 'badges'],
    queryFn: () => unwrap<UserBadgeRow[]>(api.get('/training/me/badges')),
  });
}

export interface TrainingCertificate {
  id: string;
  title: string;
  issuer: string;
  issuedAt: string | null;
  hours: number;
  status: 'ONGOING' | 'COMPLETED';
  trackSlug: string | null;
  iconEmoji: string | null;
  themeColor: string | null;
}
export function useMyTrainingCerts() {
  return useQuery({
    queryKey: ['training', 'me', 'certificates'],
    queryFn: () => unwrap<TrainingCertificate[]>(api.get('/training/me/certificates')),
  });
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  avatarColor?: string | null;
  avatarInitials?: string | null;
  points: number;
  level: { level: number; tier: Tier; toNext: number; pctIntoLevel: number };
}
export function useTrainingLeaderboard() {
  return useQuery({
    queryKey: ['training', 'leaderboard'],
    queryFn: () => unwrap<LeaderboardRow[]>(api.get('/training/leaderboard')),
  });
}
