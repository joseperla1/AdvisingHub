import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserNavComponent } from '../user-nav/user-nav.component';
import {
  AppointmentsApiService,
  AppointmentItem,
  CreateAppointmentPayload
} from '../../../services/appointments-api.service';
import {
  ServiceCatalogApiService,
  ServiceCatalogItem
} from '../../../services/service-catalog-api.service';
import { LoginService } from '../../../login/login.service';

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

  selectedService = computed(() =>
    this.services().find(s => s.id === this.form.serviceId) ?? null
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

  badgeClass(status: string): string {
    switch (status) {
      case 'Completed': return 'success';
      case 'Checked In': return 'warn';
      case 'In Service': return 'info';
      case 'Canceled': return 'danger';
      default: return 'info';
    }
  }
}