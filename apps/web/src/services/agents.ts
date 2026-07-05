/**
 * Agents service — list/get agents and manage per-agent configuration.
 *
 * LLM configuration is per-agent (ADR-007 §7): there is no global model. The
 * `config` object here mirrors the eventual SDK AgentConfig, so switching
 * providers never touches the runtime core — only this config + the Gateway's
 * provider registry.
 */
import type { Agent, AgentConfig, DeleteResult } from '@/types';
import { gatewayRequest, mockDelay, USE_MOCK } from './gateway-client';
import { agents as mockAgents } from './mock/data';
import { getPrincipalToken } from './auth';

export interface CreateAgentInput {
  name: string;
  role: string;
  description?: string;
  config: AgentConfig;
  accent?: string;
}

export async function listAgents(): Promise<Agent[]> {
  const principalToken = await getPrincipalToken();
  return gatewayRequest<Agent[]>('/agents', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${principalToken}`,
      // "X-Capabilities": "read_resources,write_resources,execute_workflow",
    }
  });
}

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  if (USE_MOCK) {
    const id = input.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `agent-${Date.now()}`;

    const agent: Agent = {
      grn: `grn://org_harbor/agent/${id}`,
      id,
      name: input.name,
      role: input.role,
      description: input.description,
      status: 'idle',
      config: input.config,
      accent: input.accent ?? 'oklch(0.62 0.17 256)',
      metrics: { runs: 0, successRate: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockAgents.unshift(agent);
    return mockDelay({ ...agent }, 220);
  }

  const principalToken = await getPrincipalToken();
  return gatewayRequest<Agent>('/agents', {
    method: 'POST',
    body: input,
    headers: {
      Authorization: `Bearer ${principalToken}`,
    },
  });
}

export async function getAgent(id: string): Promise<Agent | null> {
  if (USE_MOCK) {
    return mockDelay(mockAgents.find((a) => a.id === id) ?? null, 140);
  }
  return gatewayRequest<Agent>(`/agents/${id}`);
}

export async function updateAgentConfig(
  id: string,
  config: Partial<AgentConfig>,
): Promise<Agent> {
  if (USE_MOCK) {
    const agent = mockAgents.find((a) => a.id === id);
    if (!agent) throw new Error(`Unknown agent: ${id}`);
    agent.config = { ...agent.config, ...config };
    return mockDelay({ ...agent }, 180);
  }
  return gatewayRequest<Agent>(`/agents/${id}/config`, {
    method: 'PATCH',
    body: config,
  });
}

export async function setAgentEnabled(
  id: string,
  enabled: boolean,
): Promise<Agent> {
  if (USE_MOCK) {
    const agent = mockAgents.find((a) => a.id === id);
    if (!agent) throw new Error(`Unknown agent: ${id}`);
    agent.status = enabled ? 'active' : 'disabled';
    return mockDelay({ ...agent }, 160);
  }
  return gatewayRequest<Agent>(`/agents/${id}/${enabled ? 'enable' : 'disable'}`, {
    method: 'POST',
  });
}

export async function deleteAgent(id: string): Promise<DeleteResult> {
  if (USE_MOCK) {
    const idx = mockAgents.findIndex((a) => a.id === id);
    const deleted = idx >= 0;
    const grn = deleted ? mockAgents[idx].grn : undefined;
    if (deleted) mockAgents.splice(idx, 1);
    return mockDelay({ deleted, id, grn }, 160);
  }

  const principalToken = await getPrincipalToken();
  return gatewayRequest<DeleteResult>(`/agents/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${principalToken}`,
    },
  });
}
