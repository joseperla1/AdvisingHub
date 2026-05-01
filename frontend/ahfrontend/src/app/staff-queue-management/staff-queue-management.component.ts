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
import { ChartData, ChartOptions } from 'chart.js';
import { LoginService } from '../login/login.service';
import { ServicesManagementComponent } from '../services-management/services-management.component';
import { ChartCanvasComponent } from '../shared/chart-canvas/chart-canvas.component';
import {
  formatDateMMDDYYYY,
  formatDateTimeMMDDYYYYHHMM,
  formatTimeHHMM,
} from '../shared/date-time-format.util';
import { NotificationStore } from '../notification-store.service';
import {
  AdminQueueApiService,
  AdminQueueItem
} from '../services/admin-queue-api.service';
import {
  AppointmentsApiService,
  AppointmentItem
} from '../services/appointments-api.service';
import {
  AdminAnalyticsApiService,
  AnalyticsFilterOptions,
  AnalyticsOverview,
} from '../services/admin-analytics-api.service';

type QueueStatus = 'Active' | 'Paused';
type ServiceState = 'Waiting' | 'Being Served' | 'Completed' | 'No Show';

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
  servedByAdminUserId?: string | null;
}

interface ReportFilters {
  startDate: string;
  endDate: string;
  allServices: boolean;
  services: string[];
  allStatuses: boolean;
  statuses: string[];
  allEntrySources: boolean;
  entrySources: string[];
  allPriorities: boolean;
  priorities: string[];
  allDaysOfWeek: boolean;
  daysOfWeek: string[];
  studentName: string;
  studentId: string;
  /** Average Wait Time Analysis */
  groupBy: 'service' | 'day';
}

const DEFAULT_REPORT_FILTERS: Omit<ReportFilters, 'startDate' | 'endDate'> = {
  allServices: true,
  services: [],
  allStatuses: true,
  statuses: [],
  allEntrySources: true,
  entrySources: [],
  allPriorities: true,
  priorities: [],
  allDaysOfWeek: true,
  daysOfWeek: [],
  studentName: '',
  studentId: '',
  groupBy: 'service',
};

interface ReportColumnDef {
  key: string;
  label: string;
}

const REPORT_COLUMN_DEFS: Record<string, ReportColumnDef[]> = {
  user_queue_participation: [
    { key: 'student_name', label: 'Student Name' },
    { key: 'student_id', label: 'Student ID' },
    { key: 'service_name', label: 'Service' },
    { key: 'entry_source', label: 'Entry Source' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'joined_at', label: 'Joined At' },
    { key: 'started_serving_at', label: 'Started Serving At' },
    { key: 'completed_at', label: 'Completed At' },
    { key: 'wait_time_min', label: 'Wait Time' },
    { key: 'service_time_min', label: 'Service Time' },
    { key: 'total_time_min', label: 'Total Time' },
    { key: 'advisor_name', label: 'Advisor' },
  ],
  service_queue_activity: [
    { key: 'activity_date', label: 'Activity Date' },
    { key: 'service_name', label: 'Service' },
    { key: 'total_queue_entries', label: 'Total Queue Entries' },
    { key: 'total_served', label: 'Total Served' },
    { key: 'total_canceled', label: 'Total Canceled' },
    { key: 'total_left', label: 'Total Left' },
    { key: 'total_no_show', label: 'Total No-Show' },
    { key: 'average_wait_time_min', label: 'Average Wait Time' },
    { key: 'average_service_time_min', label: 'Average Service Time' },
  ],
  daily_queue_usage: [
    { key: 'queue_date', label: 'Queue Date' },
    { key: 'total_queue_entries', label: 'Total Queue Entries' },
    { key: 'total_served', label: 'Total Served' },
    { key: 'total_waiting', label: 'Total Waiting' },
    { key: 'total_canceled', label: 'Total Canceled' },
    { key: 'total_left', label: 'Total Left' },
    { key: 'total_no_show', label: 'Total No-Show' },
    { key: 'average_wait_time_min', label: 'Average Wait Time' },
    { key: 'average_service_time_min', label: 'Average Service Time' },
    { key: 'average_total_time_min', label: 'Average Total Time' },
  ],
  average_wait_time_analysis_service: [
    { key: 'service_name', label: 'Service' },
    { key: 'total_queue_entries', label: 'Total Queue Entries' },
    { key: 'average_wait_time_min', label: 'Average Wait Time' },
    { key: 'maximum_wait_time_min', label: 'Maximum Wait Time' },
    { key: 'average_service_time_min', label: 'Average Service Time' },
  ],
  average_wait_time_analysis_day: [
    { key: 'queue_date', label: 'Queue Date' },
    { key: 'total_queue_entries', label: 'Total Queue Entries' },
    { key: 'average_wait_time_min', label: 'Average Wait Time' },
    { key: 'maximum_wait_time_min', label: 'Maximum Wait Time' },
  ],
};

@Component({
  selector: 'app-staff-queue-management',
  standalone: true,
  imports: [CommonModule, ServicesManagementComponent, ChartCanvasComponent],
  templateUrl: './staff-queue-management.component.html',
  styleUrls: ['./staff-queue-management.component.scss'],
})
export class StaffQueueManagementComponent implements OnInit, OnDestroy {
  private notices = inject(NotificationStore);
  private queueApi = inject(AdminQueueApiService);
  private appointmentsApi = inject(AppointmentsApiService);
  private analyticsApi = inject(AdminAnalyticsApiService);

  // Drawer open/close
  isNotifOpen = signal<boolean>(false);

  // Tabs
  activeTab = signal<'queue' | 'services' | 'appointments' | 'analytics'>('queue');
  analyticsSubTab = signal<'overview' | 'reports'>('overview');

  // Queue controls
  queueStatus = signal<QueueStatus>('Active');

  // Clock
  now = signal(new Date());
  private timerId?: number;
  private queuePollId?: number;
  private queueNotificationsInitialized = false;
  private previousQueueById = new Map<string, AdminQueueItem>();
  private appointmentNotificationsInitialized = false;
  private previousAppointmentIds = new Set<string>();

  // Queue loading / error state
  isQueueLoading = signal<boolean>(false);
  queueError = signal<string>('');

  // Backend-driven queue data
  items = signal<QueueItem[]>([]);
  completedToday = signal(0);

  // Auth mock
  isLoggedIn = signal<boolean>(true);
  currentUser = signal<string>('Admin Smith');
  private router = inject(Router);
  private loginService = inject(LoginService);

  // Notifications
  toastList = this.notices.toasts;
  notificationHistory = this.notices.history;
  unreadCount = computed(() => this.notificationHistory().length);

  // Admin appointments from backend
  appointments = signal<AppointmentItem[]>([]);
  isAppointmentsLoading = signal<boolean>(false);
  appointmentsError = signal<string>('');

  // Analytics
  analyticsOverview = signal<AnalyticsOverview | null>(null);
  analyticsLoading = signal<boolean>(false);
  analyticsError = signal<string>('');
  analyticsFilters = signal<AnalyticsFilterOptions | null>(null);
  reportRows = signal<Record<string, unknown>[]>([]);
  reportLoading = signal<boolean>(false);
  reportError = signal<string>('');
  selectedReport = signal<string>('user_queue_participation');
  reportSortKey = signal<string>('');
  reportSortDirection = signal<'asc' | 'desc'>('desc');
  reportFilters = signal<ReportFilters>({
    startDate: '',
    endDate: '',
    ...DEFAULT_REPORT_FILTERS,
  });
  overviewRangeType = signal<'day' | 'month' | 'ytd'>('day');
  overviewDate = signal<string>(new Date().toISOString().slice(0, 10));
  overviewMonth = signal<string>(new Date().toISOString().slice(0, 7));
  overviewYear = signal<number>(new Date().getFullYear());

  // Queue metrics
  waitingCount = computed(() => this.items().filter(x => x.state === 'Waiting').length);
  beingServedCount = computed(() => this.items().filter(x => x.state === 'Being Served').length);
  completedTodayCount = computed(() => this.completedToday());

  // Current serving / next waiting
  current = computed(() => {
    const serving = this.items().find(x => x.state === 'Being Served');
    if (serving) return serving;
    return this.items().find(x => x.state === 'Waiting') ?? null;
  });

  // Queue list display
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

  reportColumnDefs = computed<ReportColumnDef[]>(() => {
    const rt = this.selectedReport();
    if (rt === 'average_wait_time_analysis') {
      return this.reportFilters().groupBy === 'day'
        ? REPORT_COLUMN_DEFS['average_wait_time_analysis_day']
        : REPORT_COLUMN_DEFS['average_wait_time_analysis_service'];
    }
    return REPORT_COLUMN_DEFS[rt] ?? [];
  });

  private readonly axisTextColor = '#4b5563';
  private readonly gridColor = '#e5e7eb';

  dailyQueueVolumeChartData = computed<ChartData<'bar'>>(() => {
    const rows = this.analyticsOverview()?.charts.dailyQueueVolumeTrend ?? [];
    return {
      labels: rows.map(r => this.formatChartDate(r['activity_date'])),
      datasets: [
        {
          label: 'Total Queue Entries',
          data: rows.map(r => this.toNumber(r['total_queue_entries'])),
          backgroundColor: 'rgba(37, 99, 235, 0.5)',
          borderColor: '#2563eb',
          borderWidth: 1,
        },
      ],
    };
  });

  avgWaitTrendChartData = computed<ChartData<'line'>>(() => {
    const rows = this.analyticsOverview()?.charts.averageWaitTimeTrend ?? [];
    return {
      labels: rows.map(r => this.formatChartDate(r['activity_date'])),
      datasets: [
        {
          label: 'Avg Wait Time (min)',
          data: rows.map(r => this.toNumber(r['avg_wait_time_min'])),
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124, 58, 237, 0.2)',
          fill: false,
          tension: 0.25,
          pointRadius: 3,
        },
      ],
    };
  });

  mostPopularServicesChartData = computed<ChartData<'bar'>>(() => {
    const rows = this.analyticsOverview()?.charts.mostPopularServices ?? [];
    return {
      labels: rows.map(r => this.toLabel(r['service_name'])),
      datasets: [
        {
          label: 'Total Queue Entries',
          data: rows.map(r => this.toNumber(r['total_queue_entries'])),
          backgroundColor: 'rgba(22, 163, 74, 0.55)',
          borderColor: '#16a34a',
          borderWidth: 1,
        },
      ],
    };
  });

  avgWaitByServiceChartData = computed<ChartData<'bar'>>(() => {
    const rows = this.analyticsOverview()?.charts.mostPopularServices ?? [];
    return {
      labels: rows.map(r => this.toLabel(r['service_name'])),
      datasets: [
        {
          label: 'Avg Wait Time (min)',
          data: rows.map(r => this.toNumber(r['avg_wait_time_min'])),
          backgroundColor: 'rgba(249, 115, 22, 0.55)',
          borderColor: '#f97316',
          borderWidth: 1,
        },
      ],
    };
  });

  advisorWorkloadChartData = computed<ChartData<'bar'>>(() => {
    const rows = this.analyticsOverview()?.charts.advisorWorkload ?? [];
    return {
      labels: rows.map(r => this.toLabel(r['advisor_name'])),
      datasets: [
        {
          label: 'Students Served',
          data: rows.map(r => this.toNumber(r['served_entries'])),
          backgroundColor: 'rgba(14, 165, 233, 0.55)',
          borderColor: '#0891b2',
          borderWidth: 1,
        },
      ],
    };
  });

  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: this.axisTextColor, maxRotation: 45, minRotation: 45 },
        grid: { color: this.gridColor },
      },
      y: {
        ticks: { color: this.axisTextColor },
        grid: { color: this.gridColor },
      },
    },
    plugins: {
      legend: { display: true },
    },
  };

  verticalBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x',
    scales: {
      x: {
        ticks: { color: this.axisTextColor, maxRotation: 45, minRotation: 45 },
        grid: { color: this.gridColor },
      },
      y: {
        ticks: { color: this.axisTextColor },
        grid: { color: this.gridColor },
      },
    },
    plugins: {
      legend: { display: true },
    },
  };

  horizontalBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: {
        ticks: { color: this.axisTextColor },
        grid: { color: this.gridColor },
      },
      y: {
        ticks: { color: this.axisTextColor },
        grid: { color: this.gridColor },
      },
    },
    plugins: {
      legend: { display: true },
    },
  };

  ngOnInit(): void {
    const storedName = localStorage.getItem('userName');
    if (storedName) {
      this.currentUser.set(storedName);
    }
    this.timerId = window.setInterval(() => this.now.set(new Date()), 1000);
    this.loadQueue();
    this.loadAdminAppointments(true);
    this.startQueuePolling();
    this.loadAnalyticsOverview();
    this.loadAnalyticsFilterOptions();
  }

  ngOnDestroy(): void {
    if (this.timerId) window.clearInterval(this.timerId);
    if (this.queuePollId) window.clearInterval(this.queuePollId);
  }

  // =========================
  // Queue backend integration
  // =========================
  loadQueue(silent = false): void {
    if (!silent) {
      this.isQueueLoading.set(true);
      this.queueError.set('');
    }

    this.queueApi.getCurrentQueue().subscribe({
      next: (response) => {
        this.emitQueueActivityNotifications(response.data.queue ?? []);
        const mappedItems = response.data.queue.map(item => this.mapApiQueueItem(item));
        this.items.set(mappedItems);
        this.completedToday.set(response.data.metrics?.completedToday ?? 0);
        if (!silent) this.isQueueLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load queue:', error);
        if (!silent) {
          this.queueError.set('Failed to load queue data from backend.');
          this.isQueueLoading.set(false);
          this.notices.push('warning', 'Queue load failed', 'Could not fetch current queue from backend.');
        }
      }
    });
  }

  private startQueuePolling(): void {
    if (this.queuePollId) window.clearInterval(this.queuePollId);
    this.queuePollId = window.setInterval(() => {
      this.loadQueue(true);
      this.loadAdminAppointments(true);
    }, 30000);
  }

  private emitQueueActivityNotifications(currentQueue: AdminQueueItem[]): void {
    const currentById = new Map(currentQueue.map(item => [item.id, item]));
    const me = this.loginService.getUserId();

    if (!this.queueNotificationsInitialized) {
      this.previousQueueById = currentById;
      this.queueNotificationsInitialized = true;
      return;
    }

    for (const item of currentQueue) {
      if (!this.previousQueueById.has(item.id)) {
        this.notices.push('info', 'Student joined queue', `${item.name} (${item.studentId}) joined the queue.`);
      }
    }

    for (const [id, prev] of this.previousQueueById.entries()) {
      if (currentById.has(id)) continue;

      if (prev.status === 'serving' && prev.servedByAdminUserId && prev.servedByAdminUserId !== me) {
        this.notices.push(
          'success',
          'Service finished by another advisor',
          `${prev.name} (${prev.studentId}) is no longer in active service.`
        );
        continue;
      }

      if (prev.status === 'waiting') {
        this.notices.push('info', 'Student left queue', `${prev.name} (${prev.studentId}) left the queue.`);
      }
    }

    this.previousQueueById = currentById;
  }

  serveNext(): void {
    if (this.queueStatus() === 'Paused') {
      this.notices.push('warning', 'Queue is paused', 'Resume the queue to serve the next student.');
      return;
    }

    const adminUserId = this.loginService.getUserId();
    if (!adminUserId) {
      this.notices.push('warning', 'Missing advisor identity', 'Please log in again.');
      return;
    }

    this.queueApi.serveNext(adminUserId).subscribe({
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
        const message = error?.error?.error || 'Unable to serve next user.';
        this.notices.push('warning', 'Serve next failed', message);
      }
    });
  }

  completeById(queueId: string): void {
    const adminUserId = this.loginService.getUserId();
    if (!adminUserId) {
      this.notices.push('warning', 'Missing advisor identity', 'Please log in again.');
      return;
    }
    this.queueApi.completeServing(queueId, adminUserId).subscribe({
      next: (response) => {
        this.notices.push(
          'success',
          'Status changed',
          `${response.data.name} marked as completed.`
        );
        this.loadQueue();
      },
      error: (error) => {
        const message = error?.error?.error || 'Unable to complete current user.';
        this.notices.push('warning', 'Complete failed', message);
      }
    });
  }

  noShowById(queueId: string): void {
    const adminUserId = this.loginService.getUserId();
    if (!adminUserId) {
      this.notices.push('warning', 'Missing advisor identity', 'Please log in again.');
      return;
    }
    this.queueApi.noShow(queueId, adminUserId).subscribe({
      next: (response) => {
        this.notices.push(
          'warning',
          'Status changed',
          `${response.data.name} marked as No Show.`
        );
        this.loadQueue();
      },
      error: (error) => {
        const message = error?.error?.error || 'Unable to mark user as no-show.';
        this.notices.push('warning', 'No Show failed', message);
      }
    });
  }

  manageById(queueId: string): void {
    const s = this.items().find(x => x.id === queueId);
    this.notices.push('info', 'Manage unavailable', `Manage is temporarily disabled for ${s?.name ?? queueId}.`);
  }

  completeCurrent(): void {
    const cur = this.current();
    if (!cur) return;
    this.completeById(cur.id);
  }

  noShowCurrent(): void {
    const cur = this.current();
    if (!cur) return;
    this.noShowById(cur.id);
  }

  manageCurrent(): void {
    const cur = this.current();
    if (!cur) return;
    this.manageById(cur.id);
  }

  // =========================
  // Admin appointments backend integration
  // =========================
  loadAdminAppointments(silent = false): void {
    if (!silent) {
      this.isAppointmentsLoading.set(true);
      this.appointmentsError.set('');
    }

    this.appointmentsApi.getAdminAppointments().subscribe({
      next: (response) => {
        this.emitAppointmentDropNotifications(response.data ?? []);
        this.appointments.set(response.data);
        if (!silent) this.isAppointmentsLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load admin appointments:', error);
        if (!silent) {
          this.appointmentsError.set('Could not load appointments.');
          this.isAppointmentsLoading.set(false);
          this.notices.push('warning', 'Appointments load failed', 'Could not fetch admin appointments.');
        }
      }
    });
  }

  private emitAppointmentDropNotifications(appointments: AppointmentItem[]): void {
    const currentIds = new Set(appointments.map(a => a.id));
    if (!this.appointmentNotificationsInitialized) {
      this.previousAppointmentIds = currentIds;
      this.appointmentNotificationsInitialized = true;
      return;
    }

    appointments.forEach(a => {
      if (this.previousAppointmentIds.has(a.id)) return;
      this.notices.push(
        'info',
        'New appointment added',
        `${a.studentName} (${a.studentId}) at ${formatDateMMDDYYYY(a.appointmentDate)} ${formatTimeHHMM(a.appointmentTime)}.`
      );
    });

    this.previousAppointmentIds = currentIds;
  }

  refreshAppointments(): void {
    this.loadAdminAppointments();
  }

  // =========================
  // UI actions
  // =========================
  setTab(tab: 'queue' | 'services' | 'appointments' | 'analytics'): void {
    this.activeTab.set(tab);
    this.closeNotifications();

    if (tab === 'queue') {
      this.loadQueue();
    }

    if (tab === 'appointments') {
      this.loadAdminAppointments();
    }

    if (tab === 'analytics') {
      this.analyticsSubTab.set('overview');
      this.loadAnalyticsOverview();
      this.loadAnalyticsFilterOptions();
    }
  }

  setAnalyticsSubTab(tab: 'overview' | 'reports'): void {
    this.analyticsSubTab.set(tab);
    if (tab === 'overview') {
      this.loadAnalyticsOverview();
    }
  }

  setOverviewRangeType(rangeType: 'day' | 'month' | 'ytd'): void {
    this.overviewRangeType.set(rangeType);
    this.loadAnalyticsOverview();
  }

  setOverviewDate(value: string): void {
    this.overviewDate.set(value);
    if (this.overviewRangeType() === 'day') this.loadAnalyticsOverview();
  }

  setOverviewMonth(value: string): void {
    this.overviewMonth.set(value);
    if (this.overviewRangeType() === 'month') this.loadAnalyticsOverview();
  }

  setOverviewYear(value: string): void {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    this.overviewYear.set(n);
    if (this.overviewRangeType() === 'ytd') this.loadAnalyticsOverview();
  }

  overviewHeaderLabel(): string {
    const type = this.overviewRangeType();
    if (type === 'ytd') return `Main Overview: Year to Date ${this.overviewYear()}`;
    if (type === 'month') {
      const [y, m] = this.overviewMonth().split('-').map(Number);
      const d = new Date(y, (m || 1) - 1, 1);
      const monthName = d.toLocaleString('en-US', { month: 'long' });
      return `Main Overview: ${monthName}`;
    }
    return `Main Overview: ${formatDateMMDDYYYY(this.overviewDate())}`;
  }

  toggleQueue(): void {
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

  login(): void {
    this.isLoggedIn.set(true);
    this.currentUser.set('Admin Smith');
    this.notices.push('success', 'Logged in', 'You are now signed in as Admin Smith.');
  }

  logout(): void {
    this.loginService.logout();
    this.isLoggedIn.set(false);
    this.currentUser.set('');
    this.notices.push('info', 'Logged out', 'You have been signed out.');
    void this.router.navigate(['/login']);
  }

  toggleNotifications(): void {
    this.isNotifOpen.update(v => !v);
  }

  closeNotifications(): void {
    this.isNotifOpen.set(false);
  }

  dismissToast(id: string): void {
    this.notices.dismissToast(id);
  }

  clearNotifications(): void {
    this.notices.clearHistory();
    this.notices.push('info', 'Notifications cleared', 'Notification Center history was cleared.');
  }

  formattedTime(): string {
    return formatTimeHHMM(this.now());
  }

  formatDisplayDate(value: string): string {
    return formatDateMMDDYYYY(value);
  }

  formatDisplayTime(value: string): string {
    return formatTimeHHMM(value);
  }

  loadAnalyticsOverview(): void {
    this.analyticsLoading.set(true);
    this.analyticsError.set('');
    this.analyticsApi.getOverview({
      rangeType: this.overviewRangeType(),
      date: this.overviewDate(),
      month: this.overviewMonth(),
      year: this.overviewYear(),
    }).subscribe({
      next: (response) => {
        this.analyticsOverview.set(response.data);
        this.analyticsLoading.set(false);
      },
      error: () => {
        this.analyticsError.set('Could not load analytics overview.');
        this.analyticsLoading.set(false);
      },
    });
  }

  loadAnalyticsFilterOptions(): void {
    this.analyticsApi.getFilterOptions().subscribe({
      next: (response) => this.analyticsFilters.set(response.data),
      error: () => {},
    });
  }

  updateReportFilter<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]): void {
    this.reportFilters.update(prev => ({ ...prev, [key]: value }));
  }

  private setAllAndList(
    allKey: keyof Pick<
      ReportFilters,
      'allServices' | 'allStatuses' | 'allEntrySources' | 'allPriorities' | 'allDaysOfWeek'
    >,
    listKey: keyof Pick<
      ReportFilters,
      'services' | 'statuses' | 'entrySources' | 'priorities' | 'daysOfWeek'
    >,
    checked: boolean
  ): void {
    this.reportFilters.update(prev => ({
      ...prev,
      [allKey]: checked,
      [listKey]: checked ? [] : [...(prev[listKey] as string[])],
    }));
  }

  private toggleListItem(
    allKey: keyof Pick<
      ReportFilters,
      'allServices' | 'allStatuses' | 'allEntrySources' | 'allPriorities' | 'allDaysOfWeek'
    >,
    listKey: keyof Pick<
      ReportFilters,
      'services' | 'statuses' | 'entrySources' | 'priorities' | 'daysOfWeek'
    >,
    item: string,
    checked: boolean
  ): void {
    this.reportFilters.update(prev => {
      if (prev[allKey] === true) return prev;
      const cur = [...(prev[listKey] as string[])];
      const i = cur.indexOf(item);
      if (checked && i < 0) cur.push(item);
      if (!checked && i >= 0) cur.splice(i, 1);
      return { ...prev, [listKey]: cur };
    });
  }

  setReportServiceAll(checked: boolean): void {
    this.setAllAndList('allServices', 'services', checked);
  }

  toggleReportService(name: string, checked: boolean): void {
    this.toggleListItem('allServices', 'services', name, checked);
  }

  setReportStatusAll(checked: boolean): void {
    this.setAllAndList('allStatuses', 'statuses', checked);
  }

  toggleReportStatus(value: string, checked: boolean): void {
    this.toggleListItem('allStatuses', 'statuses', value, checked);
  }

  setReportEntrySourceAll(checked: boolean): void {
    this.setAllAndList('allEntrySources', 'entrySources', checked);
  }

  toggleReportEntrySource(value: string, checked: boolean): void {
    this.toggleListItem('allEntrySources', 'entrySources', value, checked);
  }

  setReportPriorityAll(checked: boolean): void {
    this.setAllAndList('allPriorities', 'priorities', checked);
  }

  toggleReportPriority(value: string, checked: boolean): void {
    this.toggleListItem('allPriorities', 'priorities', value, checked);
  }

  setReportDayOfWeekAll(checked: boolean): void {
    this.setAllAndList('allDaysOfWeek', 'daysOfWeek', checked);
  }

  toggleReportDayOfWeek(value: string, checked: boolean): void {
    this.toggleListItem('allDaysOfWeek', 'daysOfWeek', value, checked);
  }

  onReportTypeChange(value: string): void {
    this.selectedReport.set(value);
    this.reportRows.set([]);
    this.reportError.set('');
    this.reportSortKey.set('');
    this.reportSortDirection.set('desc');
    const prev = this.reportFilters();
    this.reportFilters.set({
      startDate: prev.startDate,
      endDate: prev.endDate,
      ...DEFAULT_REPORT_FILTERS,
    });
  }

  toggleReportSort(columnKey: string): void {
    if (!columnKey) return;
    if (this.reportSortKey() === columnKey) {
      this.reportSortDirection.set(this.reportSortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.reportSortKey.set(columnKey);
      this.reportSortDirection.set('asc');
    }
    this.runReport();
  }

  reportSortIndicator(columnKey: string): string {
    if (this.reportSortKey() !== columnKey) return '';
    return this.reportSortDirection() === 'asc' ? ' ▲' : ' ▼';
  }

  runReport(): void {
    this.reportLoading.set(true);
    this.reportError.set('');
    this.reportRows.set([]);
    const sortBy = this.reportSortKey()
      ? `${this.reportSortKey()} ${this.reportSortDirection()}`
      : undefined;
    const payload = sortBy
      ? { ...this.reportFilters(), sortBy }
      : this.reportFilters();

    this.analyticsApi.generateReport(this.selectedReport(), payload).subscribe({
      next: (response) => {
        this.reportRows.set(response.data ?? []);
        this.reportLoading.set(false);
      },
      error: () => {
        this.reportError.set('Could not generate report.');
        this.reportLoading.set(false);
      },
    });
  }

  toNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  toLabel(value: unknown): string {
    return String(value ?? '');
  }

  formatNoticeTime(value: unknown): string {
    return formatTimeHHMM(value);
  }

  formatChartDate(value: unknown): string {
    return formatDateMMDDYYYY(value);
  }

  formatReportValue(value: unknown): string {
    if (value == null) return '—';
    if (typeof value === 'number') return String(value);
    if (value instanceof Date) return formatDateTimeMMDDYYYYHHMM(value);
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDateMMDDYYYY(value);
      if (/^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value)) return formatTimeHHMM(value);
      if (value.includes('T') || value.includes(' ')) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return formatDateTimeMMDDYYYYHHMM(parsed);
      }
    }
    return String(value);
  }

  csvDownload(): void {
    const rows = this.reportRows();
    if (rows.length === 0) return;
    const defs = this.reportColumnDefs();
    const escape = (v: unknown) => {
      const s = this.formatReportValue(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const csv = [
      defs.map(d => escape(d.label)).join(','),
      ...rows.map(r => defs.map(d => escape(r[d.key])).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${this.selectedReport()}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // =========================
  // Appointment helpers for HTML
  // =========================
  appointmentBadgeClass(status: string): string {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Checked In':
        return 'warn';
      case 'In Service':
        return 'info';
      case 'Canceled':
        return 'danger';
      default:
        return 'info';
    }
  }

  isAssignedToCurrentAdmin(item: QueueItem): boolean {
    const me = this.loginService.getUserId();
    return !!me && !!item.servedByAdminUserId && item.servedByAdminUserId === me;
  }

  isAssignedToAnotherAdmin(item: QueueItem): boolean {
    const me = this.loginService.getUserId();
    return !!item.servedByAdminUserId && (!me || item.servedByAdminUserId !== me);
  }

  // =========================
  // Mapping helpers
  // =========================
  private mapApiQueueItem(item: AdminQueueItem): QueueItem {
    return {
      id: item.id,
      userId: item.userId,
      name: item.name,
      studentId: item.studentId,
      priority: item.priority,
      reason: item.serviceName,
      joinedAgo: this.formatJoinedAgo(item.joinedAt),
      estWaitMin: item.estimatedWaitMin ?? this.calculateEstimatedWait(item, item.joinedAt),
      state: this.mapApiStatusToUiState(item.status),
      notes: undefined,
      servedByAdminUserId: item.servedByAdminUserId ?? null,
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
      case 'left':
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

    // simple frontend placeholder until wait-time backend logic is integrated
    return Math.max(5, 20 - diffMin);
  }
}


// import {Component,OnDestroy,OnInit,computed,signal,inject} from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { ServicesManagementComponent } from '../services-management/services-management.component';
// import { NotificationStore } from '../notification-store.service';
// import {AdminQueueApiService,AdminQueueItem} from '../services/admin-queue-api.service';
// import{AppointmentApiService} from '../services/appointments-api.service';


// type QueueStatus = 'Active' | 'Paused';
// type ServiceState = 'Waiting' | 'Being Served' | 'Completed' | 'No Show';
// type AppointmentStatus = 'Scheduled' | 'Checked In' | 'In Service' | 'Completed' | 'Canceled';

// interface QueueItem {
//   id: string;
//   userId: string;
//   name: string;
//   studentId: string;
//   priority: 'normal' | 'high' | 'medium' | 'low';
//   reason: string;
//   joinedAgo: string;
//   notes?: string;
//   estWaitMin: number;
//   state: ServiceState;
// }

// interface Appointment {
//   id: string;
//   studentName: string;
//   studentId: string;
//   service: string;
//   startTime: string;
//   advisor: string;
//   status: AppointmentStatus;
//   notes?: string;
// }

// @Component({
//   selector: 'app-staff-queue-management',
//   standalone: true,
//   imports: [CommonModule, ServicesManagementComponent],
//   templateUrl: './staff-queue-management.component.html',
//   styleUrls: ['./staff-queue-management.component.scss'],
// })
// export class StaffQueueManagementComponent implements OnInit, OnDestroy {
//   private notices = inject(NotificationStore);
//   private queueApi = inject(AdminQueueApiService);

//   // Drawer open/close
//   isNotifOpen = signal<boolean>(false);

//   // Tabs
//   activeTab = signal<'queue' | 'services' | 'appointments'>('queue');

//   // Queue controls
//   queueStatus = signal<QueueStatus>('Active');

//   // Clock
//   now = signal(new Date());
//   private timerId?: number;

//   // Loading / error state
//   isQueueLoading = signal<boolean>(false);
//   queueError = signal<string>('');

//   // Backend-driven queue data
//   items = signal<QueueItem[]>([]);

//   // Auth mock
//   isLoggedIn = signal<boolean>(true);
//   currentUser = signal<string>('Advisor Smith');

//   // Notifications
//   toastList = this.notices.toasts;
//   notificationHistory = this.notices.history;
//   unreadCount = computed(() => this.notificationHistory().length);

//   // Mock appointments
//   appointments = signal<Appointment[]>([
//     {
//       id: 'APT-1001',
//       studentName: 'Ariana M.',
//       studentId: 'STU002',
//       service: 'Add/Drop',
//       startTime: '2:30 PM',
//       advisor: 'Advisor Smith',
//       status: 'Checked In',
//       notes: 'Needs help dropping course before deadline.',
//     },
//     {
//       id: 'APT-1002',
//       studentName: 'Jordan S.',
//       studentId: 'STU003',
//       service: 'Graduation Check',
//       startTime: '2:45 PM',
//       advisor: 'Advisor Smith',
//       status: 'Scheduled',
//     },
//     {
//       id: 'APT-1003',
//       studentName: 'Maya L.',
//       studentId: 'STU099',
//       service: 'Enrollment Verification',
//       startTime: '3:15 PM',
//       advisor: 'Advisor Lee',
//       status: 'Scheduled',
//     },
//   ]);

//   waitingCount = computed(() => this.items().filter(x => x.state === 'Waiting').length);
//   beingServedCount = computed(() => this.items().filter(x => x.state === 'Being Served').length);
//   completedTodayCount = computed(() => this.items().filter(x => x.state === 'Completed').length);

//   current = computed(() => {
//     const serving = this.items().find(x => x.state === 'Being Served');
//     if (serving) return serving;
//     return this.items().find(x => x.state === 'Waiting') ?? null;
//   });

//   queueList = computed(() => {
//     const priorityRank = (p: 'normal' | 'high' | 'medium' | 'low') =>
//       p === 'high' ? 0 :
//       p === 'medium' ? 1 :
//       p === 'normal' ? 2 : 3;

//     const stateRank = (s: ServiceState) =>
//       s === 'Being Served' ? 0 :
//       s === 'Waiting' ? 1 :
//       s === 'Completed' ? 2 : 3;

//     return [...this.items()]
//       .filter(x => x.state === 'Being Served' || x.state === 'Waiting')
//       .sort((a, b) => {
//         const sr = stateRank(a.state) - stateRank(b.state);
//         if (sr !== 0) return sr;
//         const pr = priorityRank(a.priority) - priorityRank(b.priority);
//         if (pr !== 0) return pr;
//         return a.estWaitMin - b.estWaitMin;
//       });
//   });

//   appointmentsView = computed(() => {
//     const q = this.queueList();
//     return this.appointments().map(a => {
//       const idx = q.findIndex(x => x.studentId === a.studentId);
//       const position = idx >= 0 ? idx + 1 : null;
//       return { ...a, queuePosition: position };
//     });
//   });

//   ngOnInit(): void {
//     this.timerId = window.setInterval(() => this.now.set(new Date()), 1000);
//     this.loadQueue();
//   }

//   ngOnDestroy(): void {
//     if (this.timerId) window.clearInterval(this.timerId);
//   }

//   // Backend integration
//   loadQueue() {
//     this.isQueueLoading.set(true);
//     this.queueError.set('');

//     this.queueApi.getCurrentQueue().subscribe({
//       next: (response) => {
//         const mappedItems = response.data.map(item => this.mapApiQueueItem(item));
//         this.items.set(mappedItems);
//         this.isQueueLoading.set(false);
//       },
//       error: (error) => {
//         console.error('Failed to load queue:', error);
//         this.queueError.set('Failed to load queue data from backend.');
//         this.isQueueLoading.set(false);
//         this.notices.push('warning', 'Queue load failed', 'Could not fetch current queue from backend.');
//       }
//     });
//   }

//   serveNext() {
//     if (this.queueStatus() === 'Paused') {
//       this.notices.push('warning', 'Queue is paused', 'Resume the queue to serve the next student.');
//       return;
//     }

//     this.queueApi.serveNext().subscribe({
//       next: (response) => {
//         const servedUser = response.data;
//         this.notices.push(
//           'success',
//           'Now serving',
//           `${servedUser.name} (${servedUser.studentId})`
//         );
//         this.loadQueue();
//       },
//       error: (error) => {
//         const message =
//           error?.error?.error ||
//           'Unable to serve next user.';
//         this.notices.push('warning', 'Serve next failed', message);
//       }
//     });
//   }

//   completeById(queueId: string) {
//     this.queueApi.completeServing(queueId).subscribe({
//       next: (response) => {
//         this.notices.push(
//           'success',
//           'Status changed',
//           `${response.data.name} marked as completed.`
//         );
//         this.loadQueue();
//       },
//       error: (error) => {
//         const message =
//           error?.error?.error ||
//           'Unable to complete current user.';
//         this.notices.push('warning', 'Complete failed', message);
//       }
//     });
//   }

//   // Local UI actions

//   noShowById(queueId: string) {
//     this.queueApi.noShow(queueId).subscribe({
//       next: (response) => {
//         this.notices.push(
//           'warning',
//           'Status changed',
//           `${response.data.name} marked as No Show.`
//         );
//         this.loadQueue();
//       },
//       error: (error) => {
//         const message =
//           error?.error?.error ||
//           'Unable to mark user as no-show.';
//         this.notices.push('warning', 'No Show failed', message);
//       }
//     });
//   }

//   manageById(queueId: string) {
//     const s = this.items().find(x => x.id === queueId);
//     this.notices.push('info', 'Manage opened', `Managing ticket for ${s?.name ?? queueId}.`);
//     alert(`Manage clicked for ${s?.name ?? queueId}`);
//   }

//   completeCurrent() {
//     const cur = this.current();
//     if (!cur) return;
//     this.completeById(cur.id);
//   }

//   noShowCurrent() {
//     const cur = this.current();
//     if (!cur) return;
//     this.noShowById(cur.id);
//   }

//   manageCurrent() {
//     const cur = this.current();
//     if (!cur) return;
//     this.manageById(cur.id);
//   }

//   setTab(tab: 'queue' | 'services' | 'appointments') {
//     this.activeTab.set(tab);
//     this.closeNotifications();

//     if (tab === 'queue') this.notices.push('info', 'View changed', 'Opened Queue Management.');
//     if (tab === 'services') this.notices.push('info', 'View changed', 'Opened Services Management.');
//     if (tab === 'appointments') this.notices.push('info', 'View changed', 'Opened Appointments.');
//   }

//   toggleQueue() {
//     const next = this.queueStatus() === 'Active' ? 'Paused' : 'Active';
//     this.queueStatus.set(next);

//     this.notices.push(
//       next === 'Paused' ? 'warning' : 'success',
//       `Queue ${next}`,
//       next === 'Paused'
//         ? 'New students cannot be served until resumed.'
//         : 'Queue is ready to serve.'
//     );
//   }

//   login() {
//     this.isLoggedIn.set(true);
//     this.currentUser.set('Advisor Smith');
//     this.notices.push('success', 'Logged in', 'You are now signed in as Advisor Smith.');
//   }

//   logout() {
//     this.isLoggedIn.set(false);
//     this.currentUser.set('');
//     this.notices.push('info', 'Logged out', 'You have been signed out.');
//   }

//   toggleNotifications() {
//     this.isNotifOpen.update(v => !v);
//   }

//   closeNotifications() {
//     this.isNotifOpen.set(false);
//   }

//   dismissToast(id: string) {
//     this.notices.dismissToast(id);
//   }

//   clearNotifications() {
//     this.notices.clearHistory();
//     this.notices.push('info', 'Notifications cleared', 'Notification Center history was cleared.');
//   }

//   formattedTime() {
//     const d = this.now();
//     return d.toLocaleTimeString([], {
//       hour: '2-digit',
//       minute: '2-digit',
//       second: '2-digit'
//     });
//   }

//   // Mapping helpers

//   private mapApiQueueItem(item: AdminQueueItem): QueueItem {
//     return {
//       id: item.id,
//       userId: item.userId,
//       name: item.name,
//       studentId: item.studentId,
//       priority: item.priority,
//       reason: item.serviceName,
//       joinedAgo: this.formatJoinedAgo(item.joinedAt),
//       estWaitMin: this.calculateEstimatedWait(item, item.joinedAt),
//       state: this.mapApiStatusToUiState(item.status),
//       notes: undefined
//     };
//   }

//   private mapApiStatusToUiState(status: string): ServiceState {
//     switch (status) {
//       case 'waiting':
//         return 'Waiting';
//       case 'serving':
//         return 'Being Served';
//       case 'served':
//         return 'Completed';
//       case 'no-show':
//         return 'No Show';
//       default:
//         return 'Waiting';
//     }
//   }

//   private formatJoinedAgo(joinedAt: string): string {
//     const joinedMs = new Date(joinedAt).getTime();
//     const nowMs = Date.now();
//     const diffMin = Math.max(0, Math.floor((nowMs - joinedMs) / 60000));
//     return `Joined ${diffMin} min ago`;
//   }

//   private calculateEstimatedWait(item: AdminQueueItem, joinedAt: string): number {
//     if (item.status === 'serving' || item.status === 'served') return 0;

//     const joinedMs = new Date(joinedAt).getTime();
//     const nowMs = Date.now();
//     const diffMin = Math.max(0, Math.floor((nowMs - joinedMs) / 60000));

//     return Math.max(5, 20 - diffMin);
//   }
// }
