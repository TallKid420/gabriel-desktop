'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { chat as chatService } from '@/services';
import type { AgentLifecycleState, Message } from '@/types';

export interface UseChatStreamOptions {
  conversationId: string;
  /** Seed messages shown before/instead of a server fetch (assistant rail). */
  seed?: Message[];
  /** When false, skip loading persisted history (ephemeral surfaces). */
  loadHistory?: boolean;
}

export interface UseChatStream {
  messages: Message[];
  streaming: boolean;
  /** Latest agent lifecycle state observed on the stream (ADR-034). */
  lifecycle: AgentLifecycleState | null;
  send: (text: string) => void;
  loading: boolean;
}

/**
 * Owns a conversation's message list and streaming assistant replies. Streaming
 * flows through the chat service, which uses the real-time transport (ADR-033),
 * so this hook is identical whether tokens come from the M0 mock or a live
 * WebSocket.
 */
export function useChatStream({
  conversationId,
  seed,
  loadHistory = true,
}: UseChatStreamOptions): UseChatStream {
  const [messages, setMessages] = useState<Message[]>(seed ?? []);
  const [streaming, setStreaming] = useState(false);
  const [lifecycle, setLifecycle] = useState<AgentLifecycleState | null>(null);
  const [loading, setLoading] = useState(loadHistory);
  const disposeRef = useRef<(() => void) | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  // Load persisted history for real conversations.
  useEffect(() => {
    let cancelled = false;
    if (!loadHistory) {
      setLoading(false);
      return;
    }
    setLoading(true);
    chatService
      .getMessages(conversationId)
      .then((history) => {
        if (cancelled) return;
        setMessages(history.length ? history : (seed ?? []));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, loadHistory]);

  // Clean up any in-flight stream on unmount / conversation switch.
  useEffect(() => {
    return () => disposeRef.current?.();
  }, [conversationId]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      const assistantId = `a-${Date.now()}`;
      streamingIdRef.current = assistantId;
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        streaming: true,
      };
      setMessages((m) => [...m, userMsg, assistantMsg]);
      setStreaming(true);
      setLifecycle('queued');

      disposeRef.current = chatService.sendMessage(conversationId, trimmed, {
        onChunk: (chunk) => {
          switch (chunk.type) {
            case 'token':
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === streamingIdRef.current
                    ? { ...msg, content: msg.content + chunk.value }
                    : msg,
                ),
              );
              break;
            case 'lifecycle':
              setLifecycle(chunk.state as AgentLifecycleState);
              break;
            case 'error':
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === streamingIdRef.current
                    ? { ...msg, content: `⚠️ ${chunk.message}`, streaming: false }
                    : msg,
                ),
              );
              setStreaming(false);
              break;
            case 'done':
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === streamingIdRef.current
                    ? { ...msg, streaming: false }
                    : msg,
                ),
              );
              setStreaming(false);
              streamingIdRef.current = null;
              break;
          }
        },
        onError: (err) => {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === streamingIdRef.current
                ? { ...msg, content: `⚠️ ${err.message}`, streaming: false }
                : msg,
            ),
          );
          setStreaming(false);
        },
      });
    },
    [conversationId, streaming],
  );

  return { messages, streaming, lifecycle, send, loading };
}
