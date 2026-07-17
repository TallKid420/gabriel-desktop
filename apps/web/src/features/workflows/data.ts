import type { Workflow } from './types';

export const PIPELINE: string[] = [
  'Trigger',
  'Enrich',
  'Classify',
  'Route',
  'Notify',
  'Log',
];

export const WORKFLOWS: Workflow[] = [
  {
    id: 'invoice-review',
    name: 'Invoice Review',
    trigger: 'On invoice uploaded',
    steps: 6,
    status: 'running',
    runsToday: 48,
  },
  {
    id: 'risk-alert-routing',
    name: 'Risk Alert Routing',
    trigger: 'On high-risk signal',
    steps: 5,
    status: 'scheduled',
    runsToday: 17,
  },
  {
    id: 'sla-escalation',
    name: 'SLA Escalation',
    trigger: 'Every 15 minutes',
    steps: 4,
    status: 'paused',
    runsToday: 9,
  },
  {
    id: 'handoff-summarizer',
    name: 'Handoff Summarizer',
    trigger: 'On ticket closed',
    steps: 3,
    status: 'active',
    runsToday: 31,
  },
];
