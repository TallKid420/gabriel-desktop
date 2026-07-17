'use client';

import { useMemo, useState } from 'react';
import {
  Calculator,
  CalendarDays,
  Clock,
  Dices,
  FileText,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  ScanSearch,
  Search,
  Settings2,
  Shuffle,
  Terminal,
  Trash2,
  Type,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState, ErrorState, LoadingGrid } from '@/components/common/states';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { ExecutionRuntime, Tool, ToolCategory } from '@/types';
import { EXECUTION_RUNTIMES, TOOL_CATEGORIES } from '@/types';
import {
  useCreateTool,
  useDeleteTool,
  useSetToolEnabled,
  useTools,
  useUpdateTool,
} from './hooks';

const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';

/** Per-category icon so cards scan visually, like Agent cards do. */
const CATEGORY_ICONS: Record<ToolCategory, LucideIcon> = {
  math: Calculator,
  text: Type,
  time: Clock,
  random: Dices,
  utility: Wrench,
  file: FileText,
  email: Mail,
  calendar: CalendarDays,
  search: ScanSearch,
  system: Terminal,
  custom: Shuffle,
};

const SAFETY_LABELS: Record<number, string> = {
  0: 'Safe',
  1: 'Low risk',
  2: 'Moderate risk',
  3: 'High risk',
};

type EnabledFilter = 'all' | 'enabled' | 'disabled';

interface ToolFormState {
  name: string;
  description: string;
  category: ToolCategory;
  executionRuntime: ExecutionRuntime;
  safetyLevel: number;
  runtimeBinding: string;
  configuration: string;
}

const EMPTY_FORM: ToolFormState = {
  name: '',
  description: '',
  category: 'utility',
  executionRuntime: 'local',
  safetyLevel: 0,
  runtimeBinding: '',
  configuration: '',
};

function formFromTool(tool: Tool): ToolFormState {
  return {
    name: tool.name,
    description: tool.description ?? '',
    category: tool.category,
    executionRuntime: tool.executionRuntime,
    safetyLevel: tool.safetyLevel,
    runtimeBinding: tool.runtimeBinding ?? '',
    configuration:
      Object.keys(tool.configuration).length > 0
        ? JSON.stringify(tool.configuration, null, 2)
        : '',
  };
}

/** Parse the configuration textarea; returns undefined when invalid JSON. */
function parseConfiguration(
  raw: string,
): Record<string, unknown> | undefined {
  if (!raw.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function ToolFormFields({
  form,
  setForm,
  disabled,
  idPrefix,
}: {
  form: ToolFormState;
  setForm: (next: ToolFormState) => void;
  disabled: boolean;
  idPrefix: string;
}) {
  const configValid = parseConfiguration(form.configuration) !== undefined;
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="web_search"
          disabled={disabled}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Input
          id={`${idPrefix}-description`}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Search the web and return ranked results"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-category`}>Category</Label>
          <select
            id={`${idPrefix}-category`}
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as ToolCategory })
            }
            className={selectClass}
            disabled={disabled}
          >
            {TOOL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-runtime`}>Execution runtime</Label>
          <select
            id={`${idPrefix}-runtime`}
            value={form.executionRuntime}
            onChange={(e) =>
              setForm({
                ...form,
                executionRuntime: e.target.value as ExecutionRuntime,
              })
            }
            className={selectClass}
            disabled={disabled}
          >
            {EXECUTION_RUNTIMES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-safety`}>Safety level</Label>
          <select
            id={`${idPrefix}-safety`}
            value={form.safetyLevel}
            onChange={(e) =>
              setForm({ ...form, safetyLevel: Number(e.target.value) })
            }
            className={selectClass}
            disabled={disabled}
          >
            {[0, 1, 2, 3].map((level) => (
              <option key={level} value={level}>
                {level} — {SAFETY_LABELS[level]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-binding`}>Runtime binding</Label>
          <Input
            id={`${idPrefix}-binding`}
            value={form.runtimeBinding}
            onChange={(e) =>
              setForm({ ...form, runtimeBinding: e.target.value })
            }
            placeholder="builtin:web_search"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-configuration`}>
          Configuration (JSON)
        </Label>
        <Textarea
          id={`${idPrefix}-configuration`}
          rows={4}
          value={form.configuration}
          onChange={(e) =>
            setForm({ ...form, configuration: e.target.value })
          }
          placeholder={'{\n  "endpoint": "https://..."\n}'}
          className="font-mono text-xs"
          disabled={disabled}
        />
        {!configValid && (
          <p className="text-xs text-destructive">
            Configuration must be a valid JSON object.
          </p>
        )}
      </div>
    </div>
  );
}

function SchemaBlock({
  title,
  schema,
}: {
  title: string;
  schema: Record<string, unknown>;
}) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <pre className="max-h-40 overflow-auto rounded-lg border border-border bg-muted/40 p-2.5 font-mono text-[11px] leading-relaxed text-foreground">
        {Object.keys(schema).length > 0
          ? JSON.stringify(schema, null, 2)
          : '{ }'}
      </pre>
    </div>
  );
}

export function ToolsView() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ToolCategory | 'all'>('all');
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ToolFormState>(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<Tool | null>(null);
  const [editForm, setEditForm] = useState<ToolFormState>(EMPTY_FORM);
  const [inspectTarget, setInspectTarget] = useState<Tool | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tool | null>(null);

  // Category filtering is server-side (GET /tools?category=). Search and
  // enabled-state are refined client-side for instant feedback.
  const { data: tools, isLoading, isError, refetch } = useTools(
    category === 'all' ? {} : { category },
  );
  const createTool = useCreateTool();
  const updateTool = useUpdateTool();
  const setToolEnabled = useSetToolEnabled();
  const deleteTool = useDeleteTool();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (tools ?? []).filter((tool) => {
      if (enabledFilter === 'enabled' && !tool.enabled) return false;
      if (enabledFilter === 'disabled' && tool.enabled) return false;
      if (!query) return true;
      return (
        tool.name.toLowerCase().includes(query) ||
        (tool.description ?? '').toLowerCase().includes(query)
      );
    });
  }, [tools, search, enabledFilter]);

  const createConfig = parseConfiguration(createForm.configuration);
  const canCreate = createForm.name.trim().length > 0 && createConfig !== undefined;
  const editConfig = parseConfiguration(editForm.configuration);
  const canSaveEdit = editForm.name.trim().length > 0 && editConfig !== undefined;

  async function handleCreate() {
    if (!canCreate) return;
    try {
      const created = await createTool.mutateAsync({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        category: createForm.category,
        executionRuntime: createForm.executionRuntime,
        safetyLevel: createForm.safetyLevel,
        runtimeBinding: createForm.runtimeBinding.trim() || undefined,
        configuration: createConfig,
      });
      toast.success(`Registered ${created.name}`);
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
    } catch {
      toast.error('Failed to register tool');
    }
  }

  async function handleSaveEdit() {
    if (!editTarget || !canSaveEdit) return;
    try {
      await updateTool.mutateAsync({
        grn: editTarget.grn,
        input: {
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          category: editForm.category,
          executionRuntime: editForm.executionRuntime,
          safetyLevel: editForm.safetyLevel,
          runtimeBinding: editForm.runtimeBinding.trim(),
          configuration: editConfig,
        },
      });
      toast.success(`Saved ${editForm.name.trim()}`);
      setEditTarget(null);
    } catch {
      toast.error('Failed to save tool');
    }
  }

  async function handleToggleEnabled(tool: Tool, enabled: boolean) {
    try {
      await setToolEnabled.mutateAsync({ grn: tool.grn, enabled });
      toast.success(`${tool.name} ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update tool');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteTool.mutateAsync(deleteTarget.grn);
      toast.success(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete tool');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Tools"
        description="Capabilities agents can invoke during a conversation. Disabling a tool here removes it from every agent (deny-wins)."
        actions={
          <Button
            onClick={() => {
              setCreateForm(EMPTY_FORM);
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Register tool
          </Button>
        }
      />

      {isError && <ErrorState onRetry={() => refetch()} />}
      {isLoading && <LoadingGrid count={6} />}

      {tools && (
        <>
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-56 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tools…"
                  className="pl-9"
                  aria-label="Search tools"
                />
              </div>
              <div className="flex items-center gap-1.5">
                {(['all', 'enabled', 'disabled'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setEnabledFilter(f)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                      enabledFilter === f
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', ...TOOL_CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-xs capitalize transition-colors',
                    category === c
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <EmptyState
              icon={<Wrench className="size-5" />}
              title={tools.length === 0 ? 'No tools registered' : 'No tools match'}
              description={
                tools.length === 0
                  ? 'Register a tool to make it available to your agents.'
                  : 'Try a different search, category, or status filter.'
              }
              action={
                tools.length === 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCreateForm(EMPTY_FORM);
                      setCreateOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Register tool
                  </Button>
                ) : undefined
              }
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((tool) => {
              const Icon = CATEGORY_ICONS[tool.category] ?? Wrench;
              return (
                <Card
                  key={tool.grn}
                  className={cn(
                    'flex flex-col gap-4 p-4 transition-opacity',
                    !tool.enabled && 'opacity-70',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
                        tool.enabled
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                          {tool.name}
                        </h3>
                        <div className="flex shrink-0 items-center gap-1">
                          <Switch
                            checked={tool.enabled}
                            onCheckedChange={(next) =>
                              void handleToggleEnabled(tool, next)
                            }
                            disabled={setToolEnabled.isPending}
                            aria-label={`Toggle ${tool.name}`}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                aria-label="Tool options"
                                type="button"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-40">
                              <DropdownMenuItem
                                onClick={() => setInspectTarget(tool)}
                              >
                                <ScanSearch className="h-4 w-4" />
                                Inspect
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditForm(formFromTool(tool));
                                  setEditTarget(tool);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                                Configure
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(tool)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {tool.description || 'No description'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="capitalize">
                          {tool.category}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {tool.executionRuntime}
                        </Badge>
                        {tool.safetyLevel > 1 && (
                          <Badge variant="warning">
                            {SAFETY_LABELS[tool.safetyLevel] ??
                              `Safety ${tool.safetyLevel}`}
                          </Badge>
                        )}
                        {!tool.enabled && (
                          <Badge variant="destructive">Disabled</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <Settings2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {tool.runtimeBinding || 'no runtime binding'}
                      </span>
                    </span>
                    <span className="shrink-0">v{tool.version}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── Register tool ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register tool</DialogTitle>
            <DialogDescription>
              Declare a capability agents can invoke. Execution runtime is a V1
              declaration only — no routing engine consumes it yet.
            </DialogDescription>
          </DialogHeader>
          <ToolFormFields
            form={createForm}
            setForm={setCreateForm}
            disabled={createTool.isPending}
            idPrefix="tool-create"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createTool.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={!canCreate || createTool.isPending}
            >
              {createTool.isPending ? 'Registering…' : 'Register tool'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Configure tool ────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure {editTarget?.name}</DialogTitle>
            <DialogDescription>
              Update the tool&apos;s metadata and configuration. Changes apply
              to every agent using this tool.
            </DialogDescription>
          </DialogHeader>
          <ToolFormFields
            form={editForm}
            setForm={setEditForm}
            disabled={updateTool.isPending}
            idPrefix="tool-edit"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={updateTool.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveEdit()}
              disabled={!canSaveEdit || updateTool.isPending}
            >
              {updateTool.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Inspect tool ──────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(inspectTarget)}
        onOpenChange={(open) => {
          if (!open) setInspectTarget(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{inspectTarget?.name}</DialogTitle>
            <DialogDescription>
              {inspectTarget?.description || 'Tool metadata'}
            </DialogDescription>
          </DialogHeader>
          {inspectTarget && (
            <div className="grid gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="capitalize">
                  {inspectTarget.category}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {inspectTarget.executionRuntime}
                </Badge>
                <Badge
                  variant={inspectTarget.safetyLevel > 1 ? 'warning' : 'outline'}
                >
                  {SAFETY_LABELS[inspectTarget.safetyLevel] ??
                    `Safety ${inspectTarget.safetyLevel}`}
                </Badge>
                <Badge variant={inspectTarget.enabled ? 'success' : 'destructive'}>
                  {inspectTarget.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <p className="truncate font-mono text-[11px] text-muted-foreground/70">
                {inspectTarget.grn}
              </p>

              <Separator />

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <span className="text-muted-foreground">Runtime binding</span>
                <span className="truncate text-right font-mono">
                  {inspectTarget.runtimeBinding || '—'}
                </span>
                <span className="text-muted-foreground">
                  Required capabilities
                </span>
                <span className="truncate text-right">
                  {inspectTarget.requiredCapabilities.length > 0
                    ? inspectTarget.requiredCapabilities.join(', ')
                    : '—'}
                </span>
                <span className="text-muted-foreground">Version</span>
                <span className="text-right">v{inspectTarget.version}</span>
                <span className="text-muted-foreground">Created</span>
                <span className="text-right">
                  {formatDate(inspectTarget.createdAt)}
                </span>
                <span className="text-muted-foreground">Updated</span>
                <span className="text-right">
                  {formatDate(inspectTarget.updatedAt)}
                </span>
              </div>

              <SchemaBlock title="Input schema" schema={inspectTarget.inputSchema} />
              <SchemaBlock
                title="Output schema"
                schema={inspectTarget.outputSchema}
              />
              <SchemaBlock
                title="Configuration"
                schema={inspectTarget.configuration}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInspectTarget(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (!inspectTarget) return;
                setEditForm(formFromTool(inspectTarget));
                setEditTarget(inspectTarget);
                setInspectTarget(null);
              }}
            >
              <Pencil className="h-4 w-4" />
              Configure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete tool ───────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tool?</DialogTitle>
            <DialogDescription>
              This will permanently remove{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.name ?? 'this tool'}
              </span>{' '}
              from your organization. Agents referencing it will no longer be
              able to invoke it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteTool.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleteTool.isPending}
            >
              {deleteTool.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
