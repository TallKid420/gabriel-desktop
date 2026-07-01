/**
 * Resources service — the Universal Resource Model (ADR-005/009). Everything in
 * Gabriel is a Resource addressed by a GRN; this lists them for the browser.
 */
import type { Resource } from '@/types';
import { gatewayRequest, mockDelay, USE_MOCK } from './gateway-client';
import { resources as mockResources } from './mock/data';

export async function listResources(resourceType?: string): Promise<Resource[]> {
  if (USE_MOCK) {
    const items = resourceType
      ? mockResources.filter((r) => r.resourceType === resourceType)
      : mockResources;
    return mockDelay(items);
  }
  return gatewayRequest<Resource[]>('/resources', {
    params: { type: resourceType },
  });
}

export async function getResource(grn: string): Promise<Resource | null> {
  if (USE_MOCK) {
    return mockDelay(mockResources.find((r) => r.grn === grn) ?? null, 120);
  }
  return gatewayRequest<Resource>('/resources/resolve', { params: { grn } });
}
