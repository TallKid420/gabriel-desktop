/**
 * Composed client providers mounted once at the root: server-state cache
 * (TanStack Query) + theme synchronization. Session hydration is handled by the
 * app-group layout guard, not here, so the login route stays lightweight.
 */
'use client';

import { useEffect, type ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { useUIStore } from '@/stores/ui-store';

function ThemeSync() {
  const theme = useUIStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeSync />
      {children}
    </QueryProvider>
  );
}
