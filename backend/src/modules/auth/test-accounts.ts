/**
 * R320 §C — `ensureTestAccounts()`: the idempotent upsert that keeps the
 * documented easy-login test accounts (`@test.ly` / `12345678`) present,
 * unlocked and attached to realistic profiles, in EVERY environment.
 *
 * Run semantics (the two entry points):
 *   1. `npm run db:seed` — ALWAYS: once after the full corpus body on a
 *      fresh install (so the corpus — which owns the rich academic demo
 *      data — creates the shared corpus accounts first and this pass
 *      only heals them + adds the extra jobs), and once BEFORE the
 *      r183 established-database early-return (a normal redeploy of an
 *      established DB performs zero writes — these accounts are the ONE
 *      explicit, deliberate exception, and they are the ONLY rows the
 *      exception touches).
 *   2. BACKEND BOOT with `MADAREK_TEST_ACCOUNTS=1` (backend/src/index.ts)
 *      — the self-healing dev/ops path; guarded, non-fatal, logged.
 *
 * Guarantees:
 *   - NEVER touches real users' data: every write is an upsert keyed by
 *     the fixed test email; no other row is read for update.
 *   - Resets the password hash (argon2, same as the seed), re-activates
 *     the account (isActive), clears the lockout state
 *     (failedLoginCount + lockedUntil) and heals the governance scope.
 *   - Attaches realistic Arabic profiles: memberships in the demo
 *     institutions, student profiles with reg numbers (allocated only
 *     when the account has none — never stealing a number another
 *     account owns), teacher profiles with the academic POSITION for
 *     the head/dean/vice-dean jobs, `scopeFacultyId` for the
 *     faculty-scoped registrar.
 *   - Enrolments for student accounts are BEST-EFFORT: when the demo
 *     institution already has course offerings (seeded DBs), each
 *     student is enrolled in up to two of them; on a bare boot-time
 *     skeleton (no corpus yet) the step is skipped and logged.
 *
 * Outbound mail: NONE is attempted anywhere in this flow — the backend
 * has no mail transport at all (no SMTP/nodemailer/resend provider is
 * configured or implemented; notifications are in-app DB rows only), so
 * nothing is sent for logins, lockouts or resets on any account.
 */
import { AcademicRank, PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../../lib/password.js';
import { TEST_ACCOUNTS, TEST_PASSWORD } from './test-accounts.data.js';

/** Realistic Arabic profile data for each test account (keyed by email).
 * The six corpus-overlapping accounts reuse the seed's exact names so a
 * fresh `db:seed` (corpus body first, ensure second) produces ONE row
 * with the canonical name regardless of which pass created it. */
interface AccountProfileData {
  firstName: string;
  lastName: string;
  avatarInitials: string;
  avatarColor: string;
  /** Which demo institution this account belongs to ('zawia' | 'alandalus'). */
  institution: 'zawia' | 'alandalus';
  /** Reg-number candidates, tried in order, ONLY when allocating a new
   * StudentProfile (an existing profile is never renumbered). */
  regNumbers?: string[];
  year?: number;
  gpa?: number;
  totalXp?: number;
  level?: number;
  specialty?: string;
  rank?: AcademicRank;
}

const ACCOUNT_PROFILES: Record<string, AccountProfileData> = {
  'student@test.ly': {
    firstName: 'أحمد', lastName: 'الزروق', avatarInitials: 'أح', avatarColor: '#4F8EF7',
    institution: 'zawia', regNumbers: ['UZ-2024-00001', 'UZ-2025-00001'],
    year: 3, gpa: 3.4, totalXp: 2340, level: 7,
  },
  'student2@test.ly': {
    firstName: 'ليلى', lastName: 'المهدي', avatarInitials: 'لم', avatarColor: '#F06292',
    institution: 'alandalus', regNumbers: ['UZ-2024-00001', 'AA-2025-00001'],
    year: 1,
  },
  'teacher@test.ly': {
    firstName: 'سالم', lastName: 'البوسيفي', avatarInitials: 'سب', avatarColor: '#3DD68C',
    institution: 'zawia', specialty: 'علوم الحاسوب والذكاء الاصطناعي',
    rank: AcademicRank.ASSOCIATE_PROFESSOR,
  },
  'head@test.ly': {
    firstName: 'محمد', lastName: 'الشريف', avatarInitials: 'مش', avatarColor: '#0E7490',
    institution: 'zawia', specialty: 'هندسة البرمجيات', rank: AcademicRank.PROFESSOR,
  },
  'dean@test.ly': {
    firstName: 'إبراهيم', lastName: 'الفيتوري', avatarInitials: 'إف', avatarColor: '#B45309',
    institution: 'zawia', specialty: 'نظم المعلومات الإدارية', rank: AcademicRank.PROFESSOR,
  },
  'vicedean@test.ly': {
    firstName: 'آمال', lastName: 'بن عيسى', avatarInitials: 'آب', avatarColor: '#7C3AED',
    institution: 'zawia', specialty: 'شبكات الحاسوب', rank: AcademicRank.PROFESSOR,
  },
  'registrar@test.ly': {
    /* R320 §B lockstep fix: the seed corpus (prisma/seed.ts, c1-RENAME)
       renamed this account's display name to the role's canonical name
       «المسجل العام» — this twin table still carried the retired
       pre-rename office name, so the FIRST ensure pass (which runs
       before the corpus in db:seed) created the production row with
       the dead name and no pass ever healed it (update touched only
       the password). The two sources now agree; the belt pins the
       lockstep. (R321 §A7: the stale literal retired from comments —
       the ledger scan owns the history.) */
    firstName: 'المسجل', lastName: 'العام', avatarInitials: 'مع', avatarColor: '#9B6FE8',
    institution: 'zawia',
  },
  'faculty@test.ly': {
    firstName: 'خديجة', lastName: 'المرابط', avatarInitials: 'خم', avatarColor: '#2EC4B6',
    institution: 'zawia',
  },
  'quality@test.ly': {
    firstName: 'ضمان', lastName: 'الجودة', avatarInitials: 'جو', avatarColor: '#D4A537',
    institution: 'zawia',
  },
  'owner@test.ly': {
    firstName: 'مالك', lastName: 'المنصة', avatarInitials: 'مل', avatarColor: '#6B7280',
    institution: 'zawia', // informational only — the owner NEVER gets a membership
  },
};

/** Ensure the demo skeleton exists (same natural keys as the seed body,
 * so fresh installs and bare boot-time skeletons converge on the same
 * rows the corpus seed would create). */
async function ensureSkeleton(prisma: PrismaClient) {
  const zawia = await prisma.institution.upsert({
    where: { slug: 'madarek-demo' },
    update: { name: 'جامعة مدارك التجريبية', nameEn: 'Madarek Demo University', status: 'ACTIVE' },
    create: {
      id: 'inst-zawia-showcase',
      name: 'جامعة مدارك التجريبية',
      nameEn: 'Madarek Demo University',
      slug: 'madarek-demo',
      status: 'ACTIVE',
    },
  });
  const alandalus = await prisma.institution.upsert({
    where: { slug: 'alandalus-demo' },
    update: { name: 'مؤسسة الأندلس التعليمية', nameEn: 'Al-Andalus Education Institute', status: 'ACTIVE' },
    create: {
      name: 'مؤسسة الأندلس التعليمية',
      nameEn: 'Al-Andalus Education Institute',
      slug: 'alandalus-demo',
      status: 'ACTIVE',
    },
  });
  const zawiaItFaculty = await prisma.faculty.upsert({
    where: {
      institutionId_name_city: { institutionId: zawia.id, name: 'كلية تقنية المعلومات', city: 'حرم المعرفة' },
    },
    create: {
      name: 'كلية تقنية المعلومات', nameEn: 'Information Technology', iconEmoji: '💻',
      city: 'حرم المعرفة', institutionId: zawia.id,
    },
    update: {},
  });
  const aaFaculty = await prisma.faculty.upsert({
    where: {
      institutionId_name_city: { institutionId: alandalus.id, name: 'كلية تقنية المعلومات', city: 'طرابلس' },
    },
    create: {
      name: 'كلية تقنية المعلومات', nameEn: 'Information Technology', iconEmoji: '💻',
      city: 'طرابلس', institutionId: alandalus.id,
    },
    update: {},
  });
  const zawiaCsDept = await prisma.department.upsert({
    where: { facultyId_name: { facultyId: zawiaItFaculty.id, name: 'علوم الحاسوب' } },
    create: { name: 'علوم الحاسوب', nameEn: 'Computer Science', facultyId: zawiaItFaculty.id },
    update: {},
  });
  const aaCsDept = await prisma.department.upsert({
    where: { facultyId_name: { facultyId: aaFaculty.id, name: 'علوم الحاسوب' } },
    create: { name: 'علوم الحاسوب', nameEn: 'Computer Science', facultyId: aaFaculty.id },
    update: {},
  });
  return {
    zawia, alandalus,
    zawiaItFaculty, aaFaculty,
    zawiaCsDept, aaCsDept,
  };
}

/** Allocate the first FREE reg number in the institution (never steals
 * an existing profile's number — institution-scoped uniqueness). */
async function allocateRegNumber(
  prisma: PrismaClient,
  institutionId: string,
  candidates: readonly string[],
): Promise<string | null> {
  for (const candidate of candidates) {
    const taken = await prisma.studentProfile.findUnique({
      where: { institutionId_universityId: { institutionId, universityId: candidate } },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return null;
}

/** Best-effort: enrol a student in up to `max` of the institution's
 * existing offerings (the corpus seed owns the rich offerings; on a
 * bare skeleton there are none and the pass is skipped). */
async function ensureEnrolments(
  prisma: PrismaClient,
  studentId: string,
  institutionId: string,
  max: number,
): Promise<number> {
  const offerings = await prisma.courseOffering.findMany({
    where: { course: { institutionId } },
    select: { id: true },
    take: max,
    orderBy: { createdAt: 'asc' },
  });
  let created = 0;
  for (const offering of offerings) {
    const existing = await prisma.enrollment.findUnique({
      where: { studentId_offeringId: { studentId, offeringId: offering.id } },
      select: { id: true },
    });
    if (!existing) {
      await prisma.enrollment.create({
        data: { studentId, offeringId: offering.id, status: 'active' },
      });
      created += 1;
    }
  }
  return created;
}

/**
 * The idempotent test-account ensure. Returns the number of jobs in the
 * table (every account is upserted — created or healed — on every run).
 * Throws on infrastructure errors (callers decide fatality: the seed
 * lets it fail the run; the boot path catches and logs).
 */
export async function ensureTestAccounts(prisma: PrismaClient): Promise<number> {
  const skeleton = await ensureSkeleton(prisma);
  const passwordHash = await hashPassword(TEST_PASSWORD);

  for (const account of TEST_ACCOUNTS) {
    const profile = ACCOUNT_PROFILES[account.email];
    if (!profile) continue; // unknown account — the table and profiles must stay in lockstep

    const institution =
      profile.institution === 'alandalus' ? skeleton.alandalus : skeleton.zawia;
    const faculty = profile.institution === 'alandalus' ? skeleton.aaFaculty : skeleton.zawiaItFaculty;
    const department = profile.institution === 'alandalus' ? skeleton.aaCsDept : skeleton.zawiaCsDept;

    // ── user: create-or-heal by the fixed test email ──────────────
    // The heal (update) branch converges the row on the canonical
    // profile — display name included. These are OUR @test.ly accounts
    // (isTestAccountEmail is the marker); no real user's name can be
    // touched here, and a row created by an older table version (the
    // production pre-rename-name drift) self-heals on the next
    // db:seed / boot ensure instead of living forever.
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        passwordHash,
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarInitials: profile.avatarInitials,
        avatarColor: profile.avatarColor,
        // Governance scope is part of the account's documented contract:
        // faculty-scoped for `scoped`, university-wide (NULL) otherwise.
        scopeFacultyId: account.scoped ? skeleton.zawiaItFaculty.id : null,
      },
      create: {
        email: account.email,
        passwordHash,
        role: account.role,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarInitials: profile.avatarInitials,
        avatarColor: profile.avatarColor,
        emailVerifiedAt: new Date(),
        scopeFacultyId: account.scoped ? skeleton.zawiaItFaculty.id : null,
      },
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: account.email },
      select: { id: true },
    });

    // ── membership (the platform OWNER deliberately has NONE) ─────
    let membershipId: string | null = null;
    if (account.role !== Role.OWNER) {
      const membership = await prisma.membership.upsert({
        where: { userId_institutionId: { userId: user.id, institutionId: institution.id } },
        update: { role: account.role, isActive: true },
        create: { userId: user.id, institutionId: institution.id, role: account.role, isActive: true },
      });
      membershipId = membership.id;
    }

    // ── academic profiles ─────────────────────────────────────────
    if (account.role === Role.STUDENT && membershipId) {
      const existing = await prisma.studentProfile.findFirst({
        where: { userId: user.id, institutionId: institution.id },
        select: { id: true },
      });
      if (!existing) {
        const regNumber = await allocateRegNumber(
          prisma,
          institution.id,
          profile.regNumbers ?? [],
        );
        if (regNumber) {
          await prisma.studentProfile.create({
            data: {
              userId: user.id,
              membershipId,
              institutionId: institution.id,
              universityId: regNumber,
              facultyId: faculty.id,
              departmentId: department.id,
              ...(profile.year !== undefined ? { year: profile.year } : {}),
              ...(profile.gpa !== undefined ? { gpa: profile.gpa } : {}),
              ...(profile.totalXp !== undefined ? { totalXp: profile.totalXp } : {}),
              ...(profile.level !== undefined ? { level: profile.level } : {}),
            },
          });
        }
      }
      // Best-effort enrolments (skipped silently on a bare skeleton).
      await ensureEnrolments(prisma, user.id, institution.id, 2);
    }

    if (account.role === Role.TEACHER && membershipId) {
      const existing = await prisma.teacherProfile.findFirst({
        where: { userId: user.id, membership: { institutionId: institution.id } },
        select: { id: true },
      });
      if (!existing) {
        await prisma.teacherProfile.create({
          data: {
            userId: user.id,
            membershipId,
            specialty: profile.specialty ?? 'علوم الحاسوب',
            rank: profile.rank ?? AcademicRank.LECTURER,
            departmentId: department.id,
            // The leadership appointment IS the job (رئيس قسم/عميد/نائب
            // عميد ride the TEACHER role + TeacherProfile.position).
            ...(account.position ? { position: account.position } : {}),
          },
        });
      } else if (account.position) {
        // Heal positional drift on re-runs (the job table is the truth).
        await prisma.teacherProfile.update({
          where: { id: existing.id },
          data: { position: account.position },
        });
      }
    }
  }

  return TEST_ACCOUNTS.length;
}
