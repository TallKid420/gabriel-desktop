'use client';

import Link from 'next/link';
import {
  Bot,
  FileText,
  MessagesSquare,
  Activity,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { ErrorState, LoadingGrid } from '@/components/common/states';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDashboard } from './hooks';
import { useSessionStore } from '@/stores/session-store';
import { useUIStore } from '@/stores/ui-store';
import { formatRelativeTime } from '@/lib/format';

const QUICK_ASKS = [
  'Summarize activity across all agents today',
  'What needs my attention right now?',
  'Draft a status update for my team',
];

export function DashboardView() {
  const { data, isLoading, isError, refetch } = useDashboard();
  const session = useSessionStore((s) => s.session);
  const askAssistant = useUIStore((s) => s.askAssistant);
  const firstName = session?.user.displayName?.split(' ')[0] ?? 'there';

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Your organization at a glance — agents, conversations, documents, and recent activity."
      />

      {isError && <ErrorState onRetry={() => refetch()} />}
      {isLoading && <LoadingGrid count={4} />}

      {data && (
        <div className="flex flex-col gap-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {data.stats.map((s) => (
              <Card key={s.label} className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {s.value}
                </p>
                {s.hint && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>
                )}
              </Card>
            ))}
          </div>

          {/* Quick asks */}
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Ask Gabriel</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_ASKS.map((q) => (
                <button
                  key={q}
                  onClick={() => askAssistant(q)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Active agents */}
            <section>
              <SectionHeader
                icon={<Bot className="size-4" />}
                title="Active agents"
                href="/agents"
              />
              <div className="flex flex-col gap-2">
                {data.activeAgents.map((a) => (
                  <Link key={a.grn} href={`/agents/${a.id}`}>
                    <Card className="flex items-center gap-3 p-3 transition-colors hover:border-primary/40">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold text-white"
                        style={{ background: a.accent ?? 'var(--primary)' }}
                      >
                        {a.name.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.role}
                        </p>
                      </div>
                      <Badge variant="success">active</Badge>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>

            {/* Recent conversations */}
            <section>
              <SectionHeader
                icon={<MessagesSquare className="size-4" />}
                title="Recent conversations"
                href="/chat"
              />
              <div className="flex flex-col gap-2">
                {data.recentConversations.map((c) => (
                  <Link key={c.id} href={`/chat/${c.id}`}>
                    <Card className="p-3 transition-colors hover:border-primary/40">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{c.lastMessagePreview}</span>
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground/70">
                        {formatRelativeTime(c.updatedAt)}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>

            {/* Recent documents */}
            <section>
              <SectionHeader
                icon={<FileText className="size-4" />}
                title="Recent documents"
                href="/documents"
              />
              <div className="flex flex-col gap-2">
                {data.recentDocuments.map((d) => (
                  <Card key={d.grn} className="flex items-center gap-3 p-3">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.filename}
                      </p>
                    </div>
                    <Badge variant={d.status === 'ready' ? 'success' : 'warning'}>
                      {d.status}
                    </Badge>
                  </Card>
                ))}
              </div>
            </section>

            {/* Recent activity */}
            <section>
              <SectionHeader
                icon={<Activity className="size-4" />}
                title="Recent activity"
              />
              <div className="flex flex-col gap-2">
                {data.recentEvents.map((e) => (
                  <Card key={e.id} className="flex items-center gap-3 p-3">
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-foreground">
                        {e.type}
                      </p>
                      {e.resourceGrn && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {e.resourceGrn}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground/70">
                      {formatRelativeTime(e.occurredAt)}
                    </span>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </div>
      {href && (
        <Button asChild variant="ghost" size="xs">
          <Link href={href}>
            View all
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}
