'use client';

import { useEffect, type ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { AssistantRail } from './assistant-rail';
import { CommandPalette } from './command-palette';
import { SessionGuard } from './session-guard';
import { useUIStore } from '@/stores/ui-store';

/**
 * The persistent workspace shell (ADR-035): sidebar + topbar + scrollable
 * workspace content + assistant rail + command palette. Route pages render into
 * {children}; the shell itself never unmounts, preserving context across
 * workspace switches.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const toggleCommand = useUIStore((s) => s.toggleCommandPalette);

  // Global ⌘K / Ctrl+K opens the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommand();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleCommand]);

  return (
    <SessionGuard>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
        <AssistantRail />
        <CommandPalette />
      </div>
    </SessionGuard>
  );
}
