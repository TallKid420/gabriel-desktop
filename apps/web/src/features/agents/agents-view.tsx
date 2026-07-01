'use client';

import Link from 'next/link';
import { Bot, Cpu, Gauge } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { ErrorState, LoadingGrid } from '@/components/common/states';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AgentStatus } from '@/types';
import { useAgents } from './hooks';

const STATUS_VARIANT: Record<AgentStatus, 'success' | 'secondary' | 'warning' | 'outline'> = {
  active: 'success',
  idle: 'secondary',
  paused: 'warning',
  disabled: 'outline',
};

export function AgentsView() {
  const { data: agents, isLoading, isError, refetch } = useAgents();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Agents"
        description="Autonomous workers scoped to your organization. Each agent has its own model configuration (ADR-007 §7) — there is no global model."
      />

      {isError && <ErrorState onRetry={() => refetch()} />}
      {isLoading && <LoadingGrid count={4} />}

      {agents && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <Link key={a.grn} href={`/agents/${a.id}`}>
              <Card className="flex h-full flex-col gap-3 p-4 transition-colors hover:border-primary/40">
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold text-white"
                    style={{ background: a.accent ?? 'var(--primary)' }}
                  >
                    {a.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.role}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[a.status]}>{a.status}</Badge>
                </div>
                {a.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {a.description}
                  </p>
                )}
                <div className="mt-auto flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Cpu className="size-3.5" />
                    {a.config.model}
                  </span>
                  {a.metrics && (
                    <span className="inline-flex items-center gap-1.5">
                      <Gauge className="size-3.5" />
                      {a.metrics.successRate}%
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
          {agents.length === 0 && (
            <Card className="col-span-full flex flex-col items-center gap-2 p-10 text-center">
              <Bot className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No agents yet.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
