import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserNavComponent } from './user-nav/user-nav.component';
import { LoginService } from '../../login/login.service';
import { UserQueueApiService } from '../../services/user-queue-api.service';

type TicketStatus = 'waiting' | 'almost_ready' | 'ready' | 'served' | 'canceled' | 'serving' | 'left';

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
export class QueueStatusComponent implements OnInit {
  private snapshot = signal<ActiveTicket | null>(null);
  loadError = signal<string | null>(null);
  leaveError = signal<string | null>(null);
  leaving = signal(false);

  constructor(
    private router: Router,
    private login: LoginService,
    private queueApi: UserQueueApiService
  ) {}

  ngOnInit(): void {
    this.refresh();
  }

  ticket(): ActiveTicket | null {
    return this.snapshot();
  }

  badgeClass(): string {
    const status = this.snapshot()?.status ?? 'waiting';

    switch (status) {
      case 'ready':
      case 'serving':
        return 'ah-badge ah-badge--success';
      case 'almost_ready':
        return 'ah-badge ah-badge--warning';
      case 'served':
        return 'ah-badge ah-badge--neutral';
      case 'canceled':
        return 'ah-badge ah-badge--danger';
      case 'waiting':
      case 'left':
      default:
        return 'ah-badge ah-badge--info';
    }
  }

  statusLabel(): string {
    const status = this.snapshot()?.status ?? 'waiting';

    switch (status) {
      case 'ready':
        return 'Ready';
      case 'almost_ready':
        return 'Almost Ready';
      case 'served':
        return 'Served';
      case 'serving':
        return 'Being served';
      case 'canceled':
        return 'Canceled';
      case 'left':
        return 'Left queue';
      case 'waiting':
      default:
        return 'Waiting in Queue';
    }
  }

  positionDisplay(): string {
    const pos = this.snapshot()?.position;
    if (pos === undefined || pos === null || Number.isNaN(Number(pos))) return '—';
    return `#${pos}`;
  }

  waitDisplay(): string {
    const min = this.snapshot()?.estWaitMin;
    if (min === undefined || min === null || Number.isNaN(Number(min))) return '—';
    if (min <= 0) return 'Now';
    return `${min} min`;
  }

  refresh(): void {
    const uid = this.login.getUserId();
    if (!uid) {
      this.snapshot.set(null);
      this.loadError.set('Sign in to view queue status.');
      return;
    }

    this.loadError.set(null);
    this.queueApi.getActive(uid).subscribe({
      next: res => {
        const d = res.data;
        if (!d?.queueItem) {
          this.snapshot.set(null);
          return;
        }
        const q = d.queueItem;
        this.snapshot.set({
          id: q.id,
          serviceName: q.serviceName,
          status: q.status as TicketStatus,
          position: d.position,
          estWaitMin: d.estimatedWaitMin,
          joinedAtIso: q.joinedAt,
        });
      },
      error: () => {
        this.snapshot.set(null);
        this.loadError.set('Could not load queue status from the server.');
      },
    });
  }

  leaveQueue(): void {
    const t = this.snapshot();
    if (!t) return;

    this.leaveError.set(null);
    this.leaving.set(true);

    this.queueApi.leaveQueue(t.id).subscribe({
      next: () => {
        this.leaving.set(false);
        this.snapshot.set(null);
        void this.router.navigate(['/user/join']);
      },
      error: err => {
        this.leaving.set(false);
        this.leaveError.set(err?.error?.error || 'Could not leave the queue.');
      },
    });
  }
}
