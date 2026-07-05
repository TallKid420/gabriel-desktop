'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { auth } from '@/services';
import { useSessionStore } from '@/stores/session-store';
import type { DevPrincipalOption } from '@/types';

function GabrielMark() {
  return (
    <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
      <svg viewBox="0 0 24 24" className="size-6" fill="none">
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

export function LoginView() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data: principals, isLoading } = useQuery({
    queryKey: ['dev-principals'],
    queryFn: () => auth.listDevPrincipals(),
  });

  const safePrincipals = (principals ?? []).filter(
    (option): option is DevPrincipalOption =>
      Boolean(option?.user?.id && option?.organization?.id),
  );

  const signIn = async (option: DevPrincipalOption) => {
    setPendingId(option.user.id);
    try {
      const session = await auth.loginWithDevPrincipal(option.user.id);
      setSession(session);
      router.push('/');
    } catch {
      setPendingId(null);
    }
  };

  return (
    <div className="grid min-h-dvh w-full place-items-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <GabrielMark />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Gabriel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enterprise AI Operating System
          </p>
        </div>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Dev Identity Provider</p>
              <p className="text-xs text-muted-foreground">
                Select an identity to sign in. Disabled in production (ADR-007).
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}

          <ul className="flex flex-col gap-2">
            {safePrincipals.map((p) => {
              const busy = pendingId === p.user.id;
              return (
                <li key={p.user.id}>
                  <button
                    onClick={() => signIn(p)}
                    disabled={Boolean(pendingId)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors',
                      'hover:border-primary/40 disabled:opacity-60',
                    )}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {p.user.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {p.user.displayName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.organization.name}
                      </span>
                    </span>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {p.roles[0]?.replace('_', ' ')}
                    </Badge>
                    {busy ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Sessions carry identity only — no permissions. Authorization is
          evaluated at runtime by Core&apos;s Policy Engine (ADR-019).
        </p>
      </div>
    </div>
  );
}
