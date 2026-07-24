/**
 * Chat domain types.
 *
 * Conversations are an Application-layer concept orchestrated by the Gateway's
 * Agent Runtime. Streaming is delivered over the real-time abstraction
 * (ADR-033), not hard-coded to SSE.
 */
import type { GRN, ISODateString } from './common';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Attachment {
  id: string;
  name: string;
  mediaType?: string;
  byteSize?: number;
  /** GRN once the attachment is ingested as a Document by Core. */
  documentGrn?: GRN;
}

/**
 * Discriminates how a message renders. Plain conversational turns are `text`;
 * the remaining kinds surface the agent's tool activity inline (ADR-034) as
 * dedicated bubbles / cards rather than opaque lifecycle chrome.
 */
export type MessageKind = 'text' | 'tool_call' | 'tool_result' | 'tool_approval';

/** Resolution state of a confirmation-gated tool call. */
export type ApprovalStatus = 'pending' | 'accepted' | 'denied';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: ISODateString;
  /** True while assistant tokens are still streaming in. */
  streaming?: boolean;
  attachments?: Attachment[];
  /** Agent that produced an assistant message. */
  agentGrn?: GRN;
  /** Model that produced an assistant message. */
  model?: string;
  /** Token accounting for the turn, when reported by the runtime. */
  totalTokens?: number;

  // ── Tool activity (kind !== 'text') ──────────────────────────────────────
  /** How this message renders; defaults to `text` when omitted. */
  kind?: MessageKind;
  /** Backend tool-call id this message is associated with. */
  toolCallId?: string;
  /** Tool name for tool_call / tool_result / tool_approval messages. */
  toolName?: string;
  /** Arguments the model passed to the tool (tool_call / tool_approval). */
  toolArgs?: unknown;
  /** Governed resource name of the tool (tool_approval). */
  toolGrn?: string;
  /** Whether the tool executed successfully (tool_result). */
  toolSuccess?: boolean;
  /** Whether the tool was skipped because the user denied it (tool_result). */
  toolDenied?: boolean;
  /** Runtime session id needed to POST an approval decision (tool_approval). */
  approvalSessionId?: string;
  /** Accept/deny state for a confirmation-gated tool (tool_approval). */
  approvalStatus?: ApprovalStatus;
}

export interface Conversation {
  id: string;
  title: string;
  /** Agent the conversation is currently bound to. */
  agentGrn?: GRN;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  messageCount: number;
  lastMessagePreview?: string;
  status?: 'active' | 'archived';
}

/** Discriminated chunks emitted while an assistant response streams. */
export type ChatStreamChunk =
  | { type: 'token'; value: string }
  | { type: 'lifecycle'; state: string }
  | { type: 'error'; message: string }
  | { type: 'done'; messageId: string }
  /** The agent invoked a tool with the given arguments. */
  | { type: 'tool_call'; id: string; name: string; args: unknown }
  /** A tool finished (or was skipped because the user denied it). */
  | {
      type: 'tool_result';
      id: string;
      name: string;
      success: boolean;
      denied: boolean;
      content: string;
    }
  /** A confirmation-gated tool is paused awaiting the user's decision. */
  | {
      type: 'tool_approval_required';
      id: string;
      toolName: string;
      args: unknown;
      toolGrn?: string;
      sessionId: string;
    };
