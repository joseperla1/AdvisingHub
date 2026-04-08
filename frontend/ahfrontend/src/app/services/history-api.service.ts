import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface QueueHistoryEntry {
  id: string;
  serviceName: string;
  joinedAt: string;
  leftAt: string | null;
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
