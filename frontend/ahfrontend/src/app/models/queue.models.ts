// src/app/models/queue.models.ts

// ✅ Value export (forces this file to be a real module at runtime too)
export const QUEUE_MODELS_VERSION = '1.0.0';

export type QueueState = 'WAITING' | 'ALMOST_READY' | 'SERVED' | 'NOT_IN_QUEUE';

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  avgMinutes: number;
  isActive: boolean;
}

export interface ActiveTicket {
  ticketId: string;
  serviceId: string;
  serviceName: string;
  position: number;
  estimatedWaitMinutes: number;
  state: Exclude<QueueState, 'NOT_IN_QUEUE'>;
  joinedAt: string;
}

export interface QueueHistoryItem {
  id: string;
  serviceName: string;
  date: string;
  outcome: 'SERVED' | 'CANCELLED' | 'NO_SHOW';
}

export interface UserNotification {
  id: string;
  type: 'INFO' | 'ALERT';
  message: string;
  createdAt: string;
  read: boolean;
}
