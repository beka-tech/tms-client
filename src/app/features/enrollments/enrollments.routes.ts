import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/enrollment-list/enrollment-list').then((m) => m.EnrollmentListComponent),
  },
];
