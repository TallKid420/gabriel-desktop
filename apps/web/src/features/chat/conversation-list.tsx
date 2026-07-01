'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Plus, MessagesSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LoadingRows, EmptyState } from '@/components/common/states';
import { formatRelativeTime } from '@/lib/format';
import { useConversations, useCreateConversation } from './hooks/use-conversations';

export function ConversationList() {
  const { data: conversations, isLoading } = useConversations();
  const create = useCreateConversation();
  const router = useRouter();
  const params = useParams<{ conversationId?: string }>();
  const activeId = params?.conversationId;

  const startNew = async () => {
    const convo = await create.mutateAsync({ title: 'New conversation' });
    router.push(`/chat/${convo.id}`);
  };

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
        <span className="text-sm font-semibold">Conversations</span>
        <Button size="icon-sm" variant="outline" onClick={startNew} disabled={create.isPending} aria-label="New conversation">
          <Plus className="size-4" />
        </Button>
      </div>
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
                href={`/chat/${c.id}`}
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
