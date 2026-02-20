import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServicesStore, Service, Priority } from '../services-store.service';

@Component({
  selector: 'app-services-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './services-management.component.html',
  styleUrls: ['./services-management.component.scss'],
})
export class ServicesManagementComponent {
  private fb = inject(FormBuilder);
  private store = inject(ServicesStore);

  editingId = signal<string | null>(null);

  services = this.store.services;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.required]],
    expectedDurationMin: [null as number | null, [Validators.required, Validators.min(1)]],
    priority: ['medium' as Priority, [Validators.required]],
  });

  startCreate() { }
  startEdit(svc: Service) {  }
  save() { }
  delete(id: string) { }
  cancel() { this.startCreate(); }

  get nameCtrl() { return this.form.controls.name; }
  get descCtrl() { return this.form.controls.description; }
  get durCtrl() { return this.form.controls.expectedDurationMin; }
  get prioCtrl() { return this.form.controls.priority; }
}
