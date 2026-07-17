/**
 * Tool domain types.
 *
 * Tools are Universal Resources (ADR-009 / ADR-016): org-scoped, GRN-addressed,
 * versioned. The `executionRuntime` field is a V1 declaration only
 * (local/enterprise/cloud/edge) — no routing engine consumes it yet. The chat
 * runtime honours the `enabled` flag when resolving which tools an agent may
 * use (deny-wins, per gabriel-core's ChatRuntimeService).
 */
import type { GRN, ISODateString } from './common';

/** Broad category a tool belongs to (mirrors gabriel-core's ToolCategory). */
export type ToolCategory =
  | 'math'
  | 'text'
  | 'time'
  | 'random'
  | 'utility'
  | 'file'
  | 'email'
  | 'calendar'
  | 'search'
  | 'system'
  | 'custom';

export const TOOL_CATEGORIES: ToolCategory[] = [
  'math',
  'text',
  'time',
  'random',
  'utility',
  'file',
  'email',
  'calendar',
  'search',
  'system',
  'custom',
];

/** Where a tool declares it executes (V1: declaration only, no routing). */
export type ExecutionRuntime = 'local' | 'enterprise' | 'cloud' | 'edge';

export const EXECUTION_RUNTIMES: ExecutionRuntime[] = [
  'local',
  'enterprise',
  'cloud',
  'edge',
];

/** Safety levels 0–3 (mirrors gabriel-core's SafetyLevel enum). */
export type SafetyLevel = 0 | 1 | 2 | 3;

export interface Tool {
  grn: GRN;
  id: string;
  name: string;
  description?: string;
  category: ToolCategory;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  safetyLevel: number;
  requiredCapabilities: string[];
  runtimeBinding?: string;
  executionRuntime: ExecutionRuntime;
  /** Org-level activation. Disabled tools are subtracted from every agent. */
  enabled: boolean;
  /** Tool-specific settings (JSON), e.g. endpoints or API key references. */
  configuration: Record<string, unknown>;
  state: string;
  version: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
  labels?: Record<string, string>;
}
