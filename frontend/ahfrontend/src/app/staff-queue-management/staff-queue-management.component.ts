import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

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

@Component({
  selector: 'app-staff-queue-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './staff-queue-management.component.html',
  styleUrls: ['./staff-queue-management.component.scss'],
})
export class StaffQueueManagementComponent implements OnInit, OnDestroy {
  // Top toggle
  mode = signal<'Student' | 'Staff'>('Staff');

  // Tabs
  activeTab = signal<'queue' | 'live' | 'appointments'>('queue');

  // Queue controls
  queueStatus = signal<QueueStatus>('Active');

  // Live clock
  now = signal(new Date());
  private timerId?: number;

  // Mock queue (swap with API later)
  items = signal<QueueItem[]>([
    {
      name: 'John Smith',
      studentId: 'STU001',
      priority: 'normal',
      reason: 'Transcript Request',
      joinedAgo: 'Joined 15 min ago',
      notes: 'Notes: Needs urgent processing for job application',
      estWaitMin: 25,
      state: 'Being Served',
    },
    {
      name: 'Ariana M.',
      studentId: 'STU002',
      priority: 'normal',
      reason: 'Add/Drop',
      joinedAgo: 'Joined 6 min ago',
      estWaitMin: 18,
      state: 'Waiting',
    },
    {
      name: 'Jordan S.',
      studentId: 'STU003',
      priority: 'high',
      reason: 'Graduation Check',
      joinedAgo: 'Joined 3 min ago',
      estWaitMin: 10,
      state: 'Waiting',
    },
  ]);

  waitingCount = computed(() => this.items().filter(x => x.state === 'Waiting').length);
  beingServedCount = computed(() => this.items().filter(x => x.state === 'Being Served').length);
  completedTodayCount = computed(() => this.items().filter(x => x.state === 'Completed').length);

  // For the “Current Queue” display, show the one being served first, otherwise first waiting.
  current = computed(() => {
    const serving = this.items().find(x => x.state === 'Being Served');
    if (serving) return serving;
    return this.items().find(x => x.state === 'Waiting') ?? null;
  });

  ngOnInit(): void {
    this.timerId = window.setInterval(() => this.now.set(new Date()), 1000);
  }

  ngOnDestroy(): void {
    if (this.timerId) window.clearInterval(this.timerId);
  }

  setTab(tab: 'queue' | 'live' | 'appointments') {
    this.activeTab.set(tab);
  }

  toggleQueue() {
    this.queueStatus.set(this.queueStatus() === 'Active' ? 'Paused' : 'Active');
  }

  serveNext() {
    if (this.queueStatus() === 'Paused') return;

    const list = [...this.items()];
    // If someone is being served already, do nothing.
    if (list.some(x => x.state === 'Being Served')) return;

    const nextIdx = list.findIndex(x => x.state === 'Waiting');
    if (nextIdx >= 0) list[nextIdx] = { ...list[nextIdx], state: 'Being Served' };
    this.items.set(list);
  }

  completeCurrent() {
    const cur = this.current();
    if (!cur) return;

    this.items.update(list =>
      list.map(x => (x.studentId === cur.studentId ? { ...x, state: 'Completed' } : x))
    );
  }

  noShowCurrent() {
    const cur = this.current();
    if (!cur) return;

    this.items.update(list =>
      list.map(x => (x.studentId === cur.studentId ? { ...x, state: 'No Show' } : x))
    );
  }

  manageCurrent() {
    // Hook this to a modal or route later
    alert('Manage clicked (wire to modal/route)');
  }

  formattedTime() {
    const d = this.now();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
