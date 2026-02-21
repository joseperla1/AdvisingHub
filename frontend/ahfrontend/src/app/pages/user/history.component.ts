import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

type Outcome = 'served' | 'left' | 'canceled' | 'no_show' | 'unknown';
type Status = 'waiting' | 'almost_ready' | 'ready' | 'served' | 'left' | 'canceled' | 'unknown';

interface RawHistoryItem {
  id?: string;
  serviceName?: string;
  service?: string;
  date?: string;
  joinedAt?: string;
  endedAt?: string;
  status?: string;
  outcome?: string;
  position?: number | string | null;
  estWaitMin?: number | string | null;
  [key: string]: unknown;
}

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
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css'],
})
export class HistoryComponent implements OnInit {

  items: HistoryItemVM[] = [];
  private readonly storageKey = 'ah_ticketHistory';

  ngOnInit(): void {
    this.refresh();
  }

  hasItems(): boolean {
    return this.items.length > 0;
  }

  refresh(): void {
    this.items = this.loadFromLocalStorage();
  }

  clearHistory(): void {
    localStorage.removeItem(this.storageKey);
    this.items = [];
  }

  outcomeBadgeThemeClass(outcome: Outcome): string {
    switch (outcome) {
      case 'served': return 'success';
      case 'left': return 'warn';
      case 'canceled':
      case 'no_show': return 'danger';
      default: return 'info';
    }
  }

  outcomeLabel(outcome: Outcome): string {
    switch (outcome) {
      case 'served': return 'Served';
      case 'left': return 'Left';
      case 'canceled': return 'Canceled';
      case 'no_show': return 'No Show';
      default: return 'Unknown';
    }
  }

  statusLabel(status: Status): string {
    switch (status) {
      case 'waiting': return 'Waiting';
      case 'almost_ready': return 'Almost Ready';
      case 'ready': return 'Ready';
      case 'served': return 'Served';
      case 'left': return 'Left';
      case 'canceled': return 'Canceled';
      default: return 'Unknown';
    }
  }

  formatPosition(pos: number | null): string {
    if (!pos) return '—';
    return `#${pos}`;
  }

  formatWait(min: number | null): string {
    if (!min) return '—';
    return `${min} min`;
  }

  private loadFromLocalStorage(): HistoryItemVM[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: RawHistoryItem, i: number) => ({
      id: item.id ?? `hist_${i + 1}`,
      serviceName: item.serviceName ?? item.service ?? 'Service',
      status: (item.status as Status) ?? 'unknown',
      outcome: (item.outcome as Outcome) ?? 'unknown',
      position: item.position ? Number(item.position) : null,
      estWaitMin: item.estWaitMin ? Number(item.estWaitMin) : null,
      joinedAtIso: item.joinedAt ?? item.date ?? null,
      leftAtIso: item.endedAt ?? null,
    }));
  }
}