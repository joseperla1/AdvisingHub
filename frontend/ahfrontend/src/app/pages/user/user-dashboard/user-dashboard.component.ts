import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { UserNavComponent } from '../user-nav/user-nav.component';
import { LoginService } from '../../../login/login.service';
import { ServiceCatalogApiService } from '../../../services/service-catalog-api.service';
import { UserQueueApiService } from '../../../services/user-queue-api.service';
import { NotificationsApiService } from '../../../services/notifications-api.service';

type TicketStatus = 'Waiting' | 'Almost Ready' | 'Served' | 'Left';

interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  avgMinutes?: number;
}

interface UserNotification {
  type?: 'INFO' | 'ALERT' | 'NEW';
  message: string;
  time?: string;
}

interface ActiveTicket {
  serviceName: string;
  ticketId: string;
  status: TicketStatus;
  position: number;
  estimatedWait: number;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, UserNavComponent],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css'],
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  activeTicket: ActiveTicket | null = null;
  services: ServiceItem[] = [];
  servicesLoadError: string | null = null;
  queueLoadError: string | null = null;
  leavingQueue = false;
  notifications: UserNotification[] = [];
  private navSub?: Subscription;

  constructor(
    private router: Router,
    private login: LoginService,
    private catalogApi: ServiceCatalogApiService,
    private queueApi: UserQueueApiService,
    private notificationsApi: NotificationsApiService
  ) {}

  ngOnInit(): void {
    this.loadServicesFromApi();
    this.refreshActiveFromApi();
    this.refreshNotificationsFromApi();

    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.router.url.split('?')[0] === '/user/dashboard') {
          this.loadServicesFromApi();
          this.refreshActiveFromApi();
          this.refreshNotificationsFromApi();
        }
      });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  private loadServicesFromApi(): void {
    this.servicesLoadError = null;
    this.catalogApi.getServices().subscribe({
      next: res => {
        const list = res.data ?? [];
        this.services = list.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          avgMinutes: s.expectedDurationMin,
        }));
      },
      error: () => {
        this.services = [];
        this.servicesLoadError = 'Could not load services from the server.';
      },
    });
  }

  private refreshActiveFromApi(): void {
    const uid = this.login.getUserId();
    if (!uid) {
      this.activeTicket = null;
      this.queueLoadError = null;
      return;
    }

    this.queueLoadError = null;
    this.queueApi.getActive(uid).subscribe({
      next: res => {
        const d = res.data;
        if (!d?.queueItem) {
          this.activeTicket = null;
          return;
        }
        const q = d.queueItem;
        this.activeTicket = {
          serviceName: q.serviceName,
          ticketId: q.id,
          status: this.mapApiStatusToDisplay(q.status),
          position: d.position,
          estimatedWait: d.estimatedWaitMin,
        };
      },
      error: () => {
        this.activeTicket = null;
        this.queueLoadError = 'Could not load your queue status.';
      },
    });
  }

  get notificationsTop5(): UserNotification[] {
    return (this.notifications || []).slice(0, 5);
  }

  goToJoin(service: ServiceItem): void {
    localStorage.setItem('selectedService', JSON.stringify(service));
    localStorage.setItem('ah_selectedService', JSON.stringify(service));
    this.router.navigateByUrl('/user/join');
  }

  goToAppointment(service: ServiceItem): void {
    localStorage.setItem('selectedAppointmentService', JSON.stringify(service));
    this.router.navigateByUrl('/user/appointments');
  }

  markAllRead(): void {
    // Server-backed notifications; no local "read" state in current API.
  }

  leaveQueue(): void {
    const qid = this.activeTicket?.ticketId;
    if (!qid || this.leavingQueue) return;

    this.leavingQueue = true;
    this.queueApi.leaveQueue(qid).subscribe({
      next: () => {
        this.leavingQueue = false;
        this.refreshActiveFromApi();
        this.refreshNotificationsFromApi();
      },
      error: () => {
        this.leavingQueue = false;
        // keep current list; backend will reflect status events when applicable
      },
    });
  }

  badgeClassForStatus(status: string): string {
    switch (status) {
      case 'Served':
        return 'success';
      case 'Almost Ready':
        return 'warn';
      case 'Waiting':
        return 'info';
      case 'Left':
        return 'danger';
      default:
        return 'info';
    }
  }

  badgeClassForNotif(type?: string): string {
    switch (type) {
      case 'ALERT':
        return 'danger';
      case 'NEW':
        return 'info';
      case 'INFO':
        return 'success';
      default:
        return 'info';
    }
  }

  private mapApiStatusToDisplay(status: string): TicketStatus {
    const key = (status || 'waiting').toLowerCase();
    const map: Record<string, TicketStatus> = {
      waiting: 'Waiting',
      almost_ready: 'Almost Ready',
      ready: 'Almost Ready',
      serving: 'Almost Ready',
      served: 'Served',
      left: 'Left',
      canceled: 'Left',
    };
    return map[key] ?? 'Waiting';
  }

  private nowTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private refreshNotificationsFromApi(): void {
    const uid = this.login.getUserId();
    if (!uid) {
      this.notifications = [];
      return;
    }

    this.notificationsApi.getForUser(uid).subscribe({
      next: res => {
        const rows = res.data ?? [];
        this.notifications = rows.slice(0, 25).map(r => ({
          type: 'INFO',
          message: r.message,
          time: new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
      },
      error: () => {
        this.notifications = [];
      },
    });
  }

  copyTicketId(): void {
    const id = this.activeTicket?.ticketId;
    if (!id) return;
    navigator.clipboard?.writeText(id).catch(() => {});
  }

  dismissNotification(n: UserNotification): void {
    this.notifications = (this.notifications || []).filter(x => x !== n);
  }

  messageAdmin(): void {
    alert('Message sent to admin (mock)');
  }

  viewServiceInfo(serviceName: string): void {
    alert(`Viewing info for ${serviceName || 'service'}`);
  }
}
