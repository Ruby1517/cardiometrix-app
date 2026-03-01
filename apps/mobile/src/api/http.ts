import { getAuthToken } from './token';

const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const DEFAULT_TIMEOUT_MS = 10000;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  return normalizeBaseUrl(envUrl && envUrl.length ? envUrl : DEFAULT_API_BASE_URL);
}

type RequestOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export async function request<T>({
  method,
  path,
  body,
  headers,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: RequestOptions): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers ?? {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (res.status === 401) {
      await useAuthStore.getState().logout({ remote: false });
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function apiGet<T>(path: string) {
  return request<T>({ method: 'GET', path });
}

export function apiPost<T>(path: string, body?: unknown) {
  return request<T>({ method: 'POST', path, body });
}

export function apiPut<T>(path: string, body?: unknown) {
  return request<T>({ method: 'PUT', path, body });
}
