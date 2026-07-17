/**
 * Agent domain types.
 *
 * Agents are Resources with a runtime lifecycle (ADR-004 Hybrid Agent Model,
 * ADR-010 Agent Runtime, ADR-034 Agent Lifecycle). LLM configuration is
 * per-agent (ADR-007 §7) behind a provider-agnostic abstraction — there is no
 * global model setting.
 */
import type { GRN, ISODateString } from './common';

/** Supported provider identifiers. New providers are added here + in the
 * Gateway's provider registry; the runtime core never changes. */
export type LLMProviderId =
  | 'mock'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'ollama'
  // Providers are registered dynamically in the Gateway's registry, so any
  // other identifier is also valid on the wire.
  | (string & {});

/** Per-agent model configuration (mirrors the eventual SDK AgentConfig). */
export interface AgentConfig {
  provider: LLMProviderId;
  model: string;
  temperature?: number;
  maxTokens?: number;
  reasoningLevel?: 'low' | 'medium' | 'high';
  /** Tool GRNs the agent is permitted to use (capabilities enforced by Core). */
  tools?: string[];
  systemPrompt?: string;
}

/** Coarse operational status shown in lists/cards. */
export type AgentStatus = 'active' | 'idle' | 'paused' | 'disabled';

/**
 * Formal per-execution lifecycle states (ADR-034). Every transition emits an
 * immutable event in Core; the UI renders these for monitoring/debugging.
 */
export type AgentLifecycleState =
  | 'created'
  | 'queued'
  | 'planning'
  | 'executing'
  | 'waiting'
  | 'delegating'
  | 'awaiting_human_approval'
  | 'resuming'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out'
  | 'paused'
  | 'retrying';

export interface Agent {
  grn: GRN;
  id: string;
  name: string;
  role: string;
  description?: string;
  status: AgentStatus;
  /** Whether the agent is enabled for execution (independent of status). */
  enabled?: boolean;
  /** Instructions prepended to every conversation turn. */
  systemPrompt?: string;
  /** Knowledge source GRNs used to ground the agent's answers (RAG). */
  knowledgeSources?: string[];
  /** Document collection GRNs (typed knowledge sources) grounding the agent. */
  documentCollections?: string[];
  /** Tool names explicitly denied for this agent (deny-wins over `config.tools`). */
  disabledTools?: string[];
  config: AgentConfig;
  /** Display accent color (OKLCH) for avatars/cards. */
  accent?: string;
  metrics?: {
    runs: number;
    successRate: number;
  };
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

/** A single agent execution instance and its current lifecycle position. */
export interface AgentRun {
  id: string;
  agentGrn: GRN;
  state: AgentLifecycleState;
  startedAt: ISODateString;
  updatedAt: ISODateString;
  lastEvent?: string;
}
