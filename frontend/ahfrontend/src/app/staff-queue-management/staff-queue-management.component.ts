import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  signal,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LoginService } from '../login/login.service';
import { ServicesManagementComponent } from '../services-management/services-management.component';
import { NotificationStore } from '../notification-store.service';
import {
  AdminQueueApiService,
  AdminQueueItem
} from '../services/admin-queue-api.service';

type QueueStatus = 'Active' | 'Paused';
type ServiceState = 'Waiting' | 'Being Served' | 'Completed' | 'No Show';
type AppointmentStatus = 'Scheduled' | 'Checked In' | 'In Service' | 'Completed' | 'Canceled';

interface QueueItem {
  id: string;
  userId: string;
  name: string;
  studentId: string;
  priority: 'normal' | 'high' | 'medium' | 'low';
  reason: string;
  joinedAgo: string;
  notes?: string;
  estWaitMin: number;
  state: ServiceState;
}

interface Appointment {
  id: string;
  studentName: string;
  studentId: string;
  service: string;
  startTime: string;
  advisor: string;
  status: AppointmentStatus;
  notes?: string;
}

@Component({
  selector: 'app-staff-queue-management',
  standalone: true,
  imports: [CommonModule, ServicesManagementComponent],
  templateUrl: './staff-queue-management.component.html',
  styleUrls: ['./staff-queue-management.component.scss'],
})
export class StaffQueueManagementComponent implements OnInit, OnDestroy {
  private notices = inject(NotificationStore);
  private queueApi = inject(AdminQueueApiService);

  // Drawer open/close
  isNotifOpen = signal<boolean>(false);

  // Tabs
  activeTab = signal<'queue' | 'services' | 'appointments'>('queue');

  // Queue controls
  queueStatus = signal<QueueStatus>('Active');

  // Clock
  now = signal(new Date());
  private timerId?: number;

  // Loading / error state
  isQueueLoading = signal<boolean>(false);
  queueError = signal<string>('');

  // Backend-driven queue data
  items = signal<QueueItem[]>([]);

  // Auth mock
  isLoggedIn = signal<boolean>(true);
  currentUser = signal<string>('Advisor Smith');
  private router = inject(Router);
  private loginService = inject(LoginService);

  // Notifications
  toastList = this.notices.toasts;
  notificationHistory = this.notices.history;
  unreadCount = computed(() => this.notificationHistory().length);

  // Mock appointments
  appointments = signal<Appointment[]>([
    {
      id: 'APT-1001',
      studentName: 'Ariana M.',
      studentId: 'STU002',
      service: 'Add/Drop',
      startTime: '2:30 PM',
      advisor: 'Advisor Smith',
      status: 'Checked In',
      notes: 'Needs help dropping course before deadline.',
    },
    {
      id: 'APT-1002',
      studentName: 'Jordan S.',
      studentId: 'STU003',
      service: 'Graduation Check',
      startTime: '2:45 PM',
      advisor: 'Advisor Smith',
      status: 'Scheduled',
    },
    {
      id: 'APT-1003',
      studentName: 'Maya L.',
      studentId: 'STU099',
      service: 'Enrollment Verification',
      startTime: '3:15 PM',
      advisor: 'Advisor Lee',
      status: 'Scheduled',
    },
  ]);

  waitingCount = computed(() => this.items().filter(x => x.state === 'Waiting').length);
  beingServedCount = computed(() => this.items().filter(x => x.state === 'Being Served').length);
  completedTodayCount = computed(() => this.items().filter(x => x.state === 'Completed').length);

  current = computed(() => {
    const serving = this.items().find(x => x.state === 'Being Served');
    if (serving) return serving;
    return this.items().find(x => x.state === 'Waiting') ?? null;
  });

  queueList = computed(() => {
    const priorityRank = (p: 'normal' | 'high' | 'medium' | 'low') =>
      p === 'high' ? 0 :
      p === 'medium' ? 1 :
      p === 'normal' ? 2 : 3;

    const stateRank = (s: ServiceState) =>
      s === 'Being Served' ? 0 :
      s === 'Waiting' ? 1 :
      s === 'Completed' ? 2 : 3;

    return [...this.items()]
      .filter(x => x.state === 'Being Served' || x.state === 'Waiting')
      .sort((a, b) => {
        const sr = stateRank(a.state) - stateRank(b.state);
        if (sr !== 0) return sr;
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        return a.estWaitMin - b.estWaitMin;
      });
  });

  appointmentsView = computed(() => {
    const q = this.queueList();
    return this.appointments().map(a => {
      const idx = q.findIndex(x => x.studentId === a.studentId);
      const position = idx >= 0 ? idx + 1 : null;
      return { ...a, queuePosition: position };
    });
  });

  ngOnInit(): void {
    this.timerId = window.setInterval(() => this.now.set(new Date()), 1000);
    this.loadQueue();
  }

  ngOnDestroy(): void {
    if (this.timerId) window.clearInterval(this.timerId);
  }

  // Backend integration
  loadQueue() {
    this.isQueueLoading.set(true);
    this.queueError.set('');

    this.queueApi.getCurrentQueue().subscribe({
      next: (response) => {
        const mappedItems = response.data.map(item => this.mapApiQueueItem(item));
        this.items.set(mappedItems);
        this.isQueueLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load queue:', error);
        this.queueError.set('Failed to load queue data from backend.');
        this.isQueueLoading.set(false);
        this.notices.push('warning', 'Queue load failed', 'Could not fetch current queue from backend.');
      }
    });
  }

  serveNext() {
    if (this.queueStatus() === 'Paused') {
      this.notices.push('warning', 'Queue is paused', 'Resume the queue to serve the next student.');
      return;
    }

    this.queueApi.serveNext().subscribe({
      next: (response) => {
        const servedUser = response.data;
        this.notices.push(
          'success',
          'Now serving',
          `${servedUser.name} (${servedUser.studentId})`
        );
        this.loadQueue();
      },
      error: (error) => {
        const message =
          error?.error?.error ||
          'Unable to serve next user.';
        this.notices.push('warning', 'Serve next failed', message);
      }
    });
  }

  completeById(queueId: string) {
    this.queueApi.completeServing(queueId).subscribe({
      next: (response) => {
        this.notices.push(
          'success',
          'Status changed',
          `${response.data.name} marked as completed.`
        );
        this.loadQueue();
      },
      error: (error) => {
        const message =
          error?.error?.error ||
          'Unable to complete current user.';
        this.notices.push('warning', 'Complete failed', message);
      }
    });
  }

  // Local UI actions

  noShowById(queueId: string) {
    this.queueApi.noShow(queueId).subscribe({
      next: (response) => {
        this.notices.push(
          'warning',
          'Status changed',
          `${response.data.name} marked as No Show.`
        );
        this.loadQueue();
      },
      error: (error) => {
        const message =
          error?.error?.error ||
          'Unable to mark user as no-show.';
        this.notices.push('warning', 'No Show failed', message);
      }
    });
  }

  manageById(queueId: string) {
    const s = this.items().find(x => x.id === queueId);
    this.notices.push('info', 'Manage opened', `Managing ticket for ${s?.name ?? queueId}.`);
    alert(`Manage clicked for ${s?.name ?? queueId}`);
  }

  completeCurrent() {
    const cur = this.current();
    if (!cur) return;
    this.completeById(cur.id);
  }

  noShowCurrent() {
    const cur = this.current();
    if (!cur) return;
    this.noShowById(cur.id);
  }

  manageCurrent() {
    const cur = this.current();
    if (!cur) return;
    this.manageById(cur.id);
  }

  setTab(tab: 'queue' | 'services' | 'appointments') {
    this.activeTab.set(tab);
    this.closeNotifications();

    if (tab === 'queue') this.notices.push('info', 'View changed', 'Opened Queue Management.');
    if (tab === 'services') this.notices.push('info', 'View changed', 'Opened Services Management.');
    if (tab === 'appointments') this.notices.push('info', 'View changed', 'Opened Appointments.');
  }

  toggleQueue() {
    const next = this.queueStatus() === 'Active' ? 'Paused' : 'Active';
    this.queueStatus.set(next);

    this.notices.push(
      next === 'Paused' ? 'warning' : 'success',
      `Queue ${next}`,
      next === 'Paused'
        ? 'New students cannot be served until resumed.'
        : 'Queue is ready to serve.'
    );
  }

  login() {
    this.isLoggedIn.set(true);
    this.currentUser.set('Advisor Smith');
    this.notices.push('success', 'Logged in', 'You are now signed in as Advisor Smith.');
  }

  logout() {
    this.loginService.logout();
    this.isLoggedIn.set(false);
    this.currentUser.set('');
    this.notices.push('info', 'Logged out', 'You have been signed out.');
    this.router.navigate(['/login']);
  }

  toggleNotifications() {
    this.isNotifOpen.update(v => !v);
  }

  closeNotifications() {
    this.isNotifOpen.set(false);
  }

  dismissToast(id: string) {
    this.notices.dismissToast(id);
  }

  clearNotifications() {
    this.notices.clearHistory();
    this.notices.push('info', 'Notifications cleared', 'Notification Center history was cleared.');
  }

  formattedTime() {
    const d = this.now();
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Mapping helpers

  private mapApiQueueItem(item: AdminQueueItem): QueueItem {
    return {
      id: item.id,
      userId: item.userId,
      name: item.name,
      studentId: item.studentId,
      priority: item.priority,
      reason: item.serviceName,
      joinedAgo: this.formatJoinedAgo(item.joinedAt),
      estWaitMin: this.calculateEstimatedWait(item, item.joinedAt),
      state: this.mapApiStatusToUiState(item.status),
      notes: undefined
    };
  }

  private mapApiStatusToUiState(status: string): ServiceState {
    switch (status) {
      case 'waiting':
        return 'Waiting';
      case 'serving':
        return 'Being Served';
      case 'served':
        return 'Completed';
      case 'no-show':
        return 'No Show';
      default:
        return 'Waiting';
    }
  }

  private formatJoinedAgo(joinedAt: string): string {
    const joinedMs = new Date(joinedAt).getTime();
    const nowMs = Date.now();
    const diffMin = Math.max(0, Math.floor((nowMs - joinedMs) / 60000));
    return `Joined ${diffMin} min ago`;
  }

  private calculateEstimatedWait(item: AdminQueueItem, joinedAt: string): number {
    if (item.status === 'serving' || item.status === 'served') return 0;

    const joinedMs = new Date(joinedAt).getTime();
    const nowMs = Date.now();
    const diffMin = Math.max(0, Math.floor((nowMs - joinedMs) / 60000));

    return Math.max(5, 20 - diffMin);
  }
}
