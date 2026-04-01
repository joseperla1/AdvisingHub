import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type AppointmentStatus =
  | 'Scheduled'
  | 'Checked In'
  | 'In Service'
  | 'Completed'
  | 'Canceled';

export interface AppointmentItem {
  id: string;
  userId?: string;
  advisorId?: string;
  studentName: string;
  studentId: string;
  serviceId: string;
  serviceName: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  advisor: string;
  status: AppointmentStatus;
  queuePosition: number | null;
  notes?: string;
}

export interface CreateAppointmentPayload {
  userId?: string;
  studentName: string;
  studentId: string;
  serviceId: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentsApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/appointments';
  private readonly adminBaseUrl = 'http://localhost:3000/api/admin/appointments';

  createAppointment(payload: CreateAppointmentPayload): Observable<ApiResponse<AppointmentItem>> {
    return this.http.post<ApiResponse<AppointmentItem>>(this.baseUrl, payload);
  }

  getAppointmentsForStudent(studentId: string): Observable<ApiResponse<AppointmentItem[]>> {
    const params = new HttpParams().set('studentId', studentId);
    return this.http.get<ApiResponse<AppointmentItem[]>>(this.baseUrl, { params });
  }

  getAdminAppointments(): Observable<ApiResponse<AppointmentItem[]>> {
    return this.http.get<ApiResponse<AppointmentItem[]>>(this.adminBaseUrl);
  }
}