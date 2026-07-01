'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeft, Search, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_WORKSPACES, ICONS, getWorkspaceByHref } from '@/config/navigation';
import { useUIStore } from '@/stores/ui-store';
import { useSessionStore } from '@/stores/session-store';

function GabrielMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex aspect-square items-center justify-center rounded-lg bg-primary text-primary-foreground',
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
        <path
          d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      </svg>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openCommand = useUIStore((s) => s.setCommandPaletteOpen);
  const session = useSessionStore((s) => s.session);

  const activeId = getWorkspaceByHref(pathname).id;
  const orgLabel = session
    ? `${session.organization.name}${session.organization.plan ? ` · ${session.organization.plan}` : ''}`
    : 'Gabriel';
  const userName = session?.user.displayName ?? 'Not signed in';
  const userRole = session?.user.roles?.[0]?.replace('_', ' ') ?? 'dev session';
  const initials = session?.user.initials ?? 'G';

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      {/* Workspace / org switcher */}
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-sidebar-accent',
            collapsed && 'justify-center',
          )}
        >
          <GabrielMark className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-semibold text-sidebar-foreground">
                Gabriel
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {orgLabel}
              </span>
            </span>
          )}
          {!collapsed && (
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>
        {!collapsed && (
          <button
            onClick={toggleSidebar}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Collapse sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Command palette trigger */}
      <div className="px-3 pb-2">
        <button
          onClick={() => openCommand(true)}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-background/40 px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-sidebar-foreground',
            collapsed && 'justify-center px-0',
          )}
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search</span>
              <kbd className="rounded border border-sidebar-border bg-sidebar px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-2">
        {!collapsed && (
          <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Workspace
          </p>
        )}
        <ul className="flex flex-col gap-0.5">
          {NAV_WORKSPACES.map((item) => {
            const Icon = ICONS[item.icon];
            const isActive = activeId === item.id;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                    collapsed && 'justify-center px-0',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                  {Icon && (
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0',
                        isActive && 'text-primary',
                      )}
                    />
                  )}
                  {!collapsed && (
                    <span className="flex-1 text-left font-medium">
                      {item.label}
                    </span>
                  )}
                  {!collapsed && item.badge && (
                    <span className="rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — current principal */}
      <div className="border-t border-sidebar-border p-3">
        {collapsed ? (
          <button
            onClick={toggleSidebar}
            className="grid h-9 w-full place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Expand sidebar"
          >
            <PanelLeft className="h-4 w-4 rotate-180" />
          </button>
        ) : (
          <Link
            href="/settings"
            className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-sidebar-accent"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {initials}
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {userName}
              </span>
              <span className="truncate text-xs capitalize text-muted-foreground">
                {userRole}
              </span>
            </span>
          </Link>
        )}
      </div>
    </aside>
  );
}
