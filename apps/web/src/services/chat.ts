/**
 * Chat service — conversation/message CRUD against gabriel-core plus
 * assistant streaming over the AI Gateway's SSE endpoint
 * (`POST /gateway/chat/stream`).
 *
 * Conversations and messages are identified by GRNs
 * (`grn:<org>:<type>/<id>:<version>`); the GRN is used verbatim as the domain
 * `id` and must be URI-encoded when placed in routes.
 */
import type { ChatStreamChunk, Conversation, Message } from '@/types';
import type {
  ConversationDto,
  MessageDto,
  Paginated,
} from '@/types/api';
import { gatewayRequest, gatewayStream } from './gateway-client';

function mapConversation(dto: ConversationDto): Conversation {
  return {
    id: dto.grn,
    title: dto.title,
    agentGrn: dto.agent_grn ?? undefined,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    messageCount: 0,
    status: dto.status,
  };
}

function mapMessage(dto: MessageDto): Message {
  return {
    id: dto.grn,
    role: dto.role,
    content: dto.content,
    createdAt: dto.created_at,
    agentGrn: dto.role === 'assistant' ? (dto.created_by ?? undefined) : undefined,
    model: dto.model ?? undefined,
    totalTokens: dto.total_tokens ?? undefined,
  };
}

export async function listConversations(): Promise<Conversation[]> {
  const page = await gatewayRequest<Paginated<ConversationDto>>('/conversations', {
    params: { limit: 100 },
  });
  return page.items
    .map(mapConversation)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getConversation(grn: string): Promise<Conversation | null> {
  try {
    const dto = await gatewayRequest<ConversationDto>(
      `/conversations/${encodeURIComponent(grn)}`,
    );
    return mapConversation(dto);
  } catch {
    return null;
  }
}

export async function getMessages(conversationGrn: string): Promise<Message[]> {
  const page = await gatewayRequest<Paginated<MessageDto>>(
    `/conversations/${encodeURIComponent(conversationGrn)}/messages`,
    { params: { limit: 200 } },
  );
  // Tool-audit messages are persisted for traceability but not rendered as
  // chat bubbles; the tool activity is surfaced live during streaming.
  return page.items.filter((m) => m.role !== 'tool').map(mapMessage);
}

/** Create a new conversation, optionally bound to an agent. */
export async function createConversation(input: {
  title?: string;
  agentGrn?: string;
}): Promise<Conversation> {
  const dto = await gatewayRequest<ConversationDto>('/conversations', {
    method: 'POST',
    body: {
      title: input.title?.trim() || 'New conversation',
      agent_grn: input.agentGrn,
    },
  });
  return mapConversation(dto);
}

/** Rename / re-bind / archive a conversation. */
export async function updateConversation(
  grn: string,
  patch: { title?: string; agentGrn?: string | null; status?: 'active' | 'archived' },
): Promise<Conversation> {
  const dto = await gatewayRequest<ConversationDto>(
    `/conversations/${encodeURIComponent(grn)}`,
    {
      method: 'PATCH',
      body: {
        title: patch.title,
        agent_grn: patch.agentGrn ?? undefined,
        status: patch.status,
      },
    },
  );
  return mapConversation(dto);
}

/** Soft-delete a conversation. */
export async function deleteConversation(grn: string): Promise<void> {
  await gatewayRequest<unknown>(`/conversations/${encodeURIComponent(grn)}`, {
    method: 'DELETE',
  });
}

export interface SendMessageHandlers {
  onChunk: (chunk: ChatStreamChunk) => void;
  onError?: (error: Error) => void;
}

/**
 * Send a user message and stream the assistant reply over SSE. Returns a
 * disposer to abort the stream. Backend frames (session/message/context/
 * token/tool_call/tool_result/error/done) are normalized into the UI's
 * ChatStreamChunk contract.
 */
export function sendMessage(
  conversationGrn: string,
  content: string,
  handlers: SendMessageHandlers,
): () => void {
  let finished = false;

  const finish = (messageId: string) => {
    if (finished) return;
    finished = true;
    handlers.onChunk({ type: 'done', messageId });
  };

  const dispose = gatewayStream(
    '/gateway/chat/stream',
    { conversation_grn: conversationGrn, content },
    {
      onEvent: ({ event, data }) => {
        const payload = (data ?? {}) as Record<string, unknown>;
        switch (event) {
          case 'session':
            handlers.onChunk({ type: 'lifecycle', state: 'planning' });
            break;
          case 'message':
          case 'context':
            handlers.onChunk({ type: 'lifecycle', state: 'executing' });
            break;
          case 'token':
            handlers.onChunk({
              type: 'token',
              value: typeof payload.delta === 'string' ? payload.delta : '',
            });
            break;
          case 'tool_call':
            handlers.onChunk({ type: 'lifecycle', state: 'delegating' });
            break;
          case 'tool_result':
            handlers.onChunk({ type: 'lifecycle', state: 'executing' });
            break;
          case 'error':
            finished = true;
            handlers.onChunk({
              type: 'error',
              message:
                typeof payload.detail === 'string'
                  ? payload.detail
                  : 'The assistant stream failed',
            });
            break;
          case 'done':
            finish(
              typeof payload.message_grn === 'string'
                ? payload.message_grn
                : `a-${Date.now()}`,
            );
            break;
        }
      },
      onError: (err) => {
        if (finished) return;
        finished = true;
        handlers.onError?.(err);
      },
      onClose: () => finish(`a-${Date.now()}`),
    },
  );

  return dispose;
}
