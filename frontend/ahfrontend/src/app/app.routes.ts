import { Routes } from '@angular/router';
import { StaffQueueManagementComponent } from './/staff-queue-management/staff-queue-management.component';

// TEMPORARY startup route switch
// Change this to 'admin' or 'user/dashboard' depending on which view you want first.
// Remove this once login-based routing is implemented.
// const DEFAULT_START_ROUTE = 'user/dashboard';
const DEFAULT_START_ROUTE = 'admin';

export const routes: Routes = [
  {
    path: 'admin',
    component: StaffQueueManagementComponent
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
