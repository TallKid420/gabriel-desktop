export type WorkflowStatus =
  | 'active'
  | 'running'
  | 'idle'
  | 'scheduled'
  | 'paused'
  | 'draft';

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  steps: number;
  status: WorkflowStatus;
  runsToday: number;
}
