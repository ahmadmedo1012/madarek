/** Live sessions (Jitsi joins) + files/uploads/presign. */
import { get, post } from "./client";
import type { LiveSession } from "./types";

export const liveApi = {
  sessions: () => get<LiveSession[]>("/live/sessions"),
  create: (payload: { offeringId: string; title: string; description?: string; topic?: string; scheduledAt: string; joinUrl?: string }) =>
    post<LiveSession>("/live/sessions", payload),
  lifecycle: (id: string, action: "START" | "END" | "CANCEL", recordingUrl?: string) =>
    post<LiveSession>(`/live/sessions/${id}/lifecycle`, { action, recordingUrl }),
  join: (id: string) => post<{ session: LiveSession; attendanceRecorded: boolean }>(`/live/sessions/${id}/join`),
};

export interface PresignResponse {
  mode: "single" | "multipart";
  key: string;
  url?: string;
  headers?: Record<string, string>;
  uploadId?: string;
  partSize?: number;
  parts?: { partNumber: number; url: string }[];
}

export const filesApi = {
  presign: (payload: { filename: string; sizeBytes: number; multipart?: boolean }) =>
    post<PresignResponse>("/files/uploads/presign", payload),
  complete: (payload: { key: string; uploadId?: string; parts?: { partNumber: number; etag: string }[] }) =>
    post<{ url: string; sizeBytes: number }>("/files/uploads/complete", payload),
};
