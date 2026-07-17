/**
 * Knowledge service — knowledge sources (named collections of documents that
 * agents can be grounded in) and semantic search over embedded chunks.
 */
import type { KnowledgeSource, KnowledgeSourceType } from '@/types';
import type { KnowledgeSourceDto, Paginated } from '@/types/api';
import { gatewayRequest } from './gateway-client';

function mapSourceType(value: string | undefined): KnowledgeSourceType {
  return value === 'document_collection' || value === 'external'
    ? value
    : 'vector_collection';
}

function mapSource(dto: KnowledgeSourceDto): KnowledgeSource {
  return {
    grn: dto.grn,
    id: dto.grn,
    name: dto.name,
    description: dto.description || undefined,
    sourceType: mapSourceType(dto.source_type),
    status: dto.status,
    documentCount: dto.document_count,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export async function listKnowledgeSources(options?: {
  sourceType?: KnowledgeSourceType;
}): Promise<KnowledgeSource[]> {
  const page = await gatewayRequest<Paginated<KnowledgeSourceDto>>(
    '/knowledge/sources',
    { params: { limit: 100, source_type: options?.sourceType } },
  );
  return page.items.map(mapSource);
}

export async function createKnowledgeSource(input: {
  name: string;
  description?: string;
  sourceType?: KnowledgeSourceType;
}): Promise<KnowledgeSource> {
  const dto = await gatewayRequest<KnowledgeSourceDto>('/knowledge/sources', {
    method: 'POST',
    body: {
      name: input.name,
      description: input.description ?? '',
      source_type: input.sourceType ?? 'vector_collection',
    },
  });
  return mapSource(dto);
}

export async function deleteKnowledgeSource(grn: string): Promise<void> {
  await gatewayRequest<void>(`/knowledge/sources/${encodeURIComponent(grn)}`, {
    method: 'DELETE',
  });
}

/** Attach an already-uploaded document to a knowledge source. */
export async function attachDocument(
  sourceGrn: string,
  documentGrn: string,
): Promise<void> {
  await gatewayRequest<unknown>(
    `/knowledge/sources/${encodeURIComponent(sourceGrn)}/documents`,
    { method: 'POST', body: { document_grn: documentGrn } },
  );
}
