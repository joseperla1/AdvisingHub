import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface NotificationDto {
  id: string;
  userId: string;
  queueId: string | null;
  type: string | null;
  message: string;
  createdAt: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/notifications';

  getForUser(userId: string): Observable<ApiResponse<NotificationDto[]>> {
    return this.http.get<ApiResponse<NotificationDto[]>>(`${this.baseUrl}/${userId}`);
  }
}

