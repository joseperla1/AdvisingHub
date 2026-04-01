import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { UserNavComponent } from './user-nav/user-nav.component';
import { LoginService } from '../../login/login.service';
import { ServiceCatalogApiService, ServiceCatalogItem } from '../../services/service-catalog-api.service';
import { UserQueueApiService } from '../../services/user-queue-api.service';

@Component({
  selector: 'app-join-queue',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UserNavComponent],
  templateUrl: './join-queue.component.html',
  styleUrls: ['./join-queue.component.css'],
})
export class JoinQueueComponent implements OnInit {
  services = signal<ServiceCatalogItem[]>([]);
  activeQueueId = signal<string | null>(null);
  submitting = signal(false);
  submitError = signal<string | null>(null);
  loadError = signal<string | null>(null);

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private login: LoginService,
    private catalogApi: ServiceCatalogApiService,
    private queueApi: UserQueueApiService
  ) {
    this.form = this.fb.group({
      serviceId: ['', Validators.required],
      notes: ['', [Validators.maxLength(300)]],
    });
  }

  ngOnInit(): void {
    this.catalogApi.getServices().subscribe({
      next: res => {
        this.services.set(res.data ?? []);
        this.loadError.set(null);
      },
      error: () => this.loadError.set('Could not load services from the server.'),
    });

    const uid = this.login.getUserId();
    if (uid) {
      this.queueApi.getActive(uid).subscribe({
        next: res => {
          const id = res.data?.queueItem?.id ?? null;
          this.activeQueueId.set(id);
        },
        error: () => this.activeQueueId.set(null),
      });
    }
  }

  get f() {
    return this.form.controls as Record<string, unknown>;
  }

  get selectedService(): ServiceCatalogItem | undefined {
    const id = this.form.value['serviceId'] || '';
    return this.services().find(s => s.id === id);
  }

  get hasActiveTicket(): boolean {
    return !!this.activeQueueId();
  }

  joinQueue(): void {
    this.submitError.set(null);

    const uid = this.login.getUserId();
    const name = this.login.getUserName();
    if (!uid || !name) {
      this.submitError.set('You must be signed in to join the queue.');
      return;
    }

    if (this.hasActiveTicket) {
      this.submitError.set(
        'You already have an active ticket. View Queue Status or leave the queue first.'
      );
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

    const studentId = this.login.getStudentId() || uid;
    const notesRaw = (this.form.value['notes'] || '').trim();

    this.submitting.set(true);

    this.queueApi
      .joinQueue({
        userId: uid,
        name,
        studentId,
        serviceId: service.id,
        serviceName: service.name,
        priority: service.priority || 'normal',
        notes: notesRaw || undefined,
      })
      .subscribe({
        next: () => {
          this.form.reset({ serviceId: '', notes: '' });
          this.submitting.set(false);
          void this.router.navigateByUrl('/user/status');
        },
        error: err => {
          this.submitting.set(false);
          this.submitError.set(err?.error?.error || 'Could not join the queue.');
        },
      });
  }
}
