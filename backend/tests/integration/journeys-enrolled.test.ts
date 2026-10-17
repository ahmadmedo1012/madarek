/**
 * DB integration — r176g: the ENROLLMENT-GATED student/teacher
 * journeys against a REAL disposable Postgres (the r176-F audit gap:
 * these journeys had ZERO real-DB coverage — their only evidence was
 * mocked-prisma units + hermetic e2e, the exact blind spot that let
 * the r175d production Prisma bug through).
 *
 * The permission boundary is untouched — the fixture seeds state the
 * way the platform's own administration workflow would (the r176
 * brief: "Fix the test setup and workflow verification, not the
 * permission boundary"): an ADMIN enrolls the student (POST
 * /enrollments — the real route), then every downstream journey runs
 * through its REAL routes with REAL guards:
 *
 *  · enrollment (admin POST; duplicate 409)
 *  · lecture playback + watch progress (list → watch event → checkpoint
 *    answer → StudentMastery row)
 *  · assignment submit → teacher grade → the student's /me/results
 *  · online exam: start → answer → submit → auto-graded → /exams/me
 *  · material upload (teacher) → enrolled student reads the bytes
 *  · research: offering-tied paper graded by ITS teacher → published
 *
 * No prisma mocks (the integration canon). One file, sequential.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

type Helpers = typeof import('./helpers.js');
type AppModule = typeof import('../../src/app.js');
type DbModule = typeof import('../../src/db.js');

let helpers: Helpers;
let prisma: DbModule['prisma'];
let baseUrl: string;
let server: ReturnType<ReturnType<AppModule['createApp']>['listen']>;

beforeAll(async () => {
  helpers = await import('./helpers.js');
  const appModule: AppModule = await import('../../src/app.js');
  const dbModule: DbModule = await import('../../src/db.js');
  prisma = dbModule.prisma;
  server = appModule.createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

beforeEach(async () => {
  await helpers.truncateAll(prisma);
});

/** The full authorization-relevant fixture chain, seeded the way the
 * administration workflow would build it: faculty → department →
 * course → (teacher, offering) → lecture/checkpoint/concept →
 * assignment → published exam (template+question) — plus the actors
 * (student, teacher, admin). */
async function seedWorld() {
  const admin = await helpers.seedUser({ role: Role.ADMIN });
  const teacher = await helpers.seedUser({ role: Role.TEACHER });
  const student = await helpers.seedUser({ role: Role.STUDENT });
  // r178: the whole academic chain hangs off one institution (the admin
  // stays contextless — resolveCallerInstitutionScope(null) keeps the
  // university-wide enrollment semantics these journeys pin).
  const institution = await helpers.seedInstitution();
  const faculty = await prisma.faculty.create({
    data: { name: 'كلية رحلات r176g', city: 'طرابلس', institutionId: institution.id },
  });
  const department = await prisma.department.create({ data: { name: 'قسم رحلات r176g', facultyId: faculty.id } });
  const course = await prisma.course.create({
    data: { code: `CS-${helpers.uniqueSuffix()}`, name: 'بنى المعطيات r176g', departmentId: department.id, institutionId: institution.id },
  });
  const offering = await prisma.courseOffering.create({
    data: { courseId: course.id, teacherId: teacher.id, term: '2026-SPRING' },
  });
  const lecture = await prisma.lecture.create({
    data: { offeringId: offering.id, title: 'القوائم المترابطة r176g', ordinal: 1, durationSec: 600, videoUrl: 'https://example.invalid/r176g.mp4' },
  });
  const concept = await prisma.knowledgeConcept.create({
    data: { courseId: course.id, name: 'القوائم المترابطة r176g', ordinal: 1 },
  });
  const checkpoint = await prisma.lectureCheckpoint.create({
    data: {
      lectureId: lecture.id,
      conceptId: concept.id,
      triggerSec: 120,
      question: 'ما تعقيد الوصول للعنصر الأول في قائمة مترابطة؟',
      options: ['O(1)', 'O(n)', 'O(log n)'], // Prisma Json: native array, not a stringified one
      correctIndex: 0,
    },
  });
  const assignment = await prisma.assignment.create({
    data: { offeringId: offering.id, title: 'واجب القوائم r176g', type: 'HOMEWORK', dueAt: new Date(Date.now() + 86_400_000), weight: 30, maxScore: 100 },
  });
  // A PUBLISHED exam tied to the offering (the moderation step's final
  // state — the fixture models the end state the student consumes).
  const category = await prisma.questionCategory.create({
    data: { slug: `cat-${helpers.uniqueSuffix()}`, title: 'تصنيف r176g' },
  });
  const question = await prisma.question.create({
    data: {
      categoryId: category.id, type: 'MCQ', prompt: 'ما بنية القائمة المترابطة؟',
      choices: ['عقد متتابعة بالمؤشرات', 'مصفوفة ثابتة', 'شجرة ثنائية'], // Prisma Json: native array
      correctAnswer: 0, // MCQ correct index as a native JSON number
      points: 10, authorId: teacher.id,
    },
  });
  const template = await prisma.examTemplate.create({
    data: { offeringId: offering.id, title: 'اختبار القوائم r176g', kind: 'QUIZ', durationMin: 30, passingScore: 50, status: 'PUBLISHED', authorId: teacher.id },
  });
  await prisma.examTemplateQuestion.create({
    data: { templateId: template.id, questionId: question.id, order: 1 },
  });
  return { admin, teacher, student, institution, faculty, course, offering, lecture, concept, checkpoint, assignment, template, question };
}

describe('the enrollment-gated journeys (real DB, real routes, real guards)', () => {
  it('J1 — ADMIN enrolls the student through the REAL route; duplicates 409; the student sees the offering', async () => {
    const w = await seedWorld();
    const res = await fetch(`${baseUrl}/api/v1/enrollments`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.admin.id, Role.ADMIN), 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: w.student.id, offeringId: w.offering.id }),
    });
    expect(res.status).toBe(201);
    // The student's own enrollment list reflects the row.
    const mine = await fetch(`${baseUrl}/api/v1/enrollments/me`, { headers: helpers.bearer(w.student.id, Role.STUDENT) });
    expect(mine.status).toBe(200);
    const mineBody = (await mine.json()) as { data: Array<{ offering: { id: string } }> };
    expect(mineBody.data.some((e) => e.offering.id === w.offering.id)).toBe(true);
    // Duplicate enrollment is a conflict, not a second row.
    const dup = await fetch(`${baseUrl}/api/v1/enrollments`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.admin.id, Role.ADMIN), 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: w.student.id, offeringId: w.offering.id }),
    });
    expect(dup.status).toBe(409);
    // The boundary holds: a STUDER cannot enroll anyone (403).
    const forbidden = await fetch(`${baseUrl}/api/v1/enrollments`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.student.id, Role.STUDENT), 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: w.student.id, offeringId: w.offering.id }),
    });
    expect(forbidden.status).toBe(403);
    // And an UNENROLLED student sees nothing of the offering lectures.
    const stranger = await helpers.seedUser({ role: Role.STUDENT });
    const strangerView = await fetch(`${baseUrl}/api/v1/offerings/${w.offering.id}/lectures`, { headers: helpers.bearer(stranger.id, Role.STUDENT) });
    expect(strangerView.status).toBe(403);
  });

  it('J2 — lecture playback: the enrolled student lists lectures, watches, answers the checkpoint, mastery moves', async () => {
    const w = await seedWorld();
    const enroll = await fetch(`${baseUrl}/api/v1/enrollments`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.admin.id, Role.ADMIN), 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: w.student.id, offeringId: w.offering.id }),
    });
    expect(enroll.status).toBe(201);

    // 1. The lecture list carries the lecture + its checkpoint count.
    const list = await fetch(`${baseUrl}/api/v1/offerings/${w.offering.id}/lectures`, { headers: helpers.bearer(w.student.id, Role.STUDENT) });
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { data: Array<{ id: string; title: string; _count: { checkpoints: number } }> };
    expect(listBody.data[0]!.id).toBe(w.lecture.id);
    expect(listBody.data[0]!._count.checkpoints).toBe(1);

    // 2. Watch progress lands (the completion rule honors the server-side
    //    watched/total ratio — the fixture reports a real ratio).
    const watch = await fetch(`${baseUrl}/api/v1/lectures/${w.lecture.id}/watch`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.student.id, Role.STUDENT), 'content-type': 'application/json' },
      body: JSON.stringify({ watchedSec: 600, totalSec: 600, completed: true }),
    });
    expect(watch.status).toBe(200); // upsert semantics — 200 with the row
    const watchRow = await prisma.watchEvent.findFirst({ where: { studentId: w.student.id, lectureId: w.lecture.id } });
    expect(watchRow).not.toBeNull();
    expect(watchRow!.completed).toBe(true);

    // 3. The checkpoint answer is correct → feedback + a mastery row.
    const answer = await fetch(`${baseUrl}/api/v1/lectures/${w.lecture.id}/checkpoints/${w.checkpoint.id}/answer`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.student.id, Role.STUDENT), 'content-type': 'application/json' },
      body: JSON.stringify({ answerIndex: 0 }),
    });
    expect(answer.status).toBe(200); // checkpoint answers are 200-ok with the verdict
    const answerBody = (await answer.json()) as { data: { correct: boolean } };
    expect(answerBody.data.correct).toBe(true);

    const mastery = await prisma.studentMastery.findFirst({ where: { studentId: w.student.id, conceptId: w.concept.id } });
    expect(mastery).not.toBeNull();
    expect(mastery!.attempts).toBe(1);
    expect(mastery!.correct).toBe(1);

    // 4. The matrix reflects the real row.
    const matrix = await fetch(`${baseUrl}/api/v1/me/matrix`, { headers: helpers.bearer(w.student.id, Role.STUDENT) });
    expect(matrix.status).toBe(200);
    const matrixBody = (await matrix.json()) as { data: Array<{ courseName: string; concepts: Array<{ name: string; level: number; attempts: number }> }> };
    const courseRow = matrixBody.data.find((r) => r.courseName === w.course.name);
    expect(courseRow).toBeDefined();
    const conceptRow = courseRow!.concepts.find((x) => x.name === w.concept.name);
    expect(conceptRow).toBeDefined();
    expect(conceptRow!.attempts).toBe(1); // the checkpoint answer moved the real row
  });

  it('J3 — assignment: the enrolled student submits; the OFFERING teacher grades; the student sees the grade', async () => {
    const w = await seedWorld();
    await fetch(`${baseUrl}/api/v1/enrollments`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.admin.id, Role.ADMIN), 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: w.student.id, offeringId: w.offering.id }),
    });

    const submit = await fetch(`${baseUrl}/api/v1/offerings/${w.offering.id}/assignments/${w.assignment.id}/submit`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.student.id, Role.STUDENT), 'content-type': 'application/json' },
      body: JSON.stringify({ textAnswer: 'الإجابة على الواجب — عقد مترابطة بمؤشرات.' }),
    });
    expect(submit.status).toBe(201);
    const submission = await prisma.submission.findFirstOrThrow({ where: { assignmentId: w.assignment.id, studentId: w.student.id } });

    // The OFFERING teacher grades (RESEARCH-style ownership: a foreign
    // teacher must NOT be able to).
    const grade = await fetch(`${baseUrl}/api/v1/submissions/${submission.id}/grade`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.teacher.id, Role.TEACHER), 'content-type': 'application/json' },
      body: JSON.stringify({ grade: 85, feedback: 'إجابة جيدة' }),
    });
    expect(grade.status).toBe(200);
    const graded = await prisma.submission.findUniqueOrThrow({ where: { id: submission.id } });
    expect(graded.status).toBe('GRADED');
    expect(Number(graded.grade)).toBe(85);

    // The student's results surface carries the course + the grade.
    const results = await fetch(`${baseUrl}/api/v1/me/results`, { headers: helpers.bearer(w.student.id, Role.STUDENT) });
    expect(results.status).toBe(200);
    const resultsBody = (await results.json()) as { data: { courses: Array<{ courseName: string; gradePct: number | null }>; headline: { avgGradePct: number | null } } };
    const courseRow = resultsBody.data.courses.find((c) => c.courseName === w.course.name);
    expect(courseRow).toBeDefined();
    expect(courseRow!.gradePct).toBe(85); // 85/100 on the sole graded artifact
    expect(resultsBody.data.headline.avgGradePct).toBe(85);
  });

  it('J4 — online exam: start → answer → submit → auto-graded → visible in /exams/me', async () => {
    const w = await seedWorld();
    await fetch(`${baseUrl}/api/v1/enrollments`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.admin.id, Role.ADMIN), 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: w.student.id, offeringId: w.offering.id }),
    });

    const start = await fetch(`${baseUrl}/api/v1/exams/templates/${w.template.id}/start`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.student.id, Role.STUDENT) },
    });
    expect(start.status).toBe(201);
    const startBody = (await start.json()) as { data: { attemptId: string; questions: Array<{ id: string; type: string }> } };
    expect(startBody.data.questions).toHaveLength(1);

    const answer = await fetch(`${baseUrl}/api/v1/exams/attempts/${startBody.data.attemptId}/answer`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.student.id, Role.STUDENT), 'content-type': 'application/json' },
      body: JSON.stringify({ questionId: startBody.data.questions[0]!.id, choiceIndex: 0 }),
    });
    expect(answer.status).toBe(200); // answer saves are upserts — 200 ok

    const submit = await fetch(`${baseUrl}/api/v1/exams/attempts/${startBody.data.attemptId}/submit`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.student.id, Role.STUDENT) },
    });
    expect(submit.status).toBe(200);
    const submitBody = (await submit.json()) as { data: { score: number } };
    expect(submitBody.data.score).toBe(10); // the question's full points

    // The attempt row is GRADED with the auto-score.
    const attempt = await prisma.examAttempt.findUniqueOrThrow({ where: { id: startBody.data.attemptId } });
    expect(attempt.status).toBe('GRADED'); // auto-graded on submit (objective questions)
    expect(Number(attempt.score)).toBe(10);

    // And the student's exam list reports it.
    const mine = await fetch(`${baseUrl}/api/v1/exams/me`, { headers: helpers.bearer(w.student.id, Role.STUDENT) });
    expect(mine.status).toBe(200);
    const mineBody = (await mine.json()) as { data: Array<{ id: string; myAttempt: { status: string; score: number } | null }> };
    const entry = mineBody.data.find((e) => e.id === w.template.id);
    expect(entry?.myAttempt?.status).toBe('GRADED');
    expect(entry?.myAttempt?.score).toBe(10);
  });

  it('J5 — materials: the teacher uploads a real PDF; the enrolled student reads the bytes; a stranger cannot', async () => {
    const w = await seedWorld();
    // r179b (phase-5): the material upload/serving routes verify the
    // caller's institution context (memberships + inst claims) — seeded
    // here, inside this journey only, for the file endpoints' actors.
    await helpers.seedMembership(w.teacher.id, w.institution.id, Role.TEACHER);
    await helpers.seedMembership(w.student.id, w.institution.id, Role.STUDENT);
    await fetch(`${baseUrl}/api/v1/enrollments`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.admin.id, Role.ADMIN), 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: w.student.id, offeringId: w.offering.id }),
    });

    const pdf = Buffer.from('%PDF-1.4\n%%EOF\n', 'latin1');
    const upload = await fetch(`${baseUrl}/api/v1/offerings/${w.offering.id}/materials/file?name=${encodeURIComponent('ملزمة القوائم')}&type=PDF`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.teacher.id, Role.TEACHER, w.institution.id), 'content-type': 'application/pdf' },
      body: new Uint8Array(pdf),
    });
    expect(upload.status).toBe(201);
    const uploadBody = (await upload.json()) as { data: { url: string } };
    const filename = uploadBody.data.url.split('/').pop()!;

    // The enrolled student reads the material through the serving route.
    const read = await fetch(`${baseUrl}/api/v1/files/materials/${filename}`, { headers: helpers.bearer(w.student.id, Role.STUDENT, w.institution.id) });
    expect(read.status).toBe(200);
    const bytes = Buffer.from(await read.arrayBuffer());
    expect(bytes.equals(pdf)).toBe(true);

    // The authorization boundary: a student of ANOTHER institution
    // gets 404 (the uniform not-found refusal, never an existence
    // oracle) — r179b hardened the stranger from contextless to
    // cross-institution, the exact leak the phase-5 gate closes.
    const stranger = await helpers.seedUser({ role: Role.STUDENT });
    const strangerInst = await helpers.seedInstitution();
    await helpers.seedMembership(stranger.id, strangerInst.id, Role.STUDENT);
    const strangerRead = await fetch(`${baseUrl}/api/v1/files/materials/${filename}`, { headers: helpers.bearer(stranger.id, Role.STUDENT, strangerInst.id) });
    expect(strangerRead.status).toBe(404);
  });

  it('J6 — research: the OFFERING teacher grades the student\'s paper and publishes it (the r175-blocked flow)', async () => {
    const w = await seedWorld();
    // The student's paper, tied to the offering (the tie that unlocks
    // RESEARCH_GRADE_OWN for THIS teacher) — already past the scan step.
    const paper = await prisma.researchPaper.create({
      data: {
        studentId: w.student.id,
        offeringId: w.offering.id,
        institutionId: w.institution.id,
        title: 'بحث القوائم المترابطة r176g',
        status: 'CHECKS_PASSED',
        fileUrl: 'https://external.example.org/paper.pdf',
      },
    });

    // The offering's teacher grades through the REAL capability route.
    const grade = await fetch(`${baseUrl}/api/v1/research/${paper.id}/grade`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.teacher.id, Role.TEACHER), 'content-type': 'application/json' },
      body: JSON.stringify({ grade: 17, feedback: 'بحث متقن — راجع المرجع الثالث.' }),
    });
    expect(grade.status).toBe(200);
    const graded = await prisma.researchPaper.findUniqueOrThrow({ where: { id: paper.id } });
    expect(graded.status).toBe('GRADED');
    expect(Number(graded.grade)).toBe(17);

    // Publish — the terminal state the library's published surface
    // serves from.
    const publish = await fetch(`${baseUrl}/api/v1/research/${paper.id}/publish`, {
      method: 'POST',
      headers: { ...helpers.bearer(w.teacher.id, Role.TEACHER) },
    });
    expect(publish.status).toBe(200);
    const published = await prisma.researchPaper.findUniqueOrThrow({ where: { id: paper.id } });
    expect(published.status).toBe('PUBLISHED');

    // The boundary: a FOREIGN teacher cannot grade a fresh paper in
    // this offering (RESEARCH_GRADE_OWN is scoped to own offerings).
    const foreignTeacher = await helpers.seedUser({ role: Role.TEACHER });
    const paper2 = await prisma.researchPaper.create({
      data: {
        studentId: w.student.id,
        offeringId: w.offering.id,
        institutionId: w.institution.id,
        title: 'بحث ثانٍ r176g',
        status: 'CHECKS_PASSED',
        fileUrl: 'https://external.example.org/paper2.pdf',
      },
    });
    const foreign = await fetch(`${baseUrl}/api/v1/research/${paper2.id}/grade`, {
      method: 'POST',
      headers: { ...helpers.bearer(foreignTeacher.id, Role.TEACHER), 'content-type': 'application/json' },
      body: JSON.stringify({ grade: 10 }),
    });
    expect(foreign.status).toBe(403);
  });
});
