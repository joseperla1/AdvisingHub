import { Injectable, signal } from '@angular/core';

export type NoticeType = 'info' | 'success' | 'warning';

export interface Notice {
  id: string;
  type: NoticeType;
  title: string;
  message?: string;
  createdAt: Date;
}

@Injectable({ providedIn: 'root' })
export class NotificationStore {
  // Toasts (auto-dismiss)
  toasts = signal<Notice[]>([]);

  // Notification Center history (keep last 10, no auto-dismiss)
  history = signal<Notice[]>([]);

  push(type: NoticeType, title: string, message?: string) {
    const notice: Notice = {
      id: `N-${Math.floor(100000 + Math.random() * 900000)}`,
      type,
      title,
      message,
      createdAt: new Date(),
    };

    // Add to history (keep last 10)
    this.history.update(list => [notice, ...list].slice(0, 10));

    // Add to toast stack
    this.toasts.update(list => [notice, ...list]);

    // Auto-dismiss toast after 4s
    window.setTimeout(() => this.dismissToast(notice.id), 4000);
  }

  dismissToast(id: string) {
    this.toasts.update(list => list.filter(n => n.id !== id));
  }

  clearHistory() {
    this.history.set([]);
  }
}