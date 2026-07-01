/**
 * Memory service — inspect/manage the multi-layer memory store (ADR-012/013).
 * Storage & retrieval live in Core; the UI browses and curates.
 */
import type { MemoryEntry, MemoryLayer } from '@/types';
import { gatewayRequest, mockDelay, USE_MOCK } from './gateway-client';
import { memories as mockMemories } from './mock/data';

export async function listMemories(layer?: MemoryLayer): Promise<MemoryEntry[]> {
  if (USE_MOCK) {
    const items = layer
      ? mockMemories.filter((m) => m.layer === layer)
      : mockMemories;
    return mockDelay(items);
  }
  return gatewayRequest<MemoryEntry[]>('/memory', {
    params: { layer },
  });
}

export async function getMemory(id: string): Promise<MemoryEntry | null> {
  if (USE_MOCK) {
    return mockDelay(mockMemories.find((m) => m.id === id) ?? null, 120);
  }
  return gatewayRequest<MemoryEntry>(`/memory/${id}`);
}
