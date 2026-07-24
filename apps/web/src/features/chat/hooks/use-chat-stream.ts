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
  /** Accept or deny a paused, confirmation-gated tool call. */
  respondToApproval: (message: Message, approved: boolean, denyReason?: string) => void;
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

  // Insert a tool-activity bubble just before the streaming assistant reply so
  // the tool call / result renders above the final answer, in causal order.
  const insertBeforeStreaming = useCallback((toolMsg: Message) => {
    setMessages((m) => {
      const idx = m.findIndex((x) => x.id === streamingIdRef.current);
      if (idx === -1) return [...m, toolMsg];
      return [...m.slice(0, idx), toolMsg, ...m.slice(idx)];
    });
  }, []);

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
            case 'tool_call':
              insertBeforeStreaming({
                id: `tc-${chunk.id}`,
                role: 'tool',
                kind: 'tool_call',
                content: '',
                createdAt: new Date().toISOString(),
                toolCallId: chunk.id,
                toolName: chunk.name,
                toolArgs: chunk.args,
              });
              break;
            case 'tool_approval_required':
              insertBeforeStreaming({
                id: `ta-${chunk.id}`,
                role: 'tool',
                kind: 'tool_approval',
                content: '',
                createdAt: new Date().toISOString(),
                toolCallId: chunk.id,
                toolName: chunk.toolName,
                toolArgs: chunk.args,
                toolGrn: chunk.toolGrn,
                approvalSessionId: chunk.sessionId,
                approvalStatus: 'pending',
              });
              break;
            case 'tool_result':
              setMessages((m) => {
                // Flip the matching call bubble from "running" to its outcome.
                const updated = m.map((msg) =>
                  msg.kind === 'tool_call' && msg.toolCallId === chunk.id
                    ? { ...msg, toolSuccess: chunk.success, toolDenied: chunk.denied }
                    : msg,
                );
                const resultMsg: Message = {
                  id: `tr-${chunk.id}`,
                  role: 'tool',
                  kind: 'tool_result',
                  content: chunk.content,
                  createdAt: new Date().toISOString(),
                  toolCallId: chunk.id,
                  toolName: chunk.name,
                  toolSuccess: chunk.success,
                  toolDenied: chunk.denied,
                };
                const idx = updated.findIndex(
                  (x) => x.id === streamingIdRef.current,
                );
                if (idx === -1) return [...updated, resultMsg];
                return [
                  ...updated.slice(0, idx),
                  resultMsg,
                  ...updated.slice(idx),
                ];
              });
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
    [conversationId, streaming, insertBeforeStreaming],
  );

  const respondToApproval = useCallback(
    (message: Message, approved: boolean, denyReason?: string) => {
      if (!message.approvalSessionId || !message.toolName) return;
      if (message.approvalStatus && message.approvalStatus !== 'pending') return;

      // Optimistically record the decision so the buttons disable immediately.
      setMessages((m) =>
        m.map((msg) =>
          msg.id === message.id
            ? { ...msg, approvalStatus: approved ? 'accepted' : 'denied' }
            : msg,
        ),
      );
      if (approved) setLifecycle('resuming');

      chatService
        .submitApproval({
          sessionId: message.approvalSessionId,
          toolName: message.toolName,
          approved,
          denyReason,
        })
        .catch(() => {
          // Revert so the user can retry if the decision failed to register.
          setMessages((m) =>
            m.map((msg) =>
              msg.id === message.id ? { ...msg, approvalStatus: 'pending' } : msg,
            ),
          );
        });
    },
    [],
  );

  return { messages, streaming, lifecycle, send, respondToApproval, loading };
}
