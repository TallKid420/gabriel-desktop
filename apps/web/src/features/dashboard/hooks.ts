'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboard } from '@/services';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboard.getDashboard(),
  });
}
