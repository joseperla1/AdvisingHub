import { Routes } from '@angular/router';
import { StaffQueueManagementComponent } from './/staff-queue-management/staff-queue-management.component';
import {
  adminGuard,
  authGuard,
  guestGuard,
  roleDefaultGuard,
} from './guards/auth.guards';
import { HomeRedirectComponent } from './home-redirect.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'registration',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./registration/registration.component').then(m => m.RegistrationComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    component: StaffQueueManagementComponent,
  },
  {
    path: 'user/appointments',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/user/user-appointments/user-appointments.component').then(
        m => m.UserAppointmentsComponent
      ),
  },
  {
    path: 'user/dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/user/user-dashboard/user-dashboard.component').then(
        m => m.UserDashboardComponent
      ),
  },
  {
    path: 'user/join',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/user/join-queue.component').then(m => m.JoinQueueComponent),
  },
  {
    path: 'user/status',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/user/queue-status.component').then(m => m.QueueStatusComponent),
  },
  {
    path: 'user/history',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/user/history.component').then(m => m.HistoryComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [roleDefaultGuard],
    component: HomeRedirectComponent,
  },
  {
    path: '**',
    canActivate: [roleDefaultGuard],
    component: HomeRedirectComponent,
  },
];
