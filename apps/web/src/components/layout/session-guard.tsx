'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/services';
import { useSessionStore } from '@/stores/session-store';

/**
 * Hydrates the active session (ADR-007) from the Gateway/Identity Service and
 * gates the app group. Unauthenticated users are redirected to the login route.
 * The session view holds no tokens or permissions — authorization is always
 * evaluated by Core's Policy Engine at call time (ADR-019).
 */
export function SessionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const hydrated = useSessionStore((s) => s.hydrated);
  const setSession = useSessionStore((s) => s.setSession);

  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;
    auth.getSession().then((s) => {
      if (cancelled) return;
      setSession(s);
      if (!s) router.replace('/login');
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, setSession, router]);

  useEffect(() => {
    if (hydrated && !session) router.replace('/login');
  }, [hydrated, session, router]);

  if (!hydrated || !session) {
    return (
      <div className="grid h-dvh w-full place-items-center bg-background text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <span className="size-2 animate-ping rounded-full bg-primary" />
          Loading Gabriel…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
