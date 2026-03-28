import { Routes } from '@angular/router';
import { StaffQueueManagementComponent } from './/staff-queue-management/staff-queue-management.component';
import { UserDashboardComponent } from './pages/user/user-dashboard/user-dashboard.component';
import { UserAppointmentsComponent } from './pages/user/user-appointments/user-appointments.component';

// TEMPORARY startup route switch
// Change this to 'admin' or 'user/dashboard' depending on which view you want first.
// Remove this once login-based routing is implemented.
//const DEFAULT_START_ROUTE = 'user/dashboard';
const DEFAULT_START_ROUTE = 'admin';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'registration',
    loadComponent: () =>
      import('./registration/registration.component').then(m => m.RegistrationComponent)
  },
  {
    path: 'admin',
    component: StaffQueueManagementComponent
  },
  {
    path:'user/appointments',
    loadComponent: () =>
      import('./pages/user/user-appointments/user-appointments.component')
      .then(m=> m.UserAppointmentsComponent)
  },
  {
    path: 'user/dashboard',
    loadComponent: () =>
      import('./pages/user/user-dashboard/user-dashboard.component')
        .then(m => m.UserDashboardComponent)
  },


  {
    path: 'user/join',
    loadComponent: () =>
      import('./pages/user/join-queue.component')
        .then(m => m.JoinQueueComponent)
  },

  {
    path: 'user/status',
    loadComponent: () =>
      import('./pages/user/queue-status.component')
        .then(m => m.QueueStatusComponent)
  },

  {
    path: 'user/history',
    loadComponent: () =>
      import('./pages/user/history.component')
        .then(m => m.HistoryComponent)
  },

  
  { path: '', redirectTo: DEFAULT_START_ROUTE, pathMatch: 'full' },
  { path: '**', redirectTo: DEFAULT_START_ROUTE }
];
