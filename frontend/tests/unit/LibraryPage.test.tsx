/**
 * T3-F3 — Library page tests.
 *
 * 1. Books search debounce wiring: the books query must fire on the
 *    debounced value (not per keystroke) — regression guard for the
 *    raw-`q` bug where every keystroke hit /library/books.
 * 2. sanitizeSnippetHtml: allowlist sanitizer for server-generated
 *    search snippets (only bare <mark>/</mark> survive; everything
 *    else is escaped).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { sanitizeSnippetHtml, default as LibraryPage } from '../../src/pages/student/LibraryPage';

// Stub the data hooks the page consumes; useBooks is a spy so the test
// can assert exactly which `q` value each render passed to the query.
const booksCalls = vi.hoisted(() => vi.fn());
vi.mock('../../src/hooks/useResources', () => ({
  useBooks: (opts: { category?: string; q?: string }) => {
    booksCalls(opts);
    return { data: [], isPending: false, isError: false, error: null, refetch: vi.fn() };
  },
  usePublishedResearch: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useResearchSearch: () => ({ data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useMyLoans: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
}));

const lastBooksQ = () => booksCalls.mock.calls.at(-1)?.[0]?.q;

describe('LibraryPage books search debounce wiring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    booksCalls.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fire the books query per keystroke — only after the debounce settles', () => {
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText('ابحث عن كتاب أو مؤلف…');
    expect(lastBooksQ()).toBe('');

    // Typing two characters in quick succession…
    fireEvent.change(input, { target: { value: 'ش' } });
    fireEvent.change(input, { target: { value: 'شبكات' } });

    // …must NOT have reached the query yet (the old bug passed raw q).
    expect(lastBooksQ()).toBe('');

    // After the 250ms debounce settles, the query sees the final value.
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(lastBooksQ()).toBe('شبكات');
  });

  it('trims the query before it reaches the books query', () => {
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('ابحث عن كتاب أو مؤلف…'), {
      target: { value: '  قواعد بيانات  ' },
    });
    expect(lastBooksQ()).toBe('');

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(lastBooksQ()).toBe('قواعد بيانات');
  });
});

describe('sanitizeSnippetHtml (mark-only allowlist)', () => {
  it('keeps bare <mark> and </mark> tags', () => {
    expect(sanitizeSnippetHtml('قبل <mark>المصطلح</mark> بعد')).toBe('قبل <mark>المصطلح</mark> بعد');
  });

  it('normalizes case of allowed tags', () => {
    expect(sanitizeSnippetHtml('<MARK>x</MARK>')).toBe('<mark>x</mark>');
  });

  it('neutralizes script tags', () => {
    const out = sanitizeSnippetHtml('a<script>alert(1)</script>b');
    expect(out).not.toMatch(/<script/i);
    expect(out).toContain('script');
    // The tag text is escaped, not executable markup.
    expect(out).toBe('a&lt;script&gt;alert(1)&lt;/script&gt;b');
  });

  it('escapes img / event-handler payloads', () => {
    const out = sanitizeSnippetHtml('<img src=x onerror=alert(1)>');
    expect(out).not.toMatch(/<img/i);
    expect(out).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('does NOT allow mark with attributes', () => {
    const out = sanitizeSnippetHtml('<mark class="x">t</mark>');
    // The attributed tag is fully escaped; only the closing bare tag survives.
    expect(out).toBe('&lt;mark class=&quot;x&quot;&gt;t</mark>');
  });

  it('escapes quotes and ampersands in plain text', () => {
    expect(sanitizeSnippetHtml('a & "b" \'c\'')).toBe('a &amp; &quot;b&quot; &#39;c&#39;');
  });

  it('leaves plain text without tags untouched (after escaping)', () => {
    expect(sanitizeSnippetHtml('نص عادي بلا وسم')).toBe('نص عادي بلا وسم');
  });

  it('handles a malformed half tag at the end', () => {
    const out = sanitizeSnippetHtml('text <');
    expect(out).toBe('text &lt;');
  });

  it('full snippet shape from the API survives round-trip', () => {
    const snippet = '…استخدام <mark>قواعد البيانات</mark> في الطبقة الثانية…';
    expect(sanitizeSnippetHtml(snippet)).toBe(snippet);
  });
});
