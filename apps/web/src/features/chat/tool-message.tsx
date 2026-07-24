'use client';

/**
 * Inline rendering of the agent's tool activity (ADR-034). Three message kinds
 * are surfaced during (and after) a streaming turn:
 *
 *  - `tool_call`     — a collapsible card showing the tool name, JSON arguments
 *                      and a live status (running → done / failed / denied).
 *  - `tool_result`   — a collapsible card showing the tool's output.
 *  - `tool_approval` — an inline approval card for confirmation-gated tools,
 *                      with Accept / Deny buttons that resolve the paused turn.
 *
 * These replace the previous opaque "delegating…" chrome so users can see and
 * govern exactly what the agent is doing.
 */
import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleSlash,
  Loader2,
  ShieldAlert,
  Terminal,
  Wrench,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Message } from '@/types';

/** Pretty-print tool arguments / results; fall back to the raw string. */
function formatPayload(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function ToolShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Wrench className="size-4" />
      </span>
      <div className="min-w-0 max-w-[85%] flex-1">{children}</div>
    </div>
  );
}

function ToolCallBubble({ message }: { message: Message }) {
  const [open, setOpen] = useState(false);
  const args = formatPayload(message.toolArgs);

  let status: { label: string; variant: React.ComponentProps<typeof Badge>['variant']; icon: React.ReactNode };
  if (message.toolDenied) {
    status = { label: 'Denied', variant: 'destructive', icon: <CircleSlash className="size-3" /> };
  } else if (message.toolSuccess === true) {
    status = { label: 'Done', variant: 'success', icon: <Check className="size-3" /> };
  } else if (message.toolSuccess === false) {
    status = { label: 'Failed', variant: 'destructive', icon: <X className="size-3" /> };
  } else {
    status = {
      label: 'Running',
      variant: 'secondary',
      icon: <Loader2 className="size-3 animate-spin" />,
    };
  }

  return (
    <ToolShell>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
        >
          {open ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="text-muted-foreground">Called tool</span>
          <span className="truncate font-mono text-xs font-semibold text-foreground">
            {message.toolName}
          </span>
          <Badge variant={status.variant} className="ml-auto shrink-0">
            {status.icon}
            {status.label}
          </Badge>
        </button>
        {open && (
          <div className="border-t border-border px-3 py-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Arguments</p>
            <pre className="scrollbar-thin overflow-x-auto rounded-md bg-muted/60 p-2 text-xs text-foreground">
              {args || '(none)'}
            </pre>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function ToolResultBubble({ message }: { message: Message }) {
  const [open, setOpen] = useState(false);
  const output = formatPayload(message.content);

  const status = message.toolDenied
    ? { label: 'Skipped', variant: 'outline' as const, icon: <CircleSlash className="size-3" /> }
    : message.toolSuccess === false
      ? { label: 'Error', variant: 'destructive' as const, icon: <X className="size-3" /> }
      : { label: 'Success', variant: 'success' as const, icon: <Check className="size-3" /> };

  return (
    <ToolShell>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
        >
          {open ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <Terminal className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">Result</span>
          <span className="truncate font-mono text-xs font-semibold text-foreground">
            {message.toolName}
          </span>
          <Badge variant={status.variant} className="ml-auto shrink-0">
            {status.icon}
            {status.label}
          </Badge>
        </button>
        {open && (
          <div className="border-t border-border px-3 py-2">
            <pre className="scrollbar-thin max-h-64 overflow-auto rounded-md bg-muted/60 p-2 text-xs text-foreground">
              {output || '(no output)'}
            </pre>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function ApprovalCard({
  message,
  onRespond,
}: {
  message: Message;
  onRespond: (message: Message, approved: boolean, denyReason?: string) => void;
}) {
  const [argsOpen, setArgsOpen] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const args = formatPayload(message.toolArgs);
  const status = message.approvalStatus ?? 'pending';
  const decided = status !== 'pending';

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-warning/15 text-warning">
        <ShieldAlert className="size-4" />
      </span>
      <div className="min-w-0 max-w-[85%] flex-1 overflow-hidden rounded-xl border border-warning/40 bg-warning/5">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-sm font-semibold text-foreground">Approval required</span>
          <span className="truncate font-mono text-xs text-muted-foreground">
            {message.toolName}
          </span>
          {status === 'accepted' && (
            <Badge variant="success" className="ml-auto shrink-0">
              <Check className="size-3" />
              Approved
            </Badge>
          )}
          {status === 'denied' && (
            <Badge variant="destructive" className="ml-auto shrink-0">
              <CircleSlash className="size-3" />
              Denied
            </Badge>
          )}
        </div>

        <div className="px-3 pb-2">
          <p className="text-xs text-muted-foreground">
            This tool needs your confirmation before it runs.
          </p>
          {message.toolGrn && (
            <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground/80">
              {message.toolGrn}
            </p>
          )}
          <button
            type="button"
            onClick={() => setArgsOpen((o) => !o)}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {argsOpen ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
            Arguments
          </button>
          {argsOpen && (
            <pre className="scrollbar-thin mt-1 overflow-x-auto rounded-md bg-muted/60 p-2 text-xs text-foreground">
              {args || '(none)'}
            </pre>
          )}
        </div>

        {!decided ? (
          <div className="flex flex-col gap-2 border-t border-warning/30 px-3 py-2.5">
            <input
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Optional reason (used if you deny)…"
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onRespond(message, true)}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Check className="size-3.5" />
                Accept
              </button>
              <button
                type="button"
                onClick={() => onRespond(message, false, denyReason.trim() || undefined)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                <X className="size-3.5" />
                Deny
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-warning/30 px-3 py-2 text-xs text-muted-foreground">
            {status === 'accepted'
              ? 'You approved this action — the agent is continuing.'
              : 'You denied this action — the agent was notified.'}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Render a tool-activity message. Returns `null` for non-tool messages so the
 * caller can fall back to its normal bubble rendering.
 */
export function ToolMessage({
  message,
  onRespond,
}: {
  message: Message;
  onRespond: (message: Message, approved: boolean, denyReason?: string) => void;
}) {
  switch (message.kind) {
    case 'tool_call':
      return <ToolCallBubble message={message} />;
    case 'tool_result':
      return <ToolResultBubble message={message} />;
    case 'tool_approval':
      return <ApprovalCard message={message} onRespond={onRespond} />;
    default:
      return null;
  }
}
