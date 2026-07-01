/**
 * Memory domain types (ADR-012 Multi-Layer Memory, ADR-013 Governance).
 * The browser inspects/manages memories; storage & retrieval live in Core.
 */
import type { GRN, ISODateString } from './common';

/** Memory layers per the multi-layer memory model. */
export type MemoryLayer =
  | 'working'
  | 'episodic'
  | 'semantic'
  | 'procedural'
  | 'organizational';

export interface MemoryEntry {
  id: string;
  grn?: GRN;
  label: string;
  content: string;
  layer: MemoryLayer;
  category?: string;
  source?: string;
  /** 0–100 confidence score. */
  confidence?: number;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}
