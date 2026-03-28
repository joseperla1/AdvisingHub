import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ServicePriority = 'low' | 'medium' | 'high' | 'normal';

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string;
  expectedDurationMin: number;
  priority: ServicePriority;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceCatalogApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/services';

  getServices(): Observable<ApiResponse<ServiceCatalogItem[]>> {
    return this.http.get<ApiResponse<ServiceCatalogItem[]>>(this.baseUrl);
  }
}