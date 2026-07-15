/**
 * Documents service — upload/list/delete against gabriel-core's document
 * library. Ingestion (hashing, normalization, chunking, embeddings) happens
 * server-side; uploads can be linked to a knowledge source so agents can
 * ground answers in them (RAG).
 */
import type { DeleteResult, GabrielDocument, DocumentStatus } from '@/types';
import type { DocumentDto, Paginated } from '@/types/api';
import { gatewayRequest } from './gateway-client';

function mapStatus(status: DocumentDto['status']): DocumentStatus {
  switch (status) {
    case 'processed':
      return 'ready';
    case 'failed':
      return 'failed';
    default:
      // `uploaded` and `processing` both render as in-flight.
      return 'processing';
  }
}

function mapDocument(dto: DocumentDto): GabrielDocument {
  return {
    grn: dto.grn,
    id: dto.grn,
    title: dto.filename.replace(/\.[^.]+$/, ''),
    filename: dto.filename,
    mediaType: dto.media_type ?? undefined,
    byteSize: dto.byte_size,
    status: mapStatus(dto.status),
    contentHash: dto.content_hash,
    sourceUri: dto.source_uri ?? undefined,
    knowledgeSourceGrn: dto.knowledge_source_grn ?? undefined,
    chunkCount: dto.chunk_count,
    updatedAt: dto.updated_at,
    tags: dto.labels ? Object.values(dto.labels) : [],
  };
}

export async function listDocuments(options?: {
  knowledgeSourceGrn?: string;
}): Promise<GabrielDocument[]> {
  const page = await gatewayRequest<Paginated<DocumentDto>>('/documents', {
    params: { limit: 100, knowledge_source_grn: options?.knowledgeSourceGrn },
  });
  return page.items
    .map(mapDocument)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getDocument(grn: string): Promise<GabrielDocument | null> {
  try {
    const dto = await gatewayRequest<DocumentDto>(
      `/documents/${encodeURIComponent(grn)}`,
    );
    return mapDocument(dto);
  } catch {
    return null;
  }
}

export interface UploadDocumentInput {
  file: File;
  /** Optional knowledge source to attach the document to. */
  knowledgeSourceGrn?: string;
}

/** Upload a document as multipart form data; the backend processes it inline. */
export async function uploadDocument(
  input: UploadDocumentInput | File,
): Promise<GabrielDocument> {
  const { file, knowledgeSourceGrn } =
    input instanceof File ? { file: input, knowledgeSourceGrn: undefined } : input;
  const form = new FormData();
  form.append('file', file);
  if (knowledgeSourceGrn) form.append('knowledge_source_grn', knowledgeSourceGrn);
  const dto = await gatewayRequest<DocumentDto>('/documents', {
    method: 'POST',
    form,
  });
  return mapDocument(dto);
}

export async function deleteDocument(grn: string): Promise<DeleteResult> {
  await gatewayRequest<void>(`/documents/${encodeURIComponent(grn)}`, {
    method: 'DELETE',
  });
  return { deleted: true, id: grn, grn };
}
