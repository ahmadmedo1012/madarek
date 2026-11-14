/**
 * R350 F2 — the import wizard, pinned:
 *
 * 1. The stepper carries the five Arabic steps; the upload step shows
 *    the dropzone + template link, and the honest size cap in copy.
 * 2. After /import/parse: step 2 renders the mapping table (headers,
 *    target selects, confidence pills, LIVE sample values) and the
 *    preset chips with coverage (the unverified ghweil chip labelled).
 * 3. After /import/preview: step 3 renders the verdict rows with the
 *    I-P2 duplicate diff (from → to) and the per-row policy select;
 *    the filters re-scope the table.
 * 4. The confirm step names exactly what will happen (counts + policy
 *    select + createIfMissing); commit posts rowPolicies + duplicatePolicy.
 * 5. The result step: counts, the one-time credentials sheet, the
 *    rollback button behind a confirm.
 *
 * lib/api is mocked at the module boundary (the 16-E5 pattern); the
 * auth store's institution scope is pinned to a registrar session.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../src/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../src/stores/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../src/lib/api', () => {
  const get = vi.fn(async () => ({ data: {} }));
  const post = vi.fn(async () => ({ data: {} }));
  return {
    api: { get, post, patch: vi.fn(), delete: vi.fn() },
    unwrap: <T,>(promise: Promise<{ data: { data: T } }>): Promise<T> =>
      promise.then((r) => r.data.data),
  };
});

import { ImportWizardPage } from '../../src/pages/admin/ImportWizardPage';
import { api } from '../../src/lib/api';

const postMock = api.post as unknown as Mock;

function renderWithProviders() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/import']}>
        <Routes>
          <Route path="/admin/import" element={<ImportWizardPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const PARSE_OK = {
  format: 'CSV',
  sheets: [],
  encoding: 'utf-8',
  delimiter: ',',
  headers: ['الاسم الكامل', 'رقم القيد', 'اسم ولي الأمر'],
  rowCount: 2,
  sampleRows: [['سالم العماري', '9003', 'الطاهر المبروك'], ['هدى الفيتوري', '9004', '']],
  detectedLanguage: 'ar',
  suggestedMap: {
    version: 1,
    columns: [
      { source: 'الاسم الكامل', target: 'nameAr' },
      { source: 'رقم القيد', target: 'universityId' },
      { source: 'اسم ولي الأمر', target: 'guardianName' },
    ],
  },
  unknownColumns: [],
  presetSuggestions: [
    { id: 'generic-university', labelAr: 'قالب جامعة (عام)', coverage: 1, verified: true, placedColumns: 3, missingTargets: [] },
    { id: 'ghweil-school', labelAr: 'منظومة الغويل للمدارس (غير موثّق)', coverage: 0.5, verified: false, placedColumns: 2, missingTargets: ['year'] },
  ],
};

const PREVIEW_OK = {
  jobId: 'job-1',
  counts: { total: 2, ok: 2, error: 0, warningCount: 1 },
  duplicateReport: {},
  rows: [
    {
      line: 1, status: 'ok' as const, errorsAr: [], warningsAr: ['رقم القيد «9003» موجود مسبقًا — ستُطبَّق سياسة التكرار'],
      existing: { universityId: '9003', nameAr: 'سالم الطاهر العماري' },
      diff: [
        { field: 'nameAr', fieldAr: 'الاسم', from: 'سالم الطاهر العماري', to: 'سالم العماري' },
        { field: 'guardianName', fieldAr: 'اسم ولي الأمر', from: '', to: 'الطاهر المبروك' },
      ],
      fillable: ['اسم ولي الأمر'],
    },
    { line: 2, status: 'ok' as const, errorsAr: [], warningsAr: [] },
  ],
};

const COMMIT_OK = {
  jobId: 'job-1',
  succeeded: 2,
  skipped: 0,
  failed: 0,
  activationMailQueued: 0,
  credentials: [
    { name: 'هدى الفيتوري', universityId: '9004', email: '9004@students.import.madarek.local', tempPassword: 'TempPass-123456' },
  ],
};

function uploadCsv() {
  const file = new File(['الاسم,رقم القيد\nسالم,9003'], 'students.csv', { type: 'text/csv' });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  vi.clearAllMocks();
  postMock.mockImplementation(async (url: string) => {
    if (url === '/import/parse') return { data: { data: PARSE_OK } };
    if (url === '/import/preview') return { data: { data: PREVIEW_OK } };
    if (url === '/import/jobs/job-1/commit') return { data: { data: COMMIT_OK } };
    return { data: { data: {} } };
  });
});

describe('R350 F2 — the import wizard', () => {
  it('the stepper carries the five Arabic steps; the upload step is honest', () => {
    renderWithProviders();
    const steps = screen.getAllByRole('list', { name: 'خطوات الاستيراد' })[0]!;
    const labels = Array.from(steps.querySelectorAll('.iw-step-label')).map((el) => el.textContent);
    expect(labels).toEqual(['رفع الملف', 'مطابقة الأعمدة', 'المراجعة', 'التأكيد', 'النتيجة']);
    expect(screen.getByText('اسحب ملف Excel أو CSV هنا')).toBeTruthy();
    expect(screen.getByText(/حتى ١٠ ميغابايت/)).toBeTruthy();
  });

  it('parse lands on the mapping step: headers + sample values + confidence + preset chips', async () => {
    renderWithProviders();
    uploadCsv();
    await waitFor(() => { expect(screen.getByRole('button', { name: /متابعة إلى المطابقة/ })).toBeEnabled(); });
    fireEvent.click(screen.getByRole('button', { name: /متابعة إلى المطابقة/ }));
    // step-2 markers: the mapping table's own header + the presets strip
    await waitFor(() => { expect(screen.getByText('عمود الملف')).toBeTruthy(); });
    expect(screen.getByText('سالم العماري')).toBeTruthy();
    expect(screen.getByText('9003')).toBeTruthy();
    // the confidence pills
    expect(screen.getAllByText('تلقائي').length).toBeGreaterThanOrEqual(3);
    // the preset chips: verified + the honestly-unverified ghweil
    expect(screen.getByText('قالب جامعة (عام)')).toBeTruthy();
    expect(screen.getByText('غير موثّق')).toBeTruthy();
    // a chip re-parses WITH the presetId (the placement runs server-side)
    fireEvent.click(screen.getByRole('button', { name: /قالب جامعة/ }));
    await waitFor(() => {
      const parseCalls = postMock.mock.calls.filter((c) => c[0] === '/import/parse');
      expect(parseCalls.length).toBeGreaterThanOrEqual(2);
      expect((parseCalls[parseCalls.length - 1]![1] as { presetId?: string }).presetId).toBe('generic-university');
    });
  });

  it('the duplicate row carries the I-P2 diff (from → to) + the per-row policy select', async () => {
    renderWithProviders();
    uploadCsv();
    await waitFor(() => { expect(screen.getByRole('button', { name: /متابعة إلى المطابقة/ })).toBeEnabled(); });
    fireEvent.click(screen.getByRole('button', { name: /متابعة إلى المطابقة/ }));
    await waitFor(() => { expect(screen.getByText('عمود الملف')).toBeTruthy(); });
    fireEvent.click(screen.getByRole('button', { name: /عرض المراجعة/ }));
    await waitFor(() => { expect(screen.getByText('سياسة الصف')).toBeTruthy(); });
    // the diff: existing name struck-through, the file's name bold
    expect(screen.getByText('سالم الطاهر العماري')).toBeTruthy();
    // the exact pill text (the filter button carries «موجود مسبقًا (1)» — exact match disambiguates)
    expect(screen.getByText('موجود مسبقًا', { exact: true })).toBeTruthy();
    // the per-row policy select on the duplicate row only
    const policySelect = screen.getByLabelText('سياسة السطر 1') as HTMLSelectElement;
    expect(policySelect).toBeTruthy();
    fireEvent.change(policySelect, { target: { value: 'FILL_EMPTY' } });
    // the filter chips re-scope: duplicates-only keeps the matched row, drops the new one
    fireEvent.click(screen.getByRole('button', { name: /موجود مسبقًا \(/ }));
    expect(screen.getByText('سالم الطاهر العماري')).toBeTruthy();
    expect(screen.queryByText('هدى الفيتوري')).toBeNull();
  });

  it('confirm names what will happen; commit carries the policies; the result shows the credentials + rollback', async () => {
    renderWithProviders();
    uploadCsv();
    await waitFor(() => { expect(screen.getByRole('button', { name: /متابعة إلى المطابقة/ })).toBeEnabled(); });
    fireEvent.click(screen.getByRole('button', { name: /متابعة إلى المطابقة/ }));
    await waitFor(() => { expect(screen.getByText('عمود الملف')).toBeTruthy(); });
    fireEvent.click(screen.getByRole('button', { name: /عرض المراجعة/ }));
    await waitFor(() => { expect(screen.getByText('سياسة الصف')).toBeTruthy(); });
    fireEvent.click(screen.getByRole('button', { name: /متابعة إلى التأكيد/ }));
    await waitFor(() => { expect(screen.getByText(/ما الذي سيحدث بالضبط/)).toBeTruthy(); });
    // the global policy select + the createIfMissing toggle
    expect(screen.getByLabelText('سياسة التكرار العامة')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /تثبيت الاستيراد نهائيًا/ }));
    await waitFor(() => { expect(screen.getByText('TempPass-123456')).toBeTruthy(); });
    // the commit POST carried the body the steps built
    const commitCall = postMock.mock.calls.find((c) => String(c[0]).includes('/commit'))!;
    expect(commitCall).toBeTruthy();
    const body = commitCall[1] as { duplicatePolicy: string; rowPolicies: Record<string, string> };
    expect(body.duplicatePolicy).toBe('SKIP');
    expect(body.rowPolicies).toEqual({});
    // the one-time credentials sheet + the rollback affordance
    expect(screen.getByText('TempPass-123456')).toBeTruthy();
    expect(screen.getByRole('button', { name: /التراجع عن المهمة/ })).toBeTruthy();
  });
});
