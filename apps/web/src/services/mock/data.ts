/**
 * Mock domain data for M0 (no Gateway/Core yet).
 *
 * Data is modeled around the real pilot organizations (insurance, custom
 * clothing, church, bagpiping) so features can be evaluated for real-world
 * usefulness. This module is the single seed source; services read from it and
 * are the only thing feature code depends on. When the Gateway lands, services
 * switch to real calls and this file is deleted — no component changes.
 */
import type {
  Agent,
  Conversation,
  DevPrincipalOption,
  GabrielDocument,
  GabrielEvent,
  MemoryEntry,
  Message,
  Notification,
  Organization,
  Resource,
} from '@/types';

// ---- Organizations (pilot tenants) ----------------------------------------
export const organizations: Organization[] = [
  { id: 'org_harbor', name: 'Harbor Mutual Insurance', plan: 'Pilot' },
  { id: 'org_thread', name: 'Thread & Needle Custom Clothing', plan: 'Pilot' },
  { id: 'org_grace', name: 'Grace Community Church', plan: 'Pilot' },
  { id: 'org_highland', name: 'Highland Bagpiping Co.', plan: 'Pilot' },
];

// ---- Dev Identity Provider options ----------------------------------------
export const devPrincipals: DevPrincipalOption[] = [
  {
    organization: organizations[0],
    user: {
      id: 'u_alice',
      displayName: 'Alice Nguyen',
      principal: 'principal://org_harbor/user/alice',
      initials: 'AN',
      email: 'alice@harbormutual.com',
    },
    roles: ['workspace_admin'],
  },
  {
    organization: organizations[0],
    user: {
      id: 'u_marco',
      displayName: 'Marco Reyes',
      principal: 'principal://org_harbor/user/marco',
      initials: 'MR',
      email: 'marco@harbormutual.com',
    },
    roles: ['member'],
  },
  {
    organization: organizations[1],
    user: {
      id: 'u_sofia',
      displayName: 'Sofia Bianchi',
      principal: 'principal://org_thread/user/sofia',
      initials: 'SB',
      email: 'sofia@threadandneedle.com',
    },
    roles: ['workspace_admin'],
  },
  {
    organization: organizations[2],
    user: {
      id: 'u_pastor',
      displayName: 'Pastor David Kim',
      principal: 'principal://org_grace/user/david',
      initials: 'DK',
      email: 'david@gracecommunity.org',
    },
    roles: ['workspace_admin'],
  },
  {
    organization: organizations[3],
    user: {
      id: 'u_hamish',
      displayName: 'Hamish MacLeod',
      principal: 'principal://org_highland/user/hamish',
      initials: 'HM',
      email: 'hamish@highlandpipes.co',
    },
    roles: ['workspace_admin', 'operator'],
  },
];

// ---- Agents (scoped to the default demo org: Harbor Mutual) ----------------
export const agents: Agent[] = [
  {
    grn: 'grn://org_harbor/agent/claims-assistant',
    id: 'claims-assistant',
    name: 'Claims Assistant',
    role: 'First-notice-of-loss intake & triage',
    description:
      'Guides policyholders through filing a claim, gathers required details, and routes to the right adjuster.',
    status: 'active',
    config: { provider: 'mock', model: 'gabriel-mock-pro', temperature: 0.3, maxTokens: 2048 },
    accent: 'oklch(0.62 0.17 256)',
    metrics: { runs: 1284, successRate: 98.4 },
  },
  {
    grn: 'grn://org_harbor/agent/underwriting-analyst',
    id: 'underwriting-analyst',
    name: 'Underwriting Analyst',
    role: 'Risk assessment & policy review',
    description:
      'Reviews applications against underwriting guidelines and surfaces risk factors.',
    status: 'active',
    config: { provider: 'mock', model: 'gabriel-mock-pro', temperature: 0.2, maxTokens: 4096, reasoningLevel: 'high' },
    accent: 'oklch(0.72 0.12 190)',
    metrics: { runs: 942, successRate: 99.1 },
  },
  {
    grn: 'grn://org_harbor/agent/policy-explainer',
    id: 'policy-explainer',
    name: 'Policy Explainer',
    role: 'Customer-facing coverage Q&A',
    description:
      'Answers policyholder questions about coverage, deductibles, and exclusions in plain language.',
    status: 'idle',
    config: { provider: 'mock', model: 'gabriel-mock-lite', temperature: 0.5 },
    accent: 'oklch(0.7 0.13 220)',
    metrics: { runs: 561, successRate: 96.7 },
  },
  {
    grn: 'grn://org_harbor/agent/compliance-sentinel',
    id: 'compliance-sentinel',
    name: 'Compliance Sentinel',
    role: 'Regulatory & audit monitoring',
    description:
      'Monitors document changes and flags compliance issues against state regulations.',
    status: 'paused',
    config: { provider: 'mock', model: 'gabriel-mock-pro', temperature: 0.1, reasoningLevel: 'high' },
    accent: 'oklch(0.55 0.15 280)',
    metrics: { runs: 2103, successRate: 97.8 },
  },
];

// ---- Conversations & messages ---------------------------------------------
export const conversations: Conversation[] = [
  {
    id: 'c_1',
    title: 'Water damage claim — 428 Elm St',
    agentGrn: 'grn://org_harbor/agent/claims-assistant',
    createdAt: '2026-06-29T14:20:00Z',
    updatedAt: '2026-06-30T02:10:00Z',
    messageCount: 6,
    lastMessagePreview: 'I have logged the claim and assigned adjuster M. Reyes.',
  },
  {
    id: 'c_2',
    title: 'Commercial property risk review',
    agentGrn: 'grn://org_harbor/agent/underwriting-analyst',
    createdAt: '2026-06-28T09:00:00Z',
    updatedAt: '2026-06-29T16:45:00Z',
    messageCount: 12,
    lastMessagePreview: 'Flagged 3 risk factors: roof age, flood zone, prior claims.',
  },
  {
    id: 'c_3',
    title: 'Explain umbrella policy to new customer',
    agentGrn: 'grn://org_harbor/agent/policy-explainer',
    createdAt: '2026-06-27T11:30:00Z',
    updatedAt: '2026-06-27T11:52:00Z',
    messageCount: 4,
    lastMessagePreview: 'An umbrella policy adds liability coverage above your...',
  },
];

export const messagesByConversation: Record<string, Message[]> = {
  c_1: [
    {
      id: 'm1',
      role: 'assistant',
      content:
        'Hello — I can help you file a claim. Can you describe what happened and when?',
      createdAt: '2026-06-29T14:20:00Z',
      agentGrn: 'grn://org_harbor/agent/claims-assistant',
    },
    {
      id: 'm2',
      role: 'user',
      content: 'A pipe burst in the basement of 428 Elm St last night and flooded the floor.',
      createdAt: '2026-06-29T14:21:00Z',
    },
    {
      id: 'm3',
      role: 'assistant',
      content:
        'I am sorry to hear that. I have logged the claim and assigned adjuster M. Reyes. You will receive a call within 24 hours. Would you like to upload photos now?',
      createdAt: '2026-06-29T14:21:30Z',
      agentGrn: 'grn://org_harbor/agent/claims-assistant',
    },
  ],
  c_2: [
    {
      id: 'm1',
      role: 'user',
      content: 'Review the commercial property application for 90 Harbor Blvd.',
      createdAt: '2026-06-28T09:00:00Z',
    },
    {
      id: 'm2',
      role: 'assistant',
      content:
        'Flagged 3 risk factors: roof age (22 yrs), FEMA flood zone AE, and two prior water claims. Recommend a higher deductible or inspection contingency.',
      createdAt: '2026-06-28T09:02:00Z',
      agentGrn: 'grn://org_harbor/agent/underwriting-analyst',
    },
  ],
  c_3: [],
};

// ---- Documents -------------------------------------------------------------
export const documents: GabrielDocument[] = [
  {
    grn: 'grn://org_harbor/document/d1',
    id: 'd1',
    title: 'Homeowners Policy HO-3 Master Form',
    filename: 'ho3-master-form.pdf',
    mediaType: 'application/pdf',
    byteSize: 2_400_000,
    status: 'ready',
    owner: 'Policy Explainer',
    contentHash: 'sha256:9f2a…',
    updatedAt: '2026-06-30T00:10:00Z',
    tags: ['policy', 'homeowners'],
  },
  {
    grn: 'grn://org_harbor/document/d2',
    id: 'd2',
    title: 'State Compliance Control Mapping 2026',
    filename: 'compliance-controls-2026.xlsx',
    mediaType: 'application/vnd.openxmlformats',
    byteSize: 812_000,
    status: 'ready',
    owner: 'Compliance Sentinel',
    updatedAt: '2026-06-29T19:00:00Z',
    tags: ['compliance'],
  },
  {
    grn: 'grn://org_harbor/document/d3',
    id: 'd3',
    title: 'Claim Intake SOP v4',
    filename: 'claim-intake-sop-v4.docx',
    mediaType: 'application/vnd.openxmlformats',
    byteSize: 145_000,
    status: 'processing',
    owner: 'Claims Assistant',
    updatedAt: '2026-06-30T03:00:00Z',
    tags: ['sop', 'claims'],
  },
];

// ---- Memory ----------------------------------------------------------------
export const memories: MemoryEntry[] = [
  {
    id: 'mem1',
    label: 'Policy renewal cycle is annual on Jan 1',
    content: 'Harbor Mutual renews standard homeowner policies annually on January 1.',
    layer: 'organizational',
    category: 'Operations',
    source: 'Underwriting workspace',
    confidence: 98,
  },
  {
    id: 'mem2',
    label: 'Adjuster SLA is 24 hours for first contact',
    content: 'All new claims must have adjuster first-contact within 24 hours.',
    layer: 'procedural',
    category: 'Claims',
    source: 'Claim Intake SOP v4',
    confidence: 95,
  },
  {
    id: 'mem3',
    label: 'Flood zone AE requires manual review',
    content: 'Applications in FEMA flood zone AE cannot be auto-approved.',
    layer: 'semantic',
    category: 'Underwriting',
    source: 'Compliance Sentinel',
    confidence: 100,
  },
];

// ---- Resources -------------------------------------------------------------
export const resources: Resource[] = [
  {
    grn: 'grn://org_harbor/integration/salesforce',
    resourceType: 'integration',
    state: 'active',
    attributes: { name: 'Salesforce', kind: 'CRM', detail: '2.4M records synced', connected: true },
  },
  {
    grn: 'grn://org_harbor/integration/guidewire',
    resourceType: 'integration',
    state: 'active',
    attributes: { name: 'Guidewire', kind: 'Policy Admin', detail: '38 tables indexed', connected: true },
  },
  {
    grn: 'grn://org_harbor/integration/docusign',
    resourceType: 'integration',
    state: 'active',
    attributes: { name: 'DocuSign', kind: 'e-Signature', detail: '1,920 envelopes', connected: true },
  },
  {
    grn: 'grn://org_harbor/integration/slack',
    resourceType: 'integration',
    state: 'active',
    attributes: { name: 'Slack', kind: 'Messaging', detail: 'Connect workspace', connected: false },
  },
];

// ---- Events ----------------------------------------------------------------
export const events: GabrielEvent[] = [
  {
    id: 'e1',
    type: 'agent.execution.completed',
    principalId: 'principal://org_harbor/user/alice',
    organizationId: 'org_harbor',
    resourceGrn: 'grn://org_harbor/agent/claims-assistant',
    occurredAt: '2026-06-30T02:10:00Z',
    correlationId: 'corr-abc',
    payload: { state: 'completed', durationMs: 4200 },
    metadata: {},
  },
  {
    id: 'e2',
    type: 'document.ingested',
    principalId: 'principal://org_harbor/user/marco',
    organizationId: 'org_harbor',
    resourceGrn: 'grn://org_harbor/document/d3',
    occurredAt: '2026-06-30T03:00:00Z',
    payload: { filename: 'claim-intake-sop-v4.docx' },
    metadata: {},
  },
  {
    id: 'e3',
    type: 'resource.created',
    principalId: 'principal://org_harbor/user/alice',
    organizationId: 'org_harbor',
    resourceGrn: 'grn://org_harbor/agent/policy-explainer',
    occurredAt: '2026-06-29T18:30:00Z',
    payload: {},
    metadata: {},
  },
];

// ---- Notifications ---------------------------------------------------------
export const notifications: Notification[] = [
  {
    id: 'n1',
    level: 'info',
    title: 'Claim assigned to you',
    body: 'Water damage claim — 428 Elm St was routed to M. Reyes.',
    createdAt: '2026-06-30T02:11:00Z',
    read: false,
    href: '/chat/c_1',
  },
  {
    id: 'n2',
    level: 'warning',
    title: 'Underwriting review needed',
    body: '90 Harbor Blvd flagged 3 risk factors.',
    createdAt: '2026-06-29T16:46:00Z',
    read: false,
    href: '/chat/c_2',
  },
  {
    id: 'n3',
    level: 'success',
    title: 'Document ready',
    body: 'HO-3 Master Form finished processing.',
    createdAt: '2026-06-30T00:11:00Z',
    read: true,
    href: '/documents',
  },
];
