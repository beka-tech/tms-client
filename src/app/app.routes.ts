import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell/app-shell';
import { authGuard } from './core/auth/guards/auth.guard';
import { adminGuard, instructorGuard } from './core/auth/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.routes),
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.routes),
      },
      {
        path: 'students',
        canActivate: [adminGuard],
        loadChildren: () => import('./features/students/students.routes').then((m) => m.routes),
      },
      {
        path: 'courses',
        loadChildren: () => import('./features/courses/courses.routes').then((m) => m.routes),
      },
      {
        path: 'enrollments',
        canActivate: [instructorGuard],
        loadChildren: () =>
          import('./features/enrollments/enrollments.routes').then((m) => m.routes),
      },
      {
        path: 'certificates',
        canActivate: [adminGuard],
        loadChildren: () =>
          import('./features/certificates/certificates.routes').then((m) => m.routes),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: 'enroll', redirectTo: 'enrollments', pathMatch: 'full' },
  { path: 'enroll_list', redirectTo: 'enrollments', pathMatch: 'full' },
  { path: 'grade-submission', redirectTo: 'enrollments', pathMatch: 'full' },
  { path: 'admin/courses', redirectTo: 'courses', pathMatch: 'full' },
  { path: 'InstructorDashboard', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
