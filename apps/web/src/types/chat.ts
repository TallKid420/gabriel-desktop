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
  | { type: 'done'; messageId: string };
