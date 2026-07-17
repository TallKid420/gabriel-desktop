'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tools as toolsService } from '@/services';
import type {
  CreateToolInput,
  ListToolsOptions,
  UpdateToolInput,
} from '@/services/tools';

export function useTools(options: ListToolsOptions = {}) {
  return useQuery({
    queryKey: ['tools', options],
    queryFn: () => toolsService.listTools(options),
  });
}

export function useCreateTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateToolInput) => toolsService.createTool(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tools'] });
    },
  });
}

export function useUpdateTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ grn, input }: { grn: string; input: UpdateToolInput }) =>
      toolsService.updateTool(grn, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tools'] });
    },
  });
}

export function useSetToolEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ grn, enabled }: { grn: string; enabled: boolean }) =>
      toolsService.setToolEnabled(grn, enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tools'] });
    },
  });
}

export function useDeleteTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grn: string) => toolsService.deleteTool(grn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tools'] });
    },
  });
}
