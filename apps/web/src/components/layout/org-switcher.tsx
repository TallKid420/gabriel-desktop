'use client';

import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { auth, organizations as orgService } from '@/services';
import { useSessionStore } from '@/stores/session-store';

export function OrgSwitcher() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const clear = useSessionStore((s) => s.clear);

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => orgService.listMyOrganizations(),
  });

  if (!session) return null;
  const activeId = session.organization.id;
  const list = orgs ?? [];

  const switchTo = async (name: string) => {
    // A session/token is scoped to a single organization, so switching means
    // re-authenticating. Sign out locally and return to the login screen.
    try {
      await auth.logout();
    } catch {
      // ignore — local sign-out proceeds regardless
    }
    clear();
    toast.info(`Sign in to switch to ${name}`);
    router.replace('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Switch organization"
        >
          <Building2 className="size-3.5" />
          <span className="max-w-28 truncate">{session.organization.name}</span>
          <ChevronsUpDown className="size-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {list.length === 0 && (
          <DropdownMenuItem disabled>
            <Building2 className="size-4" />
            {session.organization.name}
            <Check className="ml-auto size-4" />
          </DropdownMenuItem>
        )}
        {list.map((org) => {
          const active = org.id === activeId;
          return (
            <DropdownMenuItem
              key={org.id}
              onSelect={(e) => {
                e.preventDefault();
                if (!active) void switchTo(org.name);
              }}
            >
              <Building2 className="size-4" />
              <span className="min-w-0 flex-1 truncate">{org.name}</span>
              {org.role && (
                <span className="text-[11px] capitalize text-muted-foreground">
                  {org.role}
                </span>
              )}
              {active && <Check className="size-4 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
