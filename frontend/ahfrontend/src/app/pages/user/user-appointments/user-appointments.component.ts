import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserNavComponent } from '../user-nav/user-nav.component';
import {
  AppointmentsApiService,
  AppointmentItem,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
} from '../../../services/appointments-api.service';
import {
  ServiceCatalogApiService,
  ServiceCatalogItem
} from '../../../services/service-catalog-api.service';
import { LoginService } from '../../../login/login.service';
import {
  formatDateMMDDYYYY,
  formatTimeHHMM,
} from '../../../shared/date-time-format.util';

@Component({
  selector: 'app-user-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, UserNavComponent],
  templateUrl: './user-appointments.component.html',
  styleUrls: ['./user-appointments.component.css']
})
export class UserAppointmentsComponent implements OnInit {
  private appointmentsApi = inject(AppointmentsApiService);
  private servicesApi = inject(ServiceCatalogApiService);
  private login = inject(LoginService);

  services = signal<ServiceCatalogItem[]>([]);
  appointments = signal<AppointmentItem[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  editingAppointmentId = signal<string | null>(null);

  get studentName(): string {
    return this.login.getUserName() || 'Student';
  }

  get studentId(): string {
    return this.login.getStudentId() || this.login.getUserId() || '';
  }

  form = {
    serviceId: '',
    appointmentDate: '',
    appointmentTime: '',
    notes: ''
  };

  editForm = {
    serviceId: '',
    appointmentDate: '',
    appointmentTime: '',
    notes: '',
  };

  selectedService = computed(() =>
    this.services().find(s => s.id === this.form.serviceId) ?? null
  );

  currentAppointments = computed(() =>
    this.appointments().filter(a => a.status === 'Scheduled' || a.status === 'Checked In')
  );

  ngOnInit(): void {
    this.loadServices();
    this.loadAppointments();
  }

  loadServices(): void {
    this.servicesApi.getServices().subscribe({
      next: (res) => this.services.set(res.data),
      error: () => this.errorMessage.set('Could not load services.')
    });
  }

  loadAppointments(): void {
    const sid = this.studentId;
    if (!sid) {
      this.appointments.set([]);
      return;
    }
    this.appointmentsApi.getAppointmentsForStudent(sid).subscribe({
      next: (res) => this.appointments.set(res.data),
      error: () => this.errorMessage.set('Could not load appointments.')
    });
  }

  submitAppointment(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.form.serviceId || !this.form.appointmentDate || !this.form.appointmentTime) {
      this.errorMessage.set('Please select a service, date, and time.');
      return;
    }

    if (this.isPastDateTime(this.form.appointmentDate, this.form.appointmentTime)) {
      this.errorMessage.set('Appointments cannot be scheduled in the past.');
      return;
    }

    const uid = this.login.getUserId();
    const payload: CreateAppointmentPayload = {
      userId: uid || undefined,
      studentName: this.studentName,
      studentId: this.studentId,
      serviceId: this.form.serviceId,
      appointmentDate: this.form.appointmentDate,
      appointmentTime: this.form.appointmentTime,
      notes: this.form.notes.trim() || undefined,
    };

    this.isLoading.set(true);

    this.appointmentsApi.createAppointment(payload).subscribe({
      next: (res) => {
        this.successMessage.set('Appointment scheduled successfully.');
        this.form = {
          serviceId: '',
          appointmentDate: '',
          appointmentTime: '',
          notes: ''
        };
        this.isLoading.set(false);
        this.loadAppointments();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error || 'Unable to schedule appointment.');
        this.isLoading.set(false);
      }
    });
  }

  startEdit(appointment: AppointmentItem): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.editingAppointmentId.set(appointment.id);
    this.editForm = {
      serviceId: appointment.serviceId,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: this.normalizeTimeForInput(appointment.appointmentTime),
      notes: appointment.notes || '',
    };
  }

  cancelEdit(): void {
    this.editingAppointmentId.set(null);
  }

  saveEdit(appointmentId: string): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    if (!this.editForm.serviceId || !this.editForm.appointmentDate || !this.editForm.appointmentTime) {
      this.errorMessage.set('Please select a service, date, and time.');
      return;
    }
    if (this.isPastDateTime(this.editForm.appointmentDate, this.editForm.appointmentTime)) {
      this.errorMessage.set('Appointments cannot be scheduled in the past.');
      return;
    }

    const payload: UpdateAppointmentPayload = {
      studentId: this.studentId,
      serviceId: this.editForm.serviceId,
      appointmentDate: this.editForm.appointmentDate,
      appointmentTime: this.editForm.appointmentTime,
      notes: this.editForm.notes.trim() || undefined,
    };

    this.isLoading.set(true);
    this.appointmentsApi.updateAppointment(appointmentId, payload).subscribe({
      next: () => {
        this.successMessage.set('Appointment updated successfully.');
        this.editingAppointmentId.set(null);
        this.isLoading.set(false);
        this.loadAppointments();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error || 'Unable to update appointment.');
        this.isLoading.set(false);
      }
    });
  }

  cancelAppointment(appointmentId: string): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.isLoading.set(true);
    this.appointmentsApi.cancelAppointment(appointmentId, this.studentId).subscribe({
      next: () => {
        this.successMessage.set('Appointment canceled successfully.');
        if (this.editingAppointmentId() === appointmentId) this.editingAppointmentId.set(null);
        this.isLoading.set(false);
        this.loadAppointments();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error || 'Unable to cancel appointment.');
        this.isLoading.set(false);
      }
    });
  }

  isEditing(appointmentId: string): boolean {
    return this.editingAppointmentId() === appointmentId;
  }

  minDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeTimeForInput(value: string): string {
    const m = /^(\d{2}):(\d{2})/.exec(String(value || '').trim());
    if (!m) return value;
    return `${m[1]}:${m[2]}`;
  }

  private isPastDateTime(dateValue: string, timeValue: string): boolean {
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || '').trim());
    const t = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(timeValue || '').trim());
    if (!d || !t) return false;

    const year = Number(d[1]);
    const month = Number(d[2]) - 1;
    const day = Number(d[3]);
    const hour = Number(t[1]);
    const minute = Number(t[2]);
    const second = t[3] ? Number(t[3]) : 0;
    const candidate = new Date(year, month, day, hour, minute, second, 0);
    return candidate.getTime() < Date.now();
  }

  badgeClass(status: string): string {
    switch (status) {
      case 'Completed': return 'success';
      case 'Checked In': return 'warn';
      case 'In Service': return 'info';
      case 'Canceled': return 'danger';
      default: return 'info';
    }
  }

  formatDisplayDate(value: string): string {
    return formatDateMMDDYYYY(value);
  }

  formatDisplayTime(value: string): string {
    return formatTimeHHMM(value);
  }
}