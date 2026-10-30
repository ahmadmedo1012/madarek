/**
 * Core API domain types — derived from the backend serializers
 * (backend/src/app.ts + route modules; see docs/feature-parity.md).
 * Envelopes: success { data }, paginated { data, meta },
 * errors { error: { code, message, details? } }.
 */

export type AppRole = "STUDENT" | "TEACHER" | "ADMIN" | "QUALITY" | "OWNER";
export type AcademicPosition = "DEAN" | "ASSOCIATE_DEAN" | "DEPARTMENT_HEAD";
export type AcademicRank =
  | "LECTURER"
  | "ASSISTANT_PROFESSOR"
  | "ASSOCIATE_PROFESSOR"
  | "PROFESSOR";
export type ThemePreferenceServer = "LIGHT" | "DARK" | "SYSTEM";

export interface InstitutionSummary {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
}

export interface MembershipInfo {
  institutionId: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  role: AppRole;
  isActive: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  role: AppRole;
  firstName: string;
  lastName: string;
  avatarColor?: string | null;
  avatarInitials?: string | null;
  scopeFacultyId?: string | null;
  themePreference?: ThemePreferenceServer | null;
  themePreferenceUpdatedAt?: string | null;
  onboardingCompletedAt?: string | null;
  firedMilestones?: string[];
  createdAt?: string;
  memberships: MembershipInfo[];
  currentInstitution: InstitutionSummary | null;
  membershipRole: AppRole | null;
  /** /auth/me only: */
  scopeFaculty?: { id: string; name: string } | null;
  studentProfile?: StudentProfile | null;
  teacherProfile?: TeacherProfile | null;
}

export interface StudentProfile {
  id: string;
  universityId?: string | null;
  year?: number | null;
  gpa?: number | null;
  totalXp?: number | null;
  level?: number | null;
  faculty?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  [k: string]: unknown;
}

export interface TeacherProfile {
  id: string;
  specialty?: string | null;
  rank?: AcademicRank | null;
  bio?: string | null;
  degreeLevel?: string | null;
  yearsExperience?: number | null;
  officeLocation?: string | null;
  officeHours?: string | null;
  websiteUrl?: string | null;
  verifiedAt?: string | null;
  position?: AcademicPosition | null;
  department?: { id: string; name: string } | null;
  positionFaculty?: { id: string; name: string } | null;
  positionDepartment?: { id: string; name: string } | null;
  [k: string]: unknown;
}

export interface SessionResponse {
  user: AuthUser;
  accessToken: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unread?: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export type NotificationType = "URGENT" | "ACADEMIC" | "SYSTEM" | "SOCIAL";

export interface AppNotification {
  id: string;
  type: NotificationType | string;
  icon?: string | null;
  title: string;
  body?: string | null;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  fromUserId: string;
  fromUser?: { id: string; firstName: string; lastName: string; avatarColor?: string | null; avatarInitials?: string | null } | null;
  toUserId: string;
  toUser?: { id: string; firstName: string; lastName: string } | null;
  body: string;
  readAt?: string | null;
  createdAt: string;
}

export interface Institution {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  status?: string;
  [k: string]: unknown;
}

export interface Faculty {
  id: string;
  name: string;
  nameEn?: string | null;
  iconEmoji?: string | null;
  city?: string | null;
  [k: string]: unknown;
}

export interface Department {
  id: string;
  name: string;
  facultyId?: string;
  [k: string]: unknown;
}

export interface CourseSummary {
  id: string;
  code: string;
  name: string;
  nameEn?: string | null;
  iconEmoji?: string | null;
  themeColor?: string | null;
  credits?: number | null;
  [k: string]: unknown;
}

export interface ScheduleSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string | null;
}

export interface TeacherSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarColor?: string | null;
  avatarInitials?: string | null;
}

export interface EnrollmentRow {
  id: string;
  progressPct: number;
  offering: {
    id: string;
    term: string;
    room?: string | null;
    course: CourseSummary & { department?: { id: string; name: string } | null };
    teacher?: TeacherSummary | null;
    schedule?: ScheduleSlot[];
  };
}

export interface Material {
  id: string;
  offeringId: string;
  name: string;
  description?: string | null;
  type: string;
  sizeBytes: number | string;
  url: string;
  views?: number;
  downloads?: number;
  createdAt?: string;
  uploader?: { id: string; firstName: string; lastName: string } | null;
}

export interface Assignment {
  id: string;
  offeringId: string;
  title: string;
  description?: string | null;
  type: string;
  dueAt: string | null;
  weight?: number | null;
  maxScore?: number | null;
  createdAt?: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  assignment?: { id: string; title: string; maxScore?: number | null } | null;
  student?: { id: string; firstName: string; lastName: string } | null;
  fileUrl?: string | null;
  textAnswer?: string | null;
  status: string;
  grade?: number | null;
  feedback?: string | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
}

export interface WatchEvent {
  lectureId: string;
  watchedSec: number;
  totalSec: number;
  completed: boolean;
  replays?: number;
}

export interface LectureChapter {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
  ordinal: number;
  concept?: { id: string; name: string } | null;
}

export interface LectureCheckpoint {
  id: string;
  conceptId?: string | null;
  triggerSec: number;
  question: string;
  options: string[];
}

export interface CheckpointAnswerFeedback {
  correct: boolean;
  correctIndex: number;
  explanation: string | null;
}

export interface Lecture {
  id: string;
  offeringId: string;
  title: string;
  description?: string | null;
  ordinal: number;
  durationSec?: number | null;
  videoUrl: string;
  posterUrl?: string | null;
  transcriptUrl?: string | null;
  transcriptStatus?: string;
  chapters?: LectureChapter[];
  checkpoints?: LectureCheckpoint[];
  watchEvents?: WatchEvent[];
  answers?: { checkpointId: string }[];
  offering?: {
    id: string;
    term: string;
    course?: CourseSummary | null;
  } | null;
  _count?: { chapters?: number; checkpoints?: number };
}

export interface MasteryConcept {
  id: string;
  name: string;
  level: number;
  attempts: number;
}

export interface MatrixCourse {
  courseId: string;
  courseName: string;
  courseCode: string;
  themeColor?: string | null;
  offeringId: string;
  concepts: MasteryConcept[];
}

export interface KnowledgeGap {
  conceptId: string;
  conceptName: string;
  courseId: string;
  courseName: string;
  courseColor?: string | null;
  level: number;
  recommendedLectureId?: string | null;
  recommendedLectureTitle?: string | null;
}

export interface ResumeCard {
  mode: "continue" | "start";
  progressPct: number;
  watchedSec: number;
  lecture: {
    id: string;
    title: string;
    durationSec?: number | null;
    ordinal: number;
    offeringId: string;
    course: { id: string; name: string; code: string; themeColor?: string | null };
  };
}

export interface ResearchPaper {
  id: string;
  studentId: string;
  student?: { id: string; firstName: string; lastName: string } | null;
  reviewerId?: string | null;
  reviewer?: { id: string; firstName: string; lastName: string } | null;
  offeringId?: string | null;
  institutionId?: string;
  title: string;
  abstract?: string | null;
  fileUrl?: string | null;
  status: string;
  plagiarismPct?: number | null;
  aiContentPct?: number | null;
  grade?: number | null;
  feedback?: string | null;
  uploadedAt?: string;
  scannedAt?: string | null;
  gradedAt?: string | null;
  publishedAt?: string | null;
}

export interface PaperAnnotation {
  id: string;
  paperId: string;
  authorId: string;
  author?: { id: string; firstName: string; lastName: string } | null;
  page: number;
  comment: string;
  color?: string | null;
  createdAt?: string;
}

export interface AchievementBadge {
  id?: string;
  slug: string;
  title: string;
  description?: string | null;
  iconEmoji?: string | null;
  rarity: string;
  trackId?: string | null;
  earnedAt?: string | null;
}

export interface TrainingTrack {
  slug: string;
  title: string;
  titleEn?: string | null;
  summary?: string | null;
  category?: string | null;
  level?: string | null;
  estMinutes?: number | null;
  pointsAward?: number | null;
  order?: number;
  lessonsCount?: number;
  progressPct?: number | null;
  [k: string]: unknown;
}

export interface TrainingLesson {
  id: string;
  trackSlug?: string;
  title: string;
  summary?: string | null;
  contentMarkdown: string;
  estMinutes?: number | null;
  pointsAward?: number | null;
  quizQuestion?: string | null;
  quizAnswer?: string | null;
  order?: number;
  completedAt?: string | null;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category?: string | null;
  rating?: number | null;
  totalCopies: number;
  availableCopies: number;
}

export interface Loan {
  id: string;
  book?: Book | null;
  status: string;
  borrowedAt?: string;
  returnedAt?: string | null;
  dueAt?: string | null;
}

export interface JobPost {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  type: string;
  salary?: string | null;
  category?: string | null;
  myApplication?: { status: string } | null;
}

export interface MoocCourse {
  id: string;
  title: string;
  provider?: string | null;
  url?: string | null;
  [k: string]: unknown;
}

export interface Post {
  id: string;
  author: { id: string; firstName: string; lastName: string; avatarColor?: string | null; avatarInitials?: string | null };
  body: string;
  hashtags?: string[];
  imageUrl?: string | null;
  createdAt: string;
  reactions?: { like: number; save: number } | { kind: string }[] | null;
  myReaction?: string | null;
}

export interface CampusEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
  organizer?: { id: string; firstName: string; lastName: string } | null;
  myRsvp?: { status: string } | null;
}

export interface Competition {
  id: string;
  institutionId?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  prize?: string | null;
  deadline?: string | null;
  status: string;
  organizer?: { id: string; firstName: string; lastName: string } | null;
  myEntry?: { id: string; title: string; score?: number | null } | null;
}

export interface LiveSession {
  id: string;
  offeringId: string;
  title: string;
  description?: string | null;
  topic?: string | null;
  scheduledAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  status: string;
  joinUrl?: string | null;
  recordingUrl?: string | null;
  offering?: { id: string; course?: { name: string; code: string } | null } | null;
  teacher?: TeacherSummary | null;
}

export interface Announcement {
  id: string;
  scope: string;
  title: string;
  body?: string | null;
  pinned?: boolean;
  iconEmoji?: string | null;
  author?: { id: string; firstName: string; lastName: string } | null;
  publishedAt: string;
}

export interface AiMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | string;
  content: string;
  createdAt?: string;
  rating?: number | null;
}

export interface AiChatResponse {
  conversationId: string;
  reply: string;
  messageId: string;
  engine?: string;
  model?: string;
  citations?: unknown[];
  remaining?: number | null;
}

export interface SearchResults {
  courses: { id: string; name: string; code: string; href: string }[];
  lectures: { id: string; title: string; href: string }[];
  papers: { id: string; title: string; href: string }[];
  tracks: { slug: string; title: string; href: string }[];
}

export interface InviteCode {
  id: string;
  code: string;
  role: "STUDENT" | "TEACHER" | string;
  offeringId?: string | null;
  departmentId?: string | null;
  facultyId?: string | null;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  createdAt?: string;
}

export interface PilotFeedback {
  id: string;
  userId?: string | null;
  user?: { firstName: string; lastName: string } | null;
  kind: "BUG" | "IDEA" | string;
  role?: string | null;
  route?: string | null;
  note: string;
  status: string;
  createdAt: string;
}
