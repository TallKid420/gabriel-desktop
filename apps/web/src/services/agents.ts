/**
 * Agents service — CRUD against gabriel-core's agent management API.
 *
 * LLM configuration is per-agent (ADR-007 §7): there is no global model. The
 * backend serializes model settings under the wire name `model_config`
 * alongside the system prompt, allowed tools and knowledge sources.
 */
import type { Agent, AgentConfig, DeleteResult, LLMProviderId } from '@/types';
import type {
  AgentCreateDto,
  AgentDto,
  AgentUpdateDto,
  Paginated,
  ProviderDto,
  ProviderModelDto,
} from '@/types/api';
import { gatewayRequest } from './gateway-client';

function mapAgent(dto: AgentDto): Agent {
  const status: Agent['status'] = !dto.enabled
    ? 'disabled'
    : dto.status === 'active'
      ? 'active'
      : dto.status === 'paused'
        ? 'paused'
        : 'idle';
  return {
    grn: dto.grn,
    id: dto.grn,
    name: dto.name,
    role: dto.description || 'Agent',
    description: dto.description || undefined,
    status,
    enabled: dto.enabled,
    systemPrompt: dto.system_prompt || undefined,
    knowledgeSources: dto.knowledge_sources ?? [],
    documentCollections: dto.document_collections ?? [],
    disabledTools: dto.disabled_tools ?? [],
    config: {
      provider: (dto.model_config?.provider ?? 'ollama') as LLMProviderId,
      model: dto.model_config?.model ?? '',
      temperature: dto.model_config?.temperature ?? undefined,
      maxTokens: dto.model_config?.max_tokens ?? undefined,
      tools: dto.allowed_tools ?? [],
      systemPrompt: dto.system_prompt || undefined,
    },
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  systemPrompt?: string;
  config: AgentConfig;
  knowledgeSources?: string[];
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  systemPrompt?: string;
  config?: Partial<AgentConfig>;
  knowledgeSources?: string[];
  /** Document collection GRNs (typed knowledge sources) grounding the agent. */
  documentCollections?: string[];
  /** Tool names explicitly denied for this agent (deny-wins). */
  disabledTools?: string[];
  /** Tool names the agent may use. Alias for `config.tools`. */
  allowedTools?: string[];
}

function toWire(input: UpdateAgentInput): AgentUpdateDto {
  const wire: AgentUpdateDto = {};
  if (input.name !== undefined) wire.name = input.name;
  if (input.description !== undefined) wire.description = input.description;
  if (input.systemPrompt !== undefined) wire.system_prompt = input.systemPrompt;
  if (input.knowledgeSources !== undefined)
    wire.knowledge_sources = input.knowledgeSources;
  if (input.documentCollections !== undefined)
    wire.document_collections = input.documentCollections;
  if (input.disabledTools !== undefined)
    wire.disabled_tools = input.disabledTools;
  if (input.allowedTools !== undefined) wire.allowed_tools = input.allowedTools;
  if (input.config) {
    wire.model_config = {
      provider: input.config.provider,
      model: input.config.model,
      temperature: input.config.temperature,
      max_tokens: input.config.maxTokens,
    };
    if (input.config.tools !== undefined) wire.allowed_tools = input.config.tools;
  }
  return wire;
}

export async function listAgents(): Promise<Agent[]> {
  const page = await gatewayRequest<Paginated<AgentDto>>('/agents', {
    params: { limit: 100 },
  });
  return page.items.map(mapAgent);
}

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  const body: AgentCreateDto = {
    name: input.name,
    description: input.description ?? '',
    system_prompt: input.systemPrompt ?? input.config.systemPrompt ?? '',
    model_config: {
      provider: input.config.provider,
      model: input.config.model,
      temperature: input.config.temperature,
      max_tokens: input.config.maxTokens,
    },
    knowledge_sources: input.knowledgeSources ?? [],
  };
  const dto = await gatewayRequest<AgentDto>('/agents', { method: 'POST', body });
  return mapAgent(dto);
}

export async function getAgent(grn: string): Promise<Agent | null> {
  try {
    const dto = await gatewayRequest<AgentDto>(`/agents/${encodeURIComponent(grn)}`);
    return mapAgent(dto);
  } catch {
    return null;
  }
}

export async function updateAgent(
  grn: string,
  input: UpdateAgentInput,
): Promise<Agent> {
  const dto = await gatewayRequest<AgentDto>(`/agents/${encodeURIComponent(grn)}`, {
    method: 'PATCH',
    body: toWire(input),
  });
  return mapAgent(dto);
}

/** Legacy helper kept for call sites that only edit model settings. */
export async function updateAgentConfig(
  grn: string,
  config: Partial<AgentConfig>,
): Promise<Agent> {
  return updateAgent(grn, { config, systemPrompt: config.systemPrompt });
}

export async function setAgentEnabled(
  grn: string,
  enabled: boolean,
): Promise<Agent> {
  await gatewayRequest<unknown>(
    `/agents/${encodeURIComponent(grn)}/${enabled ? 'enable' : 'disable'}`,
    { method: 'POST' },
  );
  const agent = await getAgent(grn);
  if (!agent) throw new Error('Agent disappeared after toggling');
  return agent;
}

export async function deleteAgent(grn: string): Promise<DeleteResult> {
  await gatewayRequest<unknown>(`/agents/${encodeURIComponent(grn)}`, {
    method: 'DELETE',
  });
  return { deleted: true, id: grn, grn };
}

// ── AI Gateway provider catalog (for the model picker) ─────────────────────

export async function listProviders(): Promise<ProviderDto[]> {
  const data = await gatewayRequest<{ items: ProviderDto[] }>('/gateway/providers');
  return data.items;
}

export async function listProviderModels(name: string): Promise<ProviderModelDto[]> {
  try {
    const data = await gatewayRequest<{ items: ProviderModelDto[] }>(
      `/gateway/providers/${encodeURIComponent(name)}/models`,
    );
    return data.items;
  } catch {
    return [];
  }
}
