// social.ts — r153c domain split of ../useResources.ts (social domain: community posts · announcements · competitions · campus events.)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';
import { useInstitutionScope } from '../../stores/auth.store';
import { withInstitutionScope } from '../../lib/queryClient';
// r180-F3: study-room mutations carry their own Arabic feedback — the
// useOwner.ts precedent (toast from inside the hook), so every consumer
// of the membership surface gets the same success/error copy.
import { toast } from '../../lib/toast';
import { apiErrorMessage } from '../../lib/format';

// r179 (phase-5): every institution-dependent key in this module (the
// whole social domain — posts/announcements/competitions/events) gains
// the scope segment LAST; mutations keep their prefix invalidations
// (['posts'], ['competitions']…), which still match the scoped keys.

// ── Posts (community) ──────────────────────────────────────────
export interface Post {
  id: string;
  body: string;
  hashtags: string[];
  imageUrl?: string | null;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string; avatarColor?: string | null; avatarInitials?: string | null };
  _count: { comments: number; reactions: number };
  /** 18-G: the viewer has a like/save row on this post — the heart's
   *  honest initial state (it was session-local fiction before: a
   *  reload un-liked the UI while the server reaction persisted). */
  viewerReacted: boolean;
}
// 15-d P2-13: the feed limit is a parameter (keyed, so two limits never
// share a cache entry) — consumers can page beyond the newest 20 posts;
// the default keeps every existing call site byte-identical.
export function usePosts(limit: number = 20) {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['posts', limit], inst),
    queryFn: () => unwrap<Post[]>(api.get(`/posts?limit=${limit}`)),
  });
}
export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: string; hashtags?: string[] }) =>
      unwrap<Post>(api.post('/posts', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}
export function useReactToPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { postId: string; kind: 'like' | 'save' }) =>
      api.post(`/posts/${input.postId}/react`, { kind: input.kind }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

// ── Social ─────────────────────────────────────────────────────
export interface AnnouncementRow {
  id: string;
  scope: 'PLATFORM' | 'FACULTY' | 'DEPARTMENT' | 'OFFERING';
  scopeId: string | null;
  title: string;
  body: string;
  pinned: boolean;
  publishedAt: string;
  iconEmoji: string | null;
  author: { firstName: string; lastName: string; avatarColor: string | null; avatarInitials: string | null; role: string };
}
export function useAnnouncements() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['announcements', 'feed'], inst),
    queryFn: () => unwrap<AnnouncementRow[]>(api.get('/announcements/feed')),
  });
}

export interface CreateAnnouncementInput {
  scope: 'PLATFORM' | 'FACULTY' | 'DEPARTMENT' | 'OFFERING';
  scopeId?: string;
  title: string;
  body: string;
  pinned?: boolean;
  iconEmoji?: string;
  expiresAt?: string;
}
export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) =>
      unwrap<AnnouncementRow>(api.post('/announcements', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
}

export interface CompetitionRow {
  id: string;
  title: string;
  description: string;
  category: string;
  prize: string | null;
  deadline: string;
  status: 'OPEN' | 'CLOSED' | 'JUDGED';
  iconEmoji: string | null;
  themeColor: string | null;
  organizer: { firstName: string; lastName: string; role: string };
  _count: { entries: number };
}
export function useCompetitions() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['competitions'], inst),
    queryFn: () => unwrap<CompetitionRow[]>(api.get('/competitions')),
  });
}

export interface CompetitionDetail extends CompetitionRow {
  organizerId: string;
  entries: Array<{
    id: string;
    title: string;
    body?: string;
    fileUrl?: string | null;
    submittedAt: string;
    score: number | null;
    /** 5-B1 (A12 P1-1): present on the organizer's view and on the
     *  viewer's OWN entry (entryViewForViewer) — enables the exact
     *  own-entry match the edit flow needs. Absent on third parties. */
    userId?: string;
    user: { firstName: string; lastName: string; avatarColor: string | null; avatarInitials: string | null };
  }>;
}
export function useCompetition(id: string | undefined) {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['competitions', id], inst),
    queryFn: () => unwrap<CompetitionDetail>(api.get(`/competitions/${id}`)),
    enabled: !!id,
  });
}

export interface CreateCompetitionInput {
  title: string;
  description: string;
  category: string;
  prize?: string;
  deadline: string;
  iconEmoji?: string;
  themeColor?: string;
}
export function useCreateCompetition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompetitionInput) =>
      unwrap<CompetitionRow>(api.post('/competitions', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competitions'] }),
  });
}

export interface EnterCompetitionInput {
  title: string;
  body: string;
  fileUrl?: string;
}
export function useEnterCompetition(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EnterCompetitionInput) =>
      unwrap<{ id: string }>(api.post(`/competitions/${competitionId}/enter`, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitions', competitionId] });
      // 15-d P2-2: the list row's _count.entries changes on entry — match
      // useCloseCompetition / useJudgeCompetition, which already refresh
      // both the detail key and the list.
      qc.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}

export function useCloseCompetition(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<CompetitionRow>(api.post(`/competitions/${competitionId}/close`, {})),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitions', competitionId] });
      qc.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}

export function useScoreCompetitionEntry(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, score }: { entryId: string; score: number | null }) =>
      unwrap<{ id: string; score: number | null }>(
        api.post(`/competitions/${competitionId}/entries/${entryId}/score`, { score }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitions', competitionId] });
    },
  });
}

export function useJudgeCompetition(competitionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap<CompetitionRow>(api.post(`/competitions/${competitionId}/judge`, {})),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competitions', competitionId] });
      qc.invalidateQueries({ queryKey: ['competitions'] });
    },
  });
}

export interface CampusEventRow {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  iconEmoji: string | null;
  themeColor: string | null;
  organizer: { firstName: string; lastName: string; role: string };
  _count: { rsvps: number };
  /** 5-B1 (A12 P2-2): the viewer's own RSVP status on /events rows —
   *  null when never answered. Lets the pressed state survive reload
   *  (the viewerReacted pattern). Additive: absent on older payloads. */
  myRsvp?: 'GOING' | 'MAYBE' | 'NO' | null;
}
export function useCampusEvents() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['campus-events'], inst),
    queryFn: () => unwrap<CampusEventRow[]>(api.get('/events')),
  });
}

export interface CreateCampusEventInput {
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  iconEmoji?: string;
  themeColor?: string;
}
export function useCreateCampusEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCampusEventInput) =>
      unwrap<CampusEventRow>(api.post('/events', input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campus-events'] }),
  });
}

export function useRsvpEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: 'GOING' | 'MAYBE' | 'NO' }) =>
      unwrap<{ status: string }>(api.post(`/events/${eventId}/rsvp`, { status })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campus-events'] }),
  });
}

// ── Study rooms (r180) ─────────────────────────────────────────
// غرف الدراسة حقيقية منذ r180 على الخلفية (social.routes.ts — قائمة
// مؤسسة المستدعِي المتحقَّق منها، إنشاء يجعل المنشئ أول عضو، انضمام/
// مغادرة داخل حدود المؤسسة، 409 للازدواج، 400 لمالك الغرفة الذي يغادرها).
// المفاتيح تتبع اتفاقية r179 نفسها (نطاق المؤسسة آخر المفتاح)، والإبطالات
// تعمل بالبادئة ['study-rooms'] فتطابق المفاتيح المقيَّدة بأي مؤسسة.

/** GET /study-rooms row — studyRoomListItem's projection: the viewer's
 *  own membership rows are stripped server-side into `isMember`, so the
 *  join/leave pressed state survives reload (the viewerReacted/myRsvp
 *  pattern of this domain). */
export interface StudyRoomRow {
  id: string;
  name: string;
  topic: string | null;
  createdAt: string;
  owner: { id: string; firstName: string; lastName: string; avatarInitials: string | null };
  _count: { members: number };
  isMember: boolean;
}

export function useStudyRooms() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['study-rooms'], inst),
    queryFn: () => unwrap<StudyRoomRow[]>(api.get('/study-rooms')),
  });
}

export interface CreateStudyRoomInput {
  /** 1..120 حرفاً بعد التقليم (createStudyRoomSchema). */
  name: string;
  /** اختياري — ≤300 حرفاً. */
  topic?: string;
}

export function useCreateStudyRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStudyRoomInput) =>
      unwrap<{ id: string; name: string; topic: string | null }>(api.post('/study-rooms', input)),
    onSuccess: (room) => {
      qc.invalidateQueries({ queryKey: ['study-rooms'] });
      // المنشئ أول عضو تلقائيًا (معاملة الخلفية) — التغذية الراجعة تسمّي ذلك.
      toast.success(`أُنشئت «${room.name}» وأنت أول أعضائها.`, { title: 'تمّ إنشاء الغرفة' });
    },
    onError: (e) => {
      toast.error(apiErrorMessage(e, 'تعذَّر إنشاء الغرفة — تحقّق من البيانات وحاول مرة أخرى.'));
    },
  });
}

/** Join/leave input — the route needs `roomId`; `name` rides along only
 *  so the feedback toast can name the room (the rsvp/enter pattern in
 *  this domain passes the viewer context the same way). */
export interface StudyRoomMembershipInput {
  roomId: string;
  name: string;
}

export function useJoinStudyRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StudyRoomMembershipInput) =>
      unwrap<{ roomId: string; userId: string }>(api.post(`/study-rooms/${input.roomId}/join`, {})),
    onSuccess: (_membership, input) => {
      qc.invalidateQueries({ queryKey: ['study-rooms'] });
      toast.success(`انضممت إلى «${input.name}».`, { title: 'تمّ الانضمام' });
    },
    onError: (e) => {
      // 409 الخلفية عربية («أنت عضو في هذه الغرفة بالفعل») — تُعرض كما هي
      // عبر apiErrorMessage، وغير العربية يسقط إلى البديل العربي.
      toast.error(apiErrorMessage(e, 'تعذَّر الانضمام إلى الغرفة — تحقّق من اتصالك وحاول مرة أخرى.'));
    },
  });
}

export function useLeaveStudyRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StudyRoomMembershipInput) =>
      unwrap<{ roomId: string; left: boolean }>(api.post(`/study-rooms/${input.roomId}/leave`, {})),
    onSuccess: (_result, input) => {
      qc.invalidateQueries({ queryKey: ['study-rooms'] });
      toast.success(`غادرت «${input.name}».`, { title: 'تمّت المغادرة' });
    },
    onError: (e) => {
      // 400 مالك الغرفة عربية («مالك الغرفة لا يغادرها») — تُعرض كما هي.
      toast.error(apiErrorMessage(e, 'تعذَّرت مغادرة الغرفة — تحقّق من اتصالك وحاول مرة أخرى.'));
    },
  });
}
