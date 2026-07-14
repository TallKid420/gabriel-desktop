/**
 * Document domain types. Documents are ingested by Core (hashing, normalization
 * and content storage happen server-side); the UI only uploads and lists them.
 */
import type { GRN, ISODateString } from './common';

export type DocumentStatus = 'processing' | 'ready' | 'failed';

export interface GabrielDocument {
  grn: GRN;
  id: string;
  title: string;
  filename: string;
  mediaType?: string;
  byteSize?: number;
  status: DocumentStatus;
  /** Owning agent or principal display name. */
  owner?: string;
  contentHash?: string;
  sourceUri?: string;
  /** Knowledge source the document is attached to, if any. */
  knowledgeSourceGrn?: GRN;
  /** Number of embedded chunks produced during processing. */
  chunkCount?: number;
  updatedAt: ISODateString;
  tags?: string[];
}
