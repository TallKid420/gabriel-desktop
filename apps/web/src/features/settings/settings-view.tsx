'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Moon, Sun, ShieldCheck, User as UserIcon } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useSessionStore } from '@/stores/session-store';
import { useUIStore } from '@/stores/ui-store';
import { auth } from '@/services';

export function SettingsView() {
  const session = useSessionStore((s) => s.session);
  const clearSession = useSessionStore((s) => s.clear);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    await auth.logout();
    clearSession();
    router.push('/login');
  };

  if (!session) return null;
  const { user, organization, authMethod, expiresAt } = session;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Your profile, workspace preferences, and session." />

      <div className="flex flex-col gap-4">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserIcon className="size-4 text-primary" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="text-base">{user.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{user.displayName}</p>
              {user.email && (
                <p className="text-sm text-muted-foreground">{user.email}</p>
              )}
              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground/70">
                {user.principal}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {user.roles.map((r) => (
                <Badge key={r} variant="secondary" className="capitalize">
                  {r.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Organization</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{organization.name}</p>
              <p className="text-xs text-muted-foreground">Tenant: {session.tenantId}</p>
            </div>
            {organization.plan && <Badge variant="outline">{organization.plan}</Badge>}
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">
                Switch between dark and light workspace themes.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              <Button
                variant={theme === 'dark' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTheme('dark')}
              >
                <Moon className="size-4" />
                Dark
              </Button>
              <Button
                variant={theme === 'light' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTheme('light')}
              >
                <Sun className="size-4" />
                Light
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Session */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4 text-primary" />
              Session
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Auth method</span>
              <Badge variant="outline" className="capitalize">
                {authMethod}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Expires</span>
              <span className="font-medium">
                {new Date(expiresAt).toLocaleString()}
              </span>
            </div>
            {authMethod === 'dev' && (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                You are signed in through the Dev Identity Provider. It issues the
                same session shape as production identity providers (ADR-007) and
                is disabled in production builds.
              </p>
            )}
            <Separator />
            <Button
              variant="outline"
              className="self-start text-destructive hover:text-destructive"
              onClick={logout}
              disabled={loggingOut}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
