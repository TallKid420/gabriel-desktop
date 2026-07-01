/**
 * Documents service — list/get/upload. Core handles ingestion (hashing,
 * normalization, storage); the UI only lists documents and submits uploads.
 */
import type { DeleteResult, GabrielDocument } from '@/types';
import { gatewayRequest, mockDelay, USE_MOCK } from './gateway-client';
import { documents as mockDocuments } from './mock/data';

export async function listDocuments(): Promise<GabrielDocument[]> {
  if (USE_MOCK) {
    const sorted = [...mockDocuments].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
    return mockDelay(sorted);
  }
  return gatewayRequest<GabrielDocument[]>('/documents');
}

export async function getDocument(id: string): Promise<GabrielDocument | null> {
  if (USE_MOCK) {
    return mockDelay(mockDocuments.find((d) => d.id === id) ?? null, 140);
  }
  return gatewayRequest<GabrielDocument>(`/documents/${id}`);
}

/**
 * Upload a document. In M0 we synthesize a "processing" entry that flips to
 * "ready" so the UI can demo the ingestion lifecycle. In prod this posts
 * multipart form data to the Gateway which streams it to Core.
 */
export async function uploadDocument(file: File): Promise<GabrielDocument> {
  if (USE_MOCK) {
    const id = `d_${Date.now()}`;
    const doc: GabrielDocument = {
      grn: `grn://org_harbor/document/${id}`,
      id,
      title: file.name.replace(/\.[^.]+$/, ''),
      filename: file.name,
      mediaType: file.type || 'application/octet-stream',
      byteSize: file.size,
      status: 'processing',
      owner: 'You',
      updatedAt: new Date().toISOString(),
      tags: [],
    };
    mockDocuments.unshift(doc);
    // Simulate async ingestion completing.
    setTimeout(() => {
      doc.status = 'ready';
      doc.updatedAt = new Date().toISOString();
    }, 2500);
    return mockDelay(doc, 300);
  }
  const form = new FormData();
  form.append('file', file);
  return gatewayRequest<GabrielDocument>('/documents', { method: 'POST', form });
}

export async function deleteDocument(id: string): Promise<DeleteResult> {
  if (USE_MOCK) {
    const idx = mockDocuments.findIndex((d) => d.id === id);
    if (idx >= 0) mockDocuments.splice(idx, 1);
    return mockDelay({ deleted: idx >= 0, id }, 160);
  }
  return gatewayRequest<DeleteResult>(`/documents/${id}`, { method: 'DELETE' });
}
