import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserNavComponent } from './user-nav/user-nav.component';
import { LoginService } from '../../login/login.service';
import {
  HistoryApiService,
  QueueHistoryEntry,
} from '../../services/history-api.service';

type Outcome = 'served' | 'left' | 'canceled' | 'no_show' | 'unknown';
type Status = 'waiting' | 'almost_ready' | 'ready' | 'served' | 'left' | 'canceled' | 'unknown';

interface HistoryItemVM {
  id: string;
  serviceName: string;
  status: Status;
  outcome: Outcome;
  position: number | null;
  estWaitMin: number | null;
  joinedAtIso: string | null;
  leftAtIso: string | null;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, UserNavComponent],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css'],
})
export class HistoryComponent implements OnInit {
  items: HistoryItemVM[] = [];
  loadError: string | null = null;

  constructor(
    private login: LoginService,
    private historyApi: HistoryApiService
  ) {}

  ngOnInit(): void {
    this.refresh();
  }

  hasItems(): boolean {
    return this.items.length > 0;
  }

  refresh(): void {
    const uid = this.login.getUserId();
    if (!uid) {
      this.items = [];
      this.loadError = 'Sign in to view your queue history.';
      return;
    }

    this.loadError = null;
    this.historyApi.getHistoryForUser(uid).subscribe({
      next: res => {
        const rows = res.data ?? [];
        this.items = rows.map(e => this.mapEntry(e));
      },
      error: () => {
        this.items = [];
        this.loadError = 'Could not load history from the server.';
      },
    });
  }

  outcomeBadgeThemeClass(outcome: Outcome): string {
    switch (outcome) {
      case 'served':
        return 'success';
      case 'left':
        return 'warn';
      case 'canceled':
      case 'no_show':
        return 'danger';
      default:
        return 'info';
    }
  }

  outcomeLabel(outcome: Outcome): string {
    switch (outcome) {
      case 'served':
        return 'Served';
      case 'left':
        return 'Left';
      case 'canceled':
        return 'Canceled';
      case 'no_show':
        return 'No Show';
      default:
        return 'Activity';
    }
  }

  statusLabel(status: Status): string {
    switch (status) {
      case 'waiting':
        return 'Waiting';
      case 'almost_ready':
        return 'Almost Ready';
      case 'ready':
        return 'Ready';
      case 'served':
        return 'Served';
      case 'left':
        return 'Left';
      case 'canceled':
        return 'Canceled';
      default:
        return 'Unknown';
    }
  }

  formatPosition(pos: number | null): string {
    if (pos == null || pos === 0) return '—';
    return `#${pos}`;
  }

  formatWait(min: number | null): string {
    if (min == null || min === 0) return '—';
    return `${min} min`;
  }

  private mapEntry(e: QueueHistoryEntry): HistoryItemVM {
    const st = (e.status || 'unknown').toLowerCase() as Status;
    return {
      id: e.queueId || e.id,
      serviceName: e.serviceName || 'Service',
      status: st,
      outcome: this.inferOutcome(e),
      position: null,
      estWaitMin: null,
      joinedAtIso: e.timestamp,
      leftAtIso: e.action === 'left' || e.action === 'served' ? e.timestamp : null,
    };
  }

  private inferOutcome(e: QueueHistoryEntry): Outcome {
    const a = (e.action || '').toLowerCase();
    const s = (e.status || '').toLowerCase();
    if (a === 'served' || s === 'served') return 'served';
    if (a === 'left' || s === 'left') return 'left';
    if (s === 'no-show' || s === 'no_show') return 'no_show';
    if (s === 'canceled') return 'canceled';
    if (a === 'joined' || a === 'serving') return 'unknown';
    return 'unknown';
  }
}
