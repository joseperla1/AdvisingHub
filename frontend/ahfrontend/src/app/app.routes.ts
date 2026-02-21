import { Routes } from '@angular/router';

export const routes: Routes = [

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

  // Default route
  { path: '', redirectTo: 'user/dashboard', pathMatch: 'full' },

  // Wildcard fallback
  { path: '**', redirectTo: 'user/dashboard' }

];
