'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Cpu, BookOpen, FolderOpen, Wrench } from 'lucide-react';
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
import { useTools } from '@/features/tools/hooks';
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
  documentCollections: string[];
  allowedTools: string[];
  disabledTools: string[];
}

function draftFromAgent(agent: {
  name: string;
  description?: string;
  systemPrompt?: string;
  knowledgeSources?: string[];
  documentCollections?: string[];
  disabledTools?: string[];
  config: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    tools?: string[];
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
    documentCollections: agent.documentCollections ?? [],
    allowedTools: agent.config.tools ?? [],
    disabledTools: agent.disabledTools ?? [],
  } as Draft;
}

export function AgentDetail({ agentId }: { agentId: string }) {
  const { data: agent, isLoading, isError, refetch } = useAgent(agentId);
  const updateAgent = useUpdateAgent(agentId);
  const setEnabled = useSetAgentEnabled(agentId);
  const { data: providers } = useProviders();
  const { data: knowledgeSources } = useKnowledgeSources();
  const { data: orgTools } = useTools();

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
        documentCollections: draft.documentCollections,
        allowedTools: draft.allowedTools,
        disabledTools: draft.disabledTools,
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

  /** Toggle membership of `value` in one of the draft's string-list fields. */
  const toggleListItem = (
    key: 'knowledgeSources' | 'documentCollections' | 'allowedTools' | 'disabledTools',
    value: string,
  ) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            [key]: d[key].includes(value)
              ? d[key].filter((v) => v !== value)
              : [...d[key], value],
          }
        : d,
    );

  const toggleSource = (grn: string) => toggleListItem('knowledgeSources', grn);

  /** Assign/unassign a tool. Unassigning also clears any per-agent disable. */
  const toggleTool = (name: string) =>
    setDraft((d) => {
      if (!d) return d;
      const assigned = d.allowedTools.includes(name);
      return {
        ...d,
        allowedTools: assigned
          ? d.allowedTools.filter((t) => t !== name)
          : [...d.allowedTools, name],
        disabledTools: assigned
          ? d.disabledTools.filter((t) => t !== name)
          : d.disabledTools,
      };
    });

  // Split knowledge sources by type: vector collections stay in the
  // "Knowledge sources" card, typed document collections get their own card.
  const vectorSources = (knowledgeSources ?? []).filter(
    (ks) => ks.sourceType !== 'document_collection',
  );
  const documentCollections = (knowledgeSources ?? []).filter(
    (ks) => ks.sourceType === 'document_collection',
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Wrench className="size-4 text-primary" />
                Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                Capabilities this agent may invoke.{' '}
                {draft.allowedTools.length === 0
                  ? 'No tools assigned — the agent can use every enabled tool.'
                  : 'Only the assigned tools are available to this agent.'}
              </p>
              {(orgTools ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No tools registered yet. Register one from the Tools page.
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                {(orgTools ?? []).map((tool) => {
                  const assigned = draft.allowedTools.includes(tool.name);
                  const deniedHere = draft.disabledTools.includes(tool.name);
                  return (
                    <div
                      key={tool.grn}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                        assigned && !deniedHere
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTool(tool.name)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:text-foreground"
                      >
                        <span className="truncate font-medium">{tool.name}</span>
                        <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                          {tool.description}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-2">
                        {!tool.enabled && (
                          <Badge variant="destructive">Disabled org-wide</Badge>
                        )}
                        {assigned ? (
                          <>
                            <span className="text-xs text-muted-foreground">
                              {deniedHere ? 'Blocked' : 'Allowed'}
                            </span>
                            <Switch
                              checked={!deniedHere}
                              onCheckedChange={() =>
                                toggleListItem('disabledTools', tool.name)
                              }
                              aria-label={`Toggle ${tool.name} for this agent`}
                            />
                          </>
                        ) : (
                          <Badge variant="outline">Not assigned</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                Ground this agent&apos;s answers in embedded vector collections
                (RAG).
              </p>
              {vectorSources.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No knowledge sources yet. Create one from the Documents page.
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                {vectorSources.map((ks) => {
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
              <CardTitle className="flex items-center gap-2 text-sm">
                <FolderOpen className="size-4 text-primary" />
                Document collections
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                Typed document collections that also ground this agent&apos;s
                answers.
              </p>
              {documentCollections.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No document collections yet. Create one from the Documents
                  page.
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                {documentCollections.map((dc) => {
                  const selected = draft.documentCollections.includes(dc.grn);
                  return (
                    <button
                      key={dc.grn}
                      type="button"
                      onClick={() =>
                        toggleListItem('documentCollections', dc.grn)
                      }
                      className={cn(
                        'flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        selected
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span className="truncate">{dc.name}</span>
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
