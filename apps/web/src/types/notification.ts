/**
 * Notification domain types (ADR-032).
 *
 * Business services emit events; the Notification Service decides recipients,
 * channels, and delivery. The UI only renders delivered notifications and the
 * user's channel preferences.
 */
import type { ISODateString } from './common';

export type NotificationChannel =
  | 'desktop'
  | 'web'
  | 'email'
  | 'slack'
  | 'teams'
  | 'sms'
  | 'push'
  | 'webhook';

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  level: NotificationLevel;
  title: string;
  body?: string;
  createdAt: ISODateString;
  read: boolean;
  /** Optional deep link into a workspace/resource. */
  href?: string;
}
