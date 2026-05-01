import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getSmartWaitEstimate(serviceId: string) {
    return this.http.get<any>(`${this.apiUrl}/queue/estimate/${serviceId}`);
  }
}