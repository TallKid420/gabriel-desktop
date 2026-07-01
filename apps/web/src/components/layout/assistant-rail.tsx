'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, ArrowUp, Paperclip, AtSign, Bot, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useSessionStore } from '@/stores/session-store';
import { useChatStream } from '@/features/chat/hooks/use-chat-stream';
import type { Message } from '@/types';

const SUGGESTIONS = [
  'Summarize today across all agents',
  'Draft the weekly board digest',
  'Which workflows need attention?',
];

/** The global assistant conversation lives on a stable id so the mock/live
 * transport can route to it. */
const ASSISTANT_CONVERSATION_ID = 'assistant';

export function AssistantRail() {
  const open = useUIStore((s) => s.assistantOpen);
  const close = useUIStore((s) => s.setAssistantOpen);
  const pendingPrompt = useUIStore((s) => s.pendingAssistantPrompt);
  const consumePrompt = useUIStore((s) => s.consumeAssistantPrompt);
  const session = useSessionStore((s) => s.session);

  const firstName = session?.user.displayName?.split(' ')[0] ?? 'there';
  const seed: Message[] = [
    {
      id: 's1',
      role: 'assistant',
      content: `Hello ${firstName}. I can coordinate your agents, summarize activity, and draft documents — all scoped to your organization. What would you like to do?`,
      createdAt: new Date().toISOString(),
    },
  ];

  const { messages, streaming, send } = useChatStream({
    conversationId: ASSISTANT_CONVERSATION_ID,
    seed,
    loadHistory: false,
  });

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Consume prompts queued by other surfaces (dashboard, command palette).
  useEffect(() => {
    if (open && pendingPrompt) {
      send(pendingPrompt);
      consumePrompt();
    }
  }, [open, pendingPrompt, send, consumePrompt]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, streaming]);

  const submit = (text: string) => {
    if (!text.trim()) return;
    send(text);
    setInput('');
  };

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-l border-border bg-card transition-[width,opacity] duration-200 ease-out',
        open ? 'w-[340px] opacity-100' : 'w-0 overflow-hidden opacity-0',
      )}
      aria-hidden={!open}
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="flex flex-1 flex-col leading-tight">
          <span className="text-sm font-semibold text-foreground">
            Gabriel Assistant
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-chart-3" />
            Context: this workspace
          </span>
        </div>
        <button
          onClick={() => close(false)}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Close assistant"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex gap-2.5', m.role === 'user' && 'flex-row-reverse')}
            >
              {m.role === 'assistant' && (
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                  <Bot className="h-3.5 w-3.5" />
                </span>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-foreground',
                )}
              >
                {m.content || (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-col gap-1.5 px-4 pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-border p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="rounded-xl border border-border bg-background focus-within:border-primary/50"
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
            placeholder="Ask Gabriel or @mention an agent…"
            className="scrollbar-thin block w-full resize-none bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Attach"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Mention agent"
              >
                <AtSign className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}
