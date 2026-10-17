/**
 * r180-F3 — study-room hook contract pins (the useResources-contracts
 * pattern).
 *
 * The r180 backend routes (social.routes.ts) gained their first FE
 * consumers this round; these pins hold the wiring contract:
 *   - useStudyRooms reads GET /study-rooms through the envelope.
 *   - useCreateStudyRoom / useJoinStudyRoom / useLeaveStudyRoom POST
 *     their routes, invalidate the ['study-rooms'] family ONCE (the
     r179 prefix convention — institution-scoped keys still match), and
 *     push the Arabic toast feedback the hooks own (useOwner.ts
 *     precedent).
 *   - 409 (duplicate join) / 400 (owner leave) backend messages are
 *     Arabic — apiErrorMessage surfaces them VERBATIM; a Latin-only
 *     failure falls back to the hook's Arabic copy (15-j P0-1).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../src/lib/api', () => {
  const post = vi.fn(async () => ({ data: {} }));
  const get = vi.fn(async () => ({ data: {} }));
  return {
    api: { post, get, patch: vi.fn(), delete: vi.fn() },
    unwrap: <T,>(p: Promise<{ data: T }>): Promise<T> => p.then((r) => r.data),
  };
});

import {
  useStudyRooms, useCreateStudyRoom, useJoinStudyRoom, useLeaveStudyRoom,
} from '../../src/hooks/useResources';
import { api } from '../../src/lib/api';
import { useToastStore } from '../../src/lib/toast';

const post = api.post as unknown as Mock;
const get = api.get as unknown as Mock;

function makeClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const invalidatedKeys = () =>
    invalidate.mock.calls.map((c) => (c[0] as { queryKey: readonly unknown[] }).queryKey);
  return { invalidatedKeys, wrapper };
}

const lastToast = () => useToastStore.getState().items.at(-1);

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({ data: {} });
  get.mockReset();
  get.mockResolvedValue({ data: {} });
  useToastStore.setState({ items: [] });
});

describe('useStudyRooms — the institution-scoped list query (r180)', () => {
  it('reads GET /study-rooms through the envelope', async () => {
    const rows = [{
      id: 'r1', name: 'مجموعة مراجعة الشبكات', topic: 'فصل التوجيه',
      createdAt: '2026-10-01T09:00:00.000Z',
      owner: { id: 'u1', firstName: 'ليلى', lastName: 'بن عامر', avatarInitials: 'لع' },
      _count: { members: 3 },
      isMember: false,
    }];
    get.mockResolvedValueOnce({ data: rows });
    const { wrapper } = makeClient();
    const { result } = renderHook(() => useStudyRooms(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith('/study-rooms');
    expect(result.current.data).toEqual(rows);
  });
});

describe('useCreateStudyRoom (r180)', () => {
  it('posts /study-rooms, invalidates the rooms family once, toasts the created room', async () => {
    post.mockResolvedValueOnce({ data: { id: 'r9', name: 'غرفة القياس', topic: null } });
    const { wrapper, invalidatedKeys } = makeClient();
    const { result } = renderHook(() => useCreateStudyRoom(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: 'غرفة القياس' });
    });

    expect(post).toHaveBeenCalledWith('/study-rooms', { name: 'غرفة القياس' });
    expect(invalidatedKeys().filter((k) => k[0] === 'study-rooms')).toEqual([['study-rooms']]);
    expect(lastToast()?.variant).toBe('success');
    expect(lastToast()?.title).toBe('تمّ إنشاء الغرفة');
    expect(lastToast()?.message).toBe('أُنشئت «غرفة القياس» وأنت أول أعضائها.');
  });

  it('a failure toasts the Arabic fallback copy (no Latin leak)', async () => {
    post.mockRejectedValueOnce(new Error('Network Error'));
    const { wrapper } = makeClient();
    const { result } = renderHook(() => useCreateStudyRoom(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: 'غرفة القياس' }).catch(() => undefined);
    });

    expect(lastToast()?.variant).toBe('error');
    expect(lastToast()?.message).toBe('تعذَّر إنشاء الغرفة — تحقّق من البيانات وحاول مرة أخرى.');
  });
});

describe('useJoinStudyRoom (r180)', () => {
  it('posts /study-rooms/:id/join, invalidates + names the room in the toast', async () => {
    post.mockResolvedValueOnce({ data: { roomId: 'r1', userId: 'u1' } });
    const { wrapper, invalidatedKeys } = makeClient();
    const { result } = renderHook(() => useJoinStudyRoom(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ roomId: 'r1', name: 'مجموعة مراجعة الشبكات' });
    });

    expect(post).toHaveBeenCalledWith('/study-rooms/r1/join', {});
    expect(invalidatedKeys().filter((k) => k[0] === 'study-rooms')).toEqual([['study-rooms']]);
    expect(lastToast()?.variant).toBe('success');
    expect(lastToast()?.message).toBe('انضممت إلى «مجموعة مراجعة الشبكات».');
  });

  it('the 409 duplicate-join message surfaces VERBATIM (apiErrorMessage — the backend copy is Arabic)', async () => {
    post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { error: { code: 'CONFLICT', message: 'أنت عضو في هذه الغرفة بالفعل' } },
      },
    });
    const { wrapper } = makeClient();
    const { result } = renderHook(() => useJoinStudyRoom(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ roomId: 'r1', name: 'مجموعة مراجعة الشبكات' }).catch(() => undefined);
    });

    expect(lastToast()?.variant).toBe('error');
    expect(lastToast()?.message).toBe('أنت عضو في هذه الغرفة بالفعل');
  });
});

describe('useLeaveStudyRoom (r180)', () => {
  it('posts /study-rooms/:id/leave, invalidates + toasts the departure', async () => {
    post.mockResolvedValueOnce({ data: { roomId: 'r1', left: true } });
    const { wrapper, invalidatedKeys } = makeClient();
    const { result } = renderHook(() => useLeaveStudyRoom(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ roomId: 'r1', name: 'مجموعة مراجعة الشبكات' });
    });

    expect(post).toHaveBeenCalledWith('/study-rooms/r1/leave', {});
    expect(invalidatedKeys().filter((k) => k[0] === 'study-rooms')).toEqual([['study-rooms']]);
    expect(lastToast()?.variant).toBe('success');
    expect(lastToast()?.message).toBe('غادرت «مجموعة مراجعة الشبكات».');
  });

  it('the 400 owner-leave message surfaces VERBATIM («مالك الغرفة لا يغادرها»)', async () => {
    post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { error: { code: 'BAD_REQUEST', message: 'مالك الغرفة لا يغادرها' } },
      },
    });
    const { wrapper } = makeClient();
    const { result } = renderHook(() => useLeaveStudyRoom(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ roomId: 'r2', name: 'غرفة الخوارزميات' }).catch(() => undefined);
    });

    expect(lastToast()?.variant).toBe('error');
    expect(lastToast()?.message).toBe('مالك الغرفة لا يغادرها');
  });
});
