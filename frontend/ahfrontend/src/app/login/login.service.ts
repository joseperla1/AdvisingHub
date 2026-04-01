import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { clearAllQueueLocalState } from '../pages/user/queue-local-storage';

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
    name: string;
  };
  message?: string;
}

interface RegisterResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
    name: string;
  };
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class LoginService {
  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient) {}

  async login(credentials: { email: string; password: string }): Promise<LoginResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials)
      );

      if (response.success && response.token && response.user) {
        // Store token and user info
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('userRole', response.user.role);
        localStorage.setItem('userId', response.user.id);
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.error?.message || 'Login failed'
      };
    }
  }

  async register(data: { email: string; password: string; name?: string }): Promise<RegisterResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<RegisterResponse>(`${this.apiUrl}/register`, data)
      );

      if (response.success && response.token && response.user) {
        // Store token and user info
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('userRole', response.user.role);
        localStorage.setItem('userId', response.user.id);
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.error?.message || 'Registration failed'
      };
    }
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    clearAllQueueLocalState();
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUserRole(): 'admin' | 'user' | null {
    const role = localStorage.getItem('userRole');
    return role === 'admin' || role === 'user' ? role : null;
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'admin';
  }
}
