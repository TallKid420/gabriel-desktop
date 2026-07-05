'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, Cpu, MoreHorizontal, Play, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { ErrorState, LoadingGrid } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types';
import { useAgents, useCreateAgent, useDeleteAgent } from './hooks';

type AgentFilter = 'all' | 'active' | 'idle' | 'paused';

const STATUS_DOT_CLASS: Record<AgentStatus, string> = {
  active: 'bg-emerald-500',
  idle: 'bg-slate-400',
  paused: 'bg-amber-500',
  disabled: 'bg-zinc-400',
};

function StatusDot({ status }: { status: AgentStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn('h-2 w-2 rounded-full', STATUS_DOT_CLASS[status])} />
      <span className="capitalize">{status}</span>
    </span>
  );
}

export function AgentsView({ onAsk }: { onAsk?: (q: string) => void }) {
  const [filter, setFilter] = useState<AgentFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('gabriel-mock-pro');
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data: agents, isLoading, isError, refetch } = useAgents();
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();
  const filtered =
    agents?.filter((a) => filter === 'all' || a.status === filter) ?? [];

  const canCreate = name.trim().length > 0 && role.trim().length > 0;

  function resetCreateForm() {
    setName('');
    setRole('');
    setDescription('');
    setModel('gabriel-mock-pro');
  }

  async function handleCreateAgent() {
    if (!canCreate) return;

    try {
      const created = await createAgent.mutateAsync({
        name: name.trim(),
        role: role.trim(),
        description: description.trim() || undefined,
        config: {
          provider: 'mock',
          model: model.trim() || 'gabriel-mock-pro',
          temperature: 0.3,
          maxTokens: 2048,
        },
      });
      toast.success(`Created ${created.name}`);
      setCreateOpen(false);
      resetCreateForm();
    } catch {
      toast.error('Failed to create agent');
    }
  }

  async function handleDeleteAgent() {
    if (!deleteTarget) return;

    try {
      await deleteAgent.mutateAsync(deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete agent');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Agents"
        description="Autonomous AI workers scoped to your organization. Deploy, monitor, and orchestrate specialized agents across departments."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New agent
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create agent</DialogTitle>
            <DialogDescription>
              Provision a new agent, then configure advanced settings on its detail page.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Claims Assistant"
                disabled={createAgent.isPending}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="agent-role">Role</Label>
              <Input
                id="agent-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="First-notice-of-loss intake & triage"
                disabled={createAgent.isPending}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="agent-model">Model</Label>
              <Input
                id="agent-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gabriel-mock-pro"
                disabled={createAgent.isPending}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="agent-description">Description (optional)</Label>
              <Textarea
                id="agent-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this agent is responsible for..."
                disabled={createAgent.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createAgent.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreateAgent()}
              disabled={!canCreate || createAgent.isPending}
            >
              {createAgent.isPending ? 'Creating...' : 'Create agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete agent?</DialogTitle>
            <DialogDescription>
              This will permanently remove{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.name ?? 'this agent'}
              </span>
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteAgent.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteAgent()}
              disabled={deleteAgent.isPending}
            >
              {deleteAgent.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isError && <ErrorState onRetry={() => refetch()} />}
      {isLoading && <LoadingGrid count={4} />}

      {agents && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {(['all', 'active', 'idle', 'paused'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                  filter === f
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((agent, index) => (
              <Card
                key={agent.grn ?? agent.id ?? `${agent.name}-${index}`}
                className="flex flex-col gap-4 p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                    style={{
                      backgroundColor: `${agent.accent ?? 'var(--primary)'}26`,
                      color: agent.accent ?? 'var(--primary)',
                    }}
                  >
                    <Bot className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {agent.name}
                      </h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            aria-label="Agent options"
                            type="button"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-36">
                          <DropdownMenuItem
                            onClick={() =>
                              setDeleteTarget({ id: agent.id, name: agent.name })
                            }
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {agent.role}
                    </p>
                    <div className="mt-1.5">
                      <StatusDot status={agent.status} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-background/50 p-2.5 text-center">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {(agent.metrics?.runs ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted-foreground">runs</p>
                  </div>
                  <div className="border-x border-border">
                    <p className="text-sm font-semibold text-foreground">
                      {agent.metrics?.successRate ?? 0}%
                    </p>
                    <p className="text-[11px] text-muted-foreground">success</p>
                  </div>
                  <div>
                    <p className="flex items-center justify-center gap-1 text-sm font-semibold text-foreground">
                      <Cpu className="h-3 w-3 text-muted-foreground" />
                      {(agent.config?.model ?? 'unknown').replace('gabriel-', '')}
                    </p>
                    <p className="text-[11px] text-muted-foreground">model</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      onAsk?.(`Run ${agent.name} on my latest task`)
                    }
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/15 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/25"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run
                  </button>
                  <Link
                    href={`/agents/${agent.id}`}
                    className="flex flex-1 items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Configure
                  </Link>
                </div>
              </Card>
            ))}

            {filtered.length === 0 && (
              <Card className="col-span-full flex flex-col items-center gap-2 p-10 text-center">
                <Bot className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No agents match this filter.
                </p>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
