/**
 * Knowledge domain types. A knowledge source is a named collection of
 * documents whose embedded chunks ground agent answers (RAG).
 */
import type { GRN, ISODateString } from './common';

export interface KnowledgeSource {
  grn: GRN;
  id: string;
  name: string;
  description?: string;
  status: string;
  documentCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
