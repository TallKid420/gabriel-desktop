'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Bot, Paperclip, AtSign, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSessionStore } from '@/stores/session-store';
import { useChatStream } from './hooks/use-chat-stream';
import { useConversation } from './hooks/use-conversations';
import type { Message } from '@/types';

/** Human-readable labels for the lifecycle states surfaced while streaming. */
const LIFECYCLE_LABEL: Record<string, string> = {
  queued: 'Queued',
  planning: 'Planning',
  executing: 'Working',
  waiting: 'Waiting',
  delegating: 'Delegating',
  awaiting_human_approval: 'Needs approval',
  resuming: 'Resuming',
  retrying: 'Retrying',
};

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {message.role === 'assistant' && (
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Bot className="size-4" />
        </span>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-foreground ring-1 ring-border',
        )}
      >
        {message.content ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <span className="inline-flex items-center gap-1 py-1">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </span>
        )}
      </div>
    </div>
  );
}

export function ConversationView({ conversationId }: { conversationId: string }) {
  const { data: conversation } = useConversation(conversationId);
  const { messages, streaming, lifecycle, send, loading } = useChatStream({
    conversationId,
  });
  const session = useSessionStore((s) => s.session);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, streaming]);

  const submit = (text: string) => {
    if (!text.trim() || streaming) return;
    send(text);
    setInput('');
  };

  const initials =
    session?.user.displayName
      ?.split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('') ?? 'U';

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      {/* Conversation header */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-5">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-foreground">
            {conversation?.title ?? 'Conversation'}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {streaming && lifecycle ? (
              <>
                <span className="size-1.5 animate-pulse rounded-full bg-chart-3" />
                {LIFECYCLE_LABEL[lifecycle] ?? 'Working'}…
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                Ready
              </>
            )}
          </span>
        </div>
        {conversation?.agentGrn && (
          <Badge variant="outline" className="ml-auto">
            <Bot className="mr-1 size-3" />
            Agent-bound
          </Badge>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground">Loading conversation…</p>
          ) : (
            messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex flex-row-reverse gap-3">
                  <Avatar className="mt-0.5 size-8 shrink-0">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="max-w-[75%] rounded-2xl bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ) : (
                <MessageBubble key={m.id} message={m} />
              ),
            )
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border px-5 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="mx-auto max-w-3xl rounded-2xl border border-border bg-card focus-within:border-primary/50"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={2}
            placeholder="Send a message…  (Enter to send, Shift+Enter for a new line)"
            className="scrollbar-thin block w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Attach file"
              >
                <Paperclip className="size-4" />
              </button>
              <button
                type="button"
                className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Mention agent"
              >
                <AtSign className="size-4" />
              </button>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
              aria-label="Send message"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
