import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserNavComponent } from './user-nav/user-nav.component';
import {
  LS_ACTIVE_TICKET,
  leaveQueueAndRecordHistory,
  readStoredActiveTicket,
} from './queue-local-storage';

type TicketStatus = 'waiting' | 'almost_ready' | 'ready' | 'served' | 'canceled';

interface ActiveTicket {
  id: string;
  serviceName: string;
  status: TicketStatus;
  position?: number;
  estWaitMin?: number;
  joinedAtIso: string;
}

@Component({
  selector: 'app-queue-status',
  standalone: true,
  imports: [CommonModule, RouterLink, UserNavComponent],
  templateUrl: './queue-status.component.html',
  styleUrls: ['./queue-status.component.css'],
})
export class QueueStatusComponent {
  constructor(private router: Router) {}

  ticket(): ActiveTicket | null {
    return this.mapStoredToActive();
  }

  badgeClass(): string {
    const status = this.mapStoredToActive()?.status ?? 'waiting';

    switch (status) {
      case 'ready':
        return 'ah-badge ah-badge--success';
      case 'almost_ready':
        return 'ah-badge ah-badge--warning';
      case 'served':
        return 'ah-badge ah-badge--neutral';
      case 'canceled':
        return 'ah-badge ah-badge--danger';
      case 'waiting':
      default:
        return 'ah-badge ah-badge--info';
    }
  }

  statusLabel(): string {
    const status = this.mapStoredToActive()?.status ?? 'waiting';

    switch (status) {
      case 'ready':
        return 'Ready';
      case 'almost_ready':
        return 'Almost Ready';
      case 'served':
        return 'Served';
      case 'canceled':
        return 'Canceled';
      case 'waiting':
      default:
        return 'Waiting in Queue';
    }
  }

  positionDisplay(): string {
    const pos = this.mapStoredToActive()?.position;
    if (pos === undefined || pos === null || Number.isNaN(Number(pos))) return '—';
    return `#${pos}`;
  }

  waitDisplay(): string {
    const min = this.mapStoredToActive()?.estWaitMin;
    if (min === undefined || min === null || Number.isNaN(Number(min))) return '—';
    if (min <= 0) return 'Now';
    return `${min} min`;
  }

  leaveQueue(): void {
    leaveQueueAndRecordHistory('left');
    void this.router.navigate(['/user/join']);
  }

  seedDemoTicket(): void {
    const now = new Date().toISOString();
    const demo = {
      ticketId: 'AH-DEMO1',
      serviceId: 'demo',
      serviceName: 'Graduation Check',
      status: 'waiting',
      position: 3,
      estimatedWaitMins: 30,
      createdAtISO: now,
      updatedAtISO: now,
    };
    localStorage.setItem(LS_ACTIVE_TICKET, JSON.stringify(demo));
  }

  private mapStoredToActive(): ActiveTicket | null {
    const s = readStoredActiveTicket();
    if (!s) return null;
    return {
      id: s.ticketId,
      serviceName: s.serviceName,
      status: (s.status as TicketStatus) || 'waiting',
      position: s.position,
      estWaitMin: s.estimatedWaitMins,
      joinedAtIso: s.createdAtISO,
    };
  }
}
