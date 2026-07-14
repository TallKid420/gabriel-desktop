'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Plus, MessagesSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingRows, EmptyState } from '@/components/common/states';
import { formatRelativeTime } from '@/lib/format';
import { useAgents } from '@/features/agents/hooks';
import { useConversations, useCreateConversation } from './hooks/use-conversations';

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ConversationList() {
  const { data: conversations, isLoading } = useConversations();
  const { data: agents } = useAgents();
  const create = useCreateConversation();
  const router = useRouter();
  const params = useParams<{ conversationId?: string }>();
  const activeId = params?.conversationId
    ? decodeURIComponent(params.conversationId)
    : undefined;

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [agentGrn, setAgentGrn] = useState('');

  const startNew = async () => {
    try {
      const convo = await create.mutateAsync({
        title: title.trim() || 'New conversation',
        agentGrn: agentGrn || undefined,
      });
      setOpen(false);
      setTitle('');
      setAgentGrn('');
      router.push(`/chat/${encodeURIComponent(convo.id)}`);
    } catch {
      toast.error('Failed to create conversation');
    }
  };

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
        <span className="text-sm font-semibold">Conversations</span>
        <Button
          size="icon-sm"
          variant="outline"
          onClick={() => setOpen(true)}
          aria-label="New conversation"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New conversation</DialogTitle>
            <DialogDescription>
              Give it a title and optionally pick an agent to respond.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="conversation-title">Title</Label>
              <Input
                id="conversation-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="New conversation"
                disabled={create.isPending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="conversation-agent">Agent (optional)</Label>
              <select
                id="conversation-agent"
                value={agentGrn}
                onChange={(e) => setAgentGrn(e.target.value)}
                className={selectClass}
                disabled={create.isPending}
              >
                <option value="">No agent (default provider)</option>
                {(agents ?? []).map((a) => (
                  <option key={a.grn} value={a.grn}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button onClick={() => void startNew()} disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="p-1">
            <LoadingRows count={5} />
          </div>
        )}
        {!isLoading && conversations?.length === 0 && (
          <EmptyState
            icon={<MessagesSquare className="size-5" />}
            title="No conversations yet"
            description="Start a new conversation to begin working with an agent."
          />
        )}
        <ul className="flex flex-col gap-0.5">
          {conversations?.map((c) => (
            <li key={c.id}>
              <Link
                href={`/chat/${encodeURIComponent(c.id)}`}
                className={cn(
                  'block rounded-lg px-2.5 py-2 transition-colors',
                  activeId === c.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/60',
                )}
              >
                <p className="truncate text-sm font-medium">{c.title}</p>
                {c.lastMessagePreview && (
                  <p className="truncate text-xs text-muted-foreground">
                    {c.lastMessagePreview}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                  {formatRelativeTime(c.updatedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
