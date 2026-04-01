import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface QueueItemDto {
  id: string;
  userId: string;
  name: string;
  studentId: string;
  serviceId: string;
  serviceName: string;
  priority: string;
  status: string;
  joinedAt: string;
  notes?: string;
}

export interface ActiveQueueData {
  queueItem: QueueItemDto;
  position: number;
  estimatedWaitMin: number;
}

export interface JoinQueuePayload {
  userId: string;
  name: string;
  studentId: string;
  serviceId: string;
  serviceName: string;
  priority?: string;
  notes?: string;
}

export interface JoinQueueResponseData {
  queueItem: QueueItemDto;
  position: number;
  estimatedWaitMin: number;
  notification?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class UserQueueApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/queue';

  getActive(userId: string): Observable<ApiResponse<ActiveQueueData | null>> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<ApiResponse<ActiveQueueData | null>>(`${this.baseUrl}/active`, {
      params,
    });
  }

  joinQueue(payload: JoinQueuePayload): Observable<ApiResponse<JoinQueueResponseData>> {
    return this.http.post<ApiResponse<JoinQueueResponseData>>(`${this.baseUrl}/join`, payload);
  }

  leaveQueue(queueId: string): Observable<ApiResponse<QueueItemDto>> {
    return this.http.post<ApiResponse<QueueItemDto>>(`${this.baseUrl}/${queueId}/leave`, {});
  }
}
