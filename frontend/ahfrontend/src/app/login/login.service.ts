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
    studentId?: string | null;
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
    studentId?: string | null;
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
        this.persistSession(response.token, response.user);
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
        this.persistSession(response.token, response.user);
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
    localStorage.removeItem('userName');
    localStorage.removeItem('studentId');
    localStorage.removeItem('userEmail');
    clearAllQueueLocalState();
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  getUserName(): string | null {
    return localStorage.getItem('userName');
  }

  /** Campus student ID when present; otherwise null (e.g. some admin accounts). */
  getStudentId(): string | null {
    const s = localStorage.getItem('studentId');
    return s && s.length > 0 ? s : null;
  }

  private persistSession(
    token: string,
    user: {
      id: string;
      email: string;
      role: 'user' | 'admin';
      name: string;
      studentId?: string | null;
    }
  ): void {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('userId', user.id);
    localStorage.setItem('userName', user.name);
    localStorage.setItem('userEmail', user.email);
    if (user.studentId) {
      localStorage.setItem('studentId', user.studentId);
    } else {
      localStorage.removeItem('studentId');
    }
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
