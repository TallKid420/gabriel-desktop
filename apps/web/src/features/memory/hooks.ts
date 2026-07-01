'use client';

import { useQuery } from '@tanstack/react-query';
import { memory as memoryService } from '@/services';
import type { MemoryLayer } from '@/types';

export function useMemories(layer?: MemoryLayer) {
  return useQuery({
    queryKey: ['memory', layer ?? 'all'],
    queryFn: () => memoryService.listMemories(layer),
  });
}
