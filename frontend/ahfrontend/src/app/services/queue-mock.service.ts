import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  ActiveTicket,
  QueueHistoryItem,
  QueueState,
  ServiceItem,
} from '../models/queue.models';

@Injectable({
  providedIn: 'root',
})
export class QueueMockService {
  private activeTicket: ActiveTicket | null = {
    ticketId: 'QS-1234',
    serviceId: 'general',
    serviceName: 'General Advising',
    position: 3,
    estimatedWaitMinutes: 30,
    state: 'WAITING',
    joinedAt: new Date().toISOString(),
  };

  private history: QueueHistoryItem[] = [
    {
      id: 'h1',
      serviceName: 'Registration Help',
      date: new Date().toISOString(),
      outcome: 'SERVED',
    },
    {
      id: 'h2',
      serviceName: 'General Advising',
      date: new Date(Date.now() - 86400000).toISOString(),
      outcome: 'CANCELLED',
    },
  ];

  getActiveTicket(): Observable<ActiveTicket | null> {
    return of(this.activeTicket);
  }

  getHistory(): Observable<QueueHistoryItem[]> {
    return of(this.history);
  }

  // ✅ Used by dashboard
  leaveQueue(): void {
    this.activeTicket = null;
  }

  // ✅ Added: used by dashboard UI helper
  statusLabel(state: ActiveTicket['state'] | QueueState): string {
    switch (state) {
      case 'WAITING':
        return 'Waiting in Queue';
      case 'ALMOST_READY':
        return 'Almost Ready';
      case 'SERVED':
        return 'Served';
      case 'NOT_IN_QUEUE':
        return 'Not in Queue';
      default:
        return String(state);
    }
  }
}
