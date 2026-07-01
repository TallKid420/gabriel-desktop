/**
 * Global search service — cross-entity search feeding the command palette
 * (ADR-035). Spans conversations, documents, agents, memories, and resources.
 * In M0 this is a client-side filter over mock data; in prod the Gateway
 * aggregates a ranked search across Core-backed indexes.
 */
import type { SearchResult } from '@/types';
import { mockDelay, USE_MOCK, gatewayRequest } from './gateway-client';
import {
  agents as mockAgents,
  conversations as mockConversations,
  documents as mockDocuments,
  memories as mockMemories,
  resources as mockResources,
} from './mock/data';

function matches(haystack: string, q: string): boolean {
  return haystack.toLowerCase().includes(q.toLowerCase());
}

export async function search(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  if (USE_MOCK) {
    const results: SearchResult[] = [];

    for (const c of mockConversations) {
      if (matches(c.title, q)) {
        results.push({
          id: c.id,
          entityType: 'conversation',
          title: c.title,
          subtitle: c.lastMessagePreview,
          workspace: 'chat',
          href: `/chat/${c.id}`,
        });
      }
    }
    for (const a of mockAgents) {
      if (matches(a.name, q) || matches(a.role, q)) {
        results.push({
          id: a.id,
          entityType: 'agent',
          title: a.name,
          subtitle: a.role,
          grn: a.grn,
          workspace: 'agents',
          href: `/agents/${a.id}`,
        });
      }
    }
    for (const d of mockDocuments) {
      if (matches(d.title, q) || matches(d.filename, q)) {
        results.push({
          id: d.id,
          entityType: 'document',
          title: d.title,
          subtitle: d.filename,
          grn: d.grn,
          workspace: 'documents',
          href: `/documents/${d.id}`,
        });
      }
    }
    for (const m of mockMemories) {
      if (matches(m.label, q) || matches(m.content, q)) {
        results.push({
          id: m.id,
          entityType: 'memory',
          title: m.label,
          subtitle: m.category,
          grn: m.grn,
          workspace: 'memory',
          href: `/memory`,
        });
      }
    }
    for (const r of mockResources) {
      const name = String(r.attributes.name ?? r.grn);
      if (matches(name, q) || matches(r.resourceType, q)) {
        results.push({
          id: r.grn,
          entityType: 'resource',
          title: name,
          subtitle: r.resourceType,
          grn: r.grn,
          workspace: 'resources',
          href: `/resources`,
        });
      }
    }

    return mockDelay(results.slice(0, 20), 120);
  }

  return gatewayRequest<SearchResult[]>('/search', { params: { q } });
}
