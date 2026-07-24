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
  const base: Message = {
    id: dto.grn,
    role: dto.role,
    content: dto.content,
    createdAt: dto.created_at,
    agentGrn: dto.role === 'assistant' ? (dto.created_by ?? undefined) : undefined,
    model: dto.model ?? undefined,
    totalTokens: dto.total_tokens ?? undefined,
  };
  // Persisted tool-audit rows carry the tool exchange in metadata; render them
  // as tool-result bubbles so reloading a conversation preserves the activity.
  if (dto.role === 'tool') {
    const meta = dto.metadata ?? {};
    return {
      ...base,
      kind: 'tool_result',
      toolCallId:
        typeof meta.tool_call_id === 'string' ? meta.tool_call_id : undefined,
      toolName: typeof meta.tool_name === 'string' ? meta.tool_name : 'tool',
      toolSuccess: meta.success !== false,
      toolDenied: meta.denied === true,
    };
  }
  return base;
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
  // Tool-audit messages are persisted for traceability and rendered as
  // collapsible tool-result bubbles (mirroring the live streaming activity).
  return page.items.map(mapMessage);
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
            handlers.onChunk({
              type: 'tool_call',
              id: typeof payload.id === 'string' ? payload.id : `tc-${Date.now()}`,
              name: typeof payload.name === 'string' ? payload.name : 'tool',
              args: payload.arguments ?? {},
            });
            break;
          case 'tool_approval_required':
            handlers.onChunk({ type: 'lifecycle', state: 'awaiting_human_approval' });
            handlers.onChunk({
              type: 'tool_approval_required',
              id: typeof payload.id === 'string' ? payload.id : `ta-${Date.now()}`,
              toolName:
                typeof payload.tool_name === 'string' ? payload.tool_name : 'tool',
              args: payload.args ?? {},
              toolGrn:
                typeof payload.tool_grn === 'string' ? payload.tool_grn : undefined,
              sessionId:
                typeof payload.session_id === 'string' ? payload.session_id : '',
            });
            break;
          case 'tool_result':
            handlers.onChunk({ type: 'lifecycle', state: 'executing' });
            handlers.onChunk({
              type: 'tool_result',
              id: typeof payload.id === 'string' ? payload.id : `tr-${Date.now()}`,
              name: typeof payload.name === 'string' ? payload.name : 'tool',
              success: payload.success !== false,
              denied: payload.denied === true,
              content: typeof payload.content === 'string' ? payload.content : '',
            });
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

/**
 * Resolve a confirmation-gated tool call that paused the stream with a
 * `tool_approval_required` event. Accepting lets the tool execute; denying
 * skips it and lets the agent continue with an informative note. The backend
 * resumes the still-open SSE stream, which then emits the `tool_result`.
 */
export async function submitApproval(input: {
  sessionId: string;
  toolName: string;
  approved: boolean;
  denyReason?: string;
}): Promise<void> {
  await gatewayRequest<unknown>('/gateway/chat/approval', {
    method: 'POST',
    body: {
      session_id: input.sessionId,
      tool_name: input.toolName,
      approved: input.approved,
      deny_reason: input.denyReason,
    },
  });
}
