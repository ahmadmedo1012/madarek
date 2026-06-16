import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { useAuthStore } from '../stores/auth.store';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const api = axios.create({
  baseURL,
  withCredentials: true, // refresh cookie
  timeout: 20_000,
});

// ── Request: attach access token ─────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: handle 401 by refreshing once ──────────────────────
let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ data: { accessToken: string; user: import('../stores/auth.store').AuthUser } }>(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then((r) => {
        const { user, accessToken } = r.data.data;
        useAuthStore.getState().setSession(user, accessToken);
        return accessToken;
      })
      .catch(() => {
        useAuthStore.getState().clear();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (r: AxiosResponse) => r,
  async (error: AxiosError<{ error?: { code?: string } }>) => {
    const original = error.config as (AxiosRequestConfig & { __retried?: boolean }) | undefined;
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;

    if (status === 401 && code === 'TOKEN_EXPIRED' && original && !original.__retried) {
      original.__retried = true;
      const token = await tryRefresh();
      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api.request(original);
      }
    }
    return Promise.reject(error);
  },
);

// Helper to unwrap our `{ data }` envelope
export async function unwrap<T>(promise: Promise<AxiosResponse<{ data: T }>>): Promise<T> {
  const res = await promise;
  return res.data.data;
}
