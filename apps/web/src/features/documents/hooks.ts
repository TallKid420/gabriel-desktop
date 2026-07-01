'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documents as documentsService } from '@/services';

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsService.listDocuments(),
    // Documents ingest asynchronously; poll so "processing" flips to "ready".
    refetchInterval: (q) =>
      (q.state.data ?? []).some((d) => d.status === 'processing') ? 2000 : false,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => documentsService.uploadDocument(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsService.deleteDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}
