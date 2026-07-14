'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth, GatewayError } from '@/services';
import { useSessionStore } from '@/stores/session-store';
import { GabrielMark } from './login-view';

export function RegisterView() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const session = await auth.register({
        email,
        password,
        displayName,
        organizationName: organizationName.trim() || undefined,
      });
      setSession(session);
      router.push('/');
    } catch (err) {
      if (err instanceof GatewayError && err.status === 409) {
        setError('An account with this email already exists.');
      } else if (err instanceof GatewayError) {
        setError(err.message || 'Registration failed. Please try again.');
      } else {
        setError('Unable to reach the Gabriel API. Is the backend running?');
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-dvh w-full place-items-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <GabrielMark />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Gabriel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your workspace
          </p>
        </div>

        <Card className="p-6">
          <div className="mb-5">
            <p className="text-sm font-semibold">Create an account</p>
            <p className="text-xs text-muted-foreground">
              You&apos;ll become the owner of a new organization.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">Full name</Label>
              <Input
                id="displayName"
                autoComplete="name"
                placeholder="Ada Lovelace"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="organizationName">
                Organization name{' '}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="organizationName"
                autoComplete="organization"
                placeholder="Acme Inc."
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="mt-1 w-full">
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              Create account
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
