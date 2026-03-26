import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ServiceItem } from '../models/queue.models';

@Injectable({ providedIn: 'root' })
export class ServicesCatalogService {
  private services$ = new BehaviorSubject<ServiceItem[]>([
    { id: 'gen', name: 'General Advising', description: 'Course planning, registration help, holds.', avgMinutes: 20, isActive: true },
    { id: 'grad', name: 'Graduation Check', description: 'Degree audit + graduation readiness.', avgMinutes: 30, isActive: true },
    { id: 'major', name: 'Major Change', description: 'Requirements + eligibility discussion.', avgMinutes: 25, isActive: true },
    { id: 'prob', name: 'Academic Standing Support', description: 'Probation/success planning support.', avgMinutes: 35, isActive: false },
  ]);

  getServices() {
    return this.services$.asObservable();
  }
}
