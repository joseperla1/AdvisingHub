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
    return {
      id: e.id,
      serviceName: e.serviceName || 'Service',
      status: 'unknown',
      outcome: 'unknown',
      position: null,
      estWaitMin: null,
      joinedAtIso: e.joinedAt,
      leftAtIso: e.leftAt,
    };
  }

  // Outcome/status no longer shown in history (UI keeps these for older template compatibility).
}
