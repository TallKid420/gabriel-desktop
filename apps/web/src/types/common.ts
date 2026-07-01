/**
 * Shared primitive domain types.
 *
 * These mirror concepts in Gabriel Core (GRN addressing, pagination) so the UI
 * speaks the same language as the platform. Transport-specific shapes live in
 * the services layer, not here.
 */

/** A Gabriel Resource Name — the universal address of any resource. */
export type GRN = string;

/** ISO-8601 timestamp string. */
export type ISODateString = string;

/** A page of results from a list endpoint. */
export interface Page<T> {
  items: T[];
  /** Opaque cursor for the next page, if any. */
  nextCursor?: string | null;
  total?: number;
}

/** Standard result of a delete operation. */
export interface DeleteResult {
  deleted: boolean;
  grn?: GRN;
  id?: string;
}

/** Async data states used across the service/hook layer. */
export type LoadState = 'idle' | 'loading' | 'success' | 'error';
