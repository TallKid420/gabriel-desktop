'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Settings, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { auth } from '@/services';
import { useSessionStore } from '@/stores/session-store';

export function UserMenu() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const clear = useSessionStore((s) => s.clear);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!session) return null;
  const { user, organization } = session;

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await auth.logout();
    } catch {
      // Local sign-out proceeds regardless.
    } finally {
      clear();
      toast.success('Signed out');
      router.replace('/login');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-accent"
          aria-label="Account menu"
        >
          <Avatar className="size-7">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
            <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium sm:block">
            {user.displayName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{user.displayName}</span>
          {user.email && (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          )}
          <span className="mt-1 truncate text-[11px] font-normal text-muted-foreground">
            {organization.name}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            if (!loggingOut) void onLogout();
          }}
          className="text-destructive focus:text-destructive"
        >
          {loggingOut ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
