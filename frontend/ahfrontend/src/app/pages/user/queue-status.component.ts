import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

type TicketStatus = 'waiting' | 'almost_ready' | 'ready' | 'served' | 'canceled';

interface ActiveTicket {
  id: string;
  serviceName: string;
  status: TicketStatus;
  position?: number;
  estWaitMin?: number;
  joinedAtIso: string;
}

interface TicketHistoryItem extends ActiveTicket {
  leftAtIso: string;
  outcome: 'left' | 'served' | 'canceled';
}

@Component({
  selector: 'app-queue-status',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './queue-status.component.html',
  styleUrls: ['./queue-status.component.css'],
})
export class QueueStatusComponent {
  private readonly ACTIVE_KEY = 'ah_activeTicket';
  private readonly HISTORY_KEY = 'ah_ticketHistory';

  constructor(private router: Router) {}

  // REQUIRED BY HTML
  ticket(): ActiveTicket | null {
    return this.readActiveTicket();
  }

  badgeClass(): string {
    const status = this.readActiveTicket()?.status ?? 'waiting';

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
    const status = this.readActiveTicket()?.status ?? 'waiting';

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
    const pos = this.readActiveTicket()?.position;
    if (pos === undefined || pos === null || Number.isNaN(Number(pos))) return '—';
    return `#${pos}`;
  }

  waitDisplay(): string {
    const min = this.readActiveTicket()?.estWaitMin;
    if (min === undefined || min === null || Number.isNaN(Number(min))) return '—';
    if (min <= 0) return 'Now';
    return `${min} min`;
  }

  leaveQueue(): void {
    const t = this.readActiveTicket();
    if (!t) return;

    const history = this.readHistory();
    const item: TicketHistoryItem = {
      ...t,
      leftAtIso: new Date().toISOString(),
      outcome: 'left',
    };

    history.unshift(item);
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    localStorage.removeItem(this.ACTIVE_KEY);

    this.router.navigate(['/user/join-queue']);
  }

  seedDemoTicket(): void {
    const demo: ActiveTicket = {
      id: 'QS-7003',
      serviceName: 'Graduation Check',
      status: 'waiting',
      position: 3,
      estWaitMin: 30,
      joinedAtIso: new Date().toISOString(),
    };
    localStorage.setItem(this.ACTIVE_KEY, JSON.stringify(demo));
  }

  // localStorage helpers
  private readActiveTicket(): ActiveTicket | null {
    try {
      const raw = localStorage.getItem(this.ACTIVE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as Partial<ActiveTicket>;
      if (!parsed || typeof parsed !== 'object') return null;

      return {
        id: String(parsed.id ?? 'QS-0000'),
        serviceName: String(parsed.serviceName ?? 'Academic Advising'),
        status: (parsed.status ?? 'waiting') as TicketStatus,
        position:
          typeof parsed.position === 'number'
            ? parsed.position
            : parsed.position !== undefined
              ? Number(parsed.position)
              : undefined,
        estWaitMin:
          typeof parsed.estWaitMin === 'number'
            ? parsed.estWaitMin
            : parsed.estWaitMin !== undefined
              ? Number(parsed.estWaitMin)
              : undefined,
        joinedAtIso: String(parsed.joinedAtIso ?? new Date().toISOString()),
      };
    } catch {
      return null;
    }
  }

  private readHistory(): TicketHistoryItem[] {
    try {
      const raw = localStorage.getItem(this.HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as TicketHistoryItem[]) : [];
    } catch {
      return [];
    }
  }
}