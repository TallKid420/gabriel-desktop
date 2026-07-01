/**
 * Dashboard service — aggregates a snapshot for the Home workspace. In prod the
 * Gateway performs this request aggregation (fan-out to Core/services) so the
 * browser makes one call; in M0 we assemble it from the mock providers.
 */
import type {
  Agent,
  Conversation,
  GabrielDocument,
  GabrielEvent,
} from '@/types';
import { mockDelay, USE_MOCK, gatewayRequest } from './gateway-client';
import {
  agents as mockAgents,
  conversations as mockConversations,
  documents as mockDocuments,
  events as mockEvents,
} from './mock/data';

export interface DashboardStat {
  label: string;
  value: string;
  hint?: string;
}

export interface DashboardSnapshot {
  stats: DashboardStat[];
  activeAgents: Agent[];
  recentConversations: Conversation[];
  recentDocuments: GabrielDocument[];
  recentEvents: GabrielEvent[];
}

export async function getDashboard(): Promise<DashboardSnapshot> {
  if (USE_MOCK) {
    const activeAgents = mockAgents.filter((a) => a.status === 'active');
    const totalRuns = mockAgents.reduce(
      (sum, a) => sum + (a.metrics?.runs ?? 0),
      0,
    );
    const snapshot: DashboardSnapshot = {
      stats: [
        { label: 'Active agents', value: String(activeAgents.length), hint: `${mockAgents.length} total` },
        { label: 'Conversations', value: String(mockConversations.length), hint: 'this week' },
        { label: 'Documents', value: String(mockDocuments.length), hint: 'in library' },
        { label: 'Agent runs', value: totalRuns.toLocaleString(), hint: 'all time' },
      ],
      activeAgents,
      recentConversations: [...mockConversations]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5),
      recentDocuments: [...mockDocuments]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5),
      recentEvents: [...mockEvents]
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 6),
    };
    return mockDelay(snapshot, 220);
  }
  return gatewayRequest<DashboardSnapshot>('/dashboard');
}
