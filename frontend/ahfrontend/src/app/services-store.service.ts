import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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
  private baseUrl = 'http://localhost:3000/api/services';

  // Signal holding the list of services
  services = signal<Service[]>([]);

  constructor(private http: HttpClient) {
    this.load(); // Load existing services on service init
  }

  // Backend → frontend mapping
  private mapFromBackend(s: any): Service {
    return {
      id: s.id,
      name: s.name ?? '',
      description: s.description ?? '',
      expectedDurationMin: s.expectedDuration ?? s.expectedDurationMin ?? 0,
      priority: s.priority ?? 'medium',
      updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date()
    };
  }

  // Frontend → backend mapping
  private mapToBackend(input: Omit<Service, 'id' | 'updatedAt'>) {
    return {
      name: input.name,
      description: input.description,
      expectedDuration: input.expectedDurationMin,
      priority: input.priority
    };
  }

  // Load all services from backend
  async load() {
    try {
      const res: any = await firstValueFrom(this.http.get(this.baseUrl));
      if (res.success && res.data) {
        const mapped = res.data.map((s: any) => this.mapFromBackend(s));
        this.services.set(mapped);
      }
    } catch (err) {
      console.error('Failed to load services', err);
    }
  }

  // Create a new service (in-memory only; survives until refresh / full reload)
  async create(input: Omit<Service, 'id' | 'updatedAt'>) {
    const svc: Service = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      expectedDurationMin: input.expectedDurationMin,
      priority: input.priority,
      updatedAt: new Date(),
    };
    this.services.update(list => [svc, ...list]);
  }

  // Update an existing service (API when available; otherwise patch in-memory row)
  async update(id: string, patch: Omit<Service, 'id' | 'updatedAt'>) {
    try {
      const payload = this.mapToBackend(patch);
      const res: any = await firstValueFrom(this.http.put(`${this.baseUrl}/${id}`, payload));

      if (res.success && res.data) {
        const updated = this.mapFromBackend(res.data);
        this.services.update(list =>
          list.map(s => (s.id === id ? updated : s))
        );
      }
    } catch (err: any) {
      console.error('Failed to update service', err);
      const status = err?.status;
      // Not on server (e.g. in-memory id) or unreachable — keep the row in sync locally
      if (status === 404 || status === 0) {
        this.services.update(list =>
          list.map(s =>
            s.id === id
              ? { ...s, ...patch, updatedAt: new Date() }
              : s
          )
        );
      }
    }
  }

  // Delete a service (API when available; still drop from list if request fails, e.g. in-memory-only id)
  async delete(id: string) {
    try {
      const res: any = await firstValueFrom(this.http.delete(`${this.baseUrl}/${id}`));
      if (res.success) {
        this.services.update(list => list.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete service', err);
      this.services.update(list => list.filter(s => s.id !== id));
    }
  }

  // Optional helper: find service by ID locally
  getServiceById(id: string): Service | undefined {
    return this.services().find(s => s.id === id);
  }
}