'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agents as agentsService } from '@/services';
import type { AgentConfig } from '@/types';
import type { CreateAgentInput } from '@/services/agents';

export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: () => agentsService.listAgents() });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAgentInput) => agentsService.createAgent(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentsService.deleteAgent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ['agents', id],
    queryFn: () => agentsService.getAgent(id),
    enabled: Boolean(id),
  });
}

export function useUpdateAgentConfig(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: Partial<AgentConfig>) =>
      agentsService.updateAgentConfig(id, config),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      qc.invalidateQueries({ queryKey: ['agents', id] });
    },
  });
}

export function useSetAgentEnabled(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => agentsService.setAgentEnabled(id, enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      qc.invalidateQueries({ queryKey: ['agents', id] });
    },
  });
}
