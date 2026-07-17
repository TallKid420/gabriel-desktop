/**
 * Tools service — CRUD against gabriel-core's `/api/v1/tools` endpoints.
 *
 * Tools are Universal Resources (ADR-009 / ADR-016). The list endpoint
 * supports server-side filtering by category, enabled state, and execution
 * runtime; enable/disable is a PATCH on the `enabled` field.
 */
import type {
  ExecutionRuntime,
  Tool,
  ToolCategory,
  DeleteResult,
} from '@/types';
import type { Paginated, ToolCreateDto, ToolDto, ToolUpdateDto } from '@/types/api';
import { gatewayRequest } from './gateway-client';

const CATEGORIES: readonly string[] = [
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

function mapCategory(value: string): ToolCategory {
  return (CATEGORIES.includes(value) ? value : 'custom') as ToolCategory;
}

function mapRuntime(value: string): ExecutionRuntime {
  return (
    ['local', 'enterprise', 'cloud', 'edge'].includes(value) ? value : 'local'
  ) as ExecutionRuntime;
}

function mapTool(dto: ToolDto): Tool {
  return {
    grn: dto.grn,
    id: dto.grn,
    name: dto.name,
    description: dto.description || undefined,
    category: mapCategory(dto.category),
    inputSchema: dto.input_schema ?? {},
    outputSchema: dto.output_schema ?? {},
    safetyLevel: dto.safety_level ?? 0,
    requiredCapabilities: dto.required_capabilities ?? [],
    runtimeBinding: dto.runtime_binding || undefined,
    executionRuntime: mapRuntime(dto.execution_runtime),
    enabled: dto.enabled,
    configuration: dto.configuration ?? {},
    state: dto.state,
    version: dto.version,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    createdBy: dto.created_by,
    metadata: dto.metadata,
    labels: dto.labels,
  };
}

export interface ListToolsOptions {
  category?: ToolCategory;
  enabled?: boolean;
  executionRuntime?: ExecutionRuntime;
}

export interface CreateToolInput {
  name: string;
  description?: string;
  category: ToolCategory;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  safetyLevel?: number;
  requiredCapabilities?: string[];
  runtimeBinding?: string;
  executionRuntime?: ExecutionRuntime;
  enabled?: boolean;
  configuration?: Record<string, unknown>;
}

export interface UpdateToolInput {
  name?: string;
  description?: string;
  category?: ToolCategory;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  safetyLevel?: number;
  requiredCapabilities?: string[];
  runtimeBinding?: string;
  executionRuntime?: ExecutionRuntime;
  enabled?: boolean;
  configuration?: Record<string, unknown>;
}

function toUpdateWire(input: UpdateToolInput): ToolUpdateDto {
  const wire: ToolUpdateDto = {};
  if (input.name !== undefined) wire.name = input.name;
  if (input.description !== undefined) wire.description = input.description;
  if (input.category !== undefined) wire.category = input.category;
  if (input.inputSchema !== undefined) wire.input_schema = input.inputSchema;
  if (input.outputSchema !== undefined) wire.output_schema = input.outputSchema;
  if (input.safetyLevel !== undefined) wire.safety_level = input.safetyLevel;
  if (input.requiredCapabilities !== undefined)
    wire.required_capabilities = input.requiredCapabilities;
  if (input.runtimeBinding !== undefined)
    wire.runtime_binding = input.runtimeBinding;
  if (input.executionRuntime !== undefined)
    wire.execution_runtime = input.executionRuntime;
  if (input.enabled !== undefined) wire.enabled = input.enabled;
  if (input.configuration !== undefined) wire.configuration = input.configuration;
  return wire;
}

export async function listTools(options: ListToolsOptions = {}): Promise<Tool[]> {
  const page = await gatewayRequest<Paginated<ToolDto>>('/tools', {
    params: {
      category: options.category,
      enabled: options.enabled,
      execution_runtime: options.executionRuntime,
    },
  });
  return page.items.map(mapTool);
}

export async function getTool(grn: string): Promise<Tool | null> {
  try {
    const dto = await gatewayRequest<ToolDto>(`/tools/${encodeURIComponent(grn)}`);
    return mapTool(dto);
  } catch {
    return null;
  }
}

export async function createTool(input: CreateToolInput): Promise<Tool> {
  const body: ToolCreateDto = {
    name: input.name,
    description: input.description ?? '',
    category: input.category,
    input_schema: input.inputSchema ?? {},
    output_schema: input.outputSchema ?? {},
    safety_level: input.safetyLevel ?? 0,
    required_capabilities: input.requiredCapabilities ?? [],
    runtime_binding: input.runtimeBinding ?? '',
    execution_runtime: input.executionRuntime ?? 'local',
    enabled: input.enabled ?? true,
    configuration: input.configuration ?? {},
  };
  const dto = await gatewayRequest<ToolDto>('/tools', { method: 'POST', body });
  return mapTool(dto);
}

export async function updateTool(
  grn: string,
  input: UpdateToolInput,
): Promise<Tool> {
  const dto = await gatewayRequest<ToolDto>(`/tools/${encodeURIComponent(grn)}`, {
    method: 'PATCH',
    body: toUpdateWire(input),
  });
  return mapTool(dto);
}

/** Toggle the org-level `enabled` flag (deny-wins across all agents). */
export async function setToolEnabled(
  grn: string,
  enabled: boolean,
): Promise<Tool> {
  return updateTool(grn, { enabled });
}

export async function deleteTool(grn: string): Promise<DeleteResult> {
  await gatewayRequest<unknown>(`/tools/${encodeURIComponent(grn)}`, {
    method: 'DELETE',
  });
  return { deleted: true, id: grn, grn };
}
