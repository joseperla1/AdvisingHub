import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

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
  imports: [CommonModule, RouterLink],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css'],
})
export class UserDashboardComponent implements OnInit {
  activeTicket: ActiveTicket | null = null;
  services: ServiceItem[] = [];
  notifications: UserNotification[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.activeTicket =
      this.safeParse<ActiveTicket | null>('activeTicket', null) ??
      this.safeParse<ActiveTicket | null>('ah_activeTicket_simple', null) ??
      null;

    this.services =
      this.safeParse<ServiceItem[]>('services', []) ??
      this.safeParse<ServiceItem[]>('ah_services_simple', []) ??
      [];

    this.notifications =
      this.safeParse<UserNotification[]>('notifications', []) ??
      this.safeParse<UserNotification[]>('ah_notifications_simple', []) ??
      [];

    if (!this.activeTicket) {
      this.activeTicket = {
        serviceName: 'General Advising',
        ticketId: 'QS-1234',
        status: 'Waiting',
        position: 3,
        estimatedWait: 30,
      };
    }

    if (!this.services.length) {
      this.services = [
        { id: 'svc1', name: 'General Advising', description: 'Course planning, registration help, holds.', avgMinutes: 20 },
        { id: 'svc2', name: 'Graduation Check', description: 'Degree audit + graduation readiness.', avgMinutes: 30 },
        { id: 'svc3', name: 'Major Change', description: 'Requirements + eligibility discussion.', avgMinutes: 25 },
      ];
    }

    if (!this.notifications.length) {
      this.notifications = [
        { type: 'NEW', message: 'New service added: Academic Standing Support.', time: this.nowTime() },
        { type: 'ALERT', message: 'High demand today—estimated wait times may increase.', time: this.nowTime() },
        { type: 'INFO', message: 'Bring your degree plan for Graduation Check.', time: this.nowTime() },
      ];
    }
  }

  get notificationsTop5(): UserNotification[] {
    return (this.notifications || []).slice(0, 5);
  }

  goToJoin(service: ServiceItem): void {
    localStorage.setItem('selectedService', JSON.stringify(service));
    localStorage.setItem('ah_selectedService', JSON.stringify(service));
    this.router.navigateByUrl('/user/join');
  }

  markAllRead(): void {
    this.notifications = this.notifications.map(n => ({ ...n, type: n.type === 'NEW' ? 'INFO' : n.type }));
    localStorage.setItem('notifications', JSON.stringify(this.notifications));
  }

  leaveQueue(): void {
    this.activeTicket = null;
    localStorage.removeItem('activeTicket');
    localStorage.removeItem('ah_activeTicket_simple');
    this.notifications.unshift({ type: 'INFO', message: 'You left the queue.', time: this.nowTime() });
    localStorage.setItem('notifications', JSON.stringify(this.notifications));
  }

  /* ===== NEW QUICK LINKS METHODS ===== */
  messageAdmin(): void {
    alert('This would open a chat or email to the admin.');
  }

  viewServiceInfo(serviceName: string): void {
    alert(`This would show info for the service: ${serviceName}`);
  }

  copyTicketId(): void {
    if (this.activeTicket) navigator.clipboard.writeText(this.activeTicket.ticketId);
    alert('Ticket ID copied to clipboard!');
  }

  dismissNotification(notification: UserNotification): void {
    this.notifications = this.notifications.filter(n => n !== notification);
    localStorage.setItem('notifications', JSON.stringify(this.notifications));
  }

  badgeClassForStatus(status: string): string {
    switch (status) {
      case 'Served': return 'success';
      case 'Almost Ready': return 'warn';
      case 'Waiting': return 'info';
      case 'Left': return 'danger';
      default: return 'info';
    }
  }

  badgeClassForNotif(type?: string): string {
    switch (type) {
      case 'ALERT': return 'danger';
      case 'NEW': return 'info';
      case 'INFO': return 'success';
      default: return 'info';
    }
  }

  private safeParse<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private nowTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}