import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { LoginService } from '../login/login.service';

/** Logged-in users only; otherwise send to login. */
export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const login = inject(LoginService);
  const router = inject(Router);
  if (login.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

/** Admins only; users are sent to their dashboard. */
export const adminGuard: CanActivateFn = (): boolean | UrlTree => {
  const login = inject(LoginService);
  const router = inject(Router);
  if (!login.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }
  if (login.isAdmin()) {
    return true;
  }
  return router.createUrlTree(['/user/dashboard']);
};

/** Login / registration: already signed-in users go to the right home. */
export const guestGuard: CanActivateFn = (): boolean | UrlTree => {
  const login = inject(LoginService);
  const router = inject(Router);
  if (!login.isLoggedIn()) {
    return true;
  }
  if (login.isAdmin()) {
    return router.createUrlTree(['/admin']);
  }
  return router.createUrlTree(['/user/dashboard']);
};

/** Root and unknown paths: login, or role-appropriate home (never a static admin default). */
export const roleDefaultGuard: CanActivateFn = (): boolean | UrlTree => {
  const login = inject(LoginService);
  const router = inject(Router);
  if (!login.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }
  if (login.isAdmin()) {
    return router.createUrlTree(['/admin']);
  }
  return router.createUrlTree(['/user/dashboard']);
};
