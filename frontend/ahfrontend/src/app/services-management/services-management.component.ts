// import { Component, inject, signal } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
// import { HttpClient } from '@angular/common/http';
// import { Service, Priority } from '../services-store.service';

// @Component({
//   selector: 'app-services-management',
//   standalone: true,
//   imports: [CommonModule, ReactiveFormsModule],
//   templateUrl: './services-management.component.html',
//   styleUrls: ['./services-management.component.scss'],
// })
// export class ServicesManagementComponent {
//   private fb = inject(FormBuilder);
//   private http = inject(HttpClient);

//   editingId = signal<string | null>(null);
//   services = signal<Service[]>([]); // local signal for list of services

//   form = this.fb.group({
//     name: ['', [Validators.required, Validators.maxLength(100)]],
//     description: ['', [Validators.required]],
//     expectedDurationMin: [null as number | null, [Validators.required, Validators.min(1)]],
//     priority: ['medium' as Priority, [Validators.required]],
//   });

//   constructor() {
//     this.loadServices();
//   }

//   // --- CRUD methods ---
//   private loadServices() {
//     this.http.get<{ success: boolean; data: Service[] }>('/api/services').subscribe({
//       next: (res) => {
//         if (res.success) this.services.set(res.data);
//       },
//       error: (err) => console.error('Failed to load services', err),
//     });
//   }

//   startCreate() {
//     this.editingId.set(null);
//     this.form.reset({
//       name: '',
//       description: '',
//       expectedDurationMin: null,
//       priority: 'medium',
//     });
//   }

//   startEdit(svc: Service) {
//     this.editingId.set(svc.id);
//     this.form.patchValue({
//       name: svc.name,
//       description: svc.description,
//       expectedDurationMin: svc.expectedDurationMin,
//       priority: svc.priority,
//     });
//   }

//   save() {
//     const payload = {
//       name: this.nameCtrl.value,
//       description: this.descCtrl.value,
//       expectedDurationMin: this.durCtrl.value,
//       priority: this.prioCtrl.value,
//     };

//     const id = this.editingId();

//     if (id) {
//       // Editing existing service
//       this.http.put<{ success: boolean; data: Service }>(`/api/services/${id}`, payload).subscribe({
//         next: (res) => {
//           if (res.success) {
//             // Update local signal
//             this.services.update(list =>
//               list.map(s => (s.id === id ? res.data : s))
//             );
//             this.startCreate(); // reset form
//           }
//         },
//         error: (err) => console.error('Failed to update service', err),
//       });
//     } else {
//       // Creating new service
//       this.http.post<{ success: boolean; data: Service }>('/api/services', payload).subscribe({
//         next: (res) => {
//           if (res.success) {
//             // Add new service to local signal
//             this.services.update(list => [res.data, ...list]);
//             this.startCreate(); // reset form
//           }
//         },
//         error: (err) => console.error('Failed to create service', err),
//       });
//     }
//   }

//   delete(id: string) {
//     if (!confirm('Are you sure you want to delete this service?')) return;

//     this.http.delete<{ success: boolean }>(`/api/services/${id}`).subscribe({
//       next: (res) => {
//         if (res.success) {
//           this.services.update(list => list.filter(s => s.id !== id));
//           // If deleting the currently edited service, reset form
//           if (this.editingId() === id) this.startCreate();
//         }
//       },
//       error: (err) => console.error('Failed to delete service', err),
//     });
//   }

//   cancel() {
//     this.startCreate();
//   }

//   // --- Form controls getters ---
//   get nameCtrl() { return this.form.controls.name; }
//   get descCtrl() { return this.form.controls.description; }
//   get durCtrl() { return this.form.controls.expectedDurationMin; }
//   get prioCtrl() { return this.form.controls.priority; }
// }
// src/app/services-management/services-management.component.ts
// src/app/services-management/services-management.component.ts
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

  services = this.store.services; // 🚀 signal binding

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.required]],
    expectedDurationMin: [null as number | null, [Validators.required, Validators.min(1)]],
    priority: ['medium' as Priority, [Validators.required]],
  });

  startCreate() {
    this.editingId.set(null);
    this.form.reset({ priority: 'medium' });
  }

  startEdit(svc: Service) {
    this.editingId.set(svc.id);
    this.form.setValue({
      name: svc.name ?? '',
      description: svc.description ?? '',
      expectedDurationMin: svc.expectedDurationMin ?? 1,
      priority: svc.priority ?? 'medium'
    });
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const input = {
      name: this.nameCtrl.value!,
      description: this.descCtrl.value!,
      expectedDurationMin: this.durCtrl.value!,
      priority: this.prioCtrl.value! as Priority,
    };

    try {
      if (this.editingId()) {
        await this.store.update(this.editingId()!, input);
      } else {
        await this.store.create(input);
      }
      this.startCreate(); // reset form
    } catch (err) {
      console.error('Failed to save service', err);
    }
  }

  async delete(id: string) {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await this.store.delete(id);
      if (this.editingId() === id) this.startCreate();
    } catch (err) {
      console.error('Failed to delete service', err);
    }
  }

  cancel() {
    this.startCreate();
  }

  get nameCtrl() { return this.form.controls.name; }
  get descCtrl() { return this.form.controls.description; }
  get durCtrl() { return this.form.controls.expectedDurationMin; }
  get prioCtrl() { return this.form.controls.priority; }
}