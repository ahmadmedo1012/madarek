/**
 * Backend unit test — the checkpoint answer memory shipped in r157
 * (W2-F7 / audit finding 6A5: "checkpoints have no server memory →
 * resume re-quiz burns the r155a mastery cap").
 *
 * DB-free, the checkpoint-mastery.test.ts / visibility-logic.test.ts
 * pattern (AGENTS.md §5.2): the pure decision function is unit-tested
 * directly, and the LIVE route wiring is pinned by scanning the route
 * source — a re-inlined twin of the projection (or a dropped upsert)
 * passes pure-function tests but fails these pins, exactly the drift
 * class the r155a round hit when /research/queue re-inlined its filter.
 *
 * The Prisma plumbing itself (upsert on the compound unique, the
 * filtered relation read) is a thin wrapper over the schema and needs
 * a DB harness the project does not have — the schema + hand-written
 * migration (20261013150858_checkpoint_answer_memory) carry that side.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import { checkpointAttemptsProjection } from '../../src/http/routes/learning.routes.js';

/* The live route source, scanned for the wiring pins (same technique
 * as the frontend's source-scan tests — the file is the contract). */
const routeSource = readFileSync(
  new URL('../../src/http/routes/learning.routes.ts', import.meta.url),
  'utf8',
);

describe('checkpointAttemptsProjection (r157 / 6A5 — the pure role branch)', () => {
  it('STUDENT → only their own rows, projected as bare checkpointIds', () => {
    // The shape IS the Prisma select: a filtered relation (where =
    // the student) narrowed to checkpointId only — answerIndex/correct
    // never travel to the wire (privacy of attempts).
    expect(checkpointAttemptsProjection(Role.STUDENT, 'student_9')).toEqual({
      select: { checkpointId: true },
      where: { studentId: 'student_9' },
    });
  });

  it('TEACHER (and every oversight role) → false — no answers on their read', () => {
    for (const role of [Role.TEACHER, Role.ADMIN, Role.QUALITY, Role.OWNER]) {
      expect(checkpointAttemptsProjection(role, 'user_1')).toBe(false);
    }
  });
});

describe('live route wiring (source-scan pins — the routes must CONSUME the helpers)', () => {
  it('GET /lectures/:id consumes checkpointAttemptsProjection in the checkpoints select', () => {
    // Not just "the function exists" — the live lecture read selects
    // `answers:` THROUGH it. A dropped/re-inlined projection fails here
    // while pure-function tests stay green (the exact drift class).
    expect(routeSource).toContain('answers: checkpointAttemptsProjection(req.user!.role, req.user!.id)');
    // And the GET keeps hiding correctIndex (the answer endpoint is
    // the only place that disclosure belongs).
    expect(routeSource).toContain('hide correctIndex from the wire');
  });

  it('the answer route upserts CheckpointAnswer on the compound unique (last answer wins)', () => {
    // Upsert — not create (a re-answer must UPDATE the row, never
    // duplicate it and never 400 on the unique constraint).
    expect(routeSource).toContain('prisma.checkpointAnswer.upsert');
    expect(routeSource).toContain(
      'checkpointId_studentId: { checkpointId: cp.id, studentId: req.user!.id }',
    );
    // Last-answer semantics: the update path rewrites answerIndex +
    // correct (and updatedAt via @updatedAt / the explicit new Date()).
    expect(routeSource).toMatch(/update:\s*\{\s*answerIndex,\s*correct,/);
  });

  it('the upsert is STUDENT-gated and the response contract is untouched', () => {
    // STUDENT-only write: teachers/admins preview-grade (full feedback)
    // without writing answer memory bound to their own user row —
    // mirroring the mastery gate right above it.
    expect(routeSource).toMatch(
      /if \(req\.user!\.role === Role\.STUDENT\) \{\s*await prisma\.checkpointAnswer\.upsert/,
    );
    // The wire payload is byte-identical to pre-r157: the upsert is a
    // side effect, never a payload change (frontend contract freeze).
    expect(routeSource).toContain(
      "res.json({ data: { correct, correctIndex: cp.correctIndex, explanation: cp.explanation } })",
    );
  });
});
