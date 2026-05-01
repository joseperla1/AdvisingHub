import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface AnalyticsOverviewKpis {
  totalServed: number;
  avgWaitTimeMin: number;
  busiestService: string;
  appointmentsToday: number;
}

export interface AnalyticsPoint {
  [key: string]: string | number;
}

export interface AnalyticsOverview {
  kpis: AnalyticsOverviewKpis;
  charts: {
    dailyQueueVolumeTrend: AnalyticsPoint[];
    averageWaitTimeTrend: AnalyticsPoint[];
    mostPopularServices: AnalyticsPoint[];
    statusBreakdown: { label: string; value: number }[];
    advisorWorkload: AnalyticsPoint[];
  };
}

export interface AnalyticsFilterOptions {
  services: string[];
  /** Distinct queue entry statuses (user participation / similar). */
  queueStatuses: string[];
  /** Status values present on service queue activity rows (if available). */
  serviceActivityStatuses: string[];
  entrySources: string[];
  priorities: string[];
  /** Monday–Sunday for Daily Queue Usage filter. */
  daysOfWeek: string[];
  reportTypes: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminAnalyticsApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/admin/analytics';

  getOverview(options?: {
    rangeType?: 'day' | 'month' | 'ytd';
    date?: string;
    month?: string;
    year?: number;
  }): Observable<ApiResponse<AnalyticsOverview>> {
    let params = new HttpParams();
    if (options?.rangeType) params = params.set('rangeType', options.rangeType);
    if (options?.date) params = params.set('date', options.date);
    if (options?.month) params = params.set('month', options.month);
    if (options?.year) params = params.set('year', String(options.year));
    return this.http.get<ApiResponse<AnalyticsOverview>>(`${this.baseUrl}/overview`, { params });
  }

  getFilterOptions(): Observable<ApiResponse<AnalyticsFilterOptions>> {
    return this.http.get<ApiResponse<AnalyticsFilterOptions>>(`${this.baseUrl}/filters`);
  }

  generateReport(reportType: string, filters: object): Observable<ApiResponse<Record<string, unknown>[]>> {
    return this.http.post<ApiResponse<Record<string, unknown>[]>>(`${this.baseUrl}/report`, {
      reportType,
      filters,
    });
  }
}

