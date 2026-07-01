/**
 * Global Search domain types. Search spans conversations, documents, agents,
 * memories, and resources (and workflows as they come online).
 */
import type { GRN } from './common';
import type { WorkspaceId } from './workspace';

export type SearchEntityType =
  | 'conversation'
  | 'document'
  | 'agent'
  | 'memory'
  | 'resource'
  | 'workflow';

export interface SearchResult {
  id: string;
  entityType: SearchEntityType;
  title: string;
  subtitle?: string;
  grn?: GRN;
  /** Which workspace + route this result opens. */
  workspace: WorkspaceId;
  href: string;
}
