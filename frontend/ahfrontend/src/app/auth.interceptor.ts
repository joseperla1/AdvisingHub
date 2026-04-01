import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { clearAllQueueLocalState } from './pages/user/queue-local-storage';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Avoid adding Authorization to login/register endpoints (auth endpoints do credential exchange)
    const authEndpointPattern = /\/api\/auth\/(login|register)$/;
    if (!authEndpointPattern.test(request.url)) {
      const token = localStorage.getItem('authToken');
      if (token) {
        request = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // If we get a 401 Unauthorized, logout the user
        if (error.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userId');
          localStorage.removeItem('userName');
          localStorage.removeItem('studentId');
          localStorage.removeItem('userEmail');
          clearAllQueueLocalState();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
