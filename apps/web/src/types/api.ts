/**
 * Backend DTOs — the exact wire shapes returned by gabriel-core's REST API
 * (`/api/v1/...`). These mirror each resource's `public_view()` on the server
 * and are intentionally snake_case; services map them into the camelCase
 * domain types under `@/types` so feature code never sees wire formats.
 */

/** Standard paginated envelope returned by all list endpoints. */
export interface Paginated<T> {
  items: T[];
  total: number;
  limit?: number;
  offset?: number;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface TokenPairDto {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_at: string;
}

export interface SessionUserDto {
  id: string | null;
  principal: string;
  displayName: string;
  email: string | null;
  initials: string;
  avatarUrl: string | null;
  roles: string[];
}

export interface SessionDto {
  user: SessionUserDto;
  organization: { id: string; name: string; slug?: string };
  tenantId: string;
  authMethod: string;
  expiresAt?: string;
}

export interface RegisterResponseDto extends TokenPairDto {
  session: SessionDto;
  user: UserDto;
  organization: { id: string; name: string; grn: string };
}

export interface LoginResponseDto extends TokenPairDto {
  session: SessionDto;
}

// ── Users & Organizations ───────────────────────────────────────────────────

export interface UserDto {
  grn: string;
  org_id: string;
  email: string;
  display_name: string;
  principal_id: string;
  state: string;
  version: number;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
  labels?: Record<string, string>;
}

export interface OrganizationDto {
  grn?: string;
  org_id: string;
  name?: string;
  display_name?: string;
  role?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

// ── Conversations & Messages ────────────────────────────────────────────────

export interface ConversationDto {
  grn: string;
  org_id: string;
  title: string;
  status: 'active' | 'archived';
  participants: string[];
  agent_grn: string | null;
  state: string;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  metadata?: Record<string, unknown>;
  labels?: Record<string, string>;
}

export interface MessageDto {
  grn: string;
  org_id: string;
  conversation_grn: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  model: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  metadata?: Record<string, unknown>;
}

export interface ConversationCreateDto {
  title: string;
  participants?: string[];
  agent_grn?: string;
  metadata?: Record<string, unknown>;
  labels?: Record<string, string>;
}

// ── Agents ──────────────────────────────────────────────────────────────────

export interface AgentModelConfigDto {
  provider?: string | null;
  model?: string | null;
  temperature?: number | null;
  max_tokens?: number | null;
}

export interface AgentDto {
  grn: string;
  org_id: string;
  name: string;
  description: string;
  system_prompt: string;
  model_config: AgentModelConfigDto;
  allowed_tools: string[];
  knowledge_sources: string[];
  status: string;
  enabled: boolean;
  state: string;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  metadata?: Record<string, unknown>;
  labels?: Record<string, string>;
}

export interface AgentCreateDto {
  name: string;
  description?: string;
  system_prompt?: string;
  /** Serialized under the wire name `model_config`. */
  model_config?: AgentModelConfigDto;
  allowed_tools?: string[];
  knowledge_sources?: string[];
  status?: string;
  metadata?: Record<string, unknown>;
  labels?: Record<string, string>;
}

export type AgentUpdateDto = Partial<AgentCreateDto>;

// ── Gateway (AI runtime) ────────────────────────────────────────────────────

export interface ProviderDto {
  name: string;
  default: boolean;
  healthy: boolean;
  detail?: string | null;
}

export interface ProviderModelDto {
  name: string;
  provider: string;
  metadata?: Record<string, unknown>;
}

/** SSE frames emitted by POST /gateway/chat/stream. */
export type ChatStreamEventDto =
  | { event: 'session'; data: { session_id: string; conversation_grn: string; agent_grn: string | null; provider: string; model: string } }
  | { event: 'message'; data: { grn: string; role: string } }
  | { event: 'context'; data: { chunks: number; sources: string[] } }
  | { event: 'token'; data: { delta: string } }
  | { event: 'tool_call'; data: { id: string; name: string; arguments: Record<string, unknown> } }
  | { event: 'tool_result'; data: { id: string; name: string; success: boolean; content: string } }
  | { event: 'error'; data: { detail: string } }
  | { event: 'done'; data: { message_grn: string; conversation_grn: string; session_id: string; model: string; provider: string; finish_reason: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } } };

// ── Documents & Knowledge ───────────────────────────────────────────────────

export interface DocumentDto {
  grn: string;
  org_id: string;
  filename: string;
  source_uri: string | null;
  media_type: string | null;
  content_hash: string;
  byte_size: number;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  chunk_count: number;
  knowledge_source_grn: string | null;
  state: string;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  metadata?: Record<string, unknown>;
  labels?: Record<string, string>;
}

export interface KnowledgeSourceDto {
  grn: string;
  org_id: string;
  name: string;
  description: string;
  status: string;
  document_count: number;
  state: string;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  metadata?: Record<string, unknown>;
  labels?: Record<string, string>;
}

// ── Notifications ───────────────────────────────────────────────────────────

export interface NotificationDto {
  grn: string;
  org_id: string;
  recipient: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  read_at: string | null;
  source_event_id: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationListDto extends Paginated<NotificationDto> {
  unread_count: number;
}
