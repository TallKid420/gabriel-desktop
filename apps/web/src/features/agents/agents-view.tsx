'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, Cpu, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
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
import {
  useAgents,
  useCreateAgent,
  useDeleteAgent,
  useKnowledgeSources,
  useProviderModels,
  useProviders,
} from './hooks';

type AgentFilter = 'all' | 'active' | 'idle' | 'paused';

const STATUS_DOT_CLASS: Record<AgentStatus, string> = {
  active: 'bg-emerald-500',
  idle: 'bg-slate-400',
  paused: 'bg-amber-500',
  disabled: 'bg-zinc-400',
};

const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';

function StatusDot({ status }: { status: AgentStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn('h-2 w-2 rounded-full', STATUS_DOT_CLASS[status])} />
      <span className="capitalize">{status}</span>
    </span>
  );
}

export function AgentsView() {
  const [filter, setFilter] = useState<AgentFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data: agents, isLoading, isError, refetch } = useAgents();
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();
  const { data: providers } = useProviders();
  const { data: models } = useProviderModels(provider || undefined);
  const { data: knowledgeSources } = useKnowledgeSources();

  // Default the provider select to the gateway's default provider.
  useEffect(() => {
    if (!provider && providers && providers.length > 0) {
      const preferred = providers.find((p) => p.default) ?? providers[0];
      setProvider(preferred.name);
    }
  }, [providers, provider]);

  // Default the model to the provider's first advertised model.
  useEffect(() => {
    if (models && models.length > 0) {
      setModel((current) =>
        current && models.some((m) => m.name === current) ? current : models[0].name,
      );
    }
  }, [models]);

  const filtered =
    agents?.filter((a) => filter === 'all' || a.status === filter) ?? [];

  const canCreate = name.trim().length > 0 && model.trim().length > 0;

  function resetCreateForm() {
    setName('');
    setDescription('');
    setSystemPrompt('');
    setModel('');
    setSelectedSources([]);
  }

  function toggleSource(grn: string) {
    setSelectedSources((prev) =>
      prev.includes(grn) ? prev.filter((g) => g !== grn) : [...prev, grn],
    );
  }

  async function handleCreateAgent() {
    if (!canCreate) return;
    try {
      const created = await createAgent.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
        config: {
          provider: provider || 'ollama',
          model: model.trim(),
          temperature: 0.3,
          maxTokens: 2048,
        },
        knowledgeSources: selectedSources,
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
        description="Autonomous AI workers scoped to your organization. Configure their model, instructions, and knowledge grounding."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New agent
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create agent</DialogTitle>
            <DialogDescription>
              Provision a new agent. You can refine everything later on its
              detail page.
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
              <Label htmlFor="agent-description">Description</Label>
              <Input
                id="agent-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="First-notice-of-loss intake & triage"
                disabled={createAgent.isPending}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="agent-system-prompt">System prompt</Label>
              <Textarea
                id="agent-system-prompt"
                rows={4}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful claims specialist. Always..."
                disabled={createAgent.isPending}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="agent-provider">Provider</Label>
                <select
                  id="agent-provider"
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value);
                    setModel('');
                  }}
                  className={selectClass}
                  disabled={createAgent.isPending}
                >
                  {(providers ?? []).map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                      {p.default ? ' (default)' : ''}
                    </option>
                  ))}
                  {(!providers || providers.length === 0) && (
                    <option value="">No providers available</option>
                  )}
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="agent-model">Model</Label>
                {models && models.length > 0 ? (
                  <select
                    id="agent-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className={selectClass}
                    disabled={createAgent.isPending}
                  >
                    {models.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="agent-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="llama3.1:8b"
                    disabled={createAgent.isPending}
                  />
                )}
              </div>
            </div>

            {knowledgeSources && knowledgeSources.length > 0 && (
              <div className="grid gap-1.5">
                <Label>Knowledge sources</Label>
                <div className="flex flex-wrap gap-1.5">
                  {knowledgeSources.map((ks) => {
                    const selected = selectedSources.includes(ks.grn);
                    return (
                      <button
                        key={ks.grn}
                        type="button"
                        onClick={() => toggleSource(ks.grn)}
                        className={cn(
                          'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                          selected
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {ks.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
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
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {agent.description ?? agent.role}
                    </p>
                    <div className="mt-1.5">
                      <StatusDot status={agent.status} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5" />
                    {agent.config?.model || 'no model'}
                  </span>
                  <span className="capitalize">{agent.config?.provider}</span>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/agents/${encodeURIComponent(agent.id)}`}
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
