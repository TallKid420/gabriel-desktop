'use client';

import { useQuery } from '@tanstack/react-query';
import { resources as resourcesService } from '@/services';

export function useResources(resourceType?: string) {
  return useQuery({
    queryKey: ['resources', resourceType ?? 'all'],
    queryFn: () => resourcesService.listResources(resourceType),
  });
}
