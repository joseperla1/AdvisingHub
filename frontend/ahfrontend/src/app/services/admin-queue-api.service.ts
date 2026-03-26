import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type QueuePriority = 'low' | 'medium' | 'high' | 'normal';
export type QueueState = 'waiting' | 'serving' | 'served' | 'left';

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
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class AdminQueueApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/admin/queue';

  getCurrentQueue(): Observable<ApiResponse<AdminQueueItem[]>> {
    return this.http.get<ApiResponse<AdminQueueItem[]>>(this.baseUrl);
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