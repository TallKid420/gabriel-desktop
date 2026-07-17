/**
 * Knowledge domain types. A knowledge source is a named collection of
 * documents whose embedded chunks ground agent answers (RAG).
 */
import type { GRN, ISODateString } from './common';

/**
 * How a knowledge source is backed (mirrors gabriel-core's
 * KnowledgeSourceType). Document collections are typed KnowledgeSource
 * variants; `external` is reserved for future connectors.
 */
export type KnowledgeSourceType =
  | 'vector_collection'
  | 'document_collection'
  | 'external';

export interface KnowledgeSource {
  grn: GRN;
  id: string;
  name: string;
  description?: string;
  sourceType: KnowledgeSourceType;
  status: string;
  documentCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
