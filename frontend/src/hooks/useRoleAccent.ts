/**
 * useRoleAccent — apply `body[data-role="…"]` from the active user's
 * role + (optional) academic position, so the role-accent token table
 * in tokens.css resolves the correct hue at the chrome layer.
 *
 * Mapping (012-design-graphics-uplift §FR-004):
 *   STUDENT                              → 'student'
 *   TEACHER + position=DEAN              → 'dean'
 *   TEACHER + position=ASSOCIATE_DEAN    → 'dean'
 *   TEACHER + position=DEPARTMENT_HEAD   → 'department-head'
 *   TEACHER + (no position)              → 'faculty'
 *   ADMIN                                → 'admin'
 *   QUALITY                              → 'quality'
 *   OWNER                                → 'owner'
 *
 * The hook clears the attribute on sign-out so a guest visitor's chrome
 * falls back to `--accent` (the existing 001-* default).
 */
import { useEffect } from 'react';
import { useMe } from './useAuth';

export type RoleAccentKey =
  | 'student'
  | 'faculty'
  | 'department-head'
  | 'dean'
  | 'admin'
  | 'quality'
  | 'owner';

export function useRoleAccent(): RoleAccentKey | null {
  const { data: me } = useMe();
  const role = me?.role;
  const position = me?.teacherProfile?.position ?? null;

  let key: RoleAccentKey | null = null;
  if (role === 'STUDENT')      key = 'student';
  else if (role === 'TEACHER') {
    if (position === 'DEAN' || position === 'ASSOCIATE_DEAN')   key = 'dean';
    else if (position === 'DEPARTMENT_HEAD')                    key = 'department-head';
    else                                                         key = 'faculty';
  }
  else if (role === 'ADMIN')   key = 'admin';
  else if (role === 'QUALITY') key = 'quality';
  else if (role === 'OWNER')   key = 'owner';

  useEffect(() => {
    const body = document.body;
    if (key) body.dataset.role = key;
    else delete body.dataset.role;
    return () => {
      delete body.dataset.role;
    };
  }, [key]);

  return key;
}
