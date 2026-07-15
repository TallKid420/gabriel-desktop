'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Cpu, BookOpen } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import {
  useAgent,
  useKnowledgeSources,
  useProviderModels,
  useProviders,
  useSetAgentEnabled,
  useUpdateAgent,
} from './hooks';

const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface Draft {
  name: string;
  description: string;
  systemPrompt: string;
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number | undefined;
  knowledgeSources: string[];
}

function draftFromAgent(agent: {
  name: string;
  description?: string;
  systemPrompt?: string;
  knowledgeSources?: string[];
  config: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}): Draft {
  return {
    name: agent.name,
    description: agent.description ?? '',
    systemPrompt: agent.systemPrompt ?? agent.config.systemPrompt ?? '',
    provider: agent.config.provider,
    model: agent.config.model,
    temperature: agent.config.temperature ?? 0.7,
    maxTokens: agent.config.maxTokens,
    knowledgeSources: agent.knowledgeSources ?? [],
  } as Draft;
}

export function AgentDetail({ agentId }: { agentId: string }) {
  const { data: agent, isLoading, isError, refetch } = useAgent(agentId);
  const updateAgent = useUpdateAgent(agentId);
  const setEnabled = useSetAgentEnabled(agentId);
  const { data: providers } = useProviders();
  const { data: knowledgeSources } = useKnowledgeSources();

  const [draft, setDraft] = useState<Draft | null>(null);
  const { data: models } = useProviderModels(draft?.provider);

  useEffect(() => {
    if (agent) setDraft(draftFromAgent(agent));
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

  const baseline = draftFromAgent(agent);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const enabled = agent.status !== 'disabled';

  const save = async () => {
    try {
      await updateAgent.mutateAsync({
        name: draft.name.trim(),
        description: draft.description.trim(),
        systemPrompt: draft.systemPrompt,
        knowledgeSources: draft.knowledgeSources,
        config: {
          provider: draft.provider,
          model: draft.model.trim(),
          temperature: draft.temperature,
          maxTokens: draft.maxTokens,
        },
      });
      toast.success('Agent saved');
    } catch {
      toast.error('Failed to save agent');
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

  const toggleSource = (grn: string) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            knowledgeSources: d.knowledgeSources.includes(grn)
              ? d.knowledgeSources.filter((g) => g !== grn)
              : [...d.knowledgeSources, grn],
          }
        : d,
    );

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
        description={agent.description ?? 'Agent configuration'}
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
            <Button onClick={save} disabled={!dirty || updateAgent.isPending}>
              <Save className="size-4" />
              {updateAgent.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="systemPrompt">System prompt</Label>
                <Textarea
                  id="systemPrompt"
                  rows={5}
                  value={draft.systemPrompt}
                  onChange={(e) =>
                    setDraft({ ...draft, systemPrompt: e.target.value })
                  }
                  placeholder="Instructions that define this agent's behavior…"
                />
              </div>
            </CardContent>
          </Card>

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
                      setDraft({ ...draft, provider: e.target.value, model: '' })
                    }
                    className={selectClass}
                  >
                    {(providers ?? []).map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                        {p.default ? ' (default)' : ''}
                      </option>
                    ))}
                    {/* Preserve the current provider even if not in the list */}
                    {providers &&
                      !providers.some((p) => p.name === draft.provider) &&
                      draft.provider && (
                        <option value={draft.provider}>{draft.provider}</option>
                      )}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="model">Model</Label>
                  {models && models.length > 0 ? (
                    <select
                      id="model"
                      value={draft.model}
                      onChange={(e) =>
                        setDraft({ ...draft, model: e.target.value })
                      }
                      className={selectClass}
                    >
                      {!models.some((m) => m.name === draft.model) &&
                        draft.model && (
                          <option value={draft.model}>{draft.model}</option>
                        )}
                      {models.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="model"
                      value={draft.model}
                      onChange={(e) =>
                        setDraft({ ...draft, model: e.target.value })
                      }
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="temperature">
                    Temperature ({draft.temperature})
                  </Label>
                  <input
                    id="temperature"
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={draft.temperature}
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
                        maxTokens: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BookOpen className="size-4 text-primary" />
                Knowledge sources
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                Ground this agent&apos;s answers in selected document
                collections (RAG).
              </p>
              {(knowledgeSources ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No knowledge sources yet. Create one from the Documents page.
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                {(knowledgeSources ?? []).map((ks) => {
                  const selected = draft.knowledgeSources.includes(ks.grn);
                  return (
                    <button
                      key={ks.grn}
                      type="button"
                      onClick={() => toggleSource(ks.grn)}
                      className={cn(
                        'flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        selected
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span className="truncate">{ks.name}</span>
                      {selected && (
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          linked
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lifecycle</span>
                <Badge className="capitalize">{agent.status}</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Enabled</span>
                <span className="text-sm font-medium text-foreground">
                  {enabled ? 'Yes' : 'No'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
