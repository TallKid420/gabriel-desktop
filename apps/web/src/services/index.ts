/**
 * Services barrel. Feature code imports domain services from here; it never
 * touches `gateway-client` or `realtime` transports directly. Each service is
 * namespaced to keep call sites readable (e.g. `chat.sendMessage`).
 */
export * as auth from './auth';
export * as chat from './chat';
export * as agents from './agents';
export * as documents from './documents';
export * as memory from './memory';
export * as resources from './resources';
export * as events from './events';
export * as notifications from './notifications';
export * as knowledge from './knowledge';
export * as tools from './tools';
export * as organizations from './organizations';
export * as dashboard from './dashboard';
export * as search from './search';

export { GatewayError, GATEWAY_URL, API_URL, USE_MOCK, setUnauthorizedHandler } from './gateway-client';
export type { DashboardSnapshot, DashboardStat } from './dashboard';
