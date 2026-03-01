'use client';

import { useEffect } from 'react';
import { getWebAuthToken } from '@/lib/webToken';

declare global {
  interface Window {
    __cmxFetchPatched?: boolean;
  }
}

function isApiPath(url: string) {
  if (url.startsWith('/api/')) return true;
  if (typeof window !== 'undefined' && url.startsWith(`${window.location.origin}/api/`)) return true;
  return false;
}

export default function AuthFetchProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined' || window.__cmxFetchPatched) return;
    window.__cmxFetchPatched = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (!isApiPath(requestUrl)) {
        return originalFetch(input, init);
      }

      const token = getWebAuthToken();
      if (!token) {
        return originalFetch(input, init);
      }

      const headers = new Headers(init?.headers || {});
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return originalFetch(input, {
        ...init,
        headers,
      });
    };
  }, []);

  return <>{children}</>;
}
