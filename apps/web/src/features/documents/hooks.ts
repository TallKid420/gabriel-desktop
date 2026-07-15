'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  documents as documentsService,
  knowledge as knowledgeService,
} from '@/services';
import type { UploadDocumentInput } from '@/services/documents';

export function useDocuments(knowledgeSourceGrn?: string) {
  return useQuery({
    queryKey: ['documents', knowledgeSourceGrn ?? 'all'],
    queryFn: () => documentsService.listDocuments({ knowledgeSourceGrn }),
    // Documents ingest asynchronously; poll so "processing" flips to "ready".
    refetchInterval: (q) =>
      (q.state.data ?? []).some((d) => d.status === 'processing') ? 2000 : false,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadDocumentInput | File) =>
      documentsService.uploadDocument(input),
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

export function useKnowledgeSources() {
  return useQuery({
    queryKey: ['knowledge-sources'],
    queryFn: () => knowledgeService.listKnowledgeSources(),
  });
}

export function useCreateKnowledgeSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      knowledgeService.createKnowledgeSource(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge-sources'] }),
  });
}
