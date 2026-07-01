import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';

/** The authenticated app group — everything inside the persistent shell. */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
