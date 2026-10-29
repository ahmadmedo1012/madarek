// live.ts — r153c domain split of ../useResources.ts (live-sessions half of "Teacher profile + live sessions".)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';
import { useInstitutionScope } from '../../stores/auth.store';
import { withInstitutionScope } from '../../lib/queryClient';

export interface LiveSessionRow {
  id: string;
  offeringId: string;
  teacherId: string;
  title: string;
  description: string | null;
  topic: string | null;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
  joinUrl: string | null;
  recordingUrl: string | null;
  offering: {
    id: string;
    course: { name: string; code: string; iconEmoji: string | null; themeColor: string | null };
  };
  teacher: { firstName: string; lastName: string; avatarInitials: string | null; avatarColor: string | null };
}
export function useLiveSessions() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['live', 'sessions'], inst),
    queryFn: () => unwrap<LiveSessionRow[]>(api.get('/live/sessions')),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useCreateLiveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      offeringId: string;
      title: string;
      description?: string;
      topic?: string;
      scheduledAt: string;
      joinUrl?: string;
    }) => unwrap<LiveSessionRow>(api.post('/live/sessions', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live', 'sessions'] }),
  });
}

export function useLifecycleLiveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'START' | 'END' | 'CANCEL' }) =>
      unwrap<LiveSessionRow>(api.post(`/live/sessions/${id}/lifecycle`, { action })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['live', 'sessions'] }),
  });
}

/** r323 B2.4 — the student join hook: records attendance (idempotent)
 * and returns the session to embed. The join window (10 min early,
 * never on ENDED/CANCELLED) is enforced server-side with an Arabic
 * conflict message the UI surfaces verbatim. */
export function useJoinLiveSession() {
  return useMutation({
    mutationFn: (id: string) =>
      unwrap<{ session: LiveSessionRow; attendanceRecorded: boolean }>(
        api.post(`/live/sessions/${id}/join`),
      ),
  });
}
