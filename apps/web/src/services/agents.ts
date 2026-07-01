/**
 * Agents service — list/get agents and manage per-agent configuration.
 *
 * LLM configuration is per-agent (ADR-007 §7): there is no global model. The
 * `config` object here mirrors the eventual SDK AgentConfig, so switching
 * providers never touches the runtime core — only this config + the Gateway's
 * provider registry.
 */
import type { Agent, AgentConfig } from '@/types';
import { gatewayRequest, mockDelay, USE_MOCK } from './gateway-client';
import { agents as mockAgents } from './mock/data';

export async function listAgents(): Promise<Agent[]> {
  if (USE_MOCK) return mockDelay(mockAgents);
  return gatewayRequest<Agent[]>('/agents');
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
