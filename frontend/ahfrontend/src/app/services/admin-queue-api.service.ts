import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type QueuePriority = 'low' | 'medium' | 'high' | 'normal';
export type QueueState = 'waiting' | 'serving' | 'served' | 'left' | 'no-show';

export interface AdminQueueItem {
  id: string;
  userId: string;
  name: string;
  studentId: string;
  serviceId: string;
  serviceName: string;
  priority: QueuePriority;
  status: QueueState;
  joinedAt: string;
  servedByAdminUserId?: string | null;
  entrySource?: 'walk-in' | 'appointment' | 'admin';
  leftAt?: string | null;
  cancelReason?: string | null;
  appointmentId?: number | null;
  position?: number;
  estimatedWaitMin?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface AdminQueueMetrics {
  completedToday: number;
}

export interface AdminQueueResponseData {
  queue: AdminQueueItem[];
  metrics: AdminQueueMetrics;
}

@Injectable({
  providedIn: 'root'
})
export class AdminQueueApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/admin/queue';

  getCurrentQueue(): Observable<ApiResponse<AdminQueueResponseData>> {
    return this.http.get<ApiResponse<AdminQueueResponseData>>(this.baseUrl);
  }

  serveNext(): Observable<ApiResponse<AdminQueueItem>> {
    return this.http.post<ApiResponse<AdminQueueItem>>(
      `${this.baseUrl}/serve-next`,
      {}
    );
  }
  noShow(queueId: string): Observable<ApiResponse<AdminQueueItem>> {
    return this.http.post<ApiResponse<AdminQueueItem>>(
      `${this.baseUrl}/${queueId}/no-show`,
      {}
    );
  } 

  completeServing(queueId: string): Observable<ApiResponse<AdminQueueItem>> {
    return this.http.post<ApiResponse<AdminQueueItem>>(
      `${this.baseUrl}/${queueId}/complete`,
      {}
    );
  }
}