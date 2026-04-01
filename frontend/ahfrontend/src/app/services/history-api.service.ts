import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface QueueHistoryEntry {
  id: string;
  userId: string;
  studentId?: string;
  queueId: string;
  name: string;
  serviceId: string;
  serviceName: string;
  action: string;
  status: string;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class HistoryApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/history';

  getHistoryForUser(userId: string): Observable<ApiResponse<QueueHistoryEntry[]>> {
    return this.http.get<ApiResponse<QueueHistoryEntry[]>>(`${this.baseUrl}/${userId}`);
  }
}
