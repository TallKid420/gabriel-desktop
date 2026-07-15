/**
 * Workspace navigation config (ADR-035).
 *
 * A single source of truth mapping each Workspace to its route, icon, and MVP
 * priority. The sidebar, breadcrumbs, and command palette all render from this
 * list — add or reorder a workspace here and every surface updates. Workspaces
 * not yet implemented (e.g. Workflows) are marked `enabled: false` and hidden
 * from nav until their milestone lands.
 */
import {
  Home,
  MessagesSquare,
  Bot,
  FileText,
  Bell,
  Brain,
  Boxes,
  Workflow,
  Building2,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { WorkspaceDescriptor, WorkspaceId } from '@/types';

/** Resolve a WorkspaceDescriptor.icon name to a lucide component. */
export const ICONS: Record<string, LucideIcon> = {
  home: Home,
  chat: MessagesSquare,
  agents: Bot,
  documents: FileText,
  notifications: Bell,
  memory: Brain,
  resources: Boxes,
  workflows: Workflow,
  administration: Building2,
  settings: Settings,
};

export const WORKSPACES: WorkspaceDescriptor[] = [
  { id: 'home', label: 'Home', icon: 'home', href: '/', priority: 'core', enabled: true },
  { id: 'chat', label: 'Conversations', icon: 'chat', href: '/chat', shortcut: 'g c', priority: 'p0', enabled: true },
  { id: 'agents', label: 'Agents', icon: 'agents', href: '/agents', shortcut: 'g a', priority: 'p0', enabled: true },
  { id: 'documents', label: 'Documents', icon: 'documents', href: '/documents', shortcut: 'g d', priority: 'p0', enabled: true },
  { id: 'notifications', label: 'Notifications', icon: 'notifications', href: '/notifications', shortcut: 'g n', priority: 'p1', enabled: true },
  { id: 'memory', label: 'Memory', icon: 'memory', href: '/memory', priority: 'p1', enabled: true },
  { id: 'resources', label: 'Resources', icon: 'resources', href: '/resources', priority: 'p1', enabled: true },
  { id: 'workflows', label: 'Workflows', icon: 'workflows', href: '/workflows', priority: 'p2', enabled: false, badge: 'Soon' },
  { id: 'administration', label: 'Administration', icon: 'administration', href: '/administration', priority: 'p2', enabled: false, badge: 'Soon' },
  { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings', priority: 'core', enabled: true },
];

/** Workspaces shown in the left nav (enabled only). */
export const NAV_WORKSPACES = WORKSPACES.filter((w) => w.enabled);

export function getWorkspaceByHref(pathname: string): WorkspaceDescriptor {
  // Longest-prefix match so /chat/c_1 resolves to the chat workspace.
  const match = [...WORKSPACES]
    .filter((w) => w.href !== '/' && pathname.startsWith(w.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match ?? WORKSPACES[0];
}

export function getWorkspace(id: WorkspaceId): WorkspaceDescriptor | undefined {
  return WORKSPACES.find((w) => w.id === id);
}
