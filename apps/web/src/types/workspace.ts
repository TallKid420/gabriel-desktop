/**
 * Workspace model (ADR-035).
 *
 * Gabriel is organized around Workspaces, not disconnected pages. The left
 * navigation switches the active Workspace. Each Workspace owns persistent
 * context, tabs, shared search, and embedded AI interactions.
 */

export type WorkspaceId =
  | 'home'
  | 'chat'
  | 'agents'
  | 'tools'
  | 'documents'
  | 'notifications'
  | 'memory'
  | 'resources'
  | 'workflows'
  | 'administration'
  | 'settings';

/** Priority tiers from the MVP directive (§9). Drives what ships first. */
export type WorkspacePriority = 'p0' | 'p1' | 'p2' | 'core';

export interface WorkspaceDescriptor {
  id: WorkspaceId;
  label: string;
  /** lucide-react icon name resolved in the nav config. */
  icon: string;
  /** Route segment under /(app). */
  href: string;
  shortcut?: string;
  badge?: string;
  priority: WorkspacePriority;
  /** Hidden from nav until implemented (e.g. workflows in MVP). */
  enabled: boolean;
}
