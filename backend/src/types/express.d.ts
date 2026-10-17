import type { Role, Membership, Institution, StudentProfile, TeacherProfile } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /**
       * r178 (multi-institution): the token identity now carries the
       * institution context the token was minted in (inst claim) —
       * `institutionId` is the SELECTED institution or null (ambiguous /
       * platform-only user). Institution-scoped routes must re-resolve
       * the membership from the DB via `requireInstitution` — never
       * trust this claim alone.
       */
      user?: { id: string; role: Role; institutionId: string | null };
      /** Attached by `requireInstitution` (DB-resolved, ACTIVE membership). */
      membership?: Membership & { institution: Institution };
      /** Attached by `requireInstitution` (membership.institution). */
      institution?: Institution;
      /** Profile for the CURRENT membership (null when none exists). */
      studentProfile?: StudentProfile | null;
      teacherProfile?: TeacherProfile | null;
    }
  }
}

export {};
