/**
 * Session store — holds the active Session view (ADR-007) for synchronous
 * access across the shell (topbar avatar, org switcher, guards). The source of
 * truth is the Gateway's session endpoint; this is a hydrated client cache,
 * kept deliberately free of tokens or permissions.
 */
'use client';

import { create } from 'zustand';
import type { Session } from '@/types';

interface SessionState {
  session: Session | null;
  hydrated: boolean;
  setSession: (session: Session | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  hydrated: false,
  setSession: (session) => set({ session, hydrated: true }),
  clear: () => set({ session: null, hydrated: true }),
}));
