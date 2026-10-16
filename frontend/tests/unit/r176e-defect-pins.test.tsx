/**
 * Frontend unit — r176e/D-02 + D-03 + D-07 + D-08 pins.
 *
 *  · D-02: the document viewer's fallback back-link is ROLE-AWARE (the
 *    old student-only default silently guard-bounced the other four
 *    roles when a global-search paper hit carried no ?back=).
 *  · D-03: the owner flag-toggle failure surface + per-row pending gate
 *    (source pins on OwnerSystemPage).
 *  · D-07: both logout buttons carry the pending guard.
 *  · D-08: useMyMessages rides keepPreviousData (the house pattern).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');

vi.mock('../../src/components/pdf/PdfViewer', async () => {
  const React = await import('react');
  return {
    default: () => React.createElement('div', { 'data-testid': 'pdf-viewer-stub' }),
  };
});

import { Suspense } from 'react';
import DocumentViewerPage from '../../src/pages/DocumentViewerPage';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';

const STUDENT: AuthUser = {
  id: 'u1', role: 'STUDENT', email: 's@test.dev',
  firstName: 'طالب', lastName: 'تجريبي', avatarInitials: 'تج',
};

describe('D-02 — the document viewer back fallback is role-aware', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  function renderViewerAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/document/:filename" element={<DocumentViewerPage />} />
          </Routes>
        </Suspense>
      </MemoryRouter>,
    );
  }

  it('STUDENT keeps the library research-tab fallback', () => {
    useAuthStore.setState({ user: STUDENT });
    renderViewerAt('/document/notes.txt');
    expect(screen.getByRole('link', { name: 'رجوع' })).toHaveAttribute('href', '/student/library?tab=research');
  });

  it('TEACHER falls back to THEIR library research tab (was: a silent guard-bounce)', () => {
    useAuthStore.setState({ user: { ...STUDENT, role: 'TEACHER', id: 't1' } });
    renderViewerAt('/document/notes.txt');
    expect(screen.getByRole('link', { name: 'رجوع' })).toHaveAttribute('href', '/teacher/library?tab=research');
  });

  it('ADMIN falls back to their dashboard home (oversight roles have no library tab)', () => {
    useAuthStore.setState({ user: { ...STUDENT, role: 'ADMIN', id: 'a1' } });
    renderViewerAt('/document/notes.txt');
    expect(screen.getByRole('link', { name: 'رجوع' })).toHaveAttribute('href', '/admin/dashboard');
  });

  it('an explicit in-app ?back= still wins for every role (the A13 off-app guard is unchanged)', () => {
    useAuthStore.setState({ user: { ...STUDENT, role: 'OWNER', id: 'o1' } });
    renderViewerAt('/document/notes.txt?back=%2Fowner%2Fsystem');
    expect(screen.getByRole('link', { name: 'رجوع' })).toHaveAttribute('href', '/owner/system');
  });
});

describe('D-03/D-07/D-08 — source pins', () => {
  const ownerSource = read('src/pages/owner/OwnerSystemPage.tsx');
  const sidebarSource = read('src/components/layout/Sidebar.tsx');
  const topbarSource = read('src/components/layout/Topbar.tsx');
  const studentHooksSource = read('src/hooks/resources/student.ts');

  it('D-03: the flag-toggle failure renders an Arabic error row with a retry that re-fires the same payload', () => {
    expect(ownerSource).toContain('toggleFlag.isError');
    expect(ownerSource).toContain('retryFlagToggle');
    expect(ownerSource).toContain('toggleFlag.mutate(vars)');
    expect(ownerSource).toContain('تعذّر تحديث العلم');
  });

  it('D-03: only the in-flight ROW is disabled (per-row variables gate, not the coarse isPending)', () => {
    expect(ownerSource).toContain('toggleFlag.isPending && toggleFlag.variables?.slug === flag.slug');
    expect(ownerSource).not.toContain('disabled={toggleFlag.isPending}\n');
  });

  it('D-07: BOTH logout buttons carry the pending guard', () => {
    expect(sidebarSource).toContain('disabled={logout.isPending}');
    expect(sidebarSource).toContain('aria-busy={logout.isPending}');
    expect(topbarSource).toContain('disabled={logoutM.isPending}');
  });

  it('D-08: useMyMessages rides placeholderData: keepPreviousData (the house anti-flicker pattern)', () => {
    const hookStart = studentHooksSource.indexOf('export function useMyMessages');
    const hookEnd = studentHooksSource.indexOf('// ── My profile', hookStart);
    const hookBody = studentHooksSource.slice(hookStart, hookEnd);
    expect(hookBody).toContain('placeholderData: keepPreviousData');
    expect(studentHooksSource).toMatch(/import \{[^}]*keepPreviousData[^}]*\} from '@tanstack\/react-query'/);
  });
});
