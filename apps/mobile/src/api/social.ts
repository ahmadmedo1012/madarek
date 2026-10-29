/** Social: posts, announcements, events, study rooms, competitions, notifications. */
import { get, post, patch, del } from "./client";
import type { Announcement, CampusEvent, Competition, Paginated, PilotFeedback, Post, Message } from "./types";

export interface StudyRoom {
  id: string;
  name: string;
  topic?: string | null;
  owner?: { id: string; firstName: string; lastName: string } | null;
  membersCount?: number;
  [k: string]: unknown;
}

export const socialApi = {
  posts: (limit = 50) => get<Post[]>("/posts", { limit }),
  createPost: (payload: { body: string; hashtags?: string[]; imageUrl?: string }) => post<Post>("/posts", payload),
  react: (postId: string, kind: "like" | "save") => post<unknown>(`/posts/${postId}/react`, { kind }),
  unreact: (postId: string, kind: "like" | "save") => del<unknown>(`/posts/${postId}/react`, { kind }),
  announcements: (limit = 50) => get<Announcement[]>("/announcements/feed", { limit }),
  createAnnouncement: (payload: { scope: string; scopeId?: string; title: string; body?: string; pinned?: boolean; iconEmoji?: string }) =>
    post<Announcement>("/announcements", payload),
  events: () => get<CampusEvent[]>("/events"),
  createEvent: (payload: { title: string; description?: string; location?: string; startsAt: string; endsAt?: string; capacity?: number }) =>
    post<CampusEvent>("/events", payload),
  rsvp: (eventId: string, status: "GOING" | "MAYBE" | "NO") => post<unknown>(`/events/${eventId}/rsvp`, { status }),
  studyRooms: () => get<StudyRoom[]>("/study-rooms"),
  createStudyRoom: (payload: { name: string; topic?: string }) => post<StudyRoom>("/study-rooms", payload),
  joinRoom: (id: string) => post<unknown>(`/study-rooms/${id}/join`),
  leaveRoom: (id: string) => post<unknown>(`/study-rooms/${id}/leave`),
  competitions: () => get<Competition[]>("/competitions"),
  competition: (id: string) => get<Competition & { entries?: { id: string; title: string; body?: string; score?: number | null; user?: { firstName: string; lastName: string } }[] }>(`/competitions/${id}`),
  enterCompetition: (id: string, payload: { title: string; body: string; fileUrl?: string }) => post<unknown>(`/competitions/${id}/enter`, payload),
  scoreEntry: (competitionId: string, entryId: string, score: number) =>
    post<unknown>(`/competitions/${competitionId}/entries/${entryId}/score`, { score }),
  // feedback inbox (owner/admin/quality)
  feedback: (page = 1, limit = 30, status?: string) => get<Paginated<PilotFeedback>>("/feedback", { page, limit, status }),
  updateFeedback: (id: string, status: string) => patch<PilotFeedback>(`/feedback/${id}`, { status }),
};

export type { Message };
