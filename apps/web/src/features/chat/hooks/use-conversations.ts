'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chat as chatService } from '@/services';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.listConversations(),
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: () => chatService.getConversation(id),
    enabled: Boolean(id),
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title?: string; agentGrn?: string }) =>
      chatService.createConversation(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}
