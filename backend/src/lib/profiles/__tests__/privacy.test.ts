/**
 * r349-P2 — the privacy matrix, tested CELL BY CELL. PRIVACY-MATRIX.md
 * documents the grid; these tests ARE the grid (one `it` per role ×
 * field family, every cell pinned by an assertion — a change here is a
 * deliberate policy change with its own commit).
 *
 * DB-free: pure engine in src/lib/profiles/privacy.ts.
 */
import { describe, expect, it } from 'vitest';
import type { Role } from '@prisma/client';
import {
  canViewPeople,
  maskPhoneDisplay,
  nationalIdAccess,
  phoneAccess,
  shapeStudentProfileFor,
  shapeTeacherProfileFor,
  type StudentProfileInput,
  type TeacherProfileInput,
} from '../privacy.js';
import { maskNationalId } from '../national-id.js';

const ROLES: Role[] = ['STUDENT', 'TEACHER', 'ADMIN', 'QUALITY', 'OWNER'];

function studentRow(overrides: Partial<StudentProfileInput> = {}): StudentProfileInput {
  return {
    id: 'sp1',
    userId: 'u1',
    institutionId: 'inst1',
    universityId: 'UM-2024-00001',
    nameAr: 'محمد علي سالم عمر',
    nameEn: 'Mohamed Ali',
    fatherName: 'علي',
    grandfatherName: 'سالم',
    motherName: 'فاطمة',
    dateOfBirth: new Date('2006-04-01'),
    birthPlace: 'طرابلس',
    gender: 'MALE',
    city: 'طرابلس',
    address: 'شارع عمران',
    profileImageUrl: null,
    studentPhone: '0912345678',
    studentPhoneNormalized: '218912345678',
    studentPhoneVisibility: 'INSTITUTION_STAFF',
    additionalPhone: null,
    guardianName: 'علي سالم',
    guardianRelationship: 'أب',
    guardianPhone: '0925556666',
    guardianPhoneNormalized: '218925556666',
    guardianPhoneVisibility: 'INSTITUTION_STAFF',
    emergencyContactName: 'سميرة',
    emergencyContactPhone: '0911112222',
    nationalId: '119012345678',
    nationalIdHash: 'a'.repeat(64),
    stage: null,
    grade: null,
    section: null,
    previousSchool: null,
    transferStatus: 'مستجد',
    studyType: 'MORNING',
    enrollmentStatus: 'ACTIVE',
    secondarySchool: 'ثانوية طرابلس',
    secondarySchoolBranch: 'علمي',
    secondarySchoolPercent: { toNumber: () => 88.5 } as never,
    admissionYear: 2024,
    ...overrides,
  };
}

function teacherRow(overrides: Partial<TeacherProfileInput> = {}): TeacherProfileInput {
  return {
    id: 'tp1',
    userId: 'u9',
    specialty: 'رياضيات',
    rank: 'LECTURER',
    bio: null,
    profileImageUrl: null,
    officeLocation: 'مبنى أ — 305',
    officeHours: 'الأحد 10-12',
    websiteUrl: null,
    employeeId: 'EMP-77',
    nameAr: 'سالم الفيتوري',
    nameEn: 'Salem',
    personalPhone: '0917778899',
    personalPhoneNormalized: '218917778899',
    personalPhoneVisibility: 'INSTITUTION_STAFF',
    officialPhone: '0211234567',
    officialEmail: 'salem@test.ly',
    preferredContact: 'WHATSAPP',
    ...overrides,
  };
}

describe('r349-P2 · phoneAccess — role × visibility cells', () => {
  it('SELF always sees the raw phone (whatever the visibility)', () => {
    for (const role of ROLES) {
      expect(phoneAccess({ role, isSelf: true }, 'PRIVATE')).toBe('VISIBLE');
      expect(phoneAccess({ role, isSelf: true }, 'INSTITUTION_STAFF')).toBe('VISIBLE');
    }
  });

  it('STAFF × INSTITUTION_STAFF → VISIBLE', () => {
    for (const role of ['TEACHER', 'ADMIN', 'QUALITY', 'OWNER'] as const) {
      expect(phoneAccess({ role, isSelf: false }, 'INSTITUTION_STAFF')).toBe('VISIBLE');
    }
  });

  it('STAFF × PRIVATE → MASKED (the contact-request door)', () => {
    for (const role of ['TEACHER', 'ADMIN', 'QUALITY', 'OWNER'] as const) {
      expect(phoneAccess({ role, isSelf: false }, 'PRIVATE')).toBe('MASKED');
    }
  });

  it('STUDENT × any (not self) → HIDDEN', () => {
    expect(phoneAccess({ role: 'STUDENT', isSelf: false }, 'INSTITUTION_STAFF')).toBe('HIDDEN');
    expect(phoneAccess({ role: 'STUDENT', isSelf: false }, 'PRIVATE')).toBe('HIDDEN');
  });
});

describe('r349-P2 · nationalIdAccess — role cells', () => {
  it('SELF → VISIBLE (the owner reads their own id)', () => {
    for (const role of ROLES) {
      expect(nationalIdAccess({ role, isSelf: true })).toBe('VISIBLE');
    }
  });

  it('OWNER and ADMIN → VISIBLE (governance duty of care)', () => {
    expect(nationalIdAccess({ role: 'OWNER', isSelf: false })).toBe('VISIBLE');
    expect(nationalIdAccess({ role: 'ADMIN', isSelf: false })).toBe('VISIBLE');
  });

  it('QUALITY → MASKED', () => {
    expect(nationalIdAccess({ role: 'QUALITY', isSelf: false })).toBe('MASKED');
  });

  it('TEACHER → HIDDEN (never — not even masked)', () => {
    expect(nationalIdAccess({ role: 'TEACHER', isSelf: false })).toBe('HIDDEN');
  });

  it('STUDENT (other) → HIDDEN', () => {
    expect(nationalIdAccess({ role: 'STUDENT', isSelf: false })).toBe('HIDDEN');
  });
});

describe('r349-P2 · maskPhoneDisplay', () => {
  it('keeps the last three digits only', () => {
    expect(maskPhoneDisplay('0912345678')).toBe('•••• 678');
  });

  it('null/empty stays null (no value — no mask)', () => {
    expect(maskPhoneDisplay(null)).toBeNull();
    expect(maskPhoneDisplay('   ')).toBeNull();
  });

  it('too-short values collapse to a blind mask', () => {
    expect(maskPhoneDisplay('123')).toBe('•••');
  });
});

describe('r349-P2 · shapeStudentProfileFor — the shaped payload cells', () => {
  it('SELF view: raw phone, raw national id, full guardian block', () => {
    const v = shapeStudentProfileFor(studentRow(), { role: 'STUDENT', isSelf: true });
    expect(v.phone).toEqual({ access: 'VISIBLE', display: '0912345678', canRequestContact: false });
    expect(v.nationalId).toEqual({ access: 'VISIBLE', value: '119012345678' });
    expect((v.guardian as { phone: { display: string } }).phone.display).toBe('0925556666');
  });

  it('TEACHER view (roster student): raw staff phone, guardian per visibility, nationalId HIDDEN', () => {
    const v = shapeStudentProfileFor(studentRow(), { role: 'TEACHER', isSelf: false });
    expect(v.phone).toEqual({ access: 'VISIBLE', display: '0912345678', canRequestContact: false });
    expect(v.nationalId).toEqual({ access: 'HIDDEN', value: null });
    expect(v.nationalIdPresent).toBe(true);
    expect((v.guardian as { phone: { display: string } }).phone.display).toBe('0925556666');
  });

  it('TEACHER view × PRIVATE phone → masked + canRequestContact', () => {
    const v = shapeStudentProfileFor(
      studentRow({ studentPhoneVisibility: 'PRIVATE', guardianPhoneVisibility: 'PRIVATE' }),
      { role: 'TEACHER', isSelf: false },
    );
    expect(v.phone).toEqual({ access: 'MASKED', display: '•••• 678', canRequestContact: true });
    expect((v.guardian as { phone: { display: string } }).phone.display).toBe('•••• 666');
  });

  it('ADMIN view: raw phones, raw nationalId', () => {
    const v = shapeStudentProfileFor(studentRow(), { role: 'ADMIN', isSelf: false });
    expect(v.phone).toEqual({ access: 'VISIBLE', display: '0912345678', canRequestContact: false });
    expect(v.nationalId).toEqual({ access: 'VISIBLE', value: '119012345678' });
  });

  it('QUALITY view: raw staff phone, MASKED nationalId', () => {
    const v = shapeStudentProfileFor(studentRow(), { role: 'QUALITY', isSelf: false });
    expect(v.nationalId).toEqual({ access: 'MASKED', value: maskNationalId('119012345678') });
    expect((v.nationalId as { value: string }).value).toBe('1••••••••78');
  });

  it('STUDENT (other) view: phones HIDDEN, guardian null, nationalId HIDDEN', () => {
    const v = shapeStudentProfileFor(studentRow(), { role: 'STUDENT', isSelf: false });
    expect(v.phone).toEqual({ access: 'HIDDEN', display: null, canRequestContact: false });
    expect(v.guardian).toBeNull();
    expect(v.nationalId).toEqual({ access: 'HIDDEN', value: null });
  });

  it('academic block: null enrollmentStatus defaults to ACTIVE for every viewer', () => {
    const v = shapeStudentProfileFor(studentRow({ enrollmentStatus: null }), {
      role: 'TEACHER',
      isSelf: false,
    });
    expect((v.academic as { enrollmentStatus: string }).enrollmentStatus).toBe('ACTIVE');
  });

  it('secondarySchoolPercent serializes (Decimal-like → number)', () => {
    const v = shapeStudentProfileFor(studentRow(), { role: 'ADMIN', isSelf: false });
    expect((v.academic as { secondarySchoolPercent: number }).secondarySchoolPercent).toBe(88.5);
  });
});

describe('r349-P2 · shapeTeacherProfileFor — the shaped payload cells', () => {
  it('SELF: raw personal phone, employeeId visible', () => {
    const v = shapeTeacherProfileFor(teacherRow(), { role: 'TEACHER', isSelf: true });
    expect(v.phone).toEqual({ access: 'VISIBLE', display: '0917778899', canRequestContact: false });
    expect(v.employeeId).toBe('EMP-77');
  });

  it('ADMIN: employeeId + raw phone; QUALITY: employeeId null, phone raw', () => {
    const admin = shapeTeacherProfileFor(teacherRow(), { role: 'ADMIN', isSelf: false });
    expect(admin.employeeId).toBe('EMP-77');
    const quality = shapeTeacherProfileFor(teacherRow(), { role: 'QUALITY', isSelf: false });
    expect(quality.employeeId).toBeNull();
    expect(quality.phone).toEqual({ access: 'VISIBLE', display: '0917778899', canRequestContact: false });
  });

  it('TEACHER (colleague) × PRIVATE personal phone → masked + request door', () => {
    const v = shapeTeacherProfileFor(
      teacherRow({ personalPhoneVisibility: 'PRIVATE' }),
      { role: 'TEACHER', isSelf: false },
    );
    expect(v.phone).toEqual({ access: 'MASKED', display: '•••• 899', canRequestContact: true });
  });

  it('officialPhone/officialEmail are public to staff regardless of visibility', () => {
    const v = shapeTeacherProfileFor(
      teacherRow({ personalPhoneVisibility: 'PRIVATE' }),
      { role: 'TEACHER', isSelf: false },
    );
    expect(v.officialPhone).toBe('0211234567');
    expect(v.officialEmail).toBe('salem@test.ly');
  });
});

describe('r349-P2 · canViewPeople — the surface gate', () => {
  it('staff roles only; STUDENT never', () => {
    expect(canViewPeople('STUDENT')).toBe(false);
    for (const role of ['TEACHER', 'ADMIN', 'QUALITY', 'OWNER'] as const) {
      expect(canViewPeople(role)).toBe(true);
    }
  });
});
