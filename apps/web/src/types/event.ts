/**
 * Event domain types (ADR-017 Event Driven Architecture, ADR-018 Command/Event
 * Separation). Events are immutable facts emitted by Core; the UI reads them
 * for the event viewer and live feeds.
 */
import type { GRN, ISODateString } from './common';

export interface GabrielEvent {
  id: string;
  type: string;
  principalId: string;
  organizationId: string;
  resourceGrn?: GRN;
  occurredAt: ISODateString;
  correlationId?: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
}
