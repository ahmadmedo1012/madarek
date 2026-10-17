/**
 * Backend unit test — r180-E: study rooms become REAL and
 * institution-scoped (backend/src/http/routes/social.routes.ts —
 * StudyRoom/StudyRoomMember existed in schema.prisma since r179 with
 * ZERO routes serving them; this file pins the r180 surface).
 *
 * DB-free (the project canon): prisma mocked at db.js; the REAL app on
 * an ephemeral port with signed role+inst JWTs (the
 * social-routes-institution pattern). What this pins:
 *  · list: scoped to the caller's VERIFIED institution (createdAt desc,
 *    take 50, the viewer-membership include feeding `isMember`);
 *    contextless institutional caller → 403 fail-closed; OWNER keeps
 *    the platform-wide oversight list (the file's role policy).
 *  · create: binds the CALLER's institution + the creator auto-joins as
 *    the first member (one transaction); name/topic zod rules.
 *  · join: a foreign-institution room id is a 404 (no existence leak);
 *    duplicate join → 409 with the Arabic message (both the pre-check
 *    and the P2002 race catch land there); happy join → 201.
 *  · leave: the room's OWNER cannot leave (400 «مالك الغرفة لا
 *    يغادرها»); non-member → 404; foreign id → 404; happy → 200 + the
 *    membership row deleted.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Prisma, Role } from '@prisma/client';

vi.mock('../../src/db.js', () => {
  const p: Record<string, unknown> = {
    // resolveCallerInstitutionScope's re-verification read.
    membership: { findFirst: vi.fn() },
    studyRoom: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    studyRoomMember: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  };
  // The create route writes room + membership in ONE transaction — the
  // mock hands the transaction the same client (the file's pattern).
  p.$transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(p));
  return { prisma: p, withRetry: vi.fn() };
});

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';

const STUDENT_ID = 'student-s1';
const TEACHER_ID = 'teacher-t1';
const OWNER_ID = 'owner-o1';
const INST_A = 'inst-a';

const bearerFor = (userId: string, role: Role, institutionId: string | null) => ({
  authorization: `Bearer ${signAccessToken(userId, role, institutionId)}`,
});
const jsonHeaders = { 'content-type': 'application/json' };

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(() => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  // The caller's institution context resolves (ACTIVE membership) for
  // whichever institution the token claims; no claim → null → the
  // routes' fail-closed 403 INSTITUTION_CONTEXT_REQUIRED.
  vi.mocked(prisma.membership.findFirst).mockImplementation(
    (async (args: unknown) => {
      const where = (args as { where?: { institutionId?: string } } | undefined)?.where;
      return where?.institutionId ? { institutionId: where.institutionId } : null;
    }) as never,
  );
});

const get = (path: string, headers: Record<string, string>) =>
  fetch(`${baseUrl}${path}`, { headers });
const post = (path: string, headers: Record<string, string>, body: unknown) =>
  fetch(`${baseUrl}${path}`, { method: 'POST', headers: { ...headers, ...jsonHeaders }, body: JSON.stringify(body) });

const errorCode = async (res: Response) =>
  ((await res.json()) as { error: { code: string; message: string } }).error;

// ── GET /study-rooms — list ────────────────────────────────────────

describe('GET /api/v1/study-rooms — institution-scoped list (r180)', () => {
  it('the list is scoped to the caller\'s verified institution (desc, take 50, viewer include)', async () => {
    vi.mocked(prisma.studyRoom.findMany).mockResolvedValue([] as never);
    const res = await get('/api/v1/study-rooms', bearerFor(STUDENT_ID, Role.STUDENT, INST_A));
    expect(res.status).toBe(200);
    expect(prisma.studyRoom.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { institutionId: INST_A },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: expect.objectContaining({
          owner: { select: { id: true, firstName: true, lastName: true, avatarInitials: true } },
          _count: { select: { members: true } },
          // Only the CALLER's own rows feed `isMember` — the posts
          // feed's viewer-include pattern.
          members: { where: { userId: STUDENT_ID }, select: { userId: true } },
        }),
      }),
    );
  });

  it('a contextless caller cannot list rooms (403 fail closed)', async () => {
    const res = await get('/api/v1/study-rooms', bearerFor(STUDENT_ID, Role.STUDENT, null));
    expect(res.status).toBe(403);
    expect((await errorCode(res)).code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    expect(prisma.studyRoom.findMany).not.toHaveBeenCalled();
  });

  it('OWNER keeps the platform-wide oversight list (no institution filter)', async () => {
    vi.mocked(prisma.studyRoom.findMany).mockResolvedValue([] as never);
    const res = await get('/api/v1/study-rooms', bearerFor(OWNER_ID, Role.OWNER, null));
    expect(res.status).toBe(200);
    expect(prisma.studyRoom.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it('`isMember` rides every row from the viewer-membership include (helper rows never leak)', async () => {
    const roomRow = (id: string, viewerRows: Array<{ userId: string }>) => ({
      id,
      name: `غرفة ${id}`,
      topic: 'مراجعة قبل الاختبار',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      owner: { id: TEACHER_ID, firstName: 'سالم', lastName: 'الفيتوري', avatarInitials: 'سف' },
      _count: { members: viewerRows.length + 2 },
      members: viewerRows,
    });
    vi.mocked(prisma.studyRoom.findMany).mockResolvedValue([
      roomRow('room-1', [{ userId: STUDENT_ID }]),
      roomRow('room-2', []),
    ] as never);

    const res = await get('/api/v1/study-rooms', bearerFor(STUDENT_ID, Role.STUDENT, INST_A));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<Record<string, unknown> & { id: string; isMember: boolean }> };
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toMatchObject({ id: 'room-1', isMember: true });
    expect(body.data[1]).toMatchObject({ id: 'room-2', isMember: false });
    // The projection strips the helper membership rows — the client
    // gets the flag, not the viewer's row data.
    expect(body.data[0]).not.toHaveProperty('members');
    expect(body.data[1]).not.toHaveProperty('members');
  });
});

// ── POST /study-rooms — create ─────────────────────────────────────

describe('POST /api/v1/study-rooms — create binds the caller\'s institution + auto-join (r180)', () => {
  it('the room is created INSIDE the caller\'s verified institution and the creator auto-joins as the first member', async () => {
    vi.mocked(prisma.studyRoom.create).mockResolvedValue({ id: 'room-new' } as never);
    vi.mocked(prisma.studyRoomMember.create).mockResolvedValue({
      roomId: 'room-new',
      userId: STUDENT_ID,
    } as never);

    const res = await post('/api/v1/study-rooms', bearerFor(STUDENT_ID, Role.STUDENT, INST_A), {
      name: 'غرفة مراجعة الفيزياء',
      topic: 'مراجعة نهائية قبل الاختبار',
    });
    expect(res.status).toBe(201);
    expect(prisma.studyRoom.create).toHaveBeenCalledWith({
      data: {
        name: 'غرفة مراجعة الفيزياء',
        topic: 'مراجعة نهائية قبل الاختبار',
        ownerId: STUDENT_ID,
        institutionId: INST_A,
      },
    });
    // Same transaction (the mock's $transaction runs fn on the same
    // client): the creator's membership row lands with the room's id.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.studyRoomMember.create).toHaveBeenCalledWith({
      data: { roomId: 'room-new', userId: STUDENT_ID },
    });
  });

  it('the name is trimmed and an absent topic lands as null', async () => {
    vi.mocked(prisma.studyRoom.create).mockResolvedValue({ id: 'room-t' } as never);
    vi.mocked(prisma.studyRoomMember.create).mockResolvedValue({} as never);

    const res = await post('/api/v1/study-rooms', bearerFor(STUDENT_ID, Role.STUDENT, INST_A), {
      name: '  غرفة قصيرة  ',
    });
    expect(res.status).toBe(201);
    expect(prisma.studyRoom.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'غرفة قصيرة', topic: null }),
    });
  });

  it('a contextless caller cannot create a room (403 fail closed)', async () => {
    const res = await post('/api/v1/study-rooms', bearerFor(STUDENT_ID, Role.STUDENT, null), {
      name: 'غرفة بلا مؤسسة',
    });
    expect(res.status).toBe(403);
    expect((await errorCode(res)).code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    expect(prisma.studyRoom.create).not.toHaveBeenCalled();
    expect(prisma.studyRoomMember.create).not.toHaveBeenCalled();
  });

  it('zod rejects an all-whitespace name and an over-300-char topic (400 VALIDATION_ERROR)', async () => {
    const blankName = await post('/api/v1/study-rooms', bearerFor(STUDENT_ID, Role.STUDENT, INST_A), {
      name: '   ',
    });
    expect(blankName.status).toBe(400);
    expect((await errorCode(blankName)).code).toBe('VALIDATION_ERROR');

    const longTopic = await post('/api/v1/study-rooms', bearerFor(STUDENT_ID, Role.STUDENT, INST_A), {
      name: 'غرفة سليمة',
      topic: 'ط'.repeat(301),
    });
    expect(longTopic.status).toBe(400);
    expect((await errorCode(longTopic)).code).toBe('VALIDATION_ERROR');

    expect(prisma.studyRoom.create).not.toHaveBeenCalled();
  });
});

// ── POST /study-rooms/:id/join ─────────────────────────────────────

describe('POST /api/v1/study-rooms/:id/join — institution-bounded membership writes (r180)', () => {
  it('joining ANOTHER institution\'s room is a 404 (no existence leak)', async () => {
    // The scoped lookup (id + the caller's institution) does not
    // resolve a foreign room → 404, never a cross-institution write.
    vi.mocked(prisma.studyRoom.findFirst).mockResolvedValue(null as never);
    const res = await post('/api/v1/study-rooms/room-foreign/join', bearerFor(STUDENT_ID, Role.STUDENT, INST_A), {});
    expect(res.status).toBe(404);
    expect(prisma.studyRoom.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'room-foreign', institutionId: INST_A } }),
    );
    expect(prisma.studyRoomMember.create).not.toHaveBeenCalled();
  });

  it('a duplicate join is a 409 with the Arabic membership message', async () => {
    vi.mocked(prisma.studyRoom.findFirst).mockResolvedValue({ id: 'room-1' } as never);
    vi.mocked(prisma.studyRoomMember.findUnique).mockResolvedValue({ roomId: 'room-1' } as never);

    const res = await post('/api/v1/study-rooms/room-1/join', bearerFor(STUDENT_ID, Role.STUDENT, INST_A), {});
    expect(res.status).toBe(409);
    expect((await errorCode(res)).message).toBe('أنت عضو في هذه الغرفة بالفعل');
    expect(prisma.studyRoomMember.create).not.toHaveBeenCalled();
  });

  it('a happy join creates the membership row (201)', async () => {
    vi.mocked(prisma.studyRoom.findFirst).mockResolvedValue({ id: 'room-2' } as never);
    vi.mocked(prisma.studyRoomMember.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.studyRoomMember.create).mockResolvedValue({
      roomId: 'room-2',
      userId: STUDENT_ID,
      joinedAt: new Date('2026-10-02T00:00:00Z'),
    } as never);

    const res = await post('/api/v1/study-rooms/room-2/join', bearerFor(STUDENT_ID, Role.STUDENT, INST_A), {});
    expect(res.status).toBe(201);
    expect(prisma.studyRoomMember.create).toHaveBeenCalledWith({
      data: { roomId: 'room-2', userId: STUDENT_ID },
    });
    const body = (await res.json()) as { data: { roomId: string; userId: string } };
    expect(body.data).toMatchObject({ roomId: 'room-2', userId: STUDENT_ID });
  });

  it('the P2002 race (a concurrent join created the row first) lands as 409, not 500', async () => {
    vi.mocked(prisma.studyRoom.findFirst).mockResolvedValue({ id: 'room-3' } as never);
    vi.mocked(prisma.studyRoomMember.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.studyRoomMember.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate key', {
        code: 'P2002',
        clientVersion: '5.22.0',
      }) as never,
    );

    const res = await post('/api/v1/study-rooms/room-3/join', bearerFor(STUDENT_ID, Role.STUDENT, INST_A), {});
    expect(res.status).toBe(409);
    expect((await errorCode(res)).message).toBe('أنت عضو في هذه الغرفة بالفعل');
  });
});

// ── POST /study-rooms/:id/leave ────────────────────────────────────

describe('POST /api/v1/study-rooms/:id/leave — bounded leave (r180)', () => {
  it('the room\'s OWNER cannot leave their own room (400 «مالك الغرفة لا يغادرها»)', async () => {
    vi.mocked(prisma.studyRoom.findFirst).mockResolvedValue({ id: 'room-own', ownerId: STUDENT_ID } as never);
    const res = await post('/api/v1/study-rooms/room-own/leave', bearerFor(STUDENT_ID, Role.STUDENT, INST_A), {});
    expect(res.status).toBe(400);
    expect((await errorCode(res)).message).toBe('مالك الغرفة لا يغادرها');
    expect(prisma.studyRoomMember.delete).not.toHaveBeenCalled();
  });

  it('leaving a room the caller is NOT a member of is a 404', async () => {
    vi.mocked(prisma.studyRoom.findFirst).mockResolvedValue({ id: 'room-2', ownerId: TEACHER_ID } as never);
    vi.mocked(prisma.studyRoomMember.findUnique).mockResolvedValue(null as never);
    const res = await post('/api/v1/study-rooms/room-2/leave', bearerFor(STUDENT_ID, Role.STUDENT, INST_A), {});
    expect(res.status).toBe(404);
    expect((await errorCode(res)).message).toBe('أنت لست عضوًا في هذه الغرفة');
    expect(prisma.studyRoomMember.delete).not.toHaveBeenCalled();
  });

  it('leaving ANOTHER institution\'s room is a 404 (no existence leak)', async () => {
    vi.mocked(prisma.studyRoom.findFirst).mockResolvedValue(null as never);
    const res = await post('/api/v1/study-rooms/room-foreign/leave', bearerFor(STUDENT_ID, Role.STUDENT, INST_A), {});
    expect(res.status).toBe(404);
    expect(prisma.studyRoomMember.delete).not.toHaveBeenCalled();
  });

  it('a happy leave deletes the caller\'s membership row (200 confirmation)', async () => {
    vi.mocked(prisma.studyRoom.findFirst).mockResolvedValue({ id: 'room-2', ownerId: TEACHER_ID } as never);
    vi.mocked(prisma.studyRoomMember.findUnique).mockResolvedValue({ roomId: 'room-2' } as never);
    vi.mocked(prisma.studyRoomMember.delete).mockResolvedValue({} as never);

    const res = await post('/api/v1/study-rooms/room-2/leave', bearerFor(STUDENT_ID, Role.STUDENT, INST_A), {});
    expect(res.status).toBe(200);
    expect(prisma.studyRoomMember.delete).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'room-2', userId: STUDENT_ID } },
    });
    const body = (await res.json()) as { data: { roomId: string; left: boolean } };
    expect(body.data).toEqual({ roomId: 'room-2', left: true });
  });
});
