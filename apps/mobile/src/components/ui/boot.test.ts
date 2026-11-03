/**
 * boot.test.ts — pins the deterministic entry handoff
 * (`resolveEntryDestination`): the ONE rule `/` (cold start with a cached
 * session) and `/auth/login` (fresh login) share.
 */
import { resolveEntryDestination, type EntryUserLike } from "./boot";

const ROLE_HOME: Record<string, string> = {
  STUDENT: "/student/dashboard",
  TEACHER: "/teacher/dashboard",
  ADMIN: "/admin/dashboard",
  QUALITY: "/quality/dashboard",
  OWNER: "/owner/dashboard",
};

const INST = { id: "inst-1" };
const user = (role: string, currentInstitution: { id: string } | null = INST): EntryUserLike => ({
  role,
  currentInstitution,
});

describe("resolveEntryDestination — the boot/login handoff rule", () => {
  test("each role lands on its role home", () => {
    for (const role of Object.keys(ROLE_HOME)) {
      // OWNER is platform-level: no institution by design, still home.
      const u: EntryUserLike = role === "OWNER" ? { role, currentInstitution: null } : user(role);
      expect(resolveEntryDestination(u, null, ROLE_HOME)).toBe(ROLE_HOME[role]);
    }
  });

  test("unknown roles fall back to the student home", () => {
    expect(resolveEntryDestination(user("GHOST"), null, ROLE_HOME)).toBe("/student/dashboard");
  });

  test("?continue= wins only when the session can honor it", () => {
    // student with an active institution → honored
    expect(resolveEntryDestination(user("STUDENT"), "%2Fstudent%2Flibrary", ROLE_HOME)).toBe(
      "/student/library",
    );
    // OWNER (platform-level, no institution) → honored
    expect(
      resolveEntryDestination({ role: "OWNER", currentInstitution: null }, "/owner/users", ROLE_HOME),
    ).toBe("/owner/users");
    // student WITHOUT an institution context → the gate wins, continue is dropped
    expect(
      resolveEntryDestination(user("STUDENT", null), "/student/library", ROLE_HOME),
    ).toBe("/select-institution");
  });

  test("non-OWNER roles without an institution context hit the institution gate", () => {
    expect(resolveEntryDestination(user("STUDENT", null), null, ROLE_HOME)).toBe("/select-institution");
    expect(resolveEntryDestination(user("TEACHER", null), null, ROLE_HOME)).toBe("/select-institution");
    // OWNER never gates (platform-level by design)
    expect(resolveEntryDestination({ role: "OWNER", currentInstitution: null }, null, ROLE_HOME)).toBe(
      "/owner/dashboard",
    );
  });

  test("ADMIN without a context goes to its role home (RoleGate re-gates, no dead end)", () => {
    expect(resolveEntryDestination(user("ADMIN", null), null, ROLE_HOME)).toBe("/admin/dashboard");
  });

  test("a blank continue param is ignored", () => {
    expect(resolveEntryDestination(user("STUDENT"), "", ROLE_HOME)).toBe("/student/dashboard");
  });
});
