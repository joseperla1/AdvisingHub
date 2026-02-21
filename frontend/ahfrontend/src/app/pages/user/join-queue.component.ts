import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

type QueueStatus = 'waiting' | 'almost_ready' | 'served' | 'left';

interface ServiceItem {
  id: string;
  name: string;
  avgWaitMins: number;
}

interface ActiveTicket {
  ticketId: string;
  serviceId: string;
  serviceName: string;
  notes?: string;
  status: QueueStatus;
  position: number;
  estimatedWaitMins: number;
  createdAtISO: string;
  updatedAtISO: string;
}

interface TicketHistoryRow {
  ticketId: string;
  serviceName: string;
  status: QueueStatus;
  dateISO: string;
}

const LS_ACTIVE_TICKET = 'ah_activeTicket';
const LS_HISTORY = 'ah_ticketHistory';

@Component({
  selector: 'app-join-queue',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './join-queue.component.html',
  styleUrls: ['./join-queue.component.css'],
})
export class JoinQueueComponent implements OnInit {
  services: ServiceItem[] = [
    { id: 'gen', name: 'General Advising', avgWaitMins: 25 },
    { id: 'cs', name: 'Computer Science Advising', avgWaitMins: 35 },
    { id: 'fin', name: 'Financial Aid Support', avgWaitMins: 20 },
    { id: 'reg', name: 'Registration Help', avgWaitMins: 15 },
  ];

  activeTicket = signal<ActiveTicket | null>(null);
  submitting = signal(false);
  submitError = signal<string | null>(null);

  // ✅ FIX: do NOT initialize with this.fb here
  form: FormGroup;

  constructor(private fb: FormBuilder, private router: Router) {
    // ✅ FIX: initialize in constructor
    this.form = this.fb.group({
      serviceId: ['', Validators.required],
      notes: ['', [Validators.maxLength(300)]],
    });
  }

  ngOnInit(): void {
    this.activeTicket.set(this.readActiveTicket());
  }

  get f() {
    return this.form.controls as any;
  }

  get selectedService(): ServiceItem | undefined {
    const id = this.form.value['serviceId'] || '';
    return this.services.find(s => s.id === id);
  }

  get hasActiveTicket(): boolean {
    return !!this.activeTicket();
  }

  joinQueue(): void {
    this.submitError.set(null);

    if (this.hasActiveTicket) {
      this.submitError.set('You already have an active ticket. Please view Queue Status or leave the queue first.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const service = this.selectedService;
    if (!service) {
      this.submitError.set('Please select a service.');
      return;
    }

    this.submitting.set(true);

    try {
      const now = new Date();
      const notesRaw = (this.form.value['notes'] || '').trim();

      const ticket: ActiveTicket = {
        ticketId: this.generateTicketId(),
        serviceId: service.id,
        serviceName: service.name,
        notes: notesRaw || undefined,
        status: 'waiting',
        position: this.randomPosition(),
        estimatedWaitMins: this.randomWait(service.avgWaitMins),
        createdAtISO: now.toISOString(),
        updatedAtISO: now.toISOString(),
      };

      localStorage.setItem(LS_ACTIVE_TICKET, JSON.stringify(ticket));

      this.appendHistory({
        ticketId: ticket.ticketId,
        serviceName: ticket.serviceName,
        status: ticket.status,
        dateISO: ticket.createdAtISO,
      });

      this.activeTicket.set(ticket);
      this.form.reset({ serviceId: '', notes: '' });

      this.router.navigateByUrl('/user/queue-status');
    } catch {
      this.submitError.set('Something went wrong. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  private readActiveTicket(): ActiveTicket | null {
    try {
      const raw = localStorage.getItem(LS_ACTIVE_TICKET);
      return raw ? (JSON.parse(raw) as ActiveTicket) : null;
    } catch {
      return null;
    }
  }

  private appendHistory(row: TicketHistoryRow): void {
    const history = this.readHistory();
    history.unshift(row);
    localStorage.setItem(LS_HISTORY, JSON.stringify(history.slice(0, 50)));
  }

  private readHistory(): TicketHistoryRow[] {
    try {
      const raw = localStorage.getItem(LS_HISTORY);
      return raw ? (JSON.parse(raw) as TicketHistoryRow[]) : [];
    } catch {
      return [];
    }
  }

  private generateTicketId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = 'AH-';
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  private randomPosition(): number {
    return Math.floor(Math.random() * 18) + 2;
  }

  private randomWait(base: number): number {
    const jitter = Math.floor(Math.random() * 11) - 5;
    return Math.max(5, base + jitter);
  }
}