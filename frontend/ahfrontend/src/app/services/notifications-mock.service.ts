import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserNotification } from '../models/queue.models';

@Injectable({ providedIn: 'root' })
export class NotificationsMockService {
  private notifications$ = new BehaviorSubject<UserNotification[]>([
    { id: 'N1', type: 'INFO', message: 'New service added: Academic Standing Support.', createdAt: new Date(Date.now() - 2 * 3600e3).toISOString(), read: false },
    { id: 'N2', type: 'ALERT', message: 'High demand today—estimated wait times may increase.', createdAt: new Date(Date.now() - 6 * 3600e3).toISOString(), read: false },
    { id: 'N3', type: 'INFO', message: 'Bring your degree plan for Graduation Check.', createdAt: new Date(Date.now() - 2 * 864e5).toISOString(), read: true }
  ]);

  getNotifications() {
    return this.notifications$.asObservable();
  }

  markAllRead() {
    this.notifications$.next(this.notifications$.value.map(n => ({ ...n, read: true })));
  }
}
