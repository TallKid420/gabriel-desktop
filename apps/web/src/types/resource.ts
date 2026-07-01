/**
 * Universal Resource Model types (ADR-005 / ADR-009).
 * Everything in Gabriel is a Resource addressed by a GRN.
 */
import type { GRN, ISODateString } from './common';

export type ResourceState = 'active' | 'archived' | 'deleted';

export interface Resource {
  grn: GRN;
  resourceType: string;
  state: ResourceState;
  attributes: Record<string, unknown>;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}
