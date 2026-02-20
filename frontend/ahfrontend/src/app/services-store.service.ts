import { Injectable, signal } from '@angular/core';

export type Priority = 'low' | 'medium' | 'high';

export interface Service {
  id: string;
  name: string;
  description: string;
  expectedDurationMin: number;
  priority: Priority;
  updatedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class ServicesStore {
  services = signal<Service[]>([
    {
      id: 'SVC-001',
      name: 'Transcript Request',
      description: 'Official/unofficial transcript processing and delivery options.',
      expectedDurationMin: 10,
      priority: 'medium',
      updatedAt: new Date(),
    },
    {
      id: 'SVC-002',
      name: 'Enrollment Verification',
      description: 'Verify enrollment status for third-party requests and documentation.',
      expectedDurationMin: 8,
      priority: 'low',
      updatedAt: new Date(),
    },
  ]);

  create(input: Omit<Service, 'id' | 'updatedAt'>) {
    const svc: Service = {
      ...input,
      id: this.makeId(),
      updatedAt: new Date(),
    };
    this.services.update(list => [svc, ...list]);
  }

  update(id: string, patch: Omit<Service, 'id' | 'updatedAt'>) {
    this.services.update(list =>
      list.map(s =>
        s.id === id ? { ...s, ...patch, updatedAt: new Date() } : s
      )
    );
  }

  delete(id: string) {
    this.services.update(list => list.filter(s => s.id !== id));
  }

  private makeId() {
    const n = Math.floor(1000 + Math.random() * 9000);
    return `SVC-${n}`;
  }
}
