'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Cpu, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { ErrorState } from '@/components/common/states';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import type { AgentConfig, LLMProviderId } from '@/types';
import { useAgent, useUpdateAgentConfig, useSetAgentEnabled } from './hooks';

const PROVIDERS: { id: LLMProviderId; label: string }[] = [
  { id: 'mock', label: 'Gabriel Mock (M0)' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'google', label: 'Google' },
  { id: 'ollama', label: 'Ollama (self-hosted)' },
];

const REASONING: NonNullable<AgentConfig['reasoningLevel']>[] = ['low', 'medium', 'high'];

/** The formal per-execution lifecycle (ADR-034) shown for transparency. */
const LIFECYCLE_STAGES = [
  'created',
  'queued',
  'planning',
  'executing',
  'waiting',
  'completed',
];

export function AgentDetail({ agentId }: { agentId: string }) {
  const { data: agent, isLoading, isError, refetch } = useAgent(agentId);
  const updateConfig = useUpdateAgentConfig(agentId);
  const setEnabled = useSetAgentEnabled(agentId);

  const [draft, setDraft] = useState<AgentConfig | null>(null);

  useEffect(() => {
    if (agent) setDraft(agent.config);
  }, [agent]);

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading || !agent || !draft) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(agent.config);
  const enabled = agent.status !== 'disabled';

  const save = async () => {
    try {
      await updateConfig.mutateAsync(draft);
      toast.success('Agent configuration saved');
    } catch {
      toast.error('Failed to save configuration');
    }
  };

  const toggleEnabled = async (next: boolean) => {
    try {
      await setEnabled.mutateAsync(next);
      toast.success(next ? 'Agent enabled' : 'Agent disabled');
    } catch {
      toast.error('Failed to update agent');
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/agents">
          <ArrowLeft className="size-4" />
          All agents
        </Link>
      </Button>

      <PageHeader
        title={agent.name}
        description={agent.role}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={enabled}
                onCheckedChange={toggleEnabled}
                disabled={setEnabled.isPending}
                aria-label="Toggle agent"
              />
            </div>
            <Button onClick={save} disabled={!dirty || updateConfig.isPending}>
              <Save className="size-4" />
              Save
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Cpu className="size-4 text-primary" />
                Model configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="provider">Provider</Label>
                  <select
                    id="provider"
                    value={draft.provider}
                    onChange={(e) =>
                      setDraft({ ...draft, provider: e.target.value as LLMProviderId })
                    }
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={draft.model}
                    onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="temperature">
                    Temperature ({draft.temperature ?? 0.7})
                  </Label>
                  <input
                    id="temperature"
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={draft.temperature ?? 0.7}
                    onChange={(e) =>
                      setDraft({ ...draft, temperature: Number(e.target.value) })
                    }
                    className="accent-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="maxTokens">Max tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={draft.maxTokens ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        maxTokens: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reasoning">Reasoning</Label>
                  <select
                    id="reasoning"
                    value={draft.reasoningLevel ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        reasoningLevel:
                          (e.target.value as AgentConfig['reasoningLevel']) || undefined,
                      })
                    }
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Default</option>
                    {REASONING.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="systemPrompt">System prompt</Label>
                <Textarea
                  id="systemPrompt"
                  rows={5}
                  value={draft.systemPrompt ?? ''}
                  onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
                  placeholder="Instructions that define this agent's behavior…"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="size-4 text-primary" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Metric label="Total runs" value={agent.metrics?.runs.toLocaleString() ?? '—'} />
              <Separator />
              <Metric
                label="Success rate"
                value={agent.metrics ? `${agent.metrics.successRate}%` : '—'}
              />
              <Separator />
              <Metric label="Current status" value={<Badge>{agent.status}</Badge>} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Execution lifecycle</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">
                Every run transitions through formal states (ADR-034). Each
                transition emits an immutable event in Core.
              </p>
              <ol className="flex flex-col gap-1.5">
                {LIFECYCLE_STAGES.map((s, i) => (
                  <li key={s} className="flex items-center gap-2 text-xs">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="font-mono text-foreground">{s}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
