'use client';

import { usePathname } from 'next/navigation';
import {
  PanelLeft,
  Command,
  Sparkles,
  Bell,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkspaceByHref } from '@/config/navigation';
import { useUIStore } from '@/stores/ui-store';
import { useSessionStore } from '@/stores/session-store';
import { useNotificationFeed } from '@/hooks/use-notifications';
import { NotificationsMenu } from './notifications-menu';
import { UserMenu } from './user-menu';
import { OrgSwitcher } from './org-switcher';

export function Topbar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openCommand = useUIStore((s) => s.setCommandPaletteOpen);
  const assistantOpen = useUIStore((s) => s.assistantOpen);
  const toggleAssistant = useUIStore((s) => s.toggleAssistant);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const session = useSessionStore((s) => s.session);
  const { data: feed } = useNotificationFeed();
  const unread = feed?.unreadCount ?? 0;

  const current = getWorkspaceByHref(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      {collapsed && (
        <button
          onClick={toggleSidebar}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}

      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        <OrgSwitcher />
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        <span className="truncate font-medium text-foreground">
          {current.label}
        </span>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => openCommand(true)}
          className="hidden items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:flex"
        >
          <Command className="h-3.5 w-3.5" />
          <span>Command</span>
          <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </button>

        <button
          onClick={toggleTheme}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        <NotificationsMenu>
          <button
            className="relative grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        </NotificationsMenu>

        <button
          onClick={toggleAssistant}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
            assistantOpen
              ? 'border-primary/50 bg-primary/15 text-foreground'
              : 'border-border bg-card text-muted-foreground hover:text-foreground',
          )}
          aria-pressed={assistantOpen}
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Assistant
        </button>

        <UserMenu />
      </div>
    </header>
  );
}
