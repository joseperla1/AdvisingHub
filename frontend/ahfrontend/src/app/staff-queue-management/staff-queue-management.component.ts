import { Component, OnDestroy, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServicesManagementComponent } from '../services-management/services-management.component';
import { NotificationStore } from '../notification-store.service';

type QueueStatus = 'Active' | 'Paused';
type ServiceState = 'Waiting' | 'Being Served' | 'Completed' | 'No Show';

interface QueueItem {
  name: string;
  studentId: string;
  priority: 'normal' | 'high';
  reason: string;
  joinedAgo: string;
  notes?: string;
  estWaitMin: number;
  state: ServiceState;
}
type AppointmentStatus = 'Scheduled' | 'Checked In' | 'In Service' | 'Completed' | 'Canceled';

interface Appointment {
  id: string;
  studentName: string;
  studentId: string;
  service: string;
  startTime: string;   // "2:30 PM" (mock display)
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

  // Notification Center bindings
  toastList = this.notices.toasts;
  notificationHistory = this.notices.history;

  dismissToast(id: string) {
    this.notices.dismissToast(id);
  }

  clearNotifications() {
    this.notices.clearHistory();
    this.notices.push('info', 'Notifications cleared', 'Notification Center history was cleared.');
  }
    // Drawer open/close
  isNotifOpen = signal<boolean>(false);

  // Unread badge count
  unreadCount = computed(() => this.notificationHistory().length);

  toggleNotifications() {
    this.isNotifOpen.update(v => !v);
  }

  closeNotifications() {
    this.isNotifOpen.set(false);
  }



  // Tabs
  activeTab = signal<'queue' | 'services' | 'appointments'>('queue');

  // Queue controls
  queueStatus = signal<QueueStatus>('Active');

  // Live clock
  now = signal(new Date());
  private timerId?: number;

  // Mock queue
  items = signal<QueueItem[]>([
    {
      name: 'Ethan Trac Huynh',
      studentId: 'STU001',
      priority: 'normal',
      reason: 'Transcript Request',
      joinedAgo: 'Joined 15 min ago',
      notes: 'Notes: Needs urgent processing for job application',
      estWaitMin: 25,
      state: 'Being Served',
    },
    {
      name: 'Rayan Abraham Josan',
      studentId: 'STU002',
      priority: 'normal',
      reason: 'Add/Drop',
      joinedAgo: 'Joined 6 min ago',
      estWaitMin: 18,
      state: 'Waiting',
    },
    {
      name: 'Edwin Montoya Garcia',
      studentId: 'STU003',
      priority: 'high',
      reason: 'Graduation Check',
      joinedAgo: 'Joined 3 min ago',
      estWaitMin: 10,
      state: 'Waiting',
    },
  ]);
    appointments = signal<Appointment[]>([
    {
      id: 'APT-1001',
      studentName: 'Rayan Abraham Josan',
      studentId: 'STU002',
      service: 'Add/Drop',
      startTime: '2:30 PM',
      advisor: 'Advisor Perla',
      status: 'Checked In',
      notes: 'Needs help dropping course before deadline.',
    },
    {
      id: 'APT-1002',
      studentName: 'Edwin Montoya Garcia',
      studentId: 'STU003',
      service: 'Graduation Check',
      startTime: '2:45 PM',
      advisor: 'Advisor Perla',
      status: 'Checked In',
    },
    {
      id: 'APT-1003',
      studentName: 'Jose Perla',
      studentId: 'STU099',
      service: 'Enrollment Verification',
      startTime: '3:15 PM',
      advisor: 'Advisor Montoya',
      status: 'Scheduled',
    },
  ]);
  appointmentsView = computed(() => {
    const q = this.queueList();
    return this.appointments().map(a => {
      const idx = q.findIndex(x => x.studentId === a.studentId);
      const position = idx >= 0 ? idx + 1 : null;
      return { ...a, queuePosition: position };
    });
  });

  // Metrics
  waitingCount = computed(() => this.items().filter(x => x.state === 'Waiting').length);
  beingServedCount = computed(() => this.items().filter(x => x.state === 'Being Served').length);
  completedTodayCount = computed(() => this.items().filter(x => x.state === 'Completed').length);

  // Auth (mock)
  isLoggedIn = signal<boolean>(true);
  currentUser = signal<string>('Advisor Perla');

  login() {
    this.isLoggedIn.set(true);
    this.currentUser.set('Advisor Perla');
    this.notices.push('success', 'Logged in', 'You are now signed in as Advisor Perla.');
  }

  logout() {
    this.isLoggedIn.set(false);
    this.currentUser.set('');
    this.notices.push('info', 'Logged out', 'You have been signed out.');
  }

  

  // Current item (serving first)
  current = computed(() => {
    const serving = this.items().find(x => x.state === 'Being Served');
    if (serving) return serving;
    return this.items().find(x => x.state === 'Waiting') ?? null;
  });

  // List to render everyone in queue
  queueList = computed(() => {
    const priorityRank = (p: 'normal' | 'high') => (p === 'high' ? 0 : 1);
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

  ngOnInit(): void {
    this.timerId = window.setInterval(() => this.now.set(new Date()), 1000);
  }

  ngOnDestroy(): void {
    if (this.timerId) window.clearInterval(this.timerId);
  }

  setTab(tab: 'queue' | 'services' | 'appointments') {
    this.activeTab.set(tab);

    // Queue update notification
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

  serveNext() {
    if (this.queueStatus() === 'Paused') {
      this.notices.push('warning', 'Queue is paused', 'Resume the queue to serve the next student.');
      return;
    }

    const list = [...this.items()];
    if (list.some(x => x.state === 'Being Served')) {
      this.notices.push('info', 'Already serving', 'Complete or mark no-show before serving the next student.');
      return;
    }

    const nextIdx = list.findIndex(x => x.state === 'Waiting');
    if (nextIdx < 0) {
      this.notices.push('info', 'Queue empty', 'No students are waiting.');
      return;
    }

    const nextStudent = list[nextIdx];
    list[nextIdx] = { ...nextStudent, state: 'Being Served' };
    this.items.set(list);

    this.notices.push('success', 'Now serving', `${nextStudent.name} (${nextStudent.studentId})`);
  }

  // Per-row actions for queue list
  completeById(studentId: string) {
    const s = this.items().find(x => x.studentId === studentId);
    this.items.update(list =>
      list.map(x => (x.studentId === studentId ? { ...x, state: 'Completed', estWaitMin: 0 } : x))
    );

    this.notices.push('success', 'Status changed', `${s?.name ?? studentId} marked as Completed.`);
  }

  noShowById(studentId: string) {
    const s = this.items().find(x => x.studentId === studentId);
    this.items.update(list =>
      list.map(x => (x.studentId === studentId ? { ...x, state: 'No Show', estWaitMin: 0 } : x))
    );

    this.notices.push('warning', 'Status changed', `${s?.name ?? studentId} marked as No Show.`);
  }

  manageById(studentId: string) {
    const s = this.items().find(x => x.studentId === studentId);
    this.notices.push('info', 'Manage opened', `Managing ticket for ${s?.name ?? studentId}.`);
    alert(`Manage clicked for ${s?.name ?? studentId}`);
  }

  //
  completeCurrent() {
    const cur = this.current();
    if (!cur) return;
    this.completeById(cur.studentId);
  }

  noShowCurrent() {
    const cur = this.current();
    if (!cur) return;
    this.noShowById(cur.studentId);
  }

  manageCurrent() {
    const cur = this.current();
    if (!cur) return;
    this.manageById(cur.studentId);
  }

  formattedTime() {
    const d = this.now();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}