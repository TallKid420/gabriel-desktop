/**
 * Chat service — conversation CRUD + assistant streaming.
 *
 * Streaming goes through the real-time abstraction (ADR-033), never hard-coded
 * SSE. In M0 the mock transport plays a scripted response; when the Gateway
 * lands, `getRealtimeTransport()` returns the WebSocket transport and this file
 * is unchanged.
 */
import type { ChatStreamChunk, Conversation, Message } from '@/types';
import { gatewayRequest, mockDelay, USE_MOCK } from './gateway-client';
import { getRealtimeTransport } from './realtime';
import {
  conversations as mockConversations,
  messagesByConversation as mockMessages,
} from './mock/data';

export async function listConversations(): Promise<Conversation[]> {
  if (USE_MOCK) {
    const sorted = [...mockConversations].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
    return mockDelay(sorted);
  }
  return gatewayRequest<Conversation[]>('/chat/conversations');
}

export async function getConversation(id: string): Promise<Conversation | null> {
  if (USE_MOCK) {
    return mockDelay(mockConversations.find((c) => c.id === id) ?? null, 140);
  }
  return gatewayRequest<Conversation>(`/chat/conversations/${id}`);
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  if (USE_MOCK) {
    return mockDelay(mockMessages[conversationId] ?? [], 160);
  }
  return gatewayRequest<Message[]>(
    `/chat/conversations/${conversationId}/messages`,
  );
}

export interface SendMessageHandlers {
  onChunk: (chunk: ChatStreamChunk) => void;
  onError?: (error: Error) => void;
}

/**
 * Send a user message and stream the assistant reply. Returns a disposer to
 * abort the stream. The chunk contract (token/lifecycle/error/done) is the same
 * whether the bytes come from the mock script or a live WebSocket.
 */
export function sendMessage(
  conversationId: string,
  content: string,
  handlers: SendMessageHandlers,
): () => void {
  const transport = getRealtimeTransport();
  const sub = transport.subscribe<{ value?: string; state?: string; messageId?: string; message?: string }>(
    `chat/${conversationId}`,
    {
      onMessage: ({ event, data }) => {
        switch (event) {
          case 'token':
            handlers.onChunk({ type: 'token', value: data.value ?? '' });
            break;
          case 'lifecycle':
            handlers.onChunk({ type: 'lifecycle', state: data.state ?? '' });
            break;
          case 'error':
            handlers.onChunk({ type: 'error', message: data.message ?? 'stream error' });
            break;
          case 'done':
            handlers.onChunk({ type: 'done', messageId: data.messageId ?? `a-${Date.now()}` });
            break;
        }
      },
      onError: handlers.onError,
    },
    { method: 'POST', body: { content } },
  );
  return () => sub.close();
}

/** Create a new conversation bound to an agent. */
export async function createConversation(input: {
  title?: string;
  agentGrn?: string;
}): Promise<Conversation> {
  if (USE_MOCK) {
    const now = new Date().toISOString();
    const convo: Conversation = {
      id: `c_${Date.now()}`,
      title: input.title ?? 'New conversation',
      agentGrn: input.agentGrn,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };
    mockConversations.unshift(convo);
    mockMessages[convo.id] = [];
    return mockDelay(convo, 120);
  }
  return gatewayRequest<Conversation>('/chat/conversations', {
    method: 'POST',
    body: input,
  });
}
