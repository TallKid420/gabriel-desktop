/**
 * TanStack Query provider — the app's server-state cache. All domain data flows
 * through Query (via hooks that call services); component-local UI state lives
 * in Zustand. Kept in a client component so the QueryClient is created once per
 * browser session.
 */
'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
