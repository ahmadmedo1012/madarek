// StudentMessagesPage — r171a: the student-side messages inbox, closing
// the last DM lifecycle gap. The backend messaging API (GET/POST
// /me/messages, PATCH /messages/:id/read, POST /messages/read-all) has
// been role-agnostic since r157/r170a, but students had no inbox: they
// received DMs whose notification carried link:null ("until an inbox
// exists for them"). The whole loop — list, unread sweep, mark-all,
// reply, compose — now rides the shared components/messages/ pair.
//
// Recipient scope (honest, no fabricated directory): the teachers of
// the student's enrolled offerings (GET /enrollments/me already
// projects offering.teacher + offering.course) + prior correspondents
// from the loaded inbox rows (reply-to-sender rides that pool). Nobody
// else — a classmate, an admin — becomes reachable until they message
// first.
import { MessagesInbox } from '../../components/messages/MessagesInbox';
import {
  MessageComposeModal,
  type RecipientOption,
} from '../../components/messages/MessageComposeModal';
import { useMyEnrollments } from '../../hooks/useResources';

/** The student compose shell: the enrolled-teachers optgroup. One real
 * endpoint behind it (GET /enrollments/me — the same rows the courses
 * page renders). Teachers are deduped by id across offerings (one
 * teacher teaching two of my courses is ONE pickable person); the
 * option's detail is the course name of the first shared enrollment. */
function StudentMessageCompose({
  preset,
  correspondents,
  onClose,
}: {
  preset: { id: string; name: string } | null;
  correspondents: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const enrollmentsQ = useMyEnrollments();
  const enrollments = enrollmentsQ.data ?? [];

  /* Map-keyed dedupe — first enrollment wins the course detail. */
  const teacherMap = new Map<string, RecipientOption>();
  for (const e of enrollments) {
    const t = e.offering.teacher;
    if (!teacherMap.has(t.id)) {
      teacherMap.set(t.id, {
        id: t.id,
        name: `${t.firstName} ${t.lastName}`,
        detail: e.offering.course.name,
      });
    }
  }
  const teachers = [...teacherMap.values()];

  /* The enrollment pool's loading/error states ride the recipient
   * select as disabled options (the teacher modal's roster pattern). */
  const statusOptions = [
    ...(enrollmentsQ.isPending ? ['جارٍ تحميل أساتذة مقرّراتك…'] : []),
    ...(enrollmentsQ.isError ? ['تعذَّر تحميل أساتذة مقرّراتك'] : []),
  ];

  return (
    <MessageComposeModal
      presetRecipient={preset}
      correspondents={correspondents}
      recipientGroups={teachers.length > 0 ? [{ label: 'أساتذة مقرّراتي', options: teachers }] : undefined}
      statusOptions={statusOptions}
      noRecipientsHint="لا يوجد مستلمون متاحون بعد — أساتذة مقرّراتك يظهرون هنا بعد تسجيلك في مقرّر، أو انتظر رسالة واردة تردّ عليها."
      onClose={onClose}
    />
  );
}

export function StudentMessagesPage() {
  return (
    <MessagesInbox
      /* R304 (6-f): the h1 must carry the route's ONE name — the nav
         label «الرسائل» (nav.ts) is also the title-map source
         (AppShell NAV_TITLES); «صندوق الرسائل» was a second variant
         of the same surface. The subtitle keeps its honest recipient
         ceiling (enrolled teachers + prior correspondents). */
      title="الرسائل"
      subtitle="كل رسالة وصلتك أو أرسلتها — راسل أساتذة مقرّراتك أو ردّ على الوارد، والمستلمون المتاحون هم أساتذة مقرّراتك ومن راسلتك سابقاً."
      renderCompose={(args) => <StudentMessageCompose {...args} />}
    />
  );
}
